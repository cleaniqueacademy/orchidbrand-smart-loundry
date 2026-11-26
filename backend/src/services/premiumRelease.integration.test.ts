import { createSession } from "./sessions";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { db, initPostgresTables } from "../db";
import { expenses, plans, referralCodes, subscriptionEvents, tenants, users, storedFiles } from "../db/schema";
import { createOwnerBranch } from "./branches";
import { createBranchStaff } from "./staff";
import { createSubscriptionInvoice, uploadPaymentProof, verifySubscriptionInvoice } from "./subscriptionService";
import subscriptionRoutes from "../routes/subscription";
import { signToken, authMiddleware, getUser } from "../middleware/auth";

// Opt-in only: never point this integration suite at a development or production database.
const enabled = process.env.PREMIUM_TEST_DATABASE === "isolated";
describe.skipIf(!enabled)("Premium release with isolated PostgreSQL", () => {
  const suffix = crypto.randomUUID();
  const ownerId = `owner-${suffix}`, tenantId = `branch-${suffix}`, otherId = `other-${suffix}`;
  const prevComingSoon = process.env.PREMIUM_COMING_SOON;
  afterAll(() => {
    if (prevComingSoon === undefined) delete process.env.PREMIUM_COMING_SOON;
    else process.env.PREMIUM_COMING_SOON = prevComingSoon;
  });
  beforeAll(async () => {
    process.env.PREMIUM_COMING_SOON = "false";
    if (!process.env.DATABASE_URL?.includes("cleanique_test")) throw new Error("Dedicated cleanique_test database required");
    await initPostgresTables();
    await db.insert(users).values([
      { id: ownerId, name: "Owner", email: `${ownerId}@test.invalid`, passwordHash: "test-only", role: "tenant_owner", tier: "premium", subscriptionUntil: "2030-01-01" },
      { id: otherId, name: "Other", email: `${otherId}@test.invalid`, passwordHash: "test-only", role: "superadmin" },
    ]);
    await db.insert(tenants).values({ id: tenantId, userId: ownerId, outletName: "Primary", address: "Test", phone: "08123456789", tier: "premium", subscriptionUntil: "2030-01-01" });
    await db.update(plans).set({ promotionStartsAt: new Date(Date.now() - 60000).toISOString(), promotionEndsAt: new Date(Date.now() + 3600000).toISOString(), maxStaff: 1 }).where(eq(plans.id, "plan-premium"));
    await db.insert(referralCodes).values({ id: `ref-${suffix}`, code: `REF-${suffix}`, name: "Test referral", discountType: "percent", discountValue: 10 });
  });
  test("quota remains five including primary under concurrent creation", async () => {
    const results = await Promise.allSettled(Array.from({ length: 7 }, (_, i) => createOwnerBranch(ownerId, { outletName: `Branch ${i}`, phone: "08123456789", address: "Test" })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(4);
    expect(await db.select().from(tenants).where(eq(tenants.userId, ownerId))).toHaveLength(5);
  });
  test("staff quota is shared across branches and cannot be bypassed by concurrency", async () => {
    const branches = await db.select().from(tenants).where(eq(tenants.userId, ownerId));
    const results = await Promise.allSettled(branches.slice(0, 2).map((branch, i) => createBranchStaff(branch.id, ownerId, false, { name: "Cashier", email: `cashier-${suffix}-${i}@test.invalid`, password: "long-test-password" })));
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    await expect(createBranchStaff(tenantId, otherId, false, { name: "Cashier", email: `bad-${suffix}@test.invalid`, password: "long-test-password" })).rejects.toThrow();
  });
  test("branch header is resolved only after validating Owner ownership", async () => {
    const branches = await db.select().from(tenants).where(eq(tenants.userId, ownerId));
    const app = new Hono().get("/probe", authMiddleware, c => c.json({ tenantId: getUser(c).tenantId }));
    const token = (await createSession(ownerId)).token;
    const selected = branches.find(branch => branch.id !== tenantId)!;
    const own = await app.request("/probe", { headers: { Cookie: `cleanique_session=${token}`, "X-Tenant-Id": selected.id } });
    expect(own.status).toBe(200);
    expect(await own.json()).toEqual({ tenantId: selected.id });
    const denied = await app.request("/probe", { headers: { Cookie: `cleanique_session=${token}`, "X-Tenant-Id": "foreign-branch" } });
    expect(denied.status).toBe(403);
    const [staffUser] = await db.select().from(users).where(eq(users.role,"staff"));
    const staffToken = (await createSession(staffUser.id)).token;
    const otherBranch = branches.find(branch => branch.id !== staffUser.tenantId)!;
    const staff = await app.request("/probe", { headers: { Cookie: `cleanique_session=${staffToken}`, "X-Tenant-Id": otherBranch.id } });
    expect(staff.status).toBe(403);
  });
  test("snapshot pricing, owner activation and side effects are atomic on repeated verification", async () => {
    const { invoice } = await createSubscriptionInvoice({ tenantId, userId: ownerId, planId: "plan-premium", durationMonths: 3, referralCode: `REF-${suffix}` });
    expect(invoice.finalAmount).toBe(405000);
    expect(invoice.promotionDiscountAmount).toBe(150000);
    expect(invoice.referralDiscountAmount).toBe(45000);
    await expect(verifySubscriptionInvoice(invoice.id, otherId)).rejects.toThrow();
    await db.insert(storedFiles).values({ path: `/uploads/payments/2026-11/${suffix}.png`, ownerId, category: "payments" });
    await uploadPaymentProof(invoice.id, `/uploads/payments/2026-11/${suffix}.png`, tenantId);
    const verified = await Promise.allSettled([verifySubscriptionInvoice(invoice.id, otherId), verifySubscriptionInvoice(invoice.id, otherId)]);
    expect(verified.filter(r => r.status === "fulfilled")).toHaveLength(2);
    const branches = await db.select().from(tenants).where(eq(tenants.userId, ownerId));
    expect(new Set(branches.map(b => b.subscriptionUntil)).size).toBe(1);
    expect(await db.select().from(expenses).where(eq(expenses.tenantId, tenantId))).toHaveLength(1);
    expect(await db.select().from(subscriptionEvents).where(eq(subscriptionEvents.tenantId, tenantId))).toHaveLength(1);
    const token = (await createSession(ownerId)).token;
    const app = new Hono().route("/api/subscription", subscriptionRoutes);
    const response = await app.request(`/api/subscription/invoices/not-owned-invoice`, { headers: { Cookie: `cleanique_session=${token}` } });
    expect(response.status).toBe(404);
  });
});
