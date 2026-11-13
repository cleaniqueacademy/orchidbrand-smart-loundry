import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { marketingProfiles, marketingCommissions, marketingWithdrawals, paymentAdjustments, subscriptionInvoices, paymentAttempts, platformCashflow } from "../db/schema";
import { today } from "../utils/date";
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function commissionAdjustments(profileId: string, tx: Tx | typeof db = db) {
  const rows = await tx.select({ amount: paymentAdjustments.commissionAmount }).from(paymentAdjustments).innerJoin(subscriptionInvoices, eq(subscriptionInvoices.id, paymentAdjustments.invoiceId)).where(eq(subscriptionInvoices.commissionProfileId, profileId));
  return rows.reduce((sum, row) => sum + row.amount, 0);
}
async function balance(tx: Tx, profile: typeof marketingProfiles.$inferSelect) {
  const commissions = await tx.select().from(marketingCommissions).where(eq(marketingCommissions.marketingProfileId, profile.id));
  const withdrawals = await tx.select().from(marketingWithdrawals).where(eq(marketingWithdrawals.marketingProfileId, profile.id));
  const earned = Math.max(profile.totalEarned, commissions.filter(c => ["approved","paid"].includes(c.status)).reduce((s,c) => s+c.commissionAmount,0)) - await commissionAdjustments(profile.id, tx);
  const paid = Math.max(profile.totalWithdrawn, withdrawals.filter(w => w.status === "paid").reduce((s,w)=>s+w.amount,0));
  const pending = withdrawals.filter(w => w.status === "pending").reduce((s,w)=>s+w.amount,0);
  return { earned, paid, pending, available: earned-paid-pending };
}
export async function requestWithdrawal(userId: string, input: { amount: number; bankName?: string; bankAccountNumber?: string; bankAccountName?: string; notes?: string }) {
  if (!Number.isSafeInteger(input.amount) || input.amount <= 0) throw new Error("Nominal Rupiah tidak valid");
  return db.transaction(async tx => {
    const [profile] = await tx.select().from(marketingProfiles).where(eq(marketingProfiles.userId, userId)).for("update");
    if (!profile || input.amount > (await balance(tx, profile)).available) throw new Error("Saldo tersedia tidak mencukupi");
    const bankName = input.bankName || profile.bankName, bankAccountNumber = input.bankAccountNumber || profile.bankAccountNumber, bankAccountName = input.bankAccountName || profile.bankAccountName;
    if (![bankName, bankAccountNumber, bankAccountName].every(v => typeof v === "string" && v.trim().length > 0 && v.length <= 150)) throw new Error("Tujuan pencairan wajib lengkap");
    const [record] = await tx.insert(marketingWithdrawals).values({ id: crypto.randomUUID(), marketingProfileId: profile.id, amount: input.amount, bankName, bankAccountNumber, bankAccountName, notes: input.notes?.slice(0,1000), status: "pending" }).returning();
    return record;
  });
}
export async function processWithdrawal(id: string, actorId: string, status: "paid" | "rejected", notes?: string, proofUrl?: string) {
  return db.transaction(async tx => {
    const [known] = await tx.select().from(marketingWithdrawals).where(eq(marketingWithdrawals.id, id));
    if (!known) throw new Error("Penarikan tidak ditemukan");
    const [profile] = await tx.select().from(marketingProfiles).where(eq(marketingProfiles.id, known.marketingProfileId)).for("update");
    const [withdrawal] = await tx.select().from(marketingWithdrawals).where(eq(marketingWithdrawals.id, id)).for("update");
    if (withdrawal.status === status) return withdrawal;
    if (withdrawal.status !== "pending") throw new Error("Penarikan telah diproses");
    if (status === "paid") {
      const funds = await balance(tx, profile);
      if (funds.earned - funds.paid < funds.pending) throw new Error("Penyesuaian komisi memerlukan review penarikan pending");
      await tx.update(marketingProfiles).set({ totalWithdrawn: sql`${marketingProfiles.totalWithdrawn}+${withdrawal.amount}` }).where(eq(marketingProfiles.id, profile.id));
      await tx.insert(platformCashflow).values({ id: `withdrawal:${id}`, type: "expense", category: "marketing_commission", amount: withdrawal.amount, date: today(), description: `Pencairan komisi ${id}`, proofUrl: proofUrl || null, createdByUserId: actorId }).onConflictDoNothing();
    }
    const [record] = await tx.update(marketingWithdrawals).set({ status, notes: notes?.slice(0,1000) ?? withdrawal.notes, proofUrl: proofUrl ?? withdrawal.proofUrl, processedByUserId: actorId, processedAt: new Date().toISOString() }).where(eq(marketingWithdrawals.id,id)).returning();
    return record;
  });
}
/** Journal a refund already executed by an operator; this endpoint never transfers money. */
export async function recordPaymentAdjustment(invoiceId: string, actorId: string, input: { requestKey: string; amount: number; commissionAmount: number; notes: string; type: string }) {
  if (!/^[a-zA-Z0-9-]{16,80}$/.test(input.requestKey) || !["refund","duplicate_refund"].includes(input.type) || !Number.isSafeInteger(input.amount) || input.amount<=0 || !Number.isSafeInteger(input.commissionAmount) || input.commissionAmount<0 || typeof input.notes !== "string" || input.notes.trim().length<10 || input.notes.length>2000) throw new Error("Penyesuaian tidak valid; isi referensi refund dan alasan lengkap");
  return db.transaction(async tx => {
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,invoiceId)).for("update");
    if (!invoice || invoice.status !== "paid") throw new Error("Invoice belum lunas");
    const [existing] = await tx.select().from(paymentAdjustments).where(eq(paymentAdjustments.requestKey,input.requestKey));
    if (existing) {
      if (existing.invoiceId !== invoiceId || existing.amount !== input.amount || existing.commissionAmount !== input.commissionAmount || existing.type !== input.type) throw new Error("Idempotency key berbeda parameter");
      return existing;
    }
    if (invoice.commissionProfileId) await tx.select().from(marketingProfiles).where(eq(marketingProfiles.id, invoice.commissionProfileId)).for("update");
    const adjustments = await tx.select().from(paymentAdjustments).where(eq(paymentAdjustments.invoiceId,invoiceId));
    const paid = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId,invoiceId),eq(paymentAttempts.status,"paid")));
    const receipts = invoice.paymentSource === "manual" ? invoice.finalAmount + paid.reduce((s,p)=>s+p.amount,0) : Math.max(invoice.finalAmount, paid.reduce((s,p)=>s+p.amount,0));
    if (adjustments.reduce((s,a)=>s+a.amount,0)+input.amount>receipts) throw new Error("Refund melebihi penerimaan tercatat");
    const commissions = await tx.select().from(marketingCommissions).where(eq(marketingCommissions.subscriptionInvoiceId,invoiceId));
    if (adjustments.reduce((s,a)=>s+a.commissionAmount,0)+input.commissionAmount > commissions.reduce((s,c)=>s+c.commissionAmount,0)) throw new Error("Koreksi komisi melebihi komisi invoice");
    const id=crypto.randomUUID();
    const [record]=await tx.insert(paymentAdjustments).values({ id, invoiceId, requestKey: input.requestKey, amount:input.amount, commissionAmount:input.commissionAmount, type:input.type, notes:input.notes.trim(), createdBy:actorId }).returning();
    await tx.insert(platformCashflow).values({id:`adjustment:${id}`,type:"expense",category:"subscription_refund",amount:input.amount,date:today(),tenantId:invoice.tenantId,description:`Refund ${invoice.invoiceNo}`,notes:input.notes,createdByUserId:actorId});
    return record;
  });
}
