import React, { useState } from "react";
import { Plus, Building2, Phone, Mail, Store, DollarSign, ShoppingBag } from "lucide-react";
import { Tenant } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";

interface TenantsTabProps {
  tenants: Tenant[];
  onOpenTenantModal: () => void;
  onSelectTenant?: (id: string) => void;
  currentTenantId?: string;
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  tenants,
  onOpenTenantModal,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

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
      cell: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="font-semibold text-zinc-900 text-xs">{t.outletName}</div>
            <div className="font-mono text-[10px] text-zinc-400 mt-0.5">{t.id}</div>
          </div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Pemilik",
      cell: (t) => (
        <div>
          <div className="font-semibold text-zinc-900 text-xs">
            {t.owner?.name || "Budi Santoso"}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 font-mono">
            <Mail className="w-2.5 h-2.5" />
            <span>{t.owner?.email || "—"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "contact",
      header: "Kontak",
      cell: (t) => (
        <div>
          <div className="text-zinc-800 text-xs font-mono flex items-center gap-1">
            <Phone className="w-2.5 h-2.5 text-zinc-400" />
            <span>{t.phone}</span>
          </div>
          <div className="text-[10px] text-zinc-400 truncate max-w-xs mt-0.5">{t.address}</div>
        </div>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (t) => {
        const isActive = (t.status || "active") === "active";
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              isActive
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isActive ? "bg-emerald-600 animate-pulse" : "bg-rose-600"
              }`}
            />
            <span>{isActive ? "Aktif" : "Nonaktif"}</span>
          </span>
        );
      },
    },
    {
      id: "subscription",
      header: "Masa Aktif",
      cell: (t) => {
        const dateStr = t.subscriptionUntil || "2026-12-31";
        const expDate = new Date(dateStr);
        const today = new Date();
        const diffMs = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const isExpired = diffDays < 0;

        return (
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
              ) : (
                <span className="text-emerald-700 font-medium">
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
      header: "Total Pesanan",
      cell: (t) => (
        <span className="font-semibold text-zinc-800 text-xs">{t.totalOrders} order</span>
      ),
    },
    {
      id: "omset",
      header: "Total Omset",
      cell: (t) => (
        <span className="font-bold text-zinc-900 text-xs">
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
          className="bg-zinc-900 hover:bg-zinc-800 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-xs transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Cabang
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Cabang
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{tenants.length} Cabang</div>
          <p className="text-[11px] text-zinc-400 mt-1">Cabang terdaftar</p>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Omset
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">
            Rp {totalOmsetAll.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Semua transaksi lunas</p>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Pesanan
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{totalOrdersAll} Pesanan</div>
          <p className="text-[11px] text-zinc-400 mt-1">Volume pesanan masuk</p>
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
    </div>
  );
};
