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
    <div className="space-y-6">
      {/* Top Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-950">Arus Kas & Buku Keuangan</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau arus kas masuk dari order cucian dan catat seluruh pengeluaran operasional toko
          </p>
        </div>
        <button
          onClick={onOpenExpenseModal}
          className="bg-blue-900 hover:bg-black text-white font-bold px-4 py-2.5 rounded-xl shadow-sm text-xs sm:text-sm flex items-center gap-2 self-start transition"
        >
          <Plus className="w-4 h-4 text-sky-400" /> Catat Uang Keluar (Biaya)
        </button>
      </div>

      {/* 3 Large Cashflow Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Total Uang Masuk */}
        <div className="bg-gradient-to-br from-sky-50 via-white to-sky-100/50 border border-sky-200 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
              Total Uang Masuk (Lunas)
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-200/80 text-blue-950 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-950 mt-3 tracking-tight">
            Rp {stats.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-blue-800 font-medium mt-1">Otomatis dari order laundry lunas</p>
        </div>

        {/* Total Uang Keluar */}
        <div className="bg-gradient-to-br from-slate-900 to-blue-950 border border-blue-900 p-5 sm:p-6 rounded-2xl shadow-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-300">
              Total Uang Keluar (Biaya)
            </span>
            <div className="w-8 h-8 rounded-lg bg-white/10 text-sky-300 flex items-center justify-center border border-white/10">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-3 tracking-tight">
            Rp {stats.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-400 mt-1">Deterjen, listrik, utilitas, gaji, servis</p>
        </div>

        {/* Laba Bersih */}
        <div className="bg-gradient-to-br from-blue-950 via-slate-950 to-black border border-slate-800 p-5 sm:p-6 rounded-2xl shadow-sm text-white">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
              Laba Bersih (Net Profit)
            </span>
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black mt-3 tracking-tight ${
              stats.netProfit >= 0 ? "text-sky-300" : "text-rose-400"
            }`}
          >
            Rp {stats.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-xs text-slate-300 mt-1">Uang Masuk - Biaya Operasional</p>
        </div>
      </div>

      {/* Expenses History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-slate-950 text-base">Riwayat Pengeluaran Operasional</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Catatan rinci pembelian deterjen, pewangi, plastik, dan biaya lainnya
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Kategori Biaya</th>
                <th className="py-3.5 px-4">Keperluan / Keterangan</th>
                <th className="py-3.5 px-4">Nominal</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-xs sm:text-sm">
                    Belum ada catatan pengeluaran. Klik "Catat Uang Keluar" untuk menambah.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 font-semibold">
                      {exp.expenseDate}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-50 text-blue-950 border border-sky-200">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-900 font-medium text-xs sm:text-sm">
                      {exp.notes}
                    </td>
                    <td className="py-3.5 px-4 font-black text-slate-950 text-xs sm:text-sm">
                      - Rp {exp.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="text-slate-400 hover:text-slate-900 p-1.5 rounded-lg hover:bg-slate-100 transition"
                        title="Hapus Pengeluaran"
                      >
                        <Trash2 className="w-4 h-4" />
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
