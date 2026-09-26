/**
 * Utility tanggal — semua tanggal disimpan sebagai string ISO (YYYY-MM-DD).
 */

/**
 * Tambah N hari ke tanggal dasar (default: hari ini).
 * Menerima string YYYY-MM-DD atau Date object.
 * Mengembalikan string ISO date tanpa time component (YYYY-MM-DD).
 */
export function addDays(a: number | string | Date, b?: number | string | Date): string {
  let days: number;
  let base: Date;

  if (typeof a === "number") {
    days = a;
    if (!b) {
      base = new Date();
    } else if (typeof b === "string") {
      base = new Date(`${b}T00:00:00`);
    } else {
      base = new Date(b);
    }
  } else {
    // a is base date, b is days
    days = typeof b === "number" ? b : 0;
    base = typeof a === "string" ? new Date(`${a}T00:00:00`) : new Date(a);
  }

  if (isNaN(base.getTime())) {
    base = new Date();
  }

  base.setDate(base.getDate() + days);
  return toDateOnly(base);
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
