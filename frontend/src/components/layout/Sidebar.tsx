import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  ShoppingBag,
  DollarSign,
  Users,
  Building2,
  Store,
  ChevronsUpDown,
  ShieldCheck,
  FileSpreadsheet,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
  sidebarWidth?: number;
  setSidebarWidth?: (width: number | ((prev: number) => number)) => void;
  isDragging?: boolean;
  setIsDragging?: (dragging: boolean) => void;
  isDesktop?: boolean;
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
  onLogout,
  isOpen,
  onClose,
  sidebarWidth = 256,
  setSidebarWidth,
  isDragging = false,
  setIsDragging,
  isDesktop = true,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const isCollapsed = isDesktop && sidebarWidth <= 110;

  const handleToggleCollapse = () => {
    if (!setSidebarWidth) return;
    const targetWidth = isCollapsed ? 256 : 68;
    setSidebarWidth(targetWidth);
    try {
      localStorage.setItem("orchid_sidebar_width", String(targetWidth));
    } catch {
      // ignore
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!setSidebarWidth) return;
    setIsDragging?.(true);

    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      let newWidth = moveEvent.clientX;
      if (newWidth < 125) {
        newWidth = 68; // snap to mini icon-only sidebar
      } else {
        newWidth = Math.min(Math.max(newWidth, 180), 420);
      }
      setSidebarWidth(newWidth);
      try {
        localStorage.setItem("orchid_sidebar_width", String(newWidth));
      } catch {
        // ignore
      }
    };

    const handleMouseUp = () => {
      setIsDragging?.(false);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  const handleDoubleClick = () => {
    handleToggleCollapse();
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
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

  // Menu Super Admin: maksimal 2 kata per label
  const adminSystemNav = [
    { id: "overview" as TabType, label: "Dashboard", icon: Building2 },
    { id: "tenants" as TabType, label: "Cabang", icon: Store },
    { id: "users" as TabType, label: "Pengguna", icon: ShieldCheck },
  ];

  const adminDataNav = [
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

  // Menu Tenant Owner / Staff: maksimal 2 kata per label
  const tenantOperationalNav = [
    { id: "overview" as TabType, label: "Dashboard", icon: Sparkles },
    {
      id: "orders" as TabType,
      label: "Kasir",
      icon: ShoppingBag,
      count: activeOrdersCount > 0 ? activeOrdersCount : undefined,
      highlight: readyOrdersCount > 0 ? readyOrdersCount : undefined,
    },
    { id: "cashflow" as TabType, label: "Buku Kas", icon: DollarSign },
    { id: "customers" as TabType, label: "Pelanggan", icon: Users },
    { id: "reports" as TabType, label: "Laporan", icon: FileSpreadsheet },
    { id: "settings" as TabType, label: "Pengaturan", icon: Settings },
  ];

  const renderNavButtons = (items: typeof tenantOperationalNav) => (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive =
          activeTab === item.id ||
          (item.id === "orders" && (activeTab === "create-order" || activeTab === "edit-order"));
        return (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.96 }}
            onClick={() => {
              setActiveTab(item.id);
              onClose();
            }}
            title={item.label}
            className={`w-full group flex items-center ${
              isCollapsed ? "justify-center px-0 py-2.5" : "justify-between px-3 py-2"
            } rounded-xl text-left text-xs transition-colors cursor-pointer relative ${
              isActive
                ? isSuperAdmin
                  ? "bg-gradient-to-r from-blue-900 to-blue-800 text-white font-semibold shadow-xs"
                  : "bg-zinc-900 text-white font-semibold shadow-xs"
                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 font-medium"
            }`}
          >
            <div className="relative flex items-center justify-center">
              <Icon
                className={`w-4 h-4 shrink-0 transition-colors ${
                  isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-700"
                }`}
              />
              {isCollapsed && item.count !== undefined && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 text-[9px] font-bold rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                  {item.count}
                </span>
              )}
            </div>

            {!isCollapsed && (
              <>
                <span className="truncate ml-2.5 flex-1">{item.label}</span>
                {item.count !== undefined && (
                  <span
                    className={`text-[10px] font-semibold min-w-[18px] h-[18px] px-1.5 rounded-full flex items-center justify-center shrink-0 ${
                      isActive ? "bg-white/20 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </>
            )}
          </motion.button>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-zinc-950/60 backdrop-blur-xs z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        style={{
          width: isDesktop ? `${isCollapsed ? 68 : sidebarWidth}px` : undefined,
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-zinc-200/80 flex flex-col ${
          isDragging
            ? "transition-none select-none"
            : "transition-[transform,width] duration-200 ease-out"
        } lg:translate-x-0 no-print ${
          isOpen ? "w-64 translate-x-0 shadow-2xl" : "w-64 -translate-x-full"
        }`}
      >
        {/* Top Header */}
        {isCollapsed ? (
          <div className="h-16 px-2 flex items-center justify-center border-b border-zinc-100 shrink-0">
            <button
              type="button"
              onClick={handleToggleCollapse}
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-xs cursor-pointer hover:opacity-90 transition ${
                isSuperAdmin
                  ? "bg-gradient-to-br from-blue-700 via-blue-800 to-sky-600 text-white"
                  : "bg-zinc-900 text-white"
              }`}
              title="Perluas Sidebar (Klik untuk membuka menu)"
            >
              {isSuperAdmin ? <Building2 className="w-4.5 h-4.5" /> : <Store className="w-4.5 h-4.5" />}
            </button>
          </div>
        ) : (
          <div className="h-16 px-3.5 flex items-center justify-between border-b border-zinc-100 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                  isSuperAdmin
                    ? "bg-gradient-to-br from-blue-700 via-blue-800 to-sky-600 text-white"
                    : "bg-zinc-900 text-white"
                }`}
              >
                {isSuperAdmin ? <Building2 className="w-4 h-4" /> : <Store className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-zinc-900 truncate">
                  {isSuperAdmin ? "Orchid Pusat" : currentTenant?.outletName || "Cabang Laundry"}
                </div>
                <div className="text-[11px] text-zinc-400 font-medium truncate">
                  {isSuperAdmin ? "Super Admin" : "Owner Cabang"}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              title="Ciutkan Sidebar (Hanya Ikon)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Content */}
        <div className={`flex-1 ${isCollapsed ? "px-2" : "px-3"} py-3 overflow-y-auto space-y-4`}>
          {isSuperAdmin ? (
            <>
              {/* Grup 1: Manajemen Sistem */}
              <div>
                {isCollapsed ? (
                  <div className="h-px bg-zinc-100 my-2 mx-1" />
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                    Manajemen Sistem
                  </div>
                )}
                {renderNavButtons(adminSystemNav)}
              </div>

              {/* Grup 2: Data Jaringan */}
              <div>
                {isCollapsed ? (
                  <div className="h-px bg-zinc-100 my-2 mx-1" />
                ) : (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                    Data Jaringan
                  </div>
                )}
                {renderNavButtons(adminDataNav)}
              </div>
            </>
          ) : (
            /* Grup Operasional untuk Tenant */
            <div>
              {isCollapsed ? (
                <div className="h-px bg-zinc-100 my-2 mx-1" />
              ) : (
                <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                  Operasional
                </div>
              )}
              {renderNavButtons(tenantOperationalNav)}
            </div>
          )}

          {/* Grup Notifikasi / Integrasi */}
          <div>
            {isCollapsed ? (
              <div className="h-px bg-zinc-100 my-2 mx-1" />
            ) : (
              <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 mb-1.5">
                Integrasi
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.96 }}
              type="button"
              id="sidebar-btn-whatsapp-settings"
              onClick={() => {
                if (onOpenWhatsAppModal) {
                  onOpenWhatsAppModal();
                  onClose();
                }
              }}
              className={`w-full group flex items-center ${
                isCollapsed ? "justify-center p-2.5" : "gap-2.5 px-3 py-2"
              } rounded-xl text-left text-xs font-medium text-zinc-700 hover:text-zinc-900 hover:bg-emerald-50/70 border border-transparent hover:border-emerald-200 transition-colors shadow-2xs cursor-pointer`}
              title="Pengaturan WhatsApp"
            >
              <div className="w-5 h-5 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0">
                <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              {!isCollapsed && <span className="truncate">Pengaturan WhatsApp</span>}
            </motion.button>
          </div>
        </div>

        {/* Bottom User Profile */}
        <div className={`${isCollapsed ? "p-2" : "p-3"} border-t border-zinc-100 relative`} ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className={`w-full flex items-center ${
              isCollapsed ? "justify-center p-1" : "justify-between p-2"
            } rounded-xl hover:bg-zinc-100 transition-colors group text-left cursor-pointer`}
            title={currentUser?.name || (isSuperAdmin ? "Admin Pusat" : "Budi Santoso")}
          >
            <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-2.5"} min-w-0`}>
              <div className="w-8 h-8 rounded-lg bg-zinc-900 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                {currentUser?.name
                  ? currentUser.name.slice(0, 2).toUpperCase()
                  : isSuperAdmin ? "AP" : "BS"}
              </div>
              {!isCollapsed && (
                <div className="min-w-0">
                  <div className="text-xs font-bold text-zinc-900 truncate">
                    {currentUser?.name || (isSuperAdmin ? "Admin Pusat" : "Budi Santoso")}
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate">
                    {currentUser?.email || (isSuperAdmin ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
                  </div>
                </div>
              )}
            </div>
            {!isCollapsed && (
              <ChevronsUpDown className="w-4 h-4 text-zinc-400 group-hover:text-zinc-700 shrink-0 ml-1" />
            )}
          </button>

          {/* User Profile Popover */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                className={`absolute ${
                  isCollapsed ? "left-14 bottom-1 w-56 shadow-2xl" : "left-3 right-3 bottom-full mb-1"
                } bg-white border border-zinc-200 rounded-xl shadow-xl p-2.5 z-50`}
              >
                <div className="p-2 rounded-lg bg-zinc-50 border border-zinc-100 mb-2">
                  <div className="text-xs font-bold text-zinc-900 truncate">
                    {currentUser?.name || (isSuperAdmin ? "Admin Pusat" : "Budi Santoso")}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {currentUser?.email || (isSuperAdmin ? "admin@orchidbrand.com" : "budi@laundrymelati.com")}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap text-[11px] text-zinc-600">
                    <span className="font-semibold text-blue-950">
                      {isSuperAdmin ? "Super Admin" : "Tenant Owner"}
                    </span>
                    <span>·</span>
                    <span className="text-emerald-700 font-medium">Aktif</span>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={() => { setIsUserMenuOpen(false); onLogout(); }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Akun</span>
                  </button>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop Resizable Drag Handle */}
        <div
          onMouseDown={handleMouseDown}
          onDoubleClick={handleDoubleClick}
          className="hidden lg:flex absolute top-0 right-0 -mr-1.5 w-3 h-full cursor-col-resize items-center justify-center group z-50 hover:bg-blue-500/10 active:bg-blue-500/20 transition-colors"
          title={
            isCollapsed
              ? "Tarik ke kanan untuk membuka sidebar (Klik 2x untuk buka normal)"
              : "Tarik ke kiri untuk menciutkan hanya ikon (Klik 2x untuk ciutkan)"
          }
        >
          {/* Visual grab pill */}
          <div className="w-1 h-8 rounded-full bg-zinc-300 group-hover:bg-blue-600 group-active:bg-blue-700 transition-colors shadow-2xs" />
        </div>
      </aside>
    </>
  );
};
