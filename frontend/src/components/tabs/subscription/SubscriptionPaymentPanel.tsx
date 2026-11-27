import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Check, Copy, CreditCard, Loader2, QrCode, RefreshCw, Wallet } from "lucide-react";
import { SubscriptionInvoice, SubscriptionSummary } from "../../../types";
import { api } from "../../../utils/api";
import { InvoiceTimeline } from "./InvoiceTimeline";

interface GeneratedQris {
  invoiceId: string;
  amount: number;
  currency: "IDR";
  qrImage: string;
  merchantName: string;
  confirmation: "admin_verification";
}

interface Props {
  invoice: SubscriptionInvoice | null;
  destination: SubscriptionSummary["platformBank"];
  adminPhone: string;
  gatewayEnabled: boolean;
  busy: boolean;
  onUpload: (invoice: SubscriptionInvoice) => void;
  onGateway: (invoice: SubscriptionInvoice) => void;
  onRefresh: () => Promise<void>;
  onCancel: (invoice: SubscriptionInvoice) => void;
}

type PaymentMethod = "ewallet" | "qris" | "bank";

const rupiah = (value: number) => "Rp " + value.toLocaleString("id-ID");
const formatWib = new Intl.DateTimeFormat("id-ID", {
  timeZone: "Asia/Jakarta",
  dateStyle: "medium",
  timeStyle: "short",
});
const secondaryButton = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-zinc-200 px-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50";
const methodButton = "flex min-h-12 w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-semibold text-zinc-900 hover:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-50";

