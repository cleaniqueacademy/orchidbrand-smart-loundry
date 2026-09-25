import React from "react";
import { Menu, RefreshCw, ShieldCheck, ChevronRight, DollarSign, HelpCircle } from "lucide-react";
import { TabType, Role, User, CashierShift } from "../../types";
import WhatsAppIcon from "../common/WhatsAppIcon";
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

        {/* Right Info & Actions - Streamlined and Minimalist */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Cashier Shift Status (Only for Staff & Owner if feature enabled) */}
          {currentUserRole !== "superadmin" && enableCashierShift !== false && (
            <div id="tour-shift-btn">
              {currentShift ? (
                <button
                  type="button"
                  onClick={onCloseShiftModal}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/90 hover:bg-emerald-100 transition shadow-2xs cursor-pointer text-xs"
                  title={`Shift sedang aktif (Kas Awal: Rp ${currentShift.startingCash.toLocaleString("id-ID")}). Klik untuk tutup shift & rekonsiliasi.`}
                >
                  <span className="text-[11px] font-semibold">Shift Aktif</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenShiftModal}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200/90 hover:bg-amber-100 transition shadow-2xs cursor-pointer text-xs"
                  title="Shift belum dibuka. Klik untuk input modal kas awal."
                >
                  <DollarSign className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-[11px] font-semibold">Buka Shift</span>
                </button>
              )}
            </div>
          )}

          {/* Super Admin Badge (Only for Super Admin, subtly styled) */}
          {currentUserRole === "superadmin" && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Super Admin</span>
            </span>
          )}

          {/* WhatsApp Gateway Status Button (Staff & Owner) */}
          {onOpenWhatsAppModal && currentUserRole !== "superadmin" && (
            <button
              type="button"
              id="tour-whatsapp-btn"
              onClick={onOpenWhatsAppModal}
              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition shadow-2xs cursor-pointer ${
                waData?.waMode === "baileys"
                  ? waData.status === "connected"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/90 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-800 border-amber-200/90 hover:bg-amber-100"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
              title={
                waData?.status === "connected"
                  ? "WhatsApp Outlet Terhubung (Klik untuk info)"
                  : "WhatsApp Belum Terhubung (Klik untuk pengaturan)"
              }
            >
              <WhatsAppIcon
                className={`w-3.5 h-3.5 ${
                  waData?.waMode === "baileys"
                    ? waData.status === "connected"
                      ? "text-emerald-600"
                      : "text-amber-600"
                    : "text-zinc-500"
                }`}
              />
              <span className="text-[11px] font-semibold">
                {waData?.status === "connected" ? "WA Aktif" : "WA"}
              </span>
            </button>
          )}

          {/* Panduan Tutorial Button */}
          {onOpenTutorialModal && (
            <button
              type="button"
              id="header-btn-tutorial"
              onClick={onOpenTutorialModal}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border border-indigo-200/90 bg-indigo-50/80 text-indigo-800 hover:bg-indigo-100 hover:border-indigo-300 transition shadow-2xs cursor-pointer"
              title="Buka Panduan Tutorial Sistem"
            >
              <HelpCircle className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-semibold hidden md:inline">Panduan</span>
            </button>
          )}

          {/* Subtle divider before refresh */}
          <div className="h-4 w-px bg-zinc-200 mx-0.5 hidden sm:block" />

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
