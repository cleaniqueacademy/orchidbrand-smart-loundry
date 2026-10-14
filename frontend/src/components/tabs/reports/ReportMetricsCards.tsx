import React from "react";
import {
  TrendingUp,
  TrendingDown,
  Scale,
  Clock,
  Package,
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
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
      {/* 1. Omset Penjualan - Mint Emerald */}
      <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
        <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
          <span className="truncate">Pemasukan Bruto</span>
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.totalRevenue.toLocaleString("id-ID")}
        </div>
        <p className="text-[11px] text-emerald-700/90 font-medium mt-1 truncate">
          {metrics.paidCount} transaksi lunas
        </p>
      </div>

      {/* 2. Piutang Pelanggan - Sunset Amber */}
      <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
        <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
          <span className="truncate">Piutang Kasir</span>
          <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.pendingRevenue.toLocaleString("id-ID")}
        </div>
        <p className="text-[11px] text-amber-700/90 font-medium mt-1 truncate">
          {metrics.unpaidCount} belum bayar
        </p>
      </div>

      {/* 3. Beban Biaya - Rose Vibrant */}
      <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-rose-300 transition">
        <div className="flex items-center justify-between text-xs text-rose-800 font-semibold">
          <span className="truncate">Beban Biaya</span>
          <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <TrendingDown className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          Rp {metrics.totalExpense.toLocaleString("id-ID")}
        </div>
        <p className="text-[11px] text-rose-700/90 font-medium mt-1 truncate">
          {expenseCount} catatan biaya
        </p>
      </div>

      {/* 4. Laba Bersih - Sky Indigo */}
      <div className="rounded-2xl border border-sky-200/90 bg-gradient-to-br from-sky-50/90 via-blue-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-sky-300 transition">
        <div className="flex items-center justify-between text-xs text-sky-800 font-semibold">
          <span className="truncate">Laba Bersih</span>
          <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs shrink-0">
            <Scale className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          {formatCurrency(metrics.netProfit)}
        </div>
        <p className="text-[11px] text-sky-700/90 font-medium mt-1 truncate">
          Margin: {metrics.profitMargin}%
        </p>
      </div>

      {/* 5. Volume Cucian - Royal Indigo (Spans 2 cols on mobile) */}
      <div className="col-span-2 lg:col-span-1 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-3.5 sm:p-5 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
        <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
          <span className="truncate">Volume Cucian</span>
          <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs shrink-0">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
          {metrics.totalKg.toFixed(1)} <span className="text-xs font-semibold text-indigo-700">Kg</span>
        </div>
        <p className="text-[11px] text-indigo-700/90 font-medium mt-1 truncate">
          +{metrics.totalPcs} Pcs cucian satuan
        </p>
      </div>
    </div>
  );
};

