import React, { useState } from "react";
import { Plus, Phone } from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Order, OrderStatus, DateFilterPreset } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";

interface OrdersTabProps {
  orders: Order[];
  onOpenOrderModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdatePayment: (orderId: string, paymentStatus: string, paymentMethod?: string) => void;
  getWaLink: (order: Order) => string;
}

const statusBadgeStyles: Record<OrderStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-200",
  washing: "bg-sky-50 text-sky-800 border-sky-200",
  drying_ironing: "bg-blue-50 text-blue-800 border-blue-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-blue-900 text-white border-blue-900",
};

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onOpenOrderModal,
  onUpdateStatus,
  onUpdatePayment,
  getWaLink,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  // Filtering data
  const filteredOrders = orders.filter((order) => {
    // 1. Search filter
    const matchSearch =
      order.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name &&
        order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer?.phone && order.customer.phone.includes(searchQuery)) ||
      order.serviceType.toLowerCase().includes(searchQuery.toLowerCase());

    // 2. Status filter
    const matchStatus = statusFilter === "all" || order.status === statusFilter;

    // 3. Payment filter
    const matchPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;

    // 4. Date preset filter
    const matchDate = filterByDatePreset(order.createdAt, datePreset);

    return matchSearch && matchStatus && matchPayment && matchDate;
  });

  // Table column definitions
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
        </div>
      ),
    },
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
        <span className="font-bold text-zinc-900 text-xs">
          Rp {order.totalAmount.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      id: "payment",
      header: "Status Bayar",
      cell: (order) =>
        order.paymentStatus === "paid" ? (
          <span className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
            Lunas ({order.paymentMethod || "cash"})
          </span>
        ) : (
          <button
            onClick={() => onUpdatePayment(order.id, "paid", "cash")}
            className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full transition"
            title="Klik untuk tandai Lunas"
          >
            Belum Lunas ✎
          </button>
        ),
    },
    {
      id: "status",
      header: "Status Cucian",
      cell: (order) => (
        <select
          value={order.status}
          onChange={(e) => onUpdateStatus(order.id, e.target.value)}
          className={`text-[11px] font-semibold px-2 py-1 rounded-lg border cursor-pointer outline-none transition ${
            statusBadgeStyles[order.status] || "bg-zinc-100 text-zinc-700 border-zinc-200"
          }`}
        >
          <option value="pending">Antrian</option>
          <option value="washing">Sedang Dicuci</option>
          <option value="drying_ironing">Setrika / Lipat</option>
          <option value="ready">Siap Diambil</option>
          <option value="completed">Selesai</option>
        </select>
      ),
    },
    {
      id: "actions",
      header: "WhatsApp",
      align: "right",
      cell: (order) => (
        <a
          href={getWaLink(order)}
          target="_blank"
          rel="noreferrer"
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1.5 transition ${
            order.status === "ready"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              : "bg-white hover:bg-zinc-100 text-zinc-700 border border-zinc-200"
          }`}
          title="Kirim Notifikasi WhatsApp"
        >
          <WhatsAppIcon className="w-3.5 h-3.5" />
          <span>WA</span>
        </a>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Pesanan Laundry</h2>
          <p className="text-xs text-zinc-500">
            Daftar pesanan aktif, histori transaksi, dan pengiriman notifikasi WhatsApp
          </p>
        </div>

        <button
          onClick={onOpenOrderModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Order Baru
        </button>
      </div>

      {/* Reusable Data Table with Search, Date Presets, Column Toggle & Pagination */}
      <ShadcnDataTable
        data={filteredOrders}
        columns={columns}
        keyExtractor={(item) => item.id}
        searchPlaceholder="Cari no. nota, pelanggan, no HP..."
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        customFilters={
          <div className="flex items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
            >
              <option value="all">Semua Status</option>
              <option value="pending">Antrian</option>
              <option value="washing">Sedang Dicuci</option>
              <option value="drying_ironing">Setrika / Lipat</option>
              <option value="ready">Siap Diambil</option>
              <option value="completed">Selesai</option>
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
        emptyMessage="Tidak ada pesanan yang sesuai dengan kriteria pencarian dan filter."
        initialPageSize={10}
      />
    </div>
  );
};
