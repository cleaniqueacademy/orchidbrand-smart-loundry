import { db } from "./index";
import { users, marketingProfiles, referralCodes } from "./schema";
import { eq, or } from "drizzle-orm";

export const MARKETING_SEEDS = [
  {
    userId: "user-marketing-01",
    slug: "ubai",
    name: "Ubai (Marketing)",
    email: "ubai@cleaniquelaundry.com",
    phone: "081298765401",
    code: "UBAI",
    bankName: "BRI",
    bankAccount: "034101002345501",
  },
  {
    userId: "user-marketing-02",
    slug: "adit",
    name: "Adit (Marketing)",
    email: "adit@cleaniquelaundry.com",
    phone: "081298765402",
    code: "ADIT",
    bankName: "BCA",
    bankAccount: "8820456123",
  },
  {
    userId: "user-marketing-03",
    slug: "bhangkit",
    name: "Bhangkit (Marketing)",
    email: "bhangkit@cleaniquelaundry.com",
    phone: "081298765403",
    code: "BHANGKIT",
    bankName: "Mandiri",
    bankAccount: "1370019283741",
  },
  {
    userId: "user-marketing-04",
    slug: "ragil",
    name: "Ragil (Marketing)",
    email: "ragil@cleaniquelaundry.com",
    phone: "081298765404",
    code: "RAGIL",
    bankName: "BNI",
    bankAccount: "0219837465",
  },
  {
    userId: "user-marketing-05",
    slug: "arif",
    name: "Arif (Marketing)",
    email: "arif@cleaniquelaundry.com",
    phone: "081298765405",
    code: "ARIF",
    bankName: "BCA",
    bankAccount: "7140928341",
  },
  {
    userId: "user-marketing-06",
    slug: "syams",
    name: "Syams (Marketing)",
    email: "syams@cleaniquelaundry.com",
    phone: "081298765406",
    code: "SYAMS",
    bankName: "Mandiri",
    bankAccount: "1380029384752",
  },
  {
    userId: "user-marketing-07",
    slug: "salim",
    name: "Salim (Marketing)",
    email: "salim@cleaniquelaundry.com",
    phone: "081298765407",
    code: "SALIM",
    bankName: "BSI",
    bankAccount: "7182938475",
  },
  {
    userId: "user-marketing-08",
    slug: "doni",
    name: "Doni (Marketing)",
    email: "doni@cleaniquelaundry.com",
    phone: "081298765408",
    code: "DONI",
    bankName: "BCA",
    bankAccount: "6291039482",
  },
  {
    userId: "user-marketing-09",
    slug: "nova",
    name: "Nova (Marketing)",
    email: "nova@cleaniquelaundry.com",
    phone: "081298765409",
    code: "NOVA",
    bankName: "BRI",
    bankAccount: "034201004928502",
  },
  {
    userId: "user-marketing-10",
    slug: "naufal",
    name: "Naufal (Marketing)",
    email: "naufal@cleaniquelaundry.com",
    phone: "081298765410",
    code: "NAUFAL",
    bankName: "Mandiri",
    bankAccount: "1390038475629",
  },
];

export async function seedMarketingUsers() {
  console.log("Seeding 10 marketing users and referral codes...");
  const today = new Date().toISOString();
  const passwordHash = await Bun.password.hash("marketing123", { algorithm: "bcrypt", cost: 10 });

  for (const item of MARKETING_SEEDS) {
    const userId = item.userId;
    const profileId = `mkt-prof-${item.slug}`;
    const codeId = `ref-code-${item.slug}`;

    // 1. Check or insert user
    const existingUsers = await db
      .select()
      .from(users)
      .where(or(eq(users.id, userId), eq(users.email, item.email)));

    let actualUserId = userId;
    if (existingUsers.length === 0) {
      await db.insert(users).values({
        id: userId,
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
    }

    // 2. Check or insert marketing profile
    const existingProfiles = await db
      .select()
      .from(marketingProfiles)
      .where(eq(marketingProfiles.userId, actualUserId));

    let actualProfileId = profileId;
    if (existingProfiles.length === 0) {
      await db.insert(marketingProfiles).values({
        id: profileId,
        userId: actualUserId,
        phone: item.phone,
        bankName: item.bankName,
        bankAccountNumber: item.bankAccount,
        bankAccountName: item.name.replace(" (Marketing)", "").toUpperCase(),
        commissionRateDefault: 5000,
        totalEarned: 0,
        totalWithdrawn: 0,
        notes: `Mitra Marketing Cleanique - ${item.name}`,
        createdAt: today,
      });
      console.log(`Created marketing profile: ${item.name}`);
    } else {
      actualProfileId = existingProfiles[0].id;
    }

    // 3. Check or insert referral code
    const existingCodes = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, item.code));

    if (existingCodes.length === 0) {
      await db.insert(referralCodes).values({
        id: codeId,
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
      if (!existingCodes[0].marketingProfileId) {
        await db
          .update(referralCodes)
          .set({ marketingProfileId: actualProfileId })
          .where(eq(referralCodes.id, existingCodes[0].id));
      }
    }
  }

  console.log("✅ 10 Marketing users & referral codes seeding completed successfully!");
}

if (import.meta.main) {
  seedMarketingUsers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
