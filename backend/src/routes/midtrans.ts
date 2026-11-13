import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { midtransClient, midtransSettings } from "../services/midtransClient";
import { applyGatewayEvent, checkoutInvoice, reconcileInvoice, verifyMidtransSignature } from "../services/subscriptionPayments";

const routes = new Hono();
routes.get("/config", c => c.json({ success: true, data: { enabled: midtransSettings.enabled } }));
routes.post("/notifications", bodyLimit({ maxSize: 65536 }), async c => {
  if (!midtransSettings.enabled) return c.json({ success: false }, 503);
  const payload: unknown = await c.req.json().catch(() => null);
  if (!verifyMidtransSignature(payload, midtransSettings.serverKey)) return c.json({ success: false, message: "Signature tidak valid" }, 403);
  try {
    await applyGatewayEvent(payload);
    return c.json({ success: true });
  } catch {
    console.warn("[payments] notification could not be applied", { orderId: (payload as { order_id: string }).order_id });
    return c.json({ success: false, message: "Transaksi belum dapat direkonsiliasi" }, 503);
  }
});
routes.use("/invoices/*", authMiddleware, requireRole(["superadmin", "tenant_owner"]));
routes.post("/invoices/:id/checkout", async c => {
  if (!midtransSettings.enabled) return c.json({ success: false, message: "Midtrans belum diaktifkan" }, 503);
  try {
    const actor = getUser(c);
    const attempt = await checkoutInvoice(c.req.param("id"), actor.userId, midtransClient, actor.role === "superadmin");
    return c.json({ success: true, data: { redirectUrl: attempt.redirectUrl, status: attempt.status } });
  } catch (error) {
    return c.json({ success: false, message: error instanceof Error ? error.message : "Checkout tidak tersedia" }, 409);
  }
});
routes.get("/invoices/:id/status", async c => {
  if (!midtransSettings.enabled) return c.json({ success: false, message: "Midtrans belum diaktifkan" }, 503);
  try {
    const actor = getUser(c);
    const result = await reconcileInvoice(c.req.param("id"), actor.userId, midtransClient, actor.role === "superadmin");
    return c.json({ success: true, data: result });
  } catch {
    return c.json({ success: false, message: "Status belum dapat diperbarui. Coba kembali atau hubungi admin." }, 409);
  }
});
export default routes;
