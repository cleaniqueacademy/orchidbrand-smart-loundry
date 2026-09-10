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
    { id: "overview" as TabType, label: "Ringkasan", icon: Sparkles },
    {
      id: "orders" as TabType,
      label: "Pesanan",
      icon: ShoppingBag,
      count: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      highlight: readyOrdersCount > 0 ? readyOrdersCount : undefined,
    },
    { id: "cashflow" as TabType, label: "Arus Kas", icon: DollarSign },
    { id: "customers" as TabType, label: "Pelanggan", icon: Users },
    { id: "tenants" as TabType, label: "Cabang", icon: Building2 },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Brand */}
        <div className="h-16 px-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-950 to-sky-500 flex items-center justify-center shadow-sm">
              <Waves className="w-4.5 h-4.5 text-sky-200" />
            </div>
            <div>
              <div className="font-black text-sm tracking-tight text-slate-950">Orchid Brand</div>
              <p className="text-[10px] font-semibold text-sky-600 uppercase tracking-wider">Smart Laundry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 lg:hidden transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Active Outlet */}
        <div className="px-4 pt-4 pb-2">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                <Store className="w-3 h-3" /> Outlet
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-sky-600">
                <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse" />
                Live
              </span>
            </div>
            <div className="font-bold text-slate-950 text-xs">Cabang Melati Utama</div>
            <div className="text-[10px] text-slate-400 font-mono mt-0.5">{tenantId}</div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
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
                className={`w-full group flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-blue-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-950 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${
                      isActive
                        ? "bg-sky-500/30 text-white"
                        : "bg-slate-100 text-slate-500 group-hover:bg-sky-50 group-hover:text-blue-900"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-sm font-semibold">{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.highlight !== undefined && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                        isActive ? "bg-sky-400 text-blue-950" : "bg-sky-100 text-blue-900"
                      }`}
                    >
                      {item.highlight}
                    </span>
                  )}
                  {item.count !== undefined && (
                    <span
                      className={`text-[11px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                        isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          {/* API Status */}
          <div className="flex items-center gap-2 px-2">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                apiConnected ? "bg-sky-500 animate-pulse" : "bg-rose-500"
              }`}
            />
            <span className="text-[11px] text-slate-500 font-medium">
              {apiConnected ? "API Online" : "Connecting..."}
            </span>
            <span className="ml-auto text-[10px] font-mono text-slate-400">:5000</span>
          </div>

          {/* User */}
          <div className="flex items-center gap-3 px-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-900 to-sky-600 text-white font-bold flex items-center justify-center text-[11px] shadow-sm shrink-0">
              AK
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-950 truncate">Admin Kasir</div>
              <div className="text-[10px] text-slate-400 truncate">admin@laundrymelati.com</div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
