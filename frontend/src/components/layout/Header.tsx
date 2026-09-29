import React from "react";
import { Menu, RefreshCw, ChevronRight } from "lucide-react";
import { TabType, Role, User, CashierShift } from "../../types";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";
import { TrialBanner } from "../tabs/subscription/TrialBanner";
import { checkUserActiveStatus } from "../../utils/subscriptionUtils";

interface HeaderProps {
  activeTab: TabType;
  setActiveTab?: (tab: TabType) => void;
  currentUserRole: Role;
  currentUser?: User | null;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  onLogout?: () => void;
  loading: boolean;
  waData?: WAStatusData;
  onOpenWhatsAppModal?: () => void;
  currentShift?: CashierShift | null;
  enableCashierShift?: boolean;
  onOpenShiftModal?: () => void;
  onCloseShiftModal?: () => void;
  onOpenTutorialModal?: () => void;
}

const tabBreadcrumbs: Record<TabType, string> = {
  overview: "Dashboard",
  orders: "Pesanan",
  cashflow: "Arus Kas",
  customers: "Pelanggan",
  services: "Layanan",
  reports: "Laporan",
  finance: "Keuangan & Laporan",
  tenants: "Cabang",
  users: "Pengguna",
  logs: "Log Sistem",
  settings: "Pengaturan",
  "create-order": "Buat Pesanan",
  "edit-order": "Edit Pesanan",
  marketing: "Mitra Marketing",
  referral_codes: "Kode Referral",
  subscription: "Langganan",
  plans: "Paket Harga",
  signups: "Pendaftar Baru",
  invoices: "Invoice Tagihan",
  settings_platform: "Pengaturan Platform",
  wa_numbers: "Nomor WhatsApp",
  ai: "Asisten AI",
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  currentUserRole,
  currentUser,
  onOpenMobileMenu,
  onRefresh,
  onLogout,
  loading,
  waData,
  onOpenWhatsAppModal,
  currentShift,
  enableCashierShift = true,
  onOpenShiftModal,
  onCloseShiftModal,
  onOpenTutorialModal,
}) => {
  const activeStatus = checkUserActiveStatus(currentUser);

  const currentTabName =
    activeTab === "reports"
      ? currentUserRole === "superadmin"
        ? "Laporan Platform"
        : "Laporan Keuangan"
      : activeTab === "overview"
      ? currentUserRole === "superadmin"
        ? "Dashboard Platform"
        : currentUserRole === "staff"
        ? "Meja Kerja Kasir"
        : "Dashboard Toko"
      : activeTab === "orders"
      ? currentUserRole === "superadmin"
        ? "Data Order Seluruh Cabang"
        : "Pesanan & Kasir"
      : activeTab === "logs"
      ? "Log Sistem & Audit"
      : tabBreadcrumbs[activeTab] || "Dashboard";

  return (
    <div className="sticky top-0 z-20 no-print">
      {currentUserRole !== "superadmin" && currentUserRole !== "marketing" && currentUser && (
        <TrialBanner
          isTrial={Boolean(currentUser.isTrial)}
          daysRemaining={activeStatus.daysRemaining}
          subscriptionUntil={currentUser.subscriptionUntil}
          setActiveTab={setActiveTab || (() => {})}
        />
      )}
      <header className="bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-2.5">
        <div className="flex items-center justify-between gap-4">
        {/* Left Breadcrumb & Mobile Menu Toggle */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            className="lg:hidden p-2 rounded-xl text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <nav className="flex items-center gap-1.5 text-xs text-zinc-500 min-w-0">
            <span className="hidden sm:inline-block font-medium text-zinc-400">
              {currentUserRole === "superadmin" ? "Laundry Cleanique" : "Laundry POS"}
            </span>
            <ChevronRight className="hidden sm:inline-block w-3.5 h-3.5 text-zinc-300" />
            <span className="font-semibold text-zinc-900">
              {currentTabName}
            </span>
          </nav>
        </div>

        {/* Right Info & Actions - Minimalist and Clean */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Refresh Button - Icon only */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 rounded-lg border border-zinc-200/90 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 hover:border-zinc-300 transition flex items-center justify-center disabled:opacity-40 shadow-2xs cursor-pointer"
            title="Muat Ulang Data (Refresh)"
            aria-label="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-zinc-900" : ""}`} />
          </button>
        </div>
      </div>
    </header>
    </div>
  );
};
