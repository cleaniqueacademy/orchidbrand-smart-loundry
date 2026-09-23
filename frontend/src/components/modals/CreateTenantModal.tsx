import React, { useState } from "react";
import { X, Building2, CreditCard, Clock } from "lucide-react";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

const BANK_OPTIONS = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Danamon", "Mega", "BTN", "Lainnya"];

interface CreateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (tenantData: {
    outletName: string;
    phone: string;
    address: string;
    city?: string;
    ownerName: string;
    ownerEmail: string;
    password?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    qrisInfo?: string;
    openingHours?: string;
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
  const [city, setCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [password, setPassword] = useState("");
  // Bank fields
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [qrisInfo, setQrisInfo] = useState("");
  // Opening hours
  const [hoursWeekdays, setHoursWeekdays] = useState("08:00 - 16:00");
  const [hoursSaturday, setHoursSaturday] = useState("08:00 - 13:00");
  const [hoursSunday, setHoursSunday] = useState("Tutup");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setOutletName(""); setPhone(""); setAddress(""); setCity("");
    setOwnerName(""); setOwnerEmail(""); setPassword("");
    setBankName(""); setBankAccountNumber(""); setBankAccountName(""); setQrisInfo("");
    setHoursWeekdays("08:00 - 16:00"); setHoursSaturday("08:00 - 13:00"); setHoursSunday("Tutup");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outletName.trim() || !ownerName.trim() || !ownerEmail.trim()) {
      toast.warning("Form Belum Lengkap", "Nama outlet, nama pemilik, dan email wajib diisi!");
      return;
    }
    try {
      setSubmitting(true);
      const openingHoursObj = {
        weekdays: hoursWeekdays.trim() || "08:00 - 16:00",
        saturday: hoursSaturday.trim() || "08:00 - 13:00",
        sunday: hoursSunday.trim() || "Tutup",
      };
      await onSubmit({
        outletName,
        phone,
        address,
        city: city.trim() || undefined,
        ownerName,
        ownerEmail,
        password: password || "123456",
        bankName: bankName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        bankAccountName: bankAccountName || undefined,
        qrisInfo: qrisInfo || undefined,
        openingHours: JSON.stringify(openingHoursObj),
      });
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium transition";

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-950 flex items-center justify-center border border-sky-200">
              <Building2 className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Tambah Cabang
              </h3>
              <p className="text-xs text-slate-500">
                Daftarkan cabang dan akun pemilik baru.
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

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* === Informasi Cabang === */}
          <div className="space-y-3">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Cabang</p>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nama Cabang <span className="text-sky-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Laundry Cleanique - Cabang Mawar"
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nomor Telepon <span className="text-sky-600">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="08123456789"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Kota / Kecamatan
                </label>
                <input
                  type="text"
                  placeholder="Bandung Selatan"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Alamat Lengkap</label>
              <input
                type="text"
                required
                placeholder="Jl. Mawar Raya No. 10"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* === Informasi Pemilik === */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akun Pemilik</p>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Nama Pemilik <span className="text-sky-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Nama Lengkap Pemilik"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Email Pemilik <span className="text-sky-600">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="owner@laundry.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                className={`${inputClass} font-mono`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Kata Sandi
              </label>
              <input
                type="password"
                placeholder="Default: 123456"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* === Informasi Rekening Bank === */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <CreditCard className="w-3.5 h-3.5 text-sky-600" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Rekening Bank & Pembayaran</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nama Bank</label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className={inputClass}
                >
                  <option value="">— Pilih Bank —</option>
                  {BANK_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nomor Rekening</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234567890"
                  value={bankAccountNumber}
                  onChange={(e) => setBankAccountNumber(e.target.value.replace(/\D/g, ""))}
                  className={`${inputClass} font-mono tracking-widest`}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Atas Nama Rekening</label>
              <input
                type="text"
                placeholder="Nama sesuai buku tabungan"
                value={bankAccountName}
                onChange={(e) => setBankAccountName(e.target.value)}
                className={`${inputClass} uppercase`}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Info QRIS <span className="text-slate-400 font-normal">(opsional)</span></label>
              <input
                type="text"
                placeholder="Nomor QRIS atau keterangan"
                value={qrisInfo}
                onChange={(e) => setQrisInfo(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* === Jam Operasional === */}
          <div className="space-y-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-sky-600" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jam Operasional</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Senin – Jumat</label>
                <input
                  type="text"
                  placeholder="08:00 - 16:00"
                  value={hoursWeekdays}
                  onChange={(e) => setHoursWeekdays(e.target.value)}
                  className={`${inputClass} text-center font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sabtu</label>
                <input
                  type="text"
                  placeholder="08:00 - 13:00"
                  value={hoursSaturday}
                  onChange={(e) => setHoursSaturday(e.target.value)}
                  className={`${inputClass} text-center font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minggu</label>
                <input
                  type="text"
                  placeholder="Tutup"
                  value={hoursSunday}
                  onChange={(e) => setHoursSunday(e.target.value)}
                  className={`${inputClass} text-center font-mono`}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
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
    </ModalWrapper>
  );
};
