import { db } from "./index";
import {
  users,
  marketingProfiles,
  referralCodes,
  referralCodeTenants,
  referralEvents,
  marketingCommissions,
} from "./schema";
import { eq, ne } from "drizzle-orm";
import { generateRandomPassword } from "../utils/password";

export const MARKETING_SEEDS = [
  {
    userId: "user-marketing-01",
    slug: "ragil",
    name: "Ragil Slamet Riyadi",
    email: "ragil@cleaniquelaundry.com",
    phone: "081298765401",
    code: "4MBPQ2",
    bankName: "BNI",
    bankAccount: "0219837465",
  },
  {
    userId: "user-marketing-02",
    slug: "bhangkit",
    name: "Bhangkit Cahya Nugraha",
    email: "bhangkit@cleaniquelaundry.com",
    phone: "081298765402",
    code: "Q5R2VK",
    bankName: "Mandiri",
    bankAccount: "1370019283741",
  },
  {
    userId: "user-marketing-03",
    slug: "yusuf",
    name: "Muhammad Yusuf Setiawan",
    email: "yusuf@cleaniquelaundry.com",
    phone: "081298765403",
    code: "6LH39J",
    bankName: "BCA",
    bankAccount: "8820456123",
  },
  {
    userId: "user-marketing-04",
    slug: "subandi",
    name: "Muhammad Subandi",
    email: "subandi@cleaniquelaundry.com",
    phone: "081298765404",
    code: "PC9Q8A",
    bankName: "BRI",
    bankAccount: "034101002345501",
  },
  {
    userId: "user-marketing-05",
    slug: "nauffal",
    name: "Muhammad Nauffal Yushi",
    email: "nauffal@cleaniquelaundry.com",
    phone: "081298765405",
    code: "PYWD3R",
    bankName: "Mandiri",
    bankAccount: "1390038475629",
  },
  {
    userId: "user-marketing-06",
    slug: "haryanto",
    name: "Haryanto",
    email: "haryanto@cleaniquelaundry.com",
    phone: "081298765406",
    code: "QLDU42",
    bankName: "BCA",
    bankAccount: "7140928341",
  },
  {
    userId: "user-marketing-07",
    slug: "doni",
    name: "Doni Seirawan",
    email: "doni@cleaniquelaundry.com",
    phone: "081298765407",
    code: "F8FDXJ",
    bankName: "BCA",
    bankAccount: "6291039482",
  },
  {
    userId: "user-marketing-08",
    slug: "avianditya",
    name: "Avianditya DwiChandra Kusuma",
    email: "avianditya@cleaniquelaundry.com",
    phone: "081298765408",
    code: "Y2NY3B",
    bankName: "BCA",
    bankAccount: "8820456124",
  },
  {
    userId: "user-marketing-09",
    slug: "pradhita",
    name: "Pradhita Wahyu Setyawan",
    email: "pradhita@cleaniquelaundry.com",
    phone: "081298765409",
    code: "W2KU6Z",
    bankName: "BRI",
    bankAccount: "034201004928502",
  },
  {
    userId: "user-marketing-10",
    slug: "syamsuddin",
    name: "Lam Syamsuddin",
    email: "syamsuddin@cleaniquelaundry.com",
    phone: "081298765410",
    code: "46PXLK",
    bankName: "Mandiri",
    bankAccount: "1380029384752",
  },
  {
    userId: "user-marketing-11",
    slug: "khoirudin",
    name: "Muhammad Khoirudin Salim",
    email: "khoirudin@cleaniquelaundry.com",
    phone: "081298765411",
    code: "FJ4KFK",
    bankName: "BSI",
    bankAccount: "7182938475",
  },
  {
    userId: "user-marketing-12",
    slug: "arif",
    name: "Arif Rif'an",
    email: "arif@cleaniquelaundry.com",
    phone: "081298765412",
    code: "JY6DJW",
    bankName: "BCA",
    bankAccount: "7140928342",
  },
  {
    userId: "user-marketing-13",
    slug: "abdullah",
    name: "Abdullah Yahya",
    email: "abdullah@cleaniquelaundry.com",
    phone: "081298765413",
    code: "PR5LKN",
    bankName: "BNI",
    bankAccount: "0219837466",
  },
  {
    userId: "user-marketing-14",
    slug: "zidane",
    name: "Zidane Ibnu Maulana",
    email: "zidane@cleaniquelaundry.com",
    phone: "081298765414",
    code: "SD3EYP",
    bankName: "BSI",
    bankAccount: "7182938476",
  },
  {
    userId: "user-marketing-15",
    slug: "ilham",
    name: "Ilham Kurniawan",
    email: "ilham@cleaniquelaundry.com",
    phone: "081298765415",
    code: "S4V25Q",
    bankName: "BRI",
    bankAccount: "034101002345502",
  },
  {
    userId: "user-marketing-16",
    slug: "ubaidillah",
    name: "Ubaidillah Azhar Nur Royyan",
    email: "ubaidillah@cleaniquelaundry.com",
    phone: "081298765416",
    code: "QFGR9H",
    bankName: "BRI",
    bankAccount: "034101002345503",
  },
  {
    userId: "user-marketing-17",
    slug: "iqbal",
    name: "M. IQBAL AROFQI",
    email: "iqbal@cleaniquelaundry.com",
    phone: "081298765417",
    code: "DE8LHC",
    bankName: "Mandiri",
    bankAccount: "1370019283742",
  },
];

