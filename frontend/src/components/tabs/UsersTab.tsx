import React, { useState } from "react";
import { Plus, User, ShieldCheck, Mail, Store, Trash2, Calendar, Clock, Sparkles, KeyRound } from "lucide-react";
import { User as UserType, Role, Tenant } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";
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

const roleBadgeConfig: Record<Role, { label: string; className: string }> = {
  superadmin: {
    label: "Super Admin",
    className: "bg-blue-900 text-white border-blue-900",
  },
  tenant_owner: {
    label: "Tenant Owner",
    className: "bg-blue-50 text-blue-800 border-blue-200",
  },
  staff: {
    label: "Kasir / Staff",
    className: "bg-zinc-100 text-zinc-700 border-zinc-200",
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

  const columns: ColumnDef<UserType>[] = [
    {
      id: "name",
      header: "Pengguna",
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center font-bold text-xs text-zinc-700 shrink-0">
            {u.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-zinc-900 text-xs">{u.name}</div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
              <Mail className="w-2.5 h-2.5" />
              <span>{u.email}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Peran",
      className: "whitespace-nowrap min-w-[125px]",
      cell: (u) => {
        const config = roleBadgeConfig[u.role] || {
          label: u.role,
          className: "bg-zinc-100 text-zinc-700 border-zinc-200",
        };
        return (
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 select-none ${config.className}`}
          >
            {u.role === "superadmin" && <ShieldCheck className="w-3 h-3 shrink-0" />}
            <span className="whitespace-nowrap">{config.label}</span>
          </span>
        );
      },
    },
    {
      id: "tenant",
      header: "Cabang",
      className: "whitespace-nowrap min-w-[140px]",
      cell: (u) => {
        if (u.role === "superadmin") {
          return <span className="text-zinc-400 text-xs font-medium whitespace-nowrap">Pusat</span>;
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-zinc-800 whitespace-nowrap">
            <Store className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="font-medium truncate">{u.tenantName || "Cabang Melati"}</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      className: "whitespace-nowrap min-w-[110px]",
      cell: (u) => {
        const isActive = (u.status || "active") === "active";
        return (
          <button
            onClick={() => {
              if (u.role === "superadmin") {
                toast.warning("Aksi Dibatasi", "Akun Super Admin selalu berstatus aktif.");
                return;
              }
              onToggleStatus(u.id, u.status || "active");
            }}
            disabled={u.role === "superadmin"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition border shadow-xs whitespace-nowrap shrink-0 select-none ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
                : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80"
            } ${u.role === "superadmin" ? "cursor-default" : "cursor-pointer"}`}
            title={
              u.role === "superadmin"
                ? "Super Admin selalu aktif"
                : "Klik untuk toggle status"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`}
            />
            <span className="whitespace-nowrap">{isActive ? "Aktif" : "Nonaktif"}</span>
          </button>
        );
      },
    },
    {
      id: "subscription",
      header: "Masa Aktif",
      className: "whitespace-nowrap min-w-[220px]",
      cell: (u) => {
        if (u.role === "superadmin") {
          return (
            <span className="inline-flex items-center text-[11px] font-semibold text-blue-900 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full font-mono whitespace-nowrap shrink-0 select-none">
              Permanen
            </span>
          );
        }

        const statusInfo = checkUserActiveStatus(u);

        return (
          <div className="flex items-center justify-between gap-3 min-w-[220px]">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="font-mono text-xs font-bold text-zinc-900">
                {u.subscriptionUntil
                  ? new Intl.DateTimeFormat("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }).format(new Date(`${u.subscriptionUntil}T23:59:59`))
                  : "Belum Diatur"}
              </span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap shrink-0 select-none ${statusInfo.statusBadge.className}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusInfo.statusBadge.dotColor}`}
                />
                <span className="whitespace-nowrap">{statusInfo.statusBadge.label}</span>
              </span>
            </div>

            <button
              onClick={() => setUserToExtend(u)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-50 text-blue-800 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 transition shadow-2xs shrink-0 cursor-pointer whitespace-nowrap"
              title="Perpanjang Masa Aktif"
            >
              <Calendar className="w-3 h-3 text-blue-600 shrink-0" />
              <span>Perpanjang</span>
            </button>
          </div>
        );
      },
    },
    {
      id: "created",
      header: "Terdaftar",
      cell: (u) => (
        <div className="text-zinc-500 text-xs whitespace-nowrap">
          {new Date(u.createdAt).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (u) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={() => setUserToResetPassword(u)}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition cursor-pointer"
            title={`Reset Password ${u.name}`}
          >
            <KeyRound className="w-3.5 h-3.5" />
          </button>
          <button
            disabled={u.role === "superadmin"}
            onClick={() => {
              if (u.role === "superadmin") {
                toast.warning("Aksi Ditolak", "Akun Super Admin utama tidak dapat dihapus.");
                return;
              }
              onDeleteUser(u.id);
            }}
            className={`p-1.5 rounded-lg border transition ${
              u.role === "superadmin"
                ? "text-zinc-300 border-zinc-100 bg-zinc-50/50 cursor-not-allowed"
                : "text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border-zinc-200 cursor-pointer"
            }`}
            title="Hapus Pengguna"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Data Pengguna</h2>
          <p className="text-xs text-zinc-500">
            Kelola akun pengguna dan masa aktif.
          </p>
        </div>

        <button
          onClick={onOpenUserModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pengguna
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        {/* Total Pengguna - Highlighted Light Blue */}
        <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 border border-sky-300 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
            Total Pengguna
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {users.length} <span className="text-xs font-semibold text-sky-700">Akun</span>
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">Semua pengguna terdaftar</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
            Pengguna Aktif
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {
              users.filter(
                (u) => u.role === "superadmin" || checkUserActiveStatus(u).isActive
              ).length
            }{" "}
            <span className="text-xs font-semibold text-emerald-700">Aktif</span>
          </div>
          <p className="text-[11px] text-emerald-700/90 font-medium mt-1">Dapat login & beroperasi</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white border border-rose-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">
            Tidak Aktif
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {
              users.filter(
                (u) => u.role !== "superadmin" && !checkUserActiveStatus(u).isActive
              ).length
            }{" "}
            <span className="text-xs font-semibold text-rose-700">Terkunci</span>
          </div>
          <p className="text-[11px] text-rose-700/90 font-medium mt-1">Kedaluwarsa atau dinonaktifkan</p>
        </div>

        <div className="bg-gradient-to-br from-violet-50/90 via-indigo-50/40 to-white border border-violet-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-violet-800">
            Administrator
          </span>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {users.filter((u) => u.role === "superadmin").length} <span className="text-xs font-semibold text-violet-700">Akun</span>
          </div>
          <p className="text-[11px] text-violet-700/90 font-medium mt-1">Akses kendali pusat</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-900 text-sm">Daftar Pengguna</h3>
        <ShadcnDataTable
          data={filteredUsers}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari nama, email, cabang..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          customFilters={
            <div className="flex items-center gap-2">
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Peran</option>
                <option value="superadmin">Super Admin</option>
                <option value="tenant_owner">Tenant Owner</option>
                <option value="staff">Kasir</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="expiring_soon">Segera Habis</option>
                <option value="expired">Kedaluwarsa</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>
          }
          emptyMessage="Tidak ada pengguna yang cocok dengan kriteria."
          initialPageSize={10}
        />
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
