import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { authMiddleware, signToken } from "./auth";
import { requireRole, requireTenantAccess } from "./rbac";

describe("rbac middleware (requireRole & requireTenantAccess)", () => {
  it("requireRole mengizinkan role yang sesuai", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/admin-only", requireRole(["superadmin"]), (c) => c.json({ ok: true }));

    const adminToken = await signToken({
      userId: "u-admin",
      role: "superadmin",
      tenantId: null,
    });

    const res = await app.request("/admin-only", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it("requireRole menolak role yang tidak diizinkan dengan 403", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/admin-only", requireRole(["superadmin"]), (c) => c.json({ ok: true }));

    const staffToken = await signToken({
      userId: "u-staff",
      role: "staff",
      tenantId: "tenant-01",
    });

    const res = await app.request("/admin-only", {
      headers: { Authorization: `Bearer ${staffToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("requireTenantAccess mengizinkan superadmin ke tenant mana pun", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/outlet/:tenantId", requireTenantAccess(), (c) => c.json({ ok: true }));

    const adminToken = await signToken({
      userId: "u-admin",
      role: "superadmin",
      tenantId: null,
    });

    const res = await app.request("/outlet/tenant-999", {
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    expect(res.status).toBe(200);
  });

  it("requireTenantAccess mengizinkan tenant_owner jika tenantId cocok", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/outlet/:tenantId", requireTenantAccess(), (c) => c.json({ ok: true }));

    const ownerToken = await signToken({
      userId: "u-owner",
      role: "tenant_owner",
      tenantId: "tenant-01",
    });

    const res = await app.request("/outlet/tenant-01", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    expect(res.status).toBe(200);
  });

  it("requireTenantAccess menolak jika tenantId berbeda (cross-tenant isolation)", async () => {
    const app = new Hono();
    app.use("*", authMiddleware);
    app.get("/outlet/:tenantId", requireTenantAccess(), (c) => c.json({ ok: true }));

    const ownerToken = await signToken({
      userId: "u-owner",
      role: "tenant_owner",
      tenantId: "tenant-01",
    });

    const res = await app.request("/outlet/tenant-02", {
      headers: { Authorization: `Bearer ${ownerToken}` },
    });

    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
