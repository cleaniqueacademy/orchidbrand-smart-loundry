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

const pageTitles: Record<TabType, string> = {
  overview: "Ringkasan",
  orders: "Pesanan",
  cashflow: "Arus Kas",
  customers: "Pelanggan",
  tenants: "Cabang & Tenant",
};

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onOpenMobileMenu,
  onRefresh,
  loading,
  onOpenOrderModal,
  onOpenExpenseModal,
}) => {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-100 px-5 sm:px-8 py-3.5">
      <div className="flex items-center justify-between gap-4">
        {/* Left */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenMobileMenu}
            className="p-2 -ml-1.5 rounded-xl text-slate-600 hover:text-black hover:bg-slate-100 lg:hidden transition"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-extrabold tracking-tight text-slate-950">
            {pageTitles[activeTab]}
          </h1>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-black transition disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-600" : ""}`} />
          </button>

          <button
            onClick={onOpenExpenseModal}
            className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-50 text-slate-700 hover:bg-sky-50 hover:text-blue-950 border border-slate-200 flex items-center gap-1.5 transition"
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Catat Biaya</span>
          </button>

          <button
            onClick={onOpenOrderModal}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-blue-900 hover:bg-black text-white flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4 text-sky-400" />
            <span>Order Baru</span>
          </button>
        </div>
      </div>
    </header>
  );
};
