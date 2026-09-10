import React from "react";
import {
  Sparkles,
  ShoppingBag,
  DollarSign,
  Users,
  Building2,
  Waves,
  X,
  Store,
  ChevronRight
} from "lucide-react";
import { TabType } from "../../types";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeOrdersCount: number;
  readyOrdersCount: number;
  tenantId: string;
  apiConnected: boolean | null;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  readyOrdersCount,
  tenantId,
  apiConnected,
  isOpen,
  onClose,
}) => {
  const navItems = [
    {
      id: "overview" as TabType,
      label: "Ringkasan",
      sublabel: "Dashboard & Metrik",
      icon: Sparkles,
    },
    {
      id: "orders" as TabType,
      label: "Pesanan Laundry",
      sublabel: "Kasir & Status Cucian",
      icon: ShoppingBag,
      badge: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      highlightBadge: readyOrdersCount > 0 ? `${readyOrdersCount} Siap` : undefined,
    },
    {
      id: "cashflow" as TabType,
      label: "Arus Kas",
      sublabel: "Uang Masuk & Keluar",
      icon: DollarSign,
    },
    {
      id: "customers" as TabType,
      label: "Data Pelanggan",
      sublabel: "Buku Kontak & WhatsApp",
      icon: Users,
    },
    {
      id: "tenants" as TabType,
      label: "Cabang & User",
      sublabel: "Superadmin Multi-Tenant",
      icon: Building2,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="h-20 px-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-950 via-blue-800 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-900/20">
              <Waves className="w-5 h-5 text-sky-200 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-slate-950">
                  Orchid Brand
                </span>
              </div>
              <p className="text-[11px] font-bold text-sky-600 tracking-wider uppercase">
                Smart Laundry
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Active Outlet Card */}
        <div className="px-4 pt-5 pb-2">
          <div className="p-3.5 rounded-2xl bg-gradient-to-br from-sky-50 via-white to-blue-50/50 border border-sky-200/80">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                <Store className="w-3.5 h-3.5 text-blue-700" /> Outlet Aktif
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-900 text-sky-200 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                Live
              </span>
            </div>
            <div className="font-extrabold text-slate-950 text-sm">Cabang Melati Utama</div>
            <div className="text-[11px] text-blue-800/80 font-mono mt-0.5">ID: {tenantId}</div>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Menu Dashboard
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  onClose();
                }}
                className={`w-full group flex items-center justify-between px-3.5 py-3 rounded-xl text-left transition-all duration-150 ${
                  isActive
                    ? "bg-blue-900 text-white font-semibold shadow-md shadow-blue-950/20"
                    : "text-slate-700 hover:text-blue-950 hover:bg-sky-50/60"
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-sky-500 text-white shadow-sm"
                        : "bg-slate-100 text-slate-600 group-hover:bg-sky-100 group-hover:text-blue-900"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <div className="text-sm leading-snug">{item.label}</div>
                    <div
                      className={`text-[11px] truncate ${
                        isActive ? "text-sky-200" : "text-slate-400 group-hover:text-slate-500"
                      }`}
                    >
                      {item.sublabel}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.highlightBadge && (
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "bg-sky-400 text-blue-950"
                          : "bg-sky-100 text-blue-900 border border-sky-200"
                      }`}
                    >
                      {item.highlightBadge}
                    </span>
                  )}
                  {item.badge !== undefined && (
                    <span
                      className={`text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center ${
                        isActive
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {!isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue-600 transition" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Info: Server & User */}
        <div className="p-4 border-t border-slate-100 space-y-3 bg-white">
          {/* API Status */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/70 text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  apiConnected ? "bg-sky-500 animate-pulse" : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-slate-700 text-[11px]">
                {apiConnected ? "Hono Bun API Online" : "Connecting..."}
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-sky-700">:5000</span>
          </div>

          {/* User Profile Info */}
          <div className="flex items-center gap-3 px-2 pt-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-900 to-sky-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              AK
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-extrabold text-slate-950 truncate">Admin Kasir</div>
              <div className="text-[10px] text-slate-400 truncate">admin@laundrymelati.com</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
