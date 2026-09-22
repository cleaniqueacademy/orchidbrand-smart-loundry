import React, { useState, useEffect } from "react";
import { X, Building2, CreditCard, Clock, Save } from "lucide-react";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";
import { Tenant } from "../../types";

const BANK_OPTIONS = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Danamon", "Mega", "BTN", "Lainnya"];

interface EditTenantModalProps {
  isOpen: boolean;
  tenant: Tenant | null;
  onClose: () => void;
  onSubmit: (tenantId: string, data: Partial<{
    outletName: string;
    phone: string;
    address: string;
    city: string;
    ownerName: string;
    bankName: string;
    bankAccountNumber: string;
    bankAccountName: string;
    qrisInfo: string;
    openingHours: string;
    subscriptionUntil: string;
    status: string;
    enableCashierShift: string;
  }>) => Promise<boolean>;
}

function parseOpeningHours(raw?: string | null) {
  try {
    if (!raw) return { weekdays: "08:00 - 16:00", saturday: "08:00 - 13:00", sunday: "Tutup" };
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return {
      weekdays: parsed.weekdays || "08:00 - 16:00",
      saturday: parsed.saturday || "08:00 - 13:00",
      sunday: parsed.sunday || "Tutup",
    };
  } catch {
    return { weekdays: "08:00 - 16:00", saturday: "08:00 - 13:00", sunday: "Tutup" };
  }
}

export const EditTenantModal: React.FC<EditTenantModalProps> = ({
  isOpen,
  tenant,
  onClose,
  onSubmit,
}) => {
  const toast = useToast();

  const [outletName, setOutletName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [qrisInfo, setQrisInfo] = useState("");
  const [hoursWeekdays, setHoursWeekdays] = useState("08:00 - 16:00");
  const [hoursSaturday, setHoursSaturday] = useState("08:00 - 13:00");
  const [hoursSunday, setHoursSunday] = useState("Tutup");
  const [submitting, setSubmitting] = useState(false);

  // Populate form saat tenant berubah
  useEffect(() => {
    if (!tenant || !isOpen) return;
    setOutletName(tenant.outletName || "");
    setPhone(tenant.phone || "");
    setAddress(tenant.address || "");
    setCity(tenant.city || "");
    setOwnerName(tenant.owner?.name || "");
    setBankName(tenant.bankName || "");
    setBankAccountNumber(tenant.bankAccountNumber || "");
    setBankAccountName(tenant.bankAccountName || "");
    setQrisInfo(tenant.qrisInfo || "");
    const hours = parseOpeningHours(tenant.openingHours);
    setHoursWeekdays(hours.weekdays);
    setHoursSaturday(hours.saturday);
    setHoursSunday(hours.sunday);
  }, [tenant, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant) return;
    if (!outletName.trim()) {
      toast.warning("Form Belum Lengkap", "Nama outlet wajib diisi!");
      return;
    }
    try {
      setSubmitting(true);
      const openingHoursObj = {
        weekdays: hoursWeekdays.trim() || "08:00 - 16:00",
        saturday: hoursSaturday.trim() || "08:00 - 13:00",
        sunday: hoursSunday.trim() || "Tutup",
      };
      const ok = await onSubmit(tenant.id, {
        outletName: outletName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        ownerName: ownerName.trim(),
        bankName: bankName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankAccountName: bankAccountName.trim(),
        qrisInfo: qrisInfo.trim(),
        openingHours: JSON.stringify(openingHoursObj),
      });
      if (ok) {
        toast.success("Berhasil", "Data cabang berhasil diperbarui.");
        onClose();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium transition";

  if (!tenant) return null;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-3xl w-full p-6 sm:p-7 shadow-2xl border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-200">
              <Building2 className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Edit Cabang
              </h3>
              <p className="text-xs text-slate-500 font-mono">{tenant.id}</p>
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
                value={outletName}
                onChange={(e) => setOutletName(e.target.value)}
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nomor Telepon</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputClass} font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Kota / Kecamatan</label>
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
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Nama Pemilik</label>
              <input
                type="text"
                placeholder="Nama pemilik cabang"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
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
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Info QRIS <span className="text-slate-400 font-normal">(opsional)</span>
              </label>
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
                  value={hoursWeekdays}
                  onChange={(e) => setHoursWeekdays(e.target.value)}
                  className={`${inputClass} text-center font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Sabtu</label>
                <input
                  type="text"
                  value={hoursSaturday}
                  onChange={(e) => setHoursSaturday(e.target.value)}
                  className={`${inputClass} text-center font-mono`}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Minggu</label>
                <input
                  type="text"
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
              className="w-1/2 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save className="w-3.5 h-3.5" />
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
