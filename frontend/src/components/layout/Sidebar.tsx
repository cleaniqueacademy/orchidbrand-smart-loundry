import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  DollarSign,
  Users,
  Building2,
  X,
  Store,
  ChevronsUpDown,
  Plus,
  ShieldCheck,
  Check,
  Lock,
  FileSpreadsheet,
  LogOut,
} from "lucide-react";
import { TabType, Role, Tenant, User } from "../../types";

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  activeOrdersCount: number;
  readyOrdersCount: number;
  tenantId: string;
  onSelectTenant: (id: string) => void;
  tenants: Tenant[];
  currentUserRole: Role;
  currentUser?: User | null;
  onToggleRole: (newRole: Role) => void;
  onOpenTenantModal: () => void;
  onLogout?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeOrdersCount,
  readyOrdersCount,
  tenantId,
  onSelectTenant,
  tenants,
  currentUserRole,
  currentUser,
  onToggleRole,
  onOpenTenantModal,
  onLogout,
  isOpen,
  onClose,
}) => {
  const [isTenantMenuOpen, setIsTenantMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const tenantMenuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (tenantMenuRef.current && !tenantMenuRef.current.contains(e.target as Node)) {
        setIsTenantMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentTenant = tenants.find((t) => t.id === tenantId) || tenants[0] || {
    id: "tenant-01",
    outletName: "Orchid Laundry - Cabang Melati",
    address: "Jakarta",
  };

  const operationalNav = [
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
    { id: "reports" as TabType, label: "Laporan", icon: FileSpreadsheet },
  ];

  const adminNav = [
    { id: "tenants" as TabType, label: "Semua Cabang", icon: Building2 },
    { id: "users" as TabType, label: "Manajemen User", icon: ShieldCheck },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-blue-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-blue-100 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 no-print ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        {/* Top Header: Team / Tenant Switcher */}
        <div className="p-3 border-b border-blue-100 relative" ref={tenantMenuRef}>
          <button
            onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 transition-colors group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                currentUserRole === "superadmin"
                  ? "bg-blue-900 text-white"
                  : "bg-blue-700 text-white"
              }`}>
                {currentUserRole === "superadmin" ? (
                  <Building2 className="w-4 h-4 text-blue-200" />
                ) : (
                  <Store className="w-4 h-4 text-sky-200" />
                )}
              </div>
              <div className="min-w-0">
                {/* teks nama outlet — tetap hitam */}
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {currentUserRole === "superadmin"
                    ? tenantId === "all"
                      ? "Orchid Pusat (HQ)"
                      : `[Inspeksi] ${currentTenant?.outletName || "Cabang"}`
                    : (currentTenant?.outletName || "Orchid Laundry - Cabang Melati")}
                </div>
                <div className="text-[11px] text-zinc-500 font-medium truncate">
                  {currentUserRole === "superadmin"
                    ? tenantId === "all"
                      ? "Super Admin (Pusat)"
                      : "Mode Inspeksi Cabang"
                    : "Outlet Anda (Tenant Owner)"}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-1" />
          </button>

          {/* Tenants Dropdown Popover */}
          {isTenantMenuOpen && (
            <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-blue-100 rounded-xl shadow-xl shadow-blue-900/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              {currentUserRole === "superadmin" ? (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1.5">
                    Lingkup Pengawasan Admin
                  </div>

                  <button
                    onClick={() => { onSelectTenant("all"); setIsTenantMenuOpen(false); }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition mb-1 ${
                      tenantId === "all"
                        ? "bg-blue-900 text-white font-semibold"
                        : "hover:bg-blue-50 text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                        tenantId === "all" ? "bg-blue-800 text-white" : "bg-blue-50 border border-blue-100"
                      }`}>
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left truncate">
                        <div className="truncate">Semua Cabang (Konsolidasi)</div>
                        <div className={`text-[10px] ${tenantId === "all" ? "text-blue-200" : "text-zinc-400"}`}>
                          Pusat · {tenants.length} Cabang Terhubung
                        </div>
                      </div>
                    </div>
                    {tenantId === "all" && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>

                  <div className="h-px bg-blue-50 my-1" />

                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1">
                    Inspeksi Cabang Milik Owner:
                  </div>

                  <div className="space-y-0.5 max-h-40 overflow-y-auto">
                    {tenants.map((t, idx) => {
                      const isSelected = tenantId === t.id;
                      return (
                        <button
                          key={t.id}
                          onClick={() => { onSelectTenant(t.id); setIsTenantMenuOpen(false); }}
                          className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition ${
                            isSelected
                              ? "bg-blue-50 font-semibold text-zinc-900"
                              : "hover:bg-blue-50/50 text-zinc-700"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <div className="w-6 h-6 rounded-md bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0">
                              <Store className="w-3.5 h-3.5 text-blue-600" />
                            </div>
                            <div className="text-left truncate">
                              <div className="truncate">{t.outletName}</div>
                              <div className="text-[10px] text-zinc-400">
                                Owner: {t.owner?.name || "Budi Santoso"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 text-zinc-400 font-mono text-[10px]">
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-zinc-900 stroke-[2.5]" />
                            ) : (
                              <span>⌘{idx + 1}</span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="h-px bg-blue-50 my-1" />

                  <button
                    onClick={() => { setIsTenantMenuOpen(false); onOpenTenantModal(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-blue-50 transition"
                  >
                    <div className="w-6 h-6 rounded-md border border-blue-200 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span>Daftarkan Cabang & Owner Baru</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1.5">
                    Outlet Anda
                  </div>

                  <div className="space-y-0.5">
                    {tenants.filter((t) => t.id === tenantId || t.id === "tenant-01").map((t) => (
                      <div
                        key={t.id}
                        className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs bg-blue-50 font-semibold text-zinc-900"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="w-6 h-6 rounded-md bg-blue-900 text-white flex items-center justify-center shrink-0">
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left truncate">
                            <div className="truncate">{t.outletName}</div>
                            <div className="text-[10px] text-zinc-500 font-normal">
                              Pemilik: {currentUser?.name || "Budi Santoso"} (Anda)
                            </div>
                          </div>
                        </div>
                        <Check className="w-3.5 h-3.5 text-zinc-900 stroke-[2.5]" />
                      </div>
                    ))}
                  </div>

                  <div className="h-px bg-blue-50 my-1.5" />

                  <div
                    className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-zinc-400 bg-zinc-50/70 cursor-not-allowed select-none"
                    title="Hanya Super Admin yang dapat mendaftarkan cabang baru"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md border border-dashed border-blue-200 flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-zinc-400" />
                      </div>
                      <span>Tambah Cabang</span>
                    </div>
                    <span className="text-[10px] text-zinc-400 flex items-center gap-1 font-medium">
                      <Lock className="w-3 h-3" /> Khusus Super Admin
                    </span>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {/* Operasional Group */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
              Operasional
            </div>
            <nav className="space-y-0.5">
              {operationalNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { setActiveTab(item.id); onClose(); }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition ${
                      isActive
                        ? "bg-gradient-to-r from-blue-900 to-blue-600 text-white shadow-sm shadow-blue-900/30"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-900"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.highlight !== undefined && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          isActive ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800"
                        }`}>
                          {item.highlight}
                        </span>
                      )}
                      {item.count !== undefined && (
                        <span className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                          isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                        }`}>
                          {item.count}
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Super Admin Section */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5 flex items-center justify-between">
              <span>Admin Super</span>
              {currentUserRole === "superadmin" ? (
                <span className="text-[9px] bg-blue-900 text-white px-1.5 py-0.2 rounded font-mono">
                  ACTIVE
                </span>
              ) : (
                <span className="text-[9px] text-zinc-400 font-mono">LOCKED</span>
              )}
            </div>

            <nav className="space-y-0.5">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isAccessible = currentUserRole === "superadmin";

                return (
                  <button
                    key={item.id}
                    disabled={!isAccessible}
                    onClick={() => {
                      if (isAccessible) { setActiveTab(item.id); onClose(); }
                    }}
                    className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition ${
                      !isAccessible
                        ? "opacity-40 cursor-not-allowed text-zinc-400"
                        : isActive
                        ? "bg-gradient-to-r from-blue-900 to-blue-600 text-white shadow-sm shadow-blue-900/30"
                        : "text-zinc-600 hover:text-zinc-900 hover:bg-blue-50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-900"
                        }`}
                      />
                      <span>{item.label}</span>
                    </div>
                    {!isAccessible && <Lock className="w-3 h-3 text-zinc-400" />}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-blue-100 relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 transition-colors group text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser?.name
                  ? currentUser.name.slice(0, 2).toUpperCase()
                  : currentUserRole === "superadmin" ? "AP" : "BS"}
              </div>
              <div className="min-w-0">
                {/* teks nama — tetap hitam */}
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {currentUser?.name || (currentUserRole === "superadmin" ? "Admin Pusat" : "Budi Santoso")}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {currentUser?.email || (currentUserRole === "superadmin" ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
                </div>
              </div>
            </div>
            <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-1" />
          </button>

          {/* User Profile Popover */}
          {isUserMenuOpen && (
            <div className="absolute left-3 right-3 bottom-full mb-1 bg-white border border-blue-100 rounded-xl shadow-xl shadow-blue-900/10 p-2.5 z-50 animate-in fade-in zoom-in-95 duration-100">
              <div className="p-2 rounded-lg bg-blue-50 border border-blue-100 mb-2">
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {currentUser?.name || (currentUserRole === "superadmin" ? "Admin Pusat" : "Budi Santoso")}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {currentUser?.email || (currentUserRole === "superadmin" ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center text-[9px] font-semibold bg-blue-900 text-white px-1.5 py-0.5 rounded">
                    {currentUserRole === "superadmin" ? "Super Admin" : "Tenant Owner"}
                  </span>
                  <span className="inline-flex items-center text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    Aktif
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={() => { setIsUserMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun</span>
                </button>
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
