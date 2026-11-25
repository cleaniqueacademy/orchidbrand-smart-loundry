import { afterEach, beforeAll, describe, expect, test } from "bun:test";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { isPremiumComingSoon } from "../config";
import { resolveMidtransSettings } from "./midtransClient";
import { db, initPostgresTables } from "../db";
import { plans, tenants, users } from "../db/schema";
import planRoutes from "../routes/plans";
import { createOwnerBranch } from "./branches";
import { createBranchStaff } from "./staff";
import { createSubscriptionInvoice, getApplicablePrice } from "./subscriptionService";

describe("Midtrans auto-fallback configuration", () => {
  test("disables Midtrans without throwing when MIDTRANS_SERVER_KEY is missing", () => {
    expect(resolveMidtransSettings({ MIDTRANS_ENABLED: "true", MIDTRANS_SERVER_KEY: "" })).toEqual({
      enabled: false,
      production: false,
      serverKey: "",
    });
    expect(resolveMidtransSettings({})).toEqual({
      enabled: false,
      production: false,
      serverKey: "",
    });
  });

  test("enables Midtrans automatically when MIDTRANS_SERVER_KEY is present and not explicitly disabled", () => {
    expect(resolveMidtransSettings({ MIDTRANS_SERVER_KEY: "SB-Mid-server-test-123" })).toEqual({
      enabled: true,
      production: false,
      serverKey: "SB-Mid-server-test-123",
    });
  });

  test("respects MIDTRANS_ENABLED=false even when MIDTRANS_SERVER_KEY is set", () => {
    expect(resolveMidtransSettings({ MIDTRANS_ENABLED: "false", MIDTRANS_SERVER_KEY: "SB-Mid-server-test-123" })).toEqual({
      enabled: false,
      production: false,
      serverKey: "",
    });
  });

  test("rejects sandbox keys when MIDTRANS_IS_PRODUCTION=true", () => {
    expect(() => resolveMidtransSettings({
      MIDTRANS_IS_PRODUCTION: "true",
      MIDTRANS_SERVER_KEY: "SB-Mid-server-test-123",
    })).toThrow();
  });
});

describe("Premium Coming Soon gating flag", () => {
  test("defaults to Coming Soon enabled unless explicitly set to false", () => {
    expect(isPremiumComingSoon({})).toBe(true);
    expect(isPremiumComingSoon({ PREMIUM_COMING_SOON: "true" })).toBe(true);
    expect(isPremiumComingSoon({ PREMIUM_COMING_SOON: "false" })).toBe(false);
  });
});

describe.skipIf(process.env.PREMIUM_TEST_DATABASE !== "isolated")("Coming Soon enforcement & legacy standard fallback", () => {
  const prev = process.env.PREMIUM_COMING_SOON;
  const suffix = crypto.randomUUID();
  const ownerId = `cs-owner-${suffix}`;
  const branchId = `cs-branch-${suffix}`;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("cleanique_test")) throw new Error("Dedicated cleanique_test database required");
    await initPostgresTables();
    await db.insert(plans).values([
      { id: "plan-pro", code: "pro", name: "Paket Pro", pricePerMonth: 60000, maxBranches: 1, maxStaff: 0, isActive: "true", sortOrder: 1 },
      { id: "plan-premium", code: "premium", name: "Paket Premium", pricePerMonth: 200000, maxBranches: 5, maxStaff: 5, isActive: "true", sortOrder: 2 },
    ]).onConflictDoNothing();
    await db.insert(users).values({
      id: ownerId, name: "Pro Owner", email: `${ownerId}@test.invalid`, passwordHash: "unused",
      role: "tenant_owner", tier: "pro", subscriptionUntil: "2030-01-01", tenantId: branchId,
    });
    await db.insert(tenants).values({
      id: branchId, userId: ownerId, outletName: "Pro Outlet", phone: "08123456789", address: "Test",
      tier: "pro", subscriptionUntil: "2030-01-01",
    });
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.PREMIUM_COMING_SOON;
    else process.env.PREMIUM_COMING_SOON = prev;
  });

  test("hides premium from /api/plans/public and blocks premium invoices/branches/staff while Coming Soon is active", async () => {
    delete process.env.PREMIUM_COMING_SOON;
    const app = new Hono().route("/api/plans", planRoutes);
    const res = await app.request("/api/plans/public");
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.meta?.premiumComingSoon).toBe(true);
    expect(json.data.some((p: { code: string }) => p.code === "premium")).toBe(false);

    await expect(getApplicablePrice(branchId, "premium")).rejects.toThrow("Coming Soon");
    await expect(createSubscriptionInvoice({ tenantId: branchId, userId: ownerId, planId: "premium" })).rejects.toThrow("Coming Soon");
    await expect(createOwnerBranch(ownerId, { outletName: "Cabang 2", phone: "08123456789", address: "Test" })).rejects.toThrow("Coming Soon");
    await expect(createBranchStaff(branchId, ownerId, false, { name: "Kasir", email: `staff-${suffix}@test.invalid`, password: "long-test-password" })).rejects.toThrow("Coming Soon");

    const proQuote = await getApplicablePrice(branchId);
    expect(proQuote.plan.code).toBe("pro");
    expect(proQuote.finalPrice).toBe(60000);
  });

  test("falls back to legacy standard plan when pro plan row does not exist", async () => {
    delete process.env.PREMIUM_COMING_SOON;
    const existingPros = await db.select().from(plans).where(eq(plans.code, "pro"));
    for (const row of existingPros) {
      await db.update(plans).set({ code: `hidden-${row.id}`, isActive: "false" }).where(eq(plans.id, row.id));
    }
    await db.insert(plans).values({
      id: `legacy-std-${suffix}`, code: "standard", name: "Paket Bulanan", pricePerMonth: 60000, maxBranches: 1, maxStaff: 0, isActive: "true", sortOrder: 1,
    }).onConflictDoNothing();
    try {
      const quote = await getApplicablePrice(branchId);
      expect(quote.plan.code).toBe("standard");
      expect(quote.finalPrice).toBe(60000);
    } finally {
      await db.delete(plans).where(eq(plans.id, `legacy-std-${suffix}`));
      for (const row of existingPros) {
        await db.update(plans).set({ code: "pro", isActive: row.isActive }).where(eq(plans.id, row.id));
      }
    }
  });
});
