import React from "react";
import { Plus, Building2, User, Mail, Phone, MapPin } from "lucide-react";
import { Tenant } from "../../types";

interface TenantsTabProps {
  tenants: Tenant[];
  onOpenTenantModal: () => void;
}

export const TenantsTab: React.FC<TenantsTabProps> = ({
  tenants,
  onOpenTenantModal,
}) => {
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-slate-950">Cabang & Tenant</h2>
        <button
          onClick={onOpenTenantModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Tambah Tenant
        </button>
      </div>

      {/* Tenants Grid */}
      {tenants.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-dashed border-slate-200">
          Belum ada tenant terdaftar
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {tenants.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-sky-200 transition"
            >
              {/* Outlet Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center border border-sky-100 shrink-0">
                  <Building2 className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm">{t.outletName}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{t.id}</p>
                </div>
              </div>

              {/* Info Rows */}
              <div className="space-y-2 text-xs border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-300" /> Pemilik
                  </span>
                  <span className="font-semibold text-slate-800">{t.owner?.name || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-300" /> Email
                  </span>
                  <span className="font-mono text-slate-600">{t.owner?.email || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-300" /> Telepon
                  </span>
                  <span className="font-mono text-slate-600">{t.phone}</span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-2 border-t border-slate-100">
                  <span className="text-slate-400 flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-300" /> Alamat
                  </span>
                  <span className="text-slate-600 text-right">{t.address}</span>
                </div>
              </div>

              {/* Stats */}
              <div className="mt-4 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-semibold text-slate-400 block">Order</span>
                  <span className="text-lg font-black text-blue-950 mt-0.5 block">{t.totalOrders}</span>
                </div>
                <div className="bg-blue-950 p-3 rounded-xl text-white">
                  <span className="text-[10px] font-semibold text-sky-300 block">Omset</span>
                  <span className="text-sm font-black text-white mt-0.5 block">
                    Rp {t.totalOmset.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
