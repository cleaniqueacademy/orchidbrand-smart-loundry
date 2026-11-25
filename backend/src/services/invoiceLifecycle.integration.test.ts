import { beforeAll, test, expect } from "bun:test";
import { eq } from "drizzle-orm";
import { db, client, initPostgresTables } from "../db";
import { users, tenants, plans, subscriptionInvoices, invoiceLifecycleEvents, manualPaymentReceipts, platformCashflow, storedFiles } from "../db/schema";
import { createSubscriptionInvoice, recordManualReceipt, reviewInvoiceActivation, retryInvoiceActivation, uploadPaymentProof, verifySubscriptionInvoice } from "./subscriptionService";
import { ActiveInvoiceError, cancelSubscriptionInvoice, expireOwnerInvoices } from "./invoiceLifecycle";
import { applyGatewayEvent, checkoutInvoice } from "./subscriptionPayments";
import { GatewayRejectedError } from "./midtransClient";
import { checkoutSubscriptionQris } from "./subscriptionQris";
import { recordPaymentAdjustment } from "./financialReview";
import { migrateInvoiceLifecycle } from "../db/invoiceLifecycleMigration";
import { Hono } from "hono";
import subscriptionRoutes from "../routes/subscription";
import { createSession } from "./sessions";

export async function lifecycleOwner() {
  const id = crypto.randomUUID(), branchId = crypto.randomUUID();
  await db.insert(users).values({ id, tenantId: branchId, name: "Invoice test", email: `${id}@test.invalid`, role: "tenant_owner", tier: "pro", passwordHash: "unused-fixture-hash", subscriptionUntil: "2030-01-01" });
  await db.insert(tenants).values({ id: branchId, userId: id, tier: "pro", outletName: "Invoice test", phone: "0800000000", address: "Test", subscriptionUntil: "2030-01-01" });
  return { id, branchId };
}
beforeAll(async () => {
  if (process.env.PREMIUM_TEST_DATABASE !== "isolated" || !new URL(process.env.DATABASE_URL!).pathname.endsWith("/cleanique_test")) throw new Error("Invoice lifecycle tests require isolated cleanique_test database");
  await initPostgresTables();
  await db.insert(plans).values({ id: "lifecycle-pro", code: "pro", name: "Pro", pricePerMonth: 60000, maxStaff: 0, maxBranches: 1 }).onConflictDoNothing();
});
async function admin() {
  const id = crypto.randomUUID();
  await db.insert(users).values({ id, name: "Invoice admin", email: `${id}@test.invalid`, role: "superadmin", passwordHash: "unused-fixture-hash" });
  return id;
}
async function bill(a: Awaited<ReturnType<typeof lifecycleOwner>>, months = 1) { return (await createSubscriptionInvoice({ tenantId: a.branchId, userId: a.id, durationMonths: months })).invoice; }
test("concurrent tabs with different request keys reuse exactly one Owner invoice", async () => {
  const a = await lifecycleOwner();
  const results = await Promise.all(Array.from({ length: 12 }, () => createSubscriptionInvoice({ tenantId: a.branchId, userId: a.id, idempotencyKey: crypto.randomUUID() })));
  expect(new Set(results.map(r => r.invoice.id)).size).toBe(1);
  expect(await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, a.id))).toHaveLength(1);
});
test("a different duration returns the existing invoice instead of creating another charge", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  try { await bill(a, 6); throw new Error("Expected conflict"); }
  catch (error) { expect(error).toBeInstanceOf(ActiveInvoiceError); expect((error as ActiveInvoiceError).invoice.id).toBe(first.id); }
  expect(await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, a.id))).toHaveLength(1);
});
test("database constraint rejects a second active invoice even when service is bypassed", async () => {
  const a = await lifecycleOwner(); await bill(a);
  await expect(Promise.resolve(db.insert(subscriptionInvoices).values({ id: crypto.randomUUID(), invoiceNo: crypto.randomUUID(), userId: a.id, tenantId: a.branchId, originalAmount: 60000, finalAmount: 60000, status: "unpaid" }))).rejects.toThrow();
});
test("expiry is persisted once, frees the Owner slot and rejects the old QR", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  await db.update(subscriptionInvoices).set({ expiresAt: new Date(Date.now() - 1000).toISOString() }).where(eq(subscriptionInvoices.id, first.id));
  await expireOwnerInvoices(a.id); await expireOwnerInvoices(a.id);
  const [expired] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(expired.status).toBe("expired");
  expect(expired.invalidationReason).toBe("invoice_expired");
  expect(await db.select().from(invoiceLifecycleEvents).where(eq(invoiceLifecycleEvents.id, `expired:${first.id}`))).toHaveLength(1);
  expect((await bill(a, 3)).id).not.toBe(first.id);
  await expect(checkoutSubscriptionQris(first.id, a.id, false)).rejects.toThrow();
});
test("proof submitted on time keeps one reviewable invoice even after deadline", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  await db.update(subscriptionInvoices).set({ status: "pending_verification", paymentProofUploadedAt: new Date(Date.now() - 2000).toISOString(), expiresAt: new Date(Date.now() - 1000).toISOString() }).where(eq(subscriptionInvoices.id, first.id));
  await expireOwnerInvoices(a.id);
  expect((await bill(a)).id).toBe(first.id);
  await expect(bill(a, 6)).rejects.toBeInstanceOf(ActiveInvoiceError);
});
test("cancellation preserves issued-QR evidence and permits a replacement without reviving the old QR", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  await db.update(subscriptionInvoices).set({ qrisIssuedAt: new Date().toISOString() }).where(eq(subscriptionInvoices.id, first.id));
  await expect(cancelSubscriptionInvoice(first.id, a.id, false, "Saya ingin mengubah durasi.", false)).rejects.toThrow();
  const cancelled = await cancelSubscriptionInvoice(first.id, a.id, false, "Saya ingin mengubah durasi.", true);
  expect(cancelled.status).toBe("cancelled");
  expect(cancelled.qrisIssuedAt).not.toBeNull();
  expect((await cancelSubscriptionInvoice(first.id, a.id, false, "Saya ingin mengubah durasi.", true)).id).toBe(first.id);
  expect((await bill(a, 6)).id).not.toBe(first.id);
  await expect(checkoutSubscriptionQris(first.id, a.id, false)).rejects.toThrow();
});
test("pending gateway blocks cancellation and a QR cannot switch around it", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  await checkoutInvoice(first.id, a.id, { create: async () => ({ token: "test", redirect_url: "https://app.sandbox.midtrans.com/test" }), status: async () => null });
  await expect(cancelSubscriptionInvoice(first.id, a.id, false, "Mengganti metode pembayaran.", true)).rejects.toThrow();
  await expect(checkoutSubscriptionQris(first.id, a.id, false)).rejects.toThrow();
});
test("late gateway money survives local cancellation and cannot auto-activate", async () => {
  const a = await lifecycleOwner(), first = await bill(a);
  await expect(checkoutInvoice(first.id, a.id, { create: async () => { throw new GatewayRejectedError("test rejection"); }, status: async () => null })).rejects.toThrow();
  const [{ order_id: orderId }] = await client`SELECT order_id FROM payment_attempts WHERE invoice_id=${first.id}`;
  await cancelSubscriptionInvoice(first.id, a.id, false, "Pembatalan setelah ditolak penyedia.", true);
  await applyGatewayEvent({ order_id: orderId, transaction_id: crypto.randomUUID(), transaction_status: "settlement", gross_amount: String(first.finalAmount), status_code: "200", currency: "IDR" });
  const [received] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(received.status).toBe("paid"); expect(received.activationStatus).toBe("pending_review");
  await expect(bill(a)).rejects.toBeInstanceOf(ActiveInvoiceError);
});
test("late manual receipt is idempotent, auditable, and activation requires review", async () => {
  const a = await lifecycleOwner(), first = await bill(a), adminId = await admin();
  await cancelSubscriptionInvoice(first.id, a.id, false, "Mengubah rencana langganan.", true);
  const input = { reference: `BANK:${crypto.randomUUID()}`, amount: first.finalAmount, receivedAt: new Date().toISOString(), notes: "Penerimaan diperiksa pada mutasi bank." };
  const one = await recordManualReceipt(first.id, adminId, input), two = await recordManualReceipt(first.id, adminId, input);
  expect(one.id).toBe(two.id);
  let [current] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(current.status).toBe("paid"); expect(current.activationStatus).toBe("pending_review");
  await reviewInvoiceActivation(first.id, adminId, { tier: "pro", notes: "Dana sesuai dan hak akses disetujui setelah pemeriksaan." });
  [current] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(current.activationStatus).toBe("active");
  const b = await lifecycleOwner(), other = await bill(b);
  await expect(recordManualReceipt(other.id, adminId, input)).rejects.toThrow();
});
test("wrong amount is retained as money requiring review; refund cap uses actual receipts", async () => {
  const a = await lifecycleOwner(), first = await bill(a), adminId = await admin();
  await recordManualReceipt(first.id, adminId, { reference: `BANK:${crypto.randomUUID()}`, amount: 5000, receivedAt: new Date().toISOString(), notes: "Nominal pada mutasi bank berbeda dari tagihan." });
  const [current] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(current.status).toBe("review_required");
  expect(await db.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.invoiceId, first.id))).toHaveLength(1);
  await expect(bill(a)).rejects.toBeInstanceOf(ActiveInvoiceError);
  await expect(cancelSubscriptionInvoice(first.id, adminId, true, "Membatalkan setelah pemeriksaan.", true)).rejects.toThrow();
  await expect(recordPaymentAdjustment(first.id, adminId, { requestKey: crypto.randomUUID(), type: "refund", amount: 6000, commissionAmount: 0, notes: "Refund diperiksa setelah transfer kembali." })).rejects.toThrow();
  await recordPaymentAdjustment(first.id, adminId, { requestKey: crypto.randomUUID(), type: "refund", amount: 5000, commissionAmount: 0, notes: "Refund 5000 sudah ditransfer kembali ke pengirim." });
  expect((await cancelSubscriptionInvoice(first.id, adminId, true, "Dana sudah dikembalikan dan tagihan ditutup.", true)).status).toBe("cancelled");
});
test("duplicate manual money is recorded without a second entitlement", async () => {
  const a = await lifecycleOwner(), first = await bill(a), adminId = await admin();
  const input = { reference: `BANK:${crypto.randomUUID()}`, amount: first.finalAmount, receivedAt: new Date().toISOString(), notes: "Dana masuk diverifikasi pada mutasi resmi." };
  await recordManualReceipt(first.id, adminId, input);
  await recordManualReceipt(first.id, adminId, { ...input, reference: `BANK:${crypto.randomUUID()}` });
  expect(await db.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.invoiceId, first.id))).toHaveLength(2);
  const [current] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, first.id));
  expect(current.activationStatus).toBe("pending_review");
  const cash = await db.select().from(platformCashflow).where(eq(platformCashflow.tenantId, a.branchId));
  expect(cash.reduce((sum, row) => sum + row.amount, 0)).toBe(first.finalAmount * 2);
});
test("one proof file cannot be reused for another invoice", async () => {
  const a = await lifecycleOwner(), first = await bill(a), adminId = await admin();
  const proof = `/uploads/payments/2026-11/${crypto.randomUUID()}.png`;
  await db.insert(storedFiles).values({ path: proof, ownerId: a.id, category: "payments" });
  await uploadPaymentProof(first.id, proof, a.branchId, a.id);
  await verifySubscriptionInvoice(first.id, adminId);
  const next = await bill(a);
  await expect(uploadPaymentProof(next.id, proof, a.branchId, a.id)).rejects.toThrow("sudah digunakan");
});
test("legacy duplicate migration preserves history and routes ambiguity to review", async () => {
  const a = await lifecycleOwner();
  await client`DROP INDEX one_active_subscription_invoice_per_owner`;
  const rows = [crypto.randomUUID(), crypto.randomUUID()];
  for (const id of rows) await db.insert(subscriptionInvoices).values({ id, invoiceNo: id, userId: a.id, tenantId: a.branchId, originalAmount: 60000, finalAmount: 60000, expiresAt: new Date(Date.now() + 3600000).toISOString() });
  await client`DELETE FROM schema_migrations WHERE name='20261114_invoice_lifecycle'`;
  await migrateInvoiceLifecycle(client); await migrateInvoiceLifecycle(client);
  const history = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, a.id));
  expect(history).toHaveLength(2); expect(history.every(row => row.status === "review_required")).toBe(true);
  expect(history.reduce((sum, row) => sum + row.finalAmount, 0)).toBe(120000);
  await expect(bill(a)).rejects.toBeInstanceOf(ActiveInvoiceError);
});
test("a reused request key cannot create a replacement after its invoice was cancelled", async () => {
  const a = await lifecycleOwner();
  const first = await createSubscriptionInvoice({ tenantId: a.branchId, userId: a.id, idempotencyKey: crypto.randomUUID() });
  const alias = crypto.randomUUID();
  const reused = await createSubscriptionInvoice({ tenantId: a.branchId, userId: a.id, idempotencyKey: alias });
  expect(reused.invoice.id).toBe(first.invoice.id);
  await cancelSubscriptionInvoice(first.invoice.id, a.id, false, "Membatalkan sebelum mengganti tagihan.", true);
  const retry = await createSubscriptionInvoice({ tenantId: a.branchId, userId: a.id, idempotencyKey: alias });
  expect(retry.invoice.id).toBe(first.invoice.id); expect(retry.invoice.status).toBe("cancelled");
  expect(await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, a.id))).toHaveLength(1);
});
test("full refund before activation closes entitlement and permits a fresh invoice", async () => {
  const a = await lifecycleOwner(), first = await bill(a), adminId = await admin();
  await recordManualReceipt(first.id, adminId, { reference: `BANK:${crypto.randomUUID()}`, amount: first.finalAmount, receivedAt: new Date().toISOString(), notes: "Penerimaan diverifikasi pada mutasi bank." });
  await recordPaymentAdjustment(first.id, adminId, { requestKey: crypto.randomUUID(), type: "refund", amount: first.finalAmount, commissionAmount: 0, notes: "Seluruh dana sudah ditransfer kembali sebelum aktivasi." });
  const result = await retryInvoiceActivation(first.id);
  expect(result.invoice.activationStatus).toBe("refunded");
  expect((await bill(a)).id).not.toBe(first.id);
});
test("HTTP invoice conflict, lifecycle privacy and receipt permissions remain enforced", async () => {
  const app = new Hono().route("/api/subscription", subscriptionRoutes);
  const a = await lifecycleOwner(), adminId = await admin();
  const session = await createSession(a.id), adminSession = await createSession(adminId);
  const headers = { Cookie: `cleanique_session=${session.token}`, "X-CSRF-Token": session.csrfToken, Origin: "http://localhost:5000", "Content-Type": "application/json" };
  const first = await bill(a);
  const conflict = await app.request("/api/subscription/invoices", { method: "POST", headers, body: JSON.stringify({ durationMonths: 6, idempotencyKey: crypto.randomUUID() }) });
  expect(conflict.status).toBe(409);
  const body = await conflict.json(); expect(body.code).toBe("ACTIVE_INVOICE"); expect(body.data.invoice.id).toBe(first.id);
  const history = await app.request(`/api/subscription/invoices/${first.id}/events`, { headers });
  const events = await history.json(); expect(events.data.length).toBeGreaterThan(0); expect("actorId" in events.data[0]).toBe(false); expect("details" in events.data[0]).toBe(false);
  const csrf = await app.request(`/api/subscription/invoices/${first.id}/cancel`, { method: "POST", headers: { Cookie: headers.Cookie, "Content-Type": "application/json" }, body: JSON.stringify({ reason: "Pemilik ingin membatalkan tagihan." }) });
  expect(csrf.status).toBe(403);
  const input = { reference: `BANK:${crypto.randomUUID()}`, amount: first.finalAmount, receivedAt: new Date().toISOString(), notes: "Mutasi diperiksa dan penerimaan disetujui admin." };
  expect((await app.request(`/api/subscription/invoices/${first.id}/received`, { method: "POST", headers, body: JSON.stringify(input) })).status).toBe(403);
  const received = await app.request(`/api/subscription/invoices/${first.id}/received`, { method: "POST", headers: { ...headers, Cookie: `cleanique_session=${adminSession.token}`, "X-CSRF-Token": adminSession.csrfToken }, body: JSON.stringify(input) });
  expect(received.status).toBe(200);
});
