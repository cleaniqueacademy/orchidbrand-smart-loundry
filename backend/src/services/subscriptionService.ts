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
} from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays, daysRemaining, today, toDateOnly } from "../utils/date";
import { invalidateTenantAuthCache } from "../middleware/auth";
import { calculateSubscriptionPrice } from "./subscriptionPricing";
import { DEFAULT_MONTHLY_PRICE } from "../constants/services";
import { validateCode, recordCommission } from "./referralService";

export interface SubscriptionSummary {
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
  const isActive = remaining >= 0 && tenant.status === "active";

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
    tenantId: tenant.id,
    outletName: tenant.outletName,
    isTrial: tenant.isTrial === "true",
    isActive,
    subscriptionUntil: subUntil,
    daysRemaining: remaining,
    status: tenant.status,
    referralCodeUsed: referralCodeStr,
    pendingInvoice,
    platformBank: settings
      ? {
          bankName: settings.bankName || "BCA (Bank Central Asia)",
          bankAccountNumber: settings.bankAccountNumber || "8830-1928-3341",
          bankAccountName: settings.bankAccountName || "PT CLEANIQUE SISTEM DIGITAL",
          qrisInfo: (settings.qrisInfo && !settings.qrisInfo.includes("qris-official.png")) ? settings.qrisInfo : "/qris.png",
          ewalletName: settings.ewalletName || "DANA / GoPay / OVO",
          ewalletNumber: settings.ewalletNumber || "0812-2340-6368",
          ewalletAccountName: settings.ewalletAccountName || "PT CLEANIQUE SISTEM DIGITAL",
        }
      : {
          bankName: "BCA (Bank Central Asia)",
          bankAccountNumber: "8830-1928-3341",
          bankAccountName: "PT CLEANIQUE SISTEM DIGITAL",
          qrisInfo: "/qris.png",
          ewalletName: "DANA / GoPay / OVO",
          ewalletNumber: "0812-2340-6368",
          ewalletAccountName: "PT CLEANIQUE SISTEM DIGITAL",
        },
  };
}

/**
 * Hitung harga langganan yang berlaku untuk tenant, termasuk diskon referral jika ada
 */
