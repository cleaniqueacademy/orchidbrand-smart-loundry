import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import platformSettingsRoutes from "./platformSettings";
import { signToken } from "../middleware/auth";

describe("platformSettings routes integration tests", () => {
  const app = new Hono();
  app.route("/api/platform-settings", platformSettingsRoutes);

  let adminToken: string;

  it("siapkan token admin", async () => {
    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });
    expect(adminToken).toBeDefined();
  });

  it("GET /api/platform-settings/public - publik dapat melihat info platform dan rekening", async () => {
    const res = await app.request("/api/platform-settings/public");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.platformName).toBeDefined();
  });

  it("GET /api/platform-settings - superadmin dapat melihat seluruh setting", async () => {
    const res = await app.request("/api/platform-settings", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBeDefined();
  });

  it("PUT /api/platform-settings - superadmin dapat mengubah setting", async () => {
    const res = await app.request("/api/platform-settings", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bankName: "BCA",
        bankAccountNumber: "8888999900",
        bankAccountName: "PT ORCHID DIGITAL INDONESIA",
        defaultTrialDays: 7,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.bankName).toBe("BCA");
    expect(body.data.bankAccountNumber).toBe("8888999900");
  });
});
