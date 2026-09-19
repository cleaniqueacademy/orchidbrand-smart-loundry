import React, { useState } from "react";
import { Plus, Building2, Phone, Mail, Store, DollarSign, ShoppingBag, KeyRound } from "lucide-react";
import { Tenant, User } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";
import { ResetPasswordModal } from "../modals/ResetPasswordModal";

interface TenantsTabProps {
  tenants: Tenant[];
  users?: User[];
  onOpenTenantModal: () => void;
  onSelectTenant?: (id: string) => void;
  currentTenantId?: string;
  onResetPassword?: (userId: string, newPassword: string) => Promise<boolean>;
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  tenants,
  users = [],
  onOpenTenantModal,
  onResetPassword,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);

  const totalOmsetAll = tenants.reduce((sum, t) => sum + (t.totalOmset || 0), 0);
  const totalOrdersAll = tenants.reduce((sum, t) => sum + (t.totalOrders || 0), 0);

  const filteredTenants = tenants.filter((t) => {
    return (
      t.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.owner?.email && t.owner.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
      t.phone.includes(searchQuery) ||
      t.address.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const columns: ColumnDef<Tenant>[] = [
    {
      id: "outlet",
      header: "Cabang",
      className: "min-w-[170px]",
      cell: (t) => {
        const parts = t.outletName.includes(" - ")
          ? t.outletName.split(" - ")
          : ["Orchid Laundry", t.outletName];
        const brandName = parts[0];
        const branchName = parts.slice(1).join(" - ") || t.outletName;

        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200/80 text-sky-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Store className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-zinc-900 text-xs tracking-tight whitespace-nowrap" title={t.outletName}>
                {branchName}
              </div>
              <div className="font-mono text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1.5 whitespace-nowrap">
                <span className="bg-zinc-100 px-1.5 py-0.2 rounded text-zinc-600 font-semibold">{t.id}</span>
                <span className="text-zinc-400">• {brandName}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    {
      id: "owner",
      header: "Pemilik",
      className: "min-w-[140px]",
      cell: (t) => {
        const ownerUser = users?.find(
          (u) =>
            (t.owner?.id && u.id === t.owner.id) ||
            (t.userId && u.id === t.userId) ||
            (t.owner?.email && u.email.toLowerCase() === t.owner.email.toLowerCase()) ||
            (u.tenantId === t.id && u.role === "tenant_owner")
        );
        return (
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 text-xs whitespace-nowrap">
                {t.owner?.name || ownerUser?.name || "Budi Santoso"}
              </div>
              <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono whitespace-nowrap">
                <Mail className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                <span>{t.owner?.email || ownerUser?.email || "—"}</span>
              </div>
            </div>
            {onResetPassword && ownerUser && (
              <button
                type="button"
                onClick={() => setUserToReset(ownerUser)}
                className="p-1 rounded-md border border-zinc-200 text-zinc-400 hover:text-blue-700 hover:bg-blue-50 transition cursor-pointer shrink-0"
                title={`Reset Password ${ownerUser.name}`}
              >
                <KeyRound className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    {
      id: "contact",
      header: "Kontak",
      className: "min-w-[150px]",
      cell: (t) => (
        <div className="min-w-0">
          <div className="text-zinc-800 text-xs font-mono font-semibold flex items-center gap-1.5 whitespace-nowrap">
            <Phone className="w-3 h-3 text-zinc-400 shrink-0" />
            <span>{t.phone}</span>
          </div>
          <div className="text-[11px] text-zinc-500 truncate max-w-[150px] mt-0.5" title={t.address}>
            {t.address}
          </div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      className: "w-[80px] whitespace-nowrap",
      cell: (t) => {
        const isActive = (t.status || "active") === "active";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border whitespace-nowrap shrink-0 select-none ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isActive ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`}
            />
            <span className="whitespace-nowrap">{isActive ? "Aktif" : "Nonaktif"}</span>
          </span>
        );
      },
    },
    {
      id: "subscription",
      header: "Masa Aktif",
      align: "center",
      className: "w-[105px] whitespace-nowrap",
      cell: (t) => {
        const dateStr = t.subscriptionUntil || "2026-12-31";
        const expDate = new Date(dateStr);
        const today = new Date();
        const diffMs = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;

        return (
          <div className="flex flex-col items-center justify-center">
            <span className="font-mono text-xs font-semibold text-zinc-900">
              {new Intl.DateTimeFormat("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(expDate)}
            </span>
            <div className="mt-0.5">
              {isExpired ? (
                <span className="inline-flex items-center text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded border border-rose-200">
                  Kedaluwarsa
                </span>
              ) : (
                <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                  {diffDays} hari lagi
                </span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      id: "orders",
      header: "Pesanan",
      align: "center",
      className: "w-[75px] whitespace-nowrap",
      cell: (t) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200/80">
          {t.totalOrders || 0} order
        </span>
      ),
    },
    {
      id: "omset",
      header: "Omset",
      align: "right",
      className: "w-[100px] whitespace-nowrap text-right",
      cell: (t) => (
        <span className="font-bold text-emerald-700 text-xs whitespace-nowrap">
          Rp {(t.totalOmset || 0).toLocaleString("id-ID")}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
            Data Cabang
          </h2>
          <p className="text-xs text-zinc-500">
            Daftar dan pantau seluruh cabang laundry.
          </p>
        </div>

        <button
          onClick={onOpenTenantModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Cabang
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Cabang - Highlighted Light Blue */}
        <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 border border-sky-300 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-800">
              Total Cabang
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {tenants.length} <span className="text-xs font-semibold text-sky-700">Cabang</span>
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">Seluruh outlet aktif</p>
        </div>

        {/* Total Omset */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white border border-emerald-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800">
              Total Omset
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            Rp {totalOmsetAll.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-emerald-700/90 font-medium mt-1">Semua transaksi lunas</p>
        </div>

        {/* Total Pesanan */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white border border-indigo-200/90 p-4 sm:p-5 rounded-2xl shadow-sm relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-800">
              Total Pesanan
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {totalOrdersAll} <span className="text-xs font-semibold text-indigo-700">Pesanan</span>
          </div>
          <p className="text-[11px] text-indigo-700/90 font-medium mt-1">Volume pesanan masuk</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-900 text-sm">Daftar Cabang</h3>
        <ShadcnDataTable
          data={filteredTenants}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari nama outlet, pemilik, alamat, HP..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          emptyMessage="Tidak ada data cabang yang sesuai."
          initialPageSize={10}
        />
      </div>

      {/* Modal Reset Password */}
      <ResetPasswordModal
        isOpen={!!userToReset}
        user={userToReset}
        onClose={() => setUserToReset(null)}
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
