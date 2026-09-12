import React, { useState } from "react";
import { Plus, Building2, Phone, Mail, Store, ArrowRight, DollarSign, ShoppingBag } from "lucide-react";
import { Tenant } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";

interface TenantsTabProps {
  tenants: Tenant[];
  onOpenTenantModal: () => void;
  onSelectTenant: (id: string) => void;
  currentTenantId: string;
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  tenants,
  onOpenTenantModal,
  onSelectTenant,
  currentTenantId,
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
      header: "Nama Cabang / Outlet",
      cell: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-zinc-100 border border-zinc-200 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="font-semibold text-zinc-900 text-xs flex items-center gap-1.5">
              <span>{t.outletName}</span>
              {t.id === currentTenantId && (
                <span className="text-[9px] bg-blue-900 text-white font-mono px-1.5 py-0.2 rounded">
                  AKTIF
                </span>
              )}
            </div>
            <div className="font-mono text-[10px] text-zinc-400 mt-0.5">{t.id}</div>
          </div>
        </div>
      ),
    },
    {
      id: "owner",
      header: "Pemilik (Tenant Owner)",
      cell: (t) => (
        <div>
          <div className="font-semibold text-zinc-900 text-xs flex items-center gap-1.5">
            <span>{t.owner?.name || "Budi Santoso"}</span>
            <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded font-normal">
              Owner
            </span>
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
      header: "Kontak & Alamat",
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
      header: "Status Cabang",
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
      header: "Langganan Sampai",
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
      header: "Total Order",
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
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (t) => (
        <button
          onClick={() => onSelectTenant(t.id)}
          className={`px-2.5 py-1 text-xs rounded-lg font-medium inline-flex items-center gap-1 transition ${
            t.id === currentTenantId
              ? "bg-zinc-100 text-zinc-500 cursor-default"
              : "bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white"
          }`}
        >
          <span>{t.id === currentTenantId ? "Sedang Diinspeksi" : "Inspeksi Outlet"}</span>
          {t.id !== currentTenantId && <ArrowRight className="w-3 h-3" />}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
            Manajemen Cabang & Tenants
          </h2>
          <p className="text-xs text-zinc-500">
            Akses tingkat Super Admin untuk mendaftarkan dan memonitor seluruh cabang milik Tenant Owner
          </p>
        </div>

        <button
          onClick={onOpenTenantModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Daftarkan Cabang Baru
        </button>
      </div>

      {/* Notice Callout on Ownership */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-3 text-xs text-zinc-600 flex items-start gap-2.5">
        <Building2 className="w-4 h-4 text-zinc-800 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-zinc-900">Kepemilikan Cabang:</span> Setiap cabang/tenant di bawah ini adalah milik sah dari masing-masing <strong>Tenant Owner</strong>. Akun <strong>Super Admin</strong> <em>tidak memiliki tenant/outlet pribadi</em> dan bertindak sebagai pengelola sistem pusat, pendaftar waralaba baru, dan pemantau konsolidasi omset.
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Outlet Aktif
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <Building2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{tenants.length} Cabang</div>
          <p className="text-[11px] text-zinc-400 mt-1">Multi-outlet terintegrasi</p>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Akumulasi Omset Semua Outlet
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">
            Rp {totalOmsetAll.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Dari seluruh transaksi lunas</p>
        </div>

        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Seluruh Pesanan
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2">{totalOrdersAll} Pesanan</div>
          <p className="text-[11px] text-zinc-400 mt-1">Volume cucian keseluruhan</p>
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
