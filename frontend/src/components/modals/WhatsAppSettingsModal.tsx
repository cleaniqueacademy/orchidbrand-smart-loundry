import React, { useState } from "react";
import {
  X,
  QrCode,
  CheckCircle2,
  RefreshCw,
  Send,
  Unlink,
  ExternalLink,
  Bot,
  MessageSquare,
  ShieldCheck,
  Store,
  Check,
  Info,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";
import { useConfirm } from "../common/ConfirmContext";
import { Tenant } from "../../types";
import { ModalWrapper } from "../common/ModalWrapper";

interface WhatsAppSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  waData: WAStatusData;
  loading: boolean;
  isSendingTest: boolean;
  onConnect: (forceRefresh?: boolean) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onUpdateMode: (mode: "manual" | "baileys") => Promise<void>;
  onSendTest: (phone: string, message: string) => Promise<boolean>;
  tenants?: Tenant[];
  currentTenantId?: string;
  onSelectTenant?: (tenantId: string) => void;
}

export const WhatsAppSettingsModal: React.FC<WhatsAppSettingsModalProps> = ({
  isOpen,
  onClose,
  waData,
  loading,
  isSendingTest,
  onConnect,
  onDisconnect,
  onUpdateMode,
  onSendTest,
  tenants = [],
  currentTenantId,
  onSelectTenant,
}) => {
  const confirm = useConfirm();

  const [testPhone, setTestPhone] = useState("");
  const [testMessage, setTestMessage] = useState(
    "Halo! Ini adalah pesan uji coba dari sistem Orchid Smart Laundry Gateway. 🧺✨"
  );

  const currentTenant = tenants.find((t) => t.id === currentTenantId) || tenants[0];

  const handleDisconnectConfirm = async () => {
    const confirmed = await confirm({
      title: "Putuskan Koneksi WhatsApp?",
      description:
        "Apakah Anda yakin ingin memutuskan sesi WhatsApp? Anda perlu memindai ulang kode QR untuk menghubungkan kembali.",
      confirmText: "Ya, Putuskan",
      cancelText: "Batal",
      variant: "danger",
    });

    if (confirmed) {
      await onDisconnect();
    }
  };

  const handleSendTestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;
    const ok = await onSendTest(testPhone, testMessage);
    if (ok) {
      setTestPhone("");
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-xl" zIndex="z-[100]">
      <div className="bg-white rounded-2xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-zinc-200">

        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-zinc-100 flex items-center justify-between bg-gradient-to-r from-emerald-950 via-zinc-900 to-zinc-900 text-white rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
              <WhatsAppIcon className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-white">Pengaturan WhatsApp</h2>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Pilih metode pengiriman: Otomatis atau Manual
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5 text-zinc-800 text-xs">
          {/* Multi-Tenant Selector if more than 1 tenant exists */}
          {tenants.length > 1 && onSelectTenant && (
            <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <Store className="w-4 h-4 text-zinc-500 shrink-0" />
                <span className="text-[11px] font-semibold text-zinc-600">Cabang:</span>
                <span className="text-xs font-bold text-zinc-900 truncate">
                  {currentTenant?.outletName || waData.outletName || "Cabang Anda"}
                </span>
              </div>
              <select
                value={currentTenantId || waData.tenantId || ""}
                onChange={(e) => onSelectTenant(e.target.value)}
                className="text-xs font-semibold bg-white border border-zinc-300 rounded-lg px-2.5 py-1 text-zinc-800 outline-none focus:border-zinc-900 cursor-pointer"
              >
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.outletName}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 1. Mode Selector */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-bold text-zinc-900 block text-xs uppercase tracking-wider text-[11px]">
                Metode Pengiriman:
              </label>
              <span className="text-[10px] text-zinc-400 font-medium">Dapat diubah sewaktu-waktu</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Option 1: Otomatis */}
              <div
                onClick={() => onUpdateMode("baileys")}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative ${
                  waData.waMode === "baileys"
                    ? "border-emerald-600 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-600"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        waData.waMode === "baileys"
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">Kirim Otomatis</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">Kirim Langsung</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {waData.waMode === "baileys" ? (
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-300" />
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 mt-2.5 leading-relaxed">
                  Hubungkan nomor WhatsApp untuk mengirimkan notifikasi cucian selesai dan nota secara langsung.
                </p>
              </div>

              {/* Option 2: Manual */}
              <div
                onClick={() => onUpdateMode("manual")}
                className={`p-3.5 rounded-xl border-2 cursor-pointer transition relative ${
                  waData.waMode === "manual"
                    ? "border-blue-700 bg-blue-50/40 shadow-xs ring-1 ring-blue-700"
                    : "border-zinc-200 hover:border-zinc-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        waData.waMode === "manual"
                          ? "bg-blue-800 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="font-bold text-zinc-900 block">Kirim Manual</span>
                      <span className="text-[10px] text-blue-700 font-semibold">Tautan Langsung</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {waData.waMode === "manual" ? (
                      <div className="w-4 h-4 rounded-full bg-blue-800 text-white flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-zinc-300" />
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-zinc-500 mt-2.5 leading-relaxed">
                  Sistem membuka aplikasi WhatsApp dengan pesan nota yang terisi otomatis saat tombol diklik.
                </p>
              </div>
            </div>
          </div>

          {/* 2. Connection Area */}
          {waData.waMode === "baileys" ? (
            <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-4 space-y-4">
              <div className="flex items-center justify-between border-b border-zinc-200/80 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-zinc-900">Status Koneksi</span>
                </div>

                <div>
                  {waData.status === "connected" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Terhubung
                    </span>
                  ) : waData.status === "qrcode" ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-200">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Scan QR
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-zinc-200 text-zinc-700 px-2.5 py-0.5 rounded-full">
                      Belum Terhubung
                    </span>
                  )}
                </div>
              </div>

              {/* State: CONNECTED */}
              {waData.status === "connected" && (
                <div className="space-y-4">
                  <div className="bg-white p-3.5 rounded-xl border border-emerald-200 flex items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-zinc-900 text-xs">
                          {waData.connectedUser?.name || "WhatsApp Gateway Aktif"}
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono">
                          Nomor WA: +{waData.connectedUser?.id || "-"}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleDisconnectConfirm}
                      disabled={loading}
                      className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs transition flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      <Unlink className="w-3.5 h-3.5" />
                      <span>Putuskan</span>
                    </button>
                  </div>

                  {/* Form Test Message */}
                  <form onSubmit={handleSendTestSubmit} className="bg-white p-4 rounded-xl border border-zinc-200 space-y-3">
                    <div className="font-bold text-zinc-900 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-blue-700" />
                      <span>Kirim Pesan Uji Coba</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <div>
                        <label className="text-[11px] text-zinc-500 font-medium block mb-1">
                          Nomor WhatsApp Tujuan:
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="Contoh: 081234567890"
                          value={testPhone}
                          onChange={(e) => setTestPhone(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-zinc-900 transition font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-zinc-500 font-medium block mb-1">
                          Teks Pesan Uji Coba:
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={testMessage}
                          onChange={(e) => setTestMessage(e.target.value)}
                          className="w-full px-3 py-1.5 text-xs bg-zinc-50 border border-zinc-200 rounded-lg outline-none focus:bg-white focus:border-zinc-900 transition resize-none"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSendingTest || !testPhone.trim()}
                      className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      {isSendingTest ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Sedang Mengirim...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Kirim Pesan</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* State: WAITING FOR QR SCAN */}
              {waData.status === "qrcode" && waData.qrCodeDataUrl && (
                <div className="space-y-4 text-center py-2">
                  <div className="bg-white p-4 rounded-2xl border border-zinc-300 inline-block shadow-md">
                    <img
                      src={waData.qrCodeDataUrl}
                      alt="WhatsApp QR Code"
                      className="w-52 h-52 sm:w-60 sm:h-60 mx-auto rounded-lg"
                    />
                  </div>

                  <div className="max-w-md mx-auto text-left bg-white p-3.5 rounded-xl border border-zinc-200 space-y-1.5 text-[11px] text-zinc-600">
                    <div className="font-bold text-zinc-800 mb-1 flex items-center gap-1">
                      <QrCode className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Langkah Menghubungkan:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1 ml-1 text-zinc-500">
                      <li>Buka aplikasi WhatsApp di HP outlet/kasir Anda.</li>
                      <li>
                        Ketuk menu <strong>Titik Tiga</strong> (Android) atau <strong>Pengaturan</strong> (iOS) &gt;{" "}
                        <strong className="text-zinc-800">Perangkat Tertaut</strong>.
                      </li>
                      <li>
                        Ketuk tombol <strong>Tautkan Perangkat</strong> lalu pindai kode QR di atas.
                      </li>
                    </ol>
                  </div>

                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => onConnect(true)}
                      disabled={loading}
                      className="px-3.5 py-1.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-700 font-medium text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                      <span>Muat Ulang QR Baru</span>
                    </button>
                    <button
                      onClick={onDisconnect}
                      className="px-3.5 py-1.5 rounded-lg text-zinc-500 hover:text-zinc-800 text-xs font-medium cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {/* State: CONNECTING (Without QR yet) */}
              {waData.status === "connecting" && (
                <div className="py-8 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-emerald-600 animate-spin mx-auto" />
                  <div className="font-semibold text-zinc-800 text-xs">
                    Menghubungkan ke WhatsApp...
                  </div>
                  <p className="text-[11px] text-zinc-400">Kode QR akan muncul dalam beberapa detik.</p>
                </div>
              )}

              {/* State: DISCONNECTED */}
              {waData.status === "disconnected" && (
                <div className="py-4 text-center space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-zinc-100 text-zinc-400 flex items-center justify-center mx-auto">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-bold text-zinc-800 text-xs">WhatsApp Belum Terhubung</div>
                    <p className="text-[11px] text-zinc-500 mt-0.5 max-w-sm mx-auto">
                      Hubungkan nomor WhatsApp kasir/outlet untuk mengirimkan pesan notifikasi cucian selesai dan nota secara langsung.
                    </p>
                  </div>

                  <button
                    onClick={() => onConnect(false)}
                    disabled={loading}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 mx-auto transition shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>{loading ? "Menyiapkan QR..." : "Hubungkan WhatsApp"}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Manual Mode Explanatory Card */
            <div className="bg-blue-50/50 rounded-xl border border-blue-200 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <ExternalLink className="w-4 h-4" />
                </div>
                <div className="space-y-1">
                  <div className="font-bold text-zinc-900 text-xs">
                    Mode Manual Aktif
                  </div>
                  <p className="text-[11px] text-zinc-600 leading-relaxed">
                    Pada mode ini, Anda tidak perlu menghubungkan WhatsApp ke server.
                    Saat Anda mengklik tombol WA pada antrian cucian atau struk kasir,
                    sistem akan otomatis membuka aplikasi WhatsApp dengan pesan nota yang sudah terformat rapi.
                  </p>
                </div>
              </div>

              {/* Feature Points */}
              <div className="bg-white/80 rounded-lg p-3 border border-blue-100 text-[11px] text-zinc-600 space-y-1.5">
                <div className="flex items-center gap-2 text-zinc-800 font-semibold">
                  <Info className="w-3.5 h-3.5 text-blue-600" />
                  <span>Keuntungan Mode Manual:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 pl-1 text-zinc-600">
                  <li>Tidak perlu scan QR dan tidak membebani server backend.</li>
                  <li>Kasir memegang kendali penuh sebelum mengirimkan pesan ke pelanggan.</li>
                  <li>Bisa dijalankan langsung dari perangkat manapun tanpa sesi logout berkala.</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-100 bg-zinc-50/60 rounded-b-2xl flex items-center justify-between">
          <div className="text-[11px] text-zinc-500">
            Mode saat ini:{" "}
            <strong className={waData.waMode === "baileys" ? "text-emerald-700" : "text-blue-800"}>
              {waData.waMode === "baileys" ? "Otomatis" : "Manual"}
            </strong>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
