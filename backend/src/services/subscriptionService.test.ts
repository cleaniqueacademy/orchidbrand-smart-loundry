import { describe, it, expect, afterAll } from "bun:test";
import {
  getSubscriptionSummary,
  getApplicablePrice,
  createSubscriptionInvoice,
  uploadPaymentProof,
  verifySubscriptionInvoice,
  rejectSubscriptionInvoice,
} from "./subscriptionService";
import { db } from "../db/index";
import {
  tenants,
  users,
  subscriptionInvoices,
  subscriptionEvents,
  marketingCommissions,
  waNumbers,
  services,
  signupRequests,
  referralEvents,
} from "../db/schema";
import { eq } from "drizzle-orm";
import { registerNewTenant } from "./signupService";

describe("subscriptionService integration tests", () => {
  let testTenantId: string;
  let testUserId: string;
  let testInvoiceId: string;

  let adminUserId: string = "usr-admin-01";

  afterAll(async () => {
    if (testInvoiceId) {
      await db
        .delete(marketingCommissions)
        .where(eq(marketingCommissions.subscriptionInvoiceId, testInvoiceId));
      await db.delete(subscriptionInvoices).where(eq(subscriptionInvoices.id, testInvoiceId));
    }
    if (testTenantId) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, testTenantId));
      await db.delete(referralEvents).where(eq(referralEvents.tenantId, testTenantId));
      await db.delete(waNumbers).where(eq(waNumbers.tenantId, testTenantId));
      await db.delete(services).where(eq(services.tenantId, testTenantId));
      await db.delete(signupRequests).where(eq(signupRequests.createdTenantId, testTenantId));
      await db.delete(tenants).where(eq(tenants.id, testTenantId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  it("siapkan tenant uji coba melalui registerNewTenant", async () => {
    const res = await registerNewTenant({
      outletName: "Sub Test Outlet",
      ownerName: "Pemilik Test",
      phone: `0811${Date.now().toString().slice(-8)}`,
      email: `sub_test_${Date.now()}@test.com`,
      password: "password123",
      referralCode: "CLEANHEMAT",
    });

    expect(res.success).toBe(true);
    testTenantId = res.data!.tenantId;
    testUserId = res.data!.userId;
  });

  it("getSubscriptionSummary mengembalikan ringkasan langganan outlet", async () => {
    const summary = await getSubscriptionSummary(testTenantId);
    expect(summary).not.toBeNull();
    expect(summary?.tenantId).toBe(testTenantId);
    expect(summary?.isTrial).toBe(true);
    expect(summary?.isActive).toBe(true);
    expect(summary?.daysRemaining).toBeGreaterThanOrEqual(6);
    expect(summary?.referralCodeUsed).toBe("CLEANHEMAT");
  });

  it("getApplicablePrice menghitung harga dan diskon referral", async () => {
    const calc = await getApplicablePrice(testTenantId);
    expect(calc.basePrice).toBe(60000); // Rp 60.000/bulan flat
    // CLEANHEMAT memberikan diskon fixed Rp 5.000/bulan
    expect(calc.discountAmount).toBe(5000);
    expect(calc.finalPrice).toBe(55000); // 60.000 - 5.000
  });

  it("createSubscriptionInvoice membuat invoice baru dengan status unpaid", async () => {
    const res = await createSubscriptionInvoice({
      tenantId: testTenantId,
      userId: testUserId,
      durationMonths: 1,
    });

    expect(res.invoice).toBeDefined();
    expect(res.invoice.status).toBe("unpaid");
    expect(res.invoice.finalAmount).toBeGreaterThan(0);
    testInvoiceId = res.invoice.id;
  });

  it("uploadPaymentProof memperbarui status invoice ke pending_verification", async () => {
    const updated = await uploadPaymentProof(testInvoiceId, "https://example.com/bukti.jpg", testTenantId);
    expect(updated.status).toBe("pending_verification");
    expect(updated.paymentProofUrl).toBe("https://example.com/bukti.jpg");
  });

  it("verifySubscriptionInvoice memverifikasi invoice, memperpanjang masa aktif, dan mematikan isTrial", async () => {
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "superadmin"))
      .limit(1);

    const res = await verifySubscriptionInvoice(testInvoiceId, adminUser ? adminUser.id : "admin-01");

    expect(res.invoice.status).toBe("paid");
    expect(res.tenant.isTrial).toBe(false);
    expect(res.tenant.status).toBe("active");

    // Verifikasi di database tenant
    const [updatedTenant] = await db.select().from(tenants).where(eq(tenants.id, testTenantId));
    expect(updatedTenant.isTrial).toBe("false");

    // Verifikasi komisi marketing dicatat (karena invoice memakai referral CLEANHEMAT)
    const commissions = await db
      .select()
      .from(marketingCommissions)
      .where(eq(marketingCommissions.subscriptionInvoiceId, testInvoiceId));
    expect(commissions.length).toBeGreaterThanOrEqual(1);

    // Verifikasi event renewed dicatat
    const [renewEvent] = await db
      .select()
      .from(subscriptionEvents)
      .where(eq(subscriptionEvents.tenantId, testTenantId));
    expect(renewEvent).toBeDefined();
  });

  it("rejectSubscriptionInvoice menandai invoice ditolak dengan alasan yang jelas", async () => {
    const [adminUser] = await db
      .select()
      .from(users)
      .where(eq(users.role, "superadmin"))
      .limit(1);

    // Buat invoice kedua untuk diuji penolakannya
    const inv2 = await createSubscriptionInvoice({
      tenantId: testTenantId,
      userId: testUserId,
      durationMonths: 1,
    });

    const rejected = await rejectSubscriptionInvoice(
      inv2.invoice.id,
      adminUser ? adminUser.id : "usr-admin-01",
      "Foto buram tidak terbaca"
    );

    expect(rejected.status).toBe("rejected");
    expect(rejected.rejectionReason).toBe("Foto buram tidak terbaca");

    await db.delete(subscriptionInvoices).where(eq(subscriptionInvoices.id, inv2.invoice.id));
  });
});
