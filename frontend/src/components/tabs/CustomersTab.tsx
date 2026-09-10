import React, { useState } from "react";
import { Plus, Phone, MessageCircle, Search, MapPin, Tag } from "lucide-react";
import { Customer, Order } from "../../types";

interface CustomersTabProps {
  customers: Customer[];
  orders: Order[];
  onOpenCustomerModal: () => void;
  onSelectCustomerForOrder: (customerId: string) => void;
}

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  orders,
  onOpenCustomerModal,
  onSelectCustomerForOrder,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter((cust) => {
    return (
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery) ||
      (cust.address && cust.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Database Pelanggan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar nomor WhatsApp & kontak pelanggan tersimpan untuk notifikasi otomatis cucian selesai
          </p>
        </div>
        <button
          onClick={onOpenCustomerModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Tambah Pelanggan
        </button>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari nama pelanggan, nomor WhatsApp, atau alamat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 font-medium"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-400 text-xs sm:text-sm bg-white rounded-2xl border border-dashed border-slate-200">
            Tidak ada data pelanggan yang ditemukan. Klik "Tambah Pelanggan" untuk mendaftarkan.
          </div>
        ) : (
          filteredCustomers.map((cust) => {
            const customerOrders = orders.filter((o) => o.customerId === cust.id);
            const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");

            return (
              <div
                key={cust.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-extrabold text-slate-950 text-base">{cust.name}</h3>
                      <div className="mt-1 text-xs text-slate-700 flex items-center gap-1.5 font-mono">
                        <Phone className="w-3.5 h-3.5 text-sky-600" />
                        <span>{cust.phone}</span>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-blue-950 border border-sky-200">
                      {customerOrders.length} Order
                    </span>
                  </div>

                  {cust.address && (
                    <p className="text-xs text-slate-600 mt-3 flex items-start gap-1.5 line-clamp-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{cust.address}</span>
                    </p>
                  )}

                  {cust.notes && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 text-[11px] text-slate-600 border border-slate-100 flex items-start gap-1.5">
                      <Tag className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span>{cust.notes}</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                  <a
                    href={`https://wa.me/${cleanPhone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-blue-900 hover:text-sky-600 flex items-center gap-1.5 transition"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-sky-500" /> Chat WhatsApp
                  </a>
                  <button
                    onClick={() => onSelectCustomerForOrder(cust.id)}
                    className="text-xs font-bold text-sky-700 hover:text-blue-950 transition"
                  >
                    + Buat Order
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
