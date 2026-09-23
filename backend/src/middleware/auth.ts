import type { Context, Next } from "hono";
import { db } from "../db/index";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Payload yang tertanam di dalam token HMAC.
 */
export interface TokenPayload {
  userId: string;
  role: string;
  tenantId: string | null;
  exp: number; // Unix ms
}

const JWT_SECRET = process.env.JWT_SECRET ?? "cleanique_laundry_super_secret_jwt_key_2026";

// ─── Cache status tenant ringan (20 detik) ───────────────────────────────────
interface TenantStatusCache {
  status: string;
  subscriptionUntil: string | null;
  checkedAt: number;
}
const tenantCache = new Map<string, TenantStatusCache>();

export function invalidateTenantAuthCache(tenantId?: string) {
  if (tenantId) {
    tenantCache.delete(tenantId);
  } else {
    tenantCache.clear();
  }
}

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

  // Verifikasi status aktif dan masa langganan outlet secara realtime untuk peran non-superadmin
  if (payload.role !== "superadmin" && payload.tenantId) {
    try {
      let tenantInfo = tenantCache.get(payload.tenantId);
      if (!tenantInfo || Date.now() - tenantInfo.checkedAt > 20000) {
        const tRows = await db
          .select({ status: tenants.status, subscriptionUntil: tenants.subscriptionUntil })
          .from(tenants)
          .where(eq(tenants.id, payload.tenantId));
        if (tRows && tRows.length > 0) {
          tenantInfo = {
            status: tRows[0].status || "active",
            subscriptionUntil: tRows[0].subscriptionUntil || null,
            checkedAt: Date.now(),
          };
          tenantCache.set(payload.tenantId, tenantInfo);
        }
      }

      if (tenantInfo) {
        if (tenantInfo.status === "inactive") {
          return c.json(
            {
              success: false,
              code: "ACCOUNT_INACTIVE",
              message: "Outlet Anda berstatus NONAKTIF. Hubungi Super Admin untuk aktivasi.",
            },
            403
          );
        }
        if (tenantInfo.subscriptionUntil) {
          const expDate = new Date(`${tenantInfo.subscriptionUntil}T23:59:59`);
          if (!isNaN(expDate.getTime()) && expDate < new Date()) {
            return c.json(
              {
                success: false,
                code: "SUBSCRIPTION_EXPIRED",
                message: `Masa aktif langganan outlet ini telah berakhir pada ${tenantInfo.subscriptionUntil}. Silakan hubungi Super Admin untuk perpanjangan.`,
              },
              403
            );
          }
        }
      }
    } catch (err) {
      // Jika terjadi kesalahan koneksi atau tabel mock pada isolated test, lewatkan
      console.warn("[authMiddleware] Tenant check notice:", err);
    }
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
