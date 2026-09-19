import React, { useState, useEffect } from "react";
import {
  Plus,
  Phone,
  Search,
  MapPin,
  ShoppingBag,
  TrendingUp,
  ChevronRight,
  ChevronLeft,
  User,
  Pencil,
  Trash2,
  Store,
  Users,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Customer, Order, OrderStatus, Role, Tenant } from "../../types";
import { ShadcnDataTable, ColumnDef } from "../common/ShadcnDataTable";

interface CustomersTabProps {
  customers: Customer[];
  orders: Order[];
  tenants?: Tenant[];
  currentUserRole?: Role;
  onOpenCustomerModal: () => void;
  onSelectCustomerForOrder: (customerId: string) => void;
  onEditCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
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

export const CustomersTab: React.FC<CustomersTabProps> = ({
  customers,
  orders,
  tenants = [],
  currentUserRole = "staff",
  onOpenCustomerModal,
  onSelectCustomerForOrder,
  onEditCustomer,
  onDeleteCustomer,
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  // --- STATE SUPER ADMIN ---
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  // --- STATE OPERASIONAL OUTLET ---
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers.length > 0 ? customers[0].id : ""
  );
  const [mobileSelectedView, setMobileSelectedView] = useState<"list" | "detail">("list");
  const [orderPage, setOrderPage] = useState(1);
  const [orderPageSize, setOrderPageSize] = useState(5);
  const [custPage, setCustPage] = useState(1);
  const CUST_PAGE_SIZE = 10;

  // ==========================================
  // 1. TAMPILAN DATA ADMIN (TABEL BERSIH)
  // ==========================================
  if (isSuperAdmin) {
    const filteredAdminCustomers = customers.filter((cust) => {
      const q = adminSearchQuery.toLowerCase();
      const matchSearch =
        cust.name.toLowerCase().includes(q) ||
        cust.phone.includes(q) ||
        (cust.address && cust.address.toLowerCase().includes(q)) ||
        (cust.notes && cust.notes.toLowerCase().includes(q));

      const matchTenant = tenantFilter === "all" || cust.tenantId === tenantFilter;
      return matchSearch && matchTenant;
    });

    const filteredOrdersForTenant = tenantFilter === "all"
      ? orders
      : orders.filter((o) => o.tenantId === tenantFilter);

    const dynamicOrdersCount = filteredOrdersForTenant.length;
    const dynamicNetworkLtv = filteredOrdersForTenant
      .filter((o) => o.paymentStatus === "paid")
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const adminColumns: ColumnDef<Customer>[] = [
      {
        id: "customer",
        header: "Pelanggan",
        cell: (cust) => (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {cust.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-zinc-900 text-xs truncate">{cust.name}</div>
              <div className="font-mono text-[10px] text-zinc-400 mt-0.5">{cust.id}</div>
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Kontak",
        cell: (cust) => {
          const cleanPhone = cust.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
          return (
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-zinc-700">{cust.phone}</span>
              <a
                href={`https://wa.me/${cleanPhone}`}
                target="_blank"
                rel="noreferrer"
                className="p-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition shrink-0"
                title="Kirim pesan WhatsApp"
              >
                <WhatsAppIcon className="w-3 h-3 text-emerald-600" />
              </a>
            </div>
          );
        },
      },
      {
        id: "outlet",
        header: "Cabang",
        cell: (cust) => {
          const outlet = tenants.find((t) => t.id === cust.tenantId);
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
      {
        id: "ordersCount",
        header: "Pesanan",
        cell: (cust) => {
          const count = orders.filter((o) => o.customerId === cust.id).length;
          return (
            <span className="inline-flex items-center text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              {count}x pesanan
            </span>
          );
        },
      },
      {
        id: "totalSpent",
        header: "Total Belanja",
        cell: (cust) => {
          const spent = orders
            .filter((o) => o.customerId === cust.id && o.paymentStatus === "paid")
            .reduce((sum, o) => sum + o.totalAmount, 0);
          return (
            <span className="font-bold text-zinc-900 text-xs whitespace-nowrap">
              Rp {spent.toLocaleString("id-ID")}
            </span>
          );
        },
      },
      {
        id: "address",
        header: "Alamat",
        cell: (cust) => (
          <span
            className="text-zinc-600 text-xs max-w-[200px] truncate block"
            title={cust.address || "-"}
          >
            {cust.address || "-"}
          </span>
        ),
      },
      {
        id: "notes",
        header: "Catatan",
        cell: (cust) => (
          <span
            className="text-zinc-500 text-[11px] italic max-w-[180px] truncate block"
            title={cust.notes || "-"}
          >
            {cust.notes || "-"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Aksi",
        align: "right",
        cell: (cust) => (
          <div className="flex items-center justify-end gap-1.5">
            <button
              onClick={() => onEditCustomer(cust)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-600 transition shadow-2xs cursor-pointer"
              title="Edit Data Pelanggan"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDeleteCustomer(cust.id)}
              className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition shadow-2xs cursor-pointer"
              title="Hapus Pelanggan"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ),
      },
    ];

    return (
      <div className="space-y-5">
        {/* Header Bersih */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Data Pelanggan</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Database pelanggan seluruh cabang.</p>
          </div>
        </div>

        {/* 3 Metric Cards Ringkasan dengan Palet Warna Berani & Hero Light Blue Spotlight */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Pelanggan - Hero Spotlight Light Blue */}
          <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                Total Pelanggan
              </span>
              <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {filteredAdminCustomers.length}
            </div>
            <p className="text-[11px] text-sky-700 font-medium mt-1">Basis data pelanggan aktif</p>
          </div>

          {/* Total Pesanan - Royal Indigo */}
          <div className="rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-800">
                Total Pesanan
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              {dynamicOrdersCount}
            </div>
            <p className="text-[11px] text-indigo-700/90 font-medium mt-1">Akumulasi riwayat transaksi</p>
          </div>

          {/* Total Belanja - Mint Emerald */}
          <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Total Belanja
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
              Rp {dynamicNetworkLtv.toLocaleString("id-ID")}
            </div>
            <p className="text-[11px] text-emerald-700/90 font-medium mt-1">Akumulasi transaksi lunas</p>
          </div>
        </div>

        {/* Tabel Data Bersih */}
        <ShadcnDataTable
          data={filteredAdminCustomers}
          columns={adminColumns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari pelanggan..."
          searchQuery={adminSearchQuery}
          onSearchChange={setAdminSearchQuery}
          customFilters={
            tenants.length > 0 ? (
              <div className="flex items-center gap-2">
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
              </div>
            ) : undefined
          }
          emptyMessage="Tidak ada data pelanggan yang sesuai."
          initialPageSize={10}
        />
      </div>
    );
  }

  // ====================================================
  // 2. TAMPILAN OPERASIONAL OUTLET (TENANT OWNER / STAFF)
  // ====================================================
  const filteredCustomers = customers.filter((cust) => {
    return (
      cust.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.phone.includes(searchQuery) ||
      (cust.address && cust.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const totalCustPages = Math.max(1, Math.ceil(filteredCustomers.length / CUST_PAGE_SIZE));
  const custStartIdx = (custPage - 1) * CUST_PAGE_SIZE;
  const paginatedCustomers = filteredCustomers.slice(custStartIdx, custStartIdx + CUST_PAGE_SIZE);

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCustPage(1);
  };

  const selectedCustomer =
    customers.find((c) => c.id === selectedCustomerId) ||
    filteredCustomers[0] ||
    null;

  useEffect(() => {
    setOrderPage(1);
  }, [selectedCustomerId]);

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

  const totalOrderPages = Math.max(1, Math.ceil(customerOrders.length / orderPageSize));
  const startIndex = (orderPage - 1) * orderPageSize;
  const endIndex = startIndex + orderPageSize;
  const paginatedOrders = customerOrders.slice(startIndex, endIndex);

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Pelanggan</h2>
          <p className="text-xs text-zinc-500">
            Total {customers.length} pelanggan terdaftar.
          </p>
        </div>

        <button
          onClick={onOpenCustomerModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Tambah Pelanggan
        </button>
      </div>

      {/* Split Panel Layout (Left: 4 cols, Right: 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* PANEL KIRI: Daftar Pelanggan (4 cols) */}
        <div
          className={`${
            mobileSelectedView === "detail" ? "hidden lg:flex" : "flex"
          } lg:col-span-4 bg-white rounded-xl border border-zinc-200 shadow-sm flex-col h-auto lg:h-[680px] overflow-hidden w-full`}
        >
          {/* Search Box */}
          <div className="p-3 border-b border-zinc-200 bg-zinc-50/60">
            <div className="relative">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pelanggan..."
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
                <span>Tidak ada pelanggan</span>
              </div>
            ) : (
              paginatedCustomers.map((cust) => {
                const count = orders.filter((o) => o.customerId === cust.id).length;
                const isSelected = selectedCustomer?.id === cust.id;

                return (
                  <button
                    key={cust.id}
                    onClick={() => {
                      setSelectedCustomerId(cust.id);
                      setMobileSelectedView("detail");
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
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
        <div
          className={`${
            mobileSelectedView === "list" ? "hidden lg:flex" : "flex"
          } lg:col-span-8 bg-white rounded-xl border border-zinc-200 shadow-sm p-4 sm:p-6 min-h-0 lg:min-h-[680px] flex-col justify-between w-full`}
        >
          {!selectedCustomer ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-400">
              <button
                type="button"
                onClick={() => setMobileSelectedView("list")}
                className="lg:hidden inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-2 rounded-xl mb-4 transition cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Pilih Pelanggan dari Daftar</span>
              </button>
              <User className="w-12 h-12 text-zinc-200 mb-3" />
              <div className="font-bold text-zinc-800 text-sm">Pilih Pelanggan</div>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                Pilih salah satu pelanggan di sebelah kiri untuk melihat kontak dan riwayat cucian.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Mobile Back Button to Customer List */}
              <div className="lg:hidden pb-3 border-b border-zinc-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setMobileSelectedView("list")}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-900 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 border border-blue-200 px-3 py-1.5 rounded-lg transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Daftar Pelanggan</span>
                </button>
                <span className="text-[11px] text-zinc-400 font-medium">Detail Pelanggan</span>
              </div>

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
                      {selectedCustomer.id}
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
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
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
                    title="Edit Profil"
                  >
                    <Pencil className="w-3.5 h-3.5 text-zinc-500" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => {
                      onDeleteCustomer(selectedCustomer.id);
                      setMobileSelectedView("list");
                    }}
                    className="p-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-rose-50 text-zinc-400 hover:text-rose-600 transition shadow-xs cursor-pointer"
                    title="Hapus"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onSelectCustomerForOrder(selectedCustomer.id)}
                    className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white text-xs font-medium flex items-center gap-1.5 transition shadow-xs cursor-pointer"
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
                    {customerOrders.length}
                  </div>
                </div>

                <div className="bg-zinc-50/80 p-3.5 rounded-xl border border-zinc-200/80">
                  <div className="flex items-center gap-1.5 text-zinc-500 text-[11px] font-medium">
                    <TrendingUp className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Rata-Rata Order</span>
                  </div>
                  <div className="text-base sm:text-lg font-bold text-zinc-900 mt-1 font-mono">
                    Rp {averageOrderValue.toLocaleString("id-ID")}
                  </div>
                </div>
              </div>

              {/* Detail Info: Phone, Address, Notes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40 space-y-2">
                  <div>
                    <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Kontak
                    </span>
                    <p className="font-mono text-zinc-800 font-semibold mt-0.5">
                      {selectedCustomer.phone}
                    </p>
                  </div>
                  <div>
                    <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Alamat
                    </span>
                    <p className="text-zinc-700 mt-0.5">
                      {selectedCustomer.address || "—"}
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/40">
                  <span className="text-zinc-400 text-[11px] flex items-center gap-1">
                    <ShoppingBag className="w-3 h-3" /> Catatan
                  </span>
                  <p className="text-zinc-700 italic mt-0.5 leading-relaxed">
                    {selectedCustomer.notes || "—"}
                  </p>
                </div>
              </div>

              {/* Order History with Table Styling */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-zinc-600" />
                    <h4 className="font-bold text-zinc-900 text-xs sm:text-sm">
                      Riwayat Pesanan
                    </h4>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {customerOrders.length} transaksi
                  </span>
                </div>

                {customerOrders.length === 0 ? (
                  <div className="py-10 text-center text-zinc-400 text-xs border border-dashed border-zinc-200 rounded-xl">
                    Belum ada riwayat cucian.
                  </div>
                ) : (
                  <div className="border border-zinc-200 rounded-xl overflow-hidden shadow-2xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-zinc-200 bg-zinc-50/80 text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                            <th className="py-2.5 px-3">No. Nota</th>
                            <th className="py-2.5 px-3">Layanan</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Pembayaran</th>
                            <th className="py-2.5 px-3 text-right">Total</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100">
                          {paginatedOrders.map((ord) => (
                            <tr key={ord.id} className="hover:bg-zinc-50/70 transition">
                              <td className="py-2.5 px-3 font-mono font-bold text-zinc-900">
                                {ord.invoiceNo}
                                <div className="text-[10px] font-normal text-zinc-400 font-sans mt-0.5">
                                  {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                  })}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-zinc-700">
                                <div className="font-medium text-zinc-800">{ord.serviceType}</div>
                                <div className="text-[10px] text-zinc-400">
                                  {ord.weightOrQty} {ord.unit}
                                </div>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    statusBadgeStyles[ord.status] || "bg-zinc-100 text-zinc-700"
                                  }`}
                                >
                                  {ord.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span
                                  className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    ord.paymentStatus === "paid"
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-zinc-900 font-mono">
                                Rp {ord.totalAmount.toLocaleString("id-ID")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Bar */}
                    <div className="border-t border-zinc-200 px-3 py-2 flex flex-col sm:flex-row items-center justify-between gap-2 bg-zinc-50/50 text-[11px] text-zinc-500">
                      <div className="text-[11px] text-zinc-500">
                        {customerOrders.length === 0 ? 0 : startIndex + 1} -{" "}
                        {Math.min(endIndex, customerOrders.length)} dari {customerOrders.length} transaksi
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-500 text-[11px]">Baris:</span>
                          <select
                            value={orderPageSize}
                            onChange={(e) => {
                              setOrderPageSize(Number(e.target.value));
                              setOrderPage(1);
                            }}
                            className="bg-white border border-zinc-200 rounded px-1.5 py-0.5 text-[11px] text-zinc-700 focus:outline-none focus:border-zinc-900"
                          >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setOrderPage((p) => Math.max(1, p - 1))}
                            disabled={orderPage === 1}
                            className="p-1 rounded hover:bg-zinc-200/70 disabled:opacity-30 disabled:hover:bg-transparent transition"
                            title="Sebelumnya"
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
                            title="Berikutnya"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
