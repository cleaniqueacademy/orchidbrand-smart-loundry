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
} from "lucide-react";
import { api } from "../../../utils/api";
import { SubscriptionInvoice } from "../../../types";

export const SubscriptionInvoicesTab: React.FC = () => {
  const [invoices, setInvoices] = useState<SubscriptionInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const url = statusFilter !== "all"
        ? `/api/subscription/invoices?status=${statusFilter}`
        : "/api/subscription/invoices";
      const res = await api.get<{ success: boolean; data: SubscriptionInvoice[] }>(url);
      if (res.success && res.data) {
        setInvoices(res.data);
      }
    } catch (err) {
      console.error("Gagal mengambil data invoice:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleVerify = async (invoice: SubscriptionInvoice) => {
    if (
      !confirm(
        `Verifikasi pembayaran Invoice #${invoice.invoiceNo} sebesar Rp ${invoice.finalAmount.toLocaleString("id-ID")}? Masa aktif outlet akan diperpanjang.`
      )
    ) {
      return;
    }

    try {
      const res = await api.put<{ success: boolean; message: string }>(
        `/api/subscription/invoices/${invoice.id}/verify`,
        {}
      );
      if (res.success) {
        alert(res.message);
        fetchInvoices();
      }
    } catch (err: any) {
      alert(err.message || "Gagal memverifikasi invoice");
    }
  };

  const handleReject = async (invoice: SubscriptionInvoice) => {
    const reason = prompt("Masukkan alasan penolakan bukti pembayaran:", "Bukti transfer tidak valid atau tidak terbaca");
    if (reason === null) return;

    try {
      const res = await api.put<{ success: boolean; message: string }>(
        `/api/subscription/invoices/${invoice.id}/reject`,
        { reason }
      );
      if (res.success) {
        alert(res.message);
        fetchInvoices();
      }
    } catch (err: any) {
      alert(err.message || "Gagal menolak invoice");
    }
  };

  const filtered = invoices.filter((inv) => {
    const q = search.toLowerCase();
    return (
      inv.invoiceNo.toLowerCase().includes(q) ||
      (inv.outletName && inv.outletName.toLowerCase().includes(q)) ||
      (inv.ownerName && inv.ownerName.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Verifikasi Tagihan Langganan</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tinjau bukti pembayaran transfer dari mitra outlet dan aktivasi masa perpanjangan langganan.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari invoice, outlet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500 w-64"
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

      {/* Filter Tabs Status */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Semua Invoice" },
          { id: "pending_verification", label: "Menunggu Verifikasi" },
          { id: "unpaid", label: "Belum Dibayar" },
          { id: "paid", label: "Lunas" },
          { id: "rejected", label: "Ditolak" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              statusFilter === tab.id
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20"
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
                      <div className="text-[11px] text-slate-500">
                        {inv.ownerName || "-"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                      {inv.durationMonths} Bulan
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-indigo-600 dark:text-indigo-400">
                        Rp {inv.finalAmount.toLocaleString("id-ID")}
                      </div>
                      {inv.discountAmount > 0 && (
                        <div className="text-[11px] text-emerald-600">
                          Diskon: -Rp {inv.discountAmount.toLocaleString("id-ID")}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.paymentProofUrl ? (
                        <button
                          onClick={() => setPreviewImage(inv.paymentProofUrl || null)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold hover:bg-indigo-100 transition-all text-[11px]"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Lihat Foto</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Belum diunggah</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3" /> Lunas
                        </span>
                      ) : inv.status === "pending_verification" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3 h-3" /> Menunggu
                        </span>
                      ) : inv.status === "rejected" ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
                          <XCircle className="w-3 h-3" /> Ditolak
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">Belum Bayar</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {inv.status === "pending_verification" || inv.status === "unpaid" ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            onClick={() => handleVerify(inv)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all inline-flex items-center gap-1 shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Verifikasi</span>
                          </button>
                          <button
                            onClick={() => handleReject(inv)}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold transition-all inline-flex items-center gap-1"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">Selesai</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
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
    </div>
  );
};
