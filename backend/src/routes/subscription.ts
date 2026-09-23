import { Hono } from "hono";
import { db } from "../db/index";
import {
  subscriptionInvoices,
  tenants,
  users,
  plans,
  referralCodes,
} from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import {
  getSubscriptionSummary,
  getApplicablePrice,
  createSubscriptionInvoice,
  uploadPaymentProof,
  verifySubscriptionInvoice,
  rejectSubscriptionInvoice,
} from "../services/subscriptionService";
import { runTrialReminderCheck } from "../jobs/trialReminder";

const subscriptionRoutes = new Hono();

subscriptionRoutes.use("*", authMiddleware);

/**
 * 1. GET /api/subscription/summary
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
 * 2. GET /api/subscription/pricing
 * Hitung kalkulasi harga paket & diskon referral
 */
subscriptionRoutes.get("/pricing", async (c) => {
  try {
    const user = getUser(c);
    const tenantId = user.tenantId || c.req.query("tenantId");
    if (!tenantId) {
      return c.json({ success: false, message: "Tenant ID diperlukan" }, 400);
    }

    const planId = c.req.query("planId");
    const referralCode = c.req.query("referralCode");

    const calculation = await getApplicablePrice(tenantId, planId, referralCode);
    return c.json({ success: true, data: calculation });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. POST /api/subscription/invoices
 * Buat invoice perpanjangan langganan
 */
subscriptionRoutes.post("/invoices", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const tenantId = user.tenantId || body.tenantId;

    if (!tenantId) {
      return c.json({ success: false, message: "Tenant ID diperlukan" }, 400);
    }

    const result = await createSubscriptionInvoice({
      tenantId,
      userId: user.userId,
      planId: body.planId,
      durationMonths: Number(body.durationMonths) || 1,
      referralCode: body.referralCode,
    });

    return c.json({
      success: true,
      message: "Invoice berhasil dibuat",
      data: result,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 4. POST /api/subscription/invoices/:id/proof
 * Unggah bukti pembayaran
 */
subscriptionRoutes.post("/invoices/:id/proof", async (c) => {
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
      .select({ tenantId: subscriptionInvoices.tenantId })
      .from(subscriptionInvoices)
      .where(eq(subscriptionInvoices.id, id));
    if (!invoice) {
      return c.json({ success: false, message: "Invoice tidak ditemukan" }, 404);
    }
    if (user.role !== "superadmin" && invoice.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: invoice bukan milik outlet Anda" }, 403);
    }

    const updated = await uploadPaymentProof(id, proofUrl, invoice.tenantId);
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
        finalAmount: subscriptionInvoices.finalAmount,
        status: subscriptionInvoices.status,
        paymentProofUrl: subscriptionInvoices.paymentProofUrl,
        paymentProofUploadedAt: subscriptionInvoices.paymentProofUploadedAt,
        verifiedAt: subscriptionInvoices.verifiedAt,
        rejectionReason: subscriptionInvoices.rejectionReason,
        periodStart: subscriptionInvoices.periodStart,
        periodEnd: subscriptionInvoices.periodEnd,
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
      filtered = filtered.filter((r) => r.tenantId === user.tenantId);
    }

    if (status) {
      filtered = filtered.filter((r) => r.status === status);
    }

    return c.json({ success: true, data: filtered });
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

    return c.json({ success: true, data: found });
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
        message: "Invoice berhasil diverifikasi dan masa aktif langganan telah diperpanjang.",
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

export default subscriptionRoutes;
