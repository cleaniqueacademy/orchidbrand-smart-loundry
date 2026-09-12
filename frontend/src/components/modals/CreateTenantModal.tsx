import React, { useState } from "react";
import { X, Building2 } from "lucide-react";
import { useToast } from "../common/ToastContext";

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: {
    outletName: string;
    phone: string;
    address: string;
    ownerName: string;
    ownerEmail: string;
    password?: string;
  }) => Promise<void>;
}

export const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const toast = useToast();
  const [outletName, setOutletName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      toast.warning("Form Belum Lengkap", "Nama outlet, nama pemilik, dan email wajib diisi!");
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        outletName,
        phone,
        address,
        ownerName,
        ownerEmail,
        password: password || "123456",
      });
      // reset
      setOutletName("");
      setPhone("");
      setAddress("");
      setOwnerName("");
      setOwnerEmail("");
      setPassword("");
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
              <Building2 className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Daftarkan Tenant & User Baru
              </h3>
              <p className="text-xs text-slate-500">
                1 User Pemilik terhubung ke 1 Tenant Outlet Laundry
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

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Outlet / Cabang <span className="text-sky-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Contoh: Orchid Laundry - Cabang Mawar"
              value={outletName}
              onChange={(e) => setOutletName(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nomor Telepon Outlet <span className="text-sky-600">*</span>
            </label>
            <input
              type="tel"
              required
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Alamat Outlet</label>
            <input
              type="text"
              required
              placeholder="Jl. Mawar Raya No. 10"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nama Pemilik (User Owner) <span className="text-sky-600">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Nama Lengkap Pemilik"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Email Login Pemilik <span className="text-sky-600">*</span>
            </label>
            <input
              type="email"
              required
              placeholder="owner@laundry.com"
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Password Sementara
            </label>
            <input
              type="password"
              placeholder="Default: 123456"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none"
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
              {submitting ? "Mendaftarkan..." : "Daftarkan Tenant"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
