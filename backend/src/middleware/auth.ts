import type { Context, Next } from "hono";

/**
 * Payload yang tertanam di dalam token HMAC.
 */
export interface TokenPayload {
  userId: string;
  role: string;
  tenantId: string | null;
  exp: number; // Unix ms
}

const JWT_SECRET = process.env.JWT_SECRET ?? "orchid_brand_super_secret_jwt_key_2026";

// ─── HMAC-SHA256 helpers (Bun built-in crypto) ───────────────────────────────

async function hmacSign(data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Buffer.from(sig).toString("base64url");
}

async function hmacVerify(data: string, sig: string): Promise<boolean> {
  const expected = await hmacSign(data);
  return expected === sig;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Buat token HMAC-signed dari payload.
 * Format: base64url(payload) + "." + HMAC-SHA256(base64url(payload))
 */
export async function signToken(payload: Omit<TokenPayload, "exp"> & { exp?: number }): Promise<string> {
  const full: TokenPayload = {
    ...payload,
    exp: payload.exp ?? Date.now() + 7 * 24 * 3600 * 1000, // 7 hari
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString("base64url");
  const sig = await hmacSign(encoded);
  return `${encoded}.${sig}`;
}

/**
 * Verifikasi dan decode token.
 * Mengembalikan payload jika valid, null jika tidak.
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const dotIdx = token.lastIndexOf(".");
    if (dotIdx === -1) return null;

    const encoded = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    const valid = await hmacVerify(encoded, sig);
    if (!valid) return null;

    const payload: TokenPayload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf-8")
    );

    if (payload.exp < Date.now()) return null; // kedaluwarsa

    return payload;
  } catch {
    return null;
  }
}

/**
 * Middleware autentikasi.
 * Set context variable `user` jika token valid.
 * Mengembalikan 401 jika token tidak ada atau tidak valid.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return c.json({ success: false, message: "Token autentikasi diperlukan" }, 401);
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return c.json({ success: false, message: "Token tidak valid atau telah kedaluwarsa" }, 401);
  }

  c.set("user", payload);
  await next();
}

/**
 * Helper: ambil payload user dari context (setelah authMiddleware).
 */
export function getUser(c: Context): TokenPayload {
  return c.get("user") as TokenPayload;
}
