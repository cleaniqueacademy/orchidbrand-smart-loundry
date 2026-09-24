import { describe, it, expect, afterAll } from "bun:test";
import { Hono } from "hono";
import subscriptionRoutes from "./subscription";
import { signToken } from "../middleware/auth";
import { registerNewTenant } from "../services/signupService";
import { db } from "../db/index";
import {
  subscriptionInvoices,
  subscriptionEvents,
  marketingCommissions,
  tenants,
  users,
  waNumbers,
  services,
  signupRequests,
  referralEvents,
} from "../db/schema";
import { eq } from "drizzle-orm";

describe("subscription routes integration tests", () => {
  const app = new Hono();
  app.route("/api/subscription", subscriptionRoutes);

  let adminToken: string;
  let ownerToken: string;
  let testTenantId: string;
  let testUserId: string;
  let createdInvoiceId: string;

  afterAll(async () => {
    if (createdInvoiceId) {
      await db
        .delete(marketingCommissions)
        .where(eq(marketingCommissions.subscriptionInvoiceId, createdInvoiceId));
      await db.delete(subscriptionInvoices).where(eq(subscriptionInvoices.id, createdInvoiceId));
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

  it("siapkan data tenant dan token untuk pengujian", async () => {
    const signup = await registerNewTenant({
      outletName: "Sub Route Test Laundry",
      ownerName: "Sub Route Owner",
      phone: `0819${Date.now().toString().slice(-8)}`,
      email: `subroute_${Date.now()}@test.com`,
      password: "password123",
      referralCode: "CLEANHEMAT",
    });

    testTenantId = signup.data!.tenantId;
    testUserId = signup.data!.userId;

    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });

    ownerToken = await signToken({
      userId: testUserId,
      role: "tenant_owner",
      tenantId: testTenantId,
    });

    expect(adminToken).toBeDefined();
    expect(ownerToken).toBeDefined();
  });

  it("GET /api/subscription/summary - tenant owner dapat melihat ringkasan langganannya", async () => {
    const res = await app.request("/api/subscription/summary", {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.tenantId).toBe(testTenantId);
    expect(body.data.isTrial).toBe(true);
    expect(body.data.daysRemaining).toBeGreaterThanOrEqual(6);
  });

  it("GET /api/subscription/pricing - menghitung harga paket", async () => {
    const res = await app.request("/api/subscription/pricing", {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.basePrice).toBeGreaterThan(0);
    expect(body.data.discountAmount).toBeGreaterThan(0);
  });

  it("POST /api/subscription/invoices - membuat invoice perpanjangan", async () => {
    const res = await app.request("/api/subscription/invoices", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        durationMonths: 1,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.invoice).toBeDefined();
    createdInvoiceId = body.data.invoice.id;
  });

  it("POST /api/subscription/invoices/:id/proof - unggah bukti transfer", async () => {
    const res = await app.request(`/api/subscription/invoices/${createdInvoiceId}/proof`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ownerToken}`,
      },
      body: JSON.stringify({
        proofUrl: "https://example.com/transfer_proof.jpg",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe("pending_verification");
  });

  it("GET /api/subscription/invoices - mengambil daftar invoice", async () => {
    const res = await app.request("/api/subscription/invoices", {
      headers: {
        Authorization: `Bearer ${ownerToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("PUT /api/subscription/invoices/:id/verify - superadmin memverifikasi invoice", async () => {
    const res = await app.request(`/api/subscription/invoices/${createdInvoiceId}/verify`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.invoice.status).toBe("paid");
    expect(body.data.tenant.isTrial).toBe(false);
  });

  it("POST /api/subscription/check-trial-reminders - superadmin memicu reminder check", async () => {
    const res = await app.request("/api/subscription/check-trial-reminders", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.totalChecked).toBeDefined();
  });

  it("POST /api/subscription/apply-referral - menolak kode referral yang tidak valid", async () => {
    const res = await app.request("/api/subscription/apply-referral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        referralCode: "KODE_PALSU_TIDAK_ADA",
      }),
    });

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("POST /api/subscription/remove-referral - berhasil mencopot kode referral", async () => {
    const res = await app.request("/api/subscription/remove-referral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: testTenantId,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Cek ringkasan langganan sudah tidak memiliki kode referral
    const sumRes = await app.request("/api/subscription/summary", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const sumBody = await sumRes.json();
    expect(sumBody.data.referralCodeUsed).toBeNull();
  });

  it("POST /api/subscription/apply-referral - berhasil menerapkan kembali kode referral valid", async () => {
    const res = await app.request("/api/subscription/apply-referral", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ownerToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        tenantId: testTenantId,
        referralCode: "CLEANHEMAT",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.referralCode).toBe("CLEANHEMAT");

    // Cek ringkasan langganan sekarang memiliki kode referral kembali
    const sumRes = await app.request("/api/subscription/summary", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });
    const sumBody = await sumRes.json();
    expect(sumBody.data.referralCodeUsed).toBe("CLEANHEMAT");
  });
});

