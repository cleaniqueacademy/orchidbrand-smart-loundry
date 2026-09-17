import React, { useState } from "react";
import { Plus, Phone, Printer, Edit3, Trash2, XCircle, Store } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Order, OrderStatus, DateFilterPreset, Role, Tenant } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";

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
}

const statusBadgeStyles: Record<OrderStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-200",
  washing: "bg-sky-50 text-sky-800 border-sky-200",
  drying_ironing: "bg-blue-50 text-blue-800 border-blue-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-blue-900 text-white border-blue-900",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
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
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");
  const [quickPayOrder, setQuickPayOrder] = useState<Order | null>(null);

  const isOrderOverdue = (order: Order) =>
    order.status === "ready" &&
    Date.now() - new Date(order.createdAt).getTime() > 3 * 24 * 60 * 60 * 1000;

  // Filtering data
  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name &&
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer?.phone && order.customer.phone.includes(searchQuery)) ||
      (order.rackNumber && order.rackNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      order.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

    const matchStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "overdue"
        ? isOrderOverdue(order)
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
      cell: (order) => (
        <div>
          <div className="font-mono font-bold text-zinc-900 text-xs">{order.invoiceNo}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {new Date(order.createdAt).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
          {order.rackNumber && (
            <div className="inline-flex items-center gap-1 font-mono font-bold text-[9.5px] text-blue-900 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded mt-1">
              <span>📍 {order.rackNumber}</span>
            </div>
          )}
        </div>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            id: "outlet",
            header: "Cabang",
            cell: (order: Order) => {
              const outlet = tenants.find((t) => t.id === order.tenantId);
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  <Store className="w-3 h-3 text-blue-700 shrink-0" />
                  <span className="truncate max-w-[120px]">
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
          <div className="font-semibold text-zinc-900 text-xs">
            {order.customer?.name || "Pelanggan Umum"}
          </div>
          <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">
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
          <div className="text-zinc-800 text-xs font-medium">{order.serviceType}</div>
          <div className="text-[10px] text-zinc-400 mt-0.5">
            {order.weightOrQty} {order.unit} @ Rp {order.pricePerUnit.toLocaleString("id-ID")}
          </div>
        </div>
      ),
    },
    {
      id: "total",
      header: "Total",
      cell: (order) => (
        <span className="font-bold text-zinc-900 text-xs font-mono">
          Rp {order.totalAmount.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Pembayaran",
      cell: (order) =>
        order.paymentStatus === "paid" ? (
          <button
            type="button"
            onClick={() => setQuickPayOrder(order)}
            className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full transition cursor-pointer"
            title="Ubah status bayar"
          >
            Lunas ▾
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setQuickPayOrder(order)}
            className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition cursor-pointer"
            title="Ubah status bayar"
          >
            Belum Lunas
          </button>
        ),
    },
    {
      id: "status",
      header: "Status",
      cell: (order) => (
        <div>
          <select
            value={order.status}
            onChange={(e) => onUpdateStatus(order.id, e.target.value)}
            className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer outline-none transition w-full ${
              statusBadgeStyles[order.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
            }`}
          >
            <option value="pending">Antrian</option>
            <option value="washing">Sedang Dicuci</option>
            <option value="drying_ironing">Setrika / Lipat</option>
            <option value="ready">Siap Diambil</option>
            <option value="completed">Selesai</option>
            <option value="cancelled">Dibatalkan</option>
          </select>
          {isOrderOverdue(order) && (
            <div
              className="text-[9.5px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md mt-1 flex items-center gap-1"
              title="Cucian belum diambil"
            >
              <span>Menginap {Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 86400000)}h</span>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (order) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Cetak Struk */}
          <button
            type="button"
            onClick={() => onOpenReceiptModal(order)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-blue-700 hover:bg-blue-50 border border-zinc-200 transition cursor-pointer"
            title="Cetak Struk"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          {/* Edit Data Pesanan */}
          <button
            type="button"
            onClick={() => onOpenEditOrderModal(order)}
            className="p-1.5 rounded-lg text-zinc-600 hover:text-amber-700 hover:bg-amber-50 border border-zinc-200 transition cursor-pointer"
            title="Edit Pesanan"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>

          {/* WhatsApp Notification */}
          <a
            href={getWaLink(order)}
            target="_blank"
            rel="noreferrer"
            className={`p-1.5 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition ${
              isOrderOverdue(order)
                ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                : order.status === "ready"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                : "bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
            }`}
            title="Kirim WhatsApp"
          >
            <WhatsAppIcon className="w-3.5 h-3.5" />
          </a>

          {/* Batalkan atau Hapus Pesanan */}
          {order.status !== "cancelled" ? (
            <button
              type="button"
              onClick={() => onCancelOrder(order)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 border border-zinc-200 transition cursor-pointer"
              title="Batalkan Pesanan"
            >
              <XCircle className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onDeleteOrder(order.id)}
              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 transition cursor-pointer"
              title="Hapus Pesanan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

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
            onClick={onOpenOrderModal}
            className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Order Baru
          </button>
        )}
      </div>

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
              <option value="overdue">Menginap</option>
              <option value="pending">Antrian</option>
              <option value="washing">Sedang Dicuci</option>
              <option value="drying_ironing">Setrika / Lipat</option>
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
