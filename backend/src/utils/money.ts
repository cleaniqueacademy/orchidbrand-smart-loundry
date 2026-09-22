/**
 * Utility keuangan — pembulatan rupiah, perhitungan diskon & komisi.
 * Semua nilai uang disimpan sebagai number (doublePrecision) dan dibulatkan ke rupiah terdekat.
 */

export type DiscountType = "percent" | "fixed";
export type CommissionType = "percent" | "fixed";

/**
 * Bulatkan nilai ke rupiah terdekat (tidak ada desimal).
 * Nilai negatif dikembalikan sebagai 0.
 */
export function roundRupiah(value: number): number {
  return Math.max(0, Math.round(value));
}

/**
 * Hitung jumlah diskon dari harga dasar.
 * - type "percent": value adalah persentase (0–100)
 * - type "fixed": value adalah nominal rupiah
 * Mengembalikan jumlah diskon (bukan harga akhir).
 */
export function applyDiscount(
  basePrice: number,
  type: DiscountType,
  value: number
): { discountAmount: number; finalPrice: number } {
  if (value <= 0) {
    return { discountAmount: 0, finalPrice: roundRupiah(basePrice) };
  }

  let discountAmount: number;
  if (type === "percent") {
    const pct = Math.min(100, Math.max(0, value));
    discountAmount = (basePrice * pct) / 100;
  } else {
    discountAmount = Math.min(value, basePrice); // diskon fixed tidak boleh melebihi harga
  }

  discountAmount = roundRupiah(discountAmount);
  const finalPrice = roundRupiah(basePrice - discountAmount);

  return { discountAmount, finalPrice };
}

/**
 * Hitung jumlah komisi marketing dari pembayaran.
 * - type "percent": value adalah persentase (0–100)
 * - type "fixed": value adalah nominal rupiah tetap
 */
export function calculateCommission(
  paymentAmount: number,
  type: CommissionType,
  value: number
): number {
  if (value <= 0) return 0;

  let commission: number;
  if (type === "percent") {
    const pct = Math.min(100, Math.max(0, value));
    commission = (paymentAmount * pct) / 100;
  } else {
    commission = Math.min(value, paymentAmount);
  }

  return roundRupiah(commission);
}
