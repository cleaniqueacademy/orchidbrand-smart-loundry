/**
 * Preset layanan laundry default yang di-seed untuk setiap tenant baru.
 * Dipindah dari index.ts agar dapat dipakai ulang oleh signupService dan endpoint lainnya.
 */
export const DEFAULT_PRESET_SERVICES = [
  { name: "Cuci Komplit Reguler", unit: "kg", pricePerUnit: 8000, minOrder: 3, durationHours: 48 },
  { name: "Cuci Komplit Kilat", unit: "kg", pricePerUnit: 12000, minOrder: 2, durationHours: 24 },
  { name: "Cuci Komplit Express", unit: "kg", pricePerUnit: 16000, minOrder: 1, durationHours: 6 },
  { name: "Cuci Kering Saja", unit: "kg", pricePerUnit: 6000, minOrder: 2, durationHours: 24 },
  { name: "Setrika Uap Saja", unit: "kg", pricePerUnit: 6000, minOrder: 2, durationHours: 24 },
  { name: "Cuci Bedcover King", unit: "pcs", pricePerUnit: 35000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Bedcover Single", unit: "pcs", pricePerUnit: 25000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Sepatu Premium", unit: "pasang", pricePerUnit: 25000, minOrder: 1, durationHours: 48 },
  { name: "Cuci Karpet", unit: "meter", pricePerUnit: 15000, minOrder: 1, durationHours: 72 },
  { name: "Cuci Selimut", unit: "pcs", pricePerUnit: 20000, minOrder: 1, durationHours: 48 },
] as const;

/** Harga bulanan default platform (rupiah) jika belum dikonfigurasi via plans */
export const DEFAULT_MONTHLY_PRICE = 150_000;
