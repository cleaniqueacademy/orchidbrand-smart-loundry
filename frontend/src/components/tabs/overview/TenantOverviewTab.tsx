import React from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Waves,
  CheckCircle2,
  ArrowRight,
  Plus,
  ShieldCheck,
  Store,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { CashflowStats, Order, TabType, Tenant, Role } from "../../../types";
import { useConfirm } from "../../common/ConfirmContext";
import { formatCurrency } from "../../../utils/formatUtils";

interface TenantOverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  tenantId: string;
  currentUserRole: Role;
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
}

export const TenantOverviewTab: React.FC<TenantOverviewTabProps> = ({
  stats,
  orders,
  tenants,
  tenantId,
  currentUserRole,
  onOpenOrderModal,
  onOpenExpenseModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
}) => {
  const confirm = useConfirm();
  const readyOrders = orders.filter((o) => o.status === "ready");

  const activeTenant = tenants.find((t) => t.id === tenantId) ||
    tenants[0] || {
      id: "tenant-01",
      outletName: "Orchid Laundry - Cabang Melati",
      phone: "081234567890",
      address: "Jl. Melati Raya No. 45, Jakarta",
    };

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
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {activeTenant.outletName}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <Store className="w-3 h-3 text-sky-600 shrink-0" />
              <span>Cabang</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            {activeTenant.address}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenOrderModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Order Baru</span>
          </button>
          <button
            onClick={onOpenExpenseModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
            <span>Catat Biaya</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Pemasukan */}
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-emerald-700/90 font-medium mt-1">
            Belum tertagih: Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-rose-700/90 font-medium mt-1">Operasional cabang ini</p>
        </div>

        {/* Laba Bersih */}
        <div className="rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Laba Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {formatCurrency(stats.netProfit)}
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">Pemasukan − Pengeluaran</p>
        </div>

        {/* Cucian Aktif */}
        <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Dalam Proses
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {stats.activeOrdersCount} <span className="text-xs font-semibold text-amber-700">Order</span>
          </div>
          <p className="text-[11px] text-amber-700/90 font-medium mt-1">
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
              <h3 className="font-bold text-zinc-900 text-sm">Siap Diambil</h3>
              <p className="text-xs text-zinc-400">Hubungi pelanggan melalui WhatsApp</p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-zinc-700 hover:text-zinc-900 font-medium flex items-center gap-1 transition cursor-pointer"
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
                      {order.rackNumber && (
                        <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-200">
                          Rak: {order.rackNumber}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 ml-3.5">
                      <span className="font-mono font-semibold text-zinc-700">
                        {order.invoiceNo}
                      </span>
                      {" · "}
                      {order.serviceType} ({order.weightOrQty} {order.unit})
                      {" · "}
                      <span className="font-bold text-zinc-900 font-mono">
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
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs flex items-center gap-1.5 transition border border-zinc-200 cursor-pointer"
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
                <span className="font-bold text-emerald-700 font-mono">
                  Rp {stats.totalIncome.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-zinc-100">
                <span className="text-zinc-500">Pengeluaran Biaya</span>
                <span className="font-bold text-rose-700 font-mono">
                  Rp {stats.totalExpense.toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="font-semibold text-zinc-900">Laba Bersih</span>
                <span
                  className={`font-bold text-sm font-mono ${
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
            className="mt-4 w-full py-2 rounded-lg bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-medium text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200 cursor-pointer"
          >
            Buku Kas <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
