import React, { useState } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Store } from "lucide-react";
import { CashflowStats, Expense, DateFilterPreset, Role, Tenant } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";

interface CashflowTabProps {
  stats: CashflowStats;
  expenses: Expense[];
  tenants?: Tenant[];
  currentUserRole?: Role;
  onOpenExpenseModal: () => void;
  onDeleteExpense: (id: string) => void;
}

export const CashflowTab: React.FC<CashflowTabProps> = ({
  stats,
  expenses,
  tenants = [],
  currentUserRole = "staff",
  onOpenExpenseModal,
  onDeleteExpense,
}) => {
  const isSuperAdmin = currentUserRole === "superadmin";

  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [tenantFilter, setTenantFilter] = useState<string>("all");

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchSearch =
      exp.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = categoryFilter === "all" || exp.category === categoryFilter;
    const matchDate = filterByDatePreset(exp.expenseDate, datePreset);
    const matchTenant = tenantFilter === "all" || exp.tenantId === tenantFilter;

    return matchSearch && matchCategory && matchDate && matchTenant;
  });

  // Table Columns (max 2 kata per header)
  const columns: ColumnDef<Expense>[] = [
    {
      id: "date",
      header: "Tanggal",
      cell: (exp) => (
        <span className="font-mono text-zinc-600 text-xs">{exp.expenseDate}</span>
      ),
    },
    ...(isSuperAdmin
      ? [
          {
            id: "outlet",
            header: "Cabang",
            cell: (exp: Expense) => {
              const outlet = tenants.find((t) => t.id === exp.tenantId);
              return (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-blue-50 text-blue-900 border border-blue-200/80 px-2 py-0.5 rounded-md">
                  <Store className="w-3 h-3 text-blue-700 shrink-0" />
                  <span className="truncate max-w-[120px]">
                    {outlet?.outletName || "Cabang Melati"}
                  </span>
                </span>
              );
            },
          },
        ]
      : []),
    {
      id: "category",
      header: "Kategori",
      cell: (exp) => (
        <span className="inline-flex items-center text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md">
          {exp.category}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Keterangan",
      cell: (exp) => <span className="text-zinc-700 text-xs">{exp.notes}</span>,
    },
    {
      id: "amount",
      header: "Nominal",
      cell: (exp) => (
        <span className="font-bold text-zinc-900 text-xs font-mono">
          Rp {exp.amount.toLocaleString("id-ID")}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Aksi",
      align: "right",
      cell: (exp) => (
        <button
          onClick={() => onDeleteExpense(exp.id)}
          className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition cursor-pointer"
          title="Hapus Biaya"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ),
    },
  ];

  // Distinct categories
  const categories = Array.from(new Set(expenses.map((e) => e.category)));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {isSuperAdmin ? (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Arus Kas</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ringkasan pemasukan dan pengeluaran seluruh cabang.
            </p>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Buku Kas</h2>
            <p className="text-xs text-zinc-500">
              Pencatatan pengeluaran operasional dan laba bersih.
            </p>
          </div>
        )}

        {!isSuperAdmin && (
          <button
            onClick={onOpenExpenseModal}
            className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> Catat Biaya
          </button>
        )}
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pemasukan
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight font-mono">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Belum tertagih: Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pengeluaran
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight font-mono">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Total beban operasional</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Laba Bersih
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold mt-2 tracking-tight font-mono ${
              stats.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Pemasukan dikurangi pengeluaran</p>
        </div>
      </div>

      {/* Expenses Table using ShadcnDataTable */}
      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-900 text-sm">Riwayat Biaya</h3>
        <ShadcnDataTable
          data={filteredExpenses}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari biaya..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customFilters={
            <div className="flex items-center gap-2 flex-wrap">
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
          emptyMessage="Belum ada catatan pengeluaran."
          initialPageSize={10}
        />
      </div>
    </div>
  );
};
