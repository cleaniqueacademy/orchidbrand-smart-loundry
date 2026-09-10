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
    pending: "bg-slate-100 text-slate-700 border-slate-200",
    washing: "bg-sky-50 text-blue-900 border-sky-200",
    drying_ironing: "bg-blue-100 text-blue-900 border-blue-200",
    ready: "bg-blue-900 text-sky-200 border-blue-900",
    completed: "bg-slate-900 text-white border-slate-900",
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
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-slate-950">Pesanan Laundry</h2>
        <button
          onClick={onOpenOrderModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Order Baru
        </button>
      </div>

      {/* Filter & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nota, nama, atau no HP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-blue-900"
          >
            <option value="all">Semua Status</option>
            <option value="pending">Antrian</option>
            <option value="washing">Sedang Dicuci</option>
            <option value="drying_ironing">Pengering/Setrika</option>
            <option value="ready">Siap Diambil</option>
            <option value="completed">Selesai</option>
          </select>

          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-blue-900"
          >
            <option value="all">Semua Bayar</option>
            <option value="unpaid">Belum Lunas</option>
            <option value="paid">Lunas</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Nota</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Layanan</th>
                <th className="py-3 px-4">Total</th>
                <th className="py-3 px-4">Bayar</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">WA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    Tidak ada order yang sesuai filter
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-slate-50/60 transition">
                    {/* Invoice */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-950 font-mono text-xs">{order.invoiceNo}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 text-xs">
                        {order.customer?.name || "Customer"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span className="font-mono">{order.customer?.phone || "-"}</span>
                      </div>
                    </td>

                    {/* Service */}
                    <td className="py-3 px-4">
                      <div className="text-slate-900 text-xs font-medium">{order.serviceType}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {order.weightOrQty} {order.unit} @ Rp {order.pricePerUnit.toLocaleString("id-ID")}
                      </div>
                    </td>

                    {/* Total */}
                    <td className="py-3 px-4">
                      <div className="font-black text-blue-950 text-xs">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </div>
                    </td>

                    {/* Payment */}
                    <td className="py-3 px-4">
                      {order.paymentStatus === "paid" ? (
                        <span className="text-xs font-semibold text-blue-900">
                          Lunas
                        </span>
                      ) : (
                        <button
                          onClick={() => onUpdatePayment(order.id, "paid", "cash")}
                          className="text-xs font-semibold text-slate-500 hover:text-blue-900 underline underline-offset-2 transition"
                          title="Tandai lunas"
                        >
                          Belum Lunas
                        </button>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      <select
                        value={order.status}
                        onChange={(e) => onUpdateStatus(order.id, e.target.value)}
                        className={`text-[11px] font-bold px-2.5 py-1.5 rounded-lg border cursor-pointer outline-none transition ${
                          statusColors[order.status] || "bg-slate-100 text-slate-700 border-slate-200"
                        }`}
                      >
                        <option value="pending">Antrian</option>
                        <option value="washing">Dicuci</option>
                        <option value="drying_ironing">Setrika</option>
                        <option value="ready">Siap Diambil</option>
                        <option value="completed">Selesai</option>
                      </select>
                    </td>

                    {/* WhatsApp */}
                    <td className="py-3 px-4 text-right">
                      <a
                        href={getWaLink(order)}
                        target="_blank"
                        rel="noreferrer"
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5 transition ${
                          order.status === "ready"
                            ? "bg-blue-900 text-sky-300 hover:bg-black hover:text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-sky-50 hover:text-blue-900 border border-slate-200"
                        }`}
                      >
                        <MessageCircle className="w-3.5 h-3.5" /> WA
                      </a>
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