export interface SeededMarketingUser {
  userId: string;
  name: string;
  email: string;
  code: string;
  password: string;
}

export async function seedMarketingUsers(executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db): Promise<SeededMarketingUser[]> {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_RESET !== "yes-local-only") throw new Error("Seeder marketing hanya untuk database demo lokal kosong.");
  const today = new Date().toISOString();
  const seededResults: SeededMarketingUser[] = [];
  if ((await executor.select({ id: users.id }).from(users).where(eq(users.role, "marketing")).limit(1)).length) throw new Error("Akun marketing sudah ada; seeder tidak menghapus data lama.");
  for (const item of MARKETING_SEEDS) {
    const userId = item.userId;
    const profileId = `mkt-prof-${item.slug}`;
    const codeId = `ref-code-${item.slug}`;

    const rawPassword = process.env.SEED_DEFAULT_PASSWORD || generateRandomPassword(16);
    const passwordHash = await Bun.password.hash(rawPassword, { algorithm: "bcrypt", cost: 12 });

    // Insert User
    await executor.insert(users).values({
      id: userId,
      name: item.name,
      email: item.email,
      passwordHash,
      role: "marketing",
      status: "active",
      createdAt: today,
    });

    // Insert Marketing Profile
    await executor.insert(marketingProfiles).values({
      id: profileId,
      userId: userId,
      phone: item.phone,
      bankName: item.bankName,
      bankAccountNumber: item.bankAccount,
      bankAccountName: item.name.toUpperCase(),
      commissionRateDefault: 5000,
      totalEarned: 0,
      totalWithdrawn: 0,
      notes: `Mitra Marketing Cleanique - ${item.name}`,
      createdAt: today,
    });

    // Insert Referral Code (6 Karakter Random Huruf & Angka Kapital)
    await executor.insert(referralCodes).values({
      id: codeId,
      code: item.code,
      name: `Kode Referral ${item.name}`,
      description: `Diskon referral Rp5.000 per periode setelah promo; komisi Rp5.000 per periode.`,
      discountType: "fixed",
      discountValue: 5000,
      commissionType: "fixed",
      commissionValue: 5000,
      maxUsage: null,
      currentUsage: 0,
      isActive: "true",
      appliesToAllTenants: "true",
      marketingProfileId: profileId,
      createdByUserId: userId,
      createdAt: today,
    });

    seededResults.push({
      userId,
      name: item.name,
      email: item.email,
      code: item.code,
      password: rawPassword,
    });


  }

  console.log("✅ Berhasil men-generate 17 akun mitra marketing dengan random password & kode referral 6 karakter.");
  return seededResults;
}

if (import.meta.main) {
  seedMarketingUsers()
    .then(() => {
      console.log("Selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("[seed-marketing] gagal; tidak ada kredensial dicetak");
      process.exit(1);
    });
}
