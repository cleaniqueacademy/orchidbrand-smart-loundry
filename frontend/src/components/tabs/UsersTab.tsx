import React, { useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
} from "lucide-react";
import { User as UserType, Role, Tenant } from "../../types";
import { checkUserActiveStatus } from "../../utils/subscriptionUtils";
import { UserDetailModal } from "../modals/UserDetailModal";
import { ExtendSubscriptionModal } from "../modals/ExtendSubscriptionModal";
import { ResetPasswordModal } from "../modals/ResetPasswordModal";

// ─── Types ─────────────────────────────────────────────────────────────────

interface UsersTabProps {
  readonly users: UserType[];
  readonly tenants: Tenant[];
  readonly onOpenUserModal: () => void;
  readonly onDeleteUser: (id: string) => void;
  readonly onToggleStatus: (userId: string, currentStatus: "active" | "inactive") => void;
  readonly onUpdateSubscription: (userId: string, subscriptionUntil: string) => void;
  readonly onExtendSubscription?: (
    userId: string,
    payload: { days?: number; newDate?: string; activate: boolean }
  ) => Promise<void>;
  readonly onResetPassword?: (userId: string, newPassword: string) => Promise<boolean>;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const USER_PAGE_SIZE = 10;

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
  marketing: {
    label: "Tim Marketing",
    className: "bg-indigo-50 text-indigo-800 border-indigo-200",
  },
};

