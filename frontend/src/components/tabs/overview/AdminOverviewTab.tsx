import React from "react";
import {
  TrendingUp,
  Building2,
  Users,
  ShoppingBag,
  ShieldCheck,
  Plus,
  ArrowRight,
  Store,
  ExternalLink,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";
import { CashflowStats, Order, Tenant, User, TabType } from "../../../types";

interface AdminOverviewTabProps {
  stats: CashflowStats;
  orders: Order[];
  tenants: Tenant[];
  users: User[];
  onSelectTenant: (id: string) => void;
  onOpenTenantModal: () => void;
  onOpenUserModal: () => void;
  setActiveTab: (tab: TabType) => void;
}

export const AdminOverviewTab: React.FC<AdminOverviewTabProps> = ({
  stats,
  orders,
  tenants,
  users,
  onSelectTenant,
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
      {/* SaaS HQ Executive Banner */}
      <div className="relative overflow-hidden bg-gradient-to-br from-zinc-950 via-blue-950 to-blue-900 rounded-2xl p-6 sm:p-7 text-white shadow-xl border border-blue-900/50">
        <div className="absolute -top-8 -right-8 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-36 h-36 bg-sky-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-900/60 text-xs font-semibold text-blue-200 border border-blue-700/60 backdrop-blur-md mb-2.5">
              <Building2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Orchid Central HQ · SaaS Multi-Tenant Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Dashboard Eksekutif Pusat
            </h1>
            <p className="text-blue-200/80 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">
              Pusat kendali operasional konsolidasian, pemantauan omset seluruh cabang, dan manajemen
              lisensi tenant Orchid Smart Laundry.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={onOpenTenantModal}
              className="bg-white hover:bg-blue-50 text-blue-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition shadow-md cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-700 stroke-[2.5]" />
              <span>Daftarkan Cabang</span>
            </button>
            <button
              onClick={onOpenUserModal}
              className="bg-blue-900/60 hover:bg-blue-900 text-white font-semibold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 transition border border-blue-700/60 backdrop-blur-md cursor-pointer"
            >
              <Users className="w-4 h-4 text-sky-300" />
              <span>Tambah User & Lisensi</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Multi-Branch KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset Platform */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">
              Omset Konsolidasi Pusat
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 mt-2 font-mono tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-500 mt-1.5 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Pendapatan lunas dari seluruh cabang</span>
          </p>
        </div>

        {/* Total Cabang Aktif */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">
              Jaringan Cabang Outlet
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 mt-2 tracking-tight">
            {tenants.length}{" "}
            <span className="text-sm font-normal text-zinc-500">Cabang Aktif</span>
          </div>
          <p className="text-[11px] text-blue-700 font-medium mt-1.5">
            Rata-rata: Rp{" "}
            {Math.round(stats.totalIncome / Math.max(1, tenants.length)).toLocaleString("id-ID")} /
            cabang
          </p>
        </div>

        {/* Total Pengguna & Lisensi */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">
              Akun & Lisensi SaaS
            </span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 mt-2 tracking-tight">
            {users.length} <span className="text-sm font-normal text-zinc-500">Pengguna</span>
          </div>
          <p className="text-[11px] text-emerald-700 font-medium mt-1.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>{activeUsersCount} akun aktif & berlangganan</span>
          </p>
        </div>

        {/* Total Transaksi Jaringan */}
        <div className="bg-white p-4.5 rounded-xl border border-zinc-200 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-[10px] text-zinc-500">
              Total Pesanan Masuk
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-zinc-900 mt-2 tracking-tight">
            {stats.totalOrdersCount}{" "}
            <span className="text-sm font-normal text-zinc-500">Pesanan</span>
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1.5">
            {stats.activeOrdersCount} pesanan sedang dalam proses cuci
          </p>
        </div>
      </div>

      {/* Performa Cabang (Tenant Leaderboard Table) */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-zinc-900 text-base flex items-center gap-2">
              <Store className="w-4 h-4 text-blue-700" />
              <span>Papan Performa Cabang Outlet</span>
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Tinjau kontribusi omset, volume cucian, dan jalankan inspeksi langsung ke masing-masing
              outlet
            </p>
          </div>
          <button
            onClick={() => setActiveTab("tenants")}
            className="text-xs font-semibold text-blue-800 hover:text-blue-950 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
          >
            <span>Buka Manajemen Cabang</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Table */}
        <div className="border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs min-w-[700px]">
              <thead className="bg-zinc-50/80 border-b border-zinc-200 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nama Outlet</th>
                  <th className="py-3 px-4">Pemilik (Owner)</th>
                  <th className="py-3 px-4 text-center">Total Transaksi</th>
                  <th className="py-3 px-4 text-right">Omset Lunas</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {sortedTenants.map((t) => (
                  <tr key={t.id} className="hover:bg-blue-50/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-zinc-900 text-xs">{t.outletName}</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">{t.address}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-zinc-800">
                        {t.owner?.name || "Budi Santoso"}
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono">{t.phone}</div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-zinc-100 text-zinc-700">
                        {t.totalOrders || 0} Order
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 text-xs">
                      Rp {(t.totalOmset || 0).toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Aktif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectTenant(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition shadow-2xs cursor-pointer"
                        title="Buka dashboard operasional cabang ini"
                      >
                        <span>Inspeksi Cabang</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 2-Column Section: Latest Cross-Branch Orders & SaaS User Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Recent Cross-Branch Orders (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div>
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <ShoppingBag className="w-4 h-4 text-blue-700" />
                <span>Transaksi Masuk Lintas Cabang</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Aliran pesanan laundry terbaru dari seluruh outlet jaringan
              </p>
            </div>
            <button
              onClick={() => setActiveTab("orders")}
              className="text-xs font-semibold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 transition cursor-pointer"
            >
              Semua Pesanan <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2.5">
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
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-zinc-50/70 border border-zinc-200 gap-2 hover:border-zinc-300 transition"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold bg-blue-900 text-white px-2 py-0.5 rounded">
                          {tenantOfOrder?.outletName || "Cabang Outlet"}
                        </span>
                        <span className="font-mono font-bold text-zinc-800 text-xs">
                          {ord.invoiceNo}
                        </span>
                        <span className="text-xs text-zinc-600 font-medium">
                          {ord.customer?.name || "Pelanggan Umum"}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {ord.serviceType} ({ord.weightOrQty} {ord.unit}) ·{" "}
                        <span className="font-semibold text-zinc-700">
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
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          ord.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {ord.paymentStatus === "paid" ? "Lunas" : "Belum Lunas"}
                      </span>
                      <span className="font-mono font-bold text-zinc-900 text-xs">
                        Rp {ord.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* SaaS Users & License Health Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>Distribusi Lisensi Pengguna</span>
              </h3>
              <button
                onClick={() => setActiveTab("users")}
                className="text-xs font-semibold text-blue-800 hover:text-blue-950 flex items-center gap-1 transition cursor-pointer"
              >
                Kelola <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Role Breakdown List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-900 text-white flex items-center justify-center text-xs font-bold">
                    HQ
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 text-xs">Super Admin (Pusat)</div>
                    <div className="text-[10px] text-zinc-500">Akses penuh seluruh sistem SaaS</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-blue-900 font-mono">{adminCount} Akun</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-700 text-white flex items-center justify-center text-xs font-bold">
                    TO
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 text-xs">Pemilik Cabang (Tenant)</div>
                    <div className="text-[10px] text-zinc-500">Owner pengelola bisnis laundry</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-zinc-900 font-mono">{ownerCount} Akun</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-200">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center text-xs font-bold">
                    ST
                  </div>
                  <div>
                    <div className="font-bold text-zinc-900 text-xs">Staff / Operator Kasir</div>
                    <div className="text-[10px] text-zinc-500">Petugas kasir dan pencucian</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-zinc-900 font-mono">{staffCount} Akun</span>
              </div>
            </div>

            {/* Quick Action Link */}
            <button
              onClick={onOpenUserModal}
              className="w-full py-2.5 rounded-xl bg-zinc-50 hover:bg-zinc-100 text-zinc-800 font-bold text-xs flex items-center justify-center gap-1.5 transition border border-zinc-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Daftarkan Akun Pengguna Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
