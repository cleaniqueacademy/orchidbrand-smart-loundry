import React from "react";
import { Menu, RefreshCw, ShieldCheck, Store, ChevronRight, Calendar } from "lucide-react";
import { TabType, Role, User } from "../../types";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";

interface HeaderProps {
  activeTab: TabType;
  currentUserRole: Role;
  currentUser?: User | null;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  onLogout?: () => void;
  loading: boolean;
  waData?: WAStatusData;
  onOpenWhatsAppModal?: () => void;
}

const tabBreadcrumbs: Record<TabType, string> = {
  overview: "Dashboard",
  orders: "Pesanan",
  cashflow: "Arus Kas",
  customers: "Pelanggan",
  reports: "Laporan",
  tenants: "Cabang",
  users: "Pengguna",
  settings: "Pengaturan",
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currentUserRole,
  currentUser,
  onOpenMobileMenu,
  onRefresh,
  onLogout,
  loading,
  waData,
  onOpenWhatsAppModal,
}) => {
  const currentTabName = tabBreadcrumbs[activeTab] || "Dashboard";
  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-zinc-200/80 px-4 sm:px-8 py-2.5 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 -ml-1 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 lg:hidden transition"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="text-zinc-400 font-normal hidden sm:inline">Orchid Laundry</span>
            <span className="text-zinc-300 hidden sm:inline">/</span>
            <span className="font-semibold text-zinc-900">
              {currentTabName}
            </span>
          </nav>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Today's Date */}
          <div className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 font-medium">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* Role Badge */}
          {currentUserRole === "superadmin" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200/80 px-2.5 py-1 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
              <span>Super Admin</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200/80 px-2.5 py-1 rounded-md">
              <Store className="w-3.5 h-3.5 text-zinc-500" />
              <span>Owner Cabang</span>
            </span>
          )}

          {/* WhatsApp Gateway Status Button */}
          {onOpenWhatsAppModal && (
            <button
              type="button"
              id="header-btn-whatsapp-settings"
              onClick={onOpenWhatsAppModal}
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition shadow-2xs cursor-pointer ${
                waData?.waMode === "baileys"
                  ? waData.status === "connected"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                  : "bg-zinc-50 text-zinc-600 border-zinc-200 hover:bg-zinc-100"
              }`}
              title="Klik untuk membuka Pengaturan WhatsApp Gateway"
            >
              <WhatsAppIcon
                className={`w-3.5 h-3.5 ${
                  waData?.waMode === "baileys"
                    ? waData.status === "connected"
                      ? "text-emerald-600"
                      : "text-amber-600 animate-pulse"
                    : "text-zinc-500"
                }`}
              />
              <span className="hidden sm:inline">
                {waData?.status === "connected" ? "WhatsApp Terhubung" : "WhatsApp"}
              </span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-zinc-200 hover:bg-blue-50 hover:border-blue-200 text-zinc-600 hover:text-zinc-900 transition flex items-center gap-1.5 text-xs font-medium disabled:opacity-40 shadow-xs"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-zinc-900" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>
    </header>
  );
};
