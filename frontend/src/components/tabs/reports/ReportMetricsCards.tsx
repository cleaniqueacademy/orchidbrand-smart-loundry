import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ReportMetrics } from "./useReportData";
import { formatCurrency } from "../../../utils/formatUtils";

interface ReportMetricsCardsProps {
  metrics: ReportMetrics;
  expenseCount: number;
}

export const ReportMetricsCards: React.FC<ReportMetricsCardsProps> = ({
  metrics,
  expenseCount,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
      {/* 1. Omset Penjualan - Mint Emerald */}
      <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-800">
            Pemasukan Bruto
          </span>
          <div className="w-7 h-7 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.totalRevenue.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-emerald-700/90 font-medium mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{metrics.paidCount} transaksi lunas</span>
        </div>
      </div>

      {/* 2. Piutang Belum Lunas - Sunset Amber */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-amber-800">
            Piutang Pelanggan
          </span>
          <div className="w-7 h-7 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-amber-700/90 font-medium mt-1">
          {metrics.unpaidCount} pesanan belum lunas
        </div>
      </div>

      {/* 3. Pengeluaran Operasional - Rose Vibrant */}
      <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-rose-800">
            Total Pengeluaran
          </span>
          <div className="w-7 h-7 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.totalExpense.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-rose-700/90 font-medium mt-1">
          {expenseCount} catatan biaya
        </div>
      </div>

      {/* 4. Laba Bersih - Hero Light Blue Spotlight */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-sky-800">
            Laba Bersih
          </span>
          <span className="text-[10px] font-bold bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded border border-sky-200">
            Margin {metrics.profitMargin}%
          </span>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          {formatCurrency(metrics.netProfit)}
        </div>
        <div className="text-[11px] text-sky-700 font-medium mt-1">
          Omset dikurangi beban biaya
        </div>
      </div>

      {/* 5. Volume Cucian - Royal Indigo */}
      <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold uppercase tracking-wider text-[10px] text-indigo-800">
            Volume Cucian
          </span>
          <div className="w-7 h-7 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
            <Scale className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          {metrics.totalKg.toFixed(1)} <span className="text-xs font-semibold text-indigo-700">Kg</span>
        </div>
        <div className="text-[11px] text-indigo-700/90 font-medium mt-1">
          +{metrics.totalPcs} Pcs cucian satuan
        </div>
      </div>
    </div>
  );
};
