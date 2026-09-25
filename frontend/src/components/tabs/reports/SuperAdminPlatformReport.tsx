import React, { useState, useMemo, useEffect } from "react";
import {
  Users,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Search,
  Store,
  Phone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Tenant, User, Order } from "../../../types";

interface SuperAdminPlatformReportProps {
  tenants: Tenant[];
  users: User[];
  orders: Order[];
}

export const SuperAdminPlatformReport: React.FC<SuperAdminPlatformReportProps> = ({
  tenants,
  users,
  orders,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "expiring_soon" | "expired">("all");

  const now = useMemo(() => new Date(), []);

  // Compute tenant subscription data
  const tenantRows = useMemo(() => {
    return tenants.map((tenant) => {
      const owner = users.find((u) => u.id === tenant.userId || (tenant.owner && u.id === tenant.owner.id));
      const staffList = users.filter((u) => u.tenantId === tenant.id && u.role === "staff");
      
      let daysRemaining: number | null = null;
      let subscriptionStatus: "active" | "expiring_soon" | "expired" = "active";

      const subDateStr = tenant.subscriptionUntil || owner?.subscriptionUntil;
      if (subDateStr) {
        const subDate = new Date(subDateStr);
        const diffMs = subDate.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (daysRemaining < 0) {
          subscriptionStatus = "expired";
        } else if (daysRemaining <= 7) {
          subscriptionStatus = "expiring_soon";
        } else {
          subscriptionStatus = "active";
        }
      } else {
        subscriptionStatus = tenant.status === "active" ? "active" : "expired";
      }

      const tenantOrders = orders.filter((o) => o.tenantId === tenant.id);
      const totalOmset = tenantOrders
        .filter((o) => o.paymentStatus === "paid")
        .reduce((sum, o) => sum + o.totalAmount, 0);

      return {
        ...tenant,
        ownerName: owner?.name || tenant.owner?.name || "Belum Ditentukan",
        ownerEmail: owner?.email || tenant.owner?.email || "-",
        ownerPhone: tenant.phone || "-",
        staffCount: staffList.length,
        subscriptionStatus,
        daysRemaining,
        subDateStr,
        orderCount: tenantOrders.length,
        totalOmset,
      };
    });
  }, [tenants, users, orders, now]);

  // Overall Metrics
  const metrics = useMemo(() => {
    const totalTenants = tenantRows.length;
    const activeTenants = tenantRows.filter((t) => t.subscriptionStatus === "active" && t.status === "active").length;
    const expiringSoonTenants = tenantRows.filter((t) => t.subscriptionStatus === "expiring_soon").length;
    const expiredTenants = tenantRows.filter((t) => t.subscriptionStatus === "expired" || t.status === "inactive").length;
    const totalOwners = users.filter((u) => u.role === "tenant_owner").length;
    const totalStaff = users.filter((u) => u.role === "staff").length;

    return {
      totalTenants,
      activeTenants,
      expiringSoonTenants,
      expiredTenants,
      totalOwners,
      totalStaff,
    };
  }, [tenantRows, users]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return tenantRows.filter((row) => {
      const matchSearch =
        searchQuery === "" ||
        row.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.ownerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.ownerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.address.toLowerCase().includes(searchQuery.toLowerCase());

      const matchStatus =
        statusFilter === "all" || row.subscriptionStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [tenantRows, searchQuery, statusFilter]);

  // Pagination State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter]);

  const totalItems = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (validPage - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, validPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      "ID Cabang",
      "Nama Outlet",
      "Pemilik Toko",
      "Email Pemilik",
      "Nomor Telepon",
      "Alamat",
      "Jumlah Staff",
      "Status Akun",
      "Status Langganan",
      "Jatuh Tempo",
      "Sisa Hari",
      "Total Pesanan",
      "Omset Toko (IDR)",
    ];

    const rows = filteredRows.map((t) => [
      `"${t.id}"`,
      `"${t.outletName}"`,
      `"${t.ownerName}"`,
      `"${t.ownerEmail}"`,
      `"${t.ownerPhone}"`,
      `"${t.address.replace(/"/g, '""')}"`,
      t.staffCount,
      `"${t.status}"`,
      `"${t.subscriptionStatus}"`,
      `"${t.subDateStr || "-"}"`,
      t.daysRemaining !== null ? t.daysRemaining : "-",
      t.orderCount,
      t.totalOmset,
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_platform_saas_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
            <span>Laporan Platform Super Admin</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Laporan Langganan & Jaringan Cabang
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Monitoring masa aktif toko, status langganan aplikasi, dan utilisasi pengguna platform.
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Download className="w-4 h-4" />
          <span>Ekspor Laporan (CSV)</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Toko */}
        <div className="bg-gradient-to-br from-blue-50/90 via-sky-50/40 to-white p-4 sm:p-5 rounded-2xl border border-blue-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-blue-800 font-semibold">
            <span>Total Cabang Toko</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Store className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {metrics.totalTenants}{" "}
            <span className="text-xs font-semibold text-zinc-500">Toko</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1">
            Terdaftar di platform
          </div>
        </div>

        {/* Toko Aktif */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Langganan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-900 mt-2 tracking-tight">
            {metrics.activeTenants}{" "}
            <span className="text-xs font-semibold text-emerald-700">Toko</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1">
            Masa aktif berjalan normal
          </div>
        </div>

        {/* Segera Habis */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Segera Berakhir (≤7 Hari)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-900 mt-2 tracking-tight">
            {metrics.expiringSoonTenants}{" "}
            <span className="text-xs font-semibold text-amber-700">Toko</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1">
            Perlu pengingat perpanjangan
          </div>
        </div>

        {/* Total Pengguna */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
            <span>Total Pengguna Platform</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {users.length}{" "}
            <span className="text-xs font-semibold text-zinc-500">Akun</span>
          </div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1">
            {metrics.totalOwners} Owner • {metrics.totalStaff} Staff
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-xs overflow-hidden">
        {/* Controls: Search & Status Filter */}
        <div className="p-4 border-b border-zinc-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-zinc-50/50">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama toko, nama owner, email, alamat..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-zinc-200 rounded-xl text-zinc-800 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
                statusFilter === "all"
                  ? "bg-zinc-900 text-white"
                  : "bg-white text-zinc-600 border border-zinc-200 hover:bg-zinc-100"
              }`}
            >
              Semua ({tenantRows.length})
            </button>
            <button
              onClick={() => setStatusFilter("active")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
                statusFilter === "active"
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              Aktif ({metrics.activeTenants})
            </button>
            <button
              onClick={() => setStatusFilter("expiring_soon")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
                statusFilter === "expiring_soon"
                  ? "bg-amber-600 text-white"
                  : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
              }`}
            >
              Segera Habis ({metrics.expiringSoonTenants})
            </button>
            <button
              onClick={() => setStatusFilter("expired")}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer shrink-0 ${
                statusFilter === "expired"
                  ? "bg-rose-700 text-white"
                  : "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50"
              }`}
            >
              Expired ({metrics.expiredTenants})
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-100/70 border-b border-zinc-200 text-zinc-600 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3 px-4">Toko / Outlet</th>
                <th className="py-3 px-4">Pemilik (Owner)</th>
                <th className="py-3 px-4">Staff Kasir</th>
                <th className="py-3 px-4">Status Langganan</th>
                <th className="py-3 px-4">Masa Aktif</th>
                <th className="py-3 px-4 text-right">Aktivitas Toko</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-zinc-400">
                    Tidak ada cabang yang sesuai dengan filter.
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => (
                  <tr key={row.id} className="hover:bg-zinc-50/80 transition">
                    {/* Toko */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-zinc-900">{row.outletName}</div>
                      <div className="text-[11px] text-zinc-400 truncate max-w-xs">{row.address}</div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900">{row.ownerName}</div>
                      <div className="text-[11px] text-zinc-500 flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3 text-zinc-400" />
                        <span>{row.ownerPhone}</span>
                      </div>
                    </td>

                    {/* Staff Count */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-zinc-100 text-zinc-700 border border-zinc-200">
                        <Users className="w-3 h-3 text-zinc-500" />
                        <span>{row.staffCount} Staff</span>
                      </span>
                    </td>

                    {/* Subscription Status */}
                    <td className="py-3.5 px-4">
                      {row.subscriptionStatus === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Aktif</span>
                        </span>
                      ) : row.subscriptionStatus === "expiring_soon" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sisa {row.daysRemaining} Hari</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          <span>Kadaluarsa</span>
                        </span>
                      )}
                    </td>

                    {/* Expiry Date */}
                    <td className="py-3.5 px-4 text-zinc-600">
                      {row.subDateStr ? (
                        <div>
                          <div className="font-semibold text-zinc-900">
                            {new Date(row.subDateStr).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </div>
                          {row.daysRemaining !== null && (
                            <div className="text-[10px] text-zinc-400">
                              {row.daysRemaining >= 0
                                ? `${row.daysRemaining} hari lagi`
                                : `Lewat ${Math.abs(row.daysRemaining)} hari`}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-zinc-400 italic">-</span>
                      )}
                    </td>

                    {/* Aktivitas */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-bold text-zinc-900">
                        {row.orderCount} <span className="font-normal text-zinc-400">order</span>
                      </div>
                      <div className="text-[10px] text-emerald-700 font-semibold">
                        Rp {row.totalOmset.toLocaleString("id-ID")}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Platform Report Pagination Bar */}
        {totalItems > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-zinc-50/60 border-t border-zinc-200/80 text-xs text-zinc-500">
            <div className="text-[11px]">
              Menampilkan{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min((validPage - 1) * pageSize + 1, totalItems)}
              </span>{" "}
              -{" "}
              <span className="font-semibold text-zinc-800">
                {Math.min(validPage * pageSize, totalItems)}
              </span>{" "}
              dari <span className="font-semibold text-zinc-800">{totalItems}</span> cabang
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-[11px]">
                <span>Baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-white border border-zinc-200 rounded px-2 py-1 text-xs outline-none cursor-pointer"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={validPage === 1}
                  className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 text-[11px] font-semibold text-zinc-700">
                  {validPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={validPage === totalPages}
                  className="p-1 rounded border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
