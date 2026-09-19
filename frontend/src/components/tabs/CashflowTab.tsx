import React, { useState, useMemo } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Store, CheckCircle2, Calculator } from "lucide-react";
import { CashflowStats, Expense, Order, DateFilterPreset, Role, Tenant } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";
import { formatCurrency, formatSignedCurrency } from "../../utils/formatUtils";
import { ShiftHistorySection } from "./ShiftHistorySection";

interface CashflowTabProps {
  stats: CashflowStats;
  expenses: Expense[];
  orders?: Order[];
  tenants?: Tenant[];
  currentUserRole?: Role;
  tenantId?: string;
  enableCashierShift?: boolean;
  onOpenExpenseModal: (defaultType?: "income" | "expense") => void;
  onDeleteExpense: (id: string) => void;
}

interface CashflowItem {
  id: string;
  source: "order" | "manual";
  type: "income" | "expense";
  date: string;
  tenantId?: string;
  category: string;
  notes: string;
  amount: number;
  isCompletedOrder?: boolean;
}

export const CashflowTab: React.FC<CashflowTabProps> = ({
  stats,
  expenses,
  orders = [],
  tenants = [],
  currentUserRole = "staff",
  tenantId,
  enableCashierShift = true,
  onOpenExpenseModal,
  onDeleteExpense,
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  const [activeSubView, setActiveSubView] = useState<"transactions" | "shifts">("transactions");
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  // Gabungkan Pemasukan dari Order dan Pencatatan Kas Manual
  const unifiedTransactions = useMemo<CashflowItem[]>(() => {
    // 1. Pemasukan otomatis dari order selesai atau lunas
    const orderItems: CashflowItem[] = orders
      .filter(
        (o) => (o.paymentStatus === "paid" || o.status === "completed") && o.status !== "cancelled"
      )
      .map((ord) => ({
        id: `ord-${ord.id}`,
        source: "order",
        type: "income",
        date: (ord.completedAt || ord.createdAt).slice(0, 10),
        tenantId: ord.tenantId,
        category: ord.status === "completed" ? "Laundry Selesai" : "Pelunasan Cucian",
        notes: `${ord.invoiceNo} • ${ord.customer?.name || "Pelanggan"} (${ord.serviceType})`,
        amount: ord.totalAmount,
        isCompletedOrder: ord.status === "completed",
      }));

    // 2. Transaksi manual dari tabel expenses (bisa income atau expense)
    const manualItems: CashflowItem[] = expenses.map((exp) => ({
      id: exp.id,
      source: "manual",
      type: exp.type === "income" ? "income" : "expense",
      date: exp.expenseDate,
      tenantId: exp.tenantId,
      category: exp.category,
      notes: exp.notes,
      amount: exp.amount,
    }));

    // Gabungkan dan urutkan tanggal terbaru di atas
    return [...orderItems, ...manualItems].sort((a, b) => b.date.localeCompare(a.date));
  }, [orders, expenses]);

  // Filter transaksi
  const filteredTransactions = useMemo(() => {
    return unifiedTransactions.filter((item) => {
      const matchSearch =
        item.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType = typeFilter === "all" || item.type === typeFilter;
      const matchCategory = categoryFilter === "all" || item.category === categoryFilter;
      const matchDate = filterByDatePreset(item.date, datePreset);
      const matchTenant = tenantFilter === "all" || item.tenantId === tenantFilter;

      return matchSearch && matchType && matchCategory && matchDate && matchTenant;
    });
  }, [unifiedTransactions, searchQuery, typeFilter, categoryFilter, datePreset, tenantFilter]);

  // Table Columns (maksimal 2 kata per header)
  const columns: ColumnDef<CashflowItem>[] = [
    {
      id: "date",
      header: "Tanggal",
      cell: (item) => (
        <span className="font-mono text-zinc-600 text-xs whitespace-nowrap">{item.date}</span>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            id: "outlet",
            header: "Cabang",
            cell: (item: CashflowItem) => {
              const outlet = tenants.find((t) => t.id === item.tenantId);
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
        ]
      : []),
    {
      id: "type",
      header: "Jenis",
      cell: (item) =>
        item.type === "income" ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            <TrendingUp className="w-3 h-3 text-emerald-600" />
            <span>Pemasukan</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-md whitespace-nowrap">
            <TrendingDown className="w-3 h-3 text-rose-600" />
            <span>Pengeluaran</span>
          </span>
        ),
    },
    {
      id: "category",
      header: "Kategori",
      cell: (item) => (
        <span className="inline-flex items-center text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md whitespace-nowrap">
          {item.category}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Keterangan",
      cell: (item) => <span className="text-zinc-700 text-xs font-medium">{item.notes}</span>,
    },
    {
      id: "amount",
      header: "Nominal",
      cell: (item) => (
        <span
          className={`font-bold text-xs whitespace-nowrap ${
            item.type === "income" ? "text-emerald-700" : "text-rose-700"
          }`}
        >
          {formatSignedCurrency(item.amount, item.type === "income")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (item) =>
        isSuperAdmin ? (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium px-1.5 py-0.5"
            title={item.source === "order" ? "Otomatis dari Pesanan" : "Pencatatan Outlet"}
          >
            {item.source === "order" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <span className="font-mono text-zinc-400">Manual</span>
            )}
          </span>
        ) : item.source === "manual" ? (
          <button
            type="button"
            onClick={() => onDeleteExpense(item.id)}
            className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
            title="Hapus Catatan"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        ) : (
          <span
            className="inline-flex items-center gap-1 text-[10px] text-zinc-400 font-medium px-1.5 py-0.5"
            title="Otomatis dari Pesanan"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        ),
    },
  ];

  // Distinct categories from all transactions
  const categories = useMemo(() => {
    return Array.from(new Set(unifiedTransactions.map((e) => e.category)));
  }, [unifiedTransactions]);

  // Dynamic calculations according to tenant filter
  const dynamicIncome = useMemo(
    () =>
      unifiedTransactions
        .filter((t) => (tenantFilter === "all" || t.tenantId === tenantFilter) && t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
    [unifiedTransactions, tenantFilter]
  );
  const dynamicExpense = useMemo(
    () =>
      unifiedTransactions
        .filter((t) => (tenantFilter === "all" || t.tenantId === tenantFilter) && t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    [unifiedTransactions, tenantFilter]
  );
  const dynamicNetProfit = dynamicIncome - dynamicExpense;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isSuperAdmin ? (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Arus Kas</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pencatatan pemasukan dan pengeluaran seluruh cabang.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Buku Kas</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Pencatatan pemasukan laundry dan pengeluaran operasional.
            </p>
          </div>
        )}

        {!isSuperAdmin && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenExpenseModal("income")}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <TrendingUp className="w-3.5 h-3.5" /> Catat Pemasukan
            </button>
            <button
              type="button"
              onClick={() => onOpenExpenseModal("expense")}
              className="bg-zinc-900 hover:bg-zinc-800 text-white font-semibold px-3 py-2 rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Catat Pengeluaran
            </button>
          </div>
        )}
      </div>

      {/* Sub-view switcher (Tampil jika superadmin atau fitur shift aktif) */}
      {(isSuperAdmin || enableCashierShift !== false) && (
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 border border-zinc-200/80 w-fit">
          <button
            type="button"
            onClick={() => setActiveSubView("transactions")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeSubView === "transactions"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Buku Kas & Transaksi
          </button>
          <button
            type="button"
            onClick={() => setActiveSubView("shifts")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeSubView === "shifts"
                ? "bg-white text-zinc-900 shadow-2xs border border-zinc-200/60"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            <Calculator className="w-3.5 h-3.5 text-zinc-600" />
            <span>Riwayat Shift & Rekonsiliasi Kasir</span>
          </button>
        </div>
      )}

      {activeSubView === "shifts" && (isSuperAdmin || enableCashierShift !== false) ? (
        <ShiftHistorySection tenantId={tenantFilter !== "all" ? tenantFilter : tenantId || "all"} />
      ) : (
        <>
          {/* 3 Metric Cards dengan Palet Warna Berani & Spotlight Light Blue */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan - Mint Emerald */}
        <div className="rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
              Pemasukan
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            Rp {(isSuperAdmin ? dynamicIncome : stats.totalIncome).toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-emerald-700/90 font-medium mt-1">
            Belum tertagih: Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Pengeluaran - Rose Vibrant */}
        <div className="rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/90 via-pink-50/40 to-white p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-800">
              Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            Rp {(isSuperAdmin ? dynamicExpense : stats.totalExpense).toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-rose-700/90 font-medium mt-1">Total beban operasional</p>
        </div>

        {/* Laba Bersih - Hero Light Blue Spotlight */}
        <div className="relative overflow-hidden rounded-2xl border border-sky-300 bg-gradient-to-br from-sky-50 via-blue-50/70 to-indigo-50/30 p-4 sm:p-5 shadow-sm">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 rounded-full bg-sky-400/20 blur-xl pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
              Laba Bersih
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500 text-white flex items-center justify-center shadow-xs">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2.5 tracking-tight">
            {formatCurrency(isSuperAdmin ? dynamicNetProfit : stats.netProfit)}
          </div>
          <p className="text-[11px] text-sky-700 font-medium mt-1">Pemasukan dikurangi pengeluaran</p>
        </div>
      </div>

      {/* Unified Transactions Table using ShadcnDataTable */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-zinc-900 text-sm">Arus Transaksi</h3>
          <span className="text-xs text-zinc-500">{filteredTransactions.length} transaksi</span>
        </div>

        <ShadcnDataTable
          data={filteredTransactions}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari transaksi..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customFilters={
            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <div className="flex items-center p-0.5 bg-zinc-100 rounded-lg border border-zinc-200">
                <button
                  type="button"
                  onClick={() => setTypeFilter("all")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    typeFilter === "all"
                      ? "bg-white text-zinc-900 shadow-xs"
                      : "text-zinc-600 hover:text-zinc-900"
                  }`}
                >
                  Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("income")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    typeFilter === "income"
                      ? "bg-white text-emerald-700 shadow-xs"
                      : "text-zinc-600 hover:text-emerald-700"
                  }`}
                >
                  Pemasukan
                </button>
                <button
                  type="button"
                  onClick={() => setTypeFilter("expense")}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition cursor-pointer ${
                    typeFilter === "expense"
                      ? "bg-white text-rose-700 shadow-xs"
                      : "text-zinc-600 hover:text-rose-700"
                  }`}
                >
                  Pengeluaran
                </button>
              </div>

              {isSuperAdmin && tenants.length > 0 && (
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
              )}

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="py-1.5 px-2.5 text-xs font-semibold bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-700 outline-none cursor-pointer hover:bg-zinc-100/70 focus:border-zinc-900 transition"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          }
          emptyMessage="Belum ada transaksi arus kas."
          initialPageSize={10}
        />
      </div>
    </>
  )}
</div>
);
};
