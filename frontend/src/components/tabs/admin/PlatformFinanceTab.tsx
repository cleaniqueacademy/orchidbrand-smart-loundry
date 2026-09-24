import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Calendar,
  Building,
  Tag,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  FileText,
} from "lucide-react";
import { authHeaders } from "../../../utils/api";
import { useToast } from "../../common/ToastContext";
import { useConfirm } from "../../common/ConfirmContext";

interface PlatformCashflowRecord {
  id: string;
  type: "income" | "expense";
  category: string;
  amount: number;
  date: string;
  tenantId?: string | null;
  outletName?: string | null;
  referralCode?: string | null;
  durationMonths?: number | null;
  description: string;
  proofUrl?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface CashflowSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  totalTransactions: number;
}

export const PlatformFinanceTab: React.FC = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [records, setRecords] = useState<PlatformCashflowRecord[]>([]);
  const [summary, setSummary] = useState<CashflowSummary>({
    totalIncome: 0,
    totalExpense: 0,
    netProfit: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Expense
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "server",
    amount: "",
    description: "",
    date: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchCashflow = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platform/cashflow", {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRecords(json.data.records || []);
        setSummary(json.data.summary || {
          totalIncome: 0,
          totalExpense: 0,
          netProfit: 0,
          totalTransactions: 0,
        });
      }
    } catch (err: any) {
      toast.error("Gagal Memuat Arus Kas", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashflow();
  }, []);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(expenseForm.amount);
    if (!numAmount || numAmount <= 0) {
      toast.error("Validasi Gagal", "Nominal pengeluaran harus lebih dari 0");
      return;
    }
    if (!expenseForm.description.trim()) {
      toast.error("Validasi Gagal", "Keterangan pengeluaran wajib diisi");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/platform/cashflow", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          type: "expense",
          category: expenseForm.category,
          amount: numAmount,
          description: expenseForm.description,
          date: expenseForm.date,
          notes: expenseForm.notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Pengeluaran Dicatat", "Pengeluaran platform berhasil ditambahkan ke arus kas.");
        setIsModalOpen(false);
        setExpenseForm({
          category: "server",
          amount: "",
          description: "",
          date: new Date().toISOString().slice(0, 10),
          notes: "",
        });
        fetchCashflow();
      } else {
        toast.error("Gagal Menyimpan", json.message);
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (rec: PlatformCashflowRecord) => {
    const confirmed = await confirm({
      title: "Hapus Catatan Kas?",
      description: `Apakah Anda yakin ingin menghapus catatan "${rec.description}" sebesar Rp ${rec.amount.toLocaleString("id-ID")}?`,
      confirmText: "Hapus",
      cancelText: "Batal",
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/platform/cashflow/${rec.id}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Catatan Dihapus", "Data kas berhasil dihapus");
        fetchCashflow();
      }
    } catch {}
  };

  const filteredRecords = records.filter((r) => {
    if (filterType !== "all" && r.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchOutlet = r.outletName?.toLowerCase().includes(q);
      const matchRef = r.referralCode?.toLowerCase().includes(q);
      return matchDesc || matchOutlet || matchRef;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-blue-600" />
            Arus Kas & Rekap Langganan Platform
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Pemasukan perpanjangan outlet otomatis tercatat di sini. Anda juga dapat mencatat pengeluaran platform.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pengeluaran Platform</span>
        </button>
      </div>

      {/* 3 Ringkasan Kartu Metrik */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pemasukan Langganan */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Total Pemasukan Langganan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            Rp {summary.totalIncome.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400">Dari perpanjangan masa aktif outlet</p>
        </div>

        {/* Pengeluaran Platform */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Total Pengeluaran Platform</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-700">
            Rp {summary.totalExpense.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400">Server, komisi referral, kuota WA, dll.</p>
        </div>

        {/* Saldo Bersih */}
        <div className="bg-white rounded-2xl border border-zinc-200/90 p-5 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-500">
            <span>Laba Bersih Kas Platform</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className={`text-2xl font-black ${summary.netProfit >= 0 ? "text-zinc-900" : "text-rose-700"}`}>
            Rp {summary.netProfit.toLocaleString("id-ID")}
          </div>
          <p className="text-[11px] text-zinc-400">Saldo kas platform saat ini</p>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-zinc-200/80 shadow-2xs">
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setFilterType("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterType === "all" ? "bg-white text-zinc-900 shadow-2xs" : "text-zinc-500"
            }`}
          >
            Semua ({records.length})
          </button>
          <button
            onClick={() => setFilterType("income")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterType === "income" ? "bg-white text-emerald-800 shadow-2xs" : "text-zinc-500"
            }`}
          >
            Pemasukan ({records.filter((r) => r.type === "income").length})
          </button>
          <button
            onClick={() => setFilterType("expense")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
              filterType === "expense" ? "bg-white text-rose-800 shadow-2xs" : "text-zinc-500"
            }`}
          >
            Pengeluaran ({records.filter((r) => r.type === "expense").length})
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari outlet / keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Tabel Arus Kas */}
      <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 border-b border-zinc-200 text-zinc-500 font-semibold">
              <tr>
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-3">Tipe</th>
                <th className="py-3.5 px-3">Kategori</th>
                <th className="py-3.5 px-4">Keterangan & Outlet</th>
                <th className="py-3.5 px-3">Kode Referral</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
                <th className="py-3.5 px-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-24" /></td>
                    <td className="py-4 px-3"><div className="h-4 bg-zinc-200 rounded w-16" /></td>
                    <td className="py-4 px-3"><div className="h-4 bg-zinc-200 rounded w-20" /></td>
                    <td className="py-4 px-4"><div className="h-4 bg-zinc-200 rounded w-48" /></td>
                    <td className="py-4 px-3"><div className="h-4 bg-zinc-200 rounded w-20" /></td>
                    <td className="py-4 px-4 text-right"><div className="h-4 bg-zinc-200 rounded w-24 ml-auto" /></td>
                    <td className="py-4 px-3 text-right"><div className="h-4 bg-zinc-200 rounded w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-400">
                    <FileText className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
                    Belum ada riwayat transaksi arus kas platform.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-50/60 transition">
                    <td className="py-3.5 px-4 text-zinc-600 font-mono text-[11px]">
                      {r.date}
                    </td>
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          r.type === "income"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {r.type === "income" ? "+ Masuk" : "- Keluar"}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-zinc-700 capitalize text-[11px]">
                      {r.category === "subscription"
                        ? "Langganan"
                        : r.category === "marketing_commission"
                        ? "Komisi Referral"
                        : r.category === "server"
                        ? "Server / Hosting"
                        : r.category === "wa_quota"
                        ? "Kuota WhatsApp"
                        : r.category}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-zinc-900">{r.description}</div>
                      {r.outletName && (
                        <div className="text-[11px] text-zinc-500 flex items-center gap-1">
                          <Building className="w-3 h-3 text-zinc-400" />
                          <span>{r.outletName}</span>
                        </div>
                      )}
                      {r.notes && <div className="text-[10px] text-zinc-400 italic mt-0.5">{r.notes}</div>}
                    </td>
                    <td className="py-3.5 px-3">
                      {r.referralCode ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                          <Tag className="w-3 h-3" />
                          {r.referralCode}
                        </span>
                      ) : (
                        <span className="text-zinc-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-black text-sm ${
                        r.type === "income" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {r.type === "income" ? "+" : "-"} Rp {r.amount.toLocaleString("id-ID")}
                    </td>
                    <td className="py-3.5 px-3 text-right">
                      <button
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title="Hapus catatan"
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

      {/* Modal Tambah Pengeluaran Platform */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
              <h3 className="font-bold text-zinc-900 text-sm flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-rose-600" />
                Catat Pengeluaran Platform
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 text-lg leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Kategori Pengeluaran
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="server">Server VPS & Cloud Hosting</option>
                  <option value="marketing_commission">Komisi Affiliate / Marketing (Ilham, dll)</option>
                  <option value="wa_quota">Kuota API / WhatsApp Gateway</option>
                  <option value="domain">Domain & Sertifikat SSL</option>
                  <option value="other">Operasional Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Nominal (Rp) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="Contoh: 50000"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">
                  Keterangan Pengeluaran *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Bayar komisi Ilham Marketing bulan September"
                  value={expenseForm.description}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={expenseForm.date}
                    onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Catatan tambahan"
                    value={expenseForm.notes}
                    onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Menyimpan..." : "Simpan Pengeluaran"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
