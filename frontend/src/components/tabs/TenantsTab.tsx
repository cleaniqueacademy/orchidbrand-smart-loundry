import React from "react";
import { Plus, Building2, User, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
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
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Manajemen Tenant & User (Superadmin)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoring seluruh cabang outlet laundry beserta User pemiliknya (Prinsip: 1 User = 1 Tenant Outlet)
          </p>
        </div>
        <button
          onClick={onOpenTenantModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Daftarkan Tenant Baru
        </button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tenants.map((t) => (
          <div
            key={t.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-50 text-blue-900 flex items-center justify-center border border-sky-200 shrink-0">
                    <Building2 className="w-5 h-5 text-sky-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-slate-950">{t.outletName}</h3>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">Tenant ID: {t.id}</p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-blue-950 border border-sky-200 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-sky-600" />
                  1 User : 1 Tenant
                </span>
              </div>

              {/* Owner & Contact Card */}
              <div className="mt-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200/70 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" /> Pemilik Outlet:
                  </span>
                  <span className="font-bold text-slate-900">{t.owner?.name || "Budi Santoso"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email Login:
                  </span>
                  <span className="font-mono text-slate-700">{t.owner?.email || "owner@laundry.com"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> No. Telepon:
                  </span>
                  <span className="font-mono text-slate-700">{t.phone}</span>
                </div>
                <div className="flex items-start justify-between gap-4 pt-1 border-t border-slate-200/50">
                  <span className="text-slate-500 flex items-center gap-1.5 shrink-0">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" /> Alamat:
                  </span>
                  <span className="font-medium text-slate-700 text-right">{t.address}</span>
                </div>
              </div>
            </div>

            {/* Metrics */}
            <div className="mt-5 grid grid-cols-2 gap-3 pt-4 border-t border-slate-100 text-center">
              <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100">
                <span className="text-[11px] font-bold text-blue-900 block">Total Transaksi</span>
                <span className="text-lg font-black text-blue-950 mt-0.5 block">
                  {t.totalOrders} Order
                </span>
              </div>
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 text-white">
                <span className="text-[11px] font-bold text-sky-300 block">Total Omset</span>
                <span className="text-lg font-black text-white mt-0.5 block">
                  Rp {t.totalOmset.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
