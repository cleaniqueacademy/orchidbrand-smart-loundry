import { z } from "zod";
import { presentInvoice } from "../services/subscriptionService";
import { recordPaymentAdjustment } from "../services/financialReview";
import { resolveSession } from "../services/sessions";
import { setOwnerReferral } from "../services/ownerReferral";
import { Hono } from "hono";
import { db } from "../db/index";
import {
  subscriptionInvoices,
  tenants,
  users,
  plans,
  referralCodes,
  referralEvents,
  platformCashflow,
} from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware, getUser, verifyToken, invalidateTenantAuthCache } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { newId } from "../utils/id";
import { today, addDays } from "../utils/date";
import {
  getSubscriptionSummary,
  getApplicablePrice,
  createSubscriptionInvoice,
  uploadPaymentProof,
  verifySubscriptionInvoice,
  rejectSubscriptionInvoice,
} from "../services/subscriptionService";
import { validateCode, recordCommission } from "../services/referralService";
import { runTrialReminderCheck } from "../jobs/trialReminder";
import { checkoutSubscriptionQris } from "../services/subscriptionQris";
import { QrisCheckoutError } from "../services/qrisPayload";
import { rateLimit } from "../middleware/rateLimit";
import { ActiveInvoiceError, cancelSubscriptionInvoice, expireOwnerInvoices, expireSubscriptionInvoices } from "../services/invoiceLifecycle";
import { invoiceLifecycleEvents } from "../db/schema";
import { recordManualReceipt } from "../services/subscriptionService";

const subscriptionRoutes = new Hono();

/**
 * 1. GET /api/subscription/pricing (Public / Optional Auth)
 * Hitung kalkulasi harga paket & diskon referral
 */
subscriptionRoutes.get("/pricing", async (c) => {
  try {
    const session = await resolveSession(c);
    let tenantId = session?.user.role === "tenant_owner" ? session.user.tenantId || undefined : undefined;
    const requested = c.req.query("tenantId");
    if (requested) {
      const [branch] = await db.select().from(tenants).where(eq(tenants.id, requested));
      if (!session || !branch || (session.user.role !== "superadmin" && (session.user.role !== "tenant_owner" || branch.userId !== session.user.id))) return c.json({ success: false, message: "Akses quote ditolak" }, 403);
      tenantId = requested;
    }
    const planId = c.req.query("planId");
    const referralCode = c.req.query("referralCode");

    const calculation = await getApplicablePrice(tenantId || undefined, planId, referralCode);
    const { commission: _commission, ...quote }=calculation;
    return c.json({ success: true, data: quote });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Rute Terproteksi Autentikasi
// ---------------------------------------------------------------------------
subscriptionRoutes.use("*", authMiddleware);

subscriptionRoutes.post("/invoices/:id/cancel", requireRole(["superadmin", "tenant_owner"]), async c => {
  const parsed = z.object({ reason: z.string().trim().min(10).max(1000), acknowledgeSavedQris: z.boolean().default(false) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, message: "Alasan pembatalan lengkap diperlukan." }, 422);
  try {
    const actor = getUser(c);
    const invoice = await cancelSubscriptionInvoice(c.req.param("id")!, actor.userId, actor.role === "superadmin", parsed.data.reason, parsed.data.acknowledgeSavedQris);
    return c.json({ success: true, data: presentInvoice(invoice) });
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : "Invoice belum dapat dibatalkan." }, 409);
  }
});

subscriptionRoutes.post("/invoices/:id/received", requireRole(["superadmin"]), async c => {
  const parsed = z.object({ reference: z.string().trim().min(6).max(120), amount: z.number().int().positive(), receivedAt: z.string().max(40), notes: z.string().trim().min(10).max(2000) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ success: false, message: "Data penerimaan pembayaran tidak valid." }, 422);
  try {
    const receipt = await recordManualReceipt(c.req.param("id")!, getUser(c).userId, parsed.data);
    return c.json({ success: true, message: "Penerimaan dicatat. Aktivasi atau koreksi tetap memerlukan review admin.", data: receipt });
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : "Penerimaan belum dapat dicatat." }, 409);
  }
});

subscriptionRoutes.get("/invoices/:id/events", requireRole(["superadmin", "tenant_owner"]), async c => {
  const actor = getUser(c);
  const [invoice] = await db.select().from(subscriptionInvoices).where(and(eq(subscriptionInvoices.id, c.req.param("id")!), actor.role === "superadmin" ? undefined : eq(subscriptionInvoices.userId, actor.userId)));
  if (!invoice) return c.json({ success: false, message: "Invoice tidak ditemukan." }, 404);
  c.header("Cache-Control", "private, no-store");
  const events = await db.select().from(invoiceLifecycleEvents).where(eq(invoiceLifecycleEvents.invoiceId, invoice.id)).orderBy(invoiceLifecycleEvents.createdAt, invoiceLifecycleEvents.id);
  return c.json({ success: true, data: events.map(event => ({ id: event.id, eventType: event.eventType, createdAt: event.createdAt, ...(actor.role === "superadmin" ? { actorId: event.actorId, details: event.details } : {}) })) });
});

