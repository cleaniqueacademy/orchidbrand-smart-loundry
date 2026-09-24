import { Hono } from "hono";
import { db } from "../db/index";
import {
  referralCodes,
  referralCodeTenants,
  referralEvents,
  marketingProfiles,
  tenants,
  users,
} from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { rateLimit } from "../middleware/rateLimit";
import { newId } from "../utils/id";
import { validateCode, recordClick } from "../services/referralService";

const referralRoutes = new Hono();

// ---------------------------------------------------------------------------
// 1. Endpoint Publik: Validasi Kode Referral
// ---------------------------------------------------------------------------
referralRoutes.get(
  "/validate",
  rateLimit({ max: 60, windowMs: 60 * 1000 }),
  async (c) => {
    try {
      const code = c.req.query("code");
      const tenantId = c.req.query("tenantId");

      if (!code) {
        return c.json({ success: false, message: "Kode referral diperlukan" }, 400);
      }

      const result = await validateCode(code, tenantId);
      if (!result.valid || !result.code) {
        return c.json({ success: false, message: result.message }, 400);
      }

      // Catat click / view event jika valid
      await recordClick(result.code.id, tenantId, {
        ip: c.req.header("x-forwarded-for") || "unknown",
        userAgent: c.req.header("user-agent") || "unknown",
      });

      return c.json({
        success: true,
        data: {
          code: result.code.code,
          name: result.code.name,
          description: result.code.description,
          discountType: result.discountType,
          discountValue: result.discountValue,
        },
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

// ---------------------------------------------------------------------------
// 2. Autentikasi untuk endpoint manajerial
// ---------------------------------------------------------------------------
referralRoutes.use("*", authMiddleware);

/**
 * List referral codes:
 * - Superadmin: melihat semua kode
 * - Marketing: hanya melihat kodenya sendiri
 * - Tenant Owner: melihat kode yang berlaku untuk outletnya
 */
referralRoutes.get("/", async (c) => {
  try {
    const user = getUser(c);

    let codes: (typeof referralCodes.$inferSelect)[] = [];

    if (user.role === "superadmin") {
      codes = await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
    } else if (user.role === "marketing") {
      // Cari marketing profile berdasarkan user.id
      const profiles = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.userId, user.userId));

      if (profiles.length > 0) {
        codes = await db
          .select()
          .from(referralCodes)
          .where(eq(referralCodes.marketingProfileId, profiles[0].id))
          .orderBy(desc(referralCodes.createdAt));
      }
    } else {
      // Tenant owner & staff: ambil kode yang aktif dan berlaku
      codes = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.isActive, "true"))
        .orderBy(desc(referralCodes.createdAt));
    }

    return c.json({ success: true, data: codes });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * GET /api/referral-codes/track
 * Melacak setiap kode referral (misal ILHAM-MARKETING) dan daftar tenant yang mendaftar dengannya
 */
referralRoutes.get("/track", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const allCodes = await db.select().from(referralCodes).orderBy(desc(referralCodes.createdAt));
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));

    let targetCodes = allCodes;
    if (user.role === "marketing") {
      const [profile] = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.userId, user.userId));

      targetCodes = allCodes.filter((rc) =>
        (profile && rc.marketingProfileId === profile.id) || rc.createdByUserId === user.userId
      );
    }

    const results = targetCodes.map((rc) => {
      const associatedTenants = allTenants.filter(
        (t) => t.referralCodeId === rc.id
      );
      return {
        id: rc.id,
        code: rc.code,
        name: rc.name,
        description: rc.description,
        discountType: rc.discountType,
        discountValue: rc.discountValue,
        commissionValue: rc.commissionValue,
        isActive: rc.isActive === "true",
        totalTenants: associatedTenants.length,
        tenants: associatedTenants.map((t) => ({
          id: t.id,
          outletName: t.outletName,
          phone: t.phone,
          city: t.city,
          status: t.status,
          isTrial: t.isTrial === "true",
          subscriptionUntil: t.subscriptionUntil,
          createdAt: t.createdAt,
        })),
      };
    });

    return c.json({ success: true, data: results });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Buat kode referral baru
 * Role: superadmin atau marketing
 */
referralRoutes.post("/", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();

    const {
      code,
      name,
      description,
      discountType = "percent",
      discountValue = 0,
      commissionType = "percent",
      commissionValue = 0,
      maxUsage = null,
      validFrom = null,
      validUntil = null,
      appliesToAllTenants = "true",
      marketingProfileId: providedMarketingProfileId,
    } = body;

    if (!code || !name) {
      return c.json({ success: false, message: "Kode dan Nama promo wajib diisi" }, 400);
    }

    const cleanCode = String(code).trim().toUpperCase();

    // Cek duplikasi kode
    const existing = await db
      .select()
      .from(referralCodes)
      .where(eq(sql`UPPER(${referralCodes.code})`, cleanCode));

    if (existing.length > 0) {
      return c.json({ success: false, message: `Kode '${cleanCode}' sudah digunakan.` }, 400);
    }

    let marketingProfileId = providedMarketingProfileId ?? null;

    // Jika role marketing, otomatis kaitkan ke marketing profil miliknya
    if (user.role === "marketing") {
      const profiles = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.userId, user.userId));

      if (profiles.length > 0) {
        marketingProfileId = profiles[0].id;
      }
    }

    const id = newId("ref");
    const today = new Date().toISOString();

    const [created] = await db
      .insert(referralCodes)
      .values({
        id,
        code: cleanCode,
        name: String(name).trim(),
        description: description ? String(description).trim() : null,
        discountType,
        discountValue: Number(discountValue) || 0,
        commissionType,
        commissionValue: Number(commissionValue) || 0,
        maxUsage: maxUsage ? Number(maxUsage) : null,
        currentUsage: 0,
        validFrom: validFrom || null,
        validUntil: validUntil || null,
        isActive: "true",
        appliesToAllTenants: String(appliesToAllTenants) === "false" ? "false" : "true",
        marketingProfileId,
        createdByUserId: user.userId,
        createdAt: today,
        updatedAt: today,
      })
      .returning();

    return c.json({
      success: true,
      message: "Kode referral berhasil dibuat",
      data: created,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Detail satu kode referral
 */
referralRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    const [found] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));

    if (!found) {
      return c.json({ success: false, message: "Kode referral tidak ditemukan" }, 404);
    }

    return c.json({ success: true, data: found });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Update kode referral
 */
