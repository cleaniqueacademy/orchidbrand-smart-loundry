import React, { useEffect, useState } from "react";
import { Clock, X } from "lucide-react";
import { api } from "../../../utils/api";
import { ModalWrapper } from "../../common/ModalWrapper";

const labels: Record<string, string> = {
  created: "Tagihan dibuat",
  qris_issued: "QRIS tagihan diterbitkan",
  expired: "Tagihan kedaluwarsa",
  cancelled: "Tagihan dibatalkan",
  review_required: "Tagihan memerlukan review admin",
  proof_submitted: "Bukti pembayaran diunggah",
  proof_rejected: "Bukti pembayaran ditolak",
  payment_received: "Pembayaran dikonfirmasi",
  manual_receipt_recorded: "Dana masuk dicatat admin",
  activated: "Langganan diaktifkan",
  refund_recorded: "Pengembalian dana dicatat",
};

export function InvoiceTimeline({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<{ id: string; eventType: string; createdAt: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    api
      .get<{ success: boolean; data: typeof events }>(
        `/api/subscription/invoices/${encodeURIComponent(invoiceId)}/events`,
        { signal: controller.signal },
      )
      .then((result) => {
        if (!controller.signal.aborted) {
          if (!result.success || !Array.isArray(result.data)) {
            throw new Error("Riwayat belum tersedia.");
          }
          setEvents(result.data);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError("Riwayat belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, invoiceId, status, reloadKey]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 py-1 px-2 -ml-2 mt-0.5 rounded-lg text-[11px] font-semibold text-blue-700 hover:bg-blue-50/80 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <Clock className="w-3 h-3" />
        <span>Riwayat pembayaran</span>
      </button>

      <ModalWrapper isOpen={open} onClose={() => setOpen(false)} maxWidth="max-w-md">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Riwayat pembayaran invoice"
          className="bg-white rounded-2xl border border-zinc-200 shadow-2xl w-full overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Riwayat Pembayaran</h3>
                <p className="text-[11px] text-zinc-500">Jejak status dan aktivasi tagihan</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition cursor-pointer"
              title="Tutup"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 max-h-[65vh] overflow-y-auto text-xs">
            {loading ? (
              <p role="status" className="py-6 text-center text-zinc-500">Memuat riwayat…</p>
            ) : error ? (
              <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700 flex items-center justify-between gap-2">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="font-semibold underline cursor-pointer shrink-0"
                >
                  Coba lagi
                </button>
              </div>
            ) : events.length ? (
              <ol className="relative border-l border-zinc-200 ml-2 pl-4 space-y-3.5">
                {events.map((event) => (
                  <li key={event.id} className="relative">
                    <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <p className="font-semibold text-zinc-900 leading-snug">
                      {labels[event.eventType] || "Tagihan diperbarui"}
                    </p>
                    <time dateTime={event.createdAt} className="text-[11px] text-zinc-500 block mt-0.5">
                      {new Date(event.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="py-6 text-center text-zinc-500">Belum ada kejadian tercatat untuk tagihan ini.</p>
            )}
          </div>

          <div className="px-5 py-3 border-t border-zinc-100 bg-zinc-50/70 flex justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </ModalWrapper>
    </>
  );
}
