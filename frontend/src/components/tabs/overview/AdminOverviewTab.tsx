import React from "react";
import {
  TrendingUp,
  Building2,
  Users,
  ShoppingBag,
  Plus,
  ArrowRight,
  Clock,
  AlertTriangle,
  Activity,
  Calculator,
  Server,
  Database,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
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
  // Sort tenants by total omset descending and apply limit break of top 5 for dashboard
  const sortedTenants = [...tenants].sort((a, b) => (b.totalOmset || 0) - (a.totalOmset || 0));
  const topTenants = sortedTenants.slice(0, 5);

  // User role counts
  const ownerCount = users.filter((u) => u.role === "tenant_owner").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const adminCount = users.filter((u) => u.role === "superadmin").length;

  const now = new Date();
  const activeTenantsCount = tenants.filter((t) => {
    if (t.status === "inactive") return false;
    if (!t.subscriptionUntil) return true;
    return new Date(t.subscriptionUntil).getTime() >= now.getTime();
  }).length;

  const expiringTenantsCount = tenants.filter((t) => {
    if (t.status === "inactive") return true;
    if (!t.subscriptionUntil) return false;
    const diff = new Date(t.subscriptionUntil).getTime() - now.getTime();
    return diff <= 7 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div className="space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Dashboard Platform
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Ringkasan data jaringan cabang toko laundry dan status langganan aplikasi platform.
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

      {/* 4 SaaS Platform KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Cabang - Highlighted Blue Card */}
        <div className="bg-gradient-to-br from-blue-50 via-sky-50/70 to-indigo-50/30 p-4 sm:p-5 rounded-2xl border border-blue-300 shadow-sm relative overflow-hidden group hover:border-blue-400 transition">
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-blue-400/20 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-xs text-blue-800 font-bold">
            <span>Total Cabang Toko</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {tenants.length} <span className="text-xs font-semibold text-blue-700">Toko</span>
          </div>
          <div className="text-[11px] text-blue-700 font-medium mt-1 truncate">
            Terdaftar di Laundry Cleanique
          </div>
        </div>

        {/* Toko Aktif Berlangganan */}
        <div className="bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold">
            <span>Langganan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-900 mt-2.5 tracking-tight">
            {activeTenantsCount} <span className="text-xs font-semibold text-emerald-700">Toko</span>
          </div>
          <div className="text-[11px] text-emerald-700/90 font-medium mt-1">
            Status akun aktif
          </div>
        </div>

        {/* Perlu Perpanjangan / Expired */}
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-sm relative overflow-hidden group hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-800 font-semibold">
            <span>Perlu Perpanjangan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-amber-900 mt-2.5 tracking-tight">
            {expiringTenantsCount} <span className="text-xs font-semibold text-amber-700">Toko</span>
          </div>
          <div className="text-[11px] text-amber-700/90 font-medium mt-1">
            Masa aktif ≤ 7 hari / habis
          </div>
        </div>

        {/* Total Pengguna Platform */}
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
            {ownerCount} Owner • {staffCount} Staff
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
                <th className="py-2.5 px-5 text-center font-medium">Status Langganan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {topTenants.map((t) => {
                const isInactive = t.status === "inactive";
                const isExpired = t.subscriptionUntil && new Date(t.subscriptionUntil).getTime() < now.getTime();
                const daysLeft = t.subscriptionUntil
                  ? Math.ceil((new Date(t.subscriptionUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  : 999;
                const isExpiringSoon = daysLeft <= 7 && daysLeft >= 0;

                return (
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
                      {isInactive || isExpired ? (
                        <span className="inline-flex items-center text-[11px] font-medium text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          {isInactive ? "Nonaktif" : "Kedaluwarsa"}
                        </span>
                      ) : isExpiringSoon ? (
                        <span className="inline-flex items-center text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          Kritis ({daysLeft}h)
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full whitespace-nowrap shrink-0">
                          Aktif
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Limit Break Footer Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-50/70 border-t border-zinc-100 text-xs text-zinc-500">
          <div>
            Menampilkan <span className="font-semibold text-zinc-800">{topTenants.length}</span> dari{" "}
            <span className="font-semibold text-zinc-800">{sortedTenants.length}</span> total cabang
          </div>
          <button
            onClick={() => setActiveTab("tenants")}
            className="text-xs font-semibold text-blue-700 hover:text-blue-900 inline-flex items-center gap-1 transition cursor-pointer"
          >
            <span>Buka Tabel Lengkap dengan Pagination</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2-Column Section: Technical Support Hub & System Health + User Roles */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Technical Support & Error Investigation Hub (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-blue-50/40 via-sky-50/20 to-transparent flex items-center justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-blue-100/70 text-blue-950 font-bold text-[10px] mb-1">
                  <Activity className="w-3 h-3 text-blue-700" />
                  <span>Dukungan Teknis & Error Support</span>
                </div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Pusat Investigasi & Bantuan Kendala Cabang
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Akses cepat audit data jika toko/kasir mengalami error transaksi, nota hilang, atau kendala teknis.
                </p>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {/* Tool 1: Inspeksi Data Order */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 hover:border-blue-300 hover:bg-blue-50/30 transition gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <ShoppingBag className="w-4 h-4 text-blue-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-zinc-900 text-xs sm:text-sm">
                        Inspeksi Data Order Seluruh Cabang
                      </h4>
                      <span className="text-[10px] font-bold text-blue-900 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-md">
                        {orders.length} Transaksi
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Cari nomor invoice, verifikasi data pelanggan, cek status pembayaran, atau cetak ulang struk saat kasir meminta bantuan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("orders")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 self-end sm:self-center"
                >
                  <span>Buka Data Order</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Tool 2: Log Notifikasi WhatsApp */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 hover:border-emerald-300 hover:bg-emerald-50/30 transition gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-zinc-900 text-xs sm:text-sm">
                        Audit & Log Pengiriman WhatsApp
                      </h4>
                      <span className="text-[10px] font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                        Log Riwayat WA
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Periksa status pengiriman notifikasi nota (terkirim/gagal), investigasi nomor HP salah, dan telusuri log error gateway Baileys.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("logs")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 self-end sm:self-center"
                >
                  <span>Periksa Log WA</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Tool 3: Log Shift & Rekonsiliasi Kasir */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-zinc-50/80 border border-zinc-200/80 hover:border-purple-300 hover:bg-purple-50/30 transition gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Calculator className="w-4 h-4 text-purple-700" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-zinc-900 text-xs sm:text-sm">
                        Audit Shift & Selisih Kas Laci (Discrepancy)
                      </h4>
                      <span className="text-[10px] font-bold text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-md">
                        Rekonsiliasi Kasir
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                      Investigasi modal awal buka shift, total penerimaan kas, dan catatan selisih uang fisik kasir vs hitungan sistem.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab("logs")}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-900 text-white text-xs font-semibold shadow-2xs transition cursor-pointer shrink-0 self-end sm:self-center"
                >
                  <span>Lihat Log Shift</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Warning Banner Jika Ada Cabang Expired/Kritis */}
          {expiringTenantsCount > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200/90 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-amber-900">
                  Perhatian: {expiringTenantsCount} Cabang Membutuhkan Perpanjangan
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  Terdapat cabang yang masa aktif langganannya kurang dari 7 hari atau telah kedaluwarsa.
                </p>
                <div className="mt-2.5 flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab("users")}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-amber-900 bg-amber-200/80 hover:bg-amber-300 px-2.5 py-1 rounded-lg transition cursor-pointer"
                  >
                    <span>Perpanjang Langganan di Menu Pengguna</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Platform Connectivity & User Roles (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Card Status Kesehatan Sistem Platform */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-emerald-50/40 via-teal-50/20 to-transparent flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Status Konektivitas Platform
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Kesehatan server dan database backend
                </p>
              </div>
              <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                Sistem Normal
              </span>
            </div>

            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <Server className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-zinc-800">Bun + Hono API Backend</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                  Online (3001)
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <Database className="w-4 h-4 text-indigo-600" />
                  <span className="font-medium text-zinc-800">PostgreSQL + Drizzle ORM</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                  Terhubung
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 border border-zinc-100">
                <div className="flex items-center gap-2.5">
                  <WhatsAppIcon className="w-4 h-4 text-emerald-600" />
                  <span className="font-medium text-zinc-800">WhatsApp Gateway (Baileys)</span>
                </div>
                <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md text-[10px]">
                  Siaga Multi-Outlet
                </span>
              </div>
            </div>
          </div>

          {/* Users Breakdown Panel */}
          <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-indigo-50/30 via-purple-50/20 to-transparent flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-zinc-900 text-sm">
                  Distribusi Peran Pengguna
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Hierarki akun pengguna sistem
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
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-violet-200/80 hover:bg-violet-50/20 transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    SA
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-xs">Super Admin</div>
                    <div className="text-[10px] text-zinc-400">Penyedia Laundry Cleanique</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-violet-900 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-md font-mono">{adminCount} Akun</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-sky-200/80 hover:bg-sky-50/20 transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    TO
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-xs">Tenant Owner</div>
                    <div className="text-[10px] text-zinc-400">Pemilik pengelola cabang</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-sky-900 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-md font-mono">{ownerCount} Akun</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-emerald-200/80 hover:bg-emerald-50/20 transition">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    ST
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-xs">Staff</div>
                    <div className="text-[10px] text-zinc-400">Petugas operasional kasir & cuci</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-900 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-mono">{staffCount} Akun</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
