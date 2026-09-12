import React, { useState, useEffect } from "react";
import { X, UserCheck, Phone, MapPin, FileText } from "lucide-react";
import { Customer } from "../../types";
import { useToast } from "../common/ToastContext";

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  onSubmit: (id: string, updatedData: {
    name: string;
    phone: string;
    address?: string;
    notes?: string;
  }) => Promise<void>;
}

export const EditCustomerModal: React.FC<EditCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onSubmit,
}) => {
  const toast = useToast();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || "");
      setPhone(customer.phone || "");
      setAddress(customer.address || "");
      setNotes(customer.notes || "");
    }
  }, [customer]);

  if (!isOpen || !customer) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      toast.warning("Form Belum Lengkap", "Nama dan nomor WhatsApp pelanggan wajib diisi!");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(customer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err: any) {
      toast.error("Gagal Memperbarui Pelanggan", err.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-zinc-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-zinc-200 animate-in fade-in zoom-in-95 duration-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">Edit Data Pelanggan</h3>
              <p className="text-xs text-zinc-500">Perbarui kontak dan alamat pelanggan</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nama Pelanggan <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Ibu Rina"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              No. WhatsApp / Telepon <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Phone className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="081234567890"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg pl-9 pr-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Alamat Pengiriman / Rumah
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="Jl. Melati Blok C No. 12"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg pl-9 pr-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium resize-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Catatan Khusus Pelanggan
            </label>
            <div className="relative">
              <FileText className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-2.5" />
              <textarea
                rows={2}
                placeholder="Preferensi cucian (mis: jangan pakai deterjen wangi lavender)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-zinc-200 rounded-lg pl-9 pr-3 py-2 bg-zinc-50 focus:bg-white focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 outline-none font-medium resize-none"
              />
            </div>
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-lg border border-zinc-200 text-zinc-700 font-medium text-xs hover:bg-zinc-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2 rounded-lg bg-gradient-to-r from-blue-900 to-blue-700 hover:from-blue-800 hover:to-blue-600 text-white font-medium text-xs transition shadow-sm disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
