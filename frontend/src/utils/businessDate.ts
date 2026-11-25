/** Calendar dates and report boundaries follow the release business timezone, independent of VPS timezone. */
export function businessDateKey(value: Date | string = new Date()): string {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date) : "";
}
