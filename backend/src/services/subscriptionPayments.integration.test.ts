import { beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { db, initPostgresTables } from "../db";
import { expenses, paymentAttempts, plans, subscriptionInvoices, tenants, users } from "../db/schema";
import { createSubscriptionInvoice, uploadPaymentProof } from "./subscriptionService";
import { applyGatewayEvent, checkoutInvoice, reconcileInvoice, verifyMidtransSignature } from "./subscriptionPayments";
import type { GatewayTransaction, PaymentGateway } from "./midtransClient";
import { GatewayRejectedError } from "./midtransClient";

class MockGateway implements PaymentGateway {
  creates = 0;
  event: GatewayTransaction | null = null;
  fail = false;
  async create(orderId: string, amount: number) {
    this.creates++;
    if (this.fail) throw new Error("simulated timeout after acceptance");
    return { token: `test-${orderId}`, redirect_url: "https://app.sandbox.midtrans.com/snap/test" };
  }
  async status(_orderId: string) { return this.event; }
}
const key = "test-signature-key";
const payload = { order_id: "test", transaction_id: "tx", transaction_status: "settlement", gross_amount: "150000.00", status_code: "200" };
test("Midtrans signatures reject forged, missing and modified amounts", () => {
  const signature_key = createHash("sha512").update(payload.order_id + payload.status_code + payload.gross_amount + key).digest("hex");
  expect(verifyMidtransSignature({ ...payload, signature_key }, key)).toBe(true);
  expect(verifyMidtransSignature({ ...payload, signature_key, gross_amount: "1.00" }, key)).toBe(false);
  expect(verifyMidtransSignature(payload, key)).toBe(false);
  expect(verifyMidtransSignature({ ...payload, signature_key }, "")).toBe(false);
});

describe.skipIf(process.env.PREMIUM_TEST_DATABASE !== "isolated")("subscription gateway with isolated PostgreSQL", () => {
  const ownerId = `gateway-${crypto.randomUUID()}`, branchId = `branch-${ownerId}`;
  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes("cleanique_test")) throw new Error("Dedicated test DB required");
    await initPostgresTables();
    await db.insert(users).values({ id: ownerId, name: "Gateway Owner", email: `${ownerId}@test.invalid`, passwordHash: "test", role: "tenant_owner", tier: "premium", subscriptionUntil: "2030-01-01" });
    await db.insert(tenants).values({ id: branchId, userId: ownerId, outletName: "Gateway Branch", address: "Test", phone: "08123456789", tier: "premium", subscriptionUntil: "2030-01-01" });
    await db.update(plans).set({ pricePerMonth: 200000, promotionAmount: 50000, promotionStartsAt: new Date(Date.now() - 60000).toISOString(), promotionEndsAt: new Date(Date.now() + 3600000).toISOString() }).where(eq(plans.id, "plan-premium"));
  });
  const invoice = async () => (await createSubscriptionInvoice({ tenantId: branchId, userId: ownerId, planId: "premium" })).invoice;
  test("concurrent checkout sends one provider request and blocks manual proof", async () => {
    const bill = await invoice(), gateway = new MockGateway();
    const results = await Promise.allSettled([checkoutInvoice(bill.id, ownerId, gateway), checkoutInvoice(bill.id, ownerId, gateway)]);
    expect(gateway.creates).toBe(1);
    expect(results.some(r => r.status === "fulfilled")).toBe(true);
    await expect(uploadPaymentProof(bill.id, "/uploads/proof.png", branchId)).rejects.toThrow();
    await expect(checkoutInvoice(bill.id, "foreign-owner", gateway)).rejects.toThrow();
  });
  test("uncertain network result cannot be retried as another charge", async () => {
    const bill = await invoice(), gateway = new MockGateway(); gateway.fail = true;
    await expect(checkoutInvoice(bill.id, ownerId, gateway)).rejects.toThrow();
    await expect(checkoutInvoice(bill.id, ownerId, gateway)).rejects.toThrow();
    expect(gateway.creates).toBe(1);
  });
  test("settlement is atomic, duplicate safe and cannot be undone by stale status", async () => {
    const bill = await invoice(), gateway = new MockGateway();
    const attempt = await checkoutInvoice(bill.id, ownerId, gateway);
    const event: GatewayTransaction = { ...payload, order_id: attempt.orderId, transaction_id: `tx-${attempt.id}`, gross_amount: String(bill.finalAmount) };
    await expect(applyGatewayEvent({ ...event, gross_amount: "1" })).rejects.toThrow();
    await applyGatewayEvent({ ...event, transaction_status: "capture", fraud_status: "challenge" });
    expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, bill.id)))[0].status).toBe("unpaid");
    const before = await db.select().from(expenses).where(eq(expenses.tenantId, branchId));
    await Promise.all([applyGatewayEvent(event), applyGatewayEvent(event)]);
    await applyGatewayEvent({ ...event, transaction_status: "pending" });
    expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, bill.id)))[0].status).toBe("paid");
    expect(await db.select().from(expenses).where(eq(expenses.tenantId, branchId))).toHaveLength(before.length + 1);
    await applyGatewayEvent({ ...event, transaction_status: "refund" });
    expect((await db.select().from(paymentAttempts).where(eq(paymentAttempts.id, attempt.id)))[0].resolution).toBe("refund_requires_review");
  });
  test("provider 404 before token expiry does not permit a second payment", async () => {
    const bill = await invoice(), gateway = new MockGateway();
    const attempt = await checkoutInvoice(bill.id, ownerId, gateway);
    const status = await reconcileInvoice(bill.id, ownerId, gateway);
    expect(status.attempts[0].status).toBe("pending");
    await db.update(paymentAttempts).set({ expiresAt: new Date(Date.now() - 600000).toISOString() }).where(eq(paymentAttempts.id, attempt.id));
    expect((await reconcileInvoice(bill.id, ownerId, gateway)).attempts[0].status).toBe("expired");
  });
  test("a definitive provider rejection permits a corrected retry", async () => {
    const bill = await invoice(), gateway = new MockGateway();
    const rejected: PaymentGateway = { create: async () => { throw new GatewayRejectedError("rejected"); }, status: async () => null };
    await expect(checkoutInvoice(bill.id, ownerId, rejected)).rejects.toThrow();
    expect((await checkoutInvoice(bill.id, ownerId, gateway)).status).toBe("pending");
  });
  test("two paid attempts create a review flag without extending subscription twice", async () => {
    const bill = await invoice(), gateway = new MockGateway();
    const first = await checkoutInvoice(bill.id, ownerId, gateway);
    await db.update(paymentAttempts).set({ expiresAt: new Date(Date.now() - 600000).toISOString() }).where(eq(paymentAttempts.id, first.id));
    await reconcileInvoice(bill.id, ownerId, gateway);
    const second = await checkoutInvoice(bill.id, ownerId, gateway);
    const event = (attempt: typeof first): GatewayTransaction => ({ ...payload, order_id: attempt.orderId, transaction_id: `tx-${attempt.id}`, gross_amount: String(bill.finalAmount) });
    const before = await db.select().from(expenses).where(eq(expenses.tenantId, branchId));
    await applyGatewayEvent(event(first));
    const paid = (await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, bill.id)))[0];
    await applyGatewayEvent(event(second));
    expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, bill.id)))[0].periodEnd).toBe(paid.periodEnd);
    expect(await db.select().from(expenses).where(eq(expenses.tenantId, branchId))).toHaveLength(before.length + 1);
    expect((await db.select().from(paymentAttempts).where(eq(paymentAttempts.id, second.id)))[0].resolution).toBe("duplicate_payment_requires_review");
  });
});
