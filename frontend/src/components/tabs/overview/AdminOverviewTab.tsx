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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Cabang</span>
          </button>
          <button
            onClick={onOpenUserModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-medium shadow-xs transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-zinc-500" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* 4 Multi-Branch KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Omset */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">Total Omset</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 font-mono tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            Transaksi lunas
          </div>
        </div>

        {/* Total Cabang */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">Total Cabang</span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {tenants.length} <span className="text-xs font-normal text-zinc-400">Cabang</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1 truncate">
            Rata-rata: Rp {Math.round(stats.totalIncome / Math.max(1, tenants.length)).toLocaleString("id-ID")} / cabang
          </div>
        </div>

        {/* Total Pengguna */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">Total Pengguna</span>
            <Users className="w-4 h-4 text-zinc-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {users.length} <span className="text-xs font-normal text-zinc-400">Akun</span>
          </div>
          <div className="text-[11px] text-emerald-600 font-medium mt-1">
            {activeUsersCount} akun aktif
          </div>
        </div>

        {/* Total Pesanan */}
        <div className="bg-white p-4 rounded-xl border border-zinc-200/80 shadow-xs">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-medium">Total Pesanan</span>
            <ShoppingBag className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            {stats.totalOrdersCount} <span className="text-xs font-normal text-zinc-400">Pesanan</span>
          </div>
          <div className="text-[11px] text-zinc-400 mt-1">
            {stats.activeOrdersCount} sedang diproses
          </div>
        </div>
      </div>

      {/* Performa Cabang Table */}
      <div className="bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
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
            className="text-xs font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition cursor-pointer"
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
                    <div className="font-semibold text-zinc-900 text-xs">{t.outletName}</div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{t.address}</div>
                  </td>
                  <td className="py-3 px-5">
                    <div className="font-medium text-zinc-700">{t.owner?.name || "Budi Santoso"}</div>
                    <div className="text-[11px] text-zinc-400 font-mono">{t.phone}</div>
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-100 text-zinc-700">
                      {t.totalOrders || 0} Order
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right font-mono font-semibold text-zinc-900 text-xs">
                    Rp {(t.totalOmset || 0).toLocaleString("id-ID")}
                  </td>
                  <td className="py-3 px-5 text-center">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
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
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
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
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition cursor-pointer"
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg bg-zinc-50/60 border border-zinc-100 gap-2 hover:border-zinc-200 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-zinc-900 text-xs">
                          {tenantOfOrder?.outletName || "Cabang"}
                        </span>
                        <span className="font-mono text-zinc-400 text-xs">
                          {ord.invoiceNo}
                        </span>
                        <span className="text-xs text-zinc-600">
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
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                          ord.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                      </span>
                      <span className="font-mono font-semibold text-zinc-900 text-xs">
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
        <div className="lg:col-span-5 bg-white rounded-xl border border-zinc-200/80 shadow-xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-100 flex items-center justify-between">
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
              className="text-xs font-medium text-zinc-600 hover:text-zinc-900 inline-flex items-center gap-1 transition cursor-pointer"
            >
              <span>Kelola Pengguna</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50/60 border border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-900 text-white flex items-center justify-center text-xs font-semibold">
                  SA
                </div>
                <div>
                  <div className="font-medium text-zinc-900 text-xs">Super Admin</div>
                  <div className="text-[10px] text-zinc-400">Akses penuh seluruh sistem</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-zinc-900 font-mono">{adminCount} Akun</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50/60 border border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-700 text-white flex items-center justify-center text-xs font-semibold">
                  TO
                </div>
                <div>
                  <div className="font-medium text-zinc-900 text-xs">Tenant Owner</div>
                  <div className="text-[10px] text-zinc-400">Pemilik pengelola cabang</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-zinc-900 font-mono">{ownerCount} Akun</span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-50/60 border border-zinc-100">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-zinc-400 text-white flex items-center justify-center text-xs font-semibold">
                  KS
                </div>
                <div>
                  <div className="font-medium text-zinc-900 text-xs">Kasir</div>
                  <div className="text-[10px] text-zinc-400">Petugas kasir dan pencucian</div>
                </div>
              </div>
              <span className="text-xs font-semibold text-zinc-900 font-mono">{staffCount} Akun</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
