import React, { useState, useEffect } from "react";
import { X, TrendingDown, TrendingUp, DollarSign } from "lucide-react";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultType?: "income" | "expense";
  onSubmit: (data: {
    type: "income" | "expense";
    category: string;
    amount: number;
    notes: string;
    expenseDate: string;
  }) => Promise<void>;
}

const EXPENSE_CATEGORIES = [
  "Deterjen & Pewangi",
  "Listrik & Air",
  "Plastik Packing",
  "Gaji Karyawan",
  "Servis Mesin",
  "Biaya Operasional",
  "Lain-lain",
];

const INCOME_CATEGORIES = [
  "Penjualan Retail",
  "Parfum Laundry",
  "Plastik Hanger",
  "Jasa Antar",
  "Modal Kas",
  "Pemasukan Lain",
];

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  defaultType = "expense",
  onSubmit,
}) => {
  const toast = useToast();
  const [type, setType] = useState<"income" | "expense">(defaultType);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [amount, setAmount] = useState(50000);
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType(defaultType);
      setCategory(defaultType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
    }
  }, [isOpen, defaultType]);

  const handleTypeChange = (newType: "income" | "expense") => {
    setType(newType);
    setCategory(newType === "income" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      toast.warning("Keterangan Wajib", "Harap isi rincian keterangan transaksi!");
      return;
    }
    if (amount <= 0) {
      toast.warning("Nominal Kosong", "Nominal transaksi harus lebih dari 0!");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        type,
        category,
        amount,
        notes: notes.trim(),
        expenseDate,
      });
      setNotes("");
      setAmount(50000);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-md">
      <div className="bg-white rounded-2xl w-full p-6 shadow-xl border border-zinc-200">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
                type === "income"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              {type === "income" ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-sm text-zinc-900">Catat Transaksi</h3>
              <p className="text-xs text-zinc-500">Pencatatan arus kas operasional</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Segmented Type Switch */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
              Jenis Transaksi
            </label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-zinc-100 rounded-xl">
              <button
                type="button"
                onClick={() => handleTypeChange("expense")}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === "expense"
                    ? "bg-white text-rose-700 shadow-xs border border-zinc-200/80"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Pengeluaran</span>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("income")}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  type === "income"
                    ? "bg-white text-emerald-700 shadow-xs border border-zinc-200/80"
                    : "text-zinc-600 hover:text-zinc-900"
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Pemasukan</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Kategori Kas
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 outline-none focus:border-zinc-900 transition"
            >
              {(type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nominal Kas
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                Rp
              </span>
              <input
                type="number"
                required
                min="500"
                step="500"
                value={amount}
                onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full text-xs font-mono font-bold border border-zinc-200 rounded-lg pl-9 pr-3 py-2 bg-white text-zinc-900 outline-none focus:border-zinc-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Keterangan
            </label>
            <input
              type="text"
              required
              placeholder={
                type === "income"
                  ? "Contoh: Jual parfum laundry botol 250ml"
                  : "Contoh: Beli sabun deterjen 5 liter"
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 outline-none focus:border-zinc-900 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Tanggal Transaksi
            </label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full text-xs font-medium border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-800 outline-none focus:border-zinc-900 transition"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-semibold text-xs hover:bg-zinc-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`w-1/2 py-2 rounded-lg text-white font-semibold text-xs shadow-xs transition cursor-pointer disabled:opacity-50 ${
                type === "income"
                  ? "bg-emerald-700 hover:bg-emerald-800"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              {submitting ? "Menyimpan..." : "Simpan Transaksi"}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
