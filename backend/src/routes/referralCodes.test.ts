import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import referralRoutes from "./referralCodes";
import { signToken } from "../middleware/auth";

describe("referralCodes routes integration tests", () => {
  const app = new Hono();
  app.route("/api/referral-codes", referralRoutes);

  let adminToken: string;
  let tenantToken: string;
  let createdCodeId: string;

  it("siapkan token admin dan tenant untuk pengujian", async () => {
    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });
    tenantToken = await signToken({
      userId: "user-owner-01",
      role: "tenant_owner",
      tenantId: "tenant-01",
    });
    expect(adminToken).toBeDefined();
    expect(tenantToken).toBeDefined();
  });

  it("GET /api/referral-codes/validate - memvalidasi kode valid dari seed", async () => {
    const res = await app.request("/api/referral-codes/validate?code=CLEANHEMAT");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.code).toBe("CLEANHEMAT");
    expect(body.data.discountType).toBe("fixed");
    expect(body.data.discountValue).toBe(5000); // Rp 5.000/bulan
  });

  it("GET /api/referral-codes/validate - menolak kode tidak terdaftar", async () => {
    const res = await app.request("/api/referral-codes/validate?code=KODE_PALSU");
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("POST /api/referral-codes - membuat kode promo baru", async () => {
    const res = await app.request("/api/referral-codes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: `TESTPROMO${Date.now().toString(36).toUpperCase()}`,
        name: "Promo Uji Coba Otomatis",
        discountType: "percent",
        discountValue: 15,
        commissionType: "fixed",
        commissionValue: 10000,
        maxUsage: 50,
        appliesToAllTenants: "true",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    createdCodeId = body.data.id;
  });

  it("GET /api/referral-codes - mengambil daftar semua kode referral", async () => {
    const res = await app.request("/api/referral-codes", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/referral-codes/:id - mengambil detail satu kode referral", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdCodeId);
    expect(body.data.discountValue).toBe(15);
  });

  it("PUT /api/referral-codes/:id - memperbarui data kode referral", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Promo Diperbarui",
        discountValue: 20,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Promo Diperbarui");
    expect(body.data.discountValue).toBe(20);
  });

  it("GET /api/referral-codes/:id/stats - mengambil statistik kode", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}/stats`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.clicks).toBeDefined();
    expect(body.data.signups).toBeDefined();
  });

  it("POST /api/referral-codes/:id/toggle-tenant - toggle aktivasi outlet", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}/toggle-tenant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        tenantId: "tenant-01",
        isEnabled: "true",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("GET /api/referral-codes/:id/tenants - mengambil daftar tenant dan status aktivasi", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}/tenants`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("DELETE /api/referral-codes/:id - menolak penghapusan oleh non-superadmin", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tenantToken}`,
      },
    });

    expect(res.status).toBe(403);
  });

  it("DELETE /api/referral-codes/:id - menghapus kode oleh superadmin", async () => {
    const res = await app.request(`/api/referral-codes/${createdCodeId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
