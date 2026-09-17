import React from "react";
import {
  TrendingUp,
  Building2,
  Users,
  ShoppingBag,
  Plus,
  ArrowRight,
} from "lucide-react";
import { CashflowStats, Order, Tenant, User, TabType } from "../../../types";

interface AdminOverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  users: User[];
  onSelectTenant?: (id: string) => void;
  onOpenTenantModal: () => void;
  onOpenUserModal: () => void;
  setActiveTab: (tab: TabType) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  orders,
  tenants,
  users,
  onOpenTenantModal,
  onOpenUserModal,
  setActiveTab,
}) => {
  // Sort tenants by total omset descending
  const sortedTenants = [...tenants].sort((a, b) => (b.totalOmset || 0) - (a.totalOmset || 0));

  // 6 latest orders across all branches
  const recentOrders = orders.slice(0, 6);

  // User role counts
  const ownerCount = users.filter((u) => u.role === "tenant_owner").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const adminCount = users.filter((u) => u.role === "superadmin").length;
  const activeUsersCount = users.filter((u) => u.status === "active" || !u.status).length;

  return (
    <div className="space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Ringkasan data operasional dan omset seluruh cabang.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTenantModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Cabang</span>
          </button>
          <button
            onClick={onOpenUserModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-700" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* 4 Multi-Branch KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Omset */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Total Omset</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-emerald-700/90 font-medium mt-1">
            Transaksi lunas
          </div>
        </div>

        {/* Total Cabang - Highlighted Light Blue Card */}
        <div className="bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 rounded-2xl border border-sky-300 shadow-sm relative overflow-hidden group hover:border-sky-400 transition">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-sky-400/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-sky-800 font-bold">
            <span>Total Cabang</span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {tenants.length} <span className="text-xs font-semibold text-sky-700">Cabang</span>
          </div>
          <div className="text-[11px] text-sky-700 font-medium mt-1 truncate">
            Rata-rata Rp {Math.round(stats.totalIncome / Math.max(1, tenants.length)).toLocaleString("id-ID")}
          </div>
        </div>

        {/* Total Pengguna */}
        <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/40 to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-sm relative overflow-hidden group hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-xs text-indigo-800 font-semibold">
            <span>Total Pengguna</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500 text-white flex items-center justify-center shadow-xs">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {users.length} <span className="text-xs font-semibold text-indigo-700">Akun</span>
          </div>
          <div className="text-[11px] text-indigo-700/90 font-medium mt-1">
            {activeUsersCount} pengguna aktif
          </div>
        </div>

        {/* Total Pesanan */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Total Pesanan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {stats.totalOrdersCount} <span className="text-xs font-semibold text-amber-700">Pesanan</span>
          </div>
          <div className="text-[11px] text-amber-700/90 font-medium mt-1">
            {stats.activeOrdersCount} sedang diproses
          </div>
        </div>
      </div>

      {/* Performa Cabang Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-sky-50/40 via-blue-50/20 to-transparent flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900 text-sm">
              Performa Cabang
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Kontribusi omset dan volume pesanan masing-masing cabang
            </p>
          </div>
          <button
            onClick={() => setActiveTab("tenants")}
            className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 transition cursor-pointer"
          >
            <span>Semua Cabang</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[650px]">
            <thead className="bg-zinc-50/70 border-b border-zinc-100 text-[11px] font-medium text-zinc-500">
              <tr>
                <th className="py-2.5 px-5 font-medium">Cabang</th>
                <th className="py-2.5 px-5 font-medium">Pemilik</th>
                <th className="py-2.5 px-5 text-center font-medium">Total Pesanan</th>
                <th className="py-2.5 px-5 text-right font-medium">Total Omset</th>
                <th className="py-2.5 px-5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {sortedTenants.map((t) => (
                <tr key={t.id} className="hover:bg-zinc-50/60 transition-colors">
                  <td className="py-3 px-5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-zinc-900 text-xs">{t.outletName}</div>
                        <div className="text-[11px] text-zinc-400 mt-0.5">{t.address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="font-medium text-zinc-700">{t.owner?.name || "Budi Santoso"}</div>
                    <div className="text-[11px] text-zinc-400 font-mono">{t.phone}</div>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-sky-50 text-sky-900 border border-sky-200/80">
                      {t.totalOrders || 0} Order
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-bold text-emerald-700 text-xs whitespace-nowrap">
                    Rp {(t.totalOmset || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                      Aktif
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2-Column Section: Latest Cross-Branch Orders & SaaS User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Cross-Branch Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-blue-50/30 via-sky-50/20 to-transparent flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 text-sm">
                Pesanan Terbaru
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Aliran pesanan terbaru dari seluruh cabang
              </p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs font-medium text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>Semua Pesanan</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 space-y-2">
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center text-zinc-400 text-xs">
                Belum ada transaksi di seluruh cabang
              </div>
            ) : (
              recentOrders.map((ord) => {
                const tenantOfOrder = tenants.find((t) => t.id === ord.tenantId);
                return (
                  <div
                    key={ord.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-zinc-50/60 border border-zinc-100 gap-2 hover:border-blue-200/80 hover:bg-blue-50/30 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 border border-blue-200/80">
                          {tenantOfOrder?.outletName || "Cabang"}
                        </span>
                        <span className="font-mono text-zinc-500 text-xs font-semibold">
                          {ord.invoiceNo}
                        </span>
                        <span className="text-xs text-zinc-700 font-medium">
                          {ord.customer?.name || "Pelanggan Umum"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-0.5">
                        {ord.serviceType} ({ord.weightOrQty} {ord.unit}) ·{" "}
                        <span>
                          {new Date(ord.createdAt).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-end sm:self-auto">
                      <span
                        className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                          ord.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80"
                            : "bg-amber-50 text-amber-700 border border-amber-200/80"
                        }`}
                      >
                        {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                      </span>
                      <span className="font-bold text-zinc-900 text-xs whitespace-nowrap">
                        Rp {ord.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Users Breakdown Panel (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-transparent flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-zinc-900 text-sm">
                Peran Pengguna
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Distribusi akun pengguna sistem
              </p>
            </div>
            <button
              onClick={() => setActiveTab("users")}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>Kelola Pengguna</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-violet-200/80 hover:bg-violet-50/20 transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  SA
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-xs">Super Admin</div>
                  <div className="text-[10px] text-zinc-400">Akses penuh seluruh sistem</div>
                </div>
              </div>
              <span className="text-xs font-bold text-violet-900 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md font-mono">{adminCount} Akun</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-sky-200/80 hover:bg-sky-50/20 transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  TO
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-xs">Tenant Owner</div>
                  <div className="text-[10px] text-zinc-400">Pemilik pengelola cabang</div>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-mono">{ownerCount} Akun</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-emerald-200/80 hover:bg-emerald-50/20 transition">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  KS
                </div>
                <div>
                  <div className="font-semibold text-zinc-900 text-xs">Kasir</div>
                  <div className="text-[10px] text-zinc-400">Petugas kasir dan pencucian</div>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">{staffCount} Akun</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
