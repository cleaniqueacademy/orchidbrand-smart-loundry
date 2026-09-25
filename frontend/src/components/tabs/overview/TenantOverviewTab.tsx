import React, { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Waves,
  CheckCircle2,
  ArrowRight,
  Plus,
  Store,
  Calculator,
  Clock,
  AlertTriangle,
  Users,
  Settings,
  ShieldCheck,
  Calendar,
  RefreshCw,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { CashflowStats, Order, TabType, Tenant, Role, User, CashierShift } from "../../../types";
import { useConfirm } from "../../common/ConfirmContext";
import { formatCurrency } from "../../../utils/formatUtils";
import { WAStatusData } from "../../../hooks/useWhatsAppGateway";

interface TenantOverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  tenantId: string;
  currentUserRole: Role;
  currentUser?: User | null;
  currentShift?: CashierShift | null;
  enableCashierShift?: boolean;
  onOpenShiftModal?: () => void;
  onCloseShiftModal?: () => void;
  onOpenOrderModal: () => void;
  onOpenExpenseModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
  waData?: WAStatusData;
  onSendDirectWa?: (order: Order) => Promise<{ success: boolean; error?: string }>;
}

export const TenantOverviewTab: React.FC<TenantOverviewTabProps> = ({
  stats,
  orders,
  tenants,
  tenantId,
  currentUserRole,
  currentUser,
  currentShift,
  enableCashierShift = true,
  onOpenShiftModal,
  onCloseShiftModal,
  onOpenOrderModal,
  onOpenExpenseModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
  waData,
  onSendDirectWa,
}) => {
  const confirm = useConfirm();
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);

  const activeTenant =
    tenants.find((t) => t.id === tenantId) ||
    tenants[0] || {
      id: "tenant-01",
      outletName: "Laundry Cleanique - Cabang Melati",
      phone: "081234567890",
      address: "Jl. Melati Raya No. 45, Jakarta",
      status: "active" as const,
      totalOrders: 0,
      totalOmset: 0,
    };

  const readyOrders = orders.filter((o) => o.status === "ready");

  const now = Date.now();
  const isSlaLate = (order: Order) =>
    Boolean(
      order.estimatedCompletionAt &&
        new Date(order.estimatedCompletionAt).getTime() < now &&
        order.status !== "ready" &&
        order.status !== "completed" &&
        order.status !== "cancelled"
    );

  const lateSlaOrders = orders.filter(isSlaLate);

  // Deteksi cucian menginap lama di rak (> 3 hari)
  const overduePickupOrders = readyOrders.filter(
    (o) => now - new Date(o.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000
  );

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

  const isShiftActive = Boolean(currentShift && currentShift.status === "open");

  // Format subscription info
  const subscriptionText = activeTenant.subscriptionUntil
    ? new Date(activeTenant.subscriptionUntil).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "Aktif";

  return (
    <div className="space-y-5">
      {/* Header Dashboard Tenant Owner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              {activeTenant.outletName}
            </h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 border border-sky-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <Store className="w-3 h-3 text-sky-600 shrink-0" />
              <span>Owner Cabang</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Lisensi s.d {subscriptionText}</span>
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            {activeTenant.address} {activeTenant.phone && `· Telp: ${activeTenant.phone}`}
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

      {/* 4 Financial & Operational KPI Cards */}
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
            Belum lunas: Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
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
          <p className="text-[11px] text-rose-700/90 font-medium mt-1">
            Biaya operasional toko
          </p>
        </div>

        {/* Laba Bersih */}
        <div className="rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Laba Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`mt-2.5 text-xl sm:text-2xl font-bold tracking-tight ${
            stats.netProfit >= 0 ? "text-zinc-900" : "text-rose-700"
          }`}>
            {formatCurrency(stats.netProfit)}
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">
            Pemasukan − Pengeluaran
          </p>
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

      {/* Monitoring Shift Kasir & Pengawasan Kas Laci Real-Time */}
      {enableCashierShift !== false && (
        <div className="p-4 sm:p-5 rounded-2xl bg-white border border-zinc-200/80 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-zinc-100 gap-2">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
                isShiftActive ? "bg-emerald-600 text-white" : "bg-zinc-100 text-zinc-500"
              }`}>
                <Calculator className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-zinc-900 text-sm">
                    Pengawasan Kas Laci & Shift Kasir
                  </h3>
                  <span className={`text-[10px] font-bold px-2 py-0.2 rounded-md ${
                    isShiftActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-zinc-100 text-zinc-600 border border-zinc-200"
                  }`}>
                    {isShiftActive ? "Kasir Bertugas" : "Shift Belum Buka"}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Monitoring modal awal kembalian dan uang fisik kas laci saat ini
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("cashflow")}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 transition cursor-pointer self-start sm:self-center"
            >
              <span>Audit Riwayat Shift</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {isShiftActive ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3.5 text-xs">
              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-zinc-500 block text-[11px]">Kasir Bertugas</span>
                <span className="font-bold text-zinc-900 text-sm truncate block mt-0.5">
                  {currentShift?.cashierName || "Kasir"}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Buka: {new Date(currentShift!.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div className="p-3 rounded-xl bg-zinc-50 border border-zinc-100">
                <span className="text-zinc-500 block text-[11px]">Modal Awal Kas</span>
                <span className="font-bold text-zinc-900 text-sm font-mono block mt-0.5">
                  {formatCurrency(currentShift!.startingCash)}
                </span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">
                  Kembalian awal laci
                </span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-100">
                <span className="text-emerald-800 block text-[11px]">Tunai Masuk Shift</span>
                <span className="font-bold text-emerald-800 text-sm font-mono block mt-0.5">
                  {formatCurrency(currentShift!.systemCashTotal)}
                </span>
                <span className="text-[10px] text-emerald-700/80 block mt-0.5">
                  Dari order tunai shift ini
                </span>
              </div>

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-100">
                <span className="text-blue-800 block text-[11px]">Estimasi Total Kas</span>
                <span className="font-bold text-blue-900 text-sm font-mono block mt-0.5">
                  {formatCurrency(currentShift!.startingCash + currentShift!.systemCashTotal)}
                </span>
                <span className="text-[10px] text-blue-700/80 block mt-0.5">
                  Fisik uang di laci kasir
                </span>
              </div>
            </div>
          ) : (
            <div className="py-5 text-center text-zinc-500 text-xs">
              Belum ada kasir yang membuka shift untuk sesi kerja hari ini. Kas laci dalam kondisi aman/tutup.
            </div>
          )}
        </div>
      )}

      {/* SLA & Alert Cucian Menginap */}
      {(lateSlaOrders.length > 0 || overduePickupOrders.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {lateSlaOrders.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-rose-950">
                  {lateSlaOrders.length} Pesanan Melewati Batas SLA
                </h4>
                <p className="text-xs text-rose-800 mt-0.5">
                  Harap instruksikan staf cuci untuk memprioritaskan penyelesaian agar tidak terjadi komplain pelanggan.
                </p>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="mt-2 text-xs font-bold text-rose-900 underline cursor-pointer"
                >
                  Lihat Pesanan Telat SLA →
                </button>
              </div>
            </div>
          )}

          {overduePickupOrders.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-amber-950">
                  {overduePickupOrders.length} Cucian Menginap {">"} 3 Hari
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Cucian sudah siap diambil di rak tetapi belum diambil pelanggan. Hubungi pelanggan via WhatsApp.
                </p>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="mt-2 text-xs font-bold text-amber-900 underline cursor-pointer"
                >
                  Lihat Cucian Menginap →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 2-Column Section: Ready for Pickup & Store Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Siap Diambil (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3.5">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm">Cucian Siap Diambil</h3>
              <p className="text-xs text-zinc-400">Hubungi pelanggan atau konfirmasi serah terima</p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs text-blue-700 hover:text-blue-900 font-medium flex items-center gap-1 transition cursor-pointer"
            >
              Lihat Semua <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {readyOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
              Tidak ada cucian yang sedang menunggu pengambilan saat ini
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyOrders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-zinc-50/80 border border-zinc-200/80 gap-3 hover:border-zinc-300 transition"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900 text-xs">
                        {order.customer?.name || "Pelanggan Umum"}
                      </span>
                      <span className="font-mono text-zinc-500 text-xs">
                        {order.invoiceNo}
                      </span>
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1 ml-3.5">
                      {order.serviceType} ({order.weightOrQty} {order.unit})
                      {" · "}
                      <span className="font-bold text-zinc-900 font-mono">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={sendingWaId === order.id}
                      onClick={async (e) => {
                        if (waData?.status === "connected" && onSendDirectWa && !e.shiftKey) {
                          setSendingWaId(order.id);
                          try {
                            await onSendDirectWa(order);
                          } finally {
                            setSendingWaId(null);
                          }
                        } else {
                          window.open(getWaLink(order), "_blank");
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs flex items-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                      title={
                        waData?.status === "connected"
                          ? "Kirim Langsung Notifikasi via WhatsApp Toko"
                          : "Buka WhatsApp Web"
                      }
                    >
                      {sendingWaId === order.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                      )}
                      <span>WA</span>
                    </button>
                    <button
                      onClick={() => handleCompleteOrder(order)}
                      className="px-2.5 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-700 font-medium text-xs flex items-center gap-1.5 transition border border-zinc-200 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Selesai
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Financial & Store Snapshot (1 col) */}
        <div className="bg-white rounded-2xl border border-zinc-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-zinc-900 text-sm mb-3">Ringkasan Keuangan</h3>

            <div className="space-y-2 text-xs">
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
                <span className="text-zinc-500">Pengeluaran Toko</span>
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

            {/* Gateway Status */}
            <div className="mt-4 p-3 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                <span className="text-xs font-medium text-zinc-700">WhatsApp Gateway</span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                waData?.status === "connected"
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-zinc-200 text-zinc-600"
              }`}>
                {waData?.status === "connected" ? "Terhubung" : "Mode Manual / Putus"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 flex items-center gap-2">
            <button
              onClick={() => setActiveTab("cashflow")}
              className="flex-1 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs"
            >
              <span>Buku Kas</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTab("services")}
              className="p-2 rounded-xl border border-zinc-200 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer"
              title="Kelola Tarif Layanan"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
