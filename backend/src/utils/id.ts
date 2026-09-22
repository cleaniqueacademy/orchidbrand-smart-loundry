/**
 * Utility: ID generator yang konsisten.
 * Format: `{prefix}-{timestamp}-{random5}`
 * Contoh: newId("ref") → "ref-1748000000000-a3k9z"
 */
export function newId(prefix: string): string {
  const ts = Date.now().toString(36); // base-36 ≈ 8 karakter
  const rand = Math.random().toString(36).substring(2, 7); // 5 karakter
  return `${prefix}-${ts}-${rand}`;
}
