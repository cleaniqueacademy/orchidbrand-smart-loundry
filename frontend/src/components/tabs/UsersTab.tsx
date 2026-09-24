import React, { useState } from "react";
import {
  Plus,
  User,
  ShieldCheck,
  Mail,
  Store,
  Trash2,
  Calendar,
  Clock,
  Sparkles,
  KeyRound,
  Search,
  ChevronRight,
  ChevronLeft,
  Shield,
  CheckCircle2,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { User as UserType, Role, Tenant } from "../../types";
import { useToast } from "../common/ToastContext";
import { ExtendSubscriptionModal } from "../modals/ExtendSubscriptionModal";
import { ResetPasswordModal } from "../modals/ResetPasswordModal";
import { checkUserActiveStatus } from "../../utils/subscriptionUtils";

interface UsersTabProps {
  users: UserType[];
  tenants: Tenant[];
  onOpenUserModal: () => void;
  onDeleteUser: (id: string) => void;
  onToggleStatus: (userId: string, currentStatus: "active" | "inactive") => void;
  onUpdateSubscription: (userId: string, subscriptionUntil: string) => void;
  onExtendSubscription?: (
    userId: string,
    payload: { days?: number; newDate?: string; activate: boolean }
  ) => Promise<void>;
  onResetPassword?: (userId: string, newPassword: string) => Promise<boolean>;
}

const roleBadgeConfig: Record<Role, { label: string; className: string; desc: string }> = {
  superadmin: {
    label: "Super Admin",
    className: "bg-blue-900 text-white border-blue-900",
    desc: "Akses penuh Laundry Cleanique, seluruh cabang, audit log, dan perpanjangan lisensi.",
  },
  tenant_owner: {
    label: "Tenant Owner",
    className: "bg-blue-50 text-blue-800 border-blue-200",
    desc: "Pemilik cabang toko. Akses pesanan, kasir, laporan laba rugi, dan WhatsApp cabang.",
  },
  staff: {
    label: "Kasir / Staff",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
    desc: "Staf operasional kasir & cuci. Input pesanan, serah terima cucian, dan shift kasir.",
  },
  marketing: {
    label: "Affiliate Marketing",
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
    desc: "Mitra promosi affiliate. Mengelola kode kupon promosi dan komisi pendaftaran outlet baru.",
  },
};

export const UsersTab: React.FC<UsersTabProps> = ({
  users,
  tenants,
  onOpenUserModal,
  onDeleteUser,
  onToggleStatus,
  onUpdateSubscription,
  onExtendSubscription,
  onResetPassword,
}) => {
  const toast = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [userToExtend, setUserToExtend] = useState<UserType | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserType | null>(null);

  // Master-Detail State (Panel Kiri: List, Panel Kanan: Detail)
  const [selectedUserId, setSelectedUserId] = useState<string>(
    users.length > 0 ? users[0].id : ""
  );
  const [mobileSelectedView, setMobileSelectedView] = useState<"list" | "detail">("list");
  const [userPage, setUserPage] = useState(1);
  const USER_PAGE_SIZE = 8;

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tenantName && u.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === "all" || u.role === roleFilter;

    const matchStatus = (() => {
      if (statusFilter === "all") return true;
      const statusInfo = checkUserActiveStatus(u);
      if (statusFilter === "active") return statusInfo.isActive;
      if (statusFilter === "expiring_soon")
        return statusInfo.isActive && statusInfo.daysRemaining <= 7;
      if (statusFilter === "expired") return statusInfo.isExpired;
      if (statusFilter === "inactive") return u.status === "inactive";
      return true;
    })();

    return matchSearch && matchRole && matchStatus;
  });

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const validUserPage = Math.min(userPage, totalUserPages);
  const startIndex = (validUserPage - 1) * USER_PAGE_SIZE;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + USER_PAGE_SIZE);

  const selectedUser =
    filteredUsers.find((u) => u.id === selectedUserId) ||
    filteredUsers[0] ||
    users[0] ||
    null;

  const selectedStatusInfo = selectedUser ? checkUserActiveStatus(selectedUser) : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Data Pengguna</h2>
          <p className="text-xs text-zinc-500">
            Kelola akun pengguna, hak akses peran, dan masa aktif langganan.
          </p>
        </div>

        <button
          onClick={onOpenUserModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pengguna
        </button>
      </div>

      {/* Metric Cards Ringkasan */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 border border-sky-300 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
            Total Pengguna
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {users.length} <span className="text-xs font-semibold text-sky-700">Akun</span>
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-0.5">Semua pengguna terdaftar</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            Pengguna Aktif
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {
              users.filter(
                (u) => u.role === "superadmin" || checkUserActiveStatus(u).isActive
              ).length
            }{" "}
            <span className="text-xs font-semibold text-emerald-700">Aktif</span>
          </div>
          <p className="text-[11px] text-emerald-700/90 font-medium mt-0.5">Dapat login & beroperasi</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white border border-rose-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
            Tidak Aktif
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {
              users.filter(
                (u) => u.role !== "superadmin" && !checkUserActiveStatus(u).isActive
              ).length
            }{" "}
            <span className="text-xs font-semibold text-rose-700">Terkunci</span>
          </div>
          <p className="text-[11px] text-rose-700/90 font-medium mt-0.5">Kedaluwarsa atau dinonaktifkan</p>
        </div>

        <div className="bg-gradient-to-br from-violet-50/90 via-indigo-50/40 to-white border border-violet-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">
            Administrator
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {users.filter((u) => u.role === "superadmin").length}{" "}
            <span className="text-xs font-semibold text-violet-700">Akun</span>
          </div>
          <p className="text-[11px] text-violet-700/90 font-medium mt-0.5">Akses kendali pusat</p>
        </div>
      </div>

      {/* Split Panel Layout (Left: 4 cols, Right: 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* PANEL KIRI: Daftar Pengguna (4 cols) */}
        <div
          className={`${
            mobileSelectedView === "detail" ? "hidden lg:flex" : "flex"
          } lg:col-span-4 bg-white rounded-xl border border-zinc-200 shadow-sm flex-col h-auto lg:h-[700px] overflow-hidden w-full`}
        >
          {/* Search Box & Filters */}
          <div className="p-3 border-b border-zinc-200 bg-zinc-50/60 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, email, cabang..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setUserPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-medium placeholder:text-zinc-400 transition"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setUserPage(1);
                }}
                className="flex-1 py-1 px-2 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer focus:border-zinc-900 transition"
              >
                <option value="all">Semua Peran</option>
                <option value="superadmin">Super Admin</option>
                <option value="tenant_owner">Tenant Owner</option>
                <option value="staff">Kasir / Staff</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setUserPage(1);
                }}
                className="flex-1 py-1 px-2 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer focus:border-zinc-900 transition"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="expiring_soon">Segera Habis</option>
                <option value="expired">Kedaluwarsa</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            <div className="text-[11px] text-zinc-400 px-0.5">
              {filteredUsers.length} pengguna · Hal {validUserPage}/{totalUserPages}
            </div>
          </div>

          {/* User List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 space-y-1">
            {filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs flex flex-col items-center justify-center">
                <User className="w-8 h-8 text-zinc-300 mb-2" />
                <span>Tidak ada pengguna yang cocok</span>
              </div>
            ) : (
              paginatedUsers.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                const statusInfo = checkUserActiveStatus(u);
                const roleConfig = roleBadgeConfig[u.role] || {
                  label: u.role,
                  className: "bg-zinc-100 text-zinc-700 border-zinc-200",
                };

                return (
                  <button
                    key={u.id}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setMobileSelectedView("detail");
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200/90 shadow-xs"
                        : "hover:bg-zinc-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 border ${
                          isSelected
                            ? "bg-blue-900 text-white border-blue-900 shadow-2xs"
                            : u.role === "superadmin"
                            ? "bg-blue-950 text-white border-blue-900"
                            : u.role === "tenant_owner"
                            ? "bg-sky-100 text-sky-800 border-sky-200"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {u.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-semibold text-zinc-900 text-xs truncate">
                            {u.name}
                          </span>
                          <span
                            className={`text-[9px] font-semibold px-2 py-0.2 rounded-full border whitespace-nowrap ${roleConfig.className}`}
                          >
                            {roleConfig.label}
                          </span>
                        </div>

                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1 truncate">
                          <Mail className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{u.email}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1 text-[10px]">
                          {u.role === "superadmin" ? (
                            <span className="text-zinc-400 font-medium">Kantor Pusat</span>
                          ) : (
                            <span className="text-zinc-600 flex items-center gap-1 truncate">
                              <Store className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                              <span className="truncate">{u.tenantName || "Cabang Melati"}</span>
                            </span>
                          )}

                          <span
                            className={`inline-flex items-center gap-1 font-semibold px-1.5 py-0.2 rounded-full border shrink-0 ${statusInfo.statusBadge.className}`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${statusInfo.statusBadge.dotColor}`}
                            />
                            <span>{statusInfo.statusBadge.label}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center self-center text-zinc-300">
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? "text-blue-900 translate-x-0.5" : "text-zinc-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination Left Panel */}
          {totalUserPages > 1 && (
            <div className="border-t border-zinc-100 px-3 py-2 flex items-center justify-between gap-2 bg-zinc-50/60 shrink-0">
              <button
                onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                disabled={validUserPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="text-xs font-medium text-zinc-600">
                {validUserPage} dari {totalUserPages}
              </span>

              <button
                onClick={() => setUserPage((p) => Math.min(totalUserPages, p + 1))}
                disabled={validUserPage === totalUserPages}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* PANEL KANAN: Detail Pengguna Terpilih (8 cols) */}
        <div
          className={`${
            mobileSelectedView === "list" ? "hidden lg:flex" : "flex"
          } lg:col-span-8 bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6 min-h-0 lg:min-h-[700px] flex-col justify-between w-full`}
        >
          {!selectedUser ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <button
                type="button"
                onClick={() => setMobileSelectedView("list")}
                className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl mb-4 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pilih Pengguna dari Daftar</span>
              </button>
              <User className="w-12 h-12 text-zinc-200 mb-3" />
              <div className="font-bold text-zinc-800 text-sm">Pilih Pengguna</div>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Pilih salah satu pengguna di sebelah kiri untuk melihat hak akses, cabang, dan masa aktif langganan.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Mobile Back Button */}
              <div className="lg:hidden pb-3 border-b border-zinc-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMobileSelectedView("list")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Daftar Pengguna</span>
                </button>
                <span className="text-[11px] text-zinc-400 font-medium">Detail Akun</span>
              </div>

              {/* User Header & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-zinc-200">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-blue-900 text-white font-bold text-base flex items-center justify-center shadow-xs shrink-0">
                    {selectedUser.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-zinc-900 text-lg truncate">
                        {selectedUser.name}
                      </h3>
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${
                          roleBadgeConfig[selectedUser.role]?.className
                        }`}
                      >
                        {roleBadgeConfig[selectedUser.role]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5 flex items-center gap-1.5">
                      <Mail className="w-3 h-3 text-zinc-400" />
                      <span>{selectedUser.email}</span>
                      <span className="text-zinc-300">·</span>
                      <span className="text-zinc-400">{selectedUser.id}</span>
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    type="button"
                    onClick={() => setUserToResetPassword(selectedUser)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-blue-50 hover:border-blue-200 text-zinc-700 hover:text-blue-800 text-xs font-medium transition shadow-xs cursor-pointer"
                    title={`Reset Password ${selectedUser.name}`}
                  >
                    <KeyRound className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Reset Password</span>
                  </button>

                  <button
                    type="button"
                    disabled={selectedUser.role === "superadmin"}
                    onClick={() => {
                      if (selectedUser.role === "superadmin") {
                        toast.warning("Aksi Ditolak", "Akun Super Admin utama tidak dapat dihapus.");
                        return;
                      }
                      if (confirm(`Hapus akun pengguna "${selectedUser.name}"?`)) {
                        onDeleteUser(selectedUser.id);
                        setMobileSelectedView("list");
                      }
                    }}
                    className={`p-1.5 rounded-lg border transition shadow-xs ${
                      selectedUser.role === "superadmin"
                        ? "text-zinc-300 border-zinc-100 bg-zinc-50/50 cursor-not-allowed"
                        : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border-zinc-200 cursor-pointer"
                    }`}
                    title="Hapus Pengguna"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3 Structured Management Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Card 1: Status Akun & Hak Akses */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                    Hak Akses & Cabang
                  </span>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Status Akun:</span>
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedUser.role === "superadmin") {
                            toast.warning("Aksi Dibatasi", "Akun Super Admin selalu berstatus aktif.");
                            return;
                          }
                          onToggleStatus(selectedUser.id, selectedUser.status || "active");
                        }}
                        disabled={selectedUser.role === "superadmin"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold transition border shadow-xs ${
                          (selectedUser.status || "active") === "active"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100"
                        } ${selectedUser.role === "superadmin" ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            (selectedUser.status || "active") === "active"
                              ? "bg-emerald-600 animate-pulse"
                              : "bg-rose-600"
                          }`}
                        />
                        <span>
                          {(selectedUser.status || "active") === "active" ? "Aktif" : "Nonaktif"}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Cabang Toko:</span>
                      <span className="font-semibold text-zinc-900 flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-zinc-400" />
                        <span>
                          {selectedUser.role === "superadmin"
                            ? "Pusat (Seluruh Cabang)"
                            : selectedUser.tenantName || "Cabang Melati"}
                        </span>
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 pt-1 border-t border-zinc-200/60 leading-relaxed">
                      {roleBadgeConfig[selectedUser.role]?.desc}
                    </p>
                  </div>
                </div>

                {/* Card 2: Masa Berlaku Lisensi / Langganan */}
                <div className="p-4 rounded-xl border border-zinc-200 bg-zinc-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                      Masa Aktif Langganan
                    </span>
                    {selectedUser.role !== "superadmin" && (
                      <button
                        type="button"
                        onClick={() => setUserToExtend(selectedUser)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 transition cursor-pointer"
                      >
                        <Calendar className="w-3 h-3 text-blue-600" />
                        <span>+ Perpanjang</span>
                      </button>
                    )}
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Batas Tanggal:</span>
                      <span className="font-mono font-bold text-zinc-900">
                        {selectedUser.role === "superadmin"
                          ? "Permanen"
                          : selectedUser.subscriptionUntil
                          ? new Intl.DateTimeFormat("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            }).format(new Date(`${selectedUser.subscriptionUntil}T23:59:59`))
                          : "Belum Diatur"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-zinc-500">Status Lisensi:</span>
                      {selectedStatusInfo && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${selectedStatusInfo.statusBadge.className}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${selectedStatusInfo.statusBadge.dotColor}`}
                          />
                          <span>{selectedStatusInfo.statusBadge.label}</span>
                        </span>
                      )}
                    </div>

                    {selectedUser.role !== "superadmin" && selectedStatusInfo && (
                      <div className="pt-1 border-t border-zinc-200/60">
                        <div className="flex items-center justify-between text-[11px] text-zinc-500 mb-1">
                          <span>Sisa Waktu Operasional:</span>
                          <span className="font-bold text-zinc-800">
                            {selectedStatusInfo.isExpired
                              ? "Sudah Kedaluwarsa"
                              : `${selectedStatusInfo.daysRemaining} hari lagi`}
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-zinc-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              selectedStatusInfo.isExpired
                                ? "bg-rose-500 w-full"
                                : selectedStatusInfo.daysRemaining <= 7
                                ? "bg-amber-500 w-1/4"
                                : "bg-emerald-500 w-3/4"
                            }`}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: Informasi Audit Akun */}
              <div className="p-4 rounded-xl border border-zinc-200 bg-white text-xs text-zinc-500 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-zinc-400" />
                  <span>
                    Terdaftar sejak:{" "}
                    <strong className="text-zinc-800">
                      {new Date(selectedUser.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </strong>
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 font-mono">
                  ID: {selectedUser.id}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Perpanjang Masa Aktif (+X Hari / Kalender) */}
      <ExtendSubscriptionModal
        isOpen={!!userToExtend}
        user={userToExtend}
        onClose={() => setUserToExtend(null)}
        onExtend={async (userId, payload) => {
          if (onExtendSubscription) {
            await onExtendSubscription(userId, payload);
          } else if (payload.newDate) {
            onUpdateSubscription(userId, payload.newDate);
          }
        }}
      />

      {/* Modal Reset Password */}
      <ResetPasswordModal
        isOpen={!!userToResetPassword}
        user={userToResetPassword}
        onClose={() => setUserToResetPassword(null)}
        onResetPassword={async (userId, newPassword) => {
          if (onResetPassword) {
            return await onResetPassword(userId, newPassword);
          }
          return false;
        }}
      />
    </div>
  );
};
