import { beforeAll, beforeEach, test, expect } from "bun:test";
import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { db, initPostgresTables } from "../db";
import { users, tenants, subscriptionInvoices, platformSettings, paymentAttempts } from "../db/schema";
import subscriptionRoutes from "../routes/subscription";
import { createSession } from "./sessions";
import { loadPlatformQris } from "./subscriptionQris";

const app = new Hono().route("/api/subscription", subscriptionRoutes);
const tag = crypto.randomUUID();
let actor: { owner: string; branch: string; cookie: string };
let other: { owner: string; branch: string; cookie: string };
async function owner() {
  const id = crypto.randomUUID(), branch = crypto.randomUUID();
  await db.insert(users).values({ id, name: "QRIS test", email: `${id}@test.invalid`, passwordHash: "unused-test-hash", role: "tenant_owner", tenantId: branch, subscriptionUntil: "2020-01-01" });
  await db.insert(tenants).values({ id: branch, userId: id, outletName: "QRIS test", phone: "0800000000", address: "Test", subscriptionUntil: "2020-01-01" });
  return { owner: id, branch, cookie: `cleanique_session=${(await createSession(id)).token}` };
}
async function bill(update: Partial<typeof subscriptionInvoices.$inferInsert> = {}) {
  const id = crypto.randomUUID();
  const [row] = await db.insert(subscriptionInvoices).values({ id, invoiceNo: `QRS-${tag}-${id}`, tenantId: actor.branch, userId: actor.owner, originalAmount: 60000, finalAmount: 60000, expiresAt: new Date(Date.now() + 3600000).toISOString(), ...update }).returning();
  return row;
}
beforeAll(async () => {
  if (process.env.PREMIUM_TEST_DATABASE !== "isolated" || !new URL(process.env.DATABASE_URL!).pathname.endsWith("/cleanique_test")) throw new Error("QRIS integration requires isolated cleanique_test database");
  await initPostgresTables();
  actor = await owner(); other = await owner();
  const [settings] = await db.select().from(platformSettings).limit(1);
  if (settings) await db.update(platformSettings).set({ qrisInfo: "/qris.png" }).where(eq(platformSettings.id, settings.id));
  else await db.insert(platformSettings).values({ id: `qris-${tag}`, qrisInfo: "/qris.png" });
});
beforeEach(async () => { actor = await owner(); });
test("anonymous and another Owner cannot generate QR for this invoice", async () => {
  const row = await bill();
  expect((await app.request(`/api/subscription/invoices/${row.id}/qris`)).status).toBe(401);
  expect((await app.request(`/api/subscription/invoices/${row.id}/qris`, { headers: { Cookie: other.cookie } })).status).toBe(404);
});
test("expired Owner can generate nominal QR but invoice remains unpaid", async () => {
  const row = await bill();
  const response = await app.request(`/api/subscription/invoices/${row.id}/qris?amount=1`, { headers: { Cookie: actor.cookie } });
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toContain("no-store");
  const body = await response.json();
  expect(body.data.invoiceId).toBe(row.id);
  expect(body.data.amount).toBe(60000);
  expect(body.data.confirmation).toBe("admin_verification");
  expect(body.data.qrImage.startsWith("data:image/png;base64,")).toBe(true);
  const [current] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, row.id));
  expect(current.status).toBe("unpaid");
  expect(current.activationStatus).toBe("not_requested");
  expect(await db.select().from(paymentAttempts).where(eq(paymentAttempts.invoiceId, row.id))).toHaveLength(0);
});
test("paid and expired invoices cannot produce a new QR", async () => {
  for (const row of [await bill({ status: "paid" }), await bill({ expiresAt: "2020-01-01" })]) {
    expect((await app.request(`/api/subscription/invoices/${row.id}/qris`, { headers: { Cookie: actor.cookie } })).status).toBe(409);
  }
});
test("unresolved gateway checkout blocks local QR generation", async () => {
  const row = await bill();
  await db.insert(paymentAttempts).values({ id: crypto.randomUUID(), invoiceId: row.id, orderId: crypto.randomUUID(), amount: row.finalAmount, status: "creating", expiresAt: row.expiresAt! });
  expect((await app.request(`/api/subscription/invoices/${row.id}/qris`, { headers: { Cookie: actor.cookie } })).status).toBe(409);
});
test("staff are denied the QR endpoint", async () => {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, name: "Test staff", email: `${id}@test.invalid`, passwordHash: "unused-test-hash", role: "staff", tenantId: actor.branch });
  const cookie = `cleanique_session=${(await createSession(id)).token}`;
  const row = await bill();
  expect((await app.request(`/api/subscription/invoices/${row.id}/qris`, { headers: { Cookie: cookie } })).status).toBe(403);
});
test("remote URLs, traversal and empty sources are rejected instead of fetched", async () => {
  for (const source of [null, "http://127.0.0.1:5000/api/users", "https://example.invalid/qris.png", "/uploads/qris/../../.env", "/qris.png/../.env"]) await expect(loadPlatformQris(source)).rejects.toThrow();
});
test("QR rendering requests are throttled per authenticated Owner", async () => {
  const fresh = await owner();
  const row = await bill({ userId: fresh.owner, tenantId: fresh.branch, status: "paid" });
  let response: Response | undefined;
  for (let count = 0; count < 21; count++) response = await app.request(`/api/subscription/invoices/${row.id}/qris`, { headers: { Cookie: fresh.cookie } });
  expect(response!.status).toBe(429);
  expect(response!.headers.get("Retry-After")).not.toBeNull();
});
