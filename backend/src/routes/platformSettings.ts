import { Hono } from "hono";
import { db } from "../db/index";
import { platformSettings } from "../db/schema";
import { eq } from "drizzle-orm";
import { authMiddleware } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const platformSettingsRoutes = new Hono();

/**
 * 1. GET /api/platform-settings/public
 * Informasi umum platform untuk publik & form pembayaran
 */
platformSettingsRoutes.get("/public", async (c) => {
  try {
    const [settings] = await db.select().from(platformSettings).limit(1);

    if (!settings) {
      return c.json({
        success: true,
        data: {
          platformName: "Orchid Brand Smart Laundry",
          defaultTrialDays: 7,
        },
      });
    }

    return c.json({
      success: true,
      data: {
        platformName: settings.platformName,
        platformLogo: settings.platformLogo,
        bankName: settings.bankName,
        bankAccountNumber: settings.bankAccountNumber,
        bankAccountName: settings.bankAccountName,
        qrisInfo: settings.qrisInfo,
        defaultTrialDays: settings.defaultTrialDays,
        supportPhone: settings.supportPhone,
        supportEmail: settings.supportEmail,
        termsUrl: settings.termsUrl,
        privacyUrl: settings.privacyUrl,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ---------------------------------------------------------------------------
// Rute Manajerial Superadmin
// ---------------------------------------------------------------------------
platformSettingsRoutes.use("*", authMiddleware);

/**
 * 2. GET /api/platform-settings
 * Mengambil semua setting platform (Superadmin)
 */
platformSettingsRoutes.get("/", requireRole(["superadmin"]), async (c) => {
  try {
    let [settings] = await db.select().from(platformSettings).limit(1);

    if (!settings) {
      // Inisialisasi jika belum ada
      const [created] = await db
        .insert(platformSettings)
        .values({
          id: "default",
          platformName: "Orchid Brand Smart Laundry",
          defaultTrialDays: 7,
          defaultAiDailyQuota: 50,
          updatedAt: new Date().toISOString(),
        })
        .returning();
      settings = created;
    }

    return c.json({ success: true, data: settings });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. PUT /api/platform-settings
 * Mengubah setting platform (Superadmin)
 */
platformSettingsRoutes.put("/", requireRole(["superadmin"]), async (c) => {
  try {
    const body = await c.req.json();
    let [existing] = await db.select().from(platformSettings).limit(1);

    const nowIso = new Date().toISOString();

    const updates: Partial<typeof platformSettings.$inferInsert> = {
      platformName: body.platformName !== undefined ? String(body.platformName).trim() : existing?.platformName,
      platformLogo: body.platformLogo !== undefined ? body.platformLogo : existing?.platformLogo,
      bankName: body.bankName !== undefined ? body.bankName : existing?.bankName,
      bankAccountNumber:
        body.bankAccountNumber !== undefined ? body.bankAccountNumber : existing?.bankAccountNumber,
      bankAccountName:
        body.bankAccountName !== undefined ? body.bankAccountName : existing?.bankAccountName,
      qrisInfo: body.qrisInfo !== undefined ? body.qrisInfo : existing?.qrisInfo,
      defaultTrialDays:
        body.defaultTrialDays !== undefined ? Number(body.defaultTrialDays) : existing?.defaultTrialDays,
      defaultAiDailyQuota:
        body.defaultAiDailyQuota !== undefined
          ? Number(body.defaultAiDailyQuota)
          : existing?.defaultAiDailyQuota,
      supportPhone: body.supportPhone !== undefined ? body.supportPhone : existing?.supportPhone,
      supportEmail: body.supportEmail !== undefined ? body.supportEmail : existing?.supportEmail,
      termsUrl: body.termsUrl !== undefined ? body.termsUrl : existing?.termsUrl,
      privacyUrl: body.privacyUrl !== undefined ? body.privacyUrl : existing?.privacyUrl,
      updatedAt: nowIso,
    };

    let result;
    if (!existing) {
      const [created] = await db
        .insert(platformSettings)
        .values({
          id: "default",
          ...updates,
          platformName: updates.platformName || "Orchid Brand Smart Laundry",
        })
        .returning();
      result = created;
    } else {
      const [updated] = await db
        .update(platformSettings)
        .set(updates)
        .where(eq(platformSettings.id, existing.id))
        .returning();
      result = updated;
    }

    return c.json({
      success: true,
      message: "Pengaturan platform berhasil diperbarui",
      data: result,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default platformSettingsRoutes;
