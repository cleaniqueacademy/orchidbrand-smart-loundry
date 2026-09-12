import React, { useState } from "react";
import { Plus, User, ShieldCheck, Mail, Store, Trash2, Calendar } from "lucide-react";
import { User as UserType, Role, Tenant } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";

interface UsersTabProps {
  users: UserType[];
  tenants: Tenant[];
  onOpenUserModal: () => void;
  onDeleteUser: (id: string) => void;
  onToggleStatus: (userId: string, currentStatus: "active" | "inactive") => void;
  onUpdateSubscription: (userId: string, subscriptionUntil: string) => void;
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
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.tenantName && u.tenantName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || (u.status || "active") === statusFilter;

    return matchSearch && matchRole && matchStatus;
  });

  const columns: ColumnDef<UserType>[] = [
    {
      id: "name",
      header: "Nama Pengguna",
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
      header: "Hak Akses / Peran",
      cell: (u) => {
        const config = roleBadgeConfig[u.role] || {
          label: u.role,
          className: "bg-zinc-100 text-zinc-700 border-zinc-200",
        };
        return (
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config.className}`}
          >
            {u.role === "superadmin" && <ShieldCheck className="w-3 h-3" />}
            <span>{config.label}</span>
          </span>
        );
      },
    },
    {
      id: "tenant",
      header: "Penugasan Cabang",
      cell: (u) => {
        if (u.role === "superadmin") {
          return (
            <span className="text-zinc-400 text-xs italic">
              — (Kantor Pusat / Tanpa Tenant)
            </span>
          );
        }
        if (u.role === "tenant_owner") {
          return (
            <div className="flex items-center gap-1.5 text-xs text-zinc-900 font-semibold">
              <Store className="w-3.5 h-3.5 text-blue-600" />
              <span>{u.tenantName || "Cabang Melati"}</span>
              <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-normal">
                Pemilik
              </span>
            </div>
          );
        }
        return (
          <div className="flex items-center gap-1.5 text-xs text-zinc-700">
            <Store className="w-3.5 h-3.5 text-zinc-400" />
            <span>{u.tenantName || "Cabang Melati"}</span>
            <span className="text-[10px] text-zinc-400 font-normal">Staff</span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status Akun",
      cell: (u) => {
        const isActive = (u.status || "active") === "active";
        return (
          <button
            onClick={() => {
              if (u.role === "superadmin") {
                alert("Akun Super Admin selalu aktif.");
                return;
              }
              onToggleStatus(u.id, u.status || "active");
            }}
            disabled={u.role === "superadmin"}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition border shadow-xs ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80"
                : "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100/80"
            } ${u.role === "superadmin" ? "cursor-default" : "cursor-pointer"}`}
            title={
              u.role === "superadmin"
                ? "Super Admin selalu aktif"
                : "Klik untuk toggle status Aktif / Nonaktif"
            }
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`}
            />
            <span>{isActive ? "Aktif" : "Nonaktif"}</span>
          </button>
        );
      },
    },
    {
      id: "subscription",
      header: "Langganan Sampai",
      cell: (u) => {
        if (u.role === "superadmin") {
          return (
            <span className="text-zinc-400 text-xs font-mono italic">
              Permanen (HQ)
            </span>
          );
        }

        const dateStr = u.subscriptionUntil;
        if (!dateStr) {
          return (
            <button
              onClick={() => {
                const newDate = prompt(
                  `Atur batas tanggal langganan untuk ${u.name} (Format: YYYY-MM-DD):`,
                  new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10)
                );
                if (newDate) onUpdateSubscription(u.id, newDate);
              }}
              className="text-[11px] text-zinc-500 hover:text-zinc-900 underline font-medium"
            >
              + Set Tanggal
            </button>
          );
        }

        const expDate = new Date(dateStr);
        const today = new Date();
        const diffMs = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;

        return (
          <div className="flex items-center gap-1.5">
            <div>
              <div className="font-mono text-xs font-semibold text-zinc-900">
                {new Intl.DateTimeFormat("id-ID", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                }).format(expDate)}
              </div>
              <div className="text-[10px] mt-0.5">
                {isExpired ? (
                  <span className="text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                    Kedaluwarsa
                  </span>
                ) : diffDays <= 7 ? (
                  <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                    Sisa {diffDays} hari
                  </span>
                ) : (
                  <span className="text-emerald-700 font-medium">
                    {diffDays} hari lagi
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => {
                const newDate = prompt(
                  `Perpanjang / ubah tanggal langganan ${u.name} (Format: YYYY-MM-DD):`,
                  dateStr
                );
                if (newDate) onUpdateSubscription(u.id, newDate);
              }}
              className="p-1 rounded text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
              title="Ubah Tanggal Langganan"
            >
              <Calendar className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      },
    },
    {
      id: "created",
      header: "Terdaftar",
      cell: (u) => (
        <div className="text-zinc-500 text-xs">
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
        <button
          onClick={() => {
            if (u.role === "superadmin") {
              alert("Akun Super Admin utama tidak dapat dihapus.");
              return;
            }
            if (confirm(`Hapus pengguna ${u.name}?`)) {
              onDeleteUser(u.id);
            }
          }}
          disabled={u.role === "superadmin"}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition disabled:opacity-30 disabled:cursor-not-allowed"
          title="Hapus Pengguna"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Manajemen Pengguna</h2>
          <p className="text-xs text-zinc-500">
            Kelola akun login Super Admin, status aktif/nonaktif, dan masa berlaku langganan offline
          </p>
        </div>

        <button
          onClick={onOpenUserModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pengguna
        </button>
      </div>

      {/* Notice Callout on Offline Subscription & Status */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3.5 text-xs text-zinc-600 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-900">Model Langganan Offline:</span> Status <strong>Aktif / Nonaktif</strong> dan <strong>Masa Langganan</strong> ditentukan langsung oleh Super Admin. Pengguna yang berstatus <em>Nonaktif</em> atau melewati batas tanggal langganan akan <strong>diblokir dari login</strong> ke sistem.
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Total Pengguna
          </span>
          <div className="text-xl font-bold text-zinc-900 mt-1">{users.length} Akun</div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Semua pengguna terdaftar</p>
        </div>

        <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
            Akun Aktif
          </span>
          <div className="text-xl font-bold text-emerald-700 mt-1">
            {users.filter((u) => (u.status || "active") === "active").length} Aktif
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Dapat login & beroperasi</p>
        </div>

        <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-600">
            Nonaktif / Expired
          </span>
          <div className="text-xl font-bold text-rose-600 mt-1">
            {users.filter((u) => (u.status || "active") === "inactive").length} Terkunci
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Akses login diblokir</p>
        </div>

        <div className="bg-white border border-zinc-200 p-3.5 rounded-xl shadow-xs">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            Super Admin
          </span>
          <div className="text-xl font-bold text-zinc-900 mt-1">
            {users.filter((u) => u.role === "superadmin").length} Admin Pusat
          </div>
          <p className="text-[10px] text-zinc-400 mt-0.5">Akses kendali penuh</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-900 text-sm">Daftar Akun Pengguna</h3>
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
                <option value="staff">Staff / Kasir</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Status</option>
                <option value="active">Status: Aktif</option>
                <option value="inactive">Status: Nonaktif</option>
              </select>
            </div>
          }
          emptyMessage="Tidak ada pengguna yang cocok dengan kriteria."
          initialPageSize={10}
        />
      </div>
    </div>
  );
};
