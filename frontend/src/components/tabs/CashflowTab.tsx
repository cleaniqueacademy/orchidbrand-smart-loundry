import React, { useState } from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from "lucide-react";
import { CashflowStats, Expense, DateFilterPreset } from "../../types";
import {
  ShadcnDataTable,
  ColumnDef,
  filterByDatePreset,
} from "../common/ShadcnDataTable";

interface CashflowTabProps {
  stats: CashflowStats;
  expenses: Expense[];
  onOpenExpenseModal: () => void;
  onDeleteExpense: (id: string) => void;
}

export const CashflowTab: React.FC<CashflowTabProps> = ({
  stats,
  expenses,
  onOpenExpenseModal,
  onDeleteExpense,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [datePreset, setDatePreset] = useState<DateFilterPreset>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Filter expenses
  const filteredExpenses = expenses.filter((exp) => {
    const matchSearch =
      exp.notes.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchCategory = categoryFilter === "all" || exp.category === categoryFilter;
    const matchDate = filterByDatePreset(exp.expenseDate, datePreset);

    return matchSearch && matchCategory && matchDate;
  });

  // Table Columns
  const columns: ColumnDef<Expense>[] = [
    {
      id: "date",
      header: "Tanggal",
      cell: (exp) => (
        <span className="font-mono text-zinc-600 text-xs">{exp.expenseDate}</span>
      ),
    },
    {
      id: "category",
      header: "Kategori Biaya",
      cell: (exp) => (
        <span className="inline-flex items-center text-[10px] font-semibold bg-zinc-100 text-zinc-800 border border-zinc-200 px-2 py-0.5 rounded-md">
          {exp.category}
        </span>
      ),
    },
    {
      id: "notes",
      header: "Keterangan / Keperluan",
      cell: (exp) => <span className="text-zinc-700 text-xs">{exp.notes}</span>,
    },
    {
      id: "amount",
      header: "Nominal",
      cell: (exp) => (
        <span className="font-bold text-zinc-900 text-xs">
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
          className="text-zinc-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition"
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
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Buku Arus Kas & Biaya</h2>
          <p className="text-xs text-zinc-500">
            Pencatatan pengeluaran operasional dan ringkasan laba bersih toko
          </p>
        </div>

        <button
          onClick={onOpenExpenseModal}
          className="bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium px-3.5 py-2 rounded-lg text-xs flex items-center gap-1.5 self-start shadow-sm transition"
        >
          <Plus className="w-3.5 h-3.5" /> Catat Pengeluaran
        </button>
      </div>

      {/* 3 Metric Cards (Shadcn style) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Pemasukan (Lunas)
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">
            Belum tertagih: Rp {stats.pendingPaymentAmount.toLocaleString("id-ID")}
          </p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Total Pengeluaran
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <TrendingDown className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 mt-2 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Biaya operasional outlet</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white border border-zinc-200 p-4 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              Laba Bersih
            </span>
            <div className="w-7 h-7 rounded-lg bg-zinc-100 text-zinc-800 flex items-center justify-center border border-zinc-200">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div
            className={`text-xl sm:text-2xl font-bold mt-2 tracking-tight ${
              stats.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400 mt-1">Pemasukan − Pengeluaran</p>
        </div>
      </div>

      {/* Expenses Table using ShadcnDataTable */}
      <div className="space-y-3">
        <h3 className="font-semibold text-zinc-900 text-sm">Riwayat Catatan Biaya</h3>
        <ShadcnDataTable
          data={filteredExpenses}
          columns={columns}
          keyExtractor={(item) => item.id}
          searchPlaceholder="Cari keterangan atau kategori..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          datePreset={datePreset}
          onDatePresetChange={setDatePreset}
          customFilters={
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
          }
          emptyMessage="Belum ada catatan pengeluaran yang sesuai."
          initialPageSize={10}
        />
      </div>
    </div>
  );
};
