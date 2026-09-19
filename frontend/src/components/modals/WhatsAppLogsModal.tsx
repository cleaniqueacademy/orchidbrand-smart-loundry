import React, { useState, useEffect } from "react";
import { X, CheckCircle2, AlertCircle, Clock, Smartphone, MessageSquare } from "lucide-react";
import { WhatsAppLog } from "../../types";

interface WhatsAppLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string | null;
  invoiceNo?: string | null;
  tenantId?: string | null;
}

export const WhatsAppLogsModal: React.FC<WhatsAppLogsModalProps> = ({
  isOpen,
  onClose,
  orderId,
  invoiceNo,
  tenantId,
}) => {
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const url = orderId
          ? `/api/orders/${orderId}/wa-logs`
          : tenantId
          ? `/api/tenants/${tenantId}/wa-logs`
          : null;
        if (!url) return;
        const res = await fetch(url);
        const json = await res.json();
        if (json.success) {
          setLogs(json.data || []);
        }
      } catch (err) {
        console.error("[WhatsAppLogsModal] Error fetching logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [isOpen, orderId, tenantId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-zinc-900 text-base flex items-center gap-2">
                Riwayat Notifikasi WhatsApp
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {invoiceNo ? `Pesanan: ${invoiceNo}` : "Log pengiriman pesan outlet"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {loading ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              Memuat riwayat notifikasi...
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 text-xs">
              <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2 opacity-60" />
              Belum ada riwayat notifikasi WhatsApp untuk pesanan ini.
            </div>
          ) : (
            logs.map((log) => {
              const isSent = log.status === "sent";
              const timeStr = new Date(log.createdAt).toLocaleString("id-ID", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });

              return (
                <div
                  key={log.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    isSent
                      ? "bg-emerald-50/40 border-emerald-200/80 text-zinc-800"
                      : "bg-rose-50/40 border-rose-200/80 text-zinc-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5 font-semibold">
                      {isSent ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-600" />
                      )}
                      <span className={isSent ? "text-emerald-900" : "text-rose-900"}>
                        {isSent ? "Terkirim Berhasil" : "Gagal Terkirim"}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-200/60 text-zinc-600 uppercase font-medium">
                        {log.mode}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400">
                      <Clock className="w-3 h-3" />
                      <span>{timeStr}</span>
                    </div>
                  </div>

                  <div className="text-xs text-zinc-600 flex items-center gap-2 mb-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-zinc-400" />
                    <span className="font-mono text-[11px] text-zinc-700">
                      {log.recipientPhone}
                    </span>
                    {log.recipientName && (
                      <span className="text-zinc-500">({log.recipientName})</span>
                    )}
                  </div>

                  {log.messagePreview && (
                    <div className="p-2.5 rounded-lg bg-white/80 border border-zinc-100 text-[11px] text-zinc-600 font-mono whitespace-pre-wrap leading-relaxed">
                      {log.messagePreview}
                    </div>
                  )}

                  {log.errorMessage && (
                    <div className="mt-1.5 text-[11px] text-rose-600 font-medium">
                      Error: {log.errorMessage}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-zinc-100 flex justify-end bg-zinc-50/50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
