import { db } from "../db/index";
import {
  tenants,
  users,
  plans,
  platformSettings,
  subscriptionInvoices,
  subscriptionEvents,
  referralCodes,
} from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { newId } from "../utils/id";
import { addDays, daysRemaining, today, toDateOnly } from "../utils/date";
import { applyDiscount } from "../utils/money";
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
  };
}

/**
 * Ringkasan masa aktif langganan suatu outlet
 */
export async function getSubscriptionSummary(tenantId: string): Promise<SubscriptionSummary | null> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return null;

  const subUntil = tenant.subscriptionUntil || null;
  const remaining = subUntil ? daysRemaining(subUntil) : -999;
  const isActive = remaining >= 0 && tenant.status === "active";

  // Ambil invoice yang masih menunggu verifikasi atau belum dibayar
  const invoices = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.tenantId, tenantId))
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
          bankName: settings.bankName,
          bankAccountNumber: settings.bankAccountNumber,
          bankAccountName: settings.bankAccountName,
          qrisInfo: settings.qrisInfo,
        }
      : undefined,
  };
}

/**
 * Hitung harga langganan yang berlaku untuk tenant, termasuk diskon referral jika ada
 */
export async function getApplicablePrice(tenantId: string, planIdOrCode?: string, customCode?: string) {
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

  if (!plan) {
    const activePlans = await db
      .select()
      .from(plans)
      .where(eq(plans.isActive, "true"))
      .orderBy(plans.sortOrder);
    plan = activePlans[0] || {
      id: "basic",
      code: "basic",
      name: "Paket Standar",
      pricePerMonth: DEFAULT_MONTHLY_PRICE,
      durationMonths: 1,
    };
  }

  const basePrice = plan.pricePerMonth || DEFAULT_MONTHLY_PRICE;

  // Cek kupon diskon: prioritas kode baru yang dimasukkan, atau kode referral bawaan outlet
  let referralCodeIdToApply: string | null = null;
  let discountType: "percent" | "fixed" = "percent";
  let discountValue = 0;

  if (customCode && customCode.trim()) {
    const valRes = await validateCode(customCode.trim(), tenantId);
    if (valRes.valid && valRes.code) {
      referralCodeIdToApply = valRes.code.id;
      discountType = valRes.discountType || "percent";
      discountValue = valRes.discountValue || 0;
    }
  } else {
    // Cek referral bawaan tenant
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    if (tenant && tenant.referralCodeId) {
      const [refCode] = await db
        .select()
        .from(referralCodes)
        .where(eq(referralCodes.id, tenant.referralCodeId));
      if (refCode && refCode.isActive === "true") {
        referralCodeIdToApply = refCode.id;
        discountType = refCode.discountType as "percent" | "fixed";
        discountValue = refCode.discountValue;
      }
    }
  }

  const { discountAmount, finalPrice } = applyDiscount(basePrice, discountType, discountValue);

  return {
    plan,
    basePrice,
    discountAmount,
    finalPrice,
    referralCodeId: referralCodeIdToApply,
  };
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
      userId,
      planId: priceCalc.plan.id,
      referralCodeId: priceCalc.referralCodeId,
      durationMonths,
      originalAmount,
      discountAmount,
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
          bankName: settings.bankName,
          bankAccountNumber: settings.bankAccountNumber,
          bankAccountName: settings.bankAccountName,
          qrisInfo: settings.qrisInfo,
        }
      : null,
  };
}

/**
 * Unggah bukti transfer pembayaran langganan
 */
export async function uploadPaymentProof(invoiceId: string, proofUrl: string) {
  const [existing] = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.id, invoiceId));

  if (!existing) {
    throw new Error("Invoice tidak ditemukan");
  }

  const [updated] = await db
    .update(subscriptionInvoices)
    .set({
      paymentProofUrl: proofUrl,
      paymentProofUploadedAt: new Date().toISOString(),
      status: "pending_verification",
    })
    .where(eq(subscriptionInvoices.id, invoiceId))
    .returning();

  return updated;
}

/**
 * Verifikasi dan aktivasi invoice langganan (Superadmin)
 */
export async function verifySubscriptionInvoice(invoiceId: string, adminUserId: string) {
  const [invoice] = await db
    .select()
    .from(subscriptionInvoices)
    .where(eq(subscriptionInvoices.id, invoiceId));

  if (!invoice) {
    throw new Error("Invoice tidak ditemukan");
  }

  if (invoice.status === "paid") {
    throw new Error("Invoice ini sudah diverifikasi sebelumnya");
  }

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, invoice.tenantId));
  if (!tenant) {
    throw new Error("Outlet tidak ditemukan");
  }

  // Hitung masa aktif baru:
  // Jika langganan outlet masih aktif (> 0 hari tersisa), perpanjang dari subscriptionUntil yang ada.
  // Jika sudah kedaluwarsa, mulai dari hari ini.
  const remaining = tenant.subscriptionUntil ? daysRemaining(tenant.subscriptionUntil) : -1;
  const baseStartDate = remaining > 0 && tenant.subscriptionUntil
    ? new Date(tenant.subscriptionUntil)
    : new Date();

  const durationDays = Math.round(invoice.durationMonths * 30);
  const periodEnd = addDays(durationDays, baseStartDate);
  const periodStart = toDateOnly(baseStartDate);
  const nowIso = new Date().toISOString();

  // 1. Update Invoice
  const [updatedInvoice] = await db
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
  await db
    .update(tenants)
    .set({
      subscriptionUntil: periodEnd,
      isTrial: "false",
      status: "active",
    })
    .where(eq(tenants.id, tenant.id));

  // 3. Update User Owner
  await db
    .update(users)
    .set({
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
    });
  }

  // 5. Catat riwayat event langganan
  await db.insert(subscriptionEvents).values({
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
