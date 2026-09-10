import React, { useState } from "react";
import { X, DollarSign } from "lucide-react";

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: {
    category: string;
    amount: number;
    notes: string;
    expenseDate: string;
  }) => Promise<void>;
}

export const CreateExpenseModal: React.FC<CreateExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [category, setCategory] = useState("Deterjen & Pewangi");
  const [amount, setAmount] = useState(50000);
  const [notes, setNotes] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notes.trim()) {
      alert("Silakan isi keterangan pengeluaran!");
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        category,
        amount,
        notes,
        expenseDate,
      });
      // reset
      setNotes("");
      setAmount(50000);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-950 flex items-center justify-center border border-sky-200">
              <DollarSign className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Catat Uang Keluar (Biaya)
              </h3>
              <p className="text-xs text-slate-500">
                Catat pembelian deterjen, utilitas, atau biaya operasional lainnya
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Kategori Pengeluaran
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            >
              <option value="Deterjen & Pewangi">Deterjen & Pewangi (Bahan Baku)</option>
              <option value="Listrik & Air">Listrik & Air (Utilitas)</option>
              <option value="Plastik & Kemasan">Plastik & Kemasan Packing</option>
              <option value="Gaji Karyawan">Gaji Karyawan</option>
              <option value="Servis Mesin">Servis / Perawatan Mesin</option>
              <option value="Lain-lain">Lain-lain</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nominal Biaya (Rp) <span className="text-sky-600">*</span>
            </label>
            <input
              type="number"
              required
              min="1000"
              value={amount}
              onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-black text-slate-950"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Keperluan / Keterangan <span className="text-sky-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Beli Sabun Deterjen 5L, Token Listrik Toko"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Tanggal Pengeluaran</label>
            <input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2.5 rounded-xl bg-blue-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Biaya"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
