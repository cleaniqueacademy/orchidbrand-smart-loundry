import { Hono } from "hono";
import { db } from "../db/index";
import { tenants } from "../db/schema";
import { eq } from "drizzle-orm";
import {
  getWhatsAppStatus,
  initWhatsAppSession,
  disconnectWhatsApp,
  sendWhatsAppMessage,
} from "../services/whatsapp";

const whatsappRoutes = new Hono();

async function resolveTenantId(rawTenantId?: string): Promise<string> {
  if (!rawTenantId || rawTenantId === "all") {
    const list = await db.select().from(tenants).limit(1);
    return list[0]?.id || "tenant-01";
  }
  return rawTenantId;
}

// 1. Get WhatsApp Status for Tenant
whatsappRoutes.get("/status", async (c) => {
  try {
    const tenantId = await resolveTenantId(c.req.query("tenantId"));
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

// 2. Connect / Request QR Code
whatsappRoutes.post("/connect", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const tenantId = await resolveTenantId(body.tenantId);
    const forceRefresh = Boolean(body.forceRefresh);
    const result = await initWhatsAppSession(tenantId, forceRefresh);
    return c.json({ success: true, data: { ...result, tenantId } });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 3. Disconnect WhatsApp Session
whatsappRoutes.post("/disconnect", async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const tenantId = await resolveTenantId(body.tenantId);
    const result = await disconnectWhatsApp(tenantId);
    return c.json({ ...result, tenantId });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 4. Send Custom WhatsApp Message
whatsappRoutes.post("/send", async (c) => {
  try {
    const { tenantId: rawTenantId, phone, message } = await c.req.json();
    if (!phone || !message) {
      return c.json({ success: false, message: "Nomor WhatsApp dan pesan wajib diisi" }, 400);
    }

    const tenantId = await resolveTenantId(rawTenantId);
    const result = await sendWhatsAppMessage(tenantId, phone, message);
    if (!result.success) {
      return c.json({ success: false, message: result.error }, 400);
    }

    return c.json({
      success: true,
      message: "Pesan WhatsApp berhasil terkirim melalui Baileys Gateway!",
      messageId: result.messageId,
      tenantId,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

// 5. Update WhatsApp Delivery Mode (manual vs baileys)
whatsappRoutes.patch("/mode", async (c) => {
  try {
    const { tenantId: rawTenantId, waMode } = await c.req.json();
    if (!["manual", "baileys"].includes(waMode)) {
      return c.json({ success: false, message: "Parameter mode tidak valid (pilih manual atau baileys)" }, 400);
    }

    const tenantId = await resolveTenantId(rawTenantId);
    await db.update(tenants).set({ waMode }).where(eq(tenants.id, tenantId));
    return c.json({
      success: true,
      message: `Mode pengiriman WhatsApp berhasil diubah ke ${
        waMode === "baileys" ? "Otomatis (Baileys Gateway)" : "Manual (Tautan wa.me)"
      }`,
      waMode,
      tenantId,
    });
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500);
  }
});

export default whatsappRoutes;

