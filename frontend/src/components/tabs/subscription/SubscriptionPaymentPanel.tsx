import React, { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, CreditCard, Loader2, QrCode, RefreshCw, Upload } from "lucide-react";
import { SubscriptionInvoice, SubscriptionSummary } from "../../../types";
import { api } from "../../../utils/api";
import { InvoiceTimeline } from "./InvoiceTimeline";

interface GeneratedQris {
  invoiceId: string; amount: number; currency: "IDR"; qrImage: string;
  merchantName: string; merchantCity: string; expiresAt: string; reference: string;
  confirmation: "admin_verification";
}

interface Props {
  invoice: SubscriptionInvoice | null;
  destination: SubscriptionSummary["platformBank"];
  gatewayEnabled: boolean;
  busy: boolean;
  onUpload: (invoice: SubscriptionInvoice) => void;
  onGateway: (invoice: SubscriptionInvoice) => void;
  onRefresh: () => Promise<void>;
  onCancel: (invoice: SubscriptionInvoice) => void;
}

const rupiah = (value: number) => `Rp ${value.toLocaleString("id-ID")}`;

/** Server generates the invoice QR; displaying it never implies settlement. */
export function SubscriptionPaymentPanel({ invoice, destination, gatewayEnabled, busy, onUpload, onGateway, onRefresh, onCancel }: Props) {
  const [method, setMethod] = useState<"qris" | "bank" | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrFailed, setQrFailed] = useState(false);
  const [generatedQris, setGeneratedQris] = useState<GeneratedQris | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRetry, setQrRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    setMethod(destination?.qrisInfo ? "qris" : null); setError(null); setCopied(null);
  }, [invoice?.id]);
  useEffect(() => { setQrFailed(false); }, [destination?.qrisInfo]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const payable = !!invoice && ["unpaid", "rejected"].includes(invoice.status) &&
    Number.isSafeInteger(invoice.finalAmount) && invoice.finalAmount > 0 &&
    !!invoice.expiresAt && Date.parse(invoice.expiresAt) > now;
  const copy = async (text: string, label: string) => {
    if (!text) { setError("Informasi pembayaran belum tersedia. Pilih metode lain atau hubungi admin."); return; }
    try { await navigator.clipboard.writeText(text); setCopied(label); setError(null); }
    catch { setError("Tidak dapat menyalin. Silakan salin angka yang ditampilkan secara manual."); }
  };
  const refresh = async () => {
    setRefreshing(true); setError(null);
    try { await onRefresh(); } catch { setError("Status belum dapat dimuat. Silakan coba lagi."); }
    finally { setRefreshing(false); }
  };
  const canUseQris = !!destination?.qrisInfo;
  const canUseBank = !!destination?.bankAccountNumber && !!destination?.bankAccountName && !!destination?.bankName;
  useEffect(() => {
    if (method !== "qris" || !payable || !invoice || !canUseQris) return;
    const controller = new AbortController();
    setQrLoading(true); setGeneratedQris(null); setQrError(null); setQrFailed(false);
    api.get<{ success: boolean; data?: GeneratedQris; message?: string }>(`/api/subscription/invoices/${encodeURIComponent(invoice.id)}/qris`, { signal: controller.signal })
      .then(response => {
        if (controller.signal.aborted) return;
        const qr = response.data;
        if (!response.success || !qr) throw new Error(response.message || "QRIS belum dapat dibuat.");
        if (qr.invoiceId !== invoice.id || qr.amount !== invoice.finalAmount || qr.currency !== "IDR" || typeof qr.qrImage !== "string" || !qr.qrImage.startsWith("data:image/png;base64,") || qr.confirmation !== "admin_verification") throw new Error("QRIS tidak sesuai dengan tagihan. Coba muat ulang.");
        setGeneratedQris(qr);
      }).catch(error => { if (!controller.signal.aborted) setQrError(error instanceof Error ? error.message : "QRIS belum dapat dibuat."); })
      .finally(() => { if (!controller.signal.aborted) setQrLoading(false); });
    return () => controller.abort();
  }, [method, payable, invoice?.id, invoice?.finalAmount, invoice?.expiresAt, destination?.qrisInfo, qrRetry]);
  useEffect(() => {
    if ((method === "qris" && !canUseQris) || (method === "bank" && !canUseBank)) setMethod(null);
  }, [method, canUseQris, canUseBank]);
  const currentQr = generatedQris?.invoiceId === invoice?.id && generatedQris?.amount === invoice?.finalAmount ? generatedQris : null;

  return <section aria-labelledby="subscription-payment-title" className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6 space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 id="subscription-payment-title" className="text-base font-bold text-zinc-900">{!invoice ? "Pembayaran langganan" : method ? "Selesaikan pembayaran" : "Pilih metode pembayaran"}</h3>
        <p className="mt-1 text-sm text-zinc-600">{invoice ? "Bayar tagihan langganan melalui metode yang tersedia di bawah." : "Buat tagihan melalui Perpanjang Langganan untuk melanjutkan pembayaran."}</p>
      </div>
      {invoice && <button type="button" onClick={refresh} disabled={refreshing} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50">
        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />Periksa status
      </button>}
    </header>
    {invoice && <div className="border-y border-zinc-200 py-4 space-y-2">
      <div className="flex flex-wrap justify-between gap-2"><span className="text-sm text-zinc-600">Total pembayaran</span><strong className="text-xl tabular-nums text-zinc-900">{rupiah(invoice.finalAmount)}</strong></div>
      <p className="break-all text-xs text-zinc-600">Invoice #{invoice.invoiceNo}</p>
      <p className="text-xs text-zinc-600">{invoice.durationMonths} periode × 30 hari{invoice.planName ? ` · ${invoice.planName}` : ""}</p>
      {payable && <p className="text-xs text-zinc-600">Batas pembayaran: {new Date(invoice.expiresAt!).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB · Sisa {Math.max(0, Math.floor((Date.parse(invoice.expiresAt!) - now) / 3600000))} jam {Math.max(0, Math.floor((Date.parse(invoice.expiresAt!) - now) / 60000) % 60)} menit</p>}
    </div>}
    {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
    {invoice && !payable ? <div role="status" className="text-sm text-zinc-700 space-y-1.5">
      {invoice.status === "paid" ? (
        <p>{invoice.activationStatus === "active" ? "Pembayaran diterima dan langganan aktif." : invoice.activationStatus === "refunded" ? "Dana sudah dikembalikan; langganan tidak diaktifkan. Buat tagihan baru untuk berlangganan kembali." : "Pembayaran sudah tercatat. Aktivasi menunggu pemeriksaan admin; Anda tidak perlu membayar ulang."}</p>
      ) : invoice.status === "pending_verification" ? (
        <>
          <p className="font-medium text-zinc-900">Bukti pembayaran sedang diperiksa admin. Anda tidak perlu membayar ulang.</p>
          <p className="text-xs text-zinc-600">
            {invoice.paymentProofUploadedAt ? `Diunggah pada ${new Date(invoice.paymentProofUploadedAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB · ` : ""}
            Estimasi pemeriksaan admin: maksimal 1×24 jam.
            {!invoice.expiresAt ? " Tagihan sebelum pembaruan batas waktu otomatis tetap diproses." : ""}
          </p>
        </>
      ) : invoice.status === "review_required" ? (
        <p>Tagihan memerlukan pemeriksaan admin. Jangan membayar ulang sebelum statusnya dipastikan.</p>
      ) : invoice.status === "cancelled" ? (
        <p>Tagihan dibatalkan. Jangan gunakan QRIS tagihan ini. Anda dapat membuat tagihan baru melalui Perpanjang Langganan.</p>
      ) : (
        <p>Tagihan kedaluwarsa. Jangan gunakan QRIS lama. Jika sudah membayar, hubungi admin; jika belum, buat tagihan baru.</p>
      )}
    </div> : invoice ? <>
      {method && <button type="button" onClick={() => { setMethod(null); setError(null); }} className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-600"><ArrowLeft className="h-4 w-4" />Ganti metode pembayaran</button>}
      {!method ? <div className="space-y-3">
        <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
          <button type="button" disabled={!canUseQris || busy} onClick={() => setMethod("qris")} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <QrCode className="h-5 w-5 shrink-0 text-zinc-700" /><span className="flex-1"><span className="block text-sm font-semibold text-zinc-900">QRIS</span><span className="block text-xs text-zinc-600">{canUseQris ? "Scan dari aplikasi bank atau e-wallet · Verifikasi admin" : "Belum dikonfigurasi oleh admin"}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
          <button type="button" disabled={!canUseBank || busy} onClick={() => setMethod("bank")} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed">
            <Building2 className="h-5 w-5 shrink-0 text-zinc-700" /><span className="flex-1"><span className="block text-sm font-semibold text-zinc-900">Transfer bank</span><span className="block text-xs text-zinc-600">{canUseBank ? `${destination?.bankName} · Verifikasi admin` : "Belum dikonfigurasi oleh admin"}</span></span><ArrowRight className="h-4 w-4 shrink-0 text-zinc-500" />
          </button>
          {gatewayEnabled && <button type="button" disabled={busy} onClick={() => onGateway(invoice)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-50">
            <CreditCard className="h-5 w-5 shrink-0 text-zinc-700" /><span className="flex-1"><span className="block text-sm font-semibold text-zinc-900">Pembayaran online</span><span className="block text-xs text-zinc-600">Lanjut ke checkout Midtrans</span></span>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          </button>}
        </div>
        {!canUseQris && !canUseBank && !gatewayEnabled && <p role="status" className="text-sm text-amber-800">Metode pembayaran belum tersedia. Hubungi admin dengan nomor invoice di atas.</p>}
      </div> : <div className="space-y-5">
        {method === "qris" ? <div className="flex flex-col items-center gap-3">
          <h4 className="font-semibold text-zinc-900">Bayar dengan QRIS</h4>
          {qrLoading ? <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-sm text-zinc-600"><Loader2 className="h-6 w-6 animate-spin" />Menyiapkan QRIS tagihan…</div> : qrError || qrFailed || !currentQr ? <div role="alert" className="text-center text-sm text-rose-700"><p>{qrError || "QRIS belum dapat ditampilkan. Coba lagi atau pilih transfer bank."}</p><button type="button" onClick={() => setQrRetry(value => value + 1)} className="mt-2 underline focus-visible:ring-2 focus-visible:ring-blue-600">Coba buat QRIS lagi</button></div> : <>
            <img src={currentQr.qrImage} alt={`QRIS tagihan ${invoice.invoiceNo} sebesar ${rupiah(invoice.finalAmount)}`} onError={() => setQrFailed(true)} className="h-auto w-full max-w-72 object-contain" />
            <p className="text-center text-sm font-semibold text-zinc-900">{currentQr.merchantName}</p>
            <a href={currentQr.qrImage} download={`QRIS-${invoice.invoiceNo}.png`} className="text-sm font-semibold text-blue-700 hover:underline focus-visible:ring-2 focus-visible:ring-blue-600">Unduh QRIS</a>
            <p className="max-w-md text-center text-sm text-zinc-600">Nominal <strong className="text-zinc-900">{rupiah(invoice.finalAmount)}</strong> sudah terisi di QR. Scan atau unduh untuk membayar dari aplikasi bank/e-wallet. Periksa nominal dan nama penerima sebelum membayar.</p>
          </>}
        </div> : <div className="space-y-2">
          <h4 className="font-semibold text-zinc-900">Transfer ke rekening platform</h4>
          <p className="text-sm text-zinc-600">{destination?.bankName} · {destination?.bankAccountName}</p>
          <div className="flex flex-wrap items-center justify-between gap-3"><strong className="break-all text-xl tabular-nums text-zinc-900">{destination?.bankAccountNumber}</strong><button type="button" onClick={() => copy(destination!.bankAccountNumber!, "rekening")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-600">{copied === "rekening" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === "rekening" ? "Rekening tersalin" : "Salin rekening"}</button></div>
        </div>}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 pt-4">
          <button type="button" onClick={() => copy(String(invoice.finalAmount), "nominal")} className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-600">{copied === "nominal" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied === "nominal" ? "Nominal tersalin" : "Salin nominal"}</button>
          <button type="button" disabled={busy || (method === "qris" && (qrLoading || !!qrError || qrFailed || !currentQr)) || (method === "bank" && !canUseBank)} onClick={() => onUpload(invoice)} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50"><Upload className="h-4 w-4" />Saya sudah bayar, unggah bukti</button>
        </div>
        <p className="text-xs text-zinc-600">Pembayaran ini diperiksa admin setelah bukti diunggah. Menutup halaman atau memilih metode tidak menandai invoice sebagai lunas.</p>
        {method === "qris" && <p className="text-xs text-zinc-600">Gunakan QR hanya untuk tagihan ini sebelum batas bayar. Batas waktu tagihan tidak membatalkan QR yang sudah tersimpan di perangkat.</p>}
      </div>}
    </> : null}
    {invoice && (payable || invoice.status === "pending_verification") && <button type="button" onClick={() => onCancel(invoice)} disabled={busy} className="text-sm font-semibold text-rose-700 hover:underline focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50">Batalkan tagihan ini</button>}
    {invoice && <InvoiceTimeline invoiceId={invoice.id} status={`${invoice.status}:${!!currentQr}`} />}
  </section>;
}
