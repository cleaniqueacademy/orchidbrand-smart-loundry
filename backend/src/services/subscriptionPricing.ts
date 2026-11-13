import { applyDiscount, type DiscountType } from "../utils/money";

export interface PricingInput {
  pricePerMonth: number;
  durationMonths?: number;
  promotionAmount?: number;
  promotionStartsAt?: string | null;
  promotionEndsAt?: string | null;
  referral?: { type: DiscountType; value: number };
  now?: Date;
}

/** One authoritative calculation; discounts are rounded per month before multiplication. */
export function calculateSubscriptionPrice(input: PricingInput) {
  const months = input.durationMonths ?? 1;
  if (!Number.isInteger(months) || months < 1 || months > 120) {
    throw new Error("Durasi langganan harus bilangan bulat 1–120 bulan");
  }
  const base = input.pricePerMonth;
  const promotion = input.promotionAmount ?? 0;
  if (!Number.isSafeInteger(base) || base < 0 || !Number.isSafeInteger(promotion) || promotion < 0) {
    throw new Error("Harga dan promo harus Rupiah bulat non-negatif");
  }
  const starts = Date.parse(input.promotionStartsAt ?? "");
  const ends = Date.parse(input.promotionEndsAt ?? "");
  const now = (input.now ?? new Date()).getTime();
  // An incomplete or malformed campaign fails closed; end time is exclusive.
  const promotionActive = Number.isFinite(starts) && Number.isFinite(ends) && starts < ends && now >= starts && now < ends;
  const promotionDiscountPerMonth = promotionActive ? Math.min(base, promotion) : 0;
  const subtotal = base - promotionDiscountPerMonth;
  const referral = input.referral;
  if (referral && (!Number.isFinite(referral.value) || referral.value < 0 ||
      (referral.type !== "fixed" && referral.type !== "percent") ||
      (referral.type === "percent" && referral.value > 100) ||
      (referral.type === "fixed" && !Number.isSafeInteger(referral.value)))) {
    throw new Error("Diskon referral tidak valid");
  }
  const referralDiscountPerMonth = referral ? applyDiscount(subtotal, referral.type, referral.value).discountAmount : 0;
  const finalPrice = subtotal - referralDiscountPerMonth;
  if (!Number.isSafeInteger(base * months)) throw new Error("Nilai invoice melebihi batas perhitungan");
  return {
    basePrice: base,
    promotionActive,
    promotionDiscountPerMonth,
    referralDiscountPerMonth,
    discountAmount: promotionDiscountPerMonth + referralDiscountPerMonth,
    finalPrice,
    durationMonths: months,
    originalAmount: base * months,
    promotionDiscountAmount: promotionDiscountPerMonth * months,
    referralDiscountAmount: referralDiscountPerMonth * months,
    finalAmount: finalPrice * months,
  };
}
