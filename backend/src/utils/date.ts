/** All persisted business dates are YYYY-MM-DD in Asia/Jakarta; instants remain UTC ISO. */
const DAY = 86400000;
export function toDateOnly(date: Date): string {
  if (!Number.isFinite(date.getTime())) throw new Error("Tanggal tidak valid");
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
export function today(): string { return toDateOnly(new Date()); }
function businessDate(value: string | Date): string { return typeof value === "string" ? value : toDateOnly(value); }
function ordinal(value: string | Date): number {
  const text = businessDate(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Tanggal bisnis tidak valid");
  const time = Date.parse(text + "T00:00:00Z");
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0, 10) !== text) throw new Error("Tanggal bisnis tidak valid");
  return time;
}
export function addDays(a: number | string | Date, b?: number | string | Date): string {
  const days = typeof a === "number" ? a : typeof b === "number" ? b : 0;
  const base = typeof a === "number" ? (typeof b === "string" || b instanceof Date ? b : today()) : a;
  if (!Number.isInteger(days)) throw new Error("Jumlah hari tidak valid");
  return new Date(ordinal(base) + days * DAY).toISOString().slice(0, 10);
}
export function daysBetween(from: string | Date, to: string | Date): number { return Math.round((ordinal(to) - ordinal(from)) / DAY); }
export function daysRemaining(until: string): number { return daysBetween(today(), until); }
