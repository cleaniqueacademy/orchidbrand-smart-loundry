import React from "react";
import { Menu, RefreshCw, ShieldCheck, Store, ChevronRight, Calendar, LogOut } from "lucide-react";
import { TabType, Role, User } from "../../types";

interface HeaderProps {
  activeTab: TabType;
  currentUserRole: Role;
  currentUser?: User | null;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  onLogout?: () => void;
  loading: boolean;
}

const tabBreadcrumbs: Record<TabType, string> = {
  overview: "Ringkasan Operasional",
  orders: "Pesanan Laundry",
  cashflow: "Buku Arus Kas",
  customers: "Manajemen Pelanggan",
  reports: "Laporan & Pembukuan",
  tenants: "Semua Cabang (Tenants)",
  users: "Manajemen Pengguna",
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  currentUserRole,
  currentUser,
  onOpenMobileMenu,
  onRefresh,
  onLogout,
  loading,
}) => {
  const currentTabName = tabBreadcrumbs[activeTab] || "Dashboard";
  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date());

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-blue-100 px-4 sm:px-8 py-2.5 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile Menu & Breadcrumb */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 -ml-1 rounded-lg text-zinc-600 hover:text-zinc-900 hover:bg-blue-50 lg:hidden transition"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-xs text-zinc-500">
            <span className="text-zinc-400 font-medium hidden sm:inline">Orchid Laundry</span>
            <ChevronRight className="w-3.5 h-3.5 text-zinc-300 hidden sm:inline" />
            {/* tab aktif - background biru muda, teks hitam */}
            <span className="font-semibold text-zinc-900 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md">
              {currentTabName}
            </span>
          </nav>
        </div>

        {/* Right Info & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Today's Date */}
          <div className="hidden md:flex items-center gap-1.5 text-[11px] font-medium text-zinc-500 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3 h-3 text-blue-400" />
            <span>{todayFormatted}</span>
          </div>

          {/* Role Badge — biru tua untuk super admin, biru muda untuk owner */}
          {currentUserRole === "superadmin" ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-900 text-white px-2.5 py-1 rounded-lg border border-blue-800 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
              <span>Super Admin</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>Owner Cabang</span>
            </span>
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

          {/* User Profile + Logout */}
          {onLogout && (
            <div className="flex items-center gap-1.5 pl-1 sm:pl-2 sm:border-l sm:border-blue-100">
              {currentUser && (
                <div className="hidden lg:flex items-center gap-2 pr-1">
                  {/* avatar — biru tua, teks putih */}
                  <div className="w-7 h-7 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-[11px] shrink-0">
                    {currentUser.name ? currentUser.name.slice(0, 2).toUpperCase() : "U"}
                  </div>
                  <div className="text-left text-xs leading-tight">
                    {/* nama — tetap hitam */}
                    <div className="font-semibold text-zinc-900 truncate max-w-[120px]">{currentUser.name}</div>
                    <div className="text-[10px] text-zinc-400 truncate max-w-[120px]">{currentUser.email}</div>
                  </div>
                </div>
              )}
              <button
                onClick={onLogout}
                className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 hover:text-rose-700 transition flex items-center gap-1.5 text-xs font-medium shadow-xs"
                title="Keluar dari Akun"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
