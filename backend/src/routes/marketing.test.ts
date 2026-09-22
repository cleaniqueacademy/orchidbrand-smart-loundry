import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import marketingRoutes from "./marketing";
import { signToken } from "../middleware/auth";
import { db } from "../db/index";
import { marketingCommissions, referralCodes } from "../db/schema";
import { newId } from "../utils/id";
import { eq } from "drizzle-orm";

describe("marketing routes integration tests", () => {
  const app = new Hono();
  app.route("/api/marketing", marketingRoutes);

  let adminToken: string;
  let marketingToken: string;
  let createdProfileId: string;
  let testCommissionId: string;

  it("siapkan token admin dan marketing", async () => {
    adminToken = await signToken({
      userId: "user-admin-01",
      role: "superadmin",
      tenantId: null,
    });

    marketingToken = await signToken({
      userId: "user-marketing-01",
      role: "marketing",
      tenantId: null,
    });

    expect(adminToken).toBeDefined();
    expect(marketingToken).toBeDefined();
  });

  it("GET /api/marketing/profiles - superadmin dapat melihat daftar mitra marketing", async () => {
    const res = await app.request("/api/marketing/profiles", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  it("GET /api/marketing/profiles - ditolak jika bukan superadmin (403)", async () => {
    const res = await app.request("/api/marketing/profiles", {
      headers: {
        Authorization: `Bearer ${marketingToken}`,
      },
    });

    expect(res.status).toBe(403);
  });

  it("POST /api/marketing/profiles - superadmin dapat mendaftarkan mitra baru", async () => {
    const uniqueEmail = `affiliate_${Date.now()}@test.com`;

    const res = await app.request("/api/marketing/profiles", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: "Mitra Uji Coba",
        email: uniqueEmail,
        password: "password123",
        phone: "081299881122",
        bankName: "BCA",
        bankAccountNumber: "1234567890",
        bankAccountName: "MITRA UJI COBA",
        commissionRateDefault: 12,
        notes: "Uji otomatis",
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.profileId).toBeDefined();
    createdProfileId = body.data.profileId;
  });

  it("PUT /api/marketing/profiles/:id - memperbarui informasi profil marketing", async () => {
    const res = await app.request(`/api/marketing/profiles/${createdProfileId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        bankName: "Bank Mandiri",
        bankAccountNumber: "9876543210",
        notes: "Catatan diperbarui",
        commissionRateDefault: 15,
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.bankName).toBe("Bank Mandiri");
    expect(body.data.commissionRateDefault).toBe(15);
  });

  it("GET /api/marketing/me - marketing user dapat melihat profil & ringkasan komisi", async () => {
    const res = await app.request("/api/marketing/me", {
      headers: {
        Authorization: `Bearer ${marketingToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.profile).toBeDefined();
    expect(body.data.commissionsSummary).toBeDefined();
  });

  it("GET /api/marketing/commissions - mengambil daftar komisi transaksi", async () => {
    const res = await app.request("/api/marketing/commissions", {
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("PUT /api/marketing/commissions/:id/status - mengubah status komisi ke approved dan paid", async () => {
    // Buat data komisi dummy untuk pengujian status transition
    testCommissionId = newId("comm");
    const [refCode] = await db.select().from(referralCodes).limit(1);

    await db.insert(marketingCommissions).values({
      id: testCommissionId,
      marketingProfileId: createdProfileId,
      referralCodeId: refCode ? refCode.id : null,
      baseAmount: 150000,
      commissionAmount: 15000,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    // 1. Approve komisi
    const resApprove = await app.request(
      `/api/marketing/commissions/${testCommissionId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "approved",
          notes: "Disetujui untuk dicairkan",
        }),
      }
    );

    expect(resApprove.status).toBe(200);
    const bodyApprove = await resApprove.json();
    expect(bodyApprove.success).toBe(true);
    expect(bodyApprove.data.status).toBe("approved");

    // 2. Tandai Paid
    const resPaid = await app.request(
      `/api/marketing/commissions/${testCommissionId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          status: "paid",
          notes: "Ditransfer via Mandiri",
        }),
      }
    );

    expect(resPaid.status).toBe(200);
    const bodyPaid = await resPaid.json();
    expect(bodyPaid.success).toBe(true);
    expect(bodyPaid.data.status).toBe("paid");
    expect(bodyPaid.data.paidAt).toBeDefined();

    // Bersihkan data tes
    await db.delete(marketingCommissions).where(eq(marketingCommissions.id, testCommissionId));
  });
});
