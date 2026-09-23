import { Hono } from "hono";
import { db } from "../db/index";
import { tenants, waLogs } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  getWhatsAppStatus,
  initWhatsAppSession,
  disconnectWhatsApp,
  sendWhatsAppMessage,
} from "../services/whatsapp";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const whatsappRoutes = new Hono();

// Wajibkan autentikasi Bearer token pada seluruh endpoint WhatsApp
whatsappRoutes.use("*", authMiddleware);

async function resolveTenantId(rawTenantId?: string): Promise<string> {
  if (!rawTenantId || rawTenantId === "all") {
    const list = await db.select().from(tenants).limit(1);
    return list[0]?.id || "tenant-01";
  }
  return rawTenantId;
}

function hasTenantPermission(c: any, targetTenantId: string): boolean {
  const user = getUser(c);
  if (!user) return false;
  if (user.role === "superadmin") return true;
  return user.tenantId === targetTenantId;
}

// 1. Get WhatsApp Status for Tenant
whatsappRoutes.get("/status", async (c) => {
  try {
    const user = getUser(c);
    const requestedTenantId = c.req.query("tenantId");
    if (requestedTenantId && requestedTenantId !== "all" && user.role !== "superadmin" && user.tenantId && requestedTenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Anda tidak memiliki akses ke WhatsApp outlet ini" }, 403);
    }

    const tenantId = user.role === "superadmin" && requestedTenantId
      ? requestedTenantId
      : (user.tenantId || (await resolveTenantId(requestedTenantId)));

    if (!hasTenantPermission(c, tenantId)) {
      return c.json({ success: false, message: "Akses ditolak: Anda tidak memiliki akses ke WhatsApp outlet ini" }, 403);
    }

    const tenantResults = await db.select().from(tenants).where(eq(tenants.id, tenantId));
    const currentTenant = tenantResults[0];
    const waStatus = getWhatsAppStatus(tenantId);

    return c.json({
      success: true,
      data: {
        ...waStatus,
        tenantId,
        outletName: currentTenant?.outletName || "Outlet Laundry",
        waMode: currentTenant?.waMode || "manual",
      },
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 2. Connect / Request QR Code (Khusus Owner / Superadmin)
whatsappRoutes.post("/connect", requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (body.tenantId && user.role !== "superadmin" && user.tenantId && body.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    const targetTenantId = user.role === "superadmin" && body.tenantId
      ? body.tenantId
      : (user.tenantId || (await resolveTenantId(body.tenantId)));

    if (!hasTenantPermission(c, targetTenantId)) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    const forceRefresh = Boolean(body.forceRefresh);
    const result = await initWhatsAppSession(targetTenantId, forceRefresh);
    return c.json({ success: true, data: { ...result, tenantId: targetTenantId } });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Disconnect WhatsApp Session (Khusus Owner / Superadmin)
whatsappRoutes.post("/disconnect", requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const body = await c.req.json().catch(() => ({}));
    if (body.tenantId && user.role !== "superadmin" && user.tenantId && body.tenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    const targetTenantId = user.role === "superadmin" && body.tenantId
      ? body.tenantId
      : (user.tenantId || (await resolveTenantId(body.tenantId)));

    if (!hasTenantPermission(c, targetTenantId)) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    const result = await disconnectWhatsApp(targetTenantId);
    return c.json({ ...result, tenantId: targetTenantId });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Send Custom WhatsApp Message
whatsappRoutes.post("/send", async (c) => {
  try {
    const user = getUser(c);
    const { tenantId: rawTenantId, phone, message, orderId, recipientName } = await c.req.json();
    if (!phone || !message) {
      return c.json({ success: false, message: "Nomor WhatsApp dan pesan wajib diisi" }, 400);
    }

    if (rawTenantId && user.role !== "superadmin" && user.tenantId && rawTenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak: Anda tidak memiliki akses untuk mengirim pesan dari outlet ini" }, 403);
    }

    const targetTenantId = user.role === "superadmin" && rawTenantId
      ? rawTenantId
      : (user.tenantId || (await resolveTenantId(rawTenantId)));

    if (!hasTenantPermission(c, targetTenantId)) {
      return c.json({ success: false, message: "Akses ditolak: Anda tidak memiliki akses untuk mengirim pesan dari outlet ini" }, 403);
    }

    const result = await sendWhatsAppMessage(targetTenantId, phone, message);
    if (!result.success) {
      // Record failure to wa_logs
      try {
        await db.insert(waLogs).values({
          id: `walog-${Date.now()}`,
          tenantId: targetTenantId,
          orderId: orderId || null,
          recipientPhone: phone.replace(/[^0-9]/g, "").replace(/^0/, "62"),
          recipientName: recipientName || null,
          messagePreview: message.slice(0, 200),
          status: "failed",
          mode: "baileys",
          errorMessage: result.error || "Gagal mengirim",
          createdAt: new Date().toISOString(),
        });
      } catch {}
      return c.json({ success: false, message: result.error }, 400);
    }

    // Record success to wa_logs
    try {
      await db.insert(waLogs).values({
        id: `walog-${Date.now()}`,
        tenantId: targetTenantId,
        orderId: orderId || null,
        recipientPhone: phone.replace(/[^0-9]/g, "").replace(/^0/, "62"),
        recipientName: recipientName || null,
        messagePreview: message.slice(0, 200),
        status: "sent",
        mode: "baileys",
        errorMessage: null,
        createdAt: new Date().toISOString(),
      });
    } catch (logErr) {
      console.warn("[waLogs] Failed to insert send log:", logErr);
    }

    return c.json({
      success: true,
      message: "Pesan WhatsApp berhasil terkirim melalui Baileys Gateway!",
      messageId: result.messageId,
      tenantId: targetTenantId,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Update WhatsApp Delivery Mode (manual vs baileys) - Khusus Owner / Superadmin
whatsappRoutes.patch("/mode", requireRole(["superadmin", "tenant_owner"]), async (c) => {
  try {
    const user = getUser(c);
    const { tenantId: rawTenantId, waMode } = await c.req.json();
    if (!["manual", "baileys"].includes(waMode)) {
      return c.json({ success: false, message: "Parameter mode tidak valid (pilih manual atau baileys)" }, 400);
    }

    const targetTenantId = user.role === "superadmin" && rawTenantId
      ? rawTenantId
      : (user.tenantId || (await resolveTenantId(rawTenantId)));

    if (rawTenantId && user.role !== "superadmin" && user.tenantId && rawTenantId !== user.tenantId) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    if (!hasTenantPermission(c, targetTenantId)) {
      return c.json({ success: false, message: "Akses ditolak untuk outlet ini" }, 403);
    }

    await db.update(tenants).set({ waMode }).where(eq(tenants.id, targetTenantId));
    return c.json({
      success: true,
      message: `Mode pengiriman WhatsApp berhasil diubah ke ${
        waMode === "baileys" ? "Otomatis (Baileys Gateway)" : "Manual (Tautan wa.me)"
      }`,
      waMode,
      tenantId: targetTenantId,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default whatsappRoutes;

