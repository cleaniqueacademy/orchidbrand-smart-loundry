import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { sql } from "drizzle-orm";
import { db, initPostgresTables } from "./index";
import { users, tenants, plans, platformSettings, services } from "./schema";
import { seedMarketingUsers } from "./seedMarketingUsers";
import { generateRandomPassword } from "../utils/password";

/** Local demo bootstrap only. Reset is a separate, backup-gated operation. */
export async function seedInitialData(force = false) {
  if (process.env.NODE_ENV === "production" || process.env.ALLOW_DEMO_RESET !== "yes-local-only") throw new Error("Seeder demo dinonaktifkan. Reset lokal memerlukan ALLOW_DEMO_RESET=yes-local-only.");
  if (force) throw new Error("Reset melalui seeder dilarang; gunakan database lokal kosong.");
  await initPostgresTables();
  const result = await db.transaction(async tx => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext('cleanique-demo-seed'))`);
    if ((await tx.select({ id: users.id }).from(users).limit(1)).length) return null;
    const now = new Date(), createdAt = now.toISOString();
    const until = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
    const promoEnds = new Date(now.getTime() + 90 * 86400000).toISOString();
    await tx.insert(platformSettings).values({ id: "default", platformName: "Laundry Cleanique", qrisInfo: "/qris.png", defaultTrialDays: 7, defaultAiDailyQuota: 50, updatedAt: createdAt });
    const seedPlans = [
      { id: "plan-pro", code: "pro", name: "Paket Pro", description: "Operasional satu cabang", pricePerMonth: 60000, maxBranches: 1, maxStaff: 0, maxWaNumbers: 1, aiTokenQuotaDaily: 50, features: JSON.stringify(["Kasir POS", "Arus kas", "Nota browser"]), isTrialAllowed: "true", isActive: "true", sortOrder: 1 },
      { id: "plan-premium", code: "premium", name: "Paket Premium", description: "Langganan Owner untuk hingga lima cabang", pricePerMonth: 200000, promotionAmount: 50000, promotionStartsAt: createdAt, promotionEndsAt: promoEnds, maxBranches: 5, maxStaff: 5, maxWaNumbers: 5, aiTokenQuotaDaily: 50, features: JSON.stringify(["Fitur Pro", "Manajemen staf", "Hingga lima cabang", "Cetak thermal melalui browser"]), isTrialAllowed: "true", isActive: "true", sortOrder: 2 },
    ];
    for (const plan of seedPlans) await tx.insert(plans).values(plan).onConflictDoUpdate({ target: plans.code, set: plan });
    const adminPassword = process.env.SEED_DEFAULT_PASSWORD || generateRandomPassword(16);
    const ownerPassword = process.env.SEED_DEFAULT_PASSWORD || generateRandomPassword(16);
    await tx.insert(users).values([
      { id: "user-admin-01", name: "Super Admin Cleanique", email: "admin@cleaniquelaundry.com", passwordHash: await Bun.password.hash(adminPassword, { algorithm: "bcrypt", cost: 12 }), role: "superadmin" },
      { id: "user-owner-01", name: "Owner Cleanique Jongke Tengah", email: "owner.jongke@cleaniquelaundry.com", passwordHash: await Bun.password.hash(ownerPassword, { algorithm: "bcrypt", cost: 12 }), role: "tenant_owner", tenantId: "tenant-01", tier: "pro", isTrial: "true", subscriptionUntil: until },
    ]);
    await tx.insert(tenants).values({ id: "tenant-01", userId: "user-owner-01", outletName: "Cleanique Jongke Tengah", phone: "081234567890", address: "Jongke Tengah, Sleman", city: "Sleman", tier: "pro", isTrial: "true", subscriptionUntil: until, waMode: "manual" });
    await tx.insert(services).values([
      { id: "srv-jongke-01", tenantId: "tenant-01", name: "Cuci Komplit (Kg)", unit: "kg", pricePerUnit: 8000, minOrder: 1, durationHours: 48 },
      { id: "srv-jongke-02", tenantId: "tenant-01", name: "Cuci Express (Kg)", unit: "kg", pricePerUnit: 14000, minOrder: 1, durationHours: 24 },
      { id: "srv-jongke-03", tenantId: "tenant-01", name: "Bedcover King", unit: "pcs", pricePerUnit: 35000, minOrder: 1, durationHours: 72 },
      { id: "srv-jongke-04", tenantId: "tenant-01", name: "Cuci Sepatu", unit: "pasang", pricePerUnit: 25000, minOrder: 1, durationHours: 48 },
      { id: "srv-jongke-05", tenantId: "tenant-01", name: "Setrika (Kg)", unit: "kg", pricePerUnit: 5000, minOrder: 1, durationHours: 24 },
    ]);
    const marketing = await seedMarketingUsers(tx);
    const credentials = [`Dibuat: ${createdAt}`, "Akun demo lokal; jangan gunakan untuk produksi.", `admin@cleaniquelaundry.com / ${adminPassword}`, `owner.jongke@cleaniquelaundry.com / ${ownerPassword}`, ...marketing.map(m => `${m.email} / ${m.password} / referral ${m.code}`)].join("\n");
    const credentialsFile = process.env.SEED_CREDENTIALS_FILE || fileURLToPath(new URL("../../users.local.txt", import.meta.url));
    await fs.writeFile(credentialsFile, credentials + "\n", { mode: 0o600 });
    return { accounts: marketing.length + 2, credentialsFile };
  });
  if (!result) { console.info("[seed] database sudah berisi akun; tidak ada data yang diubah"); return; }
  console.info("[seed] demo lokal siap", { accounts: result.accounts, branches: 1, plans: 2, orders: 0, invoices: 0, credentialsFile: result.credentialsFile });
}
if (import.meta.main) {
  try { await seedInitialData(); process.exit(0); }
  catch { console.error("[seed] gagal; data yang belum commit dibatalkan"); process.exit(1); }
}
