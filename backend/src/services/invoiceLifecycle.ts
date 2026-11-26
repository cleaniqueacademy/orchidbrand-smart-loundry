import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { invoiceLifecycleEvents, invoiceRequestKeys, manualPaymentReceipts, paymentAdjustments, paymentAttempts, subscriptionInvoices } from "../db/schema";

export type BillingTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export const activeInvoiceStatuses = ["unpaid", "rejected", "pending_verification"];
export type InvoiceRow = typeof subscriptionInvoices.$inferSelect;
export class ActiveInvoiceError extends Error {
  constructor(public readonly invoice: InvoiceRow) { super("Masih ada tagihan yang belum selesai. Lanjutkan tagihan tersebut sebelum membuat yang baru."); }
}
export async function lockBillingOwner(tx: BillingTransaction, ownerId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${'billing-owner:' + ownerId},0))`);
}
export async function bindInvoiceRequest(tx: BillingTransaction, requestKey: string | undefined, invoiceId: string, fingerprint: string) {
  if (!requestKey) return;
  await tx.insert(invoiceRequestKeys).values({ requestKey, invoiceId, fingerprint }).onConflictDoNothing();
  const [binding] = await tx.select().from(invoiceRequestKeys).where(eq(invoiceRequestKeys.requestKey, requestKey));
  if (binding.invoiceId !== invoiceId || binding.fingerprint !== fingerprint) throw new Error("Idempotency key digunakan dengan parameter berbeda.");
}
export async function invoiceEvent(tx: BillingTransaction, invoiceId: string, eventType: string, actorId: string | null, details: Record<string, unknown> = {}, eventId: string = crypto.randomUUID()) {
  await tx.insert(invoiceLifecycleEvents).values({ id: eventId, invoiceId, eventType, actorId, details: JSON.stringify(details) }).onConflictDoNothing();
}
export async function invoiceFunds(tx: BillingTransaction, invoice: InvoiceRow) {
  const attempts = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoice.id), eq(paymentAttempts.status, "paid")));
  const extras = await tx.select().from(manualPaymentReceipts).where(and(eq(manualPaymentReceipts.invoiceId, invoice.id), eq(manualPaymentReceipts.appliedToInvoice, false)));
  const refunds = await tx.select().from(paymentAdjustments).where(eq(paymentAdjustments.invoiceId, invoice.id));
  const gateway = attempts.reduce((sum, attempt) => sum + attempt.amount, 0);
  const base = invoice.status === "paid" ? (invoice.paymentSource === "manual" ? invoice.finalAmount + gateway : Math.max(invoice.finalAmount, gateway)) : gateway;
  const received = base + extras.reduce((sum, receipt) => sum + receipt.amount, 0);
  const refunded = refunds.reduce((sum, refund) => sum + refund.amount, 0);
  return { received, refunded, net: received - refunded, latestRefund: refunds.reduce((latest, refund) => Math.max(latest, new Date(refund.createdAt).getTime()), 0) };
}

/** Call under Owner advisory lock, before locking the Owner row. Proof submitted on time stays reviewable. */
export async function expireOwnerInvoicesTx(tx: BillingTransaction, ownerId: string, now = Date.now()) {
  const rows = await tx.select().from(subscriptionInvoices).where(and(eq(subscriptionInvoices.userId, ownerId), inArray(subscriptionInvoices.status, ["unpaid", "rejected"]))).for("update");
  for (const invoice of rows) {
    const deadline = invoice.expiresAt ? Date.parse(invoice.expiresAt) : NaN;
    if (deadline > now) continue;
    const status = Number.isFinite(deadline) ? "expired" : "review_required";
    const reason = Number.isFinite(deadline) ? "invoice_expired" : "legacy_expiry_missing";
    await tx.update(subscriptionInvoices).set({ status, invalidatedAt: new Date(now).toISOString(), invalidationReason: reason }).where(eq(subscriptionInvoices.id, invoice.id));
    await invoiceEvent(tx, invoice.id, status, null, { reason }, `${status}:${invoice.id}`);
  }
}
export async function expireOwnerInvoices(ownerId: string) {
  await db.transaction(async tx => { await lockBillingOwner(tx, ownerId); await expireOwnerInvoicesTx(tx, ownerId); });
}
export async function blockingOwnerInvoice(tx: BillingTransaction, ownerId: string): Promise<InvoiceRow | null> {
  const rows = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, ownerId)).orderBy(asc(subscriptionInvoices.createdAt), asc(subscriptionInvoices.id));
  const unresolved = await tx.select({ invoiceId: paymentAttempts.invoiceId }).from(paymentAttempts)
    .innerJoin(subscriptionInvoices, eq(paymentAttempts.invoiceId, subscriptionInvoices.id))
    .where(and(eq(subscriptionInvoices.userId, ownerId), inArray(paymentAttempts.status, ["creating", "pending"])));
  const pendingIds = new Set(unresolved.map(a => a.invoiceId));
  return rows.find(i => i.status === "review_required" || (i.status === "paid" && !["active", "refunded"].includes(i.activationStatus))) ||
    rows.find(i => activeInvoiceStatuses.includes(i.status) || pendingIds.has(i.id)) || null;
}
export async function expireSubscriptionInvoices() {
  // New invoice deadlines are canonical UTC ISO strings. Request paths additionally check Date.parse.
  const rows = await db.selectDistinct({ ownerId: subscriptionInvoices.userId }).from(subscriptionInvoices)
    .where(and(inArray(subscriptionInvoices.status, ["unpaid", "rejected"]), sql`(${subscriptionInvoices.expiresAt} IS NULL OR ${subscriptionInvoices.expiresAt} <= ${new Date().toISOString()})`)).limit(200);
  for (const row of rows) await expireOwnerInvoices(row.ownerId);
}

export async function cancelSubscriptionInvoice(invoiceId: string, actorId: string, isAdmin: boolean, reason: string, acknowledgeSavedQris: boolean) {
  if (reason.trim().length < 10 || reason.length > 1000) throw new Error("Isi alasan pembatalan minimal 10 karakter.");
  const [known] = await db.select().from(subscriptionInvoices).where(and(eq(subscriptionInvoices.id, invoiceId), isAdmin ? undefined : eq(subscriptionInvoices.userId, actorId)));
  if (!known) throw new Error("Invoice tidak ditemukan atau akses ditolak.");
  return db.transaction(async tx => {
    await lockBillingOwner(tx, known.userId);
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
    if (invoice.status === "cancelled") return invoice;
    if (!(["unpaid", "rejected", "pending_verification"].includes(invoice.status) || (isAdmin && ["review_required", "expired"].includes(invoice.status)))) throw new Error("Invoice ini tidak dapat dibatalkan.");
    const [attempt] = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoice.id), inArray(paymentAttempts.status, ["creating", "pending", "paid"])));
    if (attempt) throw new Error("Pembayaran gateway belum selesai atau sudah diterima. Rekonsiliasi dahulu; pembatalan lokal tidak membatalkan transaksi penyedia.");
    const receipts = await tx.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.invoiceId, invoice.id));
    const refunds = await tx.select().from(paymentAdjustments).where(eq(paymentAdjustments.invoiceId, invoice.id));
    if (receipts.reduce((sum, receipt) => sum + receipt.amount, 0) > refunds.reduce((sum, refund) => sum + refund.amount, 0)) throw new Error("Ada dana yang sudah diterima. Selesaikan review atau catat refund yang sudah dilakukan sebelum membatalkan.");
    if (invoice.qrisIssuedAt && !acknowledgeSavedQris) throw new Error("Konfirmasi bahwa QRIS yang sudah disimpan mungkin masih dapat dibayar di bank.");
    const [updated] = await tx.update(subscriptionInvoices).set({ status: "cancelled", invalidatedAt: new Date().toISOString(), invalidationReason: isAdmin ? "cancelled_by_admin" : "cancelled_by_user" }).where(eq(subscriptionInvoices.id, invoice.id)).returning();
    await invoiceEvent(tx, invoice.id, "cancelled", actorId, { reason: reason.trim(), savedQrisMayRemainPayable: !!invoice.qrisIssuedAt, hadUploadedProof: !!(invoice.paymentProofUrl || invoice.paymentProofUploadedAt) }, `cancelled:${invoice.id}`);
    return updated;
  });
}

/** Admin reopens a review_required invoice (e.g. legacy_expiry_missing) with a fresh 24h deadline if no other active invoice exists. */
export async function reopenReviewInvoice(invoiceId: string, adminId: string) {
  const [known] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId));
  if (!known) throw new Error("Invoice tidak ditemukan.");
  return db.transaction(async tx => {
    await lockBillingOwner(tx, known.userId);
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
    if (!invoice || invoice.status !== "review_required") throw new Error("Hanya tagihan berstatus Perlu Review yang dapat dibuka kembali.");
    const ownerInvoices = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.userId, invoice.userId));
    const hasAnotherActive = ownerInvoices.some(row => row.id !== invoice.id && (activeInvoiceStatuses.includes(row.status) || (row.status === "paid" && !["active", "refunded"].includes(row.activationStatus))));
    if (hasAnotherActive) throw new Error("Owner masih memiliki tagihan aktif lain. Selesaikan atau batalkan tagihan aktif tersebut terlebih dahulu.");
    const receipts = await tx.select().from(manualPaymentReceipts).where(eq(manualPaymentReceipts.invoiceId, invoice.id));
    if (receipts.length > 0) throw new Error("Tagihan sudah memiliki catatan mutasi dana. Selesaikan melalui review aktivasi.");
    const nextStatus = invoice.paymentProofUrl ? "pending_verification" : "unpaid";
    const expiresAt = new Date(Date.now() + 86400000).toISOString();
    const [updated] = await tx.update(subscriptionInvoices).set({
      status: nextStatus,
      expiresAt,
      invalidatedAt: null,
      invalidationReason: null,
    }).where(eq(subscriptionInvoices.id, invoice.id)).returning();
    await invoiceEvent(tx, invoice.id, "reopened_by_admin", adminId, { nextStatus, expiresAt });
    return updated;
  });
}
