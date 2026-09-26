import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { db } from "../db/index";
import { users, marketingProfiles, referralCodes, tenants } from "../db/schema";
import { eq } from "drizzle-orm";
import marketingRoutes from "./marketing";
import referralRoutes from "./referralCodes";
import { signToken } from "../middleware/auth";

describe("Marketing Users & Referral Codes Requirements", () => {
  const app = new Hono();
  app.route("/api/marketing", marketingRoutes);
  app.route("/api/referral-codes", referralRoutes);

  it("harus memiliki 10 kode referral dan profil marketing terkait", async () => {
    const requiredCodes = [
      "UBAI",
      "ADIT",
      "BHANGKIT",
      "RAGIL",
      "ARIF",
      "SYAMS",
      "SALIM",
      "DONI",
      "NOVA",
      "NAUFAL",
    ];

    for (const codeStr of requiredCodes) {
      const [foundCode] = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.code, codeStr));

      expect(foundCode).toBeDefined();
      expect(foundCode.code).toBe(codeStr);
      expect(foundCode.marketingProfileId).toBeTruthy();

      // Check marketing profile
      const [profile] = await db
        .select()
        .from(marketingProfiles)
        .where(eq(marketingProfiles.id, foundCode.marketingProfileId!));

      expect(profile).toBeDefined();
      expect(profile.phone).toBeTruthy();

      // Check user
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, profile.userId));

      expect(user).toBeDefined();
      expect(user.role).toBe("marketing");
    }
  });

  it("marketing user dapat melihat jumlah tenant dan daftar tenant yang menggunakan kodenya di /api/marketing/me", async () => {
    // 1. Generate auth token for Adit
    const [aditUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "adit@cleaniquelaundry.com"));

    expect(aditUser).toBeDefined();

    const token = await signToken({
      userId: aditUser.id,
      role: "marketing",
      tenantId: null,
    });

    // 2. Fetch /api/marketing/me
    const meRes = await app.request("/api/marketing/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.success).toBe(true);
    expect(meJson.data.profile).toBeDefined();
    expect(meJson.data.codes).toBeDefined();
    expect(meJson.data.codes.length).toBeGreaterThan(0);
    expect(typeof meJson.data.totalTenantsCount).toBe("number");
    expect(Array.isArray(meJson.data.tenants)).toBe(true);

    const aditCode = meJson.data.codes.find((c: any) => c.code === "ADIT");
    expect(aditCode).toBeDefined();
    expect(typeof aditCode.tenantCount).toBe("number");
    expect(Array.isArray(aditCode.tenants)).toBe(true);
  });

  it("marketing user dapat mengakses /api/referral-codes/track dan hanya melihat kodenya sendiri", async () => {
    const [aditUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "adit@cleaniquelaundry.com"));

    const token = await signToken({
      userId: aditUser.id,
      role: "marketing",
      tenantId: null,
    });

    const trackRes = await app.request("/api/referral-codes/track", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    expect(trackRes.status).toBe(200);
    const trackJson = await trackRes.json();
    expect(trackJson.success).toBe(true);
    expect(Array.isArray(trackJson.data)).toBe(true);
    for (const item of trackJson.data) {
      expect(item.code).toBe("ADIT");
      expect(typeof item.totalTenants).toBe("number");
      expect(Array.isArray(item.tenants)).toBe(true);
    }
  });

  it("ketika tenant menerapkan kode referral, marketing user melihat penambahan tenant di dashboardnya", async () => {
    // 1. Ambil tenant uji coba dan kode ARIF
    const [tenant] = await db.select().from(tenants).limit(1);
    expect(tenant).toBeDefined();

    const [arifUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, "arif@cleaniquelaundry.com"));
    expect(arifUser).toBeDefined();

    // 2. Hubungkan tenant ini ke kode ARIF
    const [arifCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.code, "ARIF"));
    expect(arifCode).toBeDefined();

    await db
      .update(tenants)
      .set({ referralCodeId: arifCode.id, source: "referral" })
      .where(eq(tenants.id, tenant.id));

    // 3. Login / query me untuk Arif
    const arifToken = await signToken({
      userId: arifUser.id,
      role: "marketing",
      tenantId: null,
    });

    const meRes = await app.request("/api/marketing/me", {
      headers: {
        Authorization: `Bearer ${arifToken}`,
      },
    });

    expect(meRes.status).toBe(200);
    const meJson = await meRes.json();
    expect(meJson.success).toBe(true);

    // Total tenants count harus minimal 1
    expect(meJson.data.totalTenantsCount).toBeGreaterThanOrEqual(1);

    // Daftar tenant harus memuat tenant tersebut
    const foundTenant = meJson.data.tenants.find((t: any) => t.id === tenant.id);
    expect(foundTenant).toBeDefined();
    expect(foundTenant.outletName).toBe(tenant.outletName);
    expect(foundTenant.referralCode).toBe("ARIF");

    // Di dalam codes[0].tenants juga ada
    const codeObj = meJson.data.codes.find((c: any) => c.code === "ARIF");
    expect(codeObj).toBeDefined();
    expect(codeObj.tenantCount).toBeGreaterThanOrEqual(1);
    expect(codeObj.tenants.some((t: any) => t.id === tenant.id)).toBe(true);
  });
});
