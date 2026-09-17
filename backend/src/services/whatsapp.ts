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
}

const sessions = new Map<string, TenantWASession>();

const SESSIONS_BASE_DIR = path.resolve(process.cwd(), "data", "wa_sessions");

// Ensure base sessions directory exists
if (!fs.existsSync(SESSIONS_BASE_DIR)) {
  fs.mkdirSync(SESSIONS_BASE_DIR, { recursive: true });
}

export function getSessionDir(tenantId: string): string {
  const safeTenantId = tenantId.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(SESSIONS_BASE_DIR, `session_${safeTenantId}`);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

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

export async function initWhatsAppSession(tenantId: string, forceRefresh = false) {
  let session = sessions.get(tenantId);

  // If force refresh requested, close old socket first if not fully connected
  if (forceRefresh && session) {
    if (session.sock && session.status !== "connected") {
      try {
        session.sock.end(undefined);
      } catch {}
      sessions.delete(tenantId);
      session = undefined;
    }
  }

  // If already connected, return existing session status
  if (session && session.status === "connected" && session.sock) {
    return {
      status: session.status,
      connectedUser: session.connectedUser,
      qrCodeDataUrl: null,
    };
  }

  // If already waiting for QR code and not forcing refresh, return existing QR
  if (!forceRefresh && session && session.status === "qrcode" && session.qrCodeDataUrl) {
    return {
      status: session.status,
      qrCodeDataUrl: session.qrCodeDataUrl,
      connectedUser: null,
    };
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
  };
  sessions.set(tenantId, session);

  const sock = makeWASocket({
    version,
    auth: state,
    logger: pino({ level: "silent" }),
    printQRInTerminal: false,
    browser: ["Orchid Smart Laundry", "Chrome", "1.0.0"],
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
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
          color: {
            dark: "#0a192f",
            light: "#ffffff",
          },
        });
        session!.qrCodeDataUrl = qrCodeDataUrl;
        session!.status = "qrcode";
        console.log(`[Baileys WA] QR Code generated for tenant: ${tenantId}`);
      } catch (err: any) {
        console.error(`[Baileys WA] Failed to generate QR code:`, err);
      }
    }

    if (connection === "open") {
      session!.status = "connected";
      session!.qrCodeDataUrl = null;
      session!.lastError = null;
      session!.connectedUser = {
        id: sock.user?.id ? sock.user.id.split(":")[0] : "",
        name: sock.user?.name || "Orchid WhatsApp Gateway",
      };
      console.log(`✅ [Baileys WA] WhatsApp connected for tenant: ${tenantId} (${session!.connectedUser.id})`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `[Baileys WA] Connection closed for tenant: ${tenantId}. Code: ${statusCode}. Reconnecting: ${shouldReconnect}`
      );

      if (statusCode === DisconnectReason.loggedOut) {
        // Logout: clear credentials directory
        session!.status = "disconnected";
        session!.sock = null;
        session!.connectedUser = null;
        session!.qrCodeDataUrl = null;
        try {
          fs.rmSync(sessionDir, { recursive: true, force: true });
        } catch {}
      } else if (shouldReconnect) {
        session!.status = "connecting";
        setTimeout(() => {
          if (sessions.has(tenantId)) {
            initWhatsAppSession(tenantId).catch(console.error);
          }
        }, 5000);
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

export async function disconnectWhatsApp(tenantId: string) {
  const session = sessions.get(tenantId);
  if (session && session.sock) {
    try {
      await session.sock.logout();
    } catch {}
    try {
      session.sock.end(undefined);
    } catch {}
  }

  sessions.delete(tenantId);

  // Clean up disk credentials
  const sessionDir = path.join(
    SESSIONS_BASE_DIR,
    `session_${tenantId.replace(/[^a-zA-Z0-9_-]/g, "_")}`
  );
  try {
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`Error deleting session dir:`, err);
  }

  console.log(`🛑 [Baileys WA] Disconnected and cleared session for tenant: ${tenantId}`);
  return { success: true, message: "WhatsApp berhasil diputuskan dan sesi telah dibersihkan." };
}

export async function sendWhatsAppMessage(
  tenantId: string,
  toPhone: string,
  text: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const session = sessions.get(tenantId);

  if (!session || session.status !== "connected" || !session.sock) {
    return {
      success: false,
      error: "WhatsApp belum terhubung. Silakan hubungkan WhatsApp melalui scan QR Code di Pengaturan.",
    };
  }

  try {
    // Format phone to 62xxx
    let cleanPhone = toPhone.replace(/[^0-9]/g, "");
    if (cleanPhone.startsWith("0")) {
      cleanPhone = "62" + cleanPhone.slice(1);
    } else if (!cleanPhone.startsWith("62")) {
      cleanPhone = "62" + cleanPhone;
    }

    const jid = `${cleanPhone}@s.whatsapp.net`;
    const result = await session.sock.sendMessage(jid, { text });

    return {
      success: true,
      messageId: result?.key?.id || undefined,
    };
  } catch (err: any) {
    console.error(`[Baileys WA] Failed to send message to ${toPhone}:`, err);
    return {
      success: false,
      error: err.message || "Gagal mengirim pesan melalui Baileys WhatsApp Gateway",
    };
  }
}

export async function autoRestoreSavedSessions() {
  try {
    const allTenants = await db.select().from(tenants).where(eq(tenants.waMode, "baileys"));
    for (const t of allTenants) {
      const dir = getSessionDir(t.id);
      if (fs.existsSync(path.join(dir, "creds.json"))) {
        console.log(`[Baileys WA] Auto-restoring session for tenant: ${t.id} (${t.outletName})`);
        initWhatsAppSession(t.id).catch((err) => {
          console.error(`[Baileys WA] Failed to auto-restore session for ${t.id}:`, err);
        });
      }
    }
  } catch (err) {
    console.error("[Baileys WA] Error restoring sessions on startup:", err);
  }
}