export async function getApplicablePrice(tenantId?: string | null, planIdOrCode?: string, customCode?: string) {
  // Referral eligibility is account-wide; use the Owner's primary branch consistently.
  if (tenantId) {
    const [selected] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (selected) {
      const [owner] = await db.select().from(users).where(eq(users.id, selected.userId));
      const branches = await db.select().from(tenants).where(eq(tenants.userId, selected.userId)).orderBy(tenants.createdAt, tenants.id);
      tenantId = branches.find(branch => branch.id === owner?.tenantId)?.id || branches[0]?.id || tenantId;
    }
  }
  let plan = null;

  if (planIdOrCode) {
    const matched = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planIdOrCode));
    if (matched.length > 0) plan = matched[0];
    else {
      const matchedByCode = await db
        .select()
        .from(plans)
        .where(eq(plans.code, planIdOrCode));
      if (matchedByCode.length > 0) plan = matchedByCode[0];
    }
  }

  if (planIdOrCode && (!plan || plan.isActive !== "true")) throw new Error("Paket tidak tersedia");
  if (!plan) {
    const activePlans = await db
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
  let discountType: "percent" | "fixed" = "percent";
  let discountValue = 0;

  if (customCode && customCode.trim()) {
    const valRes = await validateCode(customCode.trim(), tenantId || "");
    if (!valRes.valid) throw new Error(valRes.message || "Kode referral tidak valid");
    if (valRes.valid && valRes.code) {
      referralCodeIdToApply = valRes.code.id;
      discountType = valRes.discountType || "percent";
      discountValue = valRes.discountValue || 0;
    }
  } else if (tenantId) {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (tenant?.referralCodeId) {
      const [code] = await db.select().from(referralCodes).where(eq(referralCodes.id, tenant.referralCodeId));
      if (code) {
        const valid = await validateCode(code.code, tenantId);
        if (valid.valid && valid.code) {
          referralCodeIdToApply = valid.code.id;
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
  return { plan, ...calculated, referralCodeId: referralCodeIdToApply };
}

/**
 * Buat invoice tagihan langganan baru
 */
export async function createSubscriptionInvoice(params: {
  tenantId: string;
  userId: string;
  planId?: string;
  durationMonths?: number;
  referralCode?: string;
}) {
  const { tenantId, userId, planId, durationMonths = 1, referralCode } = params;

  if (!Number.isInteger(durationMonths) || durationMonths < 1 || durationMonths > 120) throw new Error("Durasi tidak valid");
  const [billingTenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!billingTenant) throw new Error("Outlet tidak ditemukan");
  const [actor] = await db.select().from(users).where(eq(users.id, userId));
  if (!actor || (actor.role !== "superadmin" && actor.id !== billingTenant.userId)) throw new Error("Akses tagihan ditolak");
  const priceCalc = await getApplicablePrice(tenantId, planId, referralCode);
  const originalAmount = priceCalc.basePrice * durationMonths;
  const discountAmount = priceCalc.discountAmount * durationMonths;
  const finalAmount = originalAmount - discountAmount;

  const invoiceId = newId("inv");
  const invoiceNo = `INV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const nowIso = new Date().toISOString();

  const [invoice] = await db
    .insert(subscriptionInvoices)
    .values({
      id: invoiceId,
      invoiceNo,
      tenantId,
      userId: billingTenant.userId,
      planId: priceCalc.plan.id,
      referralCodeId: priceCalc.referralCodeId,
      durationMonths,
      originalAmount,
      discountAmount,
      promotionDiscountAmount: priceCalc.promotionDiscountPerMonth * durationMonths,
      referralDiscountAmount: priceCalc.referralDiscountPerMonth * durationMonths,
      finalAmount,
      status: "unpaid",
      createdAt: nowIso,
    })
    .returning();

  const [settings] = await db.select().from(platformSettings).limit(1);

  return {
    invoice,
    paymentDestination: settings
      ? {
          bankName: settings.bankName || "BCA (Bank Central Asia)",
          bankAccountNumber: settings.bankAccountNumber || "8830-1928-3341",
          bankAccountName: settings.bankAccountName || "PT CLEANIQUE SISTEM DIGITAL",
          qrisInfo: (settings.qrisInfo && !settings.qrisInfo.includes("qris-official.png")) ? settings.qrisInfo : "/qris.png",
          ewalletName: settings.ewalletName || "DANA / GoPay / OVO",
          ewalletNumber: settings.ewalletNumber || "0812-2340-6368",
          ewalletAccountName: settings.ewalletAccountName || "PT CLEANIQUE SISTEM DIGITAL",
        }
      : {
          bankName: "BCA (Bank Central Asia)",
          bankAccountNumber: "8830-1928-3341",
          bankAccountName: "PT CLEANIQUE SISTEM DIGITAL",
          qrisInfo: "/qris.png",
          ewalletName: "DANA / GoPay / OVO",
          ewalletNumber: "0812-2340-6368",
          ewalletAccountName: "PT CLEANIQUE SISTEM DIGITAL",
        },
  };
}

/**
 * Unggah bukti transfer pembayaran langganan
 */
export async function uploadPaymentProof(invoiceId: string, proofUrl: string, tenantId: string) {
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
type SubscriptionTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function verifySubscriptionInvoice(invoiceId: string, adminUserId: string) {
  const result = await db.transaction(tx => activateSubscriptionInvoice(invoiceId, adminUserId, tx, "manual"));
  invalidateTenantAuthCache();
  console.info("[subscription] invoice verified", { invoiceId });
  return result;
}
export async function activateSubscriptionInvoice(invoiceId: string, adminUserId: string | null, tx: SubscriptionTransaction, source: "manual" | "midtrans") {
  const [invoice] = await tx
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.id, invoiceId)).for("update");

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  if ((source === "manual" && invoice.status !== "pending_verification") ||
      (source === "midtrans" && !["unpaid", "rejected"].includes(invoice.status))) {
    throw new Error("Invoice tidak dalam status menunggu verifikasi");
  }

  const [tenant] = await tx.select().from(tenants).where(eq(tenants.id, invoice.tenantId));
  if (!tenant) {
    throw new Error("Outlet tidak ditemukan");
  }

  const [owner] = await tx.select().from(users).where(eq(users.id, tenant.userId)).for("update");
  if (!owner) throw new Error("Owner tidak ditemukan");
  const [plan] = invoice.planId ? await tx.select().from(plans).where(eq(plans.id, invoice.planId)) : [];
  const tier = plan?.code === "premium" ? "premium" : "pro";
  const ownedBranches = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.userId, owner.id));
  if (tier !== "premium" && ownedBranches.length > 1) throw new Error("Tutup cabang tambahan sebelum menurunkan paket");

  // Hitung masa aktif baru:
  // Jika langganan outlet masih aktif (> 0 hari tersisa), perpanjang dari subscriptionUntil yang ada.
  // Jika sudah kedaluwarsa, mulai dari hari ini.
  const remaining = owner.subscriptionUntil ? daysRemaining(owner.subscriptionUntil) : -1;
  const baseStartDate = remaining > 0 && owner.subscriptionUntil
    ? new Date(owner.subscriptionUntil)
    : new Date();

  const durationDays = Math.round(invoice.durationMonths * 30);
  const periodEnd = addDays(durationDays, baseStartDate);
  const periodStart = toDateOnly(baseStartDate);
  const nowIso = new Date().toISOString();

  // 1. Update Invoice
  const [updatedInvoice] = await tx
    .update(subscriptionInvoices)
    .set({
      status: "paid",
      verifiedByUserId: adminUserId,
      verifiedAt: nowIso,
      periodStart,
      periodEnd,
    })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();

  // 2. Update Tenant: Perpanjang subscriptionUntil, set isTrial = 'false'
  await tx
    .update(tenants)
    .set({
      tier,
      subscriptionUntil: periodEnd,
      isTrial: "false",
      status: "active",
    })
    .where(eq(tenants.userId, owner.id));

  // 3. Update User Owner
  await tx
    .update(users)
    .set({
      tier,
      subscriptionUntil: periodEnd,
      isTrial: "false",
      status: "active",
    })
    .where(eq(users.id, tenant.userId));

  // 4. Catat komisi untuk marketing jika invoice memakai referralCodeId
  if (invoice.referralCodeId) {
    await recordCommission({
      referralCodeId: invoice.referralCodeId,
      subscriptionInvoiceId: invoice.id,
      baseAmount: invoice.finalAmount,
      tenantId: tenant.id,
      durationMonths: invoice.durationMonths,
    }, tx);
  }

  // 4b. Otomatis catat ke pengeluaran outlet (Buku Kas Tenant)
  await tx.insert(expenses).values({
    id: newId("exp"),
    tenantId: tenant.id,
    type: "expense",
    category: "Langganan Aplikasi",
    amount: invoice.finalAmount,
    notes: `Perpanjangan lisensi aplikasi ${invoice.durationMonths} bulan (Inv: ${invoice.invoiceNo})`,
    expenseDate: today(),
    rentDurationMonths: invoice.durationMonths,
    rentStartDate: periodStart,
    isAutoGenerated: "true",
    createdAt: nowIso,
  });

  await tx.insert(platformCashflow).values({
    id: newId("pcf"), type: "income", category: "subscription", amount: invoice.finalAmount,
    date: today(), tenantId: tenant.id, durationMonths: invoice.durationMonths,
    description: `Langganan Owner (${invoice.invoiceNo})`, proofUrl: invoice.paymentProofUrl,
    createdByUserId: adminUserId, createdAt: nowIso,
  });

  // 5. Catat riwayat event langganan
  await tx.insert(subscriptionEvents).values({
    id: newId("subevt"),
    tenantId: tenant.id,
    eventType: "renewed",
    eventDate: today(),
    messageSent: `Langganan diperpanjang ${invoice.durationMonths} bulan hingga ${periodEnd}`,
    metadata: JSON.stringify({
      invoiceId: invoice.id,
      invoiceNo: invoice.invoiceNo,
      durationMonths: invoice.durationMonths,
      periodStart,
      periodEnd,
      amount: invoice.finalAmount,
    }),
    createdAt: nowIso,
  });

  return {
    invoice: updatedInvoice,
    tenant: {
      id: tenant.id,
      tier,
      subscriptionUntil: periodEnd,
      isTrial: false,
      status: "active",
    },
  };
}
/**
 * Tolak invoice pembayaran langganan (Superadmin)
 */
export async function rejectSubscriptionInvoice(
  invoiceId: string,
  adminUserId: string,
  reason: string
) {
  const [invoice] = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.id, invoiceId));

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  const [updated] = await db
    .update(subscriptionInvoices)
    .set({
      status: "rejected",
      rejectionReason: reason || "Bukti transfer tidak valid",
      verifiedByUserId: adminUserId,
      verifiedAt: new Date().toISOString(),
    })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();

  return updated;
}
