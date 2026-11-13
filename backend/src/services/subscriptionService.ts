import { db } from "../db/index";
import {
  tenants,
  users,
  plans,
  platformSettings,
  subscriptionInvoices,
  subscriptionEvents,
  referralCodes,
  expenses,
  platformCashflow,
  paymentAttempts,
  storedFiles,
  referralAssignments,
  marketingProfiles,
} from "../db/schema";
import { eq, desc, and, sql, isNull, inArray } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays, daysRemaining, today, toDateOnly } from "../utils/date";
import { invalidateTenantAuthCache } from "../middleware/auth";
import { calculateSubscriptionPrice } from "./subscriptionPricing";
import { DEFAULT_MONTHLY_PRICE } from "../constants/services";
import { setOwnerReferralTx } from "./ownerReferral";
import { validateCode, recordCommission } from "./referralService";

export interface SubscriptionSummary {
  tier: string;
  tenantId: string;
  outletName: string;
  isTrial: boolean;
  isActive: boolean;
  subscriptionUntil: string | null;
  daysRemaining: number;
  status: string;
  referralCodeUsed?: string | null;
  pendingInvoice?: typeof subscriptionInvoices.$inferSelect | null;
  platformBank?: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    qrisInfo: string | null;
    ewalletName?: string | null;
    ewalletNumber?: string | null;
    ewalletAccountName?: string | null;
  };
}

/**
 * Ringkasan masa aktif langganan suatu outlet
 */
export async function getSubscriptionSummary(tenantId: string): Promise<SubscriptionSummary | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return null;

  const [owner] = await db.select().from(users).where(eq(users.id, tenant.userId));
  const subUntil = owner?.subscriptionUntil || tenant.subscriptionUntil || null;
  const remaining = subUntil ? daysRemaining(subUntil) : -999;
  const isActive = remaining >= 0 && tenant.status === "active" && !tenant.archivedAt && !tenant.suspendedAt && owner?.status === "active" && !owner.archivedAt && !owner.suspendedAt;

  // Ambil invoice yang masih menunggu verifikasi atau belum dibayar
  const invoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.userId, tenant.userId))
    .orderBy(desc(subscriptionInvoices.createdAt));

  const pendingInvoice =
    invoices.find((inv) => inv.status === "pending_verification" || inv.status === "unpaid") || null;

  // Ambil informasi rekening platform
  const [settings] = await db.select().from(platformSettings).limit(1);

  let referralCodeStr: string | null = null;
  if (tenant.referralCodeId) {
    const [refCode] = await db
      .select()
      .from(referralCodes)
      .where(eq(referralCodes.id, tenant.referralCodeId));
    if (refCode) {
      referralCodeStr = refCode.code;
    }
  }

  return {
    tier: owner?.tier || tenant.tier,
    tenantId: tenant.id,
    outletName: tenant.outletName,
    isTrial: tenant.isTrial === "true",
    isActive,
    subscriptionUntil: subUntil,
    daysRemaining: remaining,
    status: tenant.status,
    referralCodeUsed: referralCodeStr,
    pendingInvoice: pendingInvoice ? presentInvoice(pendingInvoice) : null,
    platformBank: settings ? {
      bankName: settings.bankName, bankAccountNumber: settings.bankAccountNumber, bankAccountName: settings.bankAccountName,
      qrisInfo: settings.qrisInfo, ewalletName: settings.ewalletName, ewalletNumber: settings.ewalletNumber, ewalletAccountName: settings.ewalletAccountName,
    } : undefined,
  };
}

/**
 * Hitung harga langganan yang berlaku untuk tenant, termasuk diskon referral jika ada
 */
