import React, { useState } from "react";
import {
  Activity,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  Sliders,
  Droplets,
  Flame,
  Package,
  Layers,
  Info,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { BusinessHealthAnalysis, SopRatios } from "../../../types";
import { formatCurrency } from "../../../utils/formatUtils";
import { DEFAULT_SOP_RATIOS } from "../../../utils/businessHealthUtils";
import { ModalWrapper } from "../../common/ModalWrapper";
import { useToast } from "../../common/ToastContext";
import { authHeaders } from "../../../utils/api";

interface BusinessHealthSectionProps {
  health: BusinessHealthAnalysis;
  tenantId: string;
  onRefresh?: () => void;
}

export const BusinessHealthSection: React.FC<BusinessHealthSectionProps> = ({
  health,
  tenantId,
  onRefresh,
}) => {
  const toast = useToast();
  const [isSopModalOpen, setIsSopModalOpen] = useState(false);
  const [savingSop, setSavingSop] = useState(false);
  const [sopForm, setSopForm] = useState<SopRatios>(DEFAULT_SOP_RATIOS);

  const handleSaveSop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || tenantId === "all") {
      toast.warning("Pilih Cabang", "Pilih cabang spesifik untuk menyimpan pengaturan SOP!");
      return;
    }
    try {
      setSavingSop(true);
      const res = await fetch(`/api/tenants/${tenantId}/expense-settings`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({ customSopRatios: sopForm }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("SOP Tersimpan", "Standar takaran bahan outlet berhasil diperbarui!");
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

  const getScoreRingColor = (score: number) => {
    if (score >= 80) return "text-emerald-500 border-emerald-500";
    if (score >= 60) return "text-amber-500 border-amber-500";
    return "text-rose-500 border-rose-500";
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Score Hero Card */}
      <div className="bg-gradient-to-br from-white via-zinc-50/50 to-emerald-50/30 rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Zero Configuration AI Analytics
              </span>
              <span className="text-xs text-zinc-500">• Berdasarkan {health.totalWashKg} Kg Cucian Kiloan</span>
            </div>
            <h2 className="text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
              <Activity className="w-6 h-6 text-emerald-600" />
              Kesehatan & Efisiensi Bisnis
            </h2>
            <p className="text-sm text-zinc-600 max-w-2xl">
              Audit matematis penggunaan bahan kimia (deterjen, parfum, gas, plastik) dan proporsi beban sewa ruko
              tanpa perlu entri data harian yang rumit.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-zinc-200 shadow-sm self-start md:self-auto">
            <div
              className={`w-16 h-16 rounded-2xl border-2 flex flex-col items-center justify-center font-black ${getScoreRingColor(
                health.healthScore
              )}`}
            >
              <span className="text-2xl leading-none">{health.healthScore}</span>
              <span className="text-[10px] text-zinc-400 font-medium">/ 100</span>
            </div>
            <div>
              <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Status Bisnis</div>
              <div className={`text-sm font-bold px-2 py-0.5 rounded-md mt-1 border inline-block ${getScoreColorBadge(health.healthScore)}`}>
                {health.ratingText}
              </div>
            </div>
            <button
              onClick={() => setIsSopModalOpen(true)}
              className="ml-2 p-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-zinc-600 hover:text-zinc-900 transition-colors"
              title="Atur Standar Takaran SOP Bahan"
            >
              <Sliders className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Three Metric Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-zinc-200/80">
          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Margin Laba Bersih</span>
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                Target &gt; 35%
              </span>
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {health.netMarginPct}%
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
              <span>Untung Bersih Efektif:</span>
              <span className="font-semibold text-zinc-800">{formatCurrency(health.netProfit)}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>HPP Bahan Operasional</span>
              <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded font-semibold text-[11px]">
                Ideal 10 - 18%
              </span>
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {health.chemicalRatioPct}%
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
              <span>Total Belanja Bahan:</span>
              <span className="font-semibold text-zinc-800">{formatCurrency(health.chemicalExpenseTotal)}</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
            <div className="flex items-center justify-between text-xs text-zinc-500 font-medium">
              <span>Tingkat Piutang (Belum Bayar)</span>
              <span className="text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded font-semibold text-[11px]">
                Kasir POS
              </span>
            </div>
            <div className="text-2xl font-black text-zinc-900 mt-1">
              {formatCurrency(health.unpaidRevenue)}
            </div>
            <div className="text-xs text-zinc-500 mt-1 flex items-center justify-between">
              <span>Uang Lunas Masuk:</span>
              <span className="font-semibold text-emerald-700">{formatCurrency(health.paidRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Audit Penggunaan Bahan Baku (Deterjen, Parfum, Gas, Plastik) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-100">
          <div>
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Droplets className="w-5 h-5 text-blue-500" />
              Audit Efisiensi Takaran Bahan Baku
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Komparasi estimasi kebutuhan standar SOP terhadap realisasi pengeluaran riil di buku kas.
            </p>
          </div>
          <button
            onClick={() => setIsSopModalOpen(true)}
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Sliders className="w-3.5 h-3.5" />
            Sesuaikan Standar SOP
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider bg-zinc-50/70">
                <th className="py-3 px-4 rounded-l-lg">Bahan Operasional</th>
                <th className="py-3 px-4">Estimasi SOP Wajar</th>
                <th className="py-3 px-4">Estimasi Biaya</th>
                <th className="py-3 px-4">Belanja di Buku Kas</th>
                <th className="py-3 px-4">Selisih</th>
                <th className="py-3 px-4 rounded-r-lg">Status Efisiensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {health.materials.map((mat) => {
                const getIcon = () => {
                  if (mat.key === "detergent") return <Droplets className="w-4 h-4 text-blue-500" />;
                  if (mat.key === "perfume") return <Sparkles className="w-4 h-4 text-purple-500" />;
                  if (mat.key === "gas") return <Flame className="w-4 h-4 text-amber-500" />;
                  return <Package className="w-4 h-4 text-emerald-500" />;
                };

                const getStatusBadge = () => {
                  if (mat.status === "danger") {
                    return (
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1 w-max">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Boros Takaran ({mat.ratioPct}%)
                      </span>
                    );
                  }
                  if (mat.status === "warning") {
                    return (
                      <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-max">
                        <AlertTriangle className="w-3 h-3 text-amber-600" />
                        Sedikit Boros ({mat.ratioPct}%)
                      </span>
                    );
                  }
                  if (mat.status === "no_data") {
                    return (
                      <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-600 border border-zinc-200 w-max">
                        Belum Dicatat
                      </span>
                    );
                  }
                  return (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Efisien & Wajar ({mat.ratioPct}%)
                    </span>
                  );
                };

                return (
                  <tr key={mat.key} className="hover:bg-zinc-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-zinc-900 flex items-center gap-2.5">
                      <div className="p-1.5 bg-zinc-100 rounded-lg">{getIcon()}</div>
                      {mat.name}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-700 font-medium">
                      {mat.estimatedQty > 0 ? `${mat.estimatedQty} ${mat.unitLabel}` : "-"}
                    </td>
                    <td className="py-3.5 px-4 text-zinc-600 font-medium">
                      {formatCurrency(mat.estimatedCost)}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-zinc-900">
                      {formatCurrency(mat.actualCost)}
                    </td>
                    <td className="py-3.5 px-4 font-medium">
                      {mat.differenceCost > 0 ? (
                        <span className="text-rose-600">+{formatCurrency(mat.differenceCost)}</span>
                      ) : mat.differenceCost < 0 ? (
                        <span className="text-emerald-600">{formatCurrency(mat.differenceCost)}</span>
                      ) : (
                        <span className="text-zinc-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sewa Tempat & Rekomendasi Cerdas Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pelacakan Sewa Ruko */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Home className="w-5 h-5 text-indigo-500" />
                Pelacakan Sewa Tempat (Ruko/Kios)
              </h3>
              {health.rent.hasRent && (
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
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
              <div className="space-y-4 mt-4">
                <div className="bg-zinc-50 p-4 rounded-xl border border-zinc-200/80">
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-500">Total Biaya Sewa:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {formatCurrency(health.rent.totalPaid)}
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500">Durasi Sewa:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {health.rent.durationMonths} Bulan
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500">Beban Bulanan (Amortisasi):</span>
                      <div className="text-sm font-bold text-emerald-700 mt-0.5">
                        {formatCurrency(health.rent.monthlyAmortization)} / bln
                      </div>
                    </div>
                    <div>
                      <span className="text-zinc-500">Jatuh Tempo:</span>
                      <div className="text-sm font-bold text-zinc-900 mt-0.5">
                        {health.rent.endDate || "-"}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-100 text-xs text-blue-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                  <span>
                    Beban sewa dibagi adil sebesar <strong>{formatCurrency(health.rent.monthlyAmortization)}/bulan</strong> pada
                    kalkulasi laba bersih, sehingga bulan pertama tidak kelihatan minus drastis.
                  </span>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-zinc-500 space-y-2">
                <Clock className="w-8 h-8 mx-auto text-zinc-300" />
                <p className="text-sm font-medium">Belum ada pencatatan sewa ruko berjangka.</p>
                <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                  Saat mencatat pengeluaran sewa di menu Buku Kas, isi durasi bulan agar sistem otomatis melacak sisa masa sewa Anda.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Rekomendasi Cerdas Bisnis (AI Advice) */}
        <div className="bg-gradient-to-br from-white to-zinc-50 rounded-2xl border border-zinc-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="text-base font-bold text-zinc-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                Rekomendasi Cerdas Operasional
              </h3>
              <span className="text-xs font-semibold text-zinc-500">Auto Generated</span>
            </div>

            <div className="space-y-3 mt-4">
              {health.recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white rounded-xl border border-zinc-200 shadow-2xs flex items-start gap-3 text-xs text-zinc-700 leading-relaxed"
                >
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span>{rec}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 text-xs text-zinc-500 flex items-center justify-between">
            <span>Ingin tanya lebih detail?</span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1 cursor-pointer">
              Tanyakan ke Cleanique AI Copilot <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </div>
      </div>

      {/* 5. Modal Sesuaikan Standar SOP Bahan */}
      <ModalWrapper isOpen={isSopModalOpen} onClose={() => setIsSopModalOpen(false)} maxWidth="max-w-md">
        <form onSubmit={handleSaveSop} className="p-6 bg-white rounded-2xl border border-zinc-200 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
            <h3 className="text-lg font-bold text-zinc-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-emerald-600" />
              Sesuaikan Standar SOP Outlet
            </h3>
            <button
              type="button"
              onClick={() => setIsSopModalOpen(false)}
              className="text-zinc-400 hover:text-zinc-700 text-sm font-bold"
            >
              ✕
            </button>
          </div>

          <p className="text-xs text-zinc-500">
            Ubah acuan takaran SOP jika outlet Anda menggunakan takaran atau formula khusus.
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
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-semibold"
                min="5"
                max="100"
              />
              <span className="text-[10px] text-zinc-400">Default: 25 ml / kg (1 tutup takar mesin front load)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Harga Beli Deterjen (Rp per Liter)
              </label>
              <input
                type="number"
                value={sopForm.detergentPricePerLiter}
                onChange={(e) => setSopForm({ ...sopForm, detergentPricePerLiter: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-semibold"
                step="500"
              />
              <span className="text-[10px] text-zinc-400">Default: Rp 15.000 / Liter (kemasan jerigen 5 Liter)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Takaran Parfum & Pelicin (ml per kg cucian)
              </label>
              <input
                type="number"
                value={sopForm.perfumeMlPerKg}
                onChange={(e) => setSopForm({ ...sopForm, perfumeMlPerKg: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-semibold"
                min="2"
                max="50"
              />
              <span className="text-[10px] text-zinc-400">Default: 12 ml / kg (semprot saat finishing setrika)</span>
            </div>

            <div>
              <label className="font-semibold text-zinc-700 block mb-1">
                Estimasi Biaya Gas Dryer (Rp per kg cucian)
              </label>
              <input
                type="number"
                value={sopForm.gasCostPerKg}
                onChange={(e) => setSopForm({ ...sopForm, gasCostPerKg: Number(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-semibold"
                step="50"
              />
              <span className="text-[10px] text-zinc-400">Default: Rp 400 / kg cucian (tabung LPG 3kg / 12kg)</span>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setSopForm(DEFAULT_SOP_RATIOS)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-800"
            >
              Reset ke Default
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSopModalOpen(false)}
                className="px-3 py-2 rounded-lg text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingSop}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
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
