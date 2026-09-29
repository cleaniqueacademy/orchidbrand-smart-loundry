import React, { useState } from "react";
import { Plus, Building2, Store, DollarSign, ShoppingBag, KeyRound, CreditCard, Pencil, Sparkles, Tag, Clock } from "lucide-react";
import { Tenant, User } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";
import { ResetPasswordModal } from "../modals/ResetPasswordModal";
import { EditTenantModal } from "../modals/EditTenantModal";
import { AdminExtendModal } from "../modals/AdminExtendModal";

interface TenantsTabProps {
  tenants: Tenant[];
  users?: User[];
  onOpenTenantModal: () => void;
  onSelectTenant?: (id: string) => void;
  currentTenantId?: string;
  onResetPassword?: (userId: string, newPassword: string) => Promise<boolean>;
  onUpdateTenant?: (tenantId: string, data: Record<string, unknown>) => Promise<boolean>;
  onRefreshData?: () => void;
}

function maskAccountNumber(num?: string | null) {
  if (!num) return null;
  if (num.length <= 4) return num;
  return num.slice(0, 3) + "·".repeat(Math.max(0, num.length - 6)) + num.slice(-3);
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  tenants,
  users = [],
  onOpenTenantModal,
  onResetPassword,
  onUpdateTenant,
  onRefreshData,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [userToReset, setUserToReset] = useState<User | null>(null);
  const [tenantToEdit, setTenantToEdit] = useState<Tenant | null>(null);
  const [tenantToExtend, setTenantToExtend] = useState<Tenant | null>(null);

  const totalOmsetAll = tenants.reduce((sum, t) => sum + (t.totalOmset || 0), 0);
  const totalOrdersAll = tenants.reduce((sum, t) => sum + (t.totalOrders || 0), 0);

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      t.outletName.toLowerCase().includes(q) ||
      t.id.toLowerCase().includes(q) ||
      (t.owner?.name && t.owner.name.toLowerCase().includes(q)) ||
      (t.owner?.email && t.owner.email.toLowerCase().includes(q)) ||
      t.phone.includes(searchQuery) ||
      t.address.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.bankName && t.bankName.toLowerCase().includes(q)) ||
      (t.bankAccountNumber && t.bankAccountNumber.includes(searchQuery))
    );
  });

  const columns: ColumnDef<Tenant>[] = [
    // 1. Nama Cabang + ID
    {
      id: "outlet",
      header: "Cabang",
      className: "min-w-[180px]",
      cell: (t) => {
        const parts = t.outletName.includes(" - ") ? t.outletName.split(" - ") : [t.outletName];
        const branchName = parts.length > 1 ? parts.slice(1).join(" - ") : parts[0];
        return (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center shrink-0">
              <Store className="w-4 h-4 text-sky-600" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-zinc-900 text-xs whitespace-nowrap" title={t.outletName}>
                {branchName}
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">
                {t.city ? `${t.city} · ` : ""}{t.phone}
              </div>
            </div>
          </div>
        );
      },
    },
    // 2. Pemilik (nama + reset pw)
    {
      id: "owner",
      header: "Pemilik",
      className: "min-w-[130px]",
      cell: (t) => {
        const ownerUser = users?.find(
          (u) =>
            (t.owner?.id && u.id === t.owner.id) ||
            (t.userId && u.id === t.userId) ||
            (t.owner?.email && u.email.toLowerCase() === t.owner.email.toLowerCase()) ||
            (u.tenantId === t.id && u.role === "tenant_owner")
        );
        const ownerName = t.owner?.name || ownerUser?.name;
        const ownerEmail = t.owner?.email || ownerUser?.email;
        return (
          <div className="flex items-center justify-between gap-1.5">
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 text-xs whitespace-nowrap">{ownerName || "—"}</div>
              {ownerEmail && (
                <div className="text-[10px] text-zinc-400 font-mono truncate max-w-[120px]">{ownerEmail}</div>
              )}
            </div>
            {onResetPassword && ownerUser && (
              <button
                type="button"
                onClick={() => setUserToReset(ownerUser)}
                className="p-1 rounded-md border border-zinc-200 text-zinc-400 hover:text-blue-700 hover:bg-blue-50 transition shrink-0"
                title={`Reset Password ${ownerUser.name}`}
              >
                <KeyRound className="w-3 h-3" />
              </button>
            )}
          </div>
        );
      },
    },
    // 3. Rekening bank
    {
      id: "rekening",
      header: "Rekening",
      className: "min-w-[150px]",
      cell: (t) => {
        const masked = maskAccountNumber(t.bankAccountNumber);
        if (!t.bankName && !masked) {
          return <span className="text-zinc-300 text-xs">—</span>;
        }
        return (
          <div className="flex items-center gap-1.5">
            <CreditCard className="w-3 h-3 text-sky-400 shrink-0" />
            <div>
              <span className="text-xs font-bold text-zinc-800">{t.bankName || "—"}</span>
              {masked && (
                <span className="ml-1.5 font-mono text-[11px] text-zinc-500 tracking-wider">{masked}</span>
              )}
              {t.bankAccountName && (
                <div className="text-[10px] text-zinc-400 uppercase truncate max-w-[140px]">{t.bankAccountName}</div>
              )}
            </div>
          </div>
        );
      },
    },
    // 4. Status & Tarif
    {
      id: "status",
      header: "Status / Tarif",
      align: "center",
      className: "min-w-[160px] whitespace-nowrap",
      cell: (t) => {
        const isActive = (t.status || "active") === "active";
        const dateStr = t.subscriptionUntil || "2026-12-31";
        const diffDays = Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000);
        const isExpired = diffDays < 0;
        const hasReferral = Boolean(t.referralCodeId || t.source === "referral");
        return (
          <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
            <span className={`whitespace-nowrap px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
              isActive ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
            }`}>
              {isActive ? "Aktif" : "Nonaktif"}
            </span>
            <span className={`text-[9.5px] font-semibold shrink-0 whitespace-nowrap ${isExpired ? "text-rose-500" : diffDays <= 7 ? "text-amber-500" : "text-zinc-400"}`}>
              {isExpired ? "Expired" : `${diffDays}h lagi`}
            </span>
            {hasReferral ? (
              <span className="whitespace-nowrap px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 shrink-0" title="Terdaftar dengan kode referral: Tarif Rp 55.000/bln">
                Ref (55k)
              </span>
            ) : (
              <span className="whitespace-nowrap px-1.5 py-0.5 rounded text-[9.5px] font-medium bg-zinc-50 text-zinc-500 border border-zinc-200 shrink-0" title="Tarif standar: Rp 60.000/bln">
                Reg (60k)
              </span>
            )}
          </div>
        );
      },
    },
    // 5. Omset + Pesanan (digabung)
    {
      id: "stats",
      header: "Omset / Order",
      align: "right",
      className: "w-[110px]",
      cell: (t) => (
        <div className="text-right">
          <div className="font-bold text-emerald-700 text-xs whitespace-nowrap">
            Rp {(t.totalOmset || 0).toLocaleString("id-ID")}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">{t.totalOrders || 0} pesanan</div>
        </div>
      ),
    },
    // 6. Actions (Perpanjang & Edit)
    {
      id: "actions",
      header: "",
      align: "center",
      className: "w-[75px]",
      cell: (t) => (
        <div className="flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setTenantToExtend(t)}
            className="p-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300 transition cursor-pointer"
            title="Perpanjang Masa Aktif & Catat Kas"
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setTenantToEdit(t)}
            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition cursor-pointer"
            title="Edit cabang"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Data Cabang</h2>
          <p className="text-xs text-zinc-500">Daftar dan pantau seluruh cabang laundry.</p>
        </div>
        <button
          onClick={onOpenTenantModal}
          className="bg-blue-700 hover:bg-blue-800 text-white font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-xs transition"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Cabang
        </button>
      </div>

      {/* KPI Cards — modern gradient style */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-gradient-to-br from-blue-50 via-sky-50/70 to-indigo-50/30 p-4 sm:p-5 rounded-2xl border border-blue-300 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Total Cabang</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {tenants.length} <span className="text-xs font-semibold text-blue-700">Cabang</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
            {tenants.filter(t => t.status === "active").length} cabang aktif beroperasi
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Total Omset</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-950 mt-2.5 tracking-tight">
            Rp {(totalOmsetAll / 1000000).toFixed(1)}jt
          </div>
          <div className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
            Semua cabang terdaftar (lunas)
          </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
            <span>Total Pesanan</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {totalOrdersAll} <span className="text-xs font-semibold text-indigo-700">Order</span>
          </div>
          <div className="text-[11px] text-indigo-700/90 font-medium mt-1 truncate">
            Akumulasi transaksi jaringan
          </div>
        </div>
      </div>

      {/* Tabel */}
      <ShadcnDataTable
        data={filteredTenants}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari nama, pemilik, kota, rekening..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        emptyMessage="Tidak ada data cabang."
        initialPageSize={10}
      />

      {/* Modals */}
      <ResetPasswordModal
        isOpen={!!userToReset}
        user={userToReset}
        onClose={() => setUserToReset(null)}
        onResetPassword={async (userId, newPassword) => {
          if (onResetPassword) return await onResetPassword(userId, newPassword);
          return false;
        }}
      />
      <EditTenantModal
        isOpen={!!tenantToEdit}
        tenant={tenantToEdit}
        onClose={() => setTenantToEdit(null)}
        onSubmit={async (tenantId, data) => {
          if (onUpdateTenant) return await onUpdateTenant(tenantId, data as Record<string, unknown>);
          return false;
        }}
      />
      <AdminExtendModal
        isOpen={!!tenantToExtend}
        tenant={tenantToExtend}
        onClose={() => setTenantToExtend(null)}
        onSuccess={() => {
          if (onRefreshData) onRefreshData();
        }}
      />
    </div>
  );
};