export function SubscriptionPaymentPanel({ invoice, destination, adminPhone, gatewayEnabled, busy, onUpload, onGateway, onRefresh, onCancel }: Props) {
  const titleId = useId();
  const methodHeading = useRef<HTMLHeadingElement>(null);
  const focusMethodHeading = useRef(false);
  const [method, setMethod] = useState<PaymentMethod | null>(null);
  const [copied, setCopied] = useState<"nominal" | "tujuan" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qris, setQris] = useState<GeneratedQris | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrRetry, setQrRetry] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [, setClock] = useState(Date.now);

  const invoiceId = invoice?.id;
  const amount = invoice?.finalAmount;
  const deadline = invoice?.expiresAt ? Date.parse(invoice.expiresAt) : NaN;
  const payable = !!invoice && ["unpaid", "rejected"].includes(invoice.status) &&
    Number.isSafeInteger(invoice.finalAmount) && invoice.finalAmount > 0 && deadline > Date.now();
  const methods = [
    { id: "ewallet" as const, label: /^go\s*pay$/i.test(destination?.ewalletName?.trim() || "") ? "Kirim GoPay" : destination?.ewalletName?.trim() || "E-Wallet", icon: Wallet, available: !!destination?.ewalletNumber?.trim() },
    { id: "qris" as const, label: "QRIS", icon: QrCode, available: !!destination?.qrisInfo },
    { id: "bank" as const, label: "Transfer Bank", icon: Building2, available: !!(destination?.bankName && destination.bankAccountName && destination.bankAccountNumber) },
  ].filter(option => option.available);
  const selected = methods.find(option => option.id === method);
  const qrisSource = destination?.qrisInfo;
  const pending = invoice?.status === "pending_verification";

  useEffect(() => {
    setMethod(null);
    setCopied(null);
    setError(null);
  }, [invoiceId]);

  useEffect(() => {
    const remaining = deadline - Date.now();
    if (!(remaining > 0)) return;
    const timer = window.setTimeout(() => setClock(Date.now()), remaining);
    return () => window.clearTimeout(timer);
  }, [deadline]);

  // Display only the QR generated for this invoice and amount.
  useEffect(() => {
    setQris(null);
    setQrError(null);
    if (method !== "qris" || !payable || !invoiceId || !qrisSource) return;
    const controller = new AbortController();
    api.get<{ success: boolean; data?: GeneratedQris; message?: string }>(
      "/api/subscription/invoices/" + encodeURIComponent(invoiceId) + "/qris",
      { signal: controller.signal }
    ).then(response => {
      if (controller.signal.aborted) return;
      const qr = response.data;
      if (!response.success || !qr) throw new Error(response.message || "QRIS belum tersedia.");
      if (qr.invoiceId !== invoiceId || qr.amount !== amount || qr.currency !== "IDR" ||
          typeof qr.qrImage !== "string" || !qr.qrImage.startsWith("data:image/png;base64,") ||
          qr.confirmation !== "admin_verification") {
        throw new Error("QRIS tidak sesuai dengan tagihan.");
      }
      setQris(qr);
    }).catch(error => {
      if (!controller.signal.aborted) setQrError(error instanceof Error ? error.message : "QRIS belum tersedia.");
    });
    return () => controller.abort();
  }, [method, payable, invoiceId, amount, deadline, qrisSource, qrRetry]);

  useEffect(() => {
    if (!focusMethodHeading.current) return;
    focusMethodHeading.current = false;
    methodHeading.current?.focus();
  }, [method]);

  const selectMethod = (next: PaymentMethod | null) => {
    focusMethodHeading.current = true;
    setMethod(next);
    setCopied(null);
    setError(null);
  };

  const copy = async (value: string, kind: "nominal" | "tujuan") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setError(null);
    } catch {
      setCopied(null);
      setError("Gagal menyalin. Salin angka secara manual.");
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      await onRefresh();
    } catch {
      setError("Status belum dapat dimuat. Coba lagi.");
    } finally {
      setRefreshing(false);
    }
  };

  const copyTarget = method === "ewallet" ? destination?.ewalletNumber : destination?.bankAccountNumber;
  const accountName = method === "ewallet" ? destination?.ewalletAccountName : destination?.bankAccountName;
  const adminMessage = invoice ? "Halo Admin Cleanique, mohon cek tagihan #" + invoice.invoiceNo + "." : "";
  const adminLink = "https://wa.me/" + adminPhone + "?text=" + encodeURIComponent(adminMessage);
  const currentQr = qris && qris.invoiceId === invoiceId && qris.amount === amount ? qris : null;

  return (
    <section aria-labelledby={titleId} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={titleId} className="text-base font-bold text-zinc-900">Pembayaran langganan</h3>
        {invoice && (
          <button type="button" onClick={refresh} disabled={refreshing || busy} className={secondaryButton}>
            <RefreshCw aria-hidden="true" className={"h-4 w-4 " + (refreshing ? "motion-safe:animate-spin" : "")} />
            {refreshing ? "Memeriksa…" : "Periksa status"}
          </button>
        )}
      </header>

      {!invoice ? <p className="text-sm text-zinc-600">Pilih Perpanjang Langganan untuk membuat tagihan.</p> : (
        <>
          <div className="space-y-2 border-y border-zinc-200 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div>
                <p className="text-xs text-zinc-600">Total tagihan</p>
                <strong className="text-xl tabular-nums text-zinc-900">{rupiah(invoice.finalAmount)}</strong>
              </div>
              {payable && selected && (
                <button type="button" onClick={() => void copy(String(invoice.finalAmount), "nominal")} className={secondaryButton}>
                  {copied === "nominal" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                  <span aria-live="polite">{copied === "nominal" ? "Nominal tersalin" : "Salin nominal"}</span>
                </button>
              )}
            </div>
            {payable && <p className="text-sm text-zinc-700">Batas bayar {formatWib.format(deadline)} WIB</p>}
          </div>

          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}

          {!payable ? (
            <div className="space-y-2">
              <div role="status" className="space-y-1 text-sm text-zinc-700">
                {pending ? (
                  <>
                    <p className="font-semibold text-zinc-900">Menunggu verifikasi</p>
                    <p>Estimasi pemeriksaan 1×24 jam.</p>
                  </>
                ) : invoice.status === "paid" ? (
                  <p>{invoice.activationStatus === "active" ? "Pembayaran diterima. Langganan aktif." : invoice.activationStatus === "refunded" ? "Dana sudah dikembalikan." : "Pembayaran tercatat. Menunggu aktivasi admin."}</p>
                ) : invoice.status === "review_required" ? (
                  <p>Tagihan sedang ditinjau admin. Jangan bayar ulang.</p>
                ) : invoice.status === "cancelled" ? (
                  <p>Tagihan dibatalkan. Buat tagihan baru untuk membayar.</p>
                ) : (
                  <p>Tagihan kedaluwarsa. Jika sudah membayar, hubungi admin.</p>
                )}
              </div>
              {(pending || ["review_required", "expired", "cancelled", "unpaid", "rejected"].includes(invoice.status) ||
                (invoice.status === "paid" && !["active", "refunded"].includes(invoice.activationStatus || ""))) && (
                <a href={adminLink} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center text-sm font-semibold text-blue-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-blue-600">Hubungi Admin</a>
              )}
            </div>
          ) : (
            <>
              {invoice.status === "rejected" && (
                <p role="status" className="text-sm text-rose-700">{invoice.rejectionReason || "Bukti ditolak. Unggah bukti pembayaran yang benar."}</p>
              )}
              {!selected ? (
                <div className="space-y-2">
                  <h4 ref={methodHeading} tabIndex={-1} className="text-sm font-semibold text-zinc-900">Pilih metode pembayaran</h4>
                  {methods.length > 0 || gatewayEnabled ? (
                    <div className="divide-y divide-zinc-200 rounded-xl border border-zinc-200">
                      {methods.map(({ id, label, icon: Icon }) => (
                        <button key={id} type="button" disabled={busy} onClick={() => selectMethod(id)} className={methodButton}>
                          <Icon aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-600" />
                          <span className="flex-1">{label}</span>
                          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-zinc-500" />
                        </button>
                      ))}
                      {gatewayEnabled && (
                        <button type="button" disabled={busy} onClick={() => onGateway(invoice)} className={methodButton}>
                          <CreditCard aria-hidden="true" className="h-5 w-5 shrink-0 text-zinc-600" />
                          <span className="flex-1">Pembayaran online</span>
                          {busy ? <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" /> : <ArrowRight aria-hidden="true" className="h-4 w-4 text-zinc-500" />}
                        </button>
                      )}
                    </div>
                  ) : (
                    <p role="status" className="text-sm text-amber-800">Metode bayar belum tersedia. <a href={adminLink} target="_blank" rel="noreferrer" className="font-semibold underline">Hubungi Admin</a></p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                    <h4 ref={methodHeading} tabIndex={-1} className="text-sm font-semibold text-zinc-900">{selected.label}</h4>
                    <button type="button" onClick={() => selectMethod(null)} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-blue-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-blue-600">
                      <ArrowLeft aria-hidden="true" className="h-4 w-4" /> Ganti metode
                    </button>
                  </div>
                  {selected.id === "qris" ? (
                    qrError ? (
                      <div role="alert" className="space-y-2 text-sm text-rose-700">
                        <p>{qrError}</p>
                        <button type="button" onClick={() => setQrRetry(value => value + 1)} className={secondaryButton}>Coba lagi</button>
                      </div>
                    ) : currentQr ? (
                      <div className="flex flex-col items-center gap-2">
                        <img src={currentQr.qrImage} alt={"QRIS tagihan #" + invoice.invoiceNo} onError={() => setQrError("Gambar QRIS gagal dimuat.")} className="h-auto w-full max-w-56 object-contain" />
                        <p className="text-center text-sm font-medium text-zinc-900">{currentQr.merchantName}</p>
                        <a href={currentQr.qrImage} download={"QRIS-" + invoice.invoiceNo + ".png"} className={secondaryButton}>Unduh QRIS</a>
                        <p className="text-center text-xs text-zinc-600">Pindai QRIS sebelum batas bayar.</p>
                      </div>
                    ) : <p role="status" className="text-sm text-zinc-600">Menyiapkan QRIS…</p>
                  ) : (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-zinc-50 px-3 py-2.5">
                      <div>
                        <p className="text-sm text-zinc-700">{selected.id === "bank" ? [destination?.bankName, accountName].filter(Boolean).join(" · ") : accountName}</p>
                        <strong className="break-all text-base tabular-nums text-zinc-900">{copyTarget}</strong>
                      </div>
                      <button type="button" onClick={() => { if (copyTarget) void copy(copyTarget, "tujuan"); }} className={secondaryButton}>
                        {copied === "tujuan" ? <Check aria-hidden="true" className="h-4 w-4" /> : <Copy aria-hidden="true" className="h-4 w-4" />}
                        <span aria-live="polite">{copied === "tujuan" ? "Tersalin" : selected.id === "bank" ? "Salin rekening" : "Salin nomor"}</span>
                      </button>
                    </div>
                  )}
                  <div>
                    <button type="button" disabled={busy || (selected.id === "qris" && (!currentQr || !!qrError))} onClick={() => onUpload(invoice)} className="min-h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50 sm:w-auto">
                      {invoice.status === "rejected" ? "Unggah ulang bukti" : "Unggah Bukti"}
                    </button>
                    <p className="mt-1.5 text-xs text-zinc-600">Unggah setelah membayar.</p>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-t border-zinc-100 pt-2">
            <p title={"#" + invoice.invoiceNo} className="min-w-0 flex-1 truncate text-xs text-zinc-600">#{invoice.invoiceNo}</p>
            {(payable || pending) && (
              <button type="button" onClick={() => onCancel(invoice)} disabled={busy} className="min-h-10 shrink-0 text-xs font-medium text-rose-700 underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-rose-600 disabled:opacity-50">Batalkan tagihan</button>
            )}
          </div>
          <InvoiceTimeline invoiceId={invoice.id} status={invoice.status + ":" + !!currentQr} />
        </>
      )}
    </section>
  );
}
