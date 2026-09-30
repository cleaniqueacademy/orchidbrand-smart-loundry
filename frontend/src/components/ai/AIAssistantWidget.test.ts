import { describe, it, expect } from "bun:test";
import {
  canRoleAccessAction,
  getActionLabel,
  getRoleQuickPrompts,
  ActionItem,
} from "./AIAssistantWidget";

describe("AIAssistantWidget Role-Based Route & Navigation Logic", () => {
  describe("1. Super Admin Route Permissions & Remapping", () => {
    it("should allow and remap 'settings' to 'settings_platform' for superadmin", () => {
      const action: ActionItem = { type: "NAVIGATE", target: "settings" };
      const res = canRoleAccessAction("superadmin", action);
      expect(res.allowed).toBe(true);
      expect(res.mappedTarget).toBe("settings_platform");
      expect(res.noticeText).toContain("Setting Platform");
    });

    it("should allow direct 'settings_platform' for superadmin", () => {
      const action: ActionItem = { type: "NAVIGATE", target: "settings_platform" };
      const res = canRoleAccessAction("superadmin", action);
      expect(res.allowed).toBe(true);
      expect(res.mappedTarget).toBe("settings_platform");
    });

    it("should remap cashflow, finance, reports, and subscription to 'invoices' for superadmin", () => {
      const targets = ["cashflow", "finance", "reports", "subscription"];
      for (const t of targets) {
        const res = canRoleAccessAction("superadmin", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(true);
        expect(res.mappedTarget).toBe("invoices");
        expect(res.noticeText).toContain("Langganan");
      }
    });

    it("should allow HQ platform tabs (tenants, users, logs, marketing)", () => {
      const hqTabs = ["tenants", "users", "logs", "marketing", "referral_codes"];
      for (const t of hqTabs) {
        const res = canRoleAccessAction("superadmin", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(true);
        expect(res.mappedTarget).toBe(t);
      }
    });

    it("should reject branch-only shift modals for superadmin", () => {
      const openShift = canRoleAccessAction("superadmin", { type: "OPEN_MODAL", target: "open_shift" });
      expect(openShift.allowed).toBe(false);
      expect(openShift.reason).toContain("Shift Kasir");

      const closeShift = canRoleAccessAction("superadmin", { type: "OPEN_MODAL", target: "close_shift" });
      expect(closeShift.allowed).toBe(false);
    });

    it("should provide platform-specific button labels for superadmin", () => {
      expect(getActionLabel({ type: "NAVIGATE", target: "settings" }, "superadmin")).toBe("Buka Setting Platform");
      expect(getActionLabel({ type: "NAVIGATE", target: "cashflow" }, "superadmin")).toBe("Buka Arus Kas Langganan");
      expect(getActionLabel({ type: "NAVIGATE", target: "overview" }, "superadmin")).toBe("Buka Dashboard Platform");
    });
  });

  describe("2. Marketing Role Route Permissions", () => {
    it("should strictly allow only marketing and registered_tenants tabs", () => {
      const mktRes = canRoleAccessAction("marketing", { type: "NAVIGATE", target: "marketing" });
      expect(mktRes.allowed).toBe(true);
      expect(mktRes.mappedTarget).toBe("marketing");

      const tenantsRes = canRoleAccessAction("marketing", { type: "NAVIGATE", target: "registered_tenants" });
      expect(tenantsRes.allowed).toBe(true);
      expect(tenantsRes.mappedTarget).toBe("registered_tenants");

      const overviewRes = canRoleAccessAction("marketing", { type: "NAVIGATE", target: "overview" });
      expect(overviewRes.allowed).toBe(true);
      expect(overviewRes.mappedTarget).toBe("marketing");
    });

    it("should strictly block marketing from admin, branch, and cashier tabs", () => {
      const forbiddenTabs = ["settings", "orders", "finance", "cashflow", "services", "tenants", "users", "logs"];
      for (const t of forbiddenTabs) {
        const res = canRoleAccessAction("marketing", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain("Akses ditolak");
      }
    });

    it("should block marketing from shift and financial modals", () => {
      const shiftRes = canRoleAccessAction("marketing", { type: "OPEN_MODAL", target: "open_shift" });
      expect(shiftRes.allowed).toBe(false);

      const expRes = canRoleAccessAction("marketing", { type: "OPEN_MODAL", target: "expense" });
      expect(expRes.allowed).toBe(false);
    });

    it("should provide marketing-specific button labels", () => {
      expect(getActionLabel({ type: "NAVIGATE", target: "marketing" }, "marketing")).toBe("Buka Dashboard Marketing");
      expect(getActionLabel({ type: "NAVIGATE", target: "overview" }, "marketing")).toBe("Buka Dashboard Marketing");
    });
  });

  describe("3. Staff / Kasir Role Route Permissions", () => {
    it("should allow staff to access orders and customers", () => {
      const ordersRes = canRoleAccessAction("staff", { type: "NAVIGATE", target: "orders" });
      expect(ordersRes.allowed).toBe(true);
      expect(ordersRes.mappedTarget).toBe("orders");

      const custRes = canRoleAccessAction("kasir", { type: "NAVIGATE", target: "customers" });
      expect(custRes.allowed).toBe(true);
      expect(custRes.mappedTarget).toBe("customers");
    });

    it("should allow staff to open and close shifts", () => {
      const openRes = canRoleAccessAction("staff", { type: "OPEN_MODAL", target: "open_shift" });
      expect(openRes.allowed).toBe(true);
      expect(openRes.noticeText).toContain("Buka Shift");

      const closeRes = canRoleAccessAction("kasir", { type: "OPEN_MODAL", target: "close_shift" });
      expect(closeRes.allowed).toBe(true);
      expect(closeRes.noticeText).toContain("Tutup Shift");
    });

    it("should strictly block staff from settings, finance, cashflow, services, tenants, users", () => {
      const forbiddenTabs = ["settings", "finance", "cashflow", "services", "subscription", "tenants", "users", "logs"];
      for (const t of forbiddenTabs) {
        const res = canRoleAccessAction("staff", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain("Akses ditolak");
      }
    });

    it("should block staff from sensitive modals (whatsapp gateway, expense)", () => {
      const waRes = canRoleAccessAction("staff", { type: "OPEN_MODAL", target: "whatsapp" });
      expect(waRes.allowed).toBe(false);
      expect(waRes.reason).toContain("Akses ditolak");

      const expRes = canRoleAccessAction("kasir", { type: "OPEN_MODAL", target: "expense" });
      expect(expRes.allowed).toBe(false);
    });
  });

  describe("4. Owner / Tenant Owner Route Permissions", () => {
    it("should allow owner full outlet operational tabs (orders, settings, services, subscription)", () => {
      const allowedTabs = ["orders", "settings", "services", "subscription", "customers"];
      for (const t of allowedTabs) {
        const res = canRoleAccessAction("owner", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(true);
        expect(res.mappedTarget).toBe(t);
      }
    });

    it("should remap cashflow and reports to 'finance' for owner", () => {
      const cashflowRes = canRoleAccessAction("owner", { type: "NAVIGATE", target: "cashflow" });
      expect(cashflowRes.allowed).toBe(true);
      expect(cashflowRes.mappedTarget).toBe("finance");

      const reportsRes = canRoleAccessAction("tenant_owner", { type: "NAVIGATE", target: "reports" });
      expect(reportsRes.allowed).toBe(true);
      expect(reportsRes.mappedTarget).toBe("finance");
    });

    it("should allow owner all operational modals (whatsapp, expense, open/close shift, tutorial)", () => {
      const modals = ["whatsapp", "expense", "open_shift", "close_shift", "tutorial"];
      for (const m of modals) {
        const res = canRoleAccessAction("owner", { type: "OPEN_MODAL", target: m });
        expect(res.allowed).toBe(true);
      }
    });

    it("should strictly block owner from platform HQ tabs (tenants, users, settings_platform, logs)", () => {
      const hqOnlyTabs = ["tenants", "users", "settings_platform", "logs"];
      for (const t of hqOnlyTabs) {
        const res = canRoleAccessAction("owner", { type: "NAVIGATE", target: t });
        expect(res.allowed).toBe(false);
        expect(res.reason).toContain("Super Admin");
      }
    });

    it("should provide owner-specific button labels", () => {
      expect(getActionLabel({ type: "NAVIGATE", target: "settings" }, "owner")).toBe("Buka Menu Pengaturan");
      expect(getActionLabel({ type: "NAVIGATE", target: "cashflow" }, "owner")).toBe("Buka Keuangan & Laporan");
      expect(getActionLabel({ type: "NAVIGATE", target: "overview" }, "owner")).toBe("Buka Dashboard Utama");
    });
  });

  describe("5. Quick Prompts Isolation Per Role", () => {
    it("superadmin should have only HQ platform prompts and no cashier/pos/outlet-settings prompts", () => {
      const { categories, prompts } = getRoleQuickPrompts("superadmin");
      expect(categories.map((c) => c.id)).toEqual([
        "all",
        "platform",
        "outlets",
        "users",
        "finance_admin",
        "settings",
      ]);
      expect(prompts.length).toBeGreaterThan(0);
      for (const p of prompts) {
        expect(p.roles).toContain("superadmin");
        // Superadmin must NOT have prompts asking about jam buka toko or rekening QRIS
        expect(p.id).not.toBe("owner-hours");
        expect(p.id).not.toBe("owner-bank");
        expect(p.id).not.toBe("staff-order");
      }
    });

    it("marketing should have only referral and commission categories and prompts", () => {
      const { categories, prompts } = getRoleQuickPrompts("marketing");
      expect(categories.map((c) => c.id)).toEqual(["all", "referral", "commission", "tenants_marketing"]);
      for (const p of prompts) {
        expect(p.roles).toContain("marketing");
        expect(p.roles).not.toContain("staff");
        expect(p.roles).not.toContain("superadmin");
      }
    });

    it("staff should have only POS, shift, customer, and tips categories and prompts", () => {
      const { categories, prompts } = getRoleQuickPrompts("staff");
      expect(categories.map((c) => c.id)).toEqual(["all", "pos", "shift", "customers", "tips"]);
      for (const p of prompts) {
        expect(p.roles.some((r) => r === "staff" || r === "kasir")).toBe(true);
        expect(p.roles).not.toContain("owner");
        expect(p.roles).not.toContain("superadmin");
      }
    });

    it("owner should have operational menu, settings, pos, and biz health categories", () => {
      const { categories, prompts } = getRoleQuickPrompts("owner");
      expect(categories.map((c) => c.id)).toEqual(["all", "menus", "settings", "pos", "biz"]);
      for (const p of prompts) {
        expect(p.roles.some((r) => r === "owner" || r === "tenant_owner")).toBe(true);
        expect(p.roles).not.toContain("superadmin");
      }
    });
  });
});
