import { db, initPostgresTables } from "./index";
import { seedMarketingUsers, MARKETING_SEEDS } from "./seedMarketingUsers";
import {
  users,
  tenants,
  customers,
  orders,
  expenses,
  services,
  shifts,
  waLogs,
  marketingProfiles,
  referralCodes,
  referralCodeTenants,
  referralEvents,
  plans,
  platformSettings,
  signupRequests,
  subscriptionInvoices,
  marketingCommissions,
  subscriptionEvents,
  waNumbers,
  waMessages,
  aiConversations,
  aiMessages,
  aiUsageDaily,
} from "./schema";

export async function seedInitialData(force = true) {
  try {
    await initPostgresTables();

    if (!force) {
      const existingUsers = await db.select().from(users);
      if (existingUsers.length > 0) {
        console.log("ℹ️ Basis data sudah memiliki data (Users count: " + existingUsers.length + "). Seeding dilewati.");
        return;
      }
    }

    console.log("🌱 Menyiapkan Seeding Produksi Laundry Cleanique (Clean State)...");

    // Bersihkan data lama dengan urutan foreign key yang aman
    try {
      await db.delete(waMessages);
      await db.delete(waNumbers);
      await db.delete(aiMessages);
      await db.delete(aiConversations);
      await db.delete(aiUsageDaily);
      await db.delete(subscriptionEvents);
      await db.delete(marketingCommissions);
      await db.delete(subscriptionInvoices);
      await db.delete(signupRequests);
      await db.delete(referralEvents);
      await db.delete(referralCodeTenants);
      await db.delete(referralCodes);
      await db.delete(marketingProfiles);
      await db.delete(plans);
      await db.delete(platformSettings);
      await db.delete(waLogs);
      await db.delete(shifts);
      await db.delete(expenses);
      await db.delete(orders);
      await db.delete(services);
      await db.delete(customers);
      await db.delete(tenants);
      await db.delete(users);
      console.log("🧹 Pembersihan tabel PostgreSQL selesai (Database Bersih).");
    } catch (cleanErr: any) {
      console.warn("Notice saat pembersihan tabel:", cleanErr.message);
    }

    const now = new Date();
    const today = now.toISOString();

    // ----------------------------------------------------
    // 1. Platform Settings
    // ----------------------------------------------------
    await db.insert(platformSettings).values({
      id: "default",
      platformName: "Laundry Cleanique",
      bankName: "BCA (Bank Central Asia)",
      bankAccountNumber: "8830-1928-3341",
      bankAccountName: "PT CLEANIQUE SISTEM DIGITAL",
      qrisInfo: "https://cleaniquelaundry.com/qris-official.png",
      defaultTrialDays: 7,
      defaultAiDailyQuota: 50,
      supportPhone: "081299881122",
      supportEmail: "support@cleaniquelaundry.com",
      termsUrl: "https://cleaniquelaundry.com/terms",
      privacyUrl: "https://cleaniquelaundry.com/privacy",
      updatedAt: today,
    });

    // ----------------------------------------------------
    // 2. Subscription Plans (1 Paket Flat)
    // ----------------------------------------------------
    // Harga: Rp 60.000/bulan (normal) | Rp 55.000/bulan (dengan referral)
    // Komisi mitra marketing: Rp 5.000/bulan dari pembayaran referral
    await db.insert(plans).values([
      {
        id: "plan-standard",
        code: "standard",
        name: "Paket Bulanan",
        description: "Akses penuh semua fitur Laundry Cleanique. Trial 7 hari gratis untuk pendaftar baru.",
        durationMonths: 1,
        pricePerMonth: 60000,
        features: JSON.stringify([
          "Kasir POS Lengkap & Cetak Struk Thermal",
          "Notifikasi WhatsApp Otomatis ke Pelanggan",
          "Laporan Keuangan & Pengeluaran",
          "Manajemen Staf & Shift Kasir",
          "50 Kuota Asisten AI / Hari",
          "Trial 7 Hari Gratis",
        ]),
        maxWaNumbers: 1,
        maxStaff: 5,
        aiTokenQuotaDaily: 50,
        isTrialAllowed: "true",
        isActive: "true",
        sortOrder: 1,
        createdAt: today,
      },
    ]);

    // ----------------------------------------------------
    // 3. User Hashes
    // ----------------------------------------------------
    const adminPasswordHash = await Bun.password.hash("admin123", { algorithm: "bcrypt", cost: 10 });
    const ownerPasswordHash = await Bun.password.hash("owner123", { algorithm: "bcrypt", cost: 10 });

    const admin1Id = "user-admin-01";
    const admin2Id = "user-admin-02";
    const ownerJongkeId = "user-owner-01";
    const tenantJongkeId = "tenant-01";

    // ----------------------------------------------------
    // 4. Users: 2 Superadmins & 1 Owner
    // ----------------------------------------------------
    await db.insert(users).values([
      {
        id: admin1Id,
        name: "Super Admin Cleanique 1",
        email: "admin@cleaniquelaundry.com",
        passwordHash: adminPasswordHash,
        role: "superadmin",
        status: "active",
        subscriptionUntil: "2027-12-31",
        createdAt: today,
      },
      {
        id: admin2Id,
        name: "Super Admin Cleanique 2",
        email: "admin2@cleaniquelaundry.com",
        passwordHash: adminPasswordHash,
        role: "superadmin",
        status: "active",
        subscriptionUntil: "2027-12-31",
        createdAt: today,
      },
      {
        id: ownerJongkeId,
        name: "Owner Cleanique Jongke Tengah",
        email: "owner.jongke@cleaniquelaundry.com",
        passwordHash: ownerPasswordHash,
        role: "tenant_owner",
        status: "active",
        subscriptionUntil: "2027-12-31",
        createdAt: today,
      },
    ]);

    // ----------------------------------------------------
    // 5. Tenant: Cleanique Jongke Tengah
    // ----------------------------------------------------
    await db.insert(tenants).values([
      {
        id: tenantJongkeId,
        userId: ownerJongkeId,
        outletName: "Cleanique Jongke Tengah",
        phone: "081234567890",
        address: "Jl. Jongke Tengah, Sendangadi, Mlati, Sleman",
        city: "Sleman",
        status: "active",
        subscriptionUntil: "2027-12-31",
        waMode: "baileys",
        createdAt: today,
      },
    ]);

    // ----------------------------------------------------
    // 6. WhatsApp Primary Number untuk Cleanique Jongke Tengah
    // ----------------------------------------------------
    await db.insert(waNumbers).values([
      {
        id: "wanum-jongke-01",
        tenantId: tenantJongkeId,
        sessionKey: tenantJongkeId,
        label: "WhatsApp Kasir Jongke Tengah (Utama)",
        phoneNumber: "081234567890",
        isPrimary: "true",
        botEnabled: "false",
        aiEnabled: "false",
        status: "disconnected",
        createdAt: today,
      },
    ]);

    // ----------------------------------------------------
    // 7. Master Layanan Default untuk Cleanique Jongke Tengah
    // ----------------------------------------------------
    await db.insert(services).values([
      {
        id: "srv-jongke-01",
        tenantId: tenantJongkeId,
        name: "Cuci Komplit (Kg)",
        unit: "kg",
        pricePerUnit: 8000,
        minOrder: 1,
        durationHours: 48,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-jongke-02",
        tenantId: tenantJongkeId,
        name: "Cuci Kering + Setrika Express",
        unit: "kg",
        pricePerUnit: 14000,
        minOrder: 1,
        durationHours: 24,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-jongke-03",
        tenantId: tenantJongkeId,
        name: "Bedcover King (Pcs)",
        unit: "pcs",
        pricePerUnit: 35000,
        minOrder: 1,
        durationHours: 72,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-jongke-04",
        tenantId: tenantJongkeId,
        name: "Cuci Sepatu Sneakers",
        unit: "pasang",
        pricePerUnit: 25000,
        minOrder: 1,
        durationHours: 48,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-jongke-05",
        tenantId: tenantJongkeId,
        name: "Setrika Saja (Kg)",
        unit: "kg",
        pricePerUnit: 5000,
        minOrder: 1,
        durationHours: 24,
        status: "active",
        createdAt: today,
      },
    ]);

    // ----------------------------------------------------
    // 8. 10 Marketing Users, Profiles, & Referral Codes
    // ----------------------------------------------------
    await seedMarketingUsers();

    // ----------------------------------------------------
    // 9. Kode Referral Platform Resmi: CLEANHEMAT
    // (Menjamin kompatibilitas promo umum & test suite)
    // ----------------------------------------------------
    const platformMktProfileId = "mkt-prof-platform";
    await db.insert(marketingProfiles).values({
      id: platformMktProfileId,
      userId: admin1Id,
      phone: "081299881122",
      bankName: "BCA",
      bankAccountNumber: "8830-1928-3341",
      bankAccountName: "PT CLEANIQUE SISTEM DIGITAL",
      commissionRateDefault: 0,
      totalEarned: 0,
      totalWithdrawn: 0,
      notes: "Profil Akun Platform untuk Kode Resmi CLEANHEMAT",
      createdAt: today,
    });

    await db.insert(referralCodes).values([
      {
        id: "ref-code-cleanhemat",
        code: "CLEANHEMAT",
        name: "Promo Resmi Cleanique Hemat",
        description: "Diskon Rp 5.000 per bulan dari harga normal Rp 60.000. Komisi Rp 5.000/bulan.",
        discountType: "fixed",
        discountValue: 5000,
        commissionType: "fixed",
        commissionValue: 5000,
        maxUsage: null,
        currentUsage: 0,
        validFrom: "2026-01-01",
        validUntil: "2028-12-31",
        isActive: "true",
        appliesToAllTenants: "true",
        marketingProfileId: platformMktProfileId,
        createdByUserId: admin1Id,
        createdAt: today,
      },
    ]);

    // CATATAN PRODUKSI:
    // Tabel orders, customers, expenses, shifts, waLogs TIDAK di-seed dummy.
    // Database bersih dan siap dipakai secara nyata untuk operasional outlet.

    console.log("=================================================");
    console.log("✅ SEEDING PRODUKSI BERHASIL 100% (CLEAN STATE)!");
    console.log("=================================================");
    console.log("👑 SUPER ADMIN (2 Akun):");
    console.log("  1. admin@cleaniquelaundry.com  / admin123");
    console.log("  2. admin2@cleaniquelaundry.com / admin123");
    console.log("-------------------------------------------------");
    console.log("🏪 TENANT OWNER (1 Outlet):");
    console.log("  - Outlet : Cleanique Jongke Tengah");
    console.log("  - Email  : owner.jongke@cleaniquelaundry.com");
    console.log("  - Pass   : owner123");
    console.log("-------------------------------------------------");
    console.log("📢 10 MITRA MARKETING & KODE REFERRAL:");
    MARKETING_SEEDS.forEach((mkt, idx) => {
      console.log(`  ${idx + 1}. [Kode: ${mkt.code.padEnd(8)}] ${mkt.name} (${mkt.email} / marketing123)`);
    });
    console.log("  + [Kode: CLEANHEMAT] Kode Promo Platform");
    console.log("-------------------------------------------------");
    console.log("📦 DATA OPERASIONAL: BERSIH (0 Orders, 0 Customers, 0 Expenses)");
    console.log("=================================================");
  } catch (err: any) {
    console.error("❌ Seed error:", err);
    throw err;
  }
}

if (import.meta.main) {
  seedInitialData(true)
    .then(() => {
      console.log("🎉 Seeding selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding gagal:", err);
      process.exit(1);
    });
}