subscriptionRoutes.get("/invoices/:id/qris", requireRole(["superadmin", "tenant_owner"]), rateLimit({ max: 20, windowMs: 60000, keyGenerator: c => `subscription-qris:${getUser(c).userId}` }), async c => {
  c.header("Cache-Control", "private, no-store, max-age=0");
  try {
    const actor = getUser(c);
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "Invoice tidak ditemukan." }, 404);
    const data = await checkoutSubscriptionQris(id, actor.userId, actor.role === "superadmin");
    return c.json({ success: true, data });
  } catch (error) {
    if (error instanceof QrisCheckoutError) return c.json({ success: false, message: error.message }, error.status);
    console.error("[subscription-qris] generation failed", { invoiceId: c.req.param("id") });
    return c.json({ success: false, message: "QRIS belum dapat dibuat. Silakan coba lagi atau hubungi admin." }, 500);
  }
});

/**
 * 2. GET /api/subscription/summary
 * Ringkasan masa aktif langganan & status trial outlet
 */
subscriptionRoutes.get("/summary", async (c) => {
  try {
    const user = getUser(c);
    let targetTenantId = user.tenantId;

    if (user.role === "superadmin") {
      const queryTenantId = c.req.query("tenantId");
      if (queryTenantId) {
        targetTenantId = queryTenantId;
      }
    }

    if (!targetTenantId) {
      return c.json({ success: false, message: "Tenant ID tidak ditemukan" }, 400);
    }

    const summary = await getSubscriptionSummary(targetTenantId);
    if (!summary) {
      return c.json({ success: false, message: "Data langganan tidak ditemukan" }, 404);
    }

    return c.json({ success: true, data: summary });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. POST /api/subscription/invoices
 * Buat invoice perpanjangan langganan
 */
subscriptionRoutes.post("/invoices", requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const input = z.object({tenantId:z.string().max(100).optional(),planId:z.string().min(1).max(100).optional(),durationMonths:z.union([z.literal(1),z.literal(3),z.literal(6),z.literal(12)]).default(1),referralCode:z.string().trim().max(80).optional(),idempotencyKey:z.string().regex(/^[a-zA-Z0-9-]{16,80}$/).optional()}).safeParse(await c.req.json());
    if(!input.success)return c.json({success:false,message:"Parameter invoice tidak valid"},400);
    const body=input.data;
    const tenantId = user.tenantId || body.tenantId;

    if (!tenantId) {
      return c.json({ success: false, message: "Tenant ID diperlukan" }, 400);
    }

    const result = await createSubscriptionInvoice({
      tenantId,
      userId: user.userId,
      planId: body.planId,
      durationMonths: body.durationMonths === undefined ? 1 : Number(body.durationMonths),
      referralCode: body.referralCode,
      idempotencyKey: typeof body.idempotencyKey === "string" ? `${user.userId}:${body.idempotencyKey}` : undefined,
    });

    return c.json({
      success: true,
      message: "Invoice berhasil dibuat",
      data: result,
    });
  } catch (err: any) {
    if (err instanceof ActiveInvoiceError) return c.json({ success: false, code: "ACTIVE_INVOICE", message: err.message, data: { invoice: presentInvoice(err.invoice) } }, 409);
    return c.json({ success: false, message: err.message }, 409);
  }
});

/**
 * 4. POST /api/subscription/invoices/:id/proof
 * Unggah bukti pembayaran
 */
subscriptionRoutes.post("/invoices/:id/proof", requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID invoice diperlukan" }, 400);

    // Superadmin may operate across tenants; tenant users are restricted to their
    // own tenant. The service repeats this predicate to keep the write fail-closed.
    if (user.role !== "superadmin" && !user.tenantId) {
      return c.json({ success: false, message: "Tenant pengguna tidak ditemukan" }, 403);
    }

    const body = await c.req.json();
    const { proofUrl } = body;

    if (!proofUrl) {
      return c.json({ success: false, message: "Bukti transfer (proofUrl) wajib disertakan" }, 400);
    }

    const [invoice] = await db
      .select({ tenantId: subscriptionInvoices.tenantId, userId: subscriptionInvoices.userId })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, id));
    if (!invoice) {
      return c.json({ success: false, message: "Invoice tidak ditemukan" }, 404);
    }
    if (user.role !== "superadmin" && invoice.userId !== user.userId) {
      return c.json({ success: false, message: "Akses ditolak: invoice bukan milik outlet Anda" }, 403);
    }

    const updated = await uploadPaymentProof(id, proofUrl, invoice.tenantId, user.userId);
    return c.json({
      success: true,
      message: "Bukti pembayaran berhasil diunggah dan sedang menunggu verifikasi admin.",
      data: updated,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 5. GET /api/subscription/invoices
 * Daftar riwayat invoice
 */
subscriptionRoutes.get("/invoices", async (c) => {
  try {
    const user = getUser(c);
    if (user.role === "superadmin") await expireSubscriptionInvoices();
    else await expireOwnerInvoices(user.userId);
    const status = c.req.query("status");

    let query = db
      .select({
        id: subscriptionInvoices.id,
        invoiceNo: subscriptionInvoices.invoiceNo,
        tenantId: subscriptionInvoices.tenantId,
        userId: subscriptionInvoices.userId,
        planId: subscriptionInvoices.planId,
        referralCodeId: subscriptionInvoices.referralCodeId,
        durationMonths: subscriptionInvoices.durationMonths,
        originalAmount: subscriptionInvoices.originalAmount,
        discountAmount: subscriptionInvoices.discountAmount,
        promotionDiscountAmount: subscriptionInvoices.promotionDiscountAmount,
        referralDiscountAmount: subscriptionInvoices.referralDiscountAmount,
        finalAmount: subscriptionInvoices.finalAmount,
        status: subscriptionInvoices.status,
        paymentProofUrl: subscriptionInvoices.paymentProofUrl,
        paymentProofUploadedAt: subscriptionInvoices.paymentProofUploadedAt,
        verifiedAt: subscriptionInvoices.verifiedAt,
        rejectionReason: subscriptionInvoices.rejectionReason,
        periodStart: subscriptionInvoices.periodStart,
        periodEnd: subscriptionInvoices.periodEnd,
        expiresAt: subscriptionInvoices.expiresAt,
        activationStatus: subscriptionInvoices.activationStatus,
        activationReason: subscriptionInvoices.activationReason,
        qrisIssuedAt: subscriptionInvoices.qrisIssuedAt,
        invalidatedAt: subscriptionInvoices.invalidatedAt,
        invalidationReason: subscriptionInvoices.invalidationReason,
        createdAt: subscriptionInvoices.createdAt,
        outletName: tenants.outletName,
        userName: users.name,
        userEmail: users.email,
        planName: plans.name,
        referralCodeStr: referralCodes.code,
      })
      .from(subscriptionInvoices)
      .leftJoin(tenants, eq(subscriptionInvoices.tenantId, tenants.id))
      .leftJoin(users, eq(subscriptionInvoices.userId, users.id))
      .leftJoin(plans, eq(subscriptionInvoices.planId, plans.id))
      .leftJoin(referralCodes, eq(subscriptionInvoices.referralCodeId, referralCodes.id))
      .orderBy(desc(subscriptionInvoices.createdAt));

    const records = await query;
    let filtered = records;

    // Jika bukan superadmin, hanya lihat invoice milik tenant-nya sendiri
    if (user.role !== "superadmin") {
      filtered = filtered.filter((r) => r.userId === user.userId);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return c.json({ success: true, data: filtered.map(presentInvoice) });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 6. GET /api/subscription/invoices/:id
 * Detail invoice
 */
subscriptionRoutes.get("/invoices/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID invoice diperlukan" }, 400);

    const [found] = await db
      .select()
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, id));

    if (!found) {
      return c.json({ success: false, message: "Invoice tidak ditemukan" }, 404);
    }

    const actor = getUser(c);
    if (actor.role !== "superadmin" && found.userId !== actor.userId) return c.json({ success: false, message: "Akses invoice ditolak" }, 403);
    return c.json({ success: true, data: presentInvoice(found) });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 7. PUT /api/subscription/invoices/:id/verify
 * Verifikasi & aktivasi invoice (Superadmin)
 */
subscriptionRoutes.put(
  "/invoices/:id/verify",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");
      if (!id) return c.json({ success: false, message: "ID invoice diperlukan" }, 400);

      const result = await verifySubscriptionInvoice(id, user.userId);
      return c.json({
        success: true,
        message: result.invoice.activationStatus === "active" ? "Invoice lunas; masa aktif telah diperpanjang." : "Pembayaran tercatat; aktivasi memerlukan review admin.",
        data: result,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

/**
 * 8. PUT /api/subscription/invoices/:id/reject
 * Tolak invoice (Superadmin)
 */
subscriptionRoutes.put(
  "/invoices/:id/reject",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");
      if (!id) return c.json({ success: false, message: "ID invoice diperlukan" }, 400);

      const body = await c.req.json();
      const reason = body.reason || "Bukti transfer tidak sesuai atau tidak terbaca";

      const updated = await rejectSubscriptionInvoice(id, user.userId, reason);
      return c.json({
        success: true,
        message: "Invoice berhasil ditolak.",
        data: updated,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

/**
 * 9. POST /api/subscription/check-trial-reminders
 * Trigger manual scan reminder masa trial (Superadmin)
 */
subscriptionRoutes.post(
  "/check-trial-reminders",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const result = await runTrialReminderCheck();
      return c.json({
        success: true,
        message: "Pemeriksaan trial reminder selesai dijalankan.",
        data: result,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);
/** Administrative payment confirmation shares pricing and atomic activation with invoices. */
subscriptionRoutes.post("/admin-extend", requireRole(["superadmin"]), async c => {
  try {
    const actor = getUser(c);
    const body = await c.req.json();
    if (typeof body.tenantId !== "string") return c.json({ success: false, message: "Tenant ID diperlukan" }, 400);
    if (typeof body.idempotencyKey !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(body.idempotencyKey)) return c.json({ success: false, message: "Idempotency key diperlukan" }, 400);
    const [branch] = await db.select().from(tenants).where(eq(tenants.id, body.tenantId));
    if (!branch) return c.json({ success: false, message: "Outlet tidak ditemukan" }, 404);
    const [owner] = await db.select().from(users).where(eq(users.id, branch.userId));
    const { invoice } = await createSubscriptionInvoice({ tenantId: branch.id, userId: actor.userId,
      planId: body.planId || (owner?.tier === "premium" ? "premium" : "pro"), durationMonths: body.durationMonths ?? 1, idempotencyKey: `admin:${actor.userId}:${body.idempotencyKey}` });
    if (invoice.status !== "paid" && body.paymentProofUrl) await uploadPaymentProof(invoice.id, body.paymentProofUrl, invoice.tenantId, actor.userId);
    if (invoice.status !== "paid") await db.update(subscriptionInvoices).set({ status: "pending_verification",
      notes: typeof body.notes === "string" ? body.notes : "Verifikasi langsung oleh admin",
    }).where(and(eq(subscriptionInvoices.id, invoice.id), eq(subscriptionInvoices.status, "unpaid")));
    const result = await verifySubscriptionInvoice(invoice.id, actor.userId);
    return c.json({ success: true, data: { tenantId: branch.id, totalAmount: invoice.finalAmount, newExpiry: result.tenant.subscriptionUntil, activationStatus: result.invoice.activationStatus } });
  } catch (error) {
    console.error("[subscription] admin confirmation failed", { actorId: getUser(c).userId });
    return c.json({ success: false, message: error instanceof Error ? error.message : "Perpanjangan gagal" }, 400);
  }
});

for (const action of ["apply-referral", "remove-referral"] as const) {
  subscriptionRoutes.post(`/${action}`, requireRole(["superadmin", "tenant_owner"]), async c => {
    try {
      const actor = getUser(c), body = await c.req.json();
      const tenantId = actor.role === "superadmin" ? body.tenantId : actor.tenantId;
      if (typeof tenantId !== "string") return c.json({ success: false, message: "Cabang diperlukan" }, 400);
      const code = action === "remove-referral" ? null : body.referralCode;
      if (code !== null && (typeof code !== "string" || !code.trim() || code.length > 80)) return c.json({ success: false, message: "Kode tidak valid" }, 400);
      const result = await setOwnerReferral(tenantId, actor.userId, actor.role === "superadmin", code);
      return c.json({ success: true, data: result, message: "Referral billing Owner diperbarui" });
    } catch (error) { return c.json({ success: false, message: error instanceof Error ? error.message : "Referral gagal diperbarui" }, 409); }
  });
}
subscriptionRoutes.post("/invoices/:id/retry-activation", requireRole(["superadmin"]), async c => {
  const { retryInvoiceActivation } = await import("../services/subscriptionService");
  try { return c.json({ success: true, data: await retryInvoiceActivation(c.req.param("id")!) }); }
  catch { return c.json({ success: false, message: "Aktivasi masih memerlukan review" }, 409); }
});
subscriptionRoutes.post("/invoices/:id/adjustments", requireRole(["superadmin"]), async c => {
  try { return c.json({success:true,data:await recordPaymentAdjustment(c.req.param("id")!,getUser(c).userId,await c.req.json())}); }
  catch(error){return c.json({success:false,message:error instanceof Error?error.message:"Penyesuaian gagal"},409);}
});
subscriptionRoutes.post("/invoices/:id/review-activation", requireRole(["superadmin"]), async c => {
  try { const { reviewInvoiceActivation }=await import("../services/subscriptionService"); return c.json({success:true,data:await reviewInvoiceActivation(c.req.param("id")!,getUser(c).userId,await c.req.json())}); }
  catch(error){return c.json({success:false,message:error instanceof Error?error.message:"Review gagal"},409);}
});
export default subscriptionRoutes;
