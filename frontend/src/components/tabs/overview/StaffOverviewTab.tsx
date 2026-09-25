import React, { useState } from "react";
import {
  Sparkles,
  ShoppingBag,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Waves,
  Shirt,
  Store,
  Calculator,
  Lock,
  RefreshCw,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { Order, TabType, Tenant, User, CashierShift } from "../../../types";
import { useConfirm } from "../../common/ConfirmContext";
import { formatCurrency } from "../../../utils/formatUtils";

interface StaffOverviewTabProps {
  orders: Order[];
  tenant?: Tenant;
  currentUser?: User | null;
  currentShift?: CashierShift | null;
  enableCashierShift?: boolean;
  onOpenShiftModal?: () => void;
  onCloseShiftModal?: () => void;
  onOpenOrderModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  getWaLink: (order: Order) => string;
  setActiveTab: (tab: TabType) => void;
  onSendDirectWa?: (order: Order) => Promise<{ success: boolean; error?: string }>;
  isWaConnected?: boolean;
}

export const StaffOverviewTab: React.FC<StaffOverviewTabProps> = ({
  orders,
  tenant,
  currentUser,
  currentShift,
  enableCashierShift = true,
  onOpenShiftModal,
  onCloseShiftModal,
  onOpenOrderModal,
  onUpdateStatus,
  getWaLink,
  setActiveTab,
  onSendDirectWa,
  isWaConnected = false,
}) => {
  const confirm = useConfirm();
  const [sendingWaId, setSendingWaId] = useState<string | null>(null);

  // Filter cucian berdasarkan tahapan pengerjaan operasional
  const pendingOrders = orders.filter(
    (o) => o.status === "pending" || o.status === "washing"
  );
  const finishingOrders = orders.filter((o) => o.status === "drying_ironing");
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

  const handleCompleteOrder = async (order: Order) => {
    const confirmed = await confirm({
      title: "Serahkan Cucian ke Pelanggan?",
      description: (
        <span>
          Tandai nota <strong>{order.invoiceNo}</strong> milik{" "}
          <strong>{order.customer?.name || "Pelanggan"}</strong> sebagai sudah diambil dan selesai?
        </span>
      ),
      confirmText: "Ya, Sudah Diambil",
      cancelText: "Batal",
      variant: "info",
    });

    if (confirmed) {
      onUpdateStatus(order.id, "completed");
    }
  };

  const isShiftActive = Boolean(currentShift && currentShift.status === "open");

  const todayFormatted = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date());

  return (
    <div className="space-y-5">
      {/* Header Meja Kerja Kasir & Staff */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Meja Kerja Kasir & Operasional
            </h1>
            {enableCashierShift !== false && (
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
                Shift Staff
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Selamat bertugas, <span className="font-semibold text-zinc-800">{currentUser?.name || "Staff"}</span> 👋 · {tenant?.outletName || "Cabang Toko"} · {todayFormatted}
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
            onClick={() => setActiveTab("orders")}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tabel Kasir</span>
          </button>
        </div>
      </div>

      {/* Widget Status Shift Kasir (Paling Menonjol jika fitur aktif) */}
      {enableCashierShift !== false && (
        !isShiftActive ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-50/70 to-amber-50/30 border-2 border-amber-300 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-amber-950 text-sm sm:text-base">
                    Shift Kasir Belum Dibuka
                  </h3>
                  <span className="text-[10px] font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                    Perlu Aksi
                  </span>
                </div>
                <p className="text-xs text-amber-900/80 mt-1 max-w-xl leading-relaxed">
                  Anda belum memasukkan modal awal kas laci untuk sesi kerja saat ini. Harap buka shift kasir terlebih dahulu agar pencatatan uang tunai dan rekonsiliasi kas laci akurat.
                </p>
              </div>
            </div>

            <button
              onClick={onOpenShiftModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-sm transition cursor-pointer whitespace-nowrap self-start sm:self-center"
            >
              <Calculator className="w-4 h-4" />
              <span>Buka Shift Kasir Sekarang</span>
            </button>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/40 to-sky-50/30 border border-emerald-300 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-emerald-950 text-sm sm:text-base">
                    Shift Kasir Aktif
                  </h3>
                  <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-md">
                    Berjalan
                  </span>
                  <span className="text-xs text-zinc-500 font-medium">
                    Mulai: {new Date(currentShift!.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 mt-3 text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Modal Awal Laci:</span>
                    <span className="font-bold text-zinc-900 text-sm font-mono">
                      {formatCurrency(currentShift!.startingCash)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Tunai Masuk Shift:</span>
                    <span className="font-bold text-emerald-700 text-sm font-mono">
                      {formatCurrency(currentShift!.systemCashTotal)}
                    </span>
                  </div>
                  <div>
                    <span className="text-zinc-500 block text-[11px]">Estimasi Uang di Laci:</span>
                    <span className="font-bold text-blue-900 text-sm font-mono">
                      {formatCurrency(currentShift!.startingCash + currentShift!.systemCashTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={onCloseShiftModal}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer whitespace-nowrap self-start lg:self-center"
            >
              <Lock className="w-3.5 h-3.5 text-zinc-400" />
              <span>Tutup Shift & Hitung Uang Laci</span>
            </button>
          </div>
        )
      )}

      {/* 4 KPI Alur Pengerjaan Cucian Operasional */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Antrean Cuci */}
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Perlu Dicuci
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Waves className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {pendingOrders.length} <span className="text-xs font-semibold text-blue-700">Nota</span>
          </div>
          <p className="text-[11px] text-blue-700 font-medium mt-1">
            Menunggu / sedang dicuci
          </p>
        </div>

        {/* Pengeringan & Setrika */}
        <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
              Kering & Setrika
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Shirt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {finishingOrders.length} <span className="text-xs font-semibold text-amber-700">Nota</span>
          </div>
          <p className="text-[11px] text-amber-700 font-medium mt-1">
            Tahap finishing cucian
          </p>
        </div>

        {/* Siap Diambil */}
        <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Siap Diambil
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {readyOrders.length} <span className="text-xs font-semibold text-emerald-700">Nota</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1">
            Selesai di rak penyimpanan
          </p>
        </div>

        {/* Perhatian SLA */}
        <div className={`rounded-2xl border p-4 sm:p-5 shadow-sm ${
          lateSlaOrders.length > 0
            ? "border-rose-300 bg-gradient-to-br from-rose-50 via-red-50/40 to-white"
            : "border-zinc-200 bg-white"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${
              lateSlaOrders.length > 0 ? "text-rose-800" : "text-zinc-600"
            }`}>
              Prioritas SLA
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-xs ${
              lateSlaOrders.length > 0 ? "bg-rose-500 text-white" : "bg-zinc-100 text-zinc-500"
            }`}>
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            {lateSlaOrders.length} <span className={`text-xs font-semibold ${
              lateSlaOrders.length > 0 ? "text-rose-700" : "text-zinc-500"
            }`}>Nota</span>
          </div>
          <p className={`text-[11px] font-medium mt-1 ${
            lateSlaOrders.length > 0 ? "text-rose-700" : "text-zinc-400"
          }`}>
            {lateSlaOrders.length > 0 ? "Lewat batas target jam selesai!" : "Semua pengerjaan tepat waktu"}
          </p>
        </div>
      </div>

      {/* Daftar Cucian Siap Diambil & Penataan Rak */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-transparent flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-zinc-900 text-sm">
              Cucian Siap Diambil Pelanggan
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Cocokkan nomor nota invoice dan serahkan bungkusan cucian saat pelanggan datang
            </p>
          </div>
          <button
            onClick={() => setActiveTab("orders")}
            className="text-xs font-medium text-emerald-800 hover:text-emerald-900 inline-flex items-center gap-1 transition cursor-pointer"
          >
            <span>Buka Kasir Lengkap</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="p-4">
          {readyOrders.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-zinc-200 rounded-xl text-zinc-400 text-xs">
              Tidak ada cucian yang sedang menunggu pengambilan saat ini.
            </div>
          ) : (
            <div className="space-y-2.5">
              {readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/20 transition gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-zinc-900 text-xs sm:text-sm">
                        {order.customer?.name || "Pelanggan Umum"}
                      </span>
                      <span className="font-mono text-xs font-semibold text-zinc-500">
                        {order.invoiceNo}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          order.paymentStatus === "paid"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {order.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-500 mt-1">
                      {order.serviceType} ({order.weightOrQty} {order.unit}) · Total:{" "}
                      <span className="font-bold text-zinc-900 font-mono">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                      {order.customer?.phone && (
                        <span> · Telp: {order.customer.phone}</span>
                      )}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <button
                      type="button"
                      disabled={sendingWaId === order.id}
                      onClick={async (e) => {
                        if (isWaConnected && onSendDirectWa && !e.shiftKey) {
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
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition shadow-2xs cursor-pointer disabled:opacity-50"
                      title={
                        isWaConnected
                          ? "Kirim Langsung Notifikasi via WhatsApp Toko (Owner)"
                          : "Buka WhatsApp Web"
                      }
                    >
                      {sendingWaId === order.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                      )}
                      <span>Kirim WA</span>
                    </button>
                    <button
                      onClick={() => handleCompleteOrder(order)}
                      className="px-3 py-1.5 rounded-lg bg-white hover:bg-zinc-100 text-zinc-800 font-semibold text-xs flex items-center gap-1.5 transition border border-zinc-200 cursor-pointer shadow-2xs"
                      title="Serahkan ke Pelanggan"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Selesai / Diambil</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
