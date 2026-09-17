import React from "react";
import { Layers, CreditCard } from "lucide-react";
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
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      {/* Panel Layanan Terlaris (7 cols) */}
      <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-800 border border-zinc-200">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-zinc-900 text-sm">Kontribusi Penjualan per Layanan</h3>
          </div>
          <span className="text-xs text-zinc-400">{serviceBreakdown.length} varian layanan</span>
        </div>

        <div className="space-y-3">
          {serviceBreakdown.length === 0 ? (
            <div className="py-8 text-center text-zinc-400 text-xs">
              Belum ada data pesanan pada periode ini
            </div>
          ) : (
            serviceBreakdown.map((s) => (
              <div key={s.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-zinc-800">{s.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-zinc-500">
                      {s.count} order ({s.qty} {s.unit})
                    </span>
                    <span className="font-bold text-zinc-900 whitespace-nowrap">
                      Rp {s.total.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] font-semibold text-zinc-600 bg-zinc-100 px-1.5 py-0.2 rounded">
                      {s.pct}%
                    </span>
                  </div>
                </div>
                {/* Progress Bar */}
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-900 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(4, s.pct))}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Panel Beban Pengeluaran & Metode Pembayaran (5 cols) */}
      <div className="lg:col-span-5 space-y-5">
        {/* Breakdown Pengeluaran */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="font-bold text-zinc-900 text-sm">Beban Pengeluaran</h3>
            <span className="text-xs font-bold text-rose-700 whitespace-nowrap">
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
                    <span className="text-zinc-700">{e.category}</span>
                  </div>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="font-semibold text-zinc-900">
                      Rp {e.amount.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-sans">({e.pct}%)</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Metode Pembayaran */}
        <div className="bg-white rounded-xl border border-zinc-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-zinc-500" />
              <span>Metode Pembayaran</span>
            </h3>
            <span className="text-xs text-zinc-400">{paidCount} order</span>
          </div>

          <div className="space-y-2">
            {paymentMethodBreakdown.map((m) => (
              <div
                key={m.method}
                className="flex items-center justify-between text-xs p-2 rounded-lg bg-zinc-50/70 border border-zinc-100"
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
