import { ChangeEvent, FormEvent, KeyboardEvent, useEffect, useId, useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api, uploadFile } from "../../../utils/api";
import { SubscriptionInvoice } from "../../../types";
import { ModalWrapper } from "../../common/ModalWrapper";

interface UploadPaymentProofModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: SubscriptionInvoice | null;
  onSuccess: (invoice: SubscriptionInvoice) => void;
}

export function UploadPaymentProofModal({ isOpen, onClose, invoice, onSuccess }: UploadPaymentProofModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [proofUrl, setProofUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialogId = useId();
  const fileId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement;
    setFile(null);
    setProofUrl(null);
    setError(null);
    if (fileRef.current) {
      fileRef.current.value = "";
      fileRef.current.focus();
    }
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [isOpen, invoice?.id]);

  useEffect(() => {
    if (!isOpen || !file || !file.type.startsWith("image/")) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file, isOpen]);

  if (!invoice) return null;

  const close = () => {
    if (!saving) onClose();
  };

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.currentTarget.files?.[0];
    setProofUrl(null);
    setError(null);
    if (!selected) {
      setFile(null);
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setError("Ukuran bukti maksimal 5 MB.");
      setFile(null);
      event.currentTarget.value = "";
      return;
    }
    if (!/\.(jpe?g|png|webp|pdf)$/i.test(selected.name)) {
      setError("Pilih JPG, PNG, WEBP, atau PDF.");
      setFile(null);
      event.currentTarget.value = "";
      return;
    }
    setFile(selected);
  };

  const keepFocusInside = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const controls = dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)");
    const first = controls?.[0];
    const last = controls?.[controls.length - 1];
    if (!first || !last || first === last ||
        (event.shiftKey && document.activeElement === first) ||
        (!event.shiftKey && document.activeElement === last)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || saving) return;
    setSaving(true);
    setError(null);
    try {
      let url = proofUrl;
      if (!url) {
        const upload = await uploadFile(file, "payments");
        if (!upload.success || !upload.data?.url) throw new Error(upload.message || "Bukti gagal diunggah.");
        url = upload.data.url;
        // Reuse the private file if linking it to the invoice must be retried.
        setProofUrl(url);
      }
      const result = await api.post<{ success: boolean; message?: string }>(
        "/api/subscription/invoices/" + encodeURIComponent(invoice.id) + "/proof",
        { proofUrl: url }
      );
      if (!result.success) throw new Error(result.message || "Bukti gagal dikirim.");
      onClose();
      onSuccess(invoice);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Bukti gagal dikirim. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalWrapper isOpen={isOpen} onClose={close} maxWidth="max-w-md">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={dialogId} onKeyDown={keepFocusInside} className="max-h-[calc(100dvh-1.5rem)] w-full overflow-y-auto rounded-2xl border border-zinc-200 bg-white sm:max-h-[calc(100dvh-2rem)]">
        <header className="flex items-start justify-between gap-3 border-b border-zinc-200 p-4 sm:p-5">
          <div className="min-w-0">
            <h3 id={dialogId} className="text-base font-bold text-zinc-900">Unggah Bukti</h3>
            <p className="mt-1 break-all text-xs text-zinc-600">#{invoice.invoiceNo}</p>
          </div>
          <button type="button" aria-label="Tutup" disabled={saving} onClick={close} className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50">
            <X aria-hidden="true" className="h-5 w-5" />
          </button>
        </header>

        <form onSubmit={submit} className="space-y-3 p-4 sm:p-5" aria-busy={saving}>
          <label htmlFor={fileId} className="block text-sm font-medium text-zinc-900">Bukti pembayaran</label>
          <input ref={fileRef} id={fileId} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" disabled={saving} onChange={selectFile} aria-describedby={fileId + "-hint"} className="block w-full min-w-0 truncate rounded-lg border border-zinc-200 text-sm text-zinc-700 file:mr-2 file:min-h-10 file:border-0 file:bg-zinc-100 file:px-3 file:font-medium file:text-zinc-900 hover:file:bg-zinc-200 focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50" />
          <p id={fileId + "-hint"} className="text-xs text-zinc-600">JPG, PNG, WEBP, atau PDF · Maks. 5 MB</p>
          {preview && <img src={preview} alt="Pratinjau bukti pembayaran" className="mx-auto max-h-36 max-w-full rounded-lg object-contain" />}
          {error && <p role="alert" className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
          <button type="submit" disabled={!file || saving} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:opacity-50">
            {saving && <Loader2 aria-hidden="true" className="h-4 w-4 motion-safe:animate-spin" />}
            {saving ? "Mengirim…" : "Kirim Bukti"}
          </button>
        </form>
      </div>
    </ModalWrapper>
  );
}
