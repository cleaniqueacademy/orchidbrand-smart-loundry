import React, { useState, useMemo, useEffect } from "react";
import {
  Activity,
  Sparkles,
  TrendingUp,
  Droplets,
  Flame,
  Package,
  Home,
  Sliders,
  Clock,
  Info,
  ArrowUpRight,
  X,
  CheckCircle2,
} from "lucide-react";
import { BusinessHealthAnalysis, SopRatios, Tenant } from "../../../types";
import { formatCurrency } from "../../../utils/formatUtils";
import { DEFAULT_SOP_RATIOS } from "../../../utils/businessHealthUtils";
import { ModalWrapper } from "../../common/ModalWrapper";
import { useToast } from "../../common/ToastContext";
import { authHeaders } from "../../../utils/api";

interface BusinessHealthSectionProps {
  health: BusinessHealthAnalysis;
  tenantId: string;
  activeTenant?: Tenant | null;
  onUpdateTenant?: (
    id: string,
    data: { [key: string]: unknown }
  ) => Promise<boolean>;
  onRefresh?: () => void;
}

export const BusinessHealthSection: React.FC<BusinessHealthSectionProps> = ({
  health,
  tenantId,
  activeTenant,
  onUpdateTenant,
  onRefresh,
}) => {
  const toast = useToast();
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [savingSop, setSavingSop] = useState(false);

  // Parse saved custom SOP ratios from active tenant or fallback to defaults
  const savedSop = useMemo<SopRatios>(() => {
    if (activeTenant?.customSopRatios) {
      try {
        const parsed =
          typeof activeTenant.customSopRatios === "string"
            ? JSON.parse(activeTenant.customSopRatios)
            : activeTenant.customSopRatios;
        if (parsed && typeof parsed === "object") {
          return {
            ...DEFAULT_SOP_RATIOS,
            ...parsed,
          };
        }
      } catch {}
    }
    return DEFAULT_SOP_RATIOS;
  }, [activeTenant?.customSopRatios]);

  const [sopForm, setSopForm] = useState<SopRatios>(savedSop);

  // Sync form whenever modal is opened or active tenant data updates
  useEffect(() => {
    setSopForm(savedSop);
  }, [savedSop, isSopModalOpen]);

  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId =
      tenantId && tenantId !== "all"
        ? tenantId
        : activeTenant?.id && activeTenant.id !== "all"
        ? activeTenant.id
        : "all";

    try {
      setSavingSop(true);
      const res = await fetch(`/api/tenants/${targetId}/expense-settings?applyAll=true`, {
        method: "PUT",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ customSopRatios: sopForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          "SOP Tersimpan",
          "Standar takaran bahan outlet berhasil diperbarui ke seluruh cabang!"
        );
        if (onUpdateTenant && targetId !== "all") {
          await onUpdateTenant(targetId, { customSopRatios: JSON.stringify(sopForm) });
        }
        setIsSopModalOpen(false);
        onRefresh?.();
      } else {
        toast.error("Gagal Simpan", json.message || "Terjadi kesalahan");
      }
    } catch (err: any) {
      toast.error("Gagal Simpan", err.message || "Kesalahan jaringan");
    } finally {
      setSavingSop(false);
    }
  };

  const getScoreColorBadge = (score: number) => {
    if (score >= 80) return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-rose-50 text-rose-700 border-rose-200";
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Header Row & Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              Zero Config AI Analytics
            </span>
            <span className="text-[11px] text-zinc-400 font-medium">
              • Berdasarkan {health.totalWashKg} Kg Cucian Kiloan
            </span>
          </div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Kesehatan & Efisiensi Operasional
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 max-w-2xl">
            Audit matematis proporsi bahan kimia dan sewa ruko tanpa perlu entri harian rumit.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsSopModalOpen(true)}
          className="h-9 px-3.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
          title="Atur standar takaran operasional prosedur bahan baku"
        >
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Sesuaikan Standar SOP</span>
        </button>
      </div>

      {/* 2. Responsive 4 Stats Cards Grid (Matching OrdersTab & CashflowTab) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Skor Kesehatan Bisnis - Mint Emerald */}
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span className="truncate">Skor Kesehatan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight flex items-baseline gap-1">
            <span>{health.healthScore}</span>
            <span className="text-xs font-semibold text-emerald-700">/ 100</span>
          </div>
          <div className="mt-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${getScoreColorBadge(
                health.healthScore
              )}`}
            >
              <CheckCircle2 className="w-2.5 h-2.5" />
              {health.ratingText}
            </span>
          </div>
        </div>

        {/* Card 2: Margin Laba Bersih - Sky Indigo */}
        <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-sky-300 transition">
          <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
            <span className="truncate">Margin Laba Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {health.netMarginPct}%
          </div>
          <p className="text-[11px] text-sky-700/90 font-medium mt-1 truncate">
            Laba: {formatCurrency(health.netProfit)} (Target &gt; 35%)
          </p>
        </div>

        {/* Card 3: HPP Bahan Baku - Teal Cyan */}
        <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-teal-300 transition">
          <div className="flex items-center justify-between text-xs text-teal-800 font-semibold">
            <span className="truncate">HPP Bahan Baku</span>
            <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Droplets className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {health.chemicalRatioPct}%
          </div>
          <p className="text-[11px] text-teal-700/90 font-medium mt-1 truncate">
            Total: {formatCurrency(health.chemicalExpenseTotal)} (Ideal 10-18%)
          </p>
        </div>

        {/* Card 4: Piutang Kasir POS - Sunset Amber */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span className="truncate">Piutang Kasir POS</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {formatCurrency(health.unpaidRevenue)}
          </div>
          <p className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
            Lunas Masuk: {formatCurrency(health.paidRevenue)}
          </p>
        </div>
      </div>

      {/* 3. Audit Penggunaan Bahan Baku (Deterjen, Parfum, Gas, Plastik) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              Audit Efisiensi Takaran Bahan Baku
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Komparasi estimasi kebutuhan standar SOP terhadap realisasi belanja di buku kas.
            </p>
          </div>
          <span className="text-[11px] font-semibold text-zinc-600 bg-zinc-50 border border-zinc-200 px-2.5 py-1 rounded-xl self-start sm:self-auto">
            Basis: {health.totalWashKg} Kg Cucian Kiloan
          </span>
        </div>

        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[650px]">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Bahan Operasional</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Estimasi SOP</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Estimasi Biaya</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Belanja Buku Kas</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Selisih</th>
                  <th className="py-2.5 px-3.5 whitespace-nowrap">Status Efisiensi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {health.materials.map((mat) => {
                  const getIcon = () => {
                    if (mat.key === "detergent") return <Droplets className="w-3.5 h-3.5 text-blue-500" />;
                    if (mat.key === "perfume") return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
                    if (mat.key === "gas") return <Flame className="w-3.5 h-3.5 text-amber-500" />;
                    return <Package className="w-3.5 h-3.5 text-emerald-500" />;
                  };

                  const getStatusBadge = () => {
                    if (mat.status === "danger") {
                      return (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 whitespace-nowrap">
                          Boros Takaran ({mat.ratioPct}%)
                        </span>
                      );
                    }
                    if (mat.status === "warning") {
                      return (
                        <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 whitespace-nowrap">
                          Sedikit Boros ({mat.ratioPct}%)
                        </span>
                      );
                    }
                    if (mat.status === "no_data") {
                      return (
                        <span className="inline-flex items-center text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 border border-zinc-200 whitespace-nowrap">
                          Belum Dicatat
                        </span>
                      );
                    }
                    return (
                      <span className="inline-flex items-center text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                        Efisien & Wajar ({mat.ratioPct}%)
                      </span>
                    );
                  };

                  return (
                    <tr key={mat.key} className="hover:bg-zinc-50/80 transition-colors">
                      <td className="py-2.5 px-3.5 font-semibold text-zinc-900 flex items-center gap-2 whitespace-nowrap">
                        <div className="w-6 h-6 bg-zinc-100 rounded-lg flex items-center justify-center shrink-0">
                          {getIcon()}
                        </div>
                        {mat.name}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-700 font-medium whitespace-nowrap">
                        {mat.estimatedQty > 0 ? `${mat.estimatedQty} ${mat.unitLabel}` : "-"}
                      </td>
                      <td className="py-2.5 px-3.5 text-zinc-600 font-medium whitespace-nowrap font-mono">
                        {formatCurrency(mat.estimatedCost)}
                      </td>
                      <td className="py-2.5 px-3.5 font-bold text-zinc-900 whitespace-nowrap font-mono">
                        {formatCurrency(mat.actualCost)}
                      </td>
                      <td className="py-2.5 px-3.5 font-medium whitespace-nowrap font-mono">
                        {mat.differenceCost > 0 ? (
                          <span className="text-rose-600">+{formatCurrency(mat.differenceCost)}</span>
                        ) : mat.differenceCost < 0 ? (
                          <span className="text-emerald-600">{formatCurrency(mat.differenceCost)}</span>
                        ) : (
                          <span className="text-zinc-400">Rp 0</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3.5 whitespace-nowrap">{getStatusBadge()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. Sewa Tempat & Rekomendasi Cerdas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        {/* Pelacakan Sewa Ruko */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
                <Home className="w-4 h-4 text-indigo-500" />
                Pelacakan Sewa Tempat (Ruko/Kios)
              </h3>
              {health.rent.hasRent && (
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    health.rent.isExpiringSoon
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}
                >
                  {health.rent.remainingMonths} Bulan Tersisa
                </span>
              )}
            </div>

            {health.rent.hasRent ? (
              <div className="space-y-3.5 mt-4">
                <div className="bg-zinc-50 p-3.5 rounded-xl border border-zinc-200/80">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500 text-[11px]">Total Biaya Sewa:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5 font-mono">
                        {formatCurrency(health.rent.totalPaid)}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[11px]">Durasi Sewa:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {health.rent.durationMonths} Bulan
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[11px]">Beban Bulanan (Amortisasi):</span>
                      <div className="text-sm font-bold text-emerald-700 mt-0.5 font-mono">
                        {formatCurrency(health.rent.monthlyAmortization)} / bln
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500 text-[11px]">Jatuh Tempo:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {health.rent.endDate || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>
                    Beban sewa diamortisasi sebesar <strong>{formatCurrency(health.rent.monthlyAmortization)}/bulan</strong> pada
                    kalkulasi laba bersih bulanan agar pembukuan tetap sehat dan proporsional.
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <Clock className="w-7 h-7 mx-auto text-zinc-300" />
                <p className="text-xs font-semibold text-zinc-700">Belum Ada Pencatatan Sewa Ruko Berjangka</p>
                <p className="text-[11px] text-zinc-400 max-w-xs mx-auto">
                  Saat mencatat beban sewa di menu Buku Kas, isi durasi bulan agar sistem otomatis melacak sisa masa sewa Anda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rekomendasi Cerdas Bisnis (AI Advice) */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-sm sm:text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Rekomendasi Cerdas Operasional
              </h3>
              <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-md">
                Audit Otomatis
              </span>
            </div>

            <div className="space-y-2.5 mt-3.5">
              {health.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-zinc-50/80 hover:bg-zinc-50 rounded-xl border border-zinc-200/70 flex items-start gap-2.5 text-xs text-zinc-700 leading-relaxed transition"
                >
                  <span className="w-5 h-5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-between">
            <span className="text-[11px]">Konsultasi AI Laundry:</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer hover:underline text-xs">
              Tanyakan ke Cleanique AI Copilot <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 5. Modal Sesuaikan Standar SOP Bahan */}
      <ModalWrapper isOpen={isSopModalOpen} onClose={() => setIsSopModalOpen(false)} maxWidth="max-w-md">
        <form onSubmit={handleSaveSop} className="p-5 sm:p-6 bg-white rounded-2xl border border-zinc-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-zinc-700" />
              Sesuaikan Standar SOP Outlet
            </h3>
            <button
              type="button"
              onClick={() => setIsSopModalOpen(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Ubah acuan takaran SOP jika outlet Anda menggunakan takaran atau formula khusus. Standar ini otomatis diterapkan ke seluruh cabang.
          </p>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Takaran Deterjen (ml per kg cucian)
              </label>
              <input
                type="number"
                value={sopForm.detergentMlPerKg}
                onChange={(e) => setSopForm({ ...sopForm, detergentMlPerKg: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-zinc-900 text-xs font-semibold outline-none transition"
                min="5"
                max="100"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Default: 25 ml / kg (1 tutup takar mesin front load)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Harga Beli Deterjen (Rp per Liter)
              </label>
              <input
                type="number"
                value={sopForm.detergentPricePerLiter}
                onChange={(e) => setSopForm({ ...sopForm, detergentPricePerLiter: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-zinc-900 text-xs font-semibold outline-none transition"
                step="500"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Default: Rp 15.000 / Liter (kemasan jerigen 5 Liter)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Takaran Parfum & Pelicin (ml per kg cucian)
              </label>
              <input
                type="number"
                value={sopForm.perfumeMlPerKg}
                onChange={(e) => setSopForm({ ...sopForm, perfumeMlPerKg: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-zinc-900 text-xs font-semibold outline-none transition"
                min="2"
                max="50"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Default: 12 ml / kg (semprot saat finishing setrika)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Estimasi Biaya Gas Dryer (Rp per kg cucian)
              </label>
              <input
                type="number"
                value={sopForm.gasCostPerKg}
                onChange={(e) => setSopForm({ ...sopForm, gasCostPerKg: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 bg-zinc-50 focus:bg-white focus:border-zinc-900 text-xs font-semibold outline-none transition"
                step="50"
              />
              <span className="text-[10px] text-zinc-400 mt-0.5 block">Default: Rp 400 / kg cucian (tabung LPG 3kg / 12kg)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSopForm(DEFAULT_SOP_RATIOS)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 cursor-pointer"
            >
              Reset ke Default
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSopModalOpen(false)}
                className="h-9 px-3.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingSop}
                className="h-9 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {savingSop ? "Menyimpan..." : "Simpan Pengaturan"}
              </button>
            </div>
          </div>
        </form>
      </ModalWrapper>
    </div>
  );
};
