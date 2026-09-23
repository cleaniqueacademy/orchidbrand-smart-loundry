import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import fs from "fs";
import path from "path";
import { db } from "../db/index";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";

export interface TenantWASession {
  tenantId: string;
  sock: any | null;
  status: "disconnected" | "connecting" | "qrcode" | "connected";
  qrCodeDataUrl: string | null;
  connectedUser: { id: string; name?: string } | null;
  lastError: string | null;
  reconnectAttempts: number; // untuk backoff eksponensial
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

const sessions = new Map<string, TenantWASession>();

// Rate limiter: catat kapan terakhir tiap nomor dikirimi pesan
const lastSentMap = new Map<string, number>(); // key: `${tenantId}:${phone}` → timestamp ms
const RATE_LIMIT_MS = 60_000; // 60 detik cooldown per nomor per tenant
const MAX_RECONNECT_ATTEMPTS = 8;
const CIRCUIT_BREAKER_COOLDOWN_MS = 15 * 60_000;

const SESSIONS_BASE_DIR = path.resolve(process.cwd(), "data", "wa_sessions");

if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Jeda acak antara min–max ms, agar pola kirim tidak terlihat seperti bot */
function randomDelay(minMs: number, maxMs: number): Promise<void> {
  const ms = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Hitung delay reconnect dengan backoff eksponensial, max 5 menit */
function backoffDelay(attempt: number): number {
  const base = 5_000; // 5 detik
  const max = 300_000; // 5 menit
  return Math.min(base * Math.pow(3, attempt), max); // 5s → 15s → 45s → 135s → 300s
}

function clearReconnectTimer(session: TenantWASession | undefined): void {
  if (session?.reconnectTimer) {
    clearTimeout(session.reconnectTimer);
    session.reconnectTimer = undefined;
  }
}

function clearSessionCredentials(sessionDir: string): void {
  try {
    fs.rmSync(sessionDir, { recursive: true, force: true });
  } catch (error) {
    console.error(`[WA] Failed to clear credentials at ${sessionDir}:`, error);
  }
}

// ─── Session dir ─────────────────────────────────────────────────────────────

export function getSessionDir(tenantId: string): string {
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(SESSIONS_BASE_DIR, `session_${safeTenantId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// ─── Status ──────────────────────────────────────────────────────────────────

export function getWhatsAppStatus(tenantId: string) {
  const session = sessions.get(tenantId);
  const dir = getSessionDir(tenantId);
  const hasCreds = fs.existsSync(path.join(dir, "creds.json"));

  if (!session) {
    return {
      status: "disconnected" as const,
      qrCodeDataUrl: null,
      connectedUser: null,
      lastError: null,
      hasSavedCredentials: hasCreds,
    };
  }
  return {
    status: session.status,
    qrCodeDataUrl: session.qrCodeDataUrl,
    connectedUser: session.connectedUser,
    lastError: session.lastError,
    hasSavedCredentials: hasCreds,
  };
}

// ─── Init Session ─────────────────────────────────────────────────────────────

export async function initWhatsAppSession(tenantId: string, forceRefresh = false) {
  let session = sessions.get(tenantId);

  if (forceRefresh && session) {
    clearReconnectTimer(session);
    if (session.sock && session.status !== "connected") {
      try { session.sock.end(undefined); } catch {}
      sessions.delete(tenantId);
      session = undefined;
    }
  }

  if (session && session.status === "connected" && session.sock) {
    return { status: session.status, connectedUser: session.connectedUser, qrCodeDataUrl: null };
  }

  if (!forceRefresh && session && session.status === "qrcode" && session.qrCodeDataUrl) {
    return { status: session.status, qrCodeDataUrl: session.qrCodeDataUrl, connectedUser: null };
  }

  // Prevent concurrent callers from opening duplicate sockets for one tenant.
  if (!forceRefresh && session && session.status === "connecting") {
    return { status: session.status, qrCodeDataUrl: null, connectedUser: null };
  }

  const sessionDir = getSessionDir(tenantId);
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  session = {
    tenantId,
    sock: null,
    status: "connecting",
    qrCodeDataUrl: null,
    connectedUser: null,
    lastError: null,
    reconnectAttempts: session?.reconnectAttempts ?? 0,
  };
  sessions.set(tenantId, session);

  // FIX #1: Gunakan fingerprint WhatsApp Web yang valid & tidak mencurigakan
  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["WhatsApp Web", "Chrome", "2.2342.15"],
    connectTimeoutMs: 60_000,
    defaultQueryTimeoutMs: 60_000,
    keepAliveIntervalMs: 25_000,
  });

  session.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrCodeDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          scale: 6,
          color: { dark: "#0a192f", light: "#ffffff" },
        });
        if (sessions.get(tenantId) !== session) return;
        session.qrCodeDataUrl = qrCodeDataUrl;
        session.status = "qrcode";
        console.log(`[WA] QR Code generated for tenant: ${tenantId}`);
      } catch (err: any) {
        console.error(`[WA] Failed to generate QR code:`, err);
      }
    }

    if (connection === "open") {
      if (sessions.get(tenantId) !== session) return;
      clearReconnectTimer(session);
      session!.status = "connected";
      session!.qrCodeDataUrl = null;
      session!.lastError = null;
      session!.reconnectAttempts = 0; // reset counter saat berhasil konek
      session!.connectedUser = {
        id: sock.user?.id ? sock.user.id.split(":")[0] : "",
        name: sock.user?.name || "WhatsApp Gateway",
      };
      try {
        await db.update(tenants).set({ waMode: "baileys" }).where(eq(tenants.id, tenantId));
      } catch {}
      console.log(`✅ [WA] Connected for tenant: ${tenantId} (${session!.connectedUser.id})`);
    }

    if (connection === "close") {
      if (sessions.get(tenantId) !== session) return;
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;
      const isBadSession = statusCode === DisconnectReason.badSession;
      const shouldReconnect = !isLoggedOut && !isBadSession;

      console.log(`[WA] Connection closed for tenant: ${tenantId}. Code: ${statusCode}. Reconnect: ${shouldReconnect}`);

      session!.sock = null;
      session!.connectedUser = null;
      session!.qrCodeDataUrl = null;
      session!.lastError = `Koneksi ditutup (code ${statusCode ?? "unknown"})`;

      if (isLoggedOut || isBadSession) {
        // Invalid/corrupt credentials must not be retried indefinitely.
        session!.status = "disconnected";
        session!.reconnectAttempts = 0;
        clearSessionCredentials(sessionDir);
        if (isBadSession) {
          session!.lastError = "Kredensial WhatsApp tidak valid; sesi dihapus, silakan scan QR ulang.";
        }
      } else if (shouldReconnect && sessions.has(tenantId)) {
        session!.status = "connecting";
        session!.reconnectAttempts = (session!.reconnectAttempts || 0) + 1;

        if (session!.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
          session!.status = "disconnected";
          session!.lastError = `Reconnect dihentikan setelah ${MAX_RECONNECT_ATTEMPTS} percobaan.`;
          console.error(`[WA] Circuit breaker open for tenant: ${tenantId}`);
          session!.reconnectTimer = setTimeout(() => {
            if (sessions.get(tenantId) === session) {
              session!.reconnectAttempts = 0;
              session!.lastError = null;
            }
            session!.reconnectTimer = undefined;
          }, CIRCUIT_BREAKER_COOLDOWN_MS);
          session!.reconnectTimer.unref?.();
          return;
        }

        // FIX #4: Backoff eksponensial — semakin sering disconnect, semakin lama tunggu
        const delay = backoffDelay(session!.reconnectAttempts - 1);
        console.log(`[WA] Reconnect attempt #${session!.reconnectAttempts} in ${delay / 1000}s for tenant: ${tenantId}`);

        clearReconnectTimer(session);
        session!.reconnectTimer = setTimeout(() => {
          session!.reconnectTimer = undefined;
          if (sessions.get(tenantId) === session && session!.status === "connecting") {
            initWhatsAppSession(tenantId).catch(console.error);
          }
        }, delay);
      } else {
        session!.status = "disconnected";
        session!.sock = null;
      }
    }
  });

  return {
    status: session.status,
    qrCodeDataUrl: session.qrCodeDataUrl,
    connectedUser: session.connectedUser,
  };
}

