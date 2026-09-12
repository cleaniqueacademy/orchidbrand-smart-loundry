import React, { useState, useEffect } from "react";
import {
  Plus,
  Phone,
  Search,
  MapPin,
  FileText,
  ShoppingBag,
  TrendingUp,
  Receipt,
  Calendar,
  ChevronRight,
  ChevronLeft,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Customer, Order, OrderStatus } from "../../types";

interface CustomersTabProps {
  customers: Customer[];
  orders: Order[];
  onOpenCustomerModal: () => void;
  onSelectCustomerForOrder: (customerId: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
}

const statusBadgeStyles: Record<OrderStatus, string> = {
  pending: "bg-zinc-100 text-zinc-700 border-zinc-200",
  washing: "bg-sky-50 text-sky-800 border-sky-200",
  drying_ironing: "bg-blue-50 text-blue-800 border-blue-200",
  ready: "bg-emerald-50 text-emerald-800 border-emerald-200",
  completed: "bg-blue-900 text-white border-blue-900",
};

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  orders,
  onOpenCustomerModal,
  onSelectCustomerForOrder,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers.length > 0 ? customers[0].id : ""
  );

  // Pagination for order history (right panel)
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(5);

  // Pagination for customer list (left panel)
  const [custPage, setCustPage] = useState(1);
  const CUST_PAGE_SIZE = 10;

  const filteredCustomers = customers.filter((cust) => {
    return (
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery) ||
      (cust.address && cust.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  // Left panel pagination
  const totalCustPages = Math.max(1, Math.ceil(filteredCustomers.length / CUST_PAGE_SIZE));
  const custStartIdx = (custPage - 1) * CUST_PAGE_SIZE;
  const paginatedCustomers = filteredCustomers.slice(custStartIdx, custStartIdx + CUST_PAGE_SIZE);

  // Reset customer page when search changes
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCustPage(1);
  };

  // Selected customer data
  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ||
    filteredCustomers[0] ||
    null;

  // Reset page when switching customer
  useEffect(() => {
    setOrderPage(1);
  }, [selectedCustomerId]);

  // Selected customer orders
  const customerOrders = selectedCustomer
    ? orders.filter((o) => o.customerId === selectedCustomer.id)
    : [];

  const totalSpent = customerOrders
    .filter((o) => o.paymentStatus === "paid")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const averageOrderValue =
    customerOrders.length > 0 ? Math.round(totalSpent / customerOrders.length) : 0;

  const cleanPhone = selectedCustomer?.phone
    ? selectedCustomer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")
    : "";

  // Order pagination slice
  const totalOrderPages = Math.max(1, Math.ceil(customerOrders.length / orderPageSize));
  const startIndex = (orderPage - 1) * orderPageSize;
  const endIndex = startIndex + orderPageSize;
  const paginatedOrders = customerOrders.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Manajemen Pelanggan</h2>
          <p className="text-xs text-zinc-500">
            Total {customers.length} pelanggan terdaftar di outlet ini
          </p>
        </div>

        <button
          onClick={onOpenCustomerModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pelanggan
        </button>
      </div>

      {/* Split Panel Layout (Left: 4 cols, Right: 8 cols for generous breathing room) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* PANEL KIRI: Daftar Pelanggan (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-zinc-200 shadow-sm flex flex-col h-[680px] overflow-hidden">
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-200 bg-zinc-50/60">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama, no WA..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-lg border border-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 font-medium placeholder:text-zinc-400 transition"
              />
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 px-1">
              {filteredCustomers.length} pelanggan · Hal {custPage}/{totalCustPages}
            </div>
          </div>

          {/* Customer List Items */}
          <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 p-2 space-y-1">
            {filteredCustomers.length === 0 ? (
              <div className="py-16 text-center text-zinc-400 text-xs flex flex-col items-center justify-center">
                <User className="w-8 h-8 text-zinc-300 mb-2" />
                <span>Tidak ada pelanggan ditemukan</span>
              </div>
            ) : (
              paginatedCustomers.map((cust) => {
                const count = orders.filter((o) => o.customerId === cust.id).length;
                const isSelected = selectedCustomer?.id === cust.id;

                return (
                  <button
                    key={cust.id}
                    onClick={() => setSelectedCustomerId(cust.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-blue-50 border border-blue-200/80 shadow-xs"
                        : "hover:bg-zinc-50 border border-transparent"
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 border ${
                          isSelected
                            ? "bg-blue-900 text-white border-blue-900"
                            : "bg-zinc-100 text-zinc-700 border-zinc-200"
                        }`}
                      >
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0">
                        <div className="font-semibold text-zinc-900 text-xs truncate">
                          {cust.name}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono mt-0.5 flex items-center gap-1">
                          <Phone className="w-2.5 h-2.5 text-zinc-400 shrink-0" />
                          <span className="truncate">{cust.phone}</span>
                        </div>
                        {cust.address && (
                          <div className="text-[11px] text-zinc-400 truncate mt-1 flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5 text-zinc-300 shrink-0" />
                            <span className="truncate">{cust.address}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[10px] font-semibold bg-zinc-200/70 text-zinc-700 px-1.5 py-0.5 rounded-full">
                        {count}x
                      </span>
                      <ChevronRight
                        className={`w-3.5 h-3.5 mt-2 transition-transform ${
                          isSelected ? "text-blue-900 translate-x-0.5" : "text-zinc-300"
                        }`}
                      />
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Pagination left panel */}
          {totalCustPages > 1 && (
            <div className="border-t border-zinc-100 px-3 py-2 flex items-center justify-between gap-2 bg-zinc-50/60 shrink-0">
              <button
                onClick={() => setCustPage((p) => Math.max(1, p - 1))}
                disabled={custPage === 1}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalCustPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalCustPages || Math.abs(p - custPage) <= 1)
                  .reduce<(number | string)[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, idx) =>
                    p === "..." ? (
                      <span key={`ellipsis-${idx}`} className="text-[11px] text-zinc-400 px-1">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCustPage(p as number)}
                        className={`w-6 h-6 rounded-md text-[11px] font-semibold transition ${
                          custPage === p
                            ? "bg-blue-900 text-white"
                            : "text-zinc-600 hover:bg-zinc-100"
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
              </div>

              <button
                onClick={() => setCustPage((p) => Math.min(totalCustPages, p + 1))}
                disabled={custPage === totalCustPages}
                className="p-1.5 rounded-lg border border-zinc-200 hover:bg-white text-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* PANEL KANAN: Detail Pelanggan Terpilih (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-zinc-200 shadow-sm p-5 sm:p-6 min-h-[680px] flex flex-col justify-between">
          {!selectedCustomer ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <User className="w-12 h-12 text-zinc-200 mb-3" />
              <div className="font-bold text-zinc-800 text-sm">Belum Ada Pelanggan Terpilih</div>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Pilih salah satu pelanggan di panel sebelah kiri untuk melihat detail kontak, analitik belanja, dan riwayat cucian.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Header Info Pelanggan & Action Buttons */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-blue-900 text-white font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                    {selectedCustomer.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-zinc-900 text-base sm:text-lg truncate">
                      {selectedCustomer.name}
                    </h3>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                      ID: {selectedCustomer.id}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons - Clean and spacious */}
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
                    title="Kirim pesan WhatsApp"
                  >
                    <WhatsAppIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>WhatsApp</span>
                  </a>

                  <button
                    onClick={() => onEditCustomer(selectedCustomer)}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
                    title="Edit Profil & Kontak Pelanggan"
                  >
                    <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Edit Data</span>
                  </button>

                  <button
                    onClick={() => onDeleteCustomer(selectedCustomer.id)}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition shadow-xs"
                    title="Hapus Pelanggan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectCustomerForOrder(selectedCustomer.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Buat Order</span>
                  </button>
                </div>
              </div>

              {/* 3 Metric Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Total Belanja</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-zinc-900 mt-1 font-mono">
                    Rp {totalSpent.toLocaleString("id-ID")}
                  </div>
                </div>

                <div className="bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                    <ShoppingBag className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Total Order</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-zinc-900 mt-1">
                    {customerOrders.length} Pesanan
                  </div>
                </div>

                <div className="bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                    <Receipt className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Rata-Rata Order</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-zinc-900 mt-1 font-mono">
                    Rp {averageOrderValue.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Contact & Notes Info Box */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-white rounded-xl border border-zinc-200 space-y-2">
                  <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Kontak & WhatsApp</span>
                  </div>
                  <div className="font-mono text-zinc-700">{selectedCustomer.phone}</div>

                  <div className="pt-2 border-t border-zinc-100">
                    <div className="font-semibold text-zinc-900 flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Alamat Pengiriman / Rumah</span>
                    </div>
                    <div className="text-zinc-600">
                      {selectedCustomer.address || "Belum ada catatan alamat"}
                    </div>
                  </div>
                </div>

                <div className="p-3.5 bg-white rounded-xl border border-zinc-200 space-y-2">
                  <div className="font-semibold text-zinc-900 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Catatan Khusus Pelanggan</span>
                  </div>
                  <p className="text-zinc-600 italic">
                    {selectedCustomer.notes || "Tidak ada preferensi khusus (standar laundry)"}
                  </p>
                </div>
              </div>

              {/* Riwayat Pesanan Pelanggan with Responsive Table and Pagination */}
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-zinc-900 text-xs flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Riwayat Pesanan Pelanggan</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Total {customerOrders.length} transaksi
                  </span>
                </div>

                <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white shadow-xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs min-w-[540px]">
                      <thead className="bg-zinc-50 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                        <tr>
                          <th className="py-2.5 px-3.5 whitespace-nowrap">No. Nota</th>
                          <th className="py-2.5 px-3.5 whitespace-nowrap">Layanan</th>
                          <th className="py-2.5 px-3.5 whitespace-nowrap">Status Cucian</th>
                          <th className="py-2.5 px-3.5 whitespace-nowrap">Pembayaran</th>
                          <th className="py-2.5 px-3.5 text-right whitespace-nowrap">Total Biaya</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100">
                        {paginatedOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-400 text-xs">
                              Pelanggan ini belum memiliki riwayat pesanan
                            </td>
                          </tr>
                        ) : (
                          paginatedOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-zinc-50/70 transition-colors">
                              <td className="py-2.5 px-3.5 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                                {ord.invoiceNo}
                              </td>
                              <td className="py-2.5 px-3.5 text-zinc-700 whitespace-nowrap">
                                {ord.serviceType} <span className="text-zinc-400 font-mono">({ord.weightOrQty} {ord.unit})</span>
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    statusBadgeStyles[ord.status] || "bg-zinc-100 text-zinc-700"
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 whitespace-nowrap">
                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    ord.paymentStatus === "paid"
                                      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                                      : "text-amber-700 bg-amber-50 border-amber-200"
                                  }`}
                                >
                                  {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3.5 text-right font-bold text-zinc-900 whitespace-nowrap font-mono">
                                Rp {ord.totalAmount.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination Controls */}
                  {customerOrders.length > 0 && (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 border-t border-zinc-200 bg-zinc-50/60 text-xs text-zinc-500">
                      <div className="text-[11px]">
                        Menampilkan <span className="font-semibold text-zinc-800">{Math.min(startIndex + 1, customerOrders.length)}</span> -{" "}
                        <span className="font-semibold text-zinc-800">{Math.min(endIndex, customerOrders.length)}</span> dari{" "}
                        <span className="font-semibold text-zinc-800">{customerOrders.length}</span> transaksi
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] text-zinc-400">Baris:</span>
                          <select
                            value={orderPageSize}
                            onChange={(e) => {
                              setOrderPageSize(Number(e.target.value));
                              setOrderPage(1);
                            }}
                            className="text-[11px] bg-white border border-zinc-200 rounded px-1.5 py-0.5 font-medium outline-none cursor-pointer"
                          >
                            <option value={3}>3</option>
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                            disabled={orderPage === 1}
                            className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            title="Halaman Sebelumnya"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>

                          <span className="text-[11px] font-medium text-zinc-700 px-1.5">
                            {orderPage} / {totalOrderPages}
                          </span>

                          <button
                            onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))}
                            disabled={orderPage >= totalOrderPages}
                            className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            title="Halaman Berikutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

