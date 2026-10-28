import { Hono } from "hono";
import { db } from "../db/index";
import {
  users,
  marketingProfiles,
  referralCodes,
  marketingCommissions,
  marketingWithdrawals,
  tenants,
  subscriptionInvoices,
  platformCashflow,
} from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { newId } from "../utils/id";
import { today } from "../utils/date";

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

    // Ambil daftar tenant yang menggunakan kode referral milik marketing ini
    const allTenants = await db.select().from(tenants).orderBy(desc(tenants.createdAt));
    const codeIdSet = new Set(codes.map((c) => c.id));
    const codeMap = new Map(codes.map((c) => [c.id, c.code]));

    const associatedTenants = allTenants.filter(
      (t) => t.referralCodeId && codeIdSet.has(t.referralCodeId)
    );

    const codesWithTenants = codes.map((rc) => {
      const tenantList = allTenants.filter((t) => t.referralCodeId === rc.id);
      return {
        ...rc,
        tenantCount: tenantList.length,
        tenants: tenantList.map((t) => ({
          id: t.id,
          outletName: t.outletName,
          phone: t.phone,
          city: t.city,
          status: t.status,
          isTrial: t.isTrial === "true",
          subscriptionUntil: t.subscriptionUntil,
          referralCode: rc.code,
          createdAt: t.createdAt,
        })),
      };
    });

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

    // Ambil rekap penarikan saldo
    const withdrawals = await db
      .select()
      .from(marketingWithdrawals)
      .where(eq(marketingWithdrawals.marketingProfileId, profile.id))
      .orderBy(desc(marketingWithdrawals.createdAt));

    let pendingWithdrawals = 0;
    let paidWithdrawals = 0;
    for (const w of withdrawals) {
      if (w.status === "pending") pendingWithdrawals += w.amount;
      if (w.status === "paid") paidWithdrawals += w.amount;
    }

    const effectiveTotalEarned = Math.max(profile.totalEarned, approvedCommission + paidCommission);
    const effectiveTotalWithdrawn = Math.max(profile.totalWithdrawn, paidWithdrawals);
    const availableBalance = Math.max(0, effectiveTotalEarned - effectiveTotalWithdrawn - pendingWithdrawals);

    return c.json({
      success: true,
      data: {
        profile: {
          ...profile,
          totalEarned: effectiveTotalEarned,
          totalWithdrawn: effectiveTotalWithdrawn,
        },
        codes: codesWithTenants,
        totalTenantsCount: associatedTenants.length,
        tenants: associatedTenants.map((t) => ({
          id: t.id,
          outletName: t.outletName,
          phone: t.phone,
          city: t.city,
          status: t.status,
          isTrial: t.isTrial === "true",
          subscriptionUntil: t.subscriptionUntil,
          referralCode: t.referralCodeId ? codeMap.get(t.referralCodeId) || null : null,
          createdAt: t.createdAt,
        })),
        commissionsSummary: {
          totalEarned: effectiveTotalEarned,
          totalWithdrawn: effectiveTotalWithdrawn,
          pendingWithdrawals,
          availableBalance,
          pendingCommission,
          approvedCommission,
          paidCommission,
          totalCommissionsCount: commissions.length,
        },
        recentCommissions: commissions.slice(0, 10),
        withdrawals,
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

    // Dapatkan data penarikan pending untuk menghitung saldo tersedia
    const pendingWithdrawalsList = await db
      .select({
        marketingProfileId: marketingWithdrawals.marketingProfileId,
        amount: marketingWithdrawals.amount,
      })
      .from(marketingWithdrawals)
      .where(eq(marketingWithdrawals.status, "pending"));

    const pendingMap = new Map<string, number>();
    for (const pw of pendingWithdrawalsList) {
      pendingMap.set(pw.marketingProfileId, (pendingMap.get(pw.marketingProfileId) || 0) + pw.amount);
    }

    const profilesWithBalance = allProfiles.map((p) => {
      const pendingWithdrawn = pendingMap.get(p.id) || 0;
      const availableBalance = Math.max(0, (p.totalEarned || 0) - (p.totalWithdrawn || 0) - pendingWithdrawn);
      return {
        ...p,
        pendingWithdrawals: pendingWithdrawn,
        availableBalance,
      };
    });

    return c.json({ success: true, data: profilesWithBalance });
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
      commissionRateDefault = 5000,
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
        commissionRateDefault: Number(commissionRateDefault) || 5000,
        totalEarned: 0,
        totalWithdrawn: 0,
        notes: notes ? String(notes).trim() : null,
        createdAt: today,
        updatedAt: today,
      })
      .returning();

    // Generate 6-karakter kode referral unik (huruf & angka kapital acak)
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let generatedCode = "";
    let isUnique = false;
    while (!isUnique) {
      let candidate = "";
      for (let i = 0; i < 6; i++) {
        candidate += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const existing = await db
        .select()
        .from(referralCodes)
        .where(eq(sql`UPPER(${referralCodes.code})`, candidate));
      if (existing.length === 0) {
        generatedCode = candidate;
        isUnique = true;
      }
    }

    const codeId = newId("ref-code");
    await db.insert(referralCodes).values({
      id: codeId,
      code: generatedCode,
      name: `Kode Referral ${String(name).trim()}`,
      description: `Diskon Rp 5.000 per bulan dari harga normal Rp 60.000. Insentif Rp 5.000/bulan untuk ${String(name).trim()}.`,
      discountType: "fixed",
      discountValue: 5000,
      commissionType: "fixed",
      commissionValue: 5000,
      maxUsage: null,
      currentUsage: 0,
      isActive: "true",
      appliesToAllTenants: "true",
      marketingProfileId: profile.id,
      createdByUserId: userId,
      createdAt: today,
    });

    return c.json({
      success: true,
      message: "Anggota tim marketing berhasil didaftarkan dan kode referral resmi otomatis dibuat",
      data: {
        userId,
        profileId: profile.id,
        name,
        email: cleanEmail,
        referralCode: generatedCode,
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

/**
 * 7. PATCH /api/marketing/profiles/:id/status
 * Toggle aktif / nonaktif akun marketing (Superadmin only)
 */
marketingRoutes.patch("/profiles/:id/status", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID profil diperlukan" }, 400);

    const [profile] = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.id, id));

    if (!profile) {
      return c.json({ success: false, message: "Profil marketing tidak ditemukan" }, 404);
    }

    const [currentUser] = await db
      .select({ status: users.status })
      .from(users)
      .where(eq(users.id, profile.userId));

    const newStatus: "active" | "inactive" =
      currentUser?.status === "active" ? "inactive" : "active";

    await db.update(users).set({ status: newStatus }).where(eq(users.id, profile.userId));

    return c.json({
      success: true,
      message: `Akun marketing berhasil ${newStatus === "active" ? "diaktifkan" : "dinonaktifkan"}`,
      data: { userId: profile.userId, status: newStatus },
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 8. DELETE /api/marketing/profiles/:id
 * Hapus permanen akun marketing (Superadmin only)
 * Kode referral yang sudah dipakai tenant tetap disimpan (marketingProfileId di-null)
 */
marketingRoutes.delete("/profiles/:id", requireRole(["superadmin"]), async (c) => {
  try {
    const id = c.req.param("id");
    if (!id) return c.json({ success: false, message: "ID profil diperlukan" }, 400);

    const [profile] = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.id, id));

    if (!profile) {
      return c.json({ success: false, message: "Profil marketing tidak ditemukan" }, 404);
    }

    // Lepas relasi referral codes → profil (agar tenant yang pakai tidak rusak)
    await db
      .update(referralCodes)
      .set({ marketingProfileId: null as unknown as string })
      .where(eq(referralCodes.marketingProfileId, id));

    // Bersihkan histori komisi terkait profil ini agar tidak kena foreign key constraint
    await db.delete(marketingCommissions).where(eq(marketingCommissions.marketingProfileId, id));

    await db.delete(marketingProfiles).where(eq(marketingProfiles.id, id));
    await db.delete(users).where(eq(users.id, profile.userId));

    return c.json({ success: true, message: "Akun marketing berhasil dihapus dari sistem" });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 9. GET /api/marketing/withdrawals
 * Daftar permohonan penarikan saldo (Superadmin melihat semua, Marketing hanya miliknya)
 */
marketingRoutes.get("/withdrawals", requireRole(["superadmin", "marketing"]), async (c) => {
  try {
    const user = getUser(c);
    let profileId: string | null = null;
    if (user.role === "marketing") {
      const [profile] = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.userId, user.userId));
      if (!profile) return c.json({ success: true, data: [] });
      profileId = profile.id;
    }

    const records = await db
      .select({
        id: marketingWithdrawals.id,
        marketingProfileId: marketingWithdrawals.marketingProfileId,
        amount: marketingWithdrawals.amount,
        bankName: marketingWithdrawals.bankName,
        bankAccountNumber: marketingWithdrawals.bankAccountNumber,
        bankAccountName: marketingWithdrawals.bankAccountName,
        status: marketingWithdrawals.status,
        proofUrl: marketingWithdrawals.proofUrl,
        notes: marketingWithdrawals.notes,
        processedByUserId: marketingWithdrawals.processedByUserId,
        processedAt: marketingWithdrawals.processedAt,
        createdAt: marketingWithdrawals.createdAt,
        marketingName: users.name,
        marketingEmail: users.email,
        marketingPhone: marketingProfiles.phone,
      })
      .from(marketingWithdrawals)
      .leftJoin(marketingProfiles, eq(marketingWithdrawals.marketingProfileId, marketingProfiles.id))
      .leftJoin(users, eq(marketingProfiles.userId, users.id))
      .orderBy(desc(marketingWithdrawals.createdAt));

    const filtered = profileId ? records.filter((r) => r.marketingProfileId === profileId) : records;

    return c.json({ success: true, data: filtered });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 10. POST /api/marketing/withdrawals
 * Ajukan penarikan saldo oleh tim marketing
 */
marketingRoutes.post("/withdrawals", requireRole(["marketing"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json();
    const { amount, bankName, bankAccountNumber, bankAccountName, notes } = body;

    const withdrawAmount = Number(amount);
    if (!withdrawAmount || withdrawAmount <= 0) {
      return c.json({ success: false, message: "Nominal penarikan harus lebih dari 0" }, 400);
    }

    const [profile] = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.userId, user.userId));

    if (!profile) {
      return c.json({ success: false, message: "Profil marketing tidak ditemukan" }, 404);
    }

    // Ambil semua komisi approved/paid
    const comms = await db
      .select()
      .from(marketingCommissions)
      .where(eq(marketingCommissions.marketingProfileId, profile.id));

    let sumEarned = 0;
    for (const cm of comms) {
      if (cm.status === "approved" || cm.status === "paid") {
        sumEarned += cm.commissionAmount;
      }
    }
    const realTotalEarned = Math.max(profile.totalEarned, sumEarned);

    // Ambil penarikan pending & paid
    const withdrawals = await db
      .select()
      .from(marketingWithdrawals)
      .where(eq(marketingWithdrawals.marketingProfileId, profile.id));

    let pendingAmount = 0;
    let paidAmount = 0;
    for (const w of withdrawals) {
      if (w.status === "pending") pendingAmount += w.amount;
      if (w.status === "paid") paidAmount += w.amount;
    }
    const realTotalWithdrawn = Math.max(profile.totalWithdrawn, paidAmount);
    const availableBalance = Math.max(0, realTotalEarned - realTotalWithdrawn - pendingAmount);

    if (withdrawAmount > availableBalance) {
      return c.json({
        success: false,
        message: `Saldo tidak mencukupi. Saldo tersedia saat ini: Rp ${availableBalance.toLocaleString("id-ID")}`,
      }, 400);
    }

    const withdrawalId = newId("wth");
    const newRecord = {
      id: withdrawalId,
      marketingProfileId: profile.id,
      amount: withdrawAmount,
      bankName: bankName ? String(bankName).trim() : profile.bankName,
      bankAccountNumber: bankAccountNumber ? String(bankAccountNumber).trim() : profile.bankAccountNumber,
      bankAccountName: bankAccountName ? String(bankAccountName).trim() : profile.bankAccountName,
      status: "pending" as const,
      proofUrl: null,
      notes: notes ? String(notes).trim() : null,
      processedByUserId: null,
      processedAt: null,
      createdAt: new Date().toISOString(),
    };

    await db.insert(marketingWithdrawals).values(newRecord);

    return c.json({
      success: true,
      message: "Permohonan penarikan saldo berhasil diajukan dan sedang menunggu proses transfer admin",
      data: newRecord,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 11. PUT /api/marketing/withdrawals/:id/status
 * Superadmin memproses penarikan saldo ('paid' atau 'rejected')
 */
marketingRoutes.put(
  "/withdrawals/:id/status",
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const user = getUser(c);
      const id = c.req.param("id");
      if (!id) return c.json({ success: false, message: "ID penarikan diperlukan" }, 400);

      const body = await c.req.json();
      const { status, notes, proofUrl } = body;

      if (!["paid", "rejected"].includes(status)) {
        return c.json({ success: false, message: "Status tidak valid. Pilih 'paid' atau 'rejected'" }, 400);
      }

      const [withdrawal] = await db
        .select()
        .from(marketingWithdrawals)
        .where(eq(marketingWithdrawals.id, id));

      if (!withdrawal) {
        return c.json({ success: false, message: "Data penarikan tidak ditemukan" }, 404);
      }

      if (withdrawal.status !== "pending") {
        return c.json({ success: false, message: `Penarikan ini sudah diproses dengan status '${withdrawal.status}'` }, 400);
      }

      const nowIso = new Date().toISOString();

      if (status === "paid") {
        // Ambil info marketing user untuk deskripsi kas
        const [profile] = await db
          .select()
          .from(marketingProfiles)
          .where(eq(marketingProfiles.id, withdrawal.marketingProfileId));

        let marketingName = "Tim Marketing";
        if (profile) {
          const [u] = await db.select().from(users).where(eq(users.id, profile.userId));
          if (u) marketingName = u.name;

          // Tambah totalWithdrawn di marketingProfiles
          await db
            .update(marketingProfiles)
            .set({
              totalWithdrawn: sql`${marketingProfiles.totalWithdrawn} + ${withdrawal.amount}`,
              updatedAt: nowIso,
            })
            .where(eq(marketingProfiles.id, profile.id));
        }

        // Catat pengeluaran kas di platformCashflow
        await db.insert(platformCashflow).values({
          id: newId("pcf"),
          type: "expense",
          category: "marketing_commission",
          amount: withdrawal.amount,
          date: today(),
          tenantId: null,
          referralCode: null,
          durationMonths: null,
          description: `Pencairan insentif komisi marketing - ${marketingName} (ID: ${withdrawal.id})`,
          proofUrl: proofUrl ? String(proofUrl).trim() : null,
          notes: notes ? String(notes).trim() : null,
          createdByUserId: user.userId,
          createdAt: nowIso,
        });
      }

      const [updated] = await db
        .update(marketingWithdrawals)
        .set({
          status,
          notes: notes !== undefined ? notes : withdrawal.notes,
          proofUrl: proofUrl !== undefined ? proofUrl : withdrawal.proofUrl,
          processedByUserId: user.userId,
          processedAt: nowIso,
        })
        .where(eq(marketingWithdrawals.id, id))
        .returning();

      return c.json({
        success: true,
        message: status === "paid"
          ? "Penarikan berhasil dikonfirmasi telah ditransfer dan tercatat di kas platform"
          : "Permohonan penarikan ditolak dan saldo telah dikembalikan",
        data: updated,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

/**
 * 12. POST /api/marketing/sync-balances
 * Sinkronisasi data lama: ubah komisi pending -> approved dan sinkronkan totalEarned & totalWithdrawn (Superadmin)
 */
marketingRoutes.post("/sync-balances", requireRole(["superadmin"]), async (c) => {
  try {
    // 1. Ubah seluruh komisi yang statusnya 'pending' menjadi 'approved'
    await db
      .update(marketingCommissions)
      .set({ status: "approved" })
      .where(eq(marketingCommissions.status, "pending"));

    // 2. Ambil seluruh profil marketing
    const profiles = await db.select().from(marketingProfiles);

    for (const prof of profiles) {
      // Hitung komisi yang didapat
      const comms = await db
        .select()
        .from(marketingCommissions)
        .where(eq(marketingCommissions.marketingProfileId, prof.id));

      let totalEarned = 0;
      for (const cm of comms) {
        if (cm.status === "approved" || cm.status === "paid") {
          totalEarned += cm.commissionAmount;
        }
      }

      // Hitung total ditarik dari withdrawals
      const withdrawals = await db
        .select()
        .from(marketingWithdrawals)
        .where(eq(marketingWithdrawals.marketingProfileId, prof.id));

      let totalWithdrawn = 0;
      for (const w of withdrawals) {
        if (w.status === "paid") {
          totalWithdrawn += w.amount;
        }
      }

      const finalWithdrawn = Math.max(prof.totalWithdrawn || 0, totalWithdrawn);

      await db
        .update(marketingProfiles)
        .set({
          totalEarned,
          totalWithdrawn: finalWithdrawn,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(marketingProfiles.id, prof.id));
    }

    return c.json({
      success: true,
      message: "Data komisi dan saldo seluruh tim marketing berhasil disinkronkan",
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default marketingRoutes;
