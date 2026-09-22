import { describe, it, expect, afterAll } from "bun:test";
import { Hono } from "hono";
import planRoutes from "./plans";
import { signToken } from "../middleware/auth";
import { db } from "../db/index";
import { plans } from "../db/schema";
import { eq } from "drizzle-orm";

describe("plans routes integration tests", () => {
  const app = new Hono();
  app.route("/api/plans", planRoutes);

  let adminToken: string;
  let createdPlanId: string;

  afterAll(async () => {
    if (createdPlanId) {
      await db.delete(plans).where(eq(plans.id, createdPlanId));
    }
  });

  it("siapkan token admin", async () => {
    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });
    expect(adminToken).toBeDefined();
  });

  it("GET /api/plans/public - publik dapat melihat paket aktif", async () => {
    const res = await app.request("/api/plans/public");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/plans - superadmin dapat membuat paket baru", async () => {
    const planCode = `pro_${Date.now().toString(36)}`;
    const res = await app.request("/api/plans", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        code: planCode,
        name: "Paket Profesional",
        pricePerMonth: 250000,
        durationMonths: 1,
        maxWaNumbers: 2,
        maxStaff: 5,
        aiTokenQuotaDaily: 200,
        features: ["Multi WA 2 Nomor", "5 Akun Kasir", "Asisten AI 200 Pesan"],
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
    createdPlanId = body.data.id;
  });

  it("GET /api/plans - superadmin dapat melihat semua paket", async () => {
    const res = await app.request("/api/plans", {
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

  it("GET /api/plans/:id - mengambil detail paket", async () => {
    const res = await app.request(`/api/plans/${createdPlanId}`, {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(createdPlanId);
    expect(body.data.pricePerMonth).toBe(250000);
  });

  it("PUT /api/plans/:id - memperbarui data paket", async () => {
    const res = await app.request(`/api/plans/${createdPlanId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Paket Profesional Plus",
        pricePerMonth: 275000,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.name).toBe("Paket Profesional Plus");
    expect(body.data.pricePerMonth).toBe(275000);
  });

  it("DELETE /api/plans/:id - menghapus paket", async () => {
    const res = await app.request(`/api/plans/${createdPlanId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    createdPlanId = "";
  });
});
