import React, { useEffect, useState } from "react";
import { api } from "../../../utils/api";

const labels: Record<string, string> = {
  created: "Tagihan dibuat", qris_issued: "QRIS tagihan diterbitkan", expired: "Tagihan kedaluwarsa",
  cancelled: "Tagihan dibatalkan", review_required: "Tagihan memerlukan review admin",
  proof_submitted: "Bukti pembayaran diunggah", proof_rejected: "Bukti pembayaran ditolak",
  payment_received: "Pembayaran dikonfirmasi", manual_receipt_recorded: "Dana masuk dicatat admin",
  activated: "Langganan diaktifkan", refund_recorded: "Pengembalian dana dicatat",
};
export function InvoiceTimeline({ invoiceId, status }: { invoiceId: string; status: string }) {
  const [open, setOpen] = useState(false);
  const [events, setEvents] = useState<{ id: string; eventType: string; createdAt: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController(); setLoading(true); setError(null);
    api.get<{ success: boolean; data: typeof events }>(`/api/subscription/invoices/${encodeURIComponent(invoiceId)}/events`, { signal: controller.signal })
      .then(result => { if (!controller.signal.aborted) { if (!result.success || !Array.isArray(result.data)) throw new Error("Riwayat belum tersedia."); setEvents(result.data); } })
      .catch(() => { if (!controller.signal.aborted) setError("Riwayat belum dapat dimuat. Tutup dan buka kembali untuk mencoba lagi."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, invoiceId, status]);
  return <details onToggle={event => setOpen(event.currentTarget.open)} className="text-left text-xs text-zinc-600 whitespace-normal">
    <summary className="cursor-pointer py-2 font-semibold text-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600">Riwayat pembayaran</summary>
    {loading ? <p role="status">Memuat riwayat…</p> : error ? <p role="alert" className="text-rose-700">{error}</p> : events.length ? <ol className="space-y-3 py-2">{events.map(event => <li key={event.id}><p className="font-medium text-zinc-800">{labels[event.eventType] || "Tagihan diperbarui"}</p><time dateTime={event.createdAt}>{new Date(event.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</time></li>)}</ol> : <p className="py-2">Belum ada kejadian tercatat untuk tagihan ini.</p>}
  </details>;
}
