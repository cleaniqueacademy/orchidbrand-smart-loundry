import React from "react";
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2 } from "lucide-react";
import { CashflowStats, Expense } from "../../types";

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
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl font-extrabold text-slate-950">Arus Kas</h2>
        <button
          onClick={onOpenExpenseModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Catat Pengeluaran
        </button>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan */}
        <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200 p-5 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900">Pemasukan</span>
            <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-blue-900" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-3 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-blue-800/60 mt-1">Dari order lunas</p>
        </div>

        {/* Pengeluaran */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-900 p-5 rounded-2xl shadow-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">Pengeluaran</span>
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center border border-white/10">
              <TrendingDown className="w-4 h-4 text-sky-300" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Operasional toko</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-gradient-to-br from-blue-950 to-black border border-slate-800 p-5 rounded-2xl shadow-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-400">Laba Bersih</span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 flex items-center justify-center border border-sky-500/20">
              <DollarSign className="w-4 h-4 text-sky-400" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black mt-3 tracking-tight ${
              stats.netProfit >= 0 ? "text-sky-300" : "text-rose-400"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Masuk − Keluar</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-950 text-sm">Riwayat Pengeluaran</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-4">Nominal</th>
                <th className="py-3 px-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs">
                    Belum ada catatan pengeluaran
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">{exp.expenseDate}</td>
                    <td className="py-3 px-4">
                      <span className="text-xs font-semibold text-blue-900">{exp.category}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-700 text-xs">{exp.notes}</td>
                    <td className="py-3 px-4 font-bold text-slate-950 text-xs">
                      Rp {exp.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-slate-300 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