export async function getApplicablePrice(tenantId?: string | null, planIdOrCode?: string, customCode?: string, executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db) {
  // Referral eligibility is account-wide; use the Owner's primary branch consistently.
  if (tenantId) {
    const [selected] = await executor.select().from(tenants).where(eq(tenants.id, tenantId));
    if (selected) {
      const [owner] = await executor.select().from(users).where(eq(users.id, selected.userId));
      const branches = await executor.select().from(tenants).where(eq(tenants.userId, selected.userId)).orderBy(tenants.createdAt, tenants.id);
      tenantId = branches.find(branch => branch.id === owner?.tenantId)?.id || branches[0]?.id || tenantId;
    }
  }
  if (!planIdOrCode && tenantId) {
    const [branch] = await executor.select().from(tenants).where(eq(tenants.id, tenantId));
    const [owner] = branch ? await executor.select().from(users).where(eq(users.id, branch.userId)) : [];
    if (owner) planIdOrCode = owner.tier === "premium" ? "premium" : "pro";
  }
  let plan = null;

  if (planIdOrCode) {
    const matched = await executor
      .select()
      .from(plans)
      .where(eq(plans.id, planIdOrCode));
    if (matched.length > 0) plan = matched[0];
    else {
      const matchedByCode = await executor
        .select()
        .from(plans)
        .where(eq(plans.code, planIdOrCode));
      if (matchedByCode.length > 0) plan = matchedByCode[0];
    }
  }

  if (planIdOrCode && (!plan || plan.isActive !== "true")) throw new Error("Paket tidak tersedia");
  if (!plan) {
    const activePlans = await executor
      .select()
      .from(plans)
      .where(eq(plans.isActive, "true"))
      .orderBy(plans.sortOrder);
    plan = activePlans[0];
    if (!plan) throw new Error("Belum ada paket aktif");
  }

  const basePrice = plan.pricePerMonth;

  // Cek kupon diskon: prioritas kode baru yang dimasukkan, atau kode referral bawaan outlet
  let referralCodeIdToApply: string | null = null;
  let commission: { type: string; value: number; marketingProfileId: string | null } | null = null;
  let discountType: "percent" | "fixed" = "percent";
  let discountValue = 0;

  if (customCode && customCode.trim()) {
    const valRes = await validateCode(customCode.trim(), tenantId || null, executor);
    if (!valRes.valid) throw new Error(valRes.message || "Kode referral tidak valid");
    if (valRes.valid && valRes.code) {
      referralCodeIdToApply = valRes.code.id;
      commission = { type: valRes.code.commissionType, value: valRes.code.commissionValue, marketingProfileId: valRes.code.marketingProfileId };
      discountType = valRes.discountType || "percent";
      discountValue = valRes.discountValue || 0;
    }
  } else if (tenantId) {
    const [tenant] = await executor.select().from(tenants).where(eq(tenants.id, tenantId));
    if (tenant?.referralCodeId) {
      const [code] = await executor.select().from(referralCodes).where(eq(referralCodes.id, tenant.referralCodeId));
      if (code) {
        const valid = await validateCode(code.code, tenantId, executor);
        if (valid.valid && valid.code) {
          referralCodeIdToApply = valid.code.id;
          commission = { type: valid.code.commissionType, value: valid.code.commissionValue, marketingProfileId: valid.code.marketingProfileId };
          discountType = valid.discountType || "percent";
          discountValue = valid.discountValue || 0;
        }
      }
    }
  }

  const calculated = calculateSubscriptionPrice({
    pricePerMonth: basePrice,
    promotionAmount: "promotionAmount" in plan ? Number(plan.promotionAmount) : 0,
    promotionStartsAt: "promotionStartsAt" in plan ? plan.promotionStartsAt as string | null : null,
    promotionEndsAt: "promotionEndsAt" in plan ? plan.promotionEndsAt as string | null : null,
    referral: referralCodeIdToApply ? { type: discountType, value: discountValue } : undefined,
  });
  return { plan, ...calculated, referralCodeId: referralCodeIdToApply, commission };
}

/**
 * Buat invoice tagihan langganan baru
 */
