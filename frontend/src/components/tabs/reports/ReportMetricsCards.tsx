import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { ReportMetrics } from "./useReportData";

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
      {/* 1. Omset Penjualan */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Pemasukan Bruto
          </span>
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2 font-mono">
          Rp {metrics.totalRevenue.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          <span>{metrics.paidCount} transaksi lunas</span>
        </div>
      </div>

      {/* 2. Piutang Belum Lunas */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-700">
            Piutang Pelanggan
          </span>
          <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-amber-800 mt-2 font-mono">
          Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          {metrics.unpaidCount} pesanan belum lunas
        </div>
      </div>

      {/* 3. Pengeluaran Operasional */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-rose-700">
            Total Pengeluaran
          </span>
          <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-rose-800 mt-2 font-mono">
          Rp {metrics.totalExpense.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          {expenseCount} catatan biaya
        </div>
      </div>

      {/* 4. Laba Bersih (Net Profit) */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-700 text-white p-4 rounded-xl shadow-sm border border-blue-700">
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/5 rounded-full blur-xl pointer-events-none" />
        <div className="flex items-center justify-between text-blue-300 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-blue-200">
            Laba Bersih
          </span>
          <span className="text-[10px] font-semibold bg-blue-800/60 text-emerald-300 px-1.5 py-0.2 rounded border border-blue-700">
            Margin {metrics.profitMargin}%
          </span>
        </div>
        <div className="text-xl font-bold text-white mt-2 font-mono">
          Rp {metrics.netProfit.toLocaleString("id-ID")}
        </div>
        <div className="text-[11px] text-blue-300 mt-1">
          Omset dikurangi beban biaya
        </div>
      </div>

      {/* 5. Volume Cucian */}
      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
        <div className="flex items-center justify-between text-zinc-500 text-xs">
          <span className="font-semibold uppercase tracking-wider text-[10px]">
            Volume Cucian
          </span>
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
            <Scale className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-xl font-bold text-zinc-900 mt-2">
          {metrics.totalKg.toFixed(1)} <span className="text-xs font-normal text-zinc-500">Kg</span>
        </div>
        <div className="text-[11px] text-zinc-400 mt-1">
          +{metrics.totalPcs} Pcs cucian satuan
        </div>
      </div>
    </div>
  );
};
