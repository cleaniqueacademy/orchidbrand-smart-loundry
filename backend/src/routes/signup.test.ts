import { describe, it, expect, afterAll } from "bun:test";
import { Hono } from "hono";
import signupRoutes from "./signup";
import { signToken } from "../middleware/auth";
import { db } from "../db/index";
import { users, tenants, signupRequests, services, waNumbers, subscriptionEvents, referralEvents } from "../db/schema";
import { eq } from "drizzle-orm";

describe("signup routes integration tests", () => {
  const app = new Hono();
  app.route("/api/signup", signupRoutes);

  let adminToken: string;
  let createdEmail: string;
  let createdTenantId: string;
  let createdUserId: string;

  afterAll(async () => {
    if (createdTenantId) {
      await db.delete(subscriptionEvents).where(eq(subscriptionEvents.tenantId, createdTenantId));
      await db.delete(referralEvents).where(eq(referralEvents.tenantId, createdTenantId));
      await db.delete(waNumbers).where(eq(waNumbers.tenantId, createdTenantId));
      await db.delete(services).where(eq(services.tenantId, createdTenantId));
      await db.delete(signupRequests).where(eq(signupRequests.createdTenantId, createdTenantId));
      await db.delete(tenants).where(eq(tenants.id, createdTenantId));
    }
    if (createdUserId) {
      await db.delete(users).where(eq(users.id, createdUserId));
    }
  });

  it("siapkan token admin untuk pengujian rute manajerial", async () => {
    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });
    expect(adminToken).toBeDefined();
  });

  it("GET /api/signup/check-email - memeriksa ketersediaan email", async () => {
    const res = await app.request(`/api/signup/check-email?email=check_${Date.now()}@test.com`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.available).toBe(true);
  });

  it("GET /api/signup/check-phone - memeriksa ketersediaan nomor HP", async () => {
    const res = await app.request(`/api/signup/check-phone?phone=0899${Date.now().toString().slice(-8)}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.available).toBe(true);
  });

  it("POST /api/signup - pendaftaran mandiri berhasil", async () => {
    createdEmail = `public_signup_${Date.now()}@test.com`;

    const res = await app.request("/api/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        outletName: "Laundry Publik Ceria",
        ownerName: "Ceria Owner",
        phone: `0877${Date.now().toString().slice(-8)}`,
        email: createdEmail,
        password: "password123",
        city: "Bandung",
        address: "Jl. Merdeka No. 12",
        referralCode: "CLEANHEMAT",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.userId).toBeDefined();
    expect(body.data.tenantId).toBeDefined();
    expect(body.data.trialDays).toBe(7);

    createdUserId = body.data.userId;
    createdTenantId = body.data.tenantId;
  });

  it("GET /api/signup/requests - superadmin dapat melihat daftar riwayat pendaftaran", async () => {
    const res = await app.request("/api/signup/requests", {
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
});
