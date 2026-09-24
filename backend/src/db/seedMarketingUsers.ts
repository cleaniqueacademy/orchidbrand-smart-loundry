import { db } from "./index";
import { users, marketingProfiles, referralCodes } from "./schema";
import { eq, or } from "drizzle-orm";

export async function seedMarketingUsers() {
  console.log("Seeding marketing users and referral codes...");
  const today = new Date().toISOString();
  const passwordHash = await Bun.password.hash("marketing123", { algorithm: "bcrypt", cost: 10 });

  const marketingUsersData = [
    {
      userId: "user-marketing-adit",
      name: "Adit (Marketing)",
      email: "adit@cleaniquelaundry.com",
      phone: "0812" + Math.floor(10000000 + Math.random() * 90000000),
      profileId: "mkt-prof-adit",
      codeId: "ref-code-adit",
      code: "ADIT12345",
      bankName: "BCA",
      bankAccount: "8820" + Math.floor(100000 + Math.random() * 900000),
    },
    {
      userId: "user-marketing-bangkhit",
      name: "Bangkhit (Marketing)",
      email: "bangkhit@cleaniquelaundry.com",
      phone: "0813" + Math.floor(10000000 + Math.random() * 90000000),
      profileId: "mkt-prof-bangkhit",
      codeId: "ref-code-bangkhit",
      code: "BANGKHIT12345",
      bankName: "Mandiri",
      bankAccount: "13700" + Math.floor(100000 + Math.random() * 900000),
    },
    {
      userId: "user-marketing-ubai",
      name: "Ubai (Marketing)",
      email: "ubai@cleaniquelaundry.com",
      phone: "0852" + Math.floor(10000000 + Math.random() * 90000000),
      profileId: "mkt-prof-ubai",
      codeId: "ref-code-ubai",
      code: "UBAI12345",
      bankName: "BRI",
      bankAccount: "03410" + Math.floor(100000 + Math.random() * 900000),
    },
    {
      userId: "user-marketing-arip",
      name: "Arip (Marketing)",
      email: "arip@cleaniquelaundry.com",
      phone: "0878" + Math.floor(10000000 + Math.random() * 90000000),
      profileId: "mkt-prof-arip",
      codeId: "ref-code-arip",
      code: "ARIP12354", // Note: exact requested code 'arip12354'
      bankName: "BNI",
      bankAccount: "02190" + Math.floor(100000 + Math.random() * 900000),
    },
  ];

  for (const item of marketingUsersData) {
    // 1. Check or insert user
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.id, item.userId), eq(users.email, item.email)));

    let actualUserId = item.userId;
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        id: item.userId,
        name: item.name,
        email: item.email,
        passwordHash,
        role: "marketing",
        status: "active",
        createdAt: today,
      });
      console.log(`Created user: ${item.name} (${item.email})`);
    } else {
      actualUserId = existingUsers[0].id;
      console.log(`User already exists: ${item.email}`);
    }

    // 2. Check or insert marketing profile
    const existingProfiles = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.userId, actualUserId));

    let actualProfileId = item.profileId;
    if (existingProfiles.length === 0) {
      await db.insert(marketingProfiles).values({
        id: item.profileId,
        userId: actualUserId,
        phone: item.phone,
        bankName: item.bankName,
        bankAccountNumber: item.bankAccount,
        bankAccountName: item.name.toUpperCase(),
        commissionRateDefault: 5000,
        totalEarned: 0,
        totalWithdrawn: 0,
        notes: `Mitra Marketing ${item.name}`,
        createdAt: today,
      });
      console.log(`Created marketing profile for: ${item.name} (Phone: ${item.phone})`);
    } else {
      actualProfileId = existingProfiles[0].id;
      console.log(`Marketing profile already exists for: ${item.name}`);
    }

    // 3. Check or insert referral code
    const existingCodes = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, item.code));

    if (existingCodes.length === 0) {
      await db.insert(referralCodes).values({
        id: item.codeId,
        code: item.code,
        name: `Kode Referral ${item.name.replace(" (Marketing)", "")}`,
        description: `Diskon Rp 5.000 per bulan dari harga normal Rp 60.000. Komisi Rp 5.000/bulan untuk ${item.name}.`,
        discountType: "fixed",
        discountValue: 5000,
        commissionType: "fixed",
        commissionValue: 5000,
        maxUsage: null,
        currentUsage: 0,
        isActive: "true",
        appliesToAllTenants: "true",
        marketingProfileId: actualProfileId,
        createdByUserId: actualUserId,
        createdAt: today,
      });
      console.log(`Created referral code: ${item.code} for profile ${actualProfileId}`);
    } else {
      // Ensure marketingProfileId is attached
      if (!existingCodes[0].marketingProfileId) {
        await db
          .update(referralCodes)
          .set({ marketingProfileId: actualProfileId })
          .where(eq(referralCodes.id, existingCodes[0].id));
        console.log(`Updated marketingProfileId for code ${item.code}`);
      }
      console.log(`Referral code already exists: ${item.code}`);
    }
  }

  console.log("Marketing users seeding completed successfully!");
}

if (import.meta.main) {
  seedMarketingUsers()
    .then(() => {
      console.log("Done.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Seeding error:", err);
      process.exit(1);
    });
}
