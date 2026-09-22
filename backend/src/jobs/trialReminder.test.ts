import { describe, it, expect, afterAll } from "bun:test";
import { runTrialReminderCheck } from "./trialReminder";
import { db } from "../db/index";
import { tenants, users, subscriptionEvents } from "../db/schema";
import { eq } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays } from "../utils/date";

describe("trialReminder job integration tests", () => {
  const testTenantIds: string[] = [];
  const testUserIds: string[] = [];

  afterAll(async () => {
    for (const tId of testTenantIds) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tId));
      await db.delete(tenants).where(eq(tenants.id, tId));
    }
    for (const uId of testUserIds) {
      await db.delete(users).where(eq(users.id, uId));
    }
  });

  it("mendeteksi tenant H-3, H-1, dan Expired secara akurat tanpa duplikasi", async () => {
    const uH3 = newId("usr");
    const tH3 = newId("tenant");
    const uH1 = newId("usr");
    const tH1 = newId("tenant");
    const uExp = newId("usr");
    const tExp = newId("tenant");

    testUserIds.push(uH3, uH1, uExp);
    testTenantIds.push(tH3, tH1, tExp);

    const nowIso = new Date().toISOString();

    // Buat User dummy
    await db.insert(users).values([
      { id: uH3, name: "User H3", email: `h3_${Date.now()}@test.com`, passwordHash: "h", role: "tenant_owner", createdAt: nowIso },
      { id: uH1, name: "User H1", email: `h1_${Date.now()}@test.com`, passwordHash: "h", role: "tenant_owner", createdAt: nowIso },
      { id: uExp, name: "User Exp", email: `exp_${Date.now()}@test.com`, passwordHash: "h", role: "tenant_owner", createdAt: nowIso },
    ]);

    // Buat Tenant dummy: H-3, H-1, dan Expired (H-1 di masa lalu)
    await db.insert(tenants).values([
      {
        id: tH3,
        userId: uH3,
        outletName: "Outlet H3",
        phone: "08123000001",
        address: "Alamat",
        isTrial: "true",
        status: "active",
        subscriptionUntil: addDays(3),
        createdAt: nowIso,
      },
      {
        id: tH1,
        userId: uH1,
        outletName: "Outlet H1",
        phone: "08123000002",
        address: "Alamat",
        isTrial: "true",
        status: "active",
        subscriptionUntil: addDays(1),
        createdAt: nowIso,
      },
      {
        id: tExp,
        userId: uExp,
        outletName: "Outlet Expired",
        phone: "08123000003",
        address: "Alamat",
        isTrial: "true",
        status: "active",
        subscriptionUntil: addDays(-1), // Sudah lewat
        createdAt: nowIso,
      },
    ]);

    // Jalankan pemeriksaan pertama
    const res1 = await runTrialReminderCheck();
    expect(res1.h3RemindersSent).toBeGreaterThanOrEqual(1);
    expect(res1.h1RemindersSent).toBeGreaterThanOrEqual(1);
    expect(res1.expiredMarked).toBeGreaterThanOrEqual(1);

    // Verifikasi status tenant yang expired diubah ke inactive
    const [expiredTenant] = await db.select().from(tenants).where(eq(tenants.id, tExp));
    expect(expiredTenant.status).toBe("inactive");

    // Jalankan pemeriksaan kedua di hari yang sama: TIDAK BOLEH MENGIRIM DUPLIKASI
    const res2 = await runTrialReminderCheck();
    // Khusus untuk tenant uji kita, tidak ada pengiriman ulang
    const eventsH3 = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.tenantId, tH3));
    expect(eventsH3.length).toBe(1);

    const eventsH1 = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.tenantId, tH1));
    expect(eventsH1.length).toBe(1);
  });
});