export async function createSubscriptionInvoice(params: {
  tenantId: string; userId: string; planId?: string; durationMonths?: number; referralCode?: string;
  idempotencyKey?: string;
}) {
  const months = params.durationMonths ?? 1;
  if (![1,3,6,12].includes(months)) throw new Error("Durasi hanya 1, 3, 6, atau 12 periode 30 hari");
  return db.transaction(async tx => {
    const [branch] = await tx.select().from(tenants).where(eq(tenants.id, params.tenantId));
    const [actor] = await tx.select().from(users).where(eq(users.id, params.userId));
    if (!branch || !actor || !["tenant_owner","superadmin"].includes(actor.role) || actor.status !== "active" || actor.archivedAt || actor.suspendedAt || (actor.role !== "superadmin" && branch.userId !== actor.id)) throw new Error("Akses tagihan ditolak");
    const [owner] = await tx.select().from(users).where(eq(users.id, branch.userId)).for("update");
    if (!owner || owner.archivedAt || owner.suspendedAt || owner.status !== "active") throw new Error("Owner diblokir atau diarsipkan");
    if (params.idempotencyKey) {
      const [existing] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.idempotencyKey, params.idempotencyKey));
      if (existing) {
        if (existing.userId !== owner.id || existing.tenantId !== branch.id || existing.durationMonths !== months) throw new Error("Idempotency key digunakan dengan parameter berbeda");
        if (params.planId) {
          const [requested] = await tx.select().from(plans).where(sql`${plans.id} = ${params.planId} OR ${plans.code} = ${params.planId}`);
          if (!requested || requested.id !== existing.planId) throw new Error("Idempotency key berbeda paket");
        }
        if (params.referralCode) {
          const [frozenCode] = existing.referralCodeId ? await tx.select().from(referralCodes).where(eq(referralCodes.id,existing.referralCodeId)) : [];
          if (frozenCode?.code.toUpperCase() !== params.referralCode.trim().toUpperCase()) throw new Error("Idempotency key berbeda referral");
        }
        return { invoice: existing, paymentDestination: null };
      }
    }
    if (params.referralCode) await setOwnerReferralTx(tx, branch.id, actor.id, actor.role === "superadmin", params.referralCode);
    const price = await getApplicablePrice(branch.id, params.planId || (owner.tier === "premium" ? "premium" : "pro"), undefined, tx);
    const tier = price.plan.code === "premium" ? "premium" : "pro";
    if (actor.role !== "superadmin" && owner.isTrial !== "true" && tier !== owner.tier) throw new Error("Perubahan paket dilakukan melalui admin");
    const activeBranches = await tx.select().from(tenants).where(and(eq(tenants.userId, owner.id), isNull(tenants.archivedAt), eq(tenants.status, "active")));
    if (tier !== "premium" && activeBranches.length > 1) throw new Error("Arsipkan cabang tambahan sebelum perubahan ke Pro");
    const ownedIds = (await tx.select().from(tenants).where(eq(tenants.userId, owner.id))).map(b=>b.id);
    const activeStaff = ownedIds.length ? await tx.select().from(users).where(and(eq(users.role,"staff"), inArray(users.tenantId, ownedIds), isNull(users.archivedAt), eq(users.status,"active"))) : [];
    if (activeStaff.length > (tier === "premium" ? price.plan.maxStaff : 0)) throw new Error("Arsipkan staf yang melebihi kuota sebelum perubahan paket");
    const id = newId("inv"), now = new Date();
    const [invoice] = await tx.insert(subscriptionInvoices).values({
      id, invoiceNo: `SUB-${crypto.randomUUID()}`, tenantId: branch.id, userId: owner.id, planId: price.plan.id,
      entitlementTier: tier, referralCodeId: price.referralCodeId, durationMonths: months,
      originalAmount: price.basePrice * months, discountAmount: price.discountAmount * months,
      promotionDiscountAmount: price.promotionDiscountPerMonth * months, referralDiscountAmount: price.referralDiscountPerMonth * months,
      finalAmount: price.finalPrice * months, expiresAt: new Date(now.getTime() + 86400000).toISOString(),
      commissionType: price.commission?.type, commissionValue: price.commission?.value, commissionProfileId: price.commission?.marketingProfileId,
      idempotencyKey: params.idempotencyKey, status: "unpaid", createdAt: now.toISOString(),
    }).returning();
    return { invoice, paymentDestination: null };
  });
}

/**
 * Unggah bukti transfer pembayaran langganan
 */
