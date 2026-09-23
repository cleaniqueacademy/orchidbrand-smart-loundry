import { describe, it, expect, beforeAll } from "bun:test";
import { app } from "../index";
import { db } from "../db/index";
import { users, tenants, orders, shifts, referralCodes } from "../db/schema";
import { eq } from "drizzle-orm";
import { signToken } from "../middleware/auth";
import { registerNewTenant } from "./signupService";

describe("Business Logic Fixes & AI Assistant Verification", () => {
  let superadminToken: string;
  let ownerToken: string;
  let expiredOwnerToken: string;
  let staffToken: string;
  let testTenantId: string;
  let expiredTenantId: string;

  beforeAll(async () => {
    testTenantId = `tenant-bl-${Date.now()}`;
    expiredTenantId = `tenant-exp-${Date.now()}`;

    // Seed user owner active
    await db.insert(users).values({
      id: `user-owner-${testTenantId}`,
      name: "Owner Aktif",
      email: `owner-aktif-${Date.now()}@test.com`,
      passwordHash: "dummyhash",
      role: "tenant_owner",
      status: "active",
      tenantId: testTenantId,
    });

    // Seed test tenant active
    await db.insert(tenants).values({
      id: testTenantId,
      userId: `user-owner-${testTenantId}`,
      outletName: "Outlet Bisnis Aktif",
      phone: "081234567890",
      address: "Jl. Bisnis No. 1",
      status: "active",
      subscriptionUntil: "2099-12-31",
    });

    // Seed user owner expired
    await db.insert(users).values({
      id: `user-owner-${expiredTenantId}`,
      name: "Owner Expired",
      email: `owner-expired-${Date.now()}@test.com`,
      passwordHash: "dummyhash",
      role: "tenant_owner",
      status: "active",
      tenantId: expiredTenantId,
    });

    // Seed test tenant expired
    await db.insert(tenants).values({
      id: expiredTenantId,
      userId: `user-owner-${expiredTenantId}`,
      outletName: "Outlet Kedaluwarsa",
      phone: "081234567899",
      address: "Jl. Kadaluwarsa No. 2",
      status: "active",
      subscriptionUntil: "2020-01-01", // Past date
    });

    // Seed staff user
    await db.insert(users).values({
      id: `usr-staff-${testTenantId}`,
      name: "Kasir Test",
      email: `staff-${Date.now()}@test.com`,
      passwordHash: "dummyhash",
      role: "staff",
      status: "active",
      tenantId: testTenantId,
    });

    // Seed superadmin user
    const superadminId = `usr-superadmin-${Date.now()}`;
    await db.insert(users).values({
      id: superadminId,
      name: "Superadmin Test",
      email: `superadmin-${Date.now()}@test.com`,
      passwordHash: "dummyhash",
      role: "superadmin",
      status: "active",
    });

    // Generate tokens
    superadminToken = await signToken({
      userId: superadminId,
      role: "superadmin",
      tenantId: null,
    });

    ownerToken = await signToken({
      userId: `user-owner-${testTenantId}`,
      role: "tenant_owner",
      tenantId: testTenantId,
    });

    expiredOwnerToken = await signToken({
      userId: `user-owner-${expiredTenantId}`,
      role: "tenant_owner",
      tenantId: expiredTenantId,
    });

    staffToken = await signToken({
      userId: `usr-staff-${testTenantId}`,
      role: "staff",
      tenantId: testTenantId,
    });
  });

  // --------------------------------------------------------------------------
  // 1. Referral Safe Fallback (Poin 1.b)
  // --------------------------------------------------------------------------
  describe("1. Referral Real-time Validation & Safe Signup Fallback (1.b)", () => {
    it("GET /api/signup/check-referral mengembalikan valid: false untuk kode tidak ada", async () => {
      const res = await app.request("/api/signup/check-referral?code=KODE-NGASAL-999");
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.valid).toBe(false);
    });

    it("registerNewTenant dengan kode referral kadaluarsa/tidak valid TETAP BERHASIL (tidak crash 400)", async () => {
      const randomEmail = `test-fallback-${Date.now()}@cleaniquetest.com`;
      const res = await registerNewTenant({
        outletName: "Laundry Berkah Aman",
        ownerName: "Budi Santoso",
        email: randomEmail,
        password: "password123",
        phone: `0812${Math.floor(10000000 + Math.random() * 90000000)}`,
        address: "Jl. Merdeka No. 12",
        referralCode: "KODE-TYPO-9999", // Invalid referral code
      });

      expect(res.success).toBe(true);
      expect(res.data?.referralNotice).toBeDefined();
      expect(res.data?.referralCode).toBeNull();
      expect(res.message).toContain("Pendaftaran berhasil");
    });
  });

  // --------------------------------------------------------------------------
  // 2. Shift Cash Calculation & paidAt / paidShiftId (Poin 4.B)
  // --------------------------------------------------------------------------
  describe("2. Shift Cash Calculation (paidAt & paidShiftId) (4.B)", () => {
    it("POST /api/orders dengan status paid otomatis mencatat paidAt dan paidShiftId shift aktif", async () => {
      // 1. Buka shift kasir
      const openShiftRes = await app.request("/api/shifts/open", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          startingCash: 50000,
          notes: "Shift Pagi Test",
        }),
      });
      expect(openShiftRes.status).toBe(200);
      const shiftBody = await openShiftRes.json();
      const shiftId = shiftBody.data.id;

      // 2. Buat order cash paid
      const orderRes = await app.request("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          newCustomer: {
            name: "Pelanggan Tunai",
            phone: "081999888777",
          },
          serviceType: "Cuci Komplit Reguler",
          weightOrQty: 3,
          pricePerUnit: 10000,
          totalAmount: 30000,
          paymentStatus: "paid",
          paymentMethod: "cash",
        }),
      });

      expect(orderRes.status).toBe(200);
      const orderBody = await orderRes.json();
      expect(orderBody.data.paidAt).toBeDefined();
      expect(orderBody.data.paidShiftId).toBe(shiftId);

      // 3. Periksa kalkulasi active shift
      const activeShiftRes = await app.request("/api/shifts/active", {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      expect(activeShiftRes.status).toBe(200);
      const activeBody = await activeShiftRes.json();
      expect(activeBody.data.systemCashTotal).toBeGreaterThanOrEqual(30000);
      expect(activeBody.data.expectedCash).toBeGreaterThanOrEqual(80000);

      // 4. Tutup shift
      const closeRes = await app.request("/api/shifts/close", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          shiftId,
          actualCashTotal: activeBody.data.expectedCash,
          notes: "Tutup shift seimbang",
        }),
      });
      expect(closeRes.status).toBe(200);
    });
  });

  // --------------------------------------------------------------------------
  // 3. Staff Expiration Guard in authMiddleware (Poin 5.a)
  // --------------------------------------------------------------------------
  describe("3. Tenant Expiration Real-time Enforcement (5.a)", () => {
    it("authMiddleware menolak request dari token outlet yang telah kedaluwarsa dengan 403 SUBSCRIPTION_EXPIRED", async () => {
      const res = await app.request("/api/orders", {
        headers: { Authorization: `Bearer ${expiredOwnerToken}` },
      });
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.code).toBe("SUBSCRIPTION_EXPIRED");
      expect(body.message).toContain("Masa aktif langganan outlet ini telah berakhir");
    });
  });

  // --------------------------------------------------------------------------
  // 4. In-Web Dashboard AI Assistant (Poin 6)
  // --------------------------------------------------------------------------
  describe("4. In-Web Dashboard AI Assistant Gemini Flash (6)", () => {
    it("POST /api/ai/chat menolak request tanpa token otentikasi (401)", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Berapa omset hari ini?" }),
      });
      expect(res.status).toBe(401);
    });

    it("POST /api/ai/chat dengan token sah memberikan jawaban operasional dan konteks toko", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ message: "Berikan ringkasan toko hari ini" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toBeDefined();
      expect(body.data.model).toBeDefined();
      expect(body.data.contextSummary.outletName).toBe("Outlet Bisnis Aktif");
    });

    it("POST /api/ai/chat dapat memberikan panduan noda pakaian", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ message: "Bagaimana cara hilangkan noda tinta pulpen?" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("Tinta");
    });

    it("POST /api/ai/chat memberikan panduan Jam Operasional & menyertakan ACTION tag settings", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ message: "Bagaimana cara mengatur jam operasional toko?" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("Jam Buka");
      expect(body.data.reply).toContain("[ACTION:NAVIGATE:settings]");
    });

    it("POST /api/ai/chat memberikan panduan WhatsApp Baileys & menyertakan ACTION tag whatsapp modal", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ message: "Bagaimana cara menghubungkan WhatsApp toko dengan scan QR?" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("WhatsApp");
      expect(body.data.reply).toContain("[ACTION:OPEN_MODAL:whatsapp]");
    });

    it("POST /api/ai/chat memberikan panduan Shift Kasir & rekonsiliasi kas laci", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ message: "Bagaimana cara buka dan tutup shift kasir?" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("Shift Kasir");
      expect(body.data.reply).toContain("[ACTION:OPEN_MODAL:open_shift]");
    });

    it("POST /api/ai/chat memberikan peta menu yang disesuaikan dengan role kasir (staff)", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ message: "Jelaskan daftar menu apa saja yang bisa saya gunakan" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("Kasir Staff");
      expect(body.data.reply).toContain("Meja Kerja Kasir");
      expect(body.data.reply).toContain("[ACTION:NAVIGATE:orders]");
    });

    it("POST /api/ai/chat memberikan panduan rekening bank dan QRIS outlet", async () => {
      const res = await app.request("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${ownerToken}`,
        },
        body: JSON.stringify({ message: "Bagaimana cara memasukkan rekening bank dan QRIS?" }),
      });

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.data.reply).toContain("Rekening Bank");
      expect(body.data.reply).toContain("[ACTION:NAVIGATE:settings]");
    });
  });
});
