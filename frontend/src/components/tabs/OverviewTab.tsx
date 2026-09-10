import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Waves,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Plus
} from "lucide-react";
import { CashflowStats, Order, TabType } from "../../types";

interface OverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  stats,
  orders,
  onOpenOrderModal,
  onOpenExpenseModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
}) => {
  const readyOrders = orders.filter((o) => o.status === "ready");

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 rounded-2xl p-6 sm:p-8 text-white border border-blue-900/40">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Orchid Smart Laundry
            </h2>
            <p className="text-sky-300/70 text-xs mt-1.5">Kasir & Arus Kas Realtime</p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onOpenOrderModal}
              className="bg-sky-400 hover:bg-sky-300 text-blue-950 font-extrabold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4" /> Order Baru
            </button>
            <button
              onClick={onOpenExpenseModal}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition border border-white/15"
            >
              <DollarSign className="w-4 h-4 text-sky-300" /> Catat Biaya
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Uang Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pemasukan
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center border border-sky-100">
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-950 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Belum lunas:{" "}
            <span className="text-sky-700 font-semibold">
              Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
            </span>
          </p>
        </div>

        {/* Uang Keluar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200">
              <TrendingDown className="w-4 h-4 text-slate-500" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-900 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total operasional</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Laba Bersih
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center border border-blue-100">
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
          </div>
          <div
            className={`mt-3 text-2xl font-black tracking-tight ${
              stats.netProfit >= 0 ? "text-blue-950" : "text-rose-600"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Masuk − Keluar</p>
        </div>

        {/* Cucian Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Dalam Proses
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center border border-sky-100">
              <Waves className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-slate-950 tracking-tight">
            {stats.activeOrdersCount}
          </div>
          <p className="text-[11px] text-sky-700 font-semibold mt-1">
            {stats.readyOrdersCount} siap diambil
          </p>
        </div>
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Siap Diambil */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-950 text-sm">Siap Diambil</h3>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-blue-900 hover:text-sky-600 font-semibold flex items-center gap-1 transition"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Tidak ada cucian menunggu pengambilan
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-100 gap-3 hover:border-sky-200 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
                      <span className="font-bold text-slate-950 text-sm">
                        {order.customer?.name || "Pelanggan"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 ml-3.5">
                      <span className="font-mono font-semibold text-slate-700">{order.invoiceNo}</span>
                      {" · "}
                      {order.serviceType} {order.weightOrQty} {order.unit}
                      {" · "}
                      <span className="font-semibold text-blue-950">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={getWaLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-black text-sky-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WA
                    </a>
                    <button
                      onClick={() => onUpdateStatus(order.id, "completed")}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-950 text-sm mb-4">Ringkasan Kas</h3>

            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Total Order</span>
                <span className="font-bold text-slate-950">{stats.totalOrdersCount}</span>
              </div>
              <div className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Pemasukan</span>
                <span className="font-bold text-blue-950">
                  Rp {stats.totalIncome.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-2.5 border-b border-slate-100">
                <span className="text-slate-500">Pengeluaran</span>
                <span className="font-bold text-slate-700">
                  Rp {stats.totalExpense.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs py-3">
                <span className="font-semibold text-slate-950">Laba Bersih</span>
                <span
                  className={`font-black text-sm ${
                    stats.netProfit >= 0 ? "text-blue-950" : "text-rose-600"
                  }`}
                >
                  Rp {stats.netProfit.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("cashflow")}
            className="mt-4 w-full py-2.5 rounded-xl bg-slate-50 hover:bg-sky-50 text-blue-950 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-slate-200 hover:border-sky-200"
          >
            Buku Kas Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
