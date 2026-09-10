import React from "react";
import { Menu, Plus, DollarSign, RefreshCw } from "lucide-react";
import { TabType } from "../../types";

interface HeaderProps {
  activeTab: TabType;
  onOpenMobileMenu: () => void;
  onRefresh: () => void;
  loading: boolean;
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onRefresh,
  loading,
  onOpenOrderModal,
  onOpenExpenseModal,
}) => {
  const getPageInfo = () => {
    switch (activeTab) {
      case "overview":
        return {
          title: "Ringkasan Dashboard",
          subtitle: "Performa operasional, arus kas keuangan, dan cucian siap ambil",
        };
      case "orders":
        return {
          title: "Pesanan Laundry",
          subtitle: "Kelola nota cucian, progress pengerjaan, dan notifikasi WhatsApp",
        };
      case "cashflow":
        return {
          title: "Buku Kas & Arus Keuangan",
          subtitle: "Pencatatan uang masuk otomatis & rincian pengeluaran operasional",
        };
      case "customers":
        return {
          title: "Database Pelanggan",
          subtitle: "Daftar kontak pelanggan, riwayat order, dan quick chat WhatsApp",
        };
      case "tenants":
        return {
          title: "Manajemen Tenant & User",
          subtitle: "Monitoring seluruh outlet cabang & user pemilik (1 User = 1 Tenant)",
        };
    }
  };

  const info = getPageInfo();

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-8 py-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-2 rounded-xl text-slate-700 hover:text-black hover:bg-slate-100 lg:hidden transition"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-950">
              {info.title}
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block mt-0.5">
              {info.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Quick Action Buttons & Refresh */}
        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 hover:text-black transition disabled:opacity-50"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>

          <button
            onClick={onOpenExpenseModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-sky-50 text-blue-950 hover:bg-sky-100 border border-sky-200 flex items-center gap-1.5 transition"
          >
            <DollarSign className="w-3.5 h-3.5 text-blue-800" />
            <span className="hidden sm:inline">Catat</span> Uang Keluar
          </button>

          <button
            onClick={onOpenOrderModal}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-black text-white shadow-sm shadow-blue-900/20 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Order Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};
