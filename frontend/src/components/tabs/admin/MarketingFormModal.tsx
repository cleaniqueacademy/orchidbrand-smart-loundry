import React, { useState, useEffect } from "react";
import { X, UserCheck, Phone, Mail, Lock, CreditCard, Percent, CheckCircle2 } from "lucide-react";
import { MarketingProfile } from "../../../types";
import { ModalWrapper } from "../../common/ModalWrapper";

interface MarketingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<{ success: boolean; message?: string }>;
  initialData?: MarketingProfile | null;
  canEditIncentive?: boolean;
}

export const MarketingFormModal: React.FC<MarketingFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  canEditIncentive = false,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [bankName, setBankName] = useState("BCA");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [commissionRateDefault, setCommissionRateDefault] = useState<number>(5000);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (initialData) {
      setName(initialData.userName || "");
      setEmail(initialData.userEmail || "");
      setPassword("");
      setPhone(initialData.phone || "");
      setBankName(initialData.bankName || "BCA");
      setBankAccountNumber(initialData.bankAccountNumber || "");
      setBankAccountName(initialData.bankAccountName || "");
      setCommissionRateDefault(initialData.commissionRateDefault || 5000);
      setNotes(initialData.notes || "");
    } else {
      setName("");
      setEmail("");
      setPassword("");
      setPhone("");
      setBankName("BCA");
      setBankAccountNumber("");
      setBankAccountName("");
      setCommissionRateDefault(5000);
      setNotes("");
    }
    setError("");
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError("Nama dan nomor WhatsApp wajib diisi");
      return;
    }

    if (!initialData && (!email.trim() || !password.trim())) {
      setError("Email dan password akun wajib diisi untuk pendaftaran anggota tim marketing baru");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload: any = {
        name: name.trim(),
        phone: phone.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        notes: notes.trim() || null,
      };

      if (canEditIncentive) {
        payload.commissionRateDefault = Number(commissionRateDefault) || 0;
      }

      if (!initialData) {
        payload.email = email.trim().toLowerCase();
        payload.password = password;
      }

      const res = await onSubmit(payload);
      if (res.success) {
        onClose();
      } else {
        setError(res.message || "Gagal menyimpan data");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-h-[92vh] flex flex-col overflow-hidden text-slate-900">
        {/* Header - Clean Light Mode */}
        <div className="h-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 w-full" />
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">
                {initialData ? "Ubah Data Tim Marketing" : "Tambah Anggota Tim Marketing Baru"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Akun login & rekening pencairan insentif</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Nama & Telepon */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Fajar Pratama"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nomor WhatsApp <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="081298765401"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Email & Password (hanya saat tambah baru atau opsional) */}
          {!initialData && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-blue-600" /> Kredensial Akun Login
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Alamat Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="marketing@cleanique.id"
                      className="w-full bg-white border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Password Awal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Informasi Rekening Bank */}
          <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-3">
            <span className="font-bold text-blue-950 flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-blue-600" /> Rekening Bank Penerima Insentif
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-600 mb-1 font-medium">Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                >
                  <option value="BCA">BCA</option>
                  <option value="Mandiri">Mandiri</option>
                  <option value="BRI">BRI</option>
                  <option value="BNI">BNI</option>
                  <option value="BSI">BSI</option>
                  <option value="CIMB Niaga">CIMB Niaga</option>
                  <option value="Permata">Permata</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Nomor Rekening</label>
                <input
                  type="text"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value)}
                  placeholder="5221009988"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-600 mb-1 font-medium">Atas Nama Rekening</label>
                <input
                  type="text"
                  value={bankAccountName}
                  onChange={(e) => setBankAccountName(e.target.value)}
                  placeholder="FAJAR PRATAMA"
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Insentif & Catatan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Insentif per Perpanjangan</span>
                {!canEditIncentive && (
                  <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1 font-normal">
                    <Lock className="w-2.5 h-2.5" /> Hanya Super Admin
                  </span>
                )}
              </label>

              {canEditIncentive ? (
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={commissionRateDefault}
                    onChange={(e) => setCommissionRateDefault(Number(e.target.value))}
                    placeholder="5000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-800 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Standar resmi: Rp 5.000 / perpanjangan outlet</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                    <input
                      type="text"
                      disabled
                      value={(commissionRateDefault || 5000).toLocaleString("id-ID")}
                      className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-slate-700 font-bold cursor-not-allowed opacity-80"
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    *Besaran insentif ditentukan langsung oleh Super Admin Cleanique
                  </p>
                </div>
              )}
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Wilayah / Catatan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Wilayah Jawa Barat..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
