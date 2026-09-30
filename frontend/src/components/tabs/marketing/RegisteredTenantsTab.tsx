import React, { useState, useEffect } from "react";
import {
  Store,
  TrendingUp,
  Clock,
  Search,
  X,
  Share2,
} from "lucide-react";
import { User } from "../../../types";
import { useMarketing } from "../../../hooks/useMarketing";
import { ReferralCodeShareBox } from "../admin/ReferralCodeShareBox";

interface RegisteredTenantsTabProps {
  currentUser?: User;
}

export const RegisteredTenantsTab: React.FC<RegisteredTenantsTabProps> = ({ currentUser }) => {
  const { meData, fetchMe, loading } = useMarketing();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [shareCode, setShareCode] = useState<any>(null);

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  const tenants = meData?.tenants || [];
  const primaryCode = meData?.codes?.[0];

  const filteredTenants = tenants.filter((t) => {
    if (statusFilter === "active" && t.status !== "active") return false;
    if (statusFilter === "trial" && !t.isTrial) return false;
    if (statusFilter === "subscribed" && (t.isTrial || t.status !== "active")) return false;

    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      t.outletName.toLowerCase().includes(q) ||
      (t.city && t.city.toLowerCase().includes(q)) ||
      (t.phone && t.phone.toLowerCase().includes(q)) ||
      (t.referralCode && t.referralCode.toLowerCase().includes(q))
    );
  });

  const totalCount = tenants.length;
  const trialCount = tenants.filter((t) => t.isTrial).length;
  const subscribedCount = tenants.filter((t) => !t.isTrial && t.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">
            Laundry Terdaftar
          </h2>
          <p className="text-xs text-zinc-500">
            Daftar seluruh cabang toko laundry yang mendaftar menggunakan kode referral tim marketing Anda.
          </p>
        </div>

        {primaryCode && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="flex items-center gap-2 bg-blue-50/80 border border-blue-200 px-3 py-1.5 rounded-xl">
              <span className="text-[11px] text-blue-700 font-medium">Kode Anda:</span>
              <span className="font-mono font-black text-blue-900 text-xs tracking-wider">
                {primaryCode.code}
              </span>
            </div>
            <button
              onClick={() => setShareCode(primaryCode)}
              className="px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              Bagikan
            </button>
          </div>
        )}
      </div>

      {/* 3 Stats KPI Cards (UI standar admin seperti AdminOverviewTab) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        {/* Total Outlet Terdaftar */}
        <div className="bg-gradient-to-br from-blue-50 via-sky-50/70 to-indigo-50/30 p-4 sm:p-5 rounded-2xl border border-blue-300 shadow-xs relative overflow-hidden group hover:border-blue-400 transition">
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Total Outlet Terdaftar</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {totalCount} <span className="text-xs font-semibold text-blue-700">Outlet</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
            Mendaftar dengan kode Anda
          </div>
        </div>

        {/* Berlangganan Aktif */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Berlangganan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-950 mt-2.5 tracking-tight">
            {subscribedCount} <span className="text-xs font-semibold text-emerald-700">Outlet</span>
          </div>
          <div className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
            Menghasilkan insentif rutin
          </div>
        </div>

        {/* Masa Uji Coba (Trial) */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Masa Uji Coba (Trial)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-950 mt-2.5 tracking-tight">
            {trialCount} <span className="text-xs font-semibold text-amber-700">Outlet</span>
          </div>
          <div className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
            Periode gratis 7 hari
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama outlet, kota, telepon..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Semua Status</option>
            <option value="subscribed">Berlangganan Aktif</option>
            <option value="trial">Trial 7 Hari</option>
            <option value="active">Semua Aktif</option>
          </select>
        </div>
      </div>

      {/* Table Listing */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Nama Outlet</th>
                <th className="py-3.5 px-4">Kota / Lokasi</th>
                <th className="py-3.5 px-4">Kontak WhatsApp</th>
                <th className="py-3.5 px-4">Kode Digunakan</th>
                <th className="py-3.5 px-4">Status Langganan</th>
                <th className="py-3.5 px-4">Masa Berlaku</th>
                <th className="py-3.5 px-4">Tanggal Bergabung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Memuat data laundry terdaftar...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    {search || statusFilter !== "all"
                      ? "Tidak ada data outlet yang sesuai dengan filter pencarian."
                      : "Belum ada cabang laundry yang mendaftar menggunakan kode referral Anda."}
                  </td>
                </tr>
              ) : (
                filteredTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-800">{t.outletName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">ID: {t.id}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {t.city || "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {t.phone ? (
                        <a
                          href={`https://wa.me/${t.phone.replace(/^0/, "62").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 font-medium"
                        >
                          {t.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-[11px]">
                        {t.referralCode || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`whitespace-nowrap inline-flex items-center font-semibold text-[10.5px] px-2.5 py-0.5 rounded-full shrink-0 w-fit ${
                          t.status === "active"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {t.isTrial ? "Trial 7 Hari" : "Aktif"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {t.subscriptionUntil
                        ? `s/d ${new Date(t.subscriptionUntil).toLocaleDateString("id-ID")}`
                        : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {t.createdAt
                        ? new Date(t.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Share QR & Link */}
      <ReferralCodeShareBox
        isOpen={!!shareCode}
        onClose={() => setShareCode(null)}
        code={shareCode}
      />
    </div>
  );
};
