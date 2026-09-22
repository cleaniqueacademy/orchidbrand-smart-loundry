import React, { useState } from "react";
import { X, Building2, Search, Check, Power } from "lucide-react";
import { ReferralCode } from "../../../types";
import { TenantActivationItem } from "../../../hooks/useReferralCodes";

interface ReferralCodeTenantActivationListProps {
  isOpen: boolean;
  onClose: () => void;
  code: ReferralCode | null;
  tenants: TenantActivationItem[];
  onToggle: (tenantId: string, isEnabled: boolean) => Promise<{ success: boolean }>;
}

export const ReferralCodeTenantActivationList: React.FC<
  ReferralCodeTenantActivationListProps
> = ({ isOpen, onClose, code, tenants, onToggle }) => {
  const [search, setSearch] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!isOpen || !code) return null;

  const filtered = tenants.filter(
    (t) =>
      t.outletName.toLowerCase().includes(search.toLowerCase()) ||
      (t.city && t.city.toLowerCase().includes(search.toLowerCase())) ||
      t.phone.includes(search)
  );

  const handleToggle = async (t: TenantActivationItem) => {
    setUpdatingId(t.tenantId);
    try {
      await onToggle(t.tenantId, !t.isEnabled);
      t.isEnabled = !t.isEnabled;
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-md w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center backdrop-blur-xs">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Aktivasi Outlet</h3>
              <p className="text-xs text-blue-100 mt-0.5">
                Kode: <span className="font-mono font-bold">{code.code}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama outlet atau kota..."
              className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* List */}
        <div className="p-4 overflow-y-auto divide-y divide-slate-100 space-y-1">
          {filtered.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Tidak ada outlet yang cocok dengan pencarian
            </div>
          ) : (
            filtered.map((t) => {
              const isUpdating = updatingId === t.tenantId;
              return (
                <div
                  key={t.tenantId}
                  className="pt-2.5 pb-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-800 truncate">
                      {t.outletName}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {t.city || "Kota belum diatur"} • {t.phone}
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggle(t)}
                    disabled={isUpdating}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shrink-0 ${
                      t.isEnabled
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    <Power className={`w-3.5 h-3.5 ${t.isEnabled ? "text-emerald-600" : "text-slate-400"}`} />
                    {isUpdating ? "Memproses..." : t.isEnabled ? "Aktif" : "Nonaktif"}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
