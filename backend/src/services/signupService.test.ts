import { describe, it, expect, afterAll } from "bun:test";
import {
  registerNewTenant,
  isEmailAvailable,
  isPhoneAvailable,
} from "./signupService";
import { db } from "../db/index";
import {
  users,
  tenants,
  services,
  waNumbers,
  signupRequests,
  subscriptionEvents,
  referralEvents,
  referralCodes,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { daysRemaining } from "../utils/date";

describe("signupService integration tests", () => {
  const createdUserIds: string[] = [];
  const createdTenantIds: string[] = [];

  afterAll(async () => {
    for (const tenantId of createdTenantIds) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId));
      await db.delete(referralEvents).where(eq(referralEvents.tenantId, tenantId));
      await db.delete(waNumbers).where(eq(waNumbers.tenantId, tenantId));
      await db.delete(services).where(eq(services.tenantId, tenantId));
      await db.delete(signupRequests).where(eq(signupRequests.createdTenantId, tenantId));
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    }
    for (const userId of createdUserIds) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });

  it("isEmailAvailable mengembalikan true untuk email baru dan false untuk email yang sudah ada", async () => {
    expect(await isEmailAvailable(`email_baru_${Date.now()}@test.com`)).toBe(true);
    expect(await isEmailAvailable("admin@cleaniquelaundry.com")).toBe(false);
  });

  it("isPhoneAvailable mengembalikan status ketersediaan telepon", async () => {
    expect(await isPhoneAvailable(`0899${Date.now().toString().slice(-8)}`)).toBe(true);
  });

  it("registerNewTenant menolak pendaftaran jika data wajib tidak lengkap", async () => {
    const res = await registerNewTenant({
      outletName: "",
      ownerName: "Budi",
      phone: "0812345678",
      email: "budi@test.com",
      password: "password123",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("wajib diisi");
  });

  it("registerNewTenant menolak pendaftaran jika email sudah terdaftar", async () => {
    const res = await registerNewTenant({
      outletName: "Laundry Budi",
      ownerName: "Budi",
      phone: "0812345678",
      email: "admin@cleaniquelaundry.com", // Email admin yang sudah ada
      password: "password123",
    });

    expect(res.success).toBe(false);
    expect(res.message).toContain("Email sudah terdaftar");
  });

  it("registerNewTenant melakukan safe fallback jika kode referral tidak valid (tetap sukses tanpa memblokir pendaftaran)", async () => {
    const res = await registerNewTenant({
      outletName: "Laundry Budi",
      ownerName: "Budi",
      phone: "0812345678",
      email: `budi_invalid_ref_${Date.now()}@test.com`,
      password: "password123",
      referralCode: "KODEPALSU123",
    });

    expect(res.success).toBe(true);
    expect(res.data?.referralCode).toBeNull();
    expect(res.data?.referralNotice).toBeDefined();
    expect(res.message).toContain("Pendaftaran berhasil");
  });

  it("registerNewTenant berhasil mendaftarkan tenant baru dengan trial 7 hari", async () => {
    const uniqueEmail = `budi_trial_${Date.now()}@test.com`;
    const uniquePhone = `0812${Date.now().toString().slice(-8)}`;

    const res = await registerNewTenant({
      outletName: "Cleanique Express",
      ownerName: "Budi Santoso",
      phone: uniquePhone,
      email: uniqueEmail,
      password: "password123",
      city: "Surabaya",
      address: "Jl. Rungkut No. 10",
    });

    expect(res.success).toBe(true);
    expect(res.data).toBeDefined();
    expect(res.data?.trialDays).toBe(7);

    const { userId, tenantId, subscriptionUntil } = res.data!;
    createdUserIds.push(userId);
    createdTenantIds.push(tenantId);

    // 1. Verifikasi User
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    expect(user).toBeDefined();
    expect(user.role).toBe("tenant_owner");
    expect(user.isTrial).toBe("true");
    expect(user.status).toBe("active");

    // 2. Verifikasi Tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    expect(tenant).toBeDefined();
    expect(tenant.isTrial).toBe("true");
    expect(tenant.status).toBe("active");
    expect(daysRemaining(subscriptionUntil)).toBeGreaterThanOrEqual(6);

    // 3. Verifikasi Default Services ter-seed
    const tenantServices = await db.select().from(services).where(eq(services.tenantId, tenantId));
    expect(tenantServices.length).toBeGreaterThan(0);

    // 4. Verifikasi Primary WA Number diinisialisasi
    const [waNum] = await db.select().from(waNumbers).where(eq(waNumbers.tenantId, tenantId));
    expect(waNum).toBeDefined();
    expect(waNum.isPrimary).toBe("true");
    expect(waNum.sessionKey).toBe(tenantId);

    // 5. Verifikasi Event trial_started dicatat
    const [subEvent] = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.tenantId, tenantId));
    expect(subEvent).toBeDefined();
    expect(subEvent.eventType).toBe("trial_started");
  });

  it("registerNewTenant berhasil dengan kode referral valid (CLEANHEMAT)", async () => {
    const uniqueEmail = `andi_ref_${Date.now()}@test.com`;
    const uniquePhone = `0813${Date.now().toString().slice(-8)}`;

    const [seedCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, "CLEANHEMAT"));

    const initialUsage = seedCode.currentUsage;

    const res = await registerNewTenant({
      outletName: "Andi Laundry Barokah",
      ownerName: "Andi Wijaya",
      phone: uniquePhone,
      email: uniqueEmail,
      password: "password123",
      referralCode: "CLEANHEMAT",
    });

    expect(res.success).toBe(true);
    expect(res.data?.referralCode).toBe("CLEANHEMAT");

    const { userId, tenantId } = res.data!;
    createdUserIds.push(userId);
    createdTenantIds.push(tenantId);

    // Verifikasi counter currentUsage pada referral code bertambah
    const [updatedCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, "CLEANHEMAT"));
    expect(updatedCode.currentUsage).toBe(initialUsage + 1);

    // Verifikasi referralEvent dicatat
    const [refEvent] = await db
      .select()
      .from(referralEvents)
      .where(eq(referralEvents.tenantId, tenantId));
    expect(refEvent).toBeDefined();
    expect(refEvent.eventType).toBe("signup");
  });
});
