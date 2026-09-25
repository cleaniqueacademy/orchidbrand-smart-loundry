import React, { useState } from "react";
import {
  Plus,
  Phone,
  Edit3,
  Trash2,
  XCircle,
  Store,
  CheckCircle,
  Lock,
  Clock,
  CheckCircle2,
  ShoppingBag,
  History,
  RefreshCw,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Order, OrderStatus, DateFilterPreset, Role, Tenant } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";
import { EmptyStateWalkthrough } from "../common/EmptyStateWalkthrough";

interface OrdersTabProps {
  orders: Order[];
  tenants?: Tenant[];
  currentUserRole?: Role;
  onOpenOrderModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdatePayment: (orderId: string, paymentStatus: string, paymentMethod?: string) => void;
  getWaLink: (order: Order) => string;
  onOpenReceiptModal: (order: Order) => void;
  onOpenEditOrderModal: (order: Order) => void;
  onCancelOrder: (order: Order) => void;
  onDeleteOrder: (orderId: string) => void;
  onOpenWaLogsModal?: (order: Order) => void;
  onSendDirectWa?: (order: Order) => Promise<{ success: boolean; error?: string }>;
  isWaConnected?: boolean;
}

const statusBadgeStyles: Record<string, string> = {
  process: "bg-amber-50 text-amber-800 border-amber-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-blue-900 text-white border-blue-900",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  washing: "bg-amber-50 text-amber-800 border-amber-200",
  drying_ironing: "bg-amber-50 text-amber-800 border-amber-200",
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  tenants = [],
  currentUserRole = "staff",
  onOpenOrderModal,
  onUpdateStatus,
  onUpdatePayment,
  getWaLink,
  onOpenReceiptModal,
  onOpenEditOrderModal,
  onCancelOrder,
  onDeleteOrder,
  onOpenWaLogsModal,
  onSendDirectWa,
  isWaConnected = false,
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  const [sendingWaId, setSendingWaId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [quickPayOrder, setQuickPayOrder] = useState<Order | null>(null);

  const isOrderOverdue = (order: Order) =>
    order.status === "ready" &&
    Date.now() - new Date(order.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000;

  const isSlaLate = (order: Order) =>
    Boolean(
      order.estimatedCompletionAt &&
        new Date(order.estimatedCompletionAt).getTime() < Date.now() &&
        order.status !== "ready" &&
        order.status !== "completed" &&
        order.status !== "cancelled"
    );

  // Filtering data
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name &&
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer?.phone && order.customer.phone.includes(searchQuery)) ||
      order.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "late_sla"
        ? isSlaLate(order)
        : statusFilter === "overdue"
        ? isOrderOverdue(order)
        : statusFilter === "process"
        ? ["process", "pending", "washing", "drying_ironing"].includes(order.status)
        : order.status === statusFilter;

    const matchPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;
    const matchDate = filterByDatePreset(order.createdAt, datePreset);
    const matchTenant = tenantFilter === "all" || order.tenantId === tenantFilter;

    return matchSearch && matchStatus && matchPayment && matchDate && matchTenant;
  });

  // Table column definitions (max 2 kata per header)
  const columns: ColumnDef<Order>[] = [
    {
      id: "invoice",
      header: "No. Nota",
      cell: (order) => {
        const late = isSlaLate(order);
        return (
          <div className="whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-zinc-900 text-xs">{order.invoiceNo}</span>
              {late && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                  Telat SLA
                </span>
              )}
            </div>
            <div className="text-[10px] text-zinc-400 mt-0.5">
              {new Date(order.createdAt).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {order.estimatedCompletionAt && (
              <div
                className={`text-[9.5px] mt-0.5 flex items-center gap-1 font-medium ${
                  late ? "text-rose-600 font-semibold" : "text-zinc-500"
                }`}
                title="Target Selesai Layanan"
              >
                <Clock className="w-2.5 h-2.5 shrink-0" />
                <span>
                  SLA: {new Date(order.estimatedCompletionAt).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            )}
            {order.waSent && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenWaLogsModal && onOpenWaLogsModal(order);
                }}
                className="inline-flex items-center gap-1 font-semibold text-[9.5px] text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded mt-1 cursor-pointer hover:bg-emerald-100 transition shadow-2xs"
                title="Notifikasi WA terkirim. Klik untuk lihat riwayat pengiriman"
              >
                <WhatsAppIcon className="w-2.5 h-2.5 text-emerald-600" />
                <span>WA Terkirim</span>
              </button>
            )}
          </div>
        );
      },
    },
    ...(isSuperAdmin
      ? [
          {
            id: "outlet",
            header: "Cabang",
            cell: (order: Order) => {
              const outlet = tenants.find((t) => t.id === order.tenantId);
              return (
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md whitespace-nowrap">
                  <Store className="w-3 h-3 text-blue-700 shrink-0" />
                  <span>
                    {outlet?.outletName || "Cabang Melati"}
                  </span>
                </span>
              );
            },
          },
        ]
      : []),
    {
      id: "customer",
      header: "Pelanggan",
      cell: (order) => (
        <div>
          <div className="font-semibold text-zinc-900 text-xs whitespace-nowrap">
            {order.customer?.name || "Pelanggan Umum"}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5 whitespace-nowrap">
            <Phone className="w-2.5 h-2.5 text-zinc-400" />
            <span className="font-mono">{order.customer?.phone || "-"}</span>
          </div>
        </div>
      ),
    },
    {
      id: "service",
      header: "Layanan",
      cell: (order) => (
        <div>
          <div className="text-zinc-800 text-xs font-medium truncate max-w-[200px]" title={order.serviceType}>
            {order.serviceType}
          </div>
          <div className="text-[10px] text-zinc-400 mt-0.5 whitespace-nowrap">
            {order.items && order.items.length > 1
              ? `${order.items.length} item • Total ${order.weightOrQty} ${order.unit}`
              : `${order.weightOrQty} ${order.unit} @ Rp ${order.pricePerUnit.toLocaleString("id-ID")}`}
          </div>
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      cell: (order) => (
        <span className="font-bold text-zinc-900 text-xs whitespace-nowrap">
          Rp {order.totalAmount.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Pembayaran",
      className: "whitespace-nowrap min-w-[110px]",
      cell: (order) =>
        isSuperAdmin || order.status === "completed" ? (
          <span
            className={`inline-flex items-center justify-center text-[10px] font-semibold px-2.5 py-1 rounded-full select-none whitespace-nowrap ${
              order.paymentStatus === "paid" || order.status === "completed"
                ? "text-emerald-700 bg-emerald-50 border border-emerald-200"
                : "text-amber-700 bg-amber-50 border border-amber-200"
            }`}
          >
            {order.paymentStatus === "paid" || order.status === "completed" ? "Lunas" : "Belum Lunas"}
          </span>
        ) : order.paymentStatus === "paid" ? (
          <button
            type="button"
            onClick={() => setQuickPayOrder(order)}
            className="inline-flex items-center justify-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full transition cursor-pointer whitespace-nowrap"
            title="Ubah status bayar"
          >
            Lunas ▾
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setQuickPayOrder(order)}
            className="inline-flex items-center justify-center text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2.5 py-1 rounded-full transition cursor-pointer whitespace-nowrap"
            title="Ubah status bayar"
          >
            Belum Lunas
          </button>
        ),
    },
    {
      id: "status",
      header: "Status",
      className: "whitespace-nowrap min-w-[125px]",
      cell: (order) => {
        if (isSuperAdmin) {
          const statusLabels: Record<string, string> = {
            process: "Diproses",
            ready: "Siap Diambil",
            completed: "Selesai",
            cancelled: "Dibatalkan",
            pending: "Diproses",
            washing: "Diproses",
            drying_ironing: "Diproses",
          };
          return (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span
                className={`inline-flex items-center justify-center text-[11px] font-semibold px-2.5 py-1 rounded-lg border select-none whitespace-nowrap shrink-0 ${
                  statusBadgeStyles[order.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                {statusLabels[order.status] || order.status}
              </span>
              {isOrderOverdue(order) && (
                <span
                  className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap shrink-0"
                  title="Cucian belum diambil"
                >
                  Menginap {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000)}h
                </span>
              )}
            </div>
          );
        }

        return (
          <div className="flex items-center gap-1.5 whitespace-nowrap min-w-[115px]">
            {order.status === "completed" ? (
              <div
                className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 select-none whitespace-nowrap shrink-0"
                title="Pesanan Selesai (Terkunci)"
              >
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Selesai</span>
                <Lock className="w-3 h-3 text-emerald-700 ml-0.5 opacity-60 shrink-0" />
              </div>
            ) : (
              <select
                value={
                  ["pending", "washing", "drying_ironing"].includes(order.status)
                    ? "process"
                    : order.status
                }
                onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border cursor-pointer outline-none transition whitespace-nowrap shrink-0 ${
                  statusBadgeStyles[order.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
                }`}
              >
                <option value="process">Diproses</option>
                <option value="ready">Siap Diambil</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan</option>
              </select>
            )}
            {isOrderOverdue(order) && (
              <span
                className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md flex items-center gap-1 whitespace-nowrap shrink-0"
                title="Cucian belum diambil"
              >
                Menginap {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000)}h
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (order) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Edit Data Pesanan (Khusus Operasional Kasir) */}
          {!isSuperAdmin && (
            order.status === "completed" ? (
              <button
                type="button"
                disabled
                className="p-1.5 rounded-lg text-zinc-300 bg-zinc-50 border border-zinc-200 cursor-not-allowed"
                title="Pesanan Selesai (Terkunci)"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenEditOrderModal(order)}
                className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-700 hover:bg-amber-50 border border-zinc-200 transition cursor-pointer"
                title="Edit Pesanan"
              >
                <Edit3 className="w-3.5 h-3.5" />
              </button>
            )
          )}

          {/* WhatsApp Notification: Siap Diambil / Konfirmasi Pesanan */}
          {order.status !== "completed" && order.status !== "cancelled" && (
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
              className={`p-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition cursor-pointer disabled:opacity-50 ${
                order.status === "ready"
                  ? isOrderOverdue(order)
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                  : "bg-sky-600 hover:bg-sky-700 text-white shadow-xs"
              }`}
              title={
                isWaConnected
                  ? order.status === "ready"
                    ? "Kirim Langsung Notifikasi Siap Diambil via WhatsApp Toko (Owner)"
                    : "Kirim Langsung Konfirmasi Nota via WhatsApp Toko (Owner)"
                  : order.status === "ready"
                    ? "Buka WhatsApp Web (Kirim Notifikasi Siap Diambil)"
                    : "Buka WhatsApp Web (Kirim Konfirmasi Nota)"
              }
            >
              {sendingWaId === order.id ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <WhatsAppIcon className="w-3.5 h-3.5" />
              )}
            </button>
          )}

          {/* WhatsApp Logs Audit Button */}
          {onOpenWaLogsModal && (order.waSent || (order.waLogsCount && order.waLogsCount > 0)) && (
            <button
              type="button"
              onClick={() => onOpenWaLogsModal(order)}
              className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition cursor-pointer"
              title="Riwayat Log WhatsApp"
            >
              <History className="w-3.5 h-3.5 text-emerald-700" />
            </button>
          )}

          {/* Batalkan atau Hapus Pesanan (Khusus Operasional Kasir - Hapus dilarang untuk Staff) */}
          {!isSuperAdmin && (
            order.status === "completed" ? null : order.status !== "cancelled" ? (
              <button
                type="button"
                onClick={() => onCancelOrder(order)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 transition cursor-pointer"
                title="Batalkan Pesanan"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            ) : (
              currentUserRole !== "staff" && (
                <button
                  type="button"
                  onClick={() => onDeleteOrder(order.id)}
                  className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
                  title="Hapus Pesanan (Khusus Owner)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )
            )
          )}
        </div>
      ),
    },
  ];

  // Metrik Ringkasan Khusus Super Admin
  const totalOrdersCount = orders.length;
  const inProgressCount = orders.filter(
    (o) =>
      o.status === "process" ||
      o.status === "pending" ||
      o.status === "washing" ||
      o.status === "drying_ironing"
  ).length;
  const readyCount = orders.filter((o) => o.status === "ready").length;
  const completedCount = orders.filter((o) => o.status === "completed").length;

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isSuperAdmin ? (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Data Pesanan</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Rekapitulasi pesanan seluruh cabang.</p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Pesanan</h2>
            <p className="text-xs text-zinc-500">Daftar pesanan aktif dan riwayat kasir.</p>
          </div>
        )}

        {!isSuperAdmin && (
          <button
            id="tour-new-order-btn"
            onClick={onOpenOrderModal}
            className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Order Baru
          </button>
        )}
      </div>

      {/* 4 Metric Cards Ringkasan Jaringan untuk Super Admin */}
      {isSuperAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Total Pesanan - Hero Spotlight Light Blue */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                Total Pesanan
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {totalOrdersCount}
            </div>
            <p className="text-[11px] text-sky-700 font-medium mt-1">Seluruh pesanan jaringan</p>
          </div>

          {/* Dalam Proses - Sunset Amber */}
          <div className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Dalam Proses
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {inProgressCount}
            </div>
            <p className="text-[11px] text-amber-700/90 font-medium mt-1">Sedang diproses laundry</p>
          </div>

          {/* Siap Diambil - Teal */}
          <div className="rounded-2xl border border-teal-200/90 bg-gradient-to-br from-teal-50/90 via-cyan-50/40 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-teal-800">
                Siap Diambil
              </span>
              <div className="w-8 h-8 rounded-xl bg-teal-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {readyCount}
            </div>
            <p className="text-[11px] text-teal-700/90 font-medium mt-1">Menunggu penyerahan</p>
          </div>

          {/* Pesanan Selesai - Mint Emerald */}
          <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Pesanan Selesai
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {completedCount}
            </div>
            <p className="text-[11px] text-emerald-700/90 font-medium mt-1">Tuntas & terverifikasi</p>
          </div>
        </div>
      )}

      {/* Reusable Data Table */}
      <ShadcnDataTable
        data={filteredOrders}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari pesanan..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFilters={
          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && tenants.length > 0 && (
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Cabang</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.outletName}
                  </option>
                ))}
              </select>
            )}

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
            >
              <option value="all">Semua Status</option>
              <option value="late_sla">Telat SLA ⚠️</option>
              <option value="overdue">Menginap</option>
              <option value="process">Diproses</option>
              <option value="ready">Siap Diambil</option>
              <option value="completed">Selesai</option>
              <option value="cancelled">Dibatalkan</option>
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
            >
              <option value="all">Semua Pembayaran</option>
              <option value="unpaid">Belum Lunas</option>
              <option value="paid">Lunas</option>
            </select>
          </div>
        }
        emptyMessage="Tidak ada pesanan yang sesuai."
        emptyContent={
          <EmptyStateWalkthrough
            title="Belum Ada Pesanan Laundry Aktif 🧺"
            description="Pelanggan baru datang? Catat cucian kiloan atau satuan dengan cepat, pilih layanan, dan langsung cetak nota struk thermal."
            actionLabel={!isSuperAdmin ? "+ Buat Order Baru Pertama" : undefined}
            onAction={!isSuperAdmin ? onOpenOrderModal : undefined}
            tips={[
              "Bisa langsung timbang kiloan atau input item satuan (bedcover, sepatu).",
              "Nota otomatis terkirim ke WhatsApp pelanggan jika nomor WA diisi.",
              "Pastikan kasir sudah melakukan Buka Shift di pojok kanan atas.",
            ]}
          />
        }
        initialPageSize={10}
      />

      {/* Modal Pelunasan Cepat Kasir */}
      {quickPayOrder && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 animate-in fade-in duration-100">
          <div className="bg-white rounded-2xl max-w-sm w-full p-4 sm:p-5 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-3">
              <div>
                <h4 className="font-extrabold text-sm text-slate-950">Pelunasan Tagihan</h4>
                <p className="text-[11px] font-mono text-slate-500 font-semibold">{quickPayOrder.invoiceNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setQuickPayOrder(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl mb-3 border border-slate-100 flex justify-between items-center text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Pelanggan:</span>
                <span className="font-bold text-slate-900">{quickPayOrder.customer?.name || "Pelanggan Umum"}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 text-[11px] block">Total:</span>
                <span className="font-black text-slate-950 text-sm font-mono">
                  Rp {quickPayOrder.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {quickPayOrder.paymentStatus !== "paid" ? (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-700 block">Metode Pembayaran:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePayment(quickPayOrder.id, "paid", "cash");
                      setQuickPayOrder(null);
                    }}
                    className="py-2 px-1 text-center bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Tunai
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePayment(quickPayOrder.id, "paid", "qris");
                      setQuickPayOrder(null);
                    }}
                    className="py-2 px-1 text-center bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    QRIS
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdatePayment(quickPayOrder.id, "paid", "transfer");
                      setQuickPayOrder(null);
                    }}
                    className="py-2 px-1 text-center bg-blue-50 hover:bg-blue-100 border border-blue-300 text-blue-800 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Transfer
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <p className="text-xs text-slate-600">Pesanan ini sudah tercatat <b>Lunas</b>.</p>
                <button
                  type="button"
                  onClick={() => {
                    onUpdatePayment(quickPayOrder.id, "unpaid");
                    setQuickPayOrder(null);
                  }}
                  className="w-full py-2 bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 rounded-xl font-bold text-xs transition cursor-pointer"
                >
                  Ubah Belum Lunas
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
