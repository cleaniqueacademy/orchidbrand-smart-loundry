import type { Context, Next } from "hono";
import { db } from "../db/index";
import { tenants, users } from "../db/schema";
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

import { config } from "../config";
const JWT_SECRET = config.jwtSecret;

// Authorization is resolved from current database identity, without an allow-on-error cache.
export function invalidateTenantAuthCache(_tenantId?: string, _userId?: string) {}
import { resolveSession, validCsrf } from "../services/sessions";
import { today } from "../utils/date";

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
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(JWT_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
  return crypto.subtle.verify("HMAC", key, Buffer.from(sig, "base64url"), new TextEncoder().encode(data));
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
  try {
    const identity = await resolveSession(c);
    if (!identity) return c.json({ success: false, message: "Silakan login kembali" }, 401);
    const { user, session } = identity;
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && !validCsrf(c, session.csrfHash)) {
      return c.json({ success: false, message: "Validasi keamanan request gagal" }, 403);
    }
    const authPath = c.req.path.startsWith("/api/auth/");
    if (!["superadmin","tenant_owner","staff","marketing"].includes(user.role)) return c.json({success:false,message:"Role tidak diizinkan"},403);
    if (user.role === "marketing" && !authPath && !/^\/api\/(marketing|referral-codes)(?:\/|$)/.test(c.req.path) && c.req.path !== "/api/ai/chat") return c.json({success:false,message:"Akses operasional hanya untuk Owner/staf cabang"},403);
    if ((user.status !== "active" || user.suspendedAt || user.archivedAt) && !authPath) {
      return c.json({ success: false, code: "ACCOUNT_SUSPENDED", message: "Akun diblokir atau diarsipkan. Hubungi admin." }, 403);
    }
    let tenantId = user.tenantId;
    const selected = c.req.header("X-Tenant-Id");
    if (user.role === "tenant_owner" && !selected) {
      const branches = await db.select().from(tenants).where(eq(tenants.userId,user.id)).orderBy(tenants.createdAt,tenants.id);
      const available = branches.filter(branch=>branch.status === "active" && !branch.archivedAt && !branch.suspendedAt);
      tenantId = available.find(branch=>branch.id === user.tenantId)?.id || available[0]?.id || branches.find(branch=>branch.id === user.tenantId)?.id || branches[0]?.id || null;
    }
    if (selected && selected !== tenantId && user.role !== "superadmin") {
      if (user.role !== "tenant_owner") return c.json({ success: false, message: "Akses cabang ditolak" }, 403);
      tenantId = selected;
    }
    const billingPath = user.role === "tenant_owner" && (
      authPath || (c.req.method === "GET" && c.req.path === "/api/my-branches") || /^\/api\/subscription(?:\/|$)/.test(c.req.path) ||
      /^\/api\/payments\/midtrans\/invoices\//.test(c.req.path) || c.req.path === "/api/upload" ||
      /^\/uploads\/(payments|general)\//.test(c.req.path)
    );
    if (["tenant_owner", "staff"].includes(user.role)) {
      if (!tenantId) return c.json({ success: false, message: "Cabang tidak ditemukan" }, 403);
      const [branch] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
      if (!branch || (user.role === "tenant_owner" && branch.userId !== user.id)) return c.json({ success: false, message: "Akses cabang ditolak" }, 403);
      const [owner] = await db.select().from(users).where(eq(users.id, branch.userId));
      if (!owner || owner.archivedAt || owner.suspendedAt || owner.status !== "active") {
        if (!authPath) return c.json({ success: false, code: "ACCOUNT_SUSPENDED", message: "Cabang atau Owner diblokir/diarsipkan" }, 403);
      }
      if ((branch.archivedAt || branch.suspendedAt || branch.status !== "active") && !billingPath && !authPath) return c.json({ success: false, code: "ACCOUNT_SUSPENDED", message: "Cabang diblokir/diarsipkan" }, 403);
      if (user.role === "staff" && owner?.tier !== "premium" && !authPath) return c.json({ success: false, message: "Staf membutuhkan Premium" }, 403);
      const until = owner?.subscriptionUntil || branch.subscriptionUntil;
      if ((!until || !/^\d{4}-\d{2}-\d{2}$/.test(until) || until < today()) && !billingPath && !authPath) {
        return c.json({ success: false, code: "SUBSCRIPTION_EXPIRED", message: "Langganan berakhir. Owner dapat melakukan perpanjangan." }, 403);
      }
    }
    c.set("user", { userId: user.id, role: user.role, tenantId, exp: session.expiresAt.getTime() } satisfies TokenPayload);
    c.set("sessionUser", user);
  } catch {
    console.error("[auth] identity validation unavailable");
    return c.json({ success: false, message: "Validasi akses sedang tidak tersedia" }, 503);
  }
  await next();
}

/**
 * Helper: ambil payload user dari context (setelah authMiddleware).
 */
export function getUser(c: Context): TokenPayload {
  return c.get("user") as TokenPayload;
}
