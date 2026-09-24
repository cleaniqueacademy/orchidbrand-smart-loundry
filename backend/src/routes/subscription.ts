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
import { authMiddleware, getUser, invalidateTenantAuthCache } from "../middleware/auth";
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
import { validateCode } from "../services/referralService";
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
/**
 * 10. POST /api/subscription/admin-extend
 * Superadmin langsung memperpanjang masa aktif tenant setelah menerima transfer:
 * - Mendeteksi apakah tenant memiliki kode referral (Rp 55.000 / bln) atau tidak (Rp 60.000 / bln)
 * - Memperpanjang subscriptionUntil outlet
 * - Mengubah isTrial = 'false' dan status = 'active'
 * - Otomatis mencatat kas masuk platform (platformCashflow)
 */
subscriptionRoutes.post(
  "/admin-extend",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const user = getUser(c);
      const body = await c.req.json();
      const {
        tenantId,
        durationMonths = 1,
        notes = "",
        paymentProofUrl = "",
      } = body;

      if (!tenantId) {
        return c.json({ success: false, message: "Tenant ID wajib diisi" }, 400);
      }

      const tenantRows = await db.select().from(tenants).where(eq(tenants.id, tenantId)).limit(1);
      const targetTenant = tenantRows[0];
      if (!targetTenant) {
        return c.json({ success: false, message: "Tenant tidak ditemukan" }, 404);
      }

      const months = Math.max(1, Number(durationMonths) || 1);

      // Cek apakah tenant punya referral code
      let hasReferral = false;
      let refCodeName: string | null = null;
      if (targetTenant.referralCodeId) {
        hasReferral = true;
        const refRows = await db.select().from(referralCodes).where(eq(referralCodes.id, targetTenant.referralCodeId)).limit(1);
        if (refRows[0]) refCodeName = refRows[0].code;
      }

      // Harga: 55.000 jika referral, 60.000 jika normal
      const pricePerMonth = hasReferral ? 55000 : 60000;
      const totalAmount = pricePerMonth * months;

      // Hitung perpanjangan tanggal
      const nowStr = today();
      const currentExpiry = targetTenant.subscriptionUntil || nowStr;
      const baseDate = currentExpiry > nowStr ? currentExpiry : nowStr;
      const newExpiry = addDays(baseDate, months * 30);

      // Update tenant
      await db
        .update(tenants)
        .set({
          subscriptionUntil: newExpiry,
          isTrial: "false",
          status: "active",
        })
        .where(eq(tenants.id, tenantId));

      invalidateTenantAuthCache(tenantId);

      // Catat Kas Masuk Platform
      const cashflowEntry = {
        id: newId("pcf"),
        type: "income",
        category: "subscription",
        amount: totalAmount,
        date: today(),
        tenantId: targetTenant.id,
        referralCode: refCodeName,
        durationMonths: months,
        description: `Perpanjangan ${targetTenant.outletName} (${months} bln${hasReferral ? ` - Ref: ${refCodeName}` : ""})`,
        proofUrl: paymentProofUrl ? String(paymentProofUrl).trim() : null,
        notes: notes ? String(notes).trim() : null,
        createdByUserId: user.userId,
        createdAt: new Date().toISOString(),
      };
      await db.insert(platformCashflow).values(cashflowEntry);

      return c.json({
        success: true,
        message: `Masa aktif ${targetTenant.outletName} berhasil diperpanjang hingga ${newExpiry}. Kas masuk tercatat Rp ${totalAmount.toLocaleString("id-ID")}.`,
        data: {
          tenantId,
          outletName: targetTenant.outletName,
          hasReferral,
          referralCode: refCodeName,
          durationMonths: months,
          totalAmount,
          newExpiry,
          cashflowId: cashflowEntry.id,
        },
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

/**
 * 11. POST /api/subscription/apply-referral
 * Menerapkan (atau mengganti) kode referral pada outlet tertentu.
 * Bisa dipanggil oleh tenant_owner (untuk outlet miliknya) atau superadmin.
 */
subscriptionRoutes.post("/apply-referral", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const targetTenantId = body.tenantId || user.tenantId;

    if (!targetTenantId) {
      return c.json({ success: false, message: "ID Outlet (tenantId) diperlukan" }, 400);
    }

    if (user.role !== "superadmin" && user.tenantId !== targetTenantId) {
      return c.json(
        { success: false, message: "Akses ditolak: Anda hanya dapat mengatur outlet Anda sendiri" },
        403
      );
    }

    const { referralCode } = body;
    if (!referralCode || !String(referralCode).trim()) {
      return c.json({ success: false, message: "Kode referral wajib diisi" }, 400);
    }

    const [targetTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, targetTenantId))
      .limit(1);

    if (!targetTenant) {
      return c.json({ success: false, message: "Outlet tidak ditemukan" }, 404);
    }

    const cleanCode = String(referralCode).trim().toUpperCase();
    const valRes = await validateCode(cleanCode, targetTenant.id);
    if (!valRes.valid || !valRes.code) {
      return c.json(
        {
          success: false,
          message: valRes.message || "Kode referral tidak valid atau sudah tidak aktif",
        },
        400
      );
    }

    const newCode = valRes.code;

    // Jika tenant sudah menggunakan kode ini
    if (targetTenant.referralCodeId === newCode.id) {
      return c.json({
        success: true,
        message: `Kode referral '${newCode.code}' sudah aktif pada outlet ini.`,
        data: {
          referralCode: newCode.code,
          tenantId: targetTenant.id,
          discountType: newCode.discountType,
          discountValue: newCode.discountValue,
        },
      });
    }

    // Jika sebelumnya ada kode lama yang berbeda, kurangi kuota kode lama jika > 0
    if (targetTenant.referralCodeId && targetTenant.referralCodeId !== newCode.id) {
      await db
        .update(referralCodes)
        .set({
          currentUsage: sql`GREATEST(0, ${referralCodes.currentUsage} - 1)`,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(referralCodes.id, targetTenant.referralCodeId));
    }

    // Tambahkan kuota pada kode baru
    await db
      .update(referralCodes)
      .set({
        currentUsage: sql`${referralCodes.currentUsage} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(referralCodes.id, newCode.id));

    // Update tenant
    await db
      .update(tenants)
      .set({
        referralCodeId: newCode.id,
        source: "referral",
      })
      .where(eq(tenants.id, targetTenant.id));

    // Hubungkan marketing profile ke akun user jika belum terhubung
    if (newCode.marketingProfileId) {
      const [ownerUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, targetTenant.userId))
        .limit(1);

      if (ownerUser && !ownerUser.marketingUserId) {
        await db
          .update(users)
          .set({ marketingUserId: newCode.marketingProfileId })
          .where(eq(users.id, ownerUser.id));
      }
    }

    // Catat referral event
    try {
      await db.insert(referralEvents).values({
        id: newId("refevt"),
        referralCodeId: newCode.id,
        tenantId: targetTenant.id,
        eventType: "tenant_applied",
        metadata: JSON.stringify({
          outletName: targetTenant.outletName,
          appliedByUserId: user.userId,
          appliedAt: new Date().toISOString(),
        }),
        createdAt: new Date().toISOString(),
      });
    } catch (eventErr: any) {
      console.warn("Gagal mencatat event referral:", eventErr.message);
    }

    invalidateTenantAuthCache(targetTenant.id);

    return c.json({
      success: true,
      message: `Kode referral '${newCode.code}' berhasil diterapkan! Tarif perpanjangan outlet kini hemat menjadi Rp 55.000/bulan.`,
      data: {
        referralCode: newCode.code,
        tenantId: targetTenant.id,
        discountType: newCode.discountType,
        discountValue: newCode.discountValue,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 12. POST /api/subscription/remove-referral
 * Mencopot kode referral dari outlet (kembali ke tarif normal Rp 60.000/bulan).
 */
subscriptionRoutes.post("/remove-referral", async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const targetTenantId = body.tenantId || user.tenantId;

    if (!targetTenantId) {
      return c.json({ success: false, message: "ID Outlet (tenantId) diperlukan" }, 400);
    }

    if (user.role !== "superadmin" && user.tenantId !== targetTenantId) {
      return c.json(
        { success: false, message: "Akses ditolak: Anda hanya dapat mengatur outlet Anda sendiri" },
        403
      );
    }

    const [targetTenant] = await db
      .select()
      .from(tenants)
      .where(eq(tenants.id, targetTenantId))
      .limit(1);

    if (!targetTenant) {
      return c.json({ success: false, message: "Outlet tidak ditemukan" }, 404);
    }

    if (!targetTenant.referralCodeId) {
      return c.json({ success: true, message: "Outlet tidak memiliki kode referral aktif." });
    }

    // Kurangi kuota kode referral jika > 0
    await db
      .update(referralCodes)
      .set({
        currentUsage: sql`GREATEST(0, ${referralCodes.currentUsage} - 1)`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(referralCodes.id, targetTenant.referralCodeId));

    // Lepas referral dari tenant
    await db
      .update(tenants)
      .set({
        referralCodeId: null,
      })
      .where(eq(tenants.id, targetTenant.id));

    invalidateTenantAuthCache(targetTenant.id);

    return c.json({
      success: true,
      message: "Kode referral berhasil dicopot. Tarif perpanjangan kembali ke tarif standar Rp 60.000/bulan.",
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default subscriptionRoutes;
