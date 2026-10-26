import { describe, it, expect } from "bun:test";
import { generateLocalFallbackReply } from "./localKnowledgeEngine";
import { checkRoleAccessViolation } from "./rbacGuard";
import { OperationalContext } from "./types";

describe("AI Promo Recommender & Initiator Unit Tests", () => {
  const dummyContext: OperationalContext = {
    outletName: "Cleanique Express Sukun",
    todayStr: "Senin, 26 Oktober 2026",
    ordersTodayCount: 15,
    revenueToday: 150000,
    processCount: 4,
    readyCount: 3,
    completedCount: 8,
    unpaidCount: 2,
    businessHealth: {
      healthScore: 88,
      ratingText: "Sehat & Prima",
      totalWashKg: 350,
      monthlyRevenue: 12000000,
      monthlyExpense: 7500000,
      monthlyNetProfit: 4500000,
      netMarginPct: 37.5,
      chemicalRatioPct: 14.2,
      materials: [],
      rent: { hasRent: false, remainingMonths: 0, endDate: null, monthlyAmortization: 0 },
      recommendations: [],
    },
    marketingMetrics: {
      quietDays: ["Selasa", "Rabu"],
      busiestDays: ["Sabtu", "Minggu"],
      topServices: [
        { name: "Cuci Komplit (Kg)", orderCount: 85, revenue: 595000 },
        { name: "Cuci Kering (Kg)", orderCount: 30, revenue: 180000 },
      ],
      underperformingServices: [
        { name: "Cuci Bedcover Besar", currentPrice: 35000, unit: "pcs", orderCount: 2 },
        { name: "Cuci Sepatu Premium", currentPrice: 25000, unit: "pasang", orderCount: 4 },
      ],
      inactiveCustomersCount: 18,
      totalCustomersCount: 65,
      averageOrderValue: 35000,
      safeMaxDiscountPct: 20,
    },
  };

  describe("1. RBAC Guard for Promo Inquiries", () => {
    it("should strictly block staff/kasir from asking promo recommendations", () => {
      const messages = [
        "Bisa buatkan saya ide promo diskon?",
        "Rekomendasi promo dong",
        "Bagaimana cara bikin kupon voucher?",
        "Potongan harga untuk pelanggan",
      ];

      for (const msg of messages) {
        const res = checkRoleAccessViolation(msg, "staff", dummyContext);
        expect(res).not.toBeNull();
        expect(res?.isForbidden).toBe(true);
        expect(res?.reply).toContain("Akses Terbatas");
        expect(res?.reply).toContain("Pemilik Outlet");
      }
    });

    it("should allow owner and superadmin to ask promo recommendations without violation", () => {
      const messages = [
        "Rekomendasikan promo khusus untuk dongkrak omset hari sepi",
        "Ide promo reaktivasi pelanggan lama",
        "Diskon bundling layanan satuan",
      ];

      for (const msg of messages) {
        expect(checkRoleAccessViolation(msg, "owner", dummyContext)).toBeNull();
        expect(checkRoleAccessViolation(msg, "tenant_owner", dummyContext)).toBeNull();
        expect(checkRoleAccessViolation(msg, "superadmin", dummyContext)).toBeNull();
      }
    });
  });

  describe("2. Local Knowledge Engine Promo Output", () => {
    it("should generate comprehensive structured promo strategies with quiet days and inactive count", () => {
      const reply = generateLocalFallbackReply(
        "Rekomendasikan promo khusus untuk hari sepi di outlet saya",
        dummyContext,
        "tenant_owner"
      );

      expect(reply).toContain("Rekomendasi & Inisiasi Promo Berdasarkan Data Cleanique Express Sukun");
      expect(reply).toContain("Selasa & Rabu");
      expect(reply).toContain("18 pelanggan");
      expect(reply).toContain("20%"); // safeMaxDiscountPct
      expect(reply).toContain("Cuci Bedcover Besar");
    });

    it("should provide actionable COPY_PROMO_WA and CREATE_PROMO_SERVICE action tags", () => {
      const reply = generateLocalFallbackReply(
        "Bisa minta ide promo dan draf pesan WhatsApp?",
        dummyContext,
        "owner"
      );

      expect(reply).toContain("[ACTION:COPY_PROMO_WA:");
      expect(reply).toContain("[ACTION:CREATE_PROMO_SERVICE:");
      expect(reply).toContain("name=Promo");
    });
  });
});
