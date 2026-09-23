import { describe, it, expect, afterAll } from "bun:test";
import {
  computeDiscount,
  validateCode,
  recordClick,
  recordSignup,
  recordCommission,
} from "./referralService";
import { db } from "../db/index";
import {
  referralCodes,
  referralCodeTenants,
  referralEvents,
  marketingCommissions,
  tenants,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays } from "../utils/date";

describe("referralService - computeDiscount", () => {
  it("menghitung diskon persentase", () => {
    const res = computeDiscount(100000, { discountType: "percent", discountValue: 10 });
    expect(res.discountAmount).toBe(10000);
    expect(res.finalPrice).toBe(90000);
  });

  it("menghitung diskon fixed rupiah", () => {
    const res = computeDiscount(100000, { discountType: "fixed", discountValue: 25000 });
    expect(res.discountAmount).toBe(25000);
    expect(res.finalPrice).toBe(75000);
  });

  it("diskon fixed tidak melebihi harga awal", () => {
    const res = computeDiscount(20000, { discountType: "fixed", discountValue: 50000 });
    expect(res.discountAmount).toBe(20000);
    expect(res.finalPrice).toBe(0);
  });
});

describe("referralService - validateCode", () => {
  const testCodeIds: string[] = [];

  afterAll(async () => {
    for (const id of testCodeIds) {
      await db.delete(referralCodeTenants).where(eq(referralCodeTenants.referralCodeId, id));
      await db.delete(referralEvents).where(eq(referralEvents.referralCodeId, id));
      await db.delete(marketingCommissions).where(eq(marketingCommissions.referralCodeId, id));
      await db.delete(referralCodes).where(eq(referralCodes.id, id));
    }
  });

  it("menolak kode kosong", async () => {
    const res = await validateCode("");
    expect(res.valid).toBe(false);
    expect(res.message).toBe("Kode referral tidak boleh kosong");
  });

  it("menolak kode yang tidak terdaftar", async () => {
    const res = await validateCode("KODEACAK9999");
    expect(res.valid).toBe(false);
    expect(res.message).toBe("Kode referral tidak ditemukan");
  });

  it("menerima kode valid dari database yang sudah di-seed (case insensitive)", async () => {
    const res = await validateCode("cleanhemat");
    expect(res.valid).toBe(true);
    expect(res.code?.code).toBe("CLEANHEMAT");
    expect(res.discountType).toBe("percent");
    expect(res.discountValue).toBe(10);
  });

  it("menolak kode jika status isActive = 'false'", async () => {
    const id = newId("ref");
    testCodeIds.push(id);
    await db.insert(referralCodes).values({
      id,
      code: `INACTIVE_${Date.now().toString(36).toUpperCase()}`,
      name: "Kode Nonaktif",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 5,
      isActive: "false",
      appliesToAllTenants: "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const codeRow = (await db.select().from(referralCodes).where(eq(referralCodes.id, id)))[0];
    const res = await validateCode(codeRow.code);
    expect(res.valid).toBe(false);
    expect(res.message).toContain("sudah tidak aktif");
  });

  it("menolak kode jika belum mulai berlaku (validFrom di masa depan)", async () => {
    const id = newId("ref");
    testCodeIds.push(id);
    const codeStr = `FUTURE_${Date.now().toString(36).toUpperCase()}`;
    await db.insert(referralCodes).values({
      id,
      code: codeStr,
      name: "Kode Masa Depan",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 5,
      isActive: "true",
      validFrom: addDays(7), // 7 hari lagi
      appliesToAllTenants: "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await validateCode(codeStr);
    expect(res.valid).toBe(false);
    expect(res.message).toContain("baru berlaku mulai tanggal");
  });

  it("menolak kode jika sudah kedaluwarsa (validUntil di masa lalu)", async () => {
    const id = newId("ref");
    testCodeIds.push(id);
    const codeStr = `EXPIRED_${Date.now().toString(36).toUpperCase()}`;
    await db.insert(referralCodes).values({
      id,
      code: codeStr,
      name: "Kode Kedaluwarsa",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 5,
      isActive: "true",
      validUntil: addDays(-2), // 2 hari lalu
      appliesToAllTenants: "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await validateCode(codeStr);
    expect(res.valid).toBe(false);
    expect(res.message).toContain("telah kedaluwarsa");
  });

  it("menolak kode jika kuota penggunaan (maxUsage) telah habis", async () => {
    const id = newId("ref");
    testCodeIds.push(id);
    const codeStr = `MAXED_${Date.now().toString(36).toUpperCase()}`;
    await db.insert(referralCodes).values({
      id,
      code: codeStr,
      name: "Kode Kuota Penuh",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 5,
      isActive: "true",
      maxUsage: 5,
      currentUsage: 5,
      appliesToAllTenants: "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await validateCode(codeStr);
    expect(res.valid).toBe(false);
    expect(res.message).toContain("Kuota penggunaan kode referral ini telah habis");
  });

  it("validasi per-outlet: menolak jika outlet tidak terdaftar atau nonaktif", async () => {
    // Dapatkan ID tenant yang valid dari database
    const [existingTenant] = await db.select().from(tenants).limit(1);
    expect(existingTenant).toBeDefined();

    const id = newId("ref");
    testCodeIds.push(id);
    const codeStr = `TENANT_SPECIFIC_${Date.now().toString(36).toUpperCase()}`;
    await db.insert(referralCodes).values({
      id,
      code: codeStr,
      name: "Kode Khusus Outlet Tertentu",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 5,
      isActive: "true",
      appliesToAllTenants: "false", // Khusus outlet tertentu
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Validasi untuk outlet yang belum diaktifkan (misal tenant-01 sebelum di-insert relasi aktivasinya)
    const resUnauthorized = await validateCode(codeStr, existingTenant.id);
    expect(resUnauthorized.valid).toBe(false);
    expect(resUnauthorized.message).toContain("tidak berlaku untuk outlet ini");

    // Daftarkan aktivasi outlet
    await db.insert(referralCodeTenants).values({
      id: newId("rct"),
      referralCodeId: id,
      tenantId: existingTenant.id,
      isEnabled: "true",
      createdAt: new Date().toISOString(),
    });

    // Validasi ulang untuk outlet yang telah diaktifkan
    const resAuthorized = await validateCode(codeStr, existingTenant.id);
    expect(resAuthorized.valid).toBe(true);
    expect(resAuthorized.code?.id).toBe(id);
  });
});

describe("referralService - recordClick & recordSignup", () => {
  const testCodeId = newId("ref");

  afterAll(async () => {
    await db.delete(referralEvents).where(eq(referralEvents.referralCodeId, testCodeId));
    await db.delete(referralCodes).where(eq(referralCodes.id, testCodeId));
  });

  it("merekam event click referral", async () => {
    const [existingTenant] = await db.select().from(tenants).limit(1);

    await db.insert(referralCodes).values({
      id: testCodeId,
      code: `CLICKEVT_${Date.now().toString(36).toUpperCase()}`,
      name: "Kode Event Click",
      discountType: "percent",
      discountValue: 10,
      commissionType: "fixed",
      commissionValue: 10000,
      isActive: "true",
      appliesToAllTenants: "true",
      currentUsage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await recordClick(testCodeId, existingTenant ? existingTenant.id : null, {
      ip: "127.0.0.1",
      userAgent: "BunTest",
    });

    const events = await db
      .select()
      .from(referralEvents)
      .where(eq(referralEvents.referralCodeId, testCodeId));

    expect(events.length).toBeGreaterThanOrEqual(1);
    const clickEvt = events.find((e) => e.eventType === "click");
    expect(clickEvt).toBeDefined();
    if (existingTenant) {
      expect(clickEvt?.tenantId).toBe(existingTenant.id);
    }
  });

  it("merekam event signup & menginkremen currentUsage", async () => {
    const [existingTenant] = await db.select().from(tenants).limit(1);

    await recordSignup(testCodeId, existingTenant ? existingTenant.id : null, {
      email: "newUser@test.com",
    });

    const events = await db
      .select()
      .from(referralEvents)
      .where(eq(referralEvents.referralCodeId, testCodeId));

    const signupEvt = events.find((e) => e.eventType === "signup");
    expect(signupEvt).toBeDefined();

    // Verifikasi counter currentUsage bertambah 1
    const [updatedCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.id, testCodeId));

    expect(updatedCode.currentUsage).toBe(1);
  });
});

describe("referralService - recordCommission", () => {
  it("menghitung dan mencatat komisi jika kode memiliki marketingProfileId", async () => {
    // Gunakan kode CLEANHEMAT yang sudah di-seed dengan marketingProfileId
    const [seedCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, "CLEANHEMAT"));

    expect(seedCode).toBeDefined();
    expect(seedCode.marketingProfileId).toBeDefined();

    const [existingTenant] = await db.select().from(tenants).limit(1);

    const res = await recordCommission({
      referralCodeId: seedCode.id,
      subscriptionInvoiceId: null, // nullable / opsional
      baseAmount: 150000,
      tenantId: existingTenant ? existingTenant.id : null,
    });

    expect(res).not.toBeNull();
    expect(res?.commissionId).toBeDefined();
    // CLEANHEMAT: komisi 10% dari 150.000 = 15.000
    expect(res?.commissionAmount).toBe(15000);

    // Verifikasi di database marketingCommissions
    const [commRow] = await db
      .select()
      .from(marketingCommissions)
      .where(eq(marketingCommissions.id, res!.commissionId));

    expect(commRow).toBeDefined();
    expect(commRow.status).toBe("pending");
    expect(commRow.commissionAmount).toBe(15000);

    // Bersihkan data tes
    await db.delete(marketingCommissions).where(eq(marketingCommissions.id, res!.commissionId));
    await db.delete(referralEvents).where(eq(referralEvents.referralCodeId, seedCode.id));
  });

  it("mengembalikan null jika kode tidak memiliki marketingProfileId", async () => {
    const noMarketingCodeId = newId("ref");
    await db.insert(referralCodes).values({
      id: noMarketingCodeId,
      code: `NOMKT_${Date.now().toString(36).toUpperCase()}`,
      name: "Kode Tanpa Marketing",
      discountType: "percent",
      discountValue: 10,
      commissionType: "percent",
      commissionValue: 0,
      marketingProfileId: null,
      isActive: "true",
      appliesToAllTenants: "true",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await recordCommission({
      referralCodeId: noMarketingCodeId,
      baseAmount: 150000,
    });

    expect(res).toBeNull();

    await db.delete(referralCodes).where(eq(referralCodes.id, noMarketingCodeId));
  });
});
