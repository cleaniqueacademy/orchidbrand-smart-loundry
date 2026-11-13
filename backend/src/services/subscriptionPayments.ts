import { createHash, timingSafeEqual } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { paymentAttempts, paymentEvents, subscriptionInvoices } from "../db/schema";
import { activateSubscriptionInvoice } from "./subscriptionService";
import { invalidateTenantAuthCache } from "../middleware/auth";
import type { PaymentGateway } from "./midtransClient";
import { GatewayRejectedError } from "./midtransClient";

const providerEvent = z.object({
  order_id: z.string().min(1).max(50), transaction_id: z.string().min(1).max(100),
  transaction_status: z.string().min(1).max(40), gross_amount: z.string().regex(/^\d+(\.\d{1,2})?$/),
  status_code: z.string().regex(/^\d{3}$/), currency: z.literal("IDR").optional(),
  fraud_status: z.string().max(30).optional(),
});

export function verifyMidtransSignature(payload: unknown, key: string): boolean {
  const parsed = providerEvent.extend({ signature_key: z.string().regex(/^[a-fA-F0-9]{128}$/) }).safeParse(payload);
  if (!parsed.success || !key) return false;
  const value = parsed.data;
  const expected = createHash("sha512").update(value.order_id + value.status_code + value.gross_amount + key).digest();
  return timingSafeEqual(expected, Buffer.from(value.signature_key, "hex"));
}

export async function ownedInvoice(invoiceId: string, actorId: string, isAdmin = false) {
  const [invoice] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId));
  if (!invoice || (!isAdmin && invoice.userId !== actorId)) throw new Error("Invoice tidak ditemukan atau akses ditolak");
  return invoice;
}

/** Persist order_id before the network call; uncertain responses must never create another charge. */
export async function checkoutInvoice(invoiceId: string, actorId: string, gateway: PaymentGateway, isAdmin = false) {
  const attempt = await db.transaction(async tx => {
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
    if (!invoice || (!isAdmin && invoice.userId !== actorId)) throw new Error("Akses invoice ditolak");
    if (!["unpaid", "rejected"].includes(invoice.status)) throw new Error("Invoice tidak dapat dibayar melalui gateway pada status ini");
    if (!Number.isSafeInteger(invoice.finalAmount) || invoice.finalAmount <= 0) throw new Error("Invoice nol Rupiah memerlukan konfirmasi admin");
    const [existing] = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoice.id), inArray(paymentAttempts.status, ["creating", "pending"])));
    if (existing) return { ...existing, fresh: false };
    const [created] = await tx.insert(paymentAttempts).values({
      id: crypto.randomUUID(), invoiceId: invoice.id, orderId: `sub-${crypto.randomUUID()}`,
      amount: invoice.finalAmount, status: "creating", expiresAt: new Date(Date.now() + 86400000).toISOString(),
    }).returning();
    return { ...created, fresh: true };
  });
  if (!attempt.fresh) {
    if (attempt.redirectUrl) return attempt;
    throw new Error("Checkout sedang direkonsiliasi. Periksa status atau hubungi admin sebelum mencoba lagi.");
  }
  try {
    const checkout = await gateway.create(attempt.orderId, attempt.amount);
    const [updated] = await db.update(paymentAttempts).set({ status: "pending", redirectUrl: checkout.redirect_url })
      .where(and(eq(paymentAttempts.id, attempt.id), eq(paymentAttempts.status, "creating"))).returning();
    return updated || attempt; // A webhook may have settled while create was in flight.
  } catch (error) {
    if (error instanceof GatewayRejectedError) {
      await db.update(paymentAttempts).set({ status: "failed" }).where(and(eq(paymentAttempts.id, attempt.id), eq(paymentAttempts.status, "creating")));
      throw new Error("Midtrans menolak checkout. Hubungi admin untuk memeriksa konfigurasi pembayaran.");
    }
    console.warn("[payments] checkout result uncertain", { orderId: attempt.orderId, invoiceId });
    // Keep 'creating': a timeout may have occurred after Midtrans accepted the transaction.
    throw new Error("Hasil checkout belum pasti. Gunakan Periksa Status; jangan membuat pembayaran lain.");
  }
}

