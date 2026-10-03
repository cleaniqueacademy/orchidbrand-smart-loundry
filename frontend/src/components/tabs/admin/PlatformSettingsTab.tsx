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
  ExternalLink,
  Image as ImageIcon,
  Check,
} from "lucide-react";
import { api } from "../../../utils/api";
import { PlatformSettings } from "../../../types";
import {
  getDirectImageUrl,
  isGoogleDriveUrl,
  parseGoogleDriveFileId,
  getFallbackDriveThumbnailUrl,
} from "../../../utils/googleDriveUtils";

export const PlatformSettingsTab: React.FC = () => {
  const [formData, setFormData] = useState<Partial<PlatformSettings>>({
    platformName: "Laundry Cleanique",
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
                placeholder="PT CLEANIQUE DIGITAL INDONESIA"
                value={formData.bankAccountName || ""}
                onChange={(e) => setFormData({ ...formData, bankAccountName: e.target.value })}
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tautan QRIS Platform (Google Drive / URL Gambar)
                </label>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Mendukung link share Google Drive (file gambar QRIS) atau URL gambar langsung (.png, .jpg).
                </p>
              </div>
              {formData.qrisInfo && isGoogleDriveUrl(formData.qrisInfo) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  <Check className="w-3 h-3 text-emerald-600" />
                  Google Drive Terdeteksi
                </span>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder="Contoh: https://drive.google.com/file/d/1A2B3C.../view?usp=sharing"
                value={formData.qrisInfo || ""}
                onChange={(e) => setFormData({ ...formData, qrisInfo: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              />
            </div>

            {/* Live Preview QRIS Box */}
            {formData.qrisInfo ? (
              <div className="p-4 bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/90 dark:border-slate-700 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-indigo-600" />
                    Preview Live QRIS untuk Tenant
                  </span>
                  <a
                    href={getDirectImageUrl(formData.qrisInfo)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 hover:underline"
                  >
                    <span>Buka Tautan Asli</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900/80 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800">
                  <div className="relative w-36 h-36 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center p-2 shadow-inner shrink-0">
                    <img
                      src={getDirectImageUrl(formData.qrisInfo)}
                      alt="Preview QRIS"
                      className="w-full h-full object-contain rounded-lg"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const fallback = getFallbackDriveThumbnailUrl(formData.qrisInfo || "");
                        if (target.src !== fallback) {
                          target.src = fallback;
                        }
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Tampilan QRIS ini akan muncul di modal perpanjangan langganan tenant & akun nonaktif.
                    </p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      {isGoogleDriveUrl(formData.qrisInfo) ? (
                        <>
                          <strong className="text-amber-600 dark:text-amber-400">Penting:</strong> Pastikan setelan berbagi di Google Drive telah diubah ke <span className="font-medium text-slate-700 dark:text-slate-300">&ldquo;Siapa saja yang memiliki link (Pelihat / Viewer)&rdquo;</span> agar gambar dapat dimuat oleh semua pengguna tanpa perlu login Google.
                        </>
                      ) : (
                        "Pastikan URL gambar dapat diakses secara publik dan tidak memerlukan autentikasi khusus."
                      )}
                    </p>
                    {isGoogleDriveUrl(formData.qrisInfo) && (
                      <div className="pt-1">
                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded font-mono break-all">
                          ID: {parseGoogleDriveFileId(formData.qrisInfo) || "-"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3.5 bg-slate-50/60 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl flex items-center gap-2.5 text-xs text-slate-500 dark:text-slate-400">
                <QrCode className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  Belum ada QRIS yang diatur. Anda dapat menyalin tautan share Google Drive foto QRIS outlet Anda ke input di atas.
                </span>
              </div>
            )}
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
                placeholder="support@cleaniquelaundry.com"
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
                placeholder="https://cleaniquelaundry.com/terms"
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
                placeholder="https://cleaniquelaundry.com/privacy"
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
            className="px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition-all flex items-center gap-2 disabled:opacity-60 cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Simpan Pengaturan Platform</span>
          </button>
        </div>
      </form>
    </div>
  );
};
