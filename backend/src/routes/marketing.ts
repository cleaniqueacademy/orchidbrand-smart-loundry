import { Hono } from "hono";
import { db } from "../db/index";
import {
  users,
  marketingProfiles,
  referralCodes,
  marketingCommissions,
  tenants,
  subscriptionInvoices,
} from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { newId } from "../utils/id";

const marketingRoutes = new Hono();

marketingRoutes.use("*", authMiddleware);

/**
 * 1. GET /api/marketing/me
 * Mengambil profil marketing pengguna yang sedang login beserta ringkasan statistik
 */
marketingRoutes.get("/me", requireRole(["marketing", "superadmin"]), async (c) => {
  try {
    const user = getUser(c);

    let profile = null;
    const profiles = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.userId, user.userId));

    if (profiles.length > 0) {
      profile = profiles[0];
    } else if (user.role === "superadmin") {
      return c.json({
        success: true,
        data: {
          isSuperadmin: true,
          message: "Anda masuk sebagai Superadmin",
        },
      });
    } else {
      return c.json({ success: false, message: "Profil marketing tidak ditemukan" }, 404);
    }

    // Ambil kode referral milik profil ini
    const codes = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.marketingProfileId, profile.id))
      .orderBy(desc(referralCodes.createdAt));

    // Ambil rekap komisi
    const commissions = await db
      .select()
      .from(marketingCommissions)
      .where(eq(marketingCommissions.marketingProfileId, profile.id))
      .orderBy(desc(marketingCommissions.createdAt));

    let pendingCommission = 0;
    let approvedCommission = 0;
    let paidCommission = 0;

    for (const comm of commissions) {
      if (comm.status === "pending") pendingCommission += comm.commissionAmount;
      if (comm.status === "approved") approvedCommission += comm.commissionAmount;
      if (comm.status === "paid") paidCommission += comm.commissionAmount;
    }

    return c.json({
      success: true,
      data: {
        profile,
        codes,
        commissionsSummary: {
          totalEarned: profile.totalEarned,
          totalWithdrawn: profile.totalWithdrawn,
          pendingCommission,
          approvedCommission,
          paidCommission,
          totalCommissionsCount: commissions.length,
        },
        recentCommissions: commissions.slice(0, 10),
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 2. GET /api/marketing/profiles
 * Daftar seluruh profil marketing (Superadmin)
 */
marketingRoutes.get("/profiles", requireRole(["superadmin"]), async (c) => {
  try {
    const allProfiles = await db
      .select({
        id: marketingProfiles.id,
        userId: marketingProfiles.userId,
        phone: marketingProfiles.phone,
        bankName: marketingProfiles.bankName,
        bankAccountNumber: marketingProfiles.bankAccountNumber,
        bankAccountName: marketingProfiles.bankAccountName,
        commissionRateDefault: marketingProfiles.commissionRateDefault,
        totalEarned: marketingProfiles.totalEarned,
        totalWithdrawn: marketingProfiles.totalWithdrawn,
        notes: marketingProfiles.notes,
        createdAt: marketingProfiles.createdAt,
        userName: users.name,
        userEmail: users.email,
        userStatus: users.status,
      })
      .from(marketingProfiles)
      .leftJoin(users, eq(marketingProfiles.userId, users.id))
      .orderBy(desc(marketingProfiles.createdAt));

    return c.json({ success: true, data: allProfiles });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. POST /api/marketing/profiles
 * Buat akun marketing baru + profil marketing (Superadmin)
 */
marketingRoutes.post("/profiles", requireRole(["superadmin"]), async (c) => {
  try {
    const body = await c.req.json();
    const {
      name,
      email,
      password,
      phone,
      bankName,
      bankAccountNumber,
      bankAccountName,
      commissionRateDefault = 10,
      notes,
    } = body;

    if (!name || !email || !password || !phone) {
      return c.json(
        { success: false, message: "Nama, email, password, dan nomor telepon wajib diisi" },
        400
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Cek email duplikat
    const existing = await db.select().from(users).where(eq(users.email, cleanEmail));
    if (existing.length > 0) {
      return c.json({ success: false, message: "Email sudah terdaftar dalam sistem" }, 400);
    }

    const passwordHash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
    const userId = newId("usr-mkt");
    const profileId = newId("mkt-prof");
    const today = new Date().toISOString();

    // Buat User
    await db.insert(users).values({
      id: userId,
      name: String(name).trim(),
      email: cleanEmail,
      passwordHash,
      role: "marketing",
      status: "active",
      createdAt: today,
    });

    // Buat Profil Marketing
    const [profile] = await db
      .insert(marketingProfiles)
      .values({
        id: profileId,
        userId,
        phone: String(phone).trim(),
        bankName: bankName ? String(bankName).trim() : null,
        bankAccountNumber: bankAccountNumber ? String(bankAccountNumber).trim() : null,
        bankAccountName: bankAccountName ? String(bankAccountName).trim() : null,
        commissionRateDefault: Number(commissionRateDefault) || 0,
        totalEarned: 0,
        totalWithdrawn: 0,
        notes: notes ? String(notes).trim() : null,
        createdAt: today,
        updatedAt: today,
      })
      .returning();

    return c.json({
      success: true,
      message: "Mitra marketing berhasil didaftarkan",
      data: {
        userId,
        profileId: profile.id,
        name,
        email: cleanEmail,
      },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 4. PUT /api/marketing/profiles/:id
 * Edit profil marketing (bank, telepon, komisi default)
 */
marketingRoutes.put("/profiles/:id", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID profil diperlukan" }, 400);
    const body = await c.req.json();

    const [existing] = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.id, id));

    if (!existing) {
      return c.json({ success: false, message: "Profil marketing tidak ditemukan" }, 404);
    }

    // Jika marketing, hanya boleh edit profilnya sendiri
    if (user.role === "marketing" && existing.userId !== user.userId) {
      return c.json({ success: false, message: "Akses ditolak" }, 403);
    }

    const updates: Partial<typeof marketingProfiles.$inferInsert> = {
      phone: body.phone !== undefined ? String(body.phone).trim() : existing.phone,
      bankName: body.bankName !== undefined ? body.bankName : existing.bankName,
      bankAccountNumber:
        body.bankAccountNumber !== undefined ? body.bankAccountNumber : existing.bankAccountNumber,
      bankAccountName:
        body.bankAccountName !== undefined ? body.bankAccountName : existing.bankAccountName,
      notes: body.notes !== undefined ? body.notes : existing.notes,
      updatedAt: new Date().toISOString(),
    };

    // Hanya superadmin yang boleh ganti komisi default
    if (user.role === "superadmin" && body.commissionRateDefault !== undefined) {
      updates.commissionRateDefault = Number(body.commissionRateDefault) || 0;
    }

    const [updated] = await db
      .update(marketingProfiles)
      .set(updates)
      .where(eq(marketingProfiles.id, id))
      .returning();

    // Jika nama juga diubah
    if (body.name && existing.userId) {
      await db
        .update(users)
        .set({ name: String(body.name).trim() })
        .where(eq(users.id, existing.userId));
    }

    return c.json({
      success: true,
      message: "Profil marketing berhasil diperbarui",
      data: updated,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 5. GET /api/marketing/commissions
 * Riwayat pencairan & komisi referral
 */
marketingRoutes.get("/commissions", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const status = c.req.query("status"); // 'pending' | 'approved' | 'paid' | 'rejected'

    let profileId: string | null = null;
    if (user.role === "marketing") {
      const profiles = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.userId, user.userId));
      if (profiles.length === 0) {
        return c.json({ success: true, data: [] });
      }
      profileId = profiles[0].id;
    }

    let query = db
      .select({
        id: marketingCommissions.id,
        marketingProfileId: marketingCommissions.marketingProfileId,
        referralCodeId: marketingCommissions.referralCodeId,
        subscriptionInvoiceId: marketingCommissions.subscriptionInvoiceId,
        tenantId: marketingCommissions.tenantId,
        baseAmount: marketingCommissions.baseAmount,
        commissionAmount: marketingCommissions.commissionAmount,
        status: marketingCommissions.status,
        paidAt: marketingCommissions.paidAt,
        notes: marketingCommissions.notes,
        createdAt: marketingCommissions.createdAt,
        codeName: referralCodes.code,
        marketingName: users.name,
      })
      .from(marketingCommissions)
      .leftJoin(referralCodes, eq(marketingCommissions.referralCodeId, referralCodes.id))
      .leftJoin(marketingProfiles, eq(marketingCommissions.marketingProfileId, marketingProfiles.id))
      .leftJoin(users, eq(marketingProfiles.userId, users.id))
      .orderBy(desc(marketingCommissions.createdAt));

    const records = await query;
    let filtered = records;

    if (profileId) {
      filtered = filtered.filter((r) => r.marketingProfileId === profileId);
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
 * 6. PUT /api/marketing/commissions/:id/status
 * Ubah status komisi (Superadmin: approved, paid, rejected)
 */
marketingRoutes.put(
  "/commissions/:id/status",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const id = c.req.param("id");
      if (!id) return c.json({ success: false, message: "ID komisi diperlukan" }, 400);
      const body = await c.req.json();
      const { status, notes } = body;

      if (!["pending", "approved", "paid", "rejected"].includes(status)) {
        return c.json({ success: false, message: "Status tidak valid" }, 400);
      }

      const [comm] = await db
        .select()
        .from(marketingCommissions)
        .where(eq(marketingCommissions.id, id));

      if (!comm) {
        return c.json({ success: false, message: "Data komisi tidak ditemukan" }, 404);
      }

      const updates: Partial<typeof marketingCommissions.$inferInsert> = {
        status,
        notes: notes !== undefined ? notes : comm.notes,
      };

      if (status === "paid" && comm.status !== "paid") {
        updates.paidAt = new Date().toISOString();
        // Update totalWithdrawn di marketing_profile
        await db
          .update(marketingProfiles)
          .set({
            totalWithdrawn: sql`${marketingProfiles.totalWithdrawn} + ${comm.commissionAmount}`,
          })
          .where(eq(marketingProfiles.id, comm.marketingProfileId));
      }

      const [updated] = await db
        .update(marketingCommissions)
        .set(updates)
        .where(eq(marketingCommissions.id, id))
        .returning();

      return c.json({
        success: true,
        message: `Status komisi berhasil diubah ke '${status}'`,
        data: updated,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

export default marketingRoutes;