// ─── Disconnect ───────────────────────────────────────────────────────────────

export async function disconnectWhatsApp(tenantId: string) {
  const session = sessions.get(tenantId);
  clearReconnectTimer(session);
  if (session && session.sock) {
    try { await session.sock.logout(); } catch {}
    try { session.sock.end(undefined); } catch {}
  }

  sessions.delete(tenantId);

  const sessionDir = path.join(
    SESSIONS_BASE_DIR,
    `session_${tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
  );
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[WA] Error deleting session dir:`, err);
  }

  console.log(`🛑 [WA] Disconnected and cleared session for tenant: ${tenantId}`);
  return { success: true, message: "WhatsApp berhasil diputuskan dan sesi telah dibersihkan." };
}

// ─── Send Message ─────────────────────────────────────────────────────────────

export async function sendWhatsAppMessage(
  tenantId: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string; skipped?: boolean }> {
  const session = sessions.get(tenantId);

  if (!session || session.status !== "connected" || !session.sock) {
    return {
      success: false,
      error: "WhatsApp belum terhubung. Silakan hubungkan WhatsApp melalui scan QR Code di Pengaturan.",
    };
  }

  // Format nomor ke 62xxx
  let cleanPhone = toPhone.replace(/[^0-9]/g, "");
  if (cleanPhone.startsWith("0")) {
    cleanPhone = "62" + cleanPhone.slice(1);
  } else if (!cleanPhone.startsWith("62")) {
    cleanPhone = "62" + cleanPhone;
  }

  // FIX #5: Rate limit — jangan kirim ke nomor yang sama dalam 60 detik
  const rateKey = `${tenantId}:${cleanPhone}`;
  const lastSent = lastSentMap.get(rateKey) || 0;
  const now = Date.now();
  if (now - lastSent < RATE_LIMIT_MS) {
    const remainSec = Math.ceil((RATE_LIMIT_MS - (now - lastSent)) / 1000);
    console.warn(`[WA] Rate limit hit for ${cleanPhone} — skip (cooldown ${remainSec}s)`);
    return {
      success: true, // dianggap sukses agar tidak error di UI
      skipped: true,
      error: `Notifikasi ke nomor ini sudah dikirim baru-baru ini (cooldown ${remainSec}s).`,
    };
  }

  try {
    // FIX #2: Delay acak 3–20 detik sebelum kirim (aman karena ini cuma notifikasi)
    const delayMs = Math.floor(Math.random() * (20_000 - 3_000 + 1)) + 3_000;
    console.log(`[WA] Sending to ${cleanPhone} in ${(delayMs / 1000).toFixed(1)}s...`);
    await randomDelay(3_000, 20_000);

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, { text });

    // Catat timestamp setelah berhasil kirim
    lastSentMap.set(rateKey, Date.now());

    return {
      success: true,
      messageId: result?.key?.id || undefined,
    };
  } catch (err: any) {
    console.error(`[WA] Failed to send message to ${cleanPhone}:`, err);
    return {
      success: false,
      error: err.message || "Gagal mengirim pesan melalui WhatsApp Gateway",
    };
  }
}