export async function uploadPaymentProof(invoiceId: string, proofUrl: string, tenantId: string, actorId?: string) {
  if (!tenantId) {
    throw new Error("Tenant ID diperlukan untuk mengunggah bukti pembayaran");
  }

  return db.transaction(async tx => {
  const [existing] = await tx
    .select()
    .from(subscriptionInvoices)
    .where(and(eq(subscriptionInvoices.id, invoiceId), eq(subscriptionInvoices.tenantId, tenantId))).for("update");

  if (!existing) {
    throw new Error("Invoice tidak ditemukan");
  }

  if (!existing.expiresAt || Date.parse(existing.expiresAt) <= Date.now()) throw new Error("Invoice kedaluwarsa atau memerlukan review admin");
  const [file] = await tx.select().from(storedFiles).where(eq(storedFiles.path, proofUrl));
  if (!file || file.quarantined || file.category !== "payments") throw new Error("Bukti harus berupa berkas privat yang telah diunggah");
  const [uploader] = file.ownerId ? await tx.select().from(users).where(eq(users.id, file.ownerId)) : [];
  if (file.ownerId !== existing.userId && !(uploader?.role === "superadmin" && actorId === uploader.id)) throw new Error("Pemilik berkas tidak sesuai invoice");
  if (file.ownerId !== existing.userId) await tx.update(storedFiles).set({ ownerId: existing.userId }).where(eq(storedFiles.path, proofUrl));
  const openAttempts = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoiceId), sql`${paymentAttempts.status} IN ('creating', 'pending')`));
  if (openAttempts.length) throw new Error("Selesaikan atau rekonsiliasi transaksi Midtrans sebelum memakai transfer manual");
  const [updated] = await tx
    .update(subscriptionInvoices)
    .set({
      paymentProofUrl: proofUrl,
      paymentProofUploadedAt: new Date().toISOString(),
      status: "pending_verification",
    })
    .where(and(eq(subscriptionInvoices.id, invoiceId), sql`${subscriptionInvoices.status} IN ('unpaid', 'rejected')`))
    .returning();

  if (!updated) throw new Error("Invoice tidak dapat diubah pada status saat ini");
  return updated;
  });
}

/**
 * Verifikasi dan aktivasi invoice langganan (Superadmin)
 */
export type SubscriptionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Money receipt is independent from entitlement: business exceptions must not erase settlement. */
export async function recordSubscriptionPaymentTx(invoiceId: string, adminId: string | null, tx: SubscriptionTransaction, paidAt?: string, paymentSource: "manual" | "midtrans" = "manual") {
  const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (invoice.status === "paid") return invoice;
  const now = new Date().toISOString();
  const [paid] = await tx.update(subscriptionInvoices).set({ status: "paid", paymentSource, verifiedByUserId: adminId, verifiedAt: paidAt || now, activationStatus: "pending" }).where(eq(subscriptionInvoices.id, invoice.id)).returning();
  const [branch] = await tx.select().from(tenants).where(eq(tenants.id, invoice.tenantId));
  if (branch?.userId === invoice.userId) await tx.insert(expenses).values({
    id: `subexp-${invoice.id}`, tenantId: invoice.tenantId, type: "expense", category: "Langganan Aplikasi", amount: invoice.finalAmount,
    notes: `Pembayaran langganan (${invoice.invoiceNo})`, expenseDate: today(), isAutoGenerated: "true", rentDurationMonths: invoice.durationMonths,
  }).onConflictDoNothing();
  await tx.insert(platformCashflow).values({ id: `subpcf-${invoice.id}`, type: "income", category: "subscription", amount: invoice.finalAmount,
    date: today(), tenantId: invoice.tenantId, durationMonths: invoice.durationMonths, description: `Langganan Owner (${invoice.invoiceNo})`,
    proofUrl: invoice.paymentProofUrl, createdByUserId: adminId,
  }).onConflictDoNothing();
  return paid;
}

