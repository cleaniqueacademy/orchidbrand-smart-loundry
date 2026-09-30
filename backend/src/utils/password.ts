/**
 * Utility untuk generate password acak yang aman dan mudah dibaca.
 * Menghasilkan kombinasi huruf kapital, huruf kecil, dan angka (alfanumerik)
 * yang mudah di-double-click dan di-copy dari terminal tanpa karakter rancu.
 */
export function generateRandomPassword(length = 10, includeSpecial = false): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const lower = "abcdefghjkmnpqrstuvwxyz";
  const digits = "23456789";
  const special = "!@#$%&*";
  const pool = includeSpecial ? upper + lower + digits + special : upper + lower + digits;

  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const res: string[] = [
    upper[bytes[0] % upper.length],
    lower[bytes[1] % lower.length],
    digits[bytes[2] % digits.length],
  ];

  if (includeSpecial && length > 3) {
    res.push(special[bytes[3] % special.length]);
  }

  for (let i = res.length; i < length; i++) {
    res.push(pool[bytes[i] % pool.length]);
  }

  // Shuffle hasil agar posisi karakter bervariasi
  const shuffleBytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = res.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    [res[i], res[j]] = [res[j], res[i]];
  }

  return res.join("");
}