// ─── Auto Restore Sessions on Startup ────────────────────────────────────────

export async function autoRestoreSavedSessions() {
  try {
    const allTenants = await db.select().from(tenants);
    const tenantsWithCreds = allTenants.filter((t) => {
      const dir = getSessionDir(t.id);
      return fs.existsSync(path.join(dir, "creds.json"));
    });

    if (tenantsWithCreds.length === 0) return;

    console.log(`[WA] Auto-restoring ${tenantsWithCreds.length} session(s)...`);

    // FIX #3: Restore bertahap dengan jeda 4–7 detik antar tenant
    // agar tidak membuka banyak koneksi WA sekaligus
    for (let i = 0; i < tenantsWithCreds.length; i++) {
      const t = tenantsWithCreds[i];
      if (i > 0) {
        const jeda = Math.floor(Math.random() * (7_000 - 4_000 + 1)) + 4_000;
        await randomDelay(4_000, 7_000);
        console.log(`[WA] Restoring session ${i + 1}/${tenantsWithCreds.length} after ${jeda}ms delay`);
      }
      try {
        await db.update(tenants).set({ waMode: "baileys" }).where(eq(tenants.id, t.id));
      } catch {}
      console.log(`[WA] Restoring session for: ${t.id} (${t.outletName})`);
      initWhatsAppSession(t.id).catch((err) => {
        console.error(`[WA] Failed to restore session for ${t.id}:`, err);
      });
    }
  } catch (err) {
    console.error("[WA] Error restoring sessions on startup:", err);
  }
}