export async function activateSubscriptionInvoice(invoiceId: string, adminId: string | null, tx: SubscriptionTransaction, source: "manual" | "midtrans") {
  let [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
  if (!invoice) throw new Error("Invoice tidak ditemukan");
  if (source === "manual" && invoice.status !== "paid" && invoice.status !== "pending_verification") throw new Error("Invoice tidak menunggu verifikasi");
  if (source === "manual" && invoice.status !== "paid") invoice = await recordSubscriptionPaymentTx(invoice.id, adminId, tx);
  if (invoice.status !== "paid") throw new Error("Pembayaran belum tercatat");
  const [owner] = await tx.select().from(users).where(eq(users.id, invoice.userId)).for("update");
  const [branch] = await tx.select().from(tenants).where(eq(tenants.id, invoice.tenantId));
  const pending = async (reason: string) => {
    const [updated] = await tx.update(subscriptionInvoices).set({ activationStatus: "pending_review", activationReason: reason }).where(eq(subscriptionInvoices.id, invoice.id)).returning();
    return { invoice: updated, tenant: { id: invoice.tenantId, subscriptionUntil: owner?.subscriptionUntil ?? null, isTrial: owner?.isTrial === "true", status: owner?.status ?? "inactive" } };
  };
  if (invoice.activationStatus === "active") return { invoice, tenant: { id: invoice.tenantId, subscriptionUntil: invoice.periodEnd, isTrial: false, status: owner?.status || "inactive" } };
  if (!owner || !branch || branch.userId !== invoice.userId) return pending("ownership_changed");
  if (owner.archivedAt || owner.suspendedAt || owner.status !== "active" || branch.archivedAt || branch.suspendedAt || branch.status !== "active") return pending("owner_suspended_or_archived");
  const reservedAt = invoice.paymentProofUploadedAt || invoice.verifiedAt;
  if (!invoice.activationReviewedAt && (!invoice.expiresAt || !reservedAt || Date.parse(reservedAt) > Date.parse(invoice.expiresAt))) return pending("expired_or_legacy_invoice");
  const [plan] = invoice.planId ? await tx.select().from(plans).where(eq(plans.id, invoice.planId)) : [];
  if (!plan) return pending("plan_unavailable");
  if (!["pro","premium"].includes(invoice.entitlementTier || "")) return pending("legacy_terms_require_review");
  const tier = invoice.entitlementTier!;
  const branches = await tx.select().from(tenants).where(and(eq(tenants.userId, owner.id), isNull(tenants.archivedAt), eq(tenants.status, "active")));
  const ownedBranchIds = (await tx.select().from(tenants).where(eq(tenants.userId, owner.id))).map(b => b.id);
  const activeStaff = ownedBranchIds.length ? await tx.select().from(users).where(and(eq(users.role,"staff"), inArray(users.tenantId, ownedBranchIds), isNull(users.archivedAt), eq(users.status,"active"))) : [];
  if (activeStaff.length > (tier === "premium" ? plan.maxStaff : 0)) return pending("staff_quota_requires_review");
  if (branches.length > (tier === "premium" ? Math.min(5, plan.maxBranches) : 1)) return pending("quota_requires_review");
  const start = owner.subscriptionUntil && owner.subscriptionUntil >= today() ? owner.subscriptionUntil : today();
  const periodEnd = addDays(invoice.durationMonths * 30, start);
  const [updated] = await tx.update(subscriptionInvoices).set({ activationStatus: "active", activationReason: null, periodStart: start, periodEnd }).where(eq(subscriptionInvoices.id, invoice.id)).returning();
  await tx.update(users).set({ tier, subscriptionUntil: periodEnd, isTrial: "false" }).where(eq(users.id, owner.id));
  await tx.update(tenants).set({ tier, subscriptionUntil: periodEnd, isTrial: "false" }).where(eq(tenants.userId, owner.id));
  if (invoice.referralCodeId && invoice.commissionType && invoice.commissionValue !== null) await recordCommission({
    referralCodeId: invoice.referralCodeId, subscriptionInvoiceId: invoice.id, baseAmount: invoice.finalAmount, tenantId: invoice.tenantId,
    durationMonths: invoice.durationMonths, snapshot: { type: invoice.commissionType, value: invoice.commissionValue, marketingProfileId: invoice.commissionProfileId },
  }, tx);
  await tx.insert(subscriptionEvents).values({ id: `activation-${invoice.id}`, tenantId: invoice.tenantId, eventType: "renewed", eventDate: today(),
    metadata: JSON.stringify({ invoiceId: invoice.id, ownerId: invoice.userId, periodEnd }),
  }).onConflictDoNothing();
  return { invoice: updated, tenant: { id: branch.id, subscriptionUntil: periodEnd, isTrial: false, status: branch.status } };
}
export async function verifySubscriptionInvoice(invoiceId: string, adminUserId: string) {
  const [admin] = await db.select().from(users).where(eq(users.id,adminUserId));
  if (!admin || admin.role !== "superadmin" || admin.status !== "active" || admin.archivedAt || admin.suspendedAt) throw new Error("Verifikasi membutuhkan admin aktif");
  return db.transaction(tx => activateSubscriptionInvoice(invoiceId, adminUserId, tx, "manual"));
}
export async function retryInvoiceActivation(invoiceId: string) {
  return db.transaction(tx => activateSubscriptionInvoice(invoiceId, null, tx, "midtrans"));
}
export async function rejectSubscriptionInvoice(invoiceId: string, adminUserId: string, reason: string) {
  return db.transaction(async tx => {
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
    if (!invoice || invoice.status !== "pending_verification") throw new Error("Hanya bukti yang menunggu verifikasi dapat ditolak");
    const [updated] = await tx.update(subscriptionInvoices).set({ status: "rejected", rejectionReason: reason.slice(0,1000), verifiedByUserId: adminUserId })
      .where(and(eq(subscriptionInvoices.id, invoiceId), eq(subscriptionInvoices.status, "pending_verification"))).returning();
    return updated;
  });
}

/** Explicit audited decision for legacy/late paid invoices. Does not bypass suspension, ownership or active quota. */
export async function reviewInvoiceActivation(invoiceId: string, adminId: string, input: { tier: string; notes: string }) {
  if (!["pro","premium"].includes(input.tier) || typeof input.notes !== "string" || input.notes.trim().length < 10 || input.notes.length > 2000) throw new Error("Paket dan alasan review lengkap diperlukan");
  await db.transaction(async tx => {
    const [admin] = await tx.select().from(users).where(eq(users.id,adminId));
    if (!admin || admin.role !== "superadmin" || admin.status !== "active" || admin.archivedAt || admin.suspendedAt) throw new Error("Admin tidak aktif");
    const [invoice] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,invoiceId)).for("update");
    if (!invoice || !["paid","unpaid","rejected","pending_verification"].includes(invoice.status)) throw new Error("Status invoice tidak dapat ditinjau");
    if (invoice.activationStatus === "active") return;
    if (invoice.entitlementTier && invoice.entitlementTier !== input.tier) throw new Error("Paket snapshot tidak dapat diubah melalui review");
    const [plan] = invoice.planId ? await tx.select().from(plans).where(eq(plans.id,invoice.planId)) : await tx.select().from(plans).where(eq(plans.code,input.tier));
    if (!plan || (invoice.entitlementTier === null && plan.code !== input.tier && !["standard","monthly"].includes(plan.code))) throw new Error("Paket invoice tidak sesuai keputusan review");
    await tx.update(subscriptionInvoices).set({ expiresAt: invoice.status === "paid" ? invoice.expiresAt : new Date(Date.now()+86400000).toISOString(), planId:plan.id, entitlementTier:invoice.entitlementTier || input.tier, activationReviewedAt:new Date().toISOString(),activationReviewedBy:adminId,activationReviewNotes:input.notes.trim() }).where(eq(subscriptionInvoices.id,invoiceId));
  });
  const [updated] = await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,invoiceId));
  if (updated.status === "paid") return retryInvoiceActivation(invoiceId);
  return { invoice:updated,tenant:{id:updated.tenantId,subscriptionUntil:null,isTrial:false,status:"inactive"} };
}

/** Legacy external proofs remain in the audit record but are never embedded by the browser. */
export function presentInvoice<T extends {paymentProofUrl?: string | null}>(invoice:T):T {
  return {...invoice,paymentProofUrl:invoice.paymentProofUrl?.startsWith("/uploads/payments/")?invoice.paymentProofUrl:null};
}
