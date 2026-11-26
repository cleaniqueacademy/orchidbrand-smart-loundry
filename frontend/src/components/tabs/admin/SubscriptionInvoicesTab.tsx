import React, { useState, useEffect } from "react";
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  RefreshCw,
  ExternalLink,
  Store,
  Tag,
  AlertCircle,
  Eye,
  X,
  ShieldCheck,
  Check,
  Loader2,
} from "lucide-react";
import { paymentStatusLabel } from "../../../utils/paymentStatus";
import { api } from "../../../utils/api";
import { InvoiceTimeline } from "../subscription/InvoiceTimeline";
import { SubscriptionInvoice } from "../../../types";
import { useToast } from "../../common/ToastContext";
import { useConfirm } from "../../common/ConfirmContext";

interface SubscriptionInvoicesTabProps {
  onVerifySuccess?: () => void;
}

function defaultWibDateTimeInput(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export const SubscriptionInvoicesTab: React.FC<SubscriptionInvoicesTabProps> = ({
  onVerifySuccess,
}) => {
  const toast = useToast();
  const confirm = useConfirm();
  const [receiving, setReceiving] = useState<SubscriptionInvoice | null>(null);
  const [receiptReference, setReceiptReference] = useState("");
  const [receiptAmount, setReceiptAmount] = useState("");
  const [receiptTime, setReceiptTime] = useState("");
  const [receiptNotes, setReceiptNotes] = useState("");
  const [receiptBusy, setReceiptBusy] = useState(false);
  const [showAttentionList, setShowAttentionList] = useState(false);
  const [reopeningId, setReopeningId] = useState<string | null>(null);
  const openReceiptModal = (inv: SubscriptionInvoice) => {
    setReceiving(inv);
    setReceiptReference("");
    setReceiptAmount(String(inv.finalAmount));
    setReceiptTime(defaultWibDateTimeInput());
    setReceiptNotes("");
  };
  const reopenInvoice = async (invoice: SubscriptionInvoice) => {
    setReopeningId(invoice.id);
    try {
      const result = await api.post<{ success: boolean; message?: string }>(`/api/subscription/invoices/${encodeURIComponent(invoice.id)}/reopen`, {});
      if (!result.success) throw new Error(result.message || "Gagal membuka kembali tagihan.");
      toast.success("Tagihan Dibuka Kembali", result.message || "Batas waktu 24 jam baru telah ditetapkan.");
      await fetchInvoices();
    } catch (error) {
      toast.error("Gagal Membuka Kembali", error instanceof Error ? error.message : "Coba lagi nanti.");
    } finally {
      setReopeningId(null);
    }
  };
  const cancelInvoice = async (invoice: SubscriptionInvoice) => {
    const ok = await confirm({ title: "Batalkan tagihan ini?", description: "Pastikan tidak ada penerimaan dana yang belum dicatat. Pembatalan lokal tidak membatalkan QRIS yang sudah disimpan di bank atau e-wallet.", confirmText: "Konfirmasi pembatalan", variant: "danger" });
    if (!ok) return;
    try { const result = await api.post<{success:boolean;message?:string}>(`/api/subscription/invoices/${encodeURIComponent(invoice.id)}/cancel`, { reason: "Pembatalan dikonfirmasi admin setelah pemeriksaan tagihan.", acknowledgeSavedQris: true }); if (!result.success) throw new Error(result.message); await fetchInvoices(); }
    catch (error) { toast.error("Pembatalan gagal", error instanceof Error ? error.message : "Coba lagi nanti."); }
  };
  const [reviewing, setReviewing] = useState<SubscriptionInvoice | null>(null);
  const [reviewTier, setReviewTier] = useState("pro");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [adjusting, setAdjusting] = useState<SubscriptionInvoice | null>(null);
  const [adjustmentKey, setAdjustmentKey] = useState(() => crypto.randomUUID());
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [commissionCorrection, setCommissionCorrection] = useState("0");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentBusy, setAdjustmentBusy] = useState(false);
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gatewayEnabled, setGatewayEnabled] = useState(false);
  const [checkingGateway, setCheckingGateway] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    api.get<{ success: boolean; data: { enabled: boolean } }>("/api/payments/midtrans/config", { signal: controller.signal })
      .then(res => { if (!controller.signal.aborted && res.success) setGatewayEnabled(res.data.enabled); }).catch(() => {});
    return () => controller.abort();
  }, []);
  const checkGateway = async (invoice: SubscriptionInvoice) => {
    setCheckingGateway(invoice.id);
    try {
      const res = await api.get<{ success: boolean; message?: string; data: { attempts: { status: string; resolution: string | null }[] } }>(`/api/payments/midtrans/invoices/${encodeURIComponent(invoice.id)}/status`);
      if (!res.success) throw new Error(res.message || "Status tidak tersedia");
      const pendingReview = res.data.attempts.find(attempt => attempt.resolution);
      if (pendingReview) toast.error("Perlu review pembayaran", pendingReview.resolution === "refund_requires_review" ? "Ada pengembalian dana; tinjau transaksi di dashboard Midtrans." : "Invoice menerima pembayaran tambahan; tinjau transaksi di dashboard Midtrans.");
      else toast.success("Status gateway", paymentStatusLabel(res.data.attempts[0]?.status));
      await fetchInvoices();
    } catch (error) { toast.error("Status gagal diperbarui", error instanceof Error ? error.message : "Coba kembali nanti"); }
    finally { setCheckingGateway(null); }
  };

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Modal Penolakan Bukti
  const [rejectingInvoice, setRejectingInvoice] = useState<SubscriptionInvoice | null>(null);
  const [rejectReason, setRejectReason] = useState("Bukti transfer tidak valid atau tidak terbaca");
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const url =
        statusFilter !== "all"
          ? `/api/subscription/invoices?status=${statusFilter}`
          : "/api/subscription/invoices";
      const res = await api.get<{ success: boolean; data: SubscriptionInvoice[]; message?: string }>(url);
      if (!res.success || !Array.isArray(res.data)) throw new Error(res.message || "Data invoice tidak dapat dimuat.");
      setInvoices(res.data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Gagal menghubungi server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleVerify = async (invoice: SubscriptionInvoice) => {
    const ok = await confirm({
      title: "Verifikasi Pembayaran Langganan?",
      description: (
        <span>
          Verifikasi pembayaran Invoice <strong>#{invoice.invoiceNo}</strong> sebesar{" "}
          <strong className="text-emerald-700">Rp {invoice.finalAmount.toLocaleString("id-ID")}</strong> untuk outlet{" "}
          <strong>{invoice.outletName || "Outlet Laundry"}</strong>?
          <br /><br />
          Penerimaan dicatat di buku kas. Masa aktif diperpanjang <strong>{invoice.durationMonths} periode 30 hari</strong> setelah validasi akun, kepemilikan, dan kuota lolos.
        </span>
      ),
      confirmText: "Ya, Verifikasi & Aktifkan",
      cancelText: "Batal",
      variant: "info",
    });

    if (!ok) return;

    try {
      const res = await api.put<{ success: boolean; message: string }>(
        `/api/subscription/invoices/${invoice.id}/verify`,
        {}
      );
      if (res.success) {
        toast.success(
          "Invoice Berhasil Diverifikasi!",
          res.message || "Masa aktif langganan outlet telah berhasil diperpanjang."
        );
        await fetchInvoices();
        if (onVerifySuccess) onVerifySuccess();
      } else {
        toast.error("Gagal Memverifikasi", res.message);
      }
    } catch (err: any) {
      toast.error("Gagal Memverifikasi", err.message || "Terjadi kesalahan server");
    }
  };

  const handleOpenRejectModal = (invoice: SubscriptionInvoice) => {
    setRejectingInvoice(invoice);
    setRejectReason("Bukti transfer tidak valid atau tidak terbaca");
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingInvoice) return;

    setSubmittingReject(true);
    try {
      const res = await api.put<{ success: boolean; message: string }>(
        `/api/subscription/invoices/${rejectingInvoice.id}/reject`,
        { reason: rejectReason }
      );
      if (res.success) {
        toast.info("Invoice Ditolak", res.message || "Status tagihan telah ditolak.");
        setRejectingInvoice(null);
        await fetchInvoices();
      } else {
        toast.error("Gagal Menolak", res.message);
      }
    } catch (err: any) {
      toast.error("Gagal Menolak", err.message || "Terjadi kesalahan server");
    } finally {
      setSubmittingReject(false);
    }
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      (inv.outletName && inv.outletName.toLowerCase().includes(q)) ||
      (inv.ownerName && inv.ownerName.toLowerCase().includes(q)) ||
      (inv.userName && inv.userName.toLowerCase().includes(q)) ||
      (inv.userEmail && inv.userEmail.toLowerCase().includes(q))
    );
  });

  const attentionInvoices = invoices.filter(
    (inv) => inv.status === "review_required" || (inv.status === "paid" && !["active", "refunded"].includes(inv.activationStatus || ""))
  );

  return (
    <div className="space-y-5">
      {attentionInvoices.length > 0 && (
        <div className="p-4 border border-amber-300 rounded-2xl bg-amber-50/90 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-950">
                  {attentionInvoices.length} tagihan memerlukan pemeriksaan atau tindak lanjut admin
                </p>
                <p className="text-[11px] text-amber-800">
                  Termasuk tagihan lama sebelum batas waktu otomatis atau aktivasi yang tertahan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setStatusFilter("review_required")}
                className="px-3 py-1.5 rounded-lg bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold transition cursor-pointer"
              >
                Tab Perlu Review
              </button>
              <button
                type="button"
                onClick={() => setShowAttentionList((prev) => !prev)}
                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-white hover:bg-amber-100/50 text-amber-900 text-xs font-semibold transition cursor-pointer"
              >
                {showAttentionList ? "Tutup Daftar" : `Lihat Rincian (${attentionInvoices.length})`}
              </button>
            </div>
          </div>

          {showAttentionList && (
            <div className="space-y-2 pt-2 border-t border-amber-200/80">
              {attentionInvoices.map((inv) => (
                <div key={inv.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/80 border border-amber-200 rounded-xl px-3 py-2 text-xs">
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-900">
                      #{inv.invoiceNo} · {inv.outletName || "Outlet"} ({inv.userName || inv.ownerName || "-"})
                    </p>
                    <p className="text-[11px] text-zinc-600">
                      {({
                        ownership_changed: "Kepemilikan cabang berubah",
                        owner_suspended_or_archived: "Owner atau cabang diblokir/diarsipkan",
                        expired_or_legacy_invoice: "Masa berlaku atau invoice lama perlu ditinjau",
                        legacy_terms_require_review: "Paket invoice lama perlu dikonfirmasi",
                        quota_requires_review: "Kuota cabang melebihi paket",
                        staff_quota_requires_review: "Kuota staf melebihi paket",
                        plan_unavailable: "Paket tidak tersedia",
                      } as Record<string, string>)[inv.activationReason || ""] || (inv.status === "paid" ? "Pembayaran lunas, aktivasi menunggu proses ulang." : "Tagihan lama/duplikat perlu dibuka kembali (24 jam) atau dibatalkan.")}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {inv.status === "paid" ? (
                      <>
                        <button type="button" className="text-blue-700 font-semibold underline cursor-pointer" onClick={async () => { const result = await api.post<{ success: boolean }>(`/api/subscription/invoices/${inv.id}/retry-activation`); if (!result.success) toast.error("Aktivasi belum dapat diproses"); await fetchInvoices(); }}>Proses ulang aktivasi</button>
                        <button type="button" className="text-zinc-700 font-semibold underline cursor-pointer" onClick={() => { setReviewing(inv); setReviewNotes(""); }}>Tinjau aktivasi</button>
                      </>
                    ) : (
                      <>
                        <button type="button" disabled={reopeningId === inv.id} className="text-blue-700 font-semibold underline cursor-pointer disabled:opacity-50" onClick={() => void reopenInvoice(inv)}>
                          {reopeningId === inv.id ? "Membuka..." : "Buka 24 Jam"}
                        </button>
                        <button type="button" className="text-rose-700 font-semibold underline cursor-pointer" onClick={() => void cancelInvoice(inv)}>Batalkan</button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 tracking-tight">Verifikasi Tagihan Langganan</h2>
          <p className="text-xs text-zinc-500">Tinjau bukti pembayaran dan aktivasi perpanjangan langganan outlet.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari invoice, outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-white border border-zinc-200 rounded-lg text-xs outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 w-52"
            />
          </div>

          <button
            onClick={fetchInvoices}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 transition-all"
            title="Muat Ulang"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {reviewing && <form className="border rounded p-4 space-y-2" onSubmit={async e=>{e.preventDefault();setReviewBusy(true);try{const result=await api.post<{success:boolean;message?:string}>(`/api/subscription/invoices/${reviewing.id}/review-activation`,{tier:reviewTier,notes:reviewNotes});if(!result.success)throw new Error(result.message);setReviewing(null);await fetchInvoices();}catch(error){toast.error("Review gagal",error instanceof Error?error.message:"Coba kembali");}finally{setReviewBusy(false);}}}>
        <p className="font-semibold">Keputusan aktivasi {reviewing.invoiceNo}</p><p className="text-sm">Konfirmasi pembayaran dan paket yang dijanjikan. Harga invoice tetap. Status blokir, kepemilikan, dan kuota tetap wajib diselesaikan.</p>
        <label>Paket yang disetujui<select value={reviewTier} onChange={e=>setReviewTier(e.target.value)} className="border p-2 ml-2"><option value="pro">Pro</option><option value="premium">Premium</option></select></label>
        <label className="block">Alasan dan referensi pemeriksaan<textarea required minLength={10} maxLength={2000} value={reviewNotes} onChange={e=>setReviewNotes(e.target.value)} className="block border p-2 w-full" /></label><button disabled={reviewBusy} className="border p-2" type="submit">Simpan keputusan</button><button type="button" className="p-2" onClick={()=>setReviewing(null)}>Batal</button>
      </form>}
      {adjusting && <form className="p-4 border rounded-xl space-y-3" onSubmit={async e => {
        e.preventDefault(); setAdjustmentBusy(true);
        try { const result = await api.post<{success:boolean;message?:string}>(`/api/subscription/invoices/${adjusting.id}/adjustments`, { requestKey:adjustmentKey, amount:Number(adjustmentAmount), commissionAmount:Number(commissionCorrection), type:"refund", notes:adjustmentNotes });
          if (!result.success) throw new Error(result.message); toast.success("Jurnal refund tersimpan"); setAdjusting(null); await fetchInvoices();
        } catch(error) { toast.error("Jurnal gagal", error instanceof Error ? error.message : "Coba kembali"); } finally { setAdjustmentBusy(false); }
      }}>
        <p className="font-semibold">Jurnal refund {adjusting.invoiceNo}</p><p className="text-sm">Catat setelah transfer refund dilakukan. Sertakan referensi transfer dan keputusan masa aktif dalam catatan.</p>
        <label className="block">Nominal refund (Rp)<input required type="number" min="1" step="1" value={adjustmentAmount} onChange={e=>setAdjustmentAmount(e.target.value)} className="border p-2 ml-2" /></label>
        <label className="block">Koreksi komisi (Rp)<input required type="number" min="0" step="1" value={commissionCorrection} onChange={e=>setCommissionCorrection(e.target.value)} className="border p-2 ml-2" /></label>
        <label className="block">Catatan dan referensi transfer<textarea required minLength={10} maxLength={2000} value={adjustmentNotes} onChange={e=>setAdjustmentNotes(e.target.value)} className="block border p-2 w-full" /></label>
        <button disabled={adjustmentBusy} type="submit" className="border p-2 rounded">Simpan jurnal refund</button><button type="button" onClick={()=>setAdjusting(null)} className="p-2">Batal</button>
      </form>}
      <details><summary>Jurnal refund dan pembayaran ganda</summary><div className="flex flex-wrap gap-2 p-2">{invoices.filter(inv=>["paid", "review_required"].includes(inv.status)).map(inv=><button key={inv.id} className="border p-2 rounded text-xs" onClick={()=>{setAdjusting(inv);setAdjustmentKey(crypto.randomUUID());setAdjustmentAmount("");setCommissionCorrection("0");setAdjustmentNotes("");}}>{inv.invoiceNo}</button>)}</div></details>
      {/* Filter Tabs Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Semua Invoice" },
          { id: "pending_verification", label: "Menunggu Verifikasi" },
          { id: "unpaid", label: "Belum Dibayar" },
          { id: "paid", label: "Lunas" },
          { id: "rejected", label: "Ditolak" },
          { id: "expired", label: "Kedaluwarsa" },
          { id: "cancelled", label: "Dibatalkan" },
          { id: "review_required", label: "Perlu Review" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === tab.id
                ? "bg-blue-700 text-white shadow-xs"
                : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tabel Invoices */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 dark:bg-slate-800/50 text-slate-500 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Invoice No</th>
                <th className="py-3.5 px-4 font-semibold">Outlet & Pemilik</th>
                <th className="py-3.5 px-4 font-semibold">Durasi</th>
                <th className="py-3.5 px-4 font-semibold">Total Tagihan</th>
                <th className="py-3.5 px-4 font-semibold">Bukti Transfer</th>
                <th className="py-3.5 px-4 font-semibold">Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Memuat tagihan...
                  </td>
                </tr>
              ) : loadError ? (
                <tr>
                  <td colSpan={7} role="alert" className="py-8 px-4 text-center text-rose-700">
                    <p className="font-semibold">Gagal memuat invoice</p>
                    <p>{loadError}</p>
                    <button type="button" onClick={fetchInvoices} className="mt-2 underline">Coba lagi</button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    Tidak ada tagihan yang sesuai.
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">
                        #{inv.invoiceNo}
                      </div>
                      <InvoiceTimeline invoiceId={inv.id} status={`${inv.status}:${inv.qrisIssuedAt || ""}`} />
                      <div className="text-[11px] text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 dark:text-white">
                        {inv.outletName || "Outlet Laundry"}
                      </div>
                      <div className="text-[11px] text-slate-600 dark:text-slate-300">
                        {inv.userName || inv.ownerName || "-"}
                      </div>
                      {inv.userEmail && (
                        <div className="text-[10px] text-slate-400">
                          {inv.userEmail}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {inv.durationMonths} periode ({inv.durationMonths * 30} hari)
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        Rp {inv.finalAmount.toLocaleString("id-ID")}
                      </div>
                      {gatewayEnabled && <button type="button" disabled={checkingGateway === inv.id} onClick={() => void checkGateway(inv)} className="block border rounded-lg px-2 py-1 my-1 text-xs font-normal disabled:opacity-50">Periksa gateway</button>}
                      {inv.discountAmount > 0 && (
                        <div className="text-[11px] text-emerald-600">
                          Diskon: -Rp {inv.discountAmount.toLocaleString("id-ID")}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.paymentProofUrl ? (
                        <button
                          onClick={() => { if(inv.paymentProofUrl?.endsWith(".pdf")) window.open(inv.paymentProofUrl,"_blank","noopener,noreferrer"); else setPreviewImage(inv.paymentProofUrl || null); }}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-all text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Foto</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Belum diunggah</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 min-w-[130px] whitespace-nowrap">
                      {["expired", "cancelled", "review_required"].includes(inv.status) ? <span className="text-xs font-semibold text-zinc-700">{({expired:"Kedaluwarsa",cancelled:"Dibatalkan",review_required:"Perlu review admin"} as Record<string,string>)[inv.status]}</span> : inv.status === "paid" ? (
                        <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          Lunas
                        </span>
                      ) : inv.status === "pending_verification" ? (
                        <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          Menunggu
                        </span>
                      ) : inv.status === "rejected" ? (
                        <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          Ditolak
                        </span>
                      ) : (
                        <span className="whitespace-nowrap shrink-0 inline-flex items-center text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                          Belum Bayar
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-y-1.5">
                      {inv.status === "pending_verification" ? (
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleVerify(inv)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all inline-flex items-center gap-1 shadow-sm cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verifikasi</span>
                          </button>
                          <button
                            onClick={() => handleOpenRejectModal(inv)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all inline-flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                          <button
                            type="button"
                            className="px-2.5 py-1.5 rounded-xl border border-zinc-200 hover:bg-zinc-50 text-rose-700 font-semibold text-[11px] cursor-pointer"
                            onClick={() => cancelInvoice(inv)}
                          >
                            Batalkan
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {inv.status === "review_required" && (
                            <button
                              type="button"
                              disabled={reopeningId === inv.id}
                              className="px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
                              onClick={() => void reopenInvoice(inv)}
                            >
                              {reopeningId === inv.id ? "Membuka..." : "Buka 24 Jam"}
                            </button>
                          )}
                          <button
                            type="button"
                            className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer"
                            onClick={() => openReceiptModal(inv)}
                          >
                            Catat Mutasi
                          </button>
                          {["unpaid", "rejected", "review_required", "expired"].includes(inv.status) && (
                            <button
                              type="button"
                              className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer"
                              onClick={() => cancelInvoice(inv)}
                            >
                              Batalkan
                            </button>
                          )}
                          {inv.status === "paid" && (
                            <span className="text-slate-500 text-[11px]">Pembayaran tercatat</span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Catat Mutasi / Penerimaan Dana Khusus */}
      {receiving && (
        <div role="dialog" aria-modal="true" aria-label={`Catat mutasi dana ${receiving.invoiceNo}`} className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-lg w-full border border-zinc-200 shadow-2xl space-y-4">
            <div className="flex justify-between items-start border-b border-zinc-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-zinc-900">Catat Mutasi Dana · #{receiving.invoiceNo}</h3>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  {receiving.outletName || "Outlet"} · Tagihan Rp {receiving.finalAmount.toLocaleString("id-ID")}
                </p>
              </div>
              <button type="button" disabled={receiptBusy} onClick={() => setReceiving(null)} className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-zinc-600 bg-zinc-50 border border-zinc-200 rounded-xl p-3">
              Gunakan untuk pencatatan mutasi pengecualian (dana masuk pada tagihan kedaluwarsa/dibatalkan, selisih nominal, atau pembayaran ganda). Tidak langsung mengaktifkan langganan.
            </p>
            <form
              className="space-y-3"
              onSubmit={async (event) => {
                event.preventDefault();
                setReceiptBusy(true);
                try {
                  const result = await api.post<{ success: boolean; message?: string }>(
                    `/api/subscription/invoices/${encodeURIComponent(receiving.id)}/received`,
                    {
                      reference: receiptReference,
                      amount: Number(receiptAmount),
                      receivedAt: new Date(receiptTime + "+07:00").toISOString(),
                      notes: receiptNotes,
                    }
                  );
                  if (!result.success) throw new Error(result.message);
                  toast.success("Mutasi dana tercatat", result.message);
                  setReceiving(null);
                  await fetchInvoices();
                  onVerifySuccess?.();
                } catch (error) {
                  toast.error("Pencatatan gagal", error instanceof Error ? error.message : "Coba lagi nanti.");
                } finally {
                  setReceiptBusy(false);
                }
              }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-xs font-semibold text-zinc-700">
                  No. Referensi Mutasi Bank / Merchant
                  <input
                    required
                    minLength={6}
                    maxLength={120}
                    value={receiptReference}
                    onChange={(e) => setReceiptReference(e.target.value)}
                    placeholder="Contoh: BCA-261125-001"
                    className="mt-1 block w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs font-mono"
                  />
                </label>
                <label className="text-xs font-semibold text-zinc-700">
                  Nominal Diterima (Rp)
                  <input
                    type="number"
                    required
                    min={1}
                    step={1}
                    value={receiptAmount}
                    onChange={(e) => setReceiptAmount(e.target.value)}
                    className="mt-1 block w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs tabular-nums"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-zinc-700">
                Waktu Pembayaran (WIB)
                <input
                  type="datetime-local"
                  required
                  value={receiptTime}
                  onChange={(e) => setReceiptTime(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs"
                />
              </label>
              <label className="block text-xs font-semibold text-zinc-700">
                Catatan Pemeriksaan
                <textarea
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={3}
                  value={receiptNotes}
                  onChange={(e) => setReceiptNotes(e.target.value)}
                  placeholder="Contoh: Dana masuk sesuai mutasi BCA tanggal 26 Nov, siap ditinjau untuk aktivasi."
                  className="mt-1 block w-full rounded-xl border border-zinc-300 px-3 py-2 text-xs"
                />
              </label>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button type="button" disabled={receiptBusy} onClick={() => setReceiving(null)} className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 cursor-pointer">
                  Batal
                </button>
                <button disabled={receiptBusy} type="submit" className="rounded-xl bg-blue-600 hover:bg-blue-700 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50 cursor-pointer">
                  {receiptBusy ? "Menyimpan..." : "Simpan Catatan Mutasi"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Preview Bukti Transfer */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-4 max-w-xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-3">
            <div className="flex justify-between items-center px-2">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Foto Bukti Transfer
              </h4>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-100 dark:bg-slate-800 p-2">
              <img
                src={previewImage}
                alt="Bukti Transfer"
                className="w-full h-auto object-contain rounded-xl mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Penolakan Tagihan */}
      {rejectingInvoice && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-zinc-200 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-zinc-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-zinc-900">
                    Tolak Bukti Pembayaran
                  </h4>
                  <p className="text-[11px] text-zinc-500">
                    Invoice #{rejectingInvoice.invoiceNo} • {rejectingInvoice.outletName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRejectingInvoice(null)}
                className="p-1 text-zinc-400 hover:text-zinc-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReject} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-zinc-700 block mb-1">
                  Alasan Penolakan:
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  className="w-full p-2.5 text-xs border border-zinc-300 rounded-xl outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none font-medium"
                  placeholder="Contoh: Bukti transfer tidak sesuai nominal / gambar buram..."
                  required
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Alasan ini akan tercatat pada invoice agar pemilik outlet dapat mengunggah bukti ulang yang sah.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setRejectingInvoice(null)}
                  disabled={submittingReject}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-600 hover:bg-zinc-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingReject || !rejectReason.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 transition cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  {submittingReject ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Menolak...</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Konfirmasi Tolak</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