// ─── Component ──────────────────────────────────────────────────────────────

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
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  // Detail modal state
  const [detailUser, setDetailUser] = useState<UserType | null>(null);

  // Legacy extend/reset state (from table row actions)
  const [userToExtend, setUserToExtend] = useState<UserType | null>(null);
  const [userToResetPassword, setUserToResetPassword] = useState<UserType | null>(null);

  // ── Filtering ────────────────────────────────────────────────────────────

  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.tenantName && u.tenantName.toLowerCase().includes(q));

    const matchRole = roleFilter === "all" || u.role === roleFilter;

    const matchStatus = (() => {
      if (statusFilter === "all") return true;
      const si = checkUserActiveStatus(u);
      if (statusFilter === "active") return si.isActive;
      if (statusFilter === "expiring_soon") return si.isActive && si.daysRemaining <= 7;
      if (statusFilter === "expired") return si.isExpired;
      if (statusFilter === "inactive") return u.status === "inactive";
      return true;
    })();

    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USER_PAGE_SIZE));
  const validPage = Math.min(page, totalPages);
  const paginated = filteredUsers.slice(
    (validPage - 1) * USER_PAGE_SIZE,
    validPage * USER_PAGE_SIZE
  );

  // ── Stats ────────────────────────────────────────────────────────────────

  const totalUsers = users.length;
  const activeUsers = users.filter(
    (u) => u.role === "superadmin" || checkUserActiveStatus(u).isActive
  ).length;
  const inactiveUsers = users.filter(
    (u) => u.role !== "superadmin" && !checkUserActiveStatus(u).isActive
  ).length;
  const adminCount = users.filter((u) => u.role === "superadmin").length;

  const detailTenant = detailUser?.tenantId
    ? tenants.find((t) => t.id === detailUser.tenantId) ?? null
    : null;

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
          type="button"
          onClick={onOpenUserModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Tambah Pengguna
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Total Pengguna</span>
            <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {totalUsers}
            <span className="text-xs font-semibold text-blue-700 ml-1">Akun</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Semua pengguna terdaftar</p>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-bold">
            <span>Pengguna Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {activeUsers}
            <span className="text-xs font-semibold text-emerald-700 ml-1">Aktif</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Dapat login &amp; beroperasi</p>
        </div>

        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-rose-800 font-bold">
            <span>Tidak Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center">
              <UserX className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {inactiveUsers}
            <span className="text-xs font-semibold text-rose-700 ml-1">Terkunci</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Kedaluwarsa atau nonaktif</p>
        </div>

        <div className="bg-zinc-50 border border-zinc-200 p-4 rounded-xl">
          <div className="flex items-center justify-between text-xs text-zinc-700 font-bold">
            <span>Administrator</span>
            <div className="w-7 h-7 rounded-lg bg-zinc-700 text-white flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {adminCount}
            <span className="text-xs font-semibold text-zinc-500 ml-1">Akun</span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">Akses kendali pusat</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-3 border-b border-zinc-100 bg-zinc-50/50">
          <div className="relative flex-1 min-w-0">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama, email, atau cabang..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 placeholder:text-zinc-400 transition"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="py-1.5 px-2.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer focus:border-zinc-900 transition"
            >
              <option value="all">Semua Peran</option>
              <option value="superadmin">Super Admin</option>
              <option value="tenant_owner">Tenant Owner</option>
              <option value="staff">Kasir / Staff</option>
              <option value="marketing">Tim Marketing</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="py-1.5 px-2.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer focus:border-zinc-900 transition"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="expiring_soon">Segera Habis</option>
              <option value="expired">Kedaluwarsa</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
          <span className="text-[11px] text-zinc-400 shrink-0 self-center">
            {filteredUsers.length} pengguna
          </span>
        </div>

        {/* Table scroll wrapper */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/70">
                <th className="text-left px-4 py-2.5 font-semibold text-zinc-500 w-[260px]">
                  Pengguna
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-zinc-500">Peran</th>
                <th className="text-left px-3 py-2.5 font-semibold text-zinc-500">
                  Cabang / Outlet
                </th>
                <th className="text-left px-3 py-2.5 font-semibold text-zinc-500">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-zinc-500">Masa Aktif</th>
                <th className="text-right px-4 py-2.5 font-semibold text-zinc-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="py-16 text-center text-zinc-400 text-xs"
                  >
                    Tidak ada pengguna yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                paginated.map((u) => {
                  const si = checkUserActiveStatus(u);
                  const rc = roleBadgeConfig[u.role];
                  const isSuperAdmin = u.role === "superadmin";

                  return (
                    <tr
                      key={u.id}
                      className="hover:bg-zinc-50/60 transition group"
                    >
                      {/* Col: Pengguna */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 border ${
                              isSuperAdmin
                                ? "bg-blue-900 text-white border-blue-900"
                                : u.role === "marketing"
                                ? "bg-amber-100 text-amber-800 border-amber-200"
                                : u.role === "tenant_owner"
                                ? "bg-sky-100 text-sky-800 border-sky-200"
                                : "bg-zinc-100 text-zinc-700 border-zinc-200"
                            }`}
                          >
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-zinc-900 truncate max-w-[160px]">
                              {u.name}
                            </p>
                            <p className="text-zinc-400 font-mono truncate max-w-[160px]">
                              {u.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Col: Peran */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block text-[10px] font-semibold px-2.5 py-0.5 rounded-full border whitespace-nowrap ${rc?.className ?? "bg-zinc-100 text-zinc-700 border-zinc-200"}`}
                        >
                          {rc?.label ?? u.role}
                        </span>
                      </td>

                      {/* Col: Cabang */}
                      <td className="px-3 py-3">
                        <span className="text-zinc-600 truncate block max-w-[140px]">
                          {isSuperAdmin
                            ? "Pusat"
                            : u.role === "marketing"
                            ? "IndoTech Internal"
                            : u.tenantName ?? "—"}
                        </span>
                      </td>

                      {/* Col: Status */}
                      <td className="px-3 py-3">
                        <button
                          type="button"
                          disabled={isSuperAdmin}
                          onClick={() => onToggleStatus(u.id, u.status ?? "active")}
                          title={isSuperAdmin ? "Admin selalu aktif" : "Klik untuk toggle status"}
                          className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border transition ${
                            isSuperAdmin
                              ? "bg-zinc-50 text-zinc-400 border-zinc-200 cursor-default"
                              : (u.status ?? "active") === "active"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 cursor-pointer"
                              : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 cursor-pointer"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isSuperAdmin
                                ? "bg-zinc-400"
                                : (u.status ?? "active") === "active"
                                ? "bg-emerald-500"
                                : "bg-rose-500"
                            }`}
                          />
                          {isSuperAdmin
                            ? "Permanen"
                            : (u.status ?? "active") === "active"
                            ? "Aktif"
                            : "Nonaktif"}
                        </button>
                      </td>

                      {/* Col: Masa Aktif */}
                      <td className="px-3 py-3">
                        {isSuperAdmin ? (
                          <span className="text-zinc-400">Permanen</span>
                        ) : u.role === "marketing" ? (
                          <span className="text-amber-700 font-medium">Tim Internal</span>
                        ) : u.subscriptionUntil ? (
                          <span
                            className={`font-mono ${
                              si.isExpired
                                ? "text-rose-600 font-bold"
                                : si.daysRemaining <= 7
                                ? "text-amber-600 font-bold"
                                : "text-zinc-700"
                            }`}
                          >
                            {new Intl.DateTimeFormat("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }).format(new Date(`${u.subscriptionUntil}T23:59:59`))}
                          </span>
                        ) : (
                          <span className="text-zinc-400">Belum diatur</span>
                        )}
                      </td>

                      {/* Col: Aksi */}
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setDetailUser(u)}
                          className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 hover:underline transition cursor-pointer"
                        >
                          Lihat Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/50">
            <span className="text-[11px] text-zinc-500">
              Halaman {validPage} dari {totalPages} &middot; {filteredUsers.length} pengguna
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={validPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={validPage === totalPages}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <UserDetailModal
        isOpen={detailUser !== null}
        user={detailUser}
        tenant={
          detailUser?.tenantId
            ? tenants.find((t) => t.id === detailUser.tenantId) ?? null
            : null
        }
        onClose={() => setDetailUser(null)}
        onToggleStatus={(userId, currentStatus) => {
          onToggleStatus(userId, currentStatus);
          // Refresh detail user from updated list immediately via prop reconciliation
        }}
        onDeleteUser={(id) => {
          onDeleteUser(id);
          setDetailUser(null);
        }}
        onExtendSubscription={onExtendSubscription}
        onUpdateSubscription={onUpdateSubscription}
        onResetPassword={onResetPassword}
      />

      {/* Legacy standalone modals (kept for backward compat, opened only from modal footer) */}
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

      <ResetPasswordModal
        isOpen={!!userToResetPassword}
        user={userToResetPassword}
        onClose={() => setUserToResetPassword(null)}
        onResetPassword={async (userId, newPassword) => {
          if (onResetPassword) return await onResetPassword(userId, newPassword);
          return false;
        }}
      />
    </div>
  );
};
