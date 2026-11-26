import React, { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { api } from "../../../utils/api";

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
    <div className="text-left text-xs text-zinc-600 whitespace-normal mt-1">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-1 py-1 px-2 -ml-2 rounded-lg font-semibold text-blue-700 hover:bg-blue-50/80 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
      >
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        <span>Riwayat pembayaran</span>
      </button>

      {open && (
        <div className="mt-1.5 rounded-xl border border-zinc-200 bg-zinc-50/80 p-3">
          {loading ? (
            <p role="status" className="text-zinc-500">Memuat riwayat…</p>
          ) : error ? (
            <div role="alert" className="text-rose-700 flex items-center gap-2 flex-wrap">
              <span>{error}</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="font-semibold underline cursor-pointer"
              >
                Coba lagi
              </button>
            </div>
          ) : events.length ? (
            <ol className="relative border-l border-zinc-300 ml-1.5 pl-3.5 space-y-2.5">
              {events.map((event) => (
                <li key={event.id} className="relative">
                  <span className="absolute -left-[19px] top-1 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-zinc-50" />
                  <p className="font-medium text-zinc-800 leading-snug">
                    {labels[event.eventType] || "Tagihan diperbarui"}
                  </p>
                  <time dateTime={event.createdAt} className="text-[11px] text-zinc-500">
                    {new Date(event.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
                  </time>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-zinc-500">Belum ada kejadian tercatat untuk tagihan ini.</p>
          )}
        </div>
      )}
    </div>
  );
}
