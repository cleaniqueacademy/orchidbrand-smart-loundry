import { db } from "../db/index";
import {
  referralCodes,
  referralCodeTenants,
  referralEvents,
  marketingProfiles,
  marketingCommissions,
} from "../db/schema";
import { eq, and, sql } from "drizzle-orm";
import { newId } from "../utils/id";
import { applyDiscount, calculateCommission, roundRupiah } from "../utils/money";

export interface ReferralValidationResult {
  valid: boolean;
  message?: string;
  code?: typeof referralCodes.$inferSelect;
  discountType?: "percent" | "fixed";
  discountValue?: number;
  commissionType?: "percent" | "fixed";
  commissionValue?: number;
}

/**
 * Validasi kode referral secara ketat.
 * Mengecek: eksistensi, status aktif, tanggal berlaku, kuota penggunaan, dan aktivasi per tenant jika ada.
 */
export async function validateCode(
  rawCode: string,
  tenantId?: string | null
): Promise<ReferralValidationResult> {
  if (!rawCode || !rawCode.trim()) {
    return { valid: false, message: "Kode referral tidak boleh kosong" };
  }

  const cleanCode = rawCode.trim().toUpperCase();
  const matchedCodes = await db
    .select()
    .from(referralCodes)
    .where(eq(sql`UPPER(${referralCodes.code})`, cleanCode));

  if (matchedCodes.length === 0) {
    return { valid: false, message: "Kode referral tidak ditemukan" };
  }

  const code = matchedCodes[0];

  if (code.isActive !== "true") {
    return { valid: false, message: "Kode referral sudah tidak aktif" };
  }

  const todayIso = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  if (code.validFrom && todayIso < code.validFrom) {
    return { valid: false, message: `Kode referral baru berlaku mulai tanggal ${code.validFrom}` };
  }

  if (code.validUntil && todayIso > code.validUntil) {
    return { valid: false, message: `Kode referral telah kedaluwarsa pada ${code.validUntil}` };
  }

  if (code.maxUsage && code.maxUsage > 0 && code.currentUsage >= code.maxUsage) {
    return { valid: false, message: "Kuota penggunaan kode referral ini telah habis" };
  }

  // Jika kode berlaku spesifik hanya untuk outlet/tenant tertentu
  if (code.appliesToAllTenants !== "true" && tenantId) {
    const tenantActivation = await db
      .select()
      .from(referralCodeTenants)
      .where(
        and(
          eq(referralCodeTenants.referralCodeId, code.id),
          eq(referralCodeTenants.tenantId, tenantId)
        )
      );

    if (tenantActivation.length === 0 || tenantActivation[0].isEnabled !== "true") {
      return { valid: false, message: "Kode referral tidak berlaku untuk outlet ini" };
    }
  }

  return {
    valid: true,
    code,
    discountType: code.discountType as "percent" | "fixed",
    discountValue: code.discountValue,
    commissionType: code.commissionType as "percent" | "fixed",
    commissionValue: code.commissionValue,
  };
}

/**
 * Catat event klik / view referral link untuk analitik.
 */
export async function recordClick(
  referralCodeId: string,
  tenantId?: string | null,
  metadata?: Record<string, any>
) {
  try {
    await db.insert(referralEvents).values({
      id: newId("refevt"),
      referralCodeId,
      tenantId: tenantId ?? null,
      eventType: "click",
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.warn("⚠️ Gagal mencatat referral click event:", err.message);
  }
}

/**
 * Catat event signup yang menggunakan kode referral & inkremen pemakaian kuota.
 */
export async function recordSignup(
  referralCodeId: string,
  tenantId?: string | null,
  metadata?: Record<string, any>
) {
  try {
    await db.insert(referralEvents).values({
      id: newId("refevt"),
      referralCodeId,
      tenantId: tenantId ?? null,
      eventType: "signup",
      metadata: metadata ? JSON.stringify(metadata) : null,
      createdAt: new Date().toISOString(),
    });

    // Inkremen current_usage
    await db
      .update(referralCodes)
      .set({
        currentUsage: sql`${referralCodes.currentUsage} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(referralCodes.id, referralCodeId));
  } catch (err: any) {
    console.warn("⚠️ Gagal mencatat referral signup event:", err.message);
  }
}

/**
 * Hitung diskon yang didapat pengguna dari kode referral.
 */
export function computeDiscount(
  baseAmount: number,
  code: { discountType: string; discountValue: number }
) {
  return applyDiscount(baseAmount, code.discountType as "percent" | "fixed", code.discountValue);
}

/**
 * Catat komisi untuk profil marketing ketika tagihan/langganan berhasil dibayar.
 */
export async function recordCommission(params: {
  referralCodeId: string;
  subscriptionInvoiceId?: string | null;
  baseAmount: number;
  tenantId?: string | null;
}) {
  const { referralCodeId, subscriptionInvoiceId, baseAmount, tenantId } = params;

  const foundCodes = await db
    .select()
    .from(referralCodes)
    .where(eq(referralCodes.id, referralCodeId));

  if (foundCodes.length === 0) return null;
  const code = foundCodes[0];

  if (!code.marketingProfileId) return null;

  const commissionAmount = calculateCommission(
    baseAmount,
    code.commissionType as "percent" | "fixed",
    code.commissionValue
  );

  if (commissionAmount <= 0) return null;

  const commissionId = newId("comm");
  await db.insert(marketingCommissions).values({
    id: commissionId,
    marketingProfileId: code.marketingProfileId,
    referralCodeId: code.id,
    subscriptionInvoiceId: subscriptionInvoiceId ?? null,
    tenantId: tenantId ?? null,
    baseAmount,
    commissionAmount,
    status: "pending",
    createdAt: new Date().toISOString(),
  });

  // Catat event pembayaran referral
  await db.insert(referralEvents).values({
    id: newId("refevt"),
    referralCodeId: code.id,
    tenantId: tenantId ?? null,
    eventType: "subscription_payment",
    metadata: JSON.stringify({
      invoiceId: subscriptionInvoiceId,
      baseAmount,
      commissionAmount,
    }),
    createdAt: new Date().toISOString(),
  });

  return {
    commissionId,
    commissionAmount,
  };
}
