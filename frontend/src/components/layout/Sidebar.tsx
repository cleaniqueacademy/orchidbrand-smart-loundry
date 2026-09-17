import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  DollarSign,
  Users,
  Building2,
  Store,
  ChevronsUpDown,
  Plus,
  ShieldCheck,
  Check,
  FileSpreadsheet,
  LogOut,
} from "lucide-react";
import { TabType, Role, Tenant, User } from "../../types";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";

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
  onOpenWhatsAppModal?: () => void;
  waData?: WAStatusData;
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
  onOpenTenantModal,
  onOpenWhatsAppModal,
  waData,
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

  const isSuperAdmin = currentUserRole === "superadmin";

  // Navigation untuk Super Admin (Tata Kelola Sistem & Audit Data Bersih)
  const adminSystemNav = [
    { id: "overview" as TabType, label: "Dashboard Pusat", icon: Building2 },
    { id: "tenants" as TabType, label: "Data Cabang / Outlet", icon: Store },
    { id: "users" as TabType, label: "Pengguna & Lisensi", icon: ShieldCheck },
  ];

  const adminDataNav = [
    {
      id: "orders" as TabType,
      label: "Data Semua Pesanan",
      icon: ShoppingBag,
      count: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      highlight: readyOrdersCount > 0 ? readyOrdersCount : undefined,
    },
    { id: "cashflow" as TabType, label: "Data Arus Kas & Biaya", icon: DollarSign },
    { id: "customers" as TabType, label: "Direktori Pelanggan", icon: Users },
    { id: "reports" as TabType, label: "Laporan Konsolidasi", icon: FileSpreadsheet },
  ];

  // Navigation untuk Tenant Owner / Staff (Operasional Kasir Outlet)
  const tenantOperationalNav = [
    { id: "overview" as TabType, label: "Dashboard Outlet", icon: Sparkles },
    {
      id: "orders" as TabType,
      label: "Kasir & Pesanan",
      icon: ShoppingBag,
      count: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      highlight: readyOrdersCount > 0 ? readyOrdersCount : undefined,
    },
    { id: "cashflow" as TabType, label: "Buku Kas & Biaya", icon: DollarSign },
    { id: "customers" as TabType, label: "Manajemen Pelanggan", icon: Users },
    { id: "reports" as TabType, label: "Laporan Keuangan", icon: FileSpreadsheet },
  ];

  const renderNavButtons = (items: typeof tenantOperationalNav) => (
    <nav className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
            className={`w-full group flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium transition cursor-pointer ${
              isActive
                ? "bg-gradient-to-r from-blue-900 to-blue-600 text-white shadow-sm shadow-blue-900/30 font-semibold"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-blue-50"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-zinc-500 group-hover:text-zinc-900"
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              {item.highlight !== undefined && (
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-sky-100 text-sky-800"
                  }`}
                >
                  {item.highlight}
                </span>
              )}
              {item.count !== undefined && (
                <span
                  className={`text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center ${
                    isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
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
  );

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
        {/* Top Header: Switcher Cabang untuk Admin / Badge Outlet untuk Tenant */}
        <div className="p-3 border-b border-blue-100 relative" ref={tenantMenuRef}>
          {isSuperAdmin ? (
            <>
              <button
                onClick={() => setIsTenantMenuOpen(!isTenantMenuOpen)}
                className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 transition-colors group text-left cursor-pointer"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm bg-blue-900 text-white">
                    <Building2 className="w-4 h-4 text-blue-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-zinc-900 truncate">
                      {tenantId === "all"
                        ? "Orchid Pusat (HQ)"
                        : `[Inspeksi] ${currentTenant?.outletName || "Cabang"}`}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-medium truncate">
                      {tenantId === "all"
                        ? "Super Admin (Pusat)"
                        : "Mode Inspeksi Cabang"}
                    </div>
                  </div>
                </div>
                <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-1" />
              </button>

              {/* Tenants Dropdown Popover (Super Admin Only) */}
              {isTenantMenuOpen && (
                <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-blue-100 rounded-xl shadow-xl shadow-blue-900/10 p-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1.5">
                    Lingkup Pengawasan Admin
                  </div>

                  <button
                    onClick={() => {
                      onSelectTenant("all");
                      setIsTenantMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition mb-1 cursor-pointer ${
                      tenantId === "all"
                        ? "bg-blue-900 text-white font-semibold"
                        : "hover:bg-blue-50 text-zinc-700"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div
                        className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                          tenantId === "all"
                            ? "bg-blue-800 text-white"
                            : "bg-blue-50 border border-blue-100"
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="text-left truncate">
                        <div className="truncate">Semua Cabang (Konsolidasi)</div>
                        <div
                          className={`text-[10px] ${
                            tenantId === "all" ? "text-blue-200" : "text-zinc-400"
                          }`}
                        >
                          Pusat · {tenants.length} Cabang Terhubung
                        </div>
                      </div>
                    </div>
                    {tenantId === "all" && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>

                  <div className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 px-2.5 py-1.5 mt-1 border-t border-blue-50">
                    Pilih Cabang untuk Inspeksi
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-0.5">
                    {tenants.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          onSelectTenant(t.id);
                          setIsTenantMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                          tenantId === t.id
                            ? "bg-blue-900 text-white font-semibold"
                            : "hover:bg-blue-50 text-zinc-700"
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                              tenantId === t.id
                                ? "bg-blue-800 text-white"
                                : "bg-blue-50 border border-blue-100"
                            }`}
                          >
                            <Store className="w-3.5 h-3.5" />
                          </div>
                          <div className="text-left truncate">
                            <div className="truncate">{t.outletName}</div>
                            <div
                              className={`text-[10px] ${
                                tenantId === t.id ? "text-blue-200" : "text-zinc-400"
                              }`}
                            >
                              {t.owner?.name ? `Owner: ${t.owner.name}` : t.phone}
                            </div>
                          </div>
                        </div>
                        {tenantId === t.id && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>

                  <div className="h-px bg-blue-50 my-1.5" />

                  <button
                    onClick={() => {
                      setIsTenantMenuOpen(false);
                      onOpenTenantModal();
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-800 hover:bg-blue-50 transition cursor-pointer"
                  >
                    <div className="w-6 h-6 rounded-md border border-blue-200 flex items-center justify-center">
                      <Plus className="w-3.5 h-3.5 text-blue-700" />
                    </div>
                    <span>Daftarkan Cabang & Owner Baru</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left bg-blue-50/50 border border-blue-100/80">
              <div className="w-8 h-8 rounded-lg bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-sm">
                <Store className="w-4 h-4 text-sky-200" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {currentTenant?.outletName || "Orchid Laundry - Cabang Melati"}
                </div>
                <div className="text-[11px] text-zinc-500 font-medium truncate">
                  Outlet Anda (Tenant Owner)
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Content */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {/* JIKA SUPER ADMIN: TAMPILKAN MENU TATA KELOLA SISTEM & DATA JARINGAN */}
          {isSuperAdmin ? (
            <>
              {/* Grup 1: Manajemen Sistem */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5 flex items-center justify-between">
                  <span>Manajemen Sistem</span>
                  <span className="text-[9px] bg-blue-900 text-white px-1.5 py-0.2 rounded font-mono">
                    PUSAT
                  </span>
                </div>
                {renderNavButtons(adminSystemNav)}
              </div>

              {/* Grup 2: Data Jaringan & Audit */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                  Data Jaringan & Audit
                </div>
                {renderNavButtons(adminDataNav)}
              </div>
            </>
          ) : (
            /* JIKA BUKAN SUPER ADMIN: TAMPILKAN MENU OPERASIONAL OUTLET */
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                Operasional Outlet
              </div>
              {renderNavButtons(tenantOperationalNav)}
            </div>
          )}

          {/* Grup Bersama: Notifikasi & Integrasi */}
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5 flex items-center justify-between">
              <span>Notifikasi & Integrasi</span>
            </div>
            <button
              type="button"
              id="sidebar-btn-whatsapp-settings"
              onClick={() => {
                if (onOpenWhatsAppModal) {
                  onOpenWhatsAppModal();
                  onClose();
                }
              }}
              className="w-full group flex items-center justify-between px-3 py-2 rounded-lg text-left text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-emerald-50/70 border border-zinc-100 hover:border-emerald-200 transition shadow-2xs cursor-pointer"
              title="Atur koneksi WhatsApp: Otomatis via Baileys atau Manual via wa.me"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="truncate">Pengaturan WhatsApp</span>
              </div>

              <span
                className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                  waData?.waMode === "baileys"
                    ? waData.status === "connected"
                      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200 animate-pulse"
                    : "bg-blue-50 text-blue-800 border-blue-200"
                }`}
              >
                {waData?.waMode === "baileys"
                  ? waData.status === "connected"
                    ? "Baileys Aktif"
                    : "Scan QR"
                  : "Manual wa.me"}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom User Profile */}
        <div className="p-3 border-t border-blue-100 relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-blue-50 transition-colors group text-left cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser?.name
                  ? currentUser.name.slice(0, 2).toUpperCase()
                  : isSuperAdmin ? "AP" : "BS"}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {currentUser?.name || (isSuperAdmin ? "Admin Pusat" : "Budi Santoso")}
                </div>
                <div className="text-[10px] text-zinc-400 truncate">
                  {currentUser?.email || (isSuperAdmin ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
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
                  {currentUser?.name || (isSuperAdmin ? "Admin Pusat" : "Budi Santoso")}
                </div>
                <div className="text-[10px] text-zinc-500 truncate">
                  {currentUser?.email || (isSuperAdmin ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <span className="inline-flex items-center text-[9px] font-semibold bg-blue-900 text-white px-1.5 py-0.5 rounded">
                    {isSuperAdmin ? "Super Admin" : "Tenant Owner"}
                  </span>
                  <span className="inline-flex items-center text-[9px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    Aktif
                  </span>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={() => { setIsUserMenuOpen(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition cursor-pointer"
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
