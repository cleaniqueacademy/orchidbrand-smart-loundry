import React, { useState, useEffect } from "react";
import {
  Calendar,
  Sparkles,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Store,
  Mail,
  UserCheck,
  ArrowRight,
} from "lucide-react";
import { User } from "../../types";
import {
  checkUserActiveStatus,
  calculateExtendedDate,
} from "../../utils/subscriptionUtils";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

interface ExtendSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onExtend: (
    userId: string,
    payload: { days?: number; newDate?: string; activate: boolean }
  ) => Promise<void>;
}

const PRESET_DAYS = [
  { days: 7, label: "+7 Hari", desc: "1 Minggu" },
  { days: 14, label: "+14 Hari", desc: "2 Minggu" },
  { days: 30, label: "+30 Hari", desc: "1 Bulan", popular: true },
  { days: 90, label: "+90 Hari", desc: "3 Bulan" },
  { days: 180, label: "+180 Hari", desc: "6 Bulan" },
  { days: 365, label: "+365 Hari", desc: "1 Tahun" },
];

export const ExtendSubscriptionModal: React.FC<ExtendSubscriptionModalProps> = ({
  isOpen,
  onClose,
  user,
  onExtend,
}) => {
  const toast = useToast();
  const [selectedDays, setSelectedDays] = useState<number>(30);
  const [customDays, setCustomDays] = useState<string>("");
  const [mode, setMode] = useState<"preset" | "custom" | "date">("preset");
  const [customDate, setCustomDate] = useState<string>("");
  const [activateAccount, setActivateAccount] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (user && isOpen) {
      setSelectedDays(30);
      setCustomDays("");
      setMode("preset");
      setActivateAccount(true);

      const calculated = calculateExtendedDate(user.subscriptionUntil, 30);
      setCustomDate(calculated.newDateStr);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const currentStatus = checkUserActiveStatus(user);

  // Kalkulasi preview tanggal baru
  let previewDateStr = "";
  let previewFormatted = "";
  let previewDesc = "";

  if (mode === "date" && customDate) {
    previewDateStr = customDate;
    const d = new Date(`${customDate}T23:59:59`);
    previewFormatted = !isNaN(d.getTime())
      ? new Intl.DateTimeFormat("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(d)
      : customDate;
    previewDesc = "Berdasarkan tanggal spesifik kalender yang Anda tentukan";
  } else {
    const daysToAdd =
      mode === "custom" ? Number(customDays) || 0 : selectedDays;
    const calc = calculateExtendedDate(user.subscriptionUntil, daysToAdd);
    previewDateStr = calc.newDateStr;
    previewFormatted = calc.formattedNewDate;
    previewDesc = calc.isFromCurrent
      ? `Ditambahkan ${daysToAdd} hari dari batas masa aktif sebelumnya (${user.subscriptionUntil})`
      : `Ditambahkan ${daysToAdd} hari dihitung mulai dari hari ini`;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setSubmitting(true);
      if (mode === "date") {
        if (!customDate) {
          toast.warning("Tanggal Belum Dipilih", "Pilih tanggal batas aktif terlebih dahulu.");
          return;
        }
        await onExtend(user.id, {
          newDate: customDate,
          activate: activateAccount,
        });
      } else {
        const days = mode === "custom" ? parseInt(customDays, 10) : selectedDays;
        if (isNaN(days) || days <= 0) {
          toast.warning("Durasi Tidak Valid", "Masukkan jumlah hari perpanjangan yang valid.");
          return;
        }
        await onExtend(user.id, {
          days,
          activate: activateAccount,
        });
      }
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Gagal Perpanjang", err.message || "Terjadi kesalahan sistem");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen && !!user} onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-3xl w-full shadow-2xl border border-zinc-200 overflow-hidden relative">
        {/* Modal Header */}
        <div className="p-6 border-b border-zinc-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-900 text-white flex items-center justify-center shadow-md shadow-blue-900/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base">
                Perpanjang Akun
              </h3>
              <p className="text-xs text-zinc-500">
                Kelola durasi lisensi & operasional kasir pengguna
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* User Profile Card */}
          <div className="p-3.5 bg-zinc-50 rounded-2xl border border-zinc-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-800 font-black text-xs flex items-center justify-center shrink-0">
                {user.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-zinc-900 truncate">
                  {user.name}
                </div>
                <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5 truncate">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{user.email}</span>
                  {user.tenantName && (
                    <>
                      <span>•</span>
                      <Store className="w-3 h-3 shrink-0" />
                      <span className="truncate">{user.tenantName}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 ml-2">
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${currentStatus.statusBadge.className}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${currentStatus.statusBadge.dotColor}`} />
                <span>{currentStatus.statusBadge.label}</span>
              </span>
              <div className="text-[10px] text-zinc-400 mt-1">
                Exp: {user.subscriptionUntil || "Belum ada"}
              </div>
            </div>
          </div>

          {/* Mode Selector Tabs */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 mb-2">
              Durasi Perpanjangan
            </label>
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 p-1 rounded-xl text-xs font-semibold text-zinc-600">
              <button
                type="button"
                onClick={() => setMode("preset")}
                className={`py-1.5 rounded-lg transition ${
                  mode === "preset"
                    ? "bg-white text-zinc-900 shadow-xs font-bold"
                    : "hover:text-zinc-900"
                }`}
              >
                Pilihan Cepat
              </button>
              <button
                type="button"
                onClick={() => setMode("custom")}
                className={`py-1.5 rounded-lg transition ${
                  mode === "custom"
                    ? "bg-white text-zinc-900 shadow-xs font-bold"
                    : "hover:text-zinc-900"
                }`}
              >
                Kustom Hari
              </button>
              <button
                type="button"
                onClick={() => setMode("date")}
                className={`py-1.5 rounded-lg transition ${
                  mode === "date"
                    ? "bg-white text-zinc-900 shadow-xs font-bold"
                    : "hover:text-zinc-900"
                }`}
              >
                Pilih Tanggal
              </button>
            </div>
          </div>

          {/* Mode: Preset Buttons */}
          {mode === "preset" && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_DAYS.map((preset) => {
                const isSelected = selectedDays === preset.days;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => setSelectedDays(preset.days)}
                    className={`p-3 rounded-xl border text-left transition relative cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/70 text-blue-900 shadow-sm"
                        : "border-zinc-200 hover:border-blue-300 hover:bg-zinc-50/80 text-zinc-800"
                    }`}
                  >
                    {preset.popular && (
                      <span className="absolute -top-2 right-2 text-[9px] bg-blue-600 text-white font-bold px-1.5 py-0.2 rounded-full shadow-xs">
                        Populer
                      </span>
                    )}
                    <div className="font-extrabold text-sm flex items-center justify-between">
                      <span>{preset.label}</span>
                      {isSelected && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                      )}
                    </div>
                    <div className="text-[10px] text-zinc-500 mt-0.5">
                      {preset.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Mode: Custom Days Input */}
          {mode === "custom" && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Jumlah Hari:
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  placeholder="Contoh: 45 (hari)"
                  value={customDays}
                  onChange={(e) => setCustomDays(e.target.value)}
                  className="w-full pl-3 pr-16 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono font-bold bg-white text-zinc-900"
                  autoFocus
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-semibold text-zinc-400 pointer-events-none">
                  Hari
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1.5">
                Contoh: ketik 15 untuk setengah bulan, 45 untuk 1.5 bulan, dll.
              </p>
            </div>
          )}

          {/* Mode: Specific Date Input */}
          {mode === "date" && (
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-200">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Tanggal Batas:
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className="w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600 font-mono font-bold bg-white text-zinc-900"
                autoFocus
              />
              <p className="text-[11px] text-zinc-400 mt-1.5">
                Akun akan tetap dapat mengakses sistem hingga pukul 23:59 pada tanggal yang dipilih.
              </p>
            </div>
          )}

          {/* Live Calculated New Expiry Box */}
          <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-blue-950">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700 flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Pratinjau Masa Aktif Baru</span>
            </div>

            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-blue-950">
                {previewFormatted}
              </span>
              <span className="text-xs font-mono text-blue-700">
                ({previewDateStr})
              </span>
            </div>

            <p className="text-[11px] text-blue-800/80 mt-1 leading-relaxed">
              {previewDesc}
            </p>
          </div>

          {/* Auto-Activate Status Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-zinc-200 hover:bg-zinc-50 cursor-pointer transition">
            <input
              type="checkbox"
              checked={activateAccount}
              onChange={(e) => setActivateAccount(e.target.checked)}
              className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
            />
            <div className="text-xs">
              <span className="font-bold text-zinc-800 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                Otomatis Ubah Status Menjadi "Aktif"
              </span>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Jika akun sebelumnya dalam status nonaktif atau terkunci, centang ini akan langsung mengizinkan kasir kembali login dan bertransaksi.
              </p>
            </div>
          </label>

          {/* Submit & Cancel Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-700 hover:bg-zinc-50 text-xs font-semibold transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-blue-900/20 transition disabled:opacity-50 cursor-pointer"
            >
              <span>{submitting ? "Memperpanjang..." : "Simpan Perpanjangan"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </ModalWrapper>
  );
};
