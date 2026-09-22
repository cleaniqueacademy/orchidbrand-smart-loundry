/**
 * Utility tanggal — semua tanggal disimpan sebagai string ISO (YYYY-MM-DD).
 */

/**
 * Tambah N hari ke tanggal dasar (default: hari ini).
 * Mengembalikan string ISO date tanpa time component.
 */
export function addDays(days: number, base?: Date): string {
  const d = base ? new Date(base) : new Date();
  d.setDate(d.getDate() + days);
  return toDateOnly(d);
}

/**
 * Konversi Date → "YYYY-MM-DD"
 */
export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Hitung selisih hari antara dua tanggal (positif jika `to` lebih besar).
 * Menerima string ISO date atau Date object.
 */
export function daysBetween(from: string | Date, to: string | Date): number {
  const a = typeof from === "string" ? new Date(`${from}T00:00:00`) : new Date(from);
  const b = typeof to === "string" ? new Date(`${to}T00:00:00`) : new Date(to);
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Kembalikan jumlah hari tersisa dari sekarang hingga tanggal kadaluwarsa.
 * Nilai negatif berarti sudah kedaluwarsa.
 */
export function daysRemaining(subscriptionUntil: string): number {
  return daysBetween(toDateOnly(new Date()), subscriptionUntil);
}

/** Hari ini dalam format YYYY-MM-DD */
export function today(): string {
  return toDateOnly(new Date());
}
