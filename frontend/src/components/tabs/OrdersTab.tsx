import React, { useState } from "react";
import { Plus, Phone, MessageCircle, Search, Filter } from "lucide-react";
import { Order, OrderStatus } from "../../types";

interface OrdersTabProps {
  orders: Order[];
  onOpenOrderModal: () => void;
  onUpdateStatus: (orderId: string, status: string) => void;
  onUpdatePayment: (orderId: string, paymentStatus: string, paymentMethod?: string) => void;
  getWaLink: (order: Order) => string;
}

export const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  onOpenOrderModal,
  onUpdateStatus,
  onUpdatePayment,
  getWaLink,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  const statusColors: Record<OrderStatus, string> = {
    pending: "bg-slate-100 text-slate-800 border-slate-300",
    washing: "bg-sky-50 text-blue-900 border-sky-200",
    drying_ironing: "bg-blue-100 text-blue-950 border-blue-300",
    ready: "bg-sky-400 text-blue-950 border-sky-500 font-extrabold shadow-sm",
    completed: "bg-slate-900 text-white border-slate-950",
  };

  const filteredOrders = orders.filter((order) => {
    const matchSearch =
      order.invoiceNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.customer?.name && order.customer.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (order.customer?.phone && order.customer.phone.includes(searchQuery));

    const matchStatus = statusFilter === "all" || order.status === statusFilter;
    const matchPayment = paymentFilter === "all" || order.paymentStatus === paymentFilter;

    return matchSearch && matchStatus && matchPayment;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Daftar Order Laundry</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Kelola status cucian, pembayaran, dan kirim nota langsung ke nomor WhatsApp customer
          </p>
        </div>
        <button
          onClick={onOpenOrderModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Order Baru
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nomor nota, nama pelanggan, atau no HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Status:</span>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-blue-900"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Antrian</option>
            <option value="washing">Sedang Dicuci</option>
            <option value="drying_ironing">Pengering/Setrika</option>
            <option value="ready">Siap Diambil</option>
            <option value="completed">Selesai Diambil</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-blue-900"
          >
            <option value="all">Semua Pembayaran</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="paid">Sudah Lunas</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Invoice / Nota</th>
                <th className="py-3.5 px-4">Pelanggan</th>
                <th className="py-3.5 px-4">Layanan & Berat</th>
                <th className="py-3.5 px-4">Total Biaya</th>
                <th className="py-3.5 px-4">Status Bayar</th>
                <th className="py-3.5 px-4">Status Cucian</th>
                <th className="py-3.5 px-4 text-right">Aksi & WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                    Tidak ada transaksi order yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/70 transition">
                    {/* Invoice */}
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-slate-950 font-mono text-xs sm:text-sm">
                        {order.invoiceNo}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs sm:text-sm">
                        {order.customer?.name || "Customer"}
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-sky-600" />
                        <span className="font-mono text-[11px]">{order.customer?.phone || "-"}</span>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-semibold text-xs sm:text-sm">
                        {order.serviceType}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {order.weightOrQty} {order.unit} @ Rp {order.pricePerUnit.toLocaleString("id-ID")}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4">
                      <div className="font-black text-blue-950 text-xs sm:text-sm">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="py-3.5 px-4">
                      {order.paymentStatus === "paid" ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-900 text-sky-200">
                          Lunas ({order.paymentMethod || "cash"})
                        </span>
                      ) : (
                        <button
                          onClick={() => onUpdatePayment(order.id, "paid", "cash")}
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-sky-50 text-blue-950 border border-sky-300 hover:bg-blue-900 hover:text-white transition"
                          title="Klik untuk tandai lunas"
                        >
                          Belum Lunas ➔ Lunaskan
                        </button>
                      )}
                    </td>

                    {/* Status Select */}
                    <td className="py-3.5 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                        className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none transition ${
                          statusColors[order.status] || "bg-slate-100 text-slate-800 border-slate-200"
                        }`}
                      >
                        <option value="pending">Antrian</option>
                        <option value="washing">Sedang Dicuci</option>
                        <option value="drying_ironing">Pengering/Setrika</option>
                        <option value="ready">Siap Diambil ✨</option>
                        <option value="completed">Selesai Diambil</option>
                      </select>
                    </td>

                    {/* WhatsApp Action */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end">
                        <a
                          href={getWaLink(order)}
                          target="_blank"
                          rel="noreferrer"
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition ${
                            order.status === "ready"
                              ? "bg-blue-900 text-sky-300 hover:bg-black hover:text-white shadow-sm"
                              : "bg-slate-100 text-slate-700 hover:bg-sky-50 hover:text-blue-900 border border-slate-200"
                          }`}
                          title="Kirim notifikasi WhatsApp ke nomor pelanggan"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
                          <span className="hidden sm:inline">Kirim</span> WA
                        </a>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