referralRoutes.put("/:id", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    const body = await c.req.json();

    const [existing] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
    if (!existing) {
      return c.json({ success: false, message: "Kode referral tidak ditemukan" }, 404);
    }

    // Guard: marketing hanya boleh edit kodenya sendiri
    if (user.role === "marketing" && existing.createdByUserId !== user.userId) {
      return c.json({ success: false, message: "Akses ditolak" }, 403);
    }

    const updates: Partial<typeof referralCodes.$inferInsert> = {
      name: body.name !== undefined ? String(body.name).trim() : existing.name,
      description: body.description !== undefined ? body.description : existing.description,
      discountType: body.discountType ?? existing.discountType,
      discountValue:
        body.discountValue !== undefined ? Number(body.discountValue) : existing.discountValue,
      commissionType: body.commissionType ?? existing.commissionType,
      commissionValue:
        body.commissionValue !== undefined ? Number(body.commissionValue) : existing.commissionValue,
      maxUsage: body.maxUsage !== undefined ? (body.maxUsage ? Number(body.maxUsage) : null) : existing.maxUsage,
      validFrom: body.validFrom !== undefined ? body.validFrom : existing.validFrom,
      validUntil: body.validUntil !== undefined ? body.validUntil : existing.validUntil,
      isActive: body.isActive !== undefined ? String(body.isActive) : existing.isActive,
      appliesToAllTenants:
        body.appliesToAllTenants !== undefined
          ? String(body.appliesToAllTenants)
          : existing.appliesToAllTenants,
      updatedAt: new Date().toISOString(),
    };

    const [updated] = await db
      .update(referralCodes)
      .set(updates)
      .where(eq(referralCodes.id, id))
      .returning();

    return c.json({ success: true, message: "Kode referral berhasil diperbarui", data: updated });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Hapus kode referral
 * Role: superadmin
 */
referralRoutes.delete("/:id", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    await db.delete(referralCodeTenants).where(eq(referralCodeTenants.referralCodeId, id));
    await db.delete(referralEvents).where(eq(referralEvents.referralCodeId, id));
    await db.delete(referralCodes).where(eq(referralCodes.id, id));

    return c.json({ success: true, message: "Kode referral berhasil dihapus" });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Statistik performa kode referral (clicks, signups, revenue, commission)
 */
referralRoutes.get("/:id/stats", async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
    if (!code) {
      return c.json({ success: false, message: "Kode referral tidak ditemukan" }, 404);
    }

    const events = await db
      .select()
      .from(referralEvents)
      .where(eq(referralEvents.referralCodeId, id));

    let clicks = 0;
    let signups = 0;
    let paymentsCount = 0;
    let totalRevenue = 0;
    let totalCommission = 0;

    for (const ev of events) {
      if (ev.eventType === "click") clicks++;
      if (ev.eventType === "signup") signups++;
      if (ev.eventType === "subscription_payment" && ev.metadata) {
        try {
          const meta = JSON.parse(ev.metadata);
          paymentsCount++;
          totalRevenue += Number(meta.baseAmount) || 0;
          totalCommission += Number(meta.commissionAmount) || 0;
        } catch {}
      }
    }

    return c.json({
      success: true,
      data: {
        code: code.code,
        currentUsage: code.currentUsage,
        maxUsage: code.maxUsage,
        clicks,
        signups,
        conversionRate: clicks > 0 ? Math.round((signups / clicks) * 100) : 0,
        paymentsCount,
        totalRevenue,
        totalCommission,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Toggle aktivasi kode per tenant (outlet)
 * Role: superadmin
 */
referralRoutes.post("/:id/toggle-tenant", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    const body = await c.req.json();
    const { tenantId, isEnabled } = body;

    if (!tenantId) {
      return c.json({ success: false, message: "tenantId wajib disertakan" }, 400);
    }

    const existing = await db
      .select()
      .from(referralCodeTenants)
      .where(
        and(
          eq(referralCodeTenants.referralCodeId, id),
          eq(referralCodeTenants.tenantId, tenantId)
        )
      );

    if (existing.length > 0) {
      await db
        .update(referralCodeTenants)
        .set({ isEnabled: String(isEnabled) === "true" ? "true" : "false" })
        .where(eq(referralCodeTenants.id, existing[0].id));
    } else {
      await db.insert(referralCodeTenants).values({
        id: newId("reften"),
        referralCodeId: id,
        tenantId,
        isEnabled: String(isEnabled) === "true" ? "true" : "false",
        createdAt: new Date().toISOString(),
      });
    }

    return c.json({
      success: true,
      message: "Status aktivasi kode referral untuk outlet berhasil diubah",
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * Ambil daftar tenant dan status aktivasinya untuk kode ini
 */
referralRoutes.get("/:id/tenants", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID kode referral diperlukan" }, 400);
    const allTenants = await db.select().from(tenants);
    const activations = await db
      .select()
      .from(referralCodeTenants)
      .where(eq(referralCodeTenants.referralCodeId, id));

    const activationMap = new Map<string, boolean>();
    for (const a of activations) {
      activationMap.set(a.tenantId, a.isEnabled === "true");
    }

    const [code] = await db.select().from(referralCodes).where(eq(referralCodes.id, id));
    const defaultEnabled = code ? code.appliesToAllTenants === "true" : true;

    const data = allTenants.map((t) => ({
      tenantId: t.id,
      outletName: t.outletName,
      phone: t.phone,
      city: t.city,
      isEnabled: activationMap.has(t.id) ? activationMap.get(t.id)! : defaultEnabled,
    }));

    return c.json({ success: true, data });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default referralRoutes;
