import React, { useState, useEffect, useMemo } from "react";
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
  Server,
  Database,
  CheckCircle2,
  Eye,
  BarChart3,
  Calendar,
  Filter,
  Layers,
  ArrowUpDown,
  RotateCcw,
  X,
} from "lucide-react";
import WhatsAppIcon from "../../common/WhatsAppIcon";
import { CashflowStats, Order, Tenant, User, TabType, SubscriptionInvoice } from "../../../types";
import { api } from "../../../utils/api";
import { DonutChart, BarChart, AreaLineChart, HorizontalBarList } from "../../common/Charts";
import {
  DashboardPeriod,
  PERIOD_OPTIONS,
  generateTrendData,
  generateBranchPerformance,
} from "../../../utils/dashboardPeriodUtils";
import { formatCurrency } from "../../../utils/formatUtils";

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
  const [pendingInvoices, setPendingInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [previewProofUrl, setPreviewProofUrl] = useState<string | null>(null);

  // Dashboard Filters State
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>("7d");
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>("all");
  const [branchViewMode, setBranchViewMode] = useState<"ranking" | "bars">("ranking");
  const [branchSortBy, setBranchSortBy] = useState<"omset" | "orders">("omset");

  useEffect(() => {
    const fetchPending = async () => {
      setLoadingPending(true);
      try {
        const res = await api.get<{ success: boolean; data: SubscriptionInvoice[] }>(
          "/api/subscription/invoices?status=pending_verification"
        );
        if (res.success && res.data) {
          setPendingInvoices(res.data);
        }
      } catch (err) {
        console.error("Gagal mengambil tagihan pending verifikasi:", err);
      } finally {
        setLoadingPending(false);
      }
    };
    fetchPending();
  }, []);

  // Sort tenants by subscription urgency for platform monitoring
  const sortedTenants = [...tenants].sort((a, b) => {
    const timeA = a.subscriptionUntil ? new Date(a.subscriptionUntil).getTime() : Infinity;
    const timeB = b.subscriptionUntil ? new Date(b.subscriptionUntil).getTime() : Infinity;
    return timeA - timeB;
  });
  const topTenants = sortedTenants.slice(0, 5);

  // User role counts
  const ownerCount = users.filter((u) => u.role === "tenant_owner").length;
  const staffCount = users.filter((u) => u.role === "staff").length;
  const adminCount = users.filter((u) => u.role === "superadmin").length;
  const marketingCount = users.filter((u) => u.role === "marketing").length;

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

  // Selected single tenant name (if filtered)
  const selectedTenantObj = useMemo(() => {
    if (selectedTenantFilter === "all") return null;
    return tenants.find((t) => t.id === selectedTenantFilter) || null;
  }, [tenants, selectedTenantFilter]);

  // 1. Data Tren Omset (Dynamic Period & Dynamic Outlet Filter)
  const networkTrend = useMemo(() => {
    return generateTrendData(orders, selectedPeriod, {
      tenantId: selectedTenantFilter,
    });
  }, [orders, selectedPeriod, selectedTenantFilter]);

  // 2. Data Status Lisensi Tenant (DonutChart)
  const licenseDistributionData = useMemo(() => {
    let active = 0;
    let critical = 0;
    let expired = 0;
    let trial = 0;

    tenants.forEach((t) => {
      if (t.status === "inactive") {
        expired++;
      } else if (!t.subscriptionUntil) {
        trial++;
      } else {
        const diffDays = Math.ceil(
          (new Date(t.subscriptionUntil).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays < 0) {
          expired++;
        } else if (diffDays <= 7) {
          critical++;
        } else {
          active++;
        }
      }
    });

    const items = [
      { label: "Aktif Berlangganan", value: active, color: "#10b981" },
      { label: "Masa Percobaan (Trial)", value: trial, color: "#6366f1" },
      { label: "Masa Kritis (≤7 Hari)", value: critical, color: "#f59e0b" },
      { label: "Kedaluwarsa / Nonaktif", value: expired, color: "#ef4444" },
    ].filter((item) => item.value > 0);

    return items.length > 0 ? items : [{ label: "Belum Ada Toko", value: 1, color: "#94a3b8" }];
  }, [tenants, now]);

  // 3. Data Performa Cabang (Ranking & Bar List)
  const branchPerformance = useMemo(() => {
    return generateBranchPerformance(orders, tenants, selectedPeriod);
  }, [orders, tenants, selectedPeriod]);

  // Sorted branch items according to user toggle (omset vs orders)
  const sortedBranchItems = useMemo(() => {
    const list = [...branchPerformance.branches];
    if (branchSortBy === "orders") {
      list.sort((a, b) => b.orderCount - a.orderCount || b.totalOmset - a.totalOmset);
    } else {
      list.sort((a, b) => b.totalOmset - a.totalOmset || b.orderCount - a.orderCount);
    }
    return list.map((b, idx) => ({ ...b, rank: idx + 1 }));
  }, [branchPerformance.branches, branchSortBy]);

  // Transform for vertical BarChart mode
  const branchBarChartData = useMemo(() => {
    return sortedBranchItems.slice(0, 6).map((b) => ({
      label: b.outletName,
      value: branchSortBy === "orders" ? b.orderCount : b.totalOmset,
      displayValue:
        branchSortBy === "orders" ? `${b.orderCount} Order` : formatCurrency(b.totalOmset),
      color: b.color || "#2563eb",
      secondaryLabel:
        branchSortBy === "orders" ? formatCurrency(b.totalOmset) : `${b.orderCount} Order`,
    }));
  }, [sortedBranchItems, branchSortBy]);

  return (
    <div className="space-y-6">
      {/* Clean Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
              Dashboard Platform
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
              Super Admin HQ
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Ringkasan data jaringan cabang toko laundry dan status langganan aplikasi platform.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenTenantModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Cabang</span>
          </button>
          <button
            onClick={onOpenUserModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-100 text-blue-900 text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-blue-700" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Modern Dashboard Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 p-3 sm:p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Time Period Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <div className="flex items-center gap-1.5 mr-2 text-xs font-bold text-zinc-500 shrink-0">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span>Periode:</span>
          </div>
          {PERIOD_OPTIONS.map((opt) => {
            const isSelected = selectedPeriod === opt.value;
            return (
              <button
                key={opt.value}
                onClick={() => setSelectedPeriod(opt.value)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer shrink-0 ${
                  isSelected
                    ? "bg-blue-700 text-white shadow-xs font-bold"
                    : "bg-zinc-100/80 hover:bg-zinc-200/70 text-zinc-700 hover:text-zinc-900"
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Right: Outlet / Cabang Dropdown Filter */}
        <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={selectedTenantFilter}
              onChange={(e) => setSelectedTenantFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-800 outline-none cursor-pointer pr-1"
            >
              <option value="all">🏢 Semua Cabang Toko ({tenants.length})</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.outletName}
                </option>
              ))}
            </select>
          </div>

          {/* Reset filter button if not default */}
          {(selectedPeriod !== "7d" || selectedTenantFilter !== "all") && (
            <button
              onClick={() => {
                setSelectedPeriod("7d");
                setSelectedTenantFilter("all");
              }}
              title="Reset ke default (7 Hari & Semua Cabang)"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-semibold transition cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}

          <div className="hidden lg:flex items-center gap-1 text-[11px] font-medium text-zinc-400 border-l border-zinc-200 pl-2">
            <span>{networkTrend.dateRangeText}</span>
          </div>
        </div>
      </div>

      {/* 4 SaaS Platform KPI Cards (Unified, Polished & Responsive) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Total Cabang */}
        <div className="bg-gradient-to-br from-blue-50/80 via-white to-white p-4 sm:p-5 rounded-2xl border border-blue-200/90 shadow-2xs hover:shadow-xs hover:border-blue-300 transition">
          <div className="flex items-center justify-between text-xs text-blue-900 font-bold">
            <span>Total Cabang Toko</span>
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-2.5 tracking-tight font-mono">
            {tenants.length} <span className="text-xs font-semibold text-blue-700 font-sans">Toko</span>
          </div>
          <div className="text-[11px] text-zinc-500 font-medium mt-1 truncate">
            {selectedTenantObj ? (
              <span className="text-blue-700 font-semibold truncate block">
                Fokus: {selectedTenantObj.outletName}
              </span>
            ) : (
              "Terdaftar di Laundry Cleanique"
            )}
          </div>
        </div>

        {/* Toko Aktif Berlangganan */}
        <div className="bg-gradient-to-br from-emerald-50/80 via-white to-white p-4 sm:p-5 rounded-2xl border border-emerald-200/90 shadow-2xs hover:shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-xs text-emerald-900 font-bold">
            <span>Langganan Aktif</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-2.5 tracking-tight font-mono">
            {activeTenantsCount} <span className="text-xs font-semibold text-emerald-700 font-sans">Toko</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-medium mt-1 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Status operasional normal</span>
          </div>
        </div>

        {/* Perlu Perpanjangan / Expired */}
        <div className="bg-gradient-to-br from-amber-50/80 via-white to-white p-4 sm:p-5 rounded-2xl border border-amber-200/90 shadow-2xs hover:shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-xs text-amber-900 font-bold">
            <span>Perlu Perpanjangan</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-2.5 tracking-tight font-mono">
            {expiringTenantsCount} <span className="text-xs font-semibold text-amber-700 font-sans">Toko</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium mt-1 truncate">
            Masa aktif ≤ 7 hari / habis
          </div>
        </div>

        {/* Dynamic Omset Periode Terpilih */}
        <div className="bg-gradient-to-br from-indigo-50/80 via-white to-white p-4 sm:p-5 rounded-2xl border border-indigo-200/90 shadow-2xs hover:shadow-xs hover:border-indigo-300 transition">
          <div className="flex items-center justify-between text-xs text-indigo-900 font-bold">
            <span>Omset {networkTrend.periodLabel}</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-zinc-900 mt-2.5 tracking-tight font-mono truncate">
            {formatCurrency(networkTrend.totalOmset)}
          </div>
          <div className="text-[11px] text-indigo-700 font-medium mt-1 truncate">
            {networkTrend.totalOrders} Transaksi · {ownerCount} Owner
          </div>
        </div>
      </div>

      {/* Pending Renewal Invoices Notification Card */}
      {pendingInvoices.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-emerald-500/10 to-blue-500/10 border-2 border-amber-300 rounded-3xl p-5 shadow-sm space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/60 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm shrink-0 animate-pulse">
                <Clock className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">
                    Menunggu Verifikasi Perpanjangan Langganan
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-2xs">
                    {pendingInvoices.length} Pengajuan
                  </span>
                </div>
                <p className="text-xs text-zinc-600 mt-0.5">
                  Outlet telah mengunggah bukti pembayaran via QRIS dan menunggu approval Superadmin untuk memperpanjang masa aktif.
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab("cashflow")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold shadow-xs transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              <span>Buka Menu Approval</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingInvoices.map((inv) => (
              <div
                key={inv.id}
                className="bg-white p-4 rounded-2xl border border-zinc-200 shadow-2xs hover:border-amber-400 transition space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-zinc-900">
                    #{inv.invoiceNo}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {inv.durationMonths} Bulan
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center shrink-0">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-bold text-zinc-900 text-xs truncate">
                      {inv.outletName || "Cabang Toko"}
                    </h4>
                    <span className="text-[10px] text-zinc-400 block font-mono">
                      {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-between text-xs">
                  <span className="text-zinc-500 text-[11px]">Nominal Bayar:</span>
                  <span className="font-mono font-black text-emerald-700 text-sm">
                    Rp {inv.finalAmount.toLocaleString("id-ID")}
                  </span>
                </div>

                <div className="pt-1 flex items-center gap-2">
                  {inv.paymentProofUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewProofUrl(inv.paymentProofUrl || null)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 text-center text-xs font-semibold inline-flex items-center justify-center gap-1 transition cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Bukti Struk</span>
                    </button>
                  )}
                  <button
                    onClick={() => setActiveTab("cashflow")}
                    className="flex-1 py-1.5 px-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-center text-xs font-bold inline-flex items-center justify-center gap-1 transition cursor-pointer shadow-2xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Verifikasi</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SaaS Analytics Visual Charts Grid */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-zinc-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-700" />
              <span>Analitik Visual & Performa Platform</span>
            </h2>
            <p className="text-xs text-zinc-500">
              Visualisasi tren transaksi jaringan ({networkTrend.periodLabel}), status lisensi outlet, dan kontribusi cabang
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Chart 1: Tren Omset (AreaLineChart) */}
          <div className="lg:col-span-2">
            <AreaLineChart
              title={
                selectedTenantObj
                  ? `Tren Omset: ${selectedTenantObj.outletName}`
                  : `Tren Omset Jaringan Laundry`
              }
              subtitle={`Total nilai transaksi cucian pada rentang ${networkTrend.periodLabel}`}
              data={networkTrend.chartData}
              height={230}
              currencyPrefix="Rp "
              color="#2563eb"
              summaryMetrics={{
                totalLabel: `Total Omset (${networkTrend.periodLabel})`,
                totalValue: networkTrend.totalOmset,
                avgLabel: "Rata-rata Harian",
                avgValue: networkTrend.averageOmset,
                peakLabel: networkTrend.peakPoint ? `Puncak (${networkTrend.peakPoint.label})` : "Puncak",
                peakValue: networkTrend.peakPoint ? networkTrend.peakPoint.value : 0,
              }}
            />
          </div>

          {/* Chart 2: Status Lisensi Toko (DonutChart) */}
          <div className="lg:col-span-1">
            <DonutChart
              title="Status Lisensi Outlet"
              subtitle="Komposisi aktif, trial, dan masa kritis"
              data={licenseDistributionData}
              centerTitle={`${tenants.length}`}
              centerSubtitle="Total Toko"
              size={140}
            />
          </div>
        </div>

        {/* Chart 3: Aktivitas & Performa per Cabang Toko (Horizontal Ranking & Bar Chart Toggle) */}
        <div className="w-full">
          {branchViewMode === "ranking" ? (
            <HorizontalBarList
              title="Aktivitas & Performa per Cabang Toko"
              subtitle={`Peringkat cabang berdasarkan ${
                branchSortBy === "omset" ? "nilai omset" : "jumlah transaksi order"
              } (${networkTrend.periodLabel})`}
              items={sortedBranchItems.map((b) => ({
                id: b.id,
                rank: b.rank,
                label: b.outletName,
                subLabel: `${b.address} · Telp: ${b.phone}`,
                value: branchSortBy === "omset" ? b.totalOmset : b.orderCount,
                formattedValue:
                  branchSortBy === "omset" ? b.formattedOmset : `${b.orderCount} Order`,
                secondaryValue:
                  branchSortBy === "omset" ? `${b.orderCount} Order` : b.formattedOmset,
                percentage: b.percentageShare,
                color: b.color,
              }))}
              actionSlot={
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  {/* Sort By Toggle */}
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <button
                      onClick={() => setBranchSortBy("omset")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition ${
                        branchSortBy === "omset"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                          : "hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Omset (Rp)
                    </button>
                    <button
                      onClick={() => setBranchSortBy("orders")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition ${
                        branchSortBy === "orders"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                          : "hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Order
                    </button>
                  </div>

                  {/* View Mode Toggle */}
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <button
                      onClick={() => setBranchViewMode("ranking")}
                      className="px-2 sm:px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                      title="Lihat dalam bentuk list ranking lengkap"
                    >
                      Ranking
                    </button>
                    <button
                      onClick={() => setBranchViewMode("bars")}
                      className="px-2 sm:px-2.5 py-1 rounded-lg hover:text-zinc-900 dark:hover:text-white transition"
                      title="Lihat dalam bentuk grafik batang vertikal"
                    >
                      Grafik
                    </button>
                  </div>
                </div>
              }
            />
          ) : (
            <BarChart
              title="Aktivitas Transaksi per Cabang Toko"
              subtitle={`Volume pesanan & transaksi cucian setiap cabang (${networkTrend.periodLabel})`}
              data={branchBarChartData}
              height={200}
              barColor="#2563eb"
              actionSlot={
                <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <button
                      onClick={() => setBranchSortBy("omset")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition ${
                        branchSortBy === "omset"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                          : "hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Omset (Rp)
                    </button>
                    <button
                      onClick={() => setBranchSortBy("orders")}
                      className={`px-2 sm:px-2.5 py-1 rounded-lg transition ${
                        branchSortBy === "orders"
                          ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                          : "hover:text-zinc-900 dark:hover:text-white"
                      }`}
                    >
                      Order
                    </button>
                  </div>
                  <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 sm:p-1 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    <button
                      onClick={() => setBranchViewMode("ranking")}
                      className="px-2 sm:px-2.5 py-1 rounded-lg hover:text-zinc-900 dark:hover:text-white transition"
                    >
                      Ranking
                    </button>
                    <button
                      onClick={() => setBranchViewMode("bars")}
                      className="px-2 sm:px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white font-bold shadow-2xs"
                    >
                      Grafik
                    </button>
                  </div>
                </div>
              }
            />
          )}
        </div>
      </div>

      {/* Status Cabang & Lisensi Table */}
      <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-xs overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-sky-50/40 via-blue-50/20 to-transparent flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-zinc-900 text-sm">
              Status Cabang & Lisensi
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Status operasional, paket, dan masa aktif langganan platform cabang toko
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
                <th className="py-2.5 px-5 font-medium">Pemilik & Kontak</th>
                <th className="py-2.5 px-5 text-center font-medium">Paket Lisensi</th>
                <th className="py-2.5 px-5 text-center font-medium">Status Lisensi</th>
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
                    <td className="py-3 px-5 text-center whitespace-nowrap">
                      <div className="text-xs font-semibold text-zinc-800">
                        {t.referralCodeId || t.source === "referral" ? "Referral" : "Reguler"}
                      </div>
                      <div className="text-[10.5px] text-zinc-400 font-mono mt-0.5">
                        {t.referralCodeId || t.source === "referral" ? "Rp 55.000/bln" : "Rp 60.000/bln"}
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center min-w-[130px] whitespace-nowrap">
                      {isInactive || isExpired ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            {isInactive ? "Nonaktif" : "Kedaluwarsa"}
                          </span>
                          <span className="text-[10px] text-rose-500/80 font-mono mt-0.5">
                            {t.subscriptionUntil
                              ? `Habis ${new Date(t.subscriptionUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                              : "Masa aktif habis"}
                          </span>
                        </div>
                      ) : isExpiringSoon ? (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Kritis ({daysLeft}h lagi)
                          </span>
                          <span className="text-[10px] text-amber-700/80 font-mono mt-0.5">
                            s.d {new Date(t.subscriptionUntil!).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Aktif
                          </span>
                          <span className="text-[10px] text-zinc-400 font-mono mt-0.5">
                            {t.subscriptionUntil
                              ? `s.d ${new Date(t.subscriptionUntil).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}`
                              : "Permanen"}
                          </span>
                        </div>
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
                    <Activity className="w-4 h-4 text-purple-700" />
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
              <div
                onClick={() => setActiveTab("users")}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-violet-200/80 hover:bg-violet-50/20 transition cursor-pointer"
                title="Lihat seluruh Super Admin"
              >
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

              <div
                onClick={() => setActiveTab("users")}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-sky-200/80 hover:bg-sky-50/20 transition cursor-pointer"
                title="Lihat seluruh Tenant Owner"
              >
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

              <div
                onClick={() => setActiveTab("users")}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-emerald-200/80 hover:bg-emerald-50/20 transition cursor-pointer"
                title="Lihat seluruh Kasir & Staff"
              >
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

              <div
                onClick={() => setActiveTab("users")}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50/60 border border-zinc-100 hover:border-amber-200/80 hover:bg-amber-50/20 transition cursor-pointer"
                title="Lihat seluruh Tim Marketing IndoTech"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center text-[10px] font-bold shadow-xs">
                    MK
                  </div>
                  <div>
                    <div className="font-semibold text-zinc-900 text-xs">Tim Marketing</div>
                    <div className="text-[10px] text-zinc-400">Divisi Pemasaran IndoTech</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-amber-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-mono">{marketingCount} Akun</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Preview Bukti Struk */}
      {previewProofUrl && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-3xl p-5 max-w-lg w-full border border-zinc-200 dark:border-zinc-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Bukti Pembayaran / Struk Transfer
              </span>
              <button
                onClick={() => setPreviewProofUrl(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-zinc-100 dark:bg-zinc-800 p-2 flex items-center justify-center">
              <img
                src={previewProofUrl}
                alt="Bukti Transfer"
                className="w-full h-auto object-contain rounded-xl mx-auto"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
