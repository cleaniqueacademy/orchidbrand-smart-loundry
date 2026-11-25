import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { authSessions, users } from "../db/schema";
import { config } from "../config";

export const sessionCookie = config.production ? "__Host-cleanique_session" : "cleanique_session";
export const csrfCookie = config.production ? "__Host-cleanique_csrf" : "cleanique_csrf";
const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export async function createSession(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user || user.status !== "active" || user.archivedAt || user.suspendedAt) throw new Error("Akun tidak dapat membuat sesi");
  const token = randomBytes(32).toString("base64url"), csrfToken = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 7 * 86400000);
  await db.insert(authSessions).values({ id: digest(token), userId, authVersion: user.authVersion, csrfHash: digest(csrfToken), expiresAt });
  return { token, csrfToken, expiresAt };
}
export async function issueSession(c: Context, userId: string) {
  await revokeSession(c);
  const session = await createSession(userId);
  const options = { secure: config.production, sameSite: "Lax" as const, path: "/", maxAge: 7 * 86400 };
  setCookie(c, sessionCookie, session.token, { ...options, httpOnly: true });
  setCookie(c, csrfCookie, session.csrfToken, options);
}
export async function resolveSession(c: Context) {
  const token = getCookie(c, sessionCookie);
  if (!token || token.length > 128) return null;
  const [session] = await db.select().from(authSessions).where(eq(authSessions.id, digest(token)));
  if (!session || session.expiresAt.getTime() <= Date.now()) return null;
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  if (!user || user.authVersion !== session.authVersion) return null;
  return { user, session };
}
export function normalizeSingleOrigin(raw?: string): string | null {
  if (!raw) return null;
  const parts = raw.split(",").map(part => part.trim());
  if (!parts.length || parts.some(part => !part)) return null;
  return new Set(parts).size === 1 ? parts[0] : null;
}

export function validRequestOrigin(c: Context) {
  const raw = c.req.header("Origin");
  if (config.production) return normalizeSingleOrigin(raw) === config.origin;
  if (!raw) return true; // Non-browser integration clients still require a session-bound CSRF token.
  const origin = normalizeSingleOrigin(raw);
  if (!origin) return false;
  try { const parsed = new URL(origin); return parsed.protocol === "http:" && ["localhost", "127.0.0.1"].includes(parsed.hostname); } catch { return false; }
}
export function validCsrf(c: Context, hash: string) {
  const token = c.req.header("X-CSRF-Token");
  if (!token || token.length > 128 || !validRequestOrigin(c)) return false;
  return timingSafeEqual(Buffer.from(digest(token), "hex"), Buffer.from(hash, "hex"));
}
export async function revokeSession(c: Context) {
  const token = getCookie(c, sessionCookie);
  if (token) await db.delete(authSessions).where(eq(authSessions.id, digest(token)));
  deleteCookie(c, sessionCookie, { path: "/", secure: config.production });
  deleteCookie(c, csrfCookie, { path: "/", secure: config.production });
}