/** Caller authenticates signature or obtains this event from Midtrans's authenticated status endpoint. */
export async function applyGatewayEvent(raw: unknown) {
  const parsed = providerEvent.safeParse(raw);
  if (!parsed.success) throw new Error("Notifikasi transaksi tidak valid");
  const event = parsed.data;
  const [known] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.orderId, event.order_id));
  if (!known) throw new Error("Transaksi tidak dikenal");
  const amount = Number(event.gross_amount);
  if (!Number.isSafeInteger(amount) || amount !== known.amount || (event.currency || "IDR") !== known.currency) throw new Error("Nominal pembayaran tidak cocok");
  const successful = event.transaction_status === "settlement" || (event.transaction_status === "capture" && event.fraud_status === "accept");
  const failed = ["deny", "cancel", "expire", "failure"].includes(event.transaction_status);
  await db.transaction(async tx => {
    // Same lock ordering as manual activation: invoice, attempt, then Owner.
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, known.invoiceId)).for("update");
    const [attempt] = await tx.select().from(paymentAttempts).where(eq(paymentAttempts.id, known.id)).for("update");
    if (!invoice || !attempt || invoice.finalAmount !== amount) throw new Error("Snapshot invoice tidak cocok");
    const eventId = createHash("sha256").update(`${event.order_id}:${event.transaction_id}:${event.transaction_status}:${event.fraud_status || ""}`).digest("hex");
    await tx.insert(paymentEvents).values({ id: eventId, attemptId: attempt.id, providerStatus: event.transaction_status }).onConflictDoNothing();
    if (event.transaction_status === "refund" || event.transaction_status === "partial_refund") {
      await tx.update(paymentAttempts).set({ resolution: "refund_requires_review" }).where(eq(paymentAttempts.id, attempt.id));
      return;
    }
    if (attempt.status === "paid") return; // Ignore stale pending/cancel after settlement.
    if (successful) {
      await tx.update(paymentAttempts).set({ status: "paid", transactionId: event.transaction_id,
        resolution: invoice.status === "paid" ? "duplicate_payment_requires_review" : null,
      }).where(eq(paymentAttempts.id, attempt.id));
      if (invoice.status !== "paid") await activateSubscriptionInvoice(invoice.id, null, tx, "midtrans");
    } else if (failed) {
      await tx.update(paymentAttempts).set({ status: event.transaction_status === "expire" ? "expired" : "failed", transactionId: event.transaction_id }).where(eq(paymentAttempts.id, attempt.id));
    }
  });
  invalidateTenantAuthCache();
  console.info("[payments] transaction reconciled", { orderId: event.order_id, status: event.transaction_status });
}

export async function reconcileInvoice(invoiceId: string, actorId: string, gateway: PaymentGateway, isAdmin = false) {
  const invoice = await ownedInvoice(invoiceId, actorId, isAdmin);
  const [attempt] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.invoiceId, invoice.id)).orderBy(desc(paymentAttempts.createdAt)).limit(1);
  if (attempt) {
    const event = await gateway.status(attempt.orderId);
    if (event) {
      if (event.order_id !== attempt.orderId) throw new Error("Referensi status provider tidak cocok");
      await applyGatewayEvent(event);
    } else if (["pending", "creating"].includes(attempt.status) && Date.parse(attempt.expiresAt) + 300000 < Date.now()) {
      // Snap expiry is explicitly 24h; allow retry only after provider 404 and a clock-skew grace period.
      await db.update(paymentAttempts).set({ status: "expired" }).where(and(eq(paymentAttempts.id, attempt.id), inArray(paymentAttempts.status, ["creating", "pending"])));
    }
  }
  const updated = await ownedInvoice(invoiceId, actorId, isAdmin);
  const attempts = await db.select({ id: paymentAttempts.id, status: paymentAttempts.status, resolution: paymentAttempts.resolution, createdAt: paymentAttempts.createdAt })
    .from(paymentAttempts).where(eq(paymentAttempts.invoiceId, invoice.id)).orderBy(desc(paymentAttempts.createdAt));
  return { invoice: updated, attempts };
}
