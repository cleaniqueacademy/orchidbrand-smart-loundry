import React, { useState, useEffect } from "react";
import {
  Settings,
  Building2,
  CreditCard,
  QrCode,
  Clock,
  Sparkles,
  Phone,
  Mail,
  FileText,
  Save,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "../../../utils/api";
import { PlatformSettings } from "../../../types";

export const PlatformSettingsTab: React.FC = () => {
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    platformName: "Orchid Brand Smart Laundry",
    bankName: "BCA",
    bankAccountNumber: "",
    bankAccountName: "",
    qrisInfo: "",
    defaultTrialDays: 7,
    defaultAiDailyQuota: 50,
    supportPhone: "",
    supportEmail: "",
    termsUrl: "",
    privacyUrl: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; data: PlatformSettings }>("/api/platform-settings");
      if (res.success && res.data) {
        setFormData(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat setting:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg(null);

    try {
      const res = await api.put<{ success: boolean; message: string }>("/api/platform-settings", formData);
      if (res.success) {
        setStatusMsg({ type: "success", text: "Pengaturan platform berhasil diperbarui!" });
      } else {
        setStatusMsg({ type: "error", text: res.message || "Gagal memperbarui pengaturan." });
      }
    } catch (err: any) {
      setStatusMsg({ type: "error", text: err.message || "Terjadi kesalahan saat menyimpan." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
        <span>Memuat pengaturan platform...</span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Settings className="w-6 h-6 text-indigo-600" />
            <span>Pengaturan Sistem & Rekening Platform</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Konfigurasi rekening penerimaan pembayaran tagihan, durasi trial default, dan kontak dukungan.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2 ${
            statusMsg.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}
        >
          {statusMsg.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Bagian 1: Rekening Pembayaran */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <CreditCard className="w-4 h-4 text-indigo-600" />
            <span>Rekening Bank Penerima Pembayaran</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nama Bank
              </label>
              <input
                type="text"
                placeholder="BCA / Mandiri / BRI / BSI"
                value={formData.bankName || ""}
                onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor Rekening
              </label>
              <input
                type="text"
                placeholder="Contoh: 8888999900"
                value={formData.bankAccountNumber || ""}
                onChange={(e) => setFormData({ ...formData, bankAccountNumber: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-mono font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Atas Nama Pemilik Rekening
              </label>
              <input
                type="text"
                placeholder="PT ORCHID DIGITAL INDONESIA"
                value={formData.bankAccountName || ""}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Informasi QRIS (Opsional)
            </label>
            <input
              type="text"
              placeholder="Tautan gambar QRIS atau nomor merchant"
              value={formData.qrisInfo || ""}
              onChange={(e) => setFormData({ ...formData, qrisInfo: e.target.value })}
              className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Bagian 2: Pengaturan Trial & Kuota AI */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Clock className="w-4 h-4 text-indigo-600" />
            <span>Masa Trial & Kuota AI Default</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Durasi Trial Pendaftaran Baru (Hari)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={formData.defaultTrialDays}
                onChange={(e) =>
                  setFormData({ ...formData, defaultTrialDays: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Default: 7 hari masa aktif gratis saat outlet mendaftar mandiri.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Kuota AI Harian Standar (Pesan / Hari)
              </label>
              <input
                type="number"
                min={0}
                value={formData.defaultAiDailyQuota}
                onChange={(e) =>
                  setFormData({ ...formData, defaultAiDailyQuota: Number(e.target.value) })
                }
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jumlah pesan asisten AI per tenant per hari jika tidak ditentukan oleh paket.
              </span>
            </div>
          </div>
        </div>

        {/* Bagian 3: Kontak Bantuan & Tautan Hukum */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Phone className="w-4 h-4 text-indigo-600" />
            <span>Kontak Dukungan CS & Legal</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Nomor WhatsApp Dukungan CS
              </label>
              <input
                type="text"
                placeholder="081234567890"
                value={formData.supportPhone || ""}
                onChange={(e) => setFormData({ ...formData, supportPhone: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email Dukungan
              </label>
              <input
                type="email"
                placeholder="support@orchidbrand.com"
                value={formData.supportEmail || ""}
                onChange={(e) => setFormData({ ...formData, supportEmail: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tautan Syarat & Ketentuan (URL)
              </label>
              <input
                type="url"
                placeholder="https://orchidbrand.com/terms"
                value={formData.termsUrl || ""}
                onChange={(e) => setFormData({ ...formData, termsUrl: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Tautan Kebijakan Privasi (URL)
              </label>
              <input
                type="url"
                placeholder="https://orchidbrand.com/privacy"
                value={formData.privacyUrl || ""}
                onChange={(e) => setFormData({ ...formData, privacyUrl: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Tombol Simpan */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Pengaturan Platform</span>
          </button>
        </div>
      </form>
    </div>
  );
};
