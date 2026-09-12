import React, { useState } from "react";
import { X, Users } from "lucide-react";
import { useToast } from "../common/ToastContext";

interface CreateCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (customerData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => Promise<void>;
}

export const CreateCustomerModal: React.FC<CreateCustomerModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.warning("Form Belum Lengkap", "Nama dan nomor WhatsApp pelanggan wajib diisi!");
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        name,
        phone,
        address,
        notes,
      });
      // reset
      setName("");
      setPhone("");
      setAddress("");
      setNotes("");
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
              <Users className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Tambah Pelanggan Baru
              </h3>
              <p className="text-xs text-slate-500">
                Simpan nomor WhatsApp untuk notifikasi otomatis cucian selesai
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
              Nama Lengkap Pelanggan <span className="text-sky-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ibu Rina Melati"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nomor WhatsApp / HP <span className="text-sky-600">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Alamat Rumah / Kos (Opsional)
            </label>
            <input
              type="text"
              placeholder="Jl. Melati No. 45, Kompleks Bunga"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              placeholder="Misal: sensitif deterjen keras, lipat rapi, dll"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
              {submitting ? "Menyimpan..." : "Simpan Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
