import React from "react";
import { Layers, CreditCard, PieChart } from "lucide-react";
import {
  ServiceBreakdownItem,
  ExpenseBreakdownItem,
  PaymentMethodBreakdownItem,
} from "./useReportData";

interface ReportAnalyticsPanelsProps {
  serviceBreakdown: ServiceBreakdownItem[];
  expenseBreakdown: ExpenseBreakdownItem[];
  paymentMethodBreakdown: PaymentMethodBreakdownItem[];
  totalExpense: number;
  paidCount: number;
}

export const ReportAnalyticsPanels: React.FC<ReportAnalyticsPanelsProps> = ({
  serviceBreakdown,
  expenseBreakdown,
  paymentMethodBreakdown,
  totalExpense,
  paidCount,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
      {/* Panel Layanan Terlaris (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Kontribusi Penjualan per Layanan</h3>
              <p className="text-[11px] text-zinc-400">Distribusi omset dari setiap kategori cucian</p>
            </div>
          </div>
          <span className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg">
            {serviceBreakdown.length} varian
          </span>
        </div>

        <div className="space-y-3">
          {serviceBreakdown.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              Belum ada data pesanan pada periode ini
            </div>
          ) : (
            serviceBreakdown.map((s) => (
              <div key={s.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800">{s.name}</span>
                  <div className="flex items-center gap-2.5">
                    <span className="text-zinc-500 text-[11px]">
                      {s.count} order ({s.qty} {s.unit})
                    </span>
                    <span className="font-bold text-zinc-900 whitespace-nowrap font-mono">
                      Rp {s.total.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-700 bg-zinc-100 px-1.5 py-0.5 rounded-full border border-zinc-200/80">
                      {s.pct}%
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-700 to-indigo-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, s.pct))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel Beban Pengeluaran & Metode Pembayaran (5 cols) */}
      <div className="lg:col-span-5 space-y-4 sm:space-y-5">
        {/* Breakdown Pengeluaran */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-center justify-center shrink-0">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-zinc-900 text-sm">Beban Pengeluaran</h3>
            </div>
            <span className="text-xs font-bold text-rose-700 whitespace-nowrap font-mono">
              Rp {totalExpense.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="space-y-2.5">
            {expenseBreakdown.length === 0 ? (
              <div className="py-6 text-center text-zinc-400 text-xs">
                Tidak ada pengeluaran tercatat
              </div>
            ) : (
              expenseBreakdown.map((e) => (
                <div key={e.category} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-zinc-700 font-medium">{e.category}</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-semibold text-zinc-900 font-mono">
                      Rp {e.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">({e.pct}%)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="bg-white rounded-2xl border border-zinc-200 p-4 sm:p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <h3 className="font-bold text-zinc-900 text-sm">Metode Pembayaran</h3>
            </div>
            <span className="text-xs font-semibold text-zinc-500 bg-zinc-50 border border-zinc-200 px-2 py-0.5 rounded-lg">
              {paidCount} order
            </span>
          </div>

          <div className="space-y-2">
            {paymentMethodBreakdown.map((m) => (
              <div
                key={m.method}
                className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80"
              >
                <span className="font-semibold text-zinc-800">{m.method}</span>
                <div className="text-right">
                  <div className="font-mono font-bold text-zinc-900">
                    Rp {m.amount.toLocaleString("id-ID")}
                  </div>
                  <div className="text-[10px] text-zinc-400">{m.count} transaksi</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
