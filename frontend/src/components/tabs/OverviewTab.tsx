import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Waves,
  MessageCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
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
      {/* Welcome Banner: Hitam, Biru Tua & Biru Muda */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-blue-950 to-blue-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-blue-900/50">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-72 h-72 bg-sky-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-sky-400/20 text-sky-300 border border-sky-400/30 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              Sistem Kasir & Arus Kas Realtime
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Selamat Datang di Orchid Smart Laundry
            </h2>
            <p className="text-sky-100/80 text-xs sm:text-sm mt-2 max-w-xl leading-relaxed">
              Pencatatan order terpadu, pemantauan arus kas masuk dan biaya keluar secara akurat, serta notifikasi WhatsApp otomatis ke pelanggan saat cucian siap.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={onOpenOrderModal}
              className="bg-sky-400 hover:bg-sky-300 text-blue-950 font-extrabold px-4 py-2.5 rounded-xl shadow-lg shadow-sky-400/30 text-xs sm:text-sm flex items-center gap-2 transition"
            >
              <Plus className="w-4 h-4 text-blue-950" /> Order Baru
            </button>
            <button
              onClick={onOpenExpenseModal}
              className="bg-white/10 hover:bg-white/20 text-white font-bold px-4 py-2.5 rounded-xl text-xs sm:text-sm flex items-center gap-2 transition border border-white/20"
            >
              <DollarSign className="w-4 h-4 text-sky-300" /> Catat Biaya
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Uang Masuk */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Uang Masuk (Lunas)
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-50 text-blue-900 flex items-center justify-center border border-sky-200">
              <TrendingUp className="w-4 h-4 text-sky-600" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              Rp {stats.totalIncome.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Belum Lunas:{" "}
              <span className="font-bold text-sky-700">
                Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
              </span>
            </p>
          </div>
        </div>

        {/* Uang Keluar */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Uang Keluar (Biaya)
            </span>
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center border border-slate-200">
              <TrendingDown className="w-4 h-4 text-slate-700" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              Rp {stats.totalExpense.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-slate-500 mt-1">Deterjen, listrik, utilitas operasional</p>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Laba Bersih (Net)
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center border border-blue-200">
              <DollarSign className="w-4 h-4 text-blue-700" />
            </div>
          </div>
          <div className="mt-3">
            <div
              className={`text-2xl font-black tracking-tight ${
                stats.netProfit >= 0 ? "text-blue-950" : "text-rose-600"
              }`}
            >
              Rp {stats.netProfit.toLocaleString("id-ID")}
            </div>
            <p className="text-xs text-slate-500 mt-1">Pemasukan dikurangi pengeluaran</p>
          </div>
        </div>

        {/* Cucian Aktif */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cucian Dalam Proses
            </span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-900 flex items-center justify-center border border-sky-200">
              <Waves className="w-4 h-4 text-sky-700" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-black text-slate-950 tracking-tight">
              {stats.activeOrdersCount} Order
            </div>
            <p className="text-xs text-sky-800 font-bold mt-1">
              {stats.readyOrdersCount} Siap diambil customer ✨
            </p>
          </div>
        </div>
      </div>

      {/* 2-Column Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Siap Diambil & Kirim WhatsApp */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-extrabold text-slate-950 text-base">
                Siap Diambil & Kirim WhatsApp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Kirim notifikasi otomatis ke nomor telepon customer dengan 1 klik
              </p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-blue-900 hover:text-sky-600 font-bold flex items-center gap-1 transition"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl text-slate-400 text-xs sm:text-sm">
              Tidak ada cucian yang sedang menunggu pengambilan saat ini.
            </div>
          ) : (
            <div className="space-y-3">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-sky-50/50 border border-sky-100 gap-3 hover:bg-sky-50 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-950 text-sm">
                        {order.customer?.name || "Pelanggan"}
                      </span>
                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-900 text-sky-200">
                        SIAP DIAMBIL
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      <span className="font-mono font-bold text-slate-900">{order.invoiceNo}</span> •{" "}
                      {order.serviceType} ({order.weightOrQty} {order.unit}) •{" "}
                      <span className="font-bold text-blue-950">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={getWaLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3.5 py-1.5 rounded-xl bg-blue-900 hover:bg-black text-sky-200 hover:text-white font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-sky-400" /> Kirim WhatsApp
                    </a>
                    <button
                      onClick={() => onUpdateStatus(order.id, "completed")}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-950 hover:bg-blue-950 text-white font-bold text-xs flex items-center gap-1.5 transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial Quick Snapshot */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-extrabold text-slate-950 text-base">Ringkasan Kas Outlet</h3>
            <p className="text-xs text-slate-500 mt-0.5 mb-4">
              Rekapitulasi keuangan operasional toko
            </p>

            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs sm:text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Total Transaksi</span>
                <span className="font-bold text-slate-950">
                  {stats.totalOrdersCount} Order
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Uang Masuk (Lunas)</span>
                <span className="font-bold text-blue-950">
                  Rp {stats.totalIncome.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm py-2 border-b border-slate-100">
                <span className="text-slate-600">Biaya Pengeluaran</span>
                <span className="font-bold text-slate-700">
                  Rp {stats.totalExpense.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs sm:text-sm py-2.5">
                <span className="text-slate-950 font-bold">Laba Bersih Toko</span>
                <span
                  className={`font-black text-base ${
                    stats.netProfit >= 0 ? "text-blue-950" : "text-rose-600"
                  }`}
                >
                  Rp {stats.netProfit.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button
              onClick={() => setActiveTab("cashflow")}
              className="w-full py-2.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-blue-950 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-sky-200"
            >
              Buka Buku Kas Lengkap <ArrowRight className="w-3.5 h-3.5 text-blue-800" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
