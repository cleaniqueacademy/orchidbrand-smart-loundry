import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "./index";
import { signToken } from "./middleware/auth";

describe("Core API Security & Authentication Tests (P0 Hardening)", () => {
  let superadminToken: string;
  let tenantOwnerTokenA: string;
  let tenantOwnerTokenB: string;
  let staffTokenA: string;

  beforeAll(async () => {
    superadminToken = await signToken({
      userId: "user-superadmin-sec",
      role: "superadmin",
      tenantId: null,
    });

    tenantOwnerTokenA = await signToken({
      userId: "user-owner-a",
      role: "tenant_owner",
      tenantId: "tenant-sec-a",
    });

    tenantOwnerTokenB = await signToken({
      userId: "user-owner-b",
      role: "tenant_owner",
      tenantId: "tenant-sec-b",
    });

    staffTokenA = await signToken({
      userId: "user-staff-a",
      role: "staff",
      tenantId: "tenant-sec-a",
    });
  });

  describe("1. Public vs Protected Endpoints (Zero Auth Prevention)", () => {
    it("Public: GET /api/health should return 200 without token", async () => {
      const res = await app.request("/api/health");
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.status).toBe("ok");
    });

    it("Protected: GET /api/orders without token must return 401", async () => {
      const res = await app.request("/api/orders");
      expect(res.status).toBe(401);
    });

    it("Protected: POST /api/orders without token must return 401", async () => {
      const res = await app.request("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: "cust-1", totalAmount: 50000 }),
      });
      expect(res.status).toBe(401);
    });

    it("Protected: GET /api/customers without token must return 401", async () => {
      const res = await app.request("/api/customers");
      expect(res.status).toBe(401);
    });

    it("Protected: GET /api/tenants without token must return 401", async () => {
      const res = await app.request("/api/tenants");
      expect(res.status).toBe(401);
    });

    it("Protected: GET /api/users without token must return 401", async () => {
      const res = await app.request("/api/users");
      expect(res.status).toBe(401);
    });

    it("Protected: GET /api/expenses without token must return 401", async () => {
      const res = await app.request("/api/expenses");
      expect(res.status).toBe(401);
    });

    it("Protected: GET /api/stats/cashflow without token must return 401", async () => {
      const res = await app.request("/api/stats/cashflow");
      expect(res.status).toBe(401);
    });

    it("Protected: POST /api/users/some-id/reset-password without token must return 401", async () => {
      const res = await app.request("/api/users/some-id/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword: "hacked" }),
      });
      expect(res.status).toBe(401);
    });

    it("Protected: POST /api/users/some-id/extend without token must return 401", async () => {
      const res = await app.request("/api/users/some-id/extend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 365 }),
      });
      expect(res.status).toBe(401);
    });
  });

  describe("2. WhatsApp Gateway Hardening (Open Relay Prevention)", () => {
    it("Protected: POST /api/whatsapp/send without token must return 401", async () => {
      const res = await app.request("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "08123456789",
          message: "spam message",
          tenantId: "tenant-sec-a",
        }),
      });
      expect(res.status).toBe(401);
    });

    it("Protected: POST /api/whatsapp/disconnect without token must return 401", async () => {
      const res = await app.request("/api/whatsapp/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: "tenant-sec-a" }),
      });
      expect(res.status).toBe(401);
    });

    it("BOLA / Cross-tenant: Tenant Owner B cannot send WA using Tenant A's session", async () => {
      const res = await app.request("/api/whatsapp/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantOwnerTokenB}`,
        },
        body: JSON.stringify({
          phone: "08123456789",
          message: "test message",
          tenantId: "tenant-sec-a",
        }),
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it("RBAC: Staff cannot alter WhatsApp mode (/mode)", async () => {
      const res = await app.request("/api/whatsapp/mode", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffTokenA}`,
        },
        body: JSON.stringify({
          tenantId: "tenant-sec-a",
          waMode: "baileys",
        }),
      });
      expect(res.status).toBe(403);
    });
  });

  describe("3. Role-Based Access Control (RBAC)", () => {
    it("Staff cannot access confidential expenses (GET /api/expenses)", async () => {
      const res = await app.request("/api/expenses", {
        headers: { Authorization: `Bearer ${staffTokenA}` },
      });
      expect(res.status).toBe(403);
    });

    it("Staff cannot access cashflow statistics (GET /api/stats/cashflow)", async () => {
      const res = await app.request("/api/stats/cashflow", {
        headers: { Authorization: `Bearer ${staffTokenA}` },
      });
      expect(res.status).toBe(403);
    });

    it("Staff cannot delete an order (DELETE /api/orders/:id)", async () => {
      const res = await app.request("/api/orders/ord-fake-id", {
        method: "DELETE",
        headers: { Authorization: `Bearer ${staffTokenA}` },
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.message).toContain("Staff");
    });

    it("Staff cannot access all tenants list (GET /api/tenants)", async () => {
      const res = await app.request("/api/tenants", {
        headers: { Authorization: `Bearer ${staffTokenA}` },
      });
      expect(res.status).toBe(403);
    });

    it("Tenant Owner cannot access all tenants list (GET /api/tenants)", async () => {
      const res = await app.request("/api/tenants", {
        headers: { Authorization: `Bearer ${tenantOwnerTokenA}` },
      });
      expect(res.status).toBe(403);
    });

    it("Tenant Owner cannot extend subscription (POST /api/users/:id/extend)", async () => {
      const res = await app.request("/api/users/user-owner-a/extend", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tenantOwnerTokenA}`,
        },
        body: JSON.stringify({ days: 30 }),
      });
      expect(res.status).toBe(403);
    });
  });
});
