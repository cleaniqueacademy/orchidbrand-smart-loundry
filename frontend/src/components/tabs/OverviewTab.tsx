import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Waves,
  CheckCircle2,
  ArrowRight,
  Plus,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { CashflowStats, Order, TabType } from "../../types";
import { useConfirm } from "../common/ConfirmContext";

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
  const confirm = useConfirm();
  const readyOrders = orders.filter((o) => o.status === "ready");

  const handleCompleteOrder = async (order: Order) => {
    const confirmed = await confirm({
      title: "Tandai Cucian Selesai?",
      description: (
        <span>
          Tandai pesanan <strong>{order.invoiceNo}</strong> untuk pelanggan{" "}
          <strong>{order.customer?.name || "Pelanggan"}</strong> sebagai selesai / sudah diambil?
        </span>
      ),
      confirmText: "Ya, Tandai Selesai",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      onUpdateStatus(order.id, "completed");
    }
  };

  return (
    <div className="space-y-5">
      {/* Welcome Banner */}
      {/* Welcome Banner — blue gradient */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-800 to-blue-600 rounded-xl p-5 sm:p-6 text-white shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* Decorative blobs */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-24 h-24 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
            Orchid Smart Laundry
          </h2>
          <p className="text-blue-200 text-xs mt-1">
            Dashboard kasir, pemantauan cucian, dan pembukuan arus kas
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <button
            onClick={onOpenOrderModal}
            className="bg-white hover:bg-blue-50 text-blue-900 font-semibold px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Order Baru
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="bg-white/15 hover:bg-white/25 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 transition border border-white/20 backdrop-blur-sm"
          >
            <DollarSign className="w-3.5 h-3.5" /> Catat Biaya
          </button>
        </div>
      </div>

      {/* 4 Metric Cards (Shadcn UI style) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pemasukan */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pemasukan
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Belum tertagih:{" "}
            <span className="text-amber-700 font-medium">
              Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
            </span>
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pengeluaran
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Operasional outlet</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Laba Bersih
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight ${
              stats.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Pemasukan − Biaya</p>
        </div>

        {/* Cucian Aktif */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Dalam Proses
            </span>
            <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <Waves className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-2 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {stats.activeOrdersCount} Order
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            {stats.readyOrdersCount} pesanan siap diambil
          </p>
        </div>
      </div>

      {/* 2-Column Section: Ready for Pickup & Financial Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Siap Diambil */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Cucian Siap Diambil</h3>
              <p className="text-xs text-zinc-400">Hubungi pelanggan melalui WhatsApp</p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-zinc-700 hover:text-zinc-900 font-medium flex items-center gap-1 transition"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-200 rounded-lg text-zinc-400 text-xs">
              Tidak ada cucian yang sedang menunggu pengambilan saat ini
            </div>
          ) : (
            <div className="space-y-2">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-zinc-50 border border-zinc-200/80 gap-3 hover:border-zinc-300 transition"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="font-semibold text-zinc-900 text-xs">
                        {order.customer?.name || "Pelanggan"}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 ml-3.5">
                      <span className="font-mono font-semibold text-zinc-700">{order.invoiceNo}</span>
                      {" · "}
                      {order.serviceType} ({order.weightOrQty} {order.unit})
                      {" · "}
                      <span className="font-bold text-zinc-900">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <a
                      href={getWaLink(order)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-xs"
                    >
                      <WhatsAppIcon className="w-3.5 h-3.5" /> WA
                    </a>
                    <button
                      onClick={() => handleCompleteOrder(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs flex items-center gap-1.5 transition border border-zinc-200"
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
        <div className="bg-white rounded-xl border border-zinc-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm mb-3">Ringkasan Kasir</h3>

            <div className="space-y-1 text-xs">
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Total Transaksi</span>
                <span className="font-bold text-zinc-900">{stats.totalOrdersCount} Order</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Pemasukan Lunas</span>
                <span className="font-bold text-emerald-700">
                  Rp {stats.totalIncome.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Pengeluaran Biaya</span>
                <span className="font-bold text-rose-700">
                  Rp {stats.totalExpense.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="font-semibold text-zinc-900">Laba Bersih</span>
                <span
                  className={`font-bold text-sm ${
                    stats.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  Rp {stats.netProfit.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setActiveTab("cashflow")}
            className="mt-4 w-full py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-medium text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200"
          >
            Lihat Buku Kas Lengkap <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
