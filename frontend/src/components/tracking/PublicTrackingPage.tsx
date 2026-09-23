import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  Shirt,
  Calendar,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import WhatsAppIcon from "../common/WhatsAppIcon";

interface PublicTrackingPageProps {
  initialInvoiceNo?: string;
  onBackToApp?: () => void;
}

export const PublicTrackingPage: React.FC<PublicTrackingPageProps> = ({
  initialInvoiceNo = "",
  onBackToApp,
}) => {
  const [invoiceQuery, setInvoiceQuery] = useState(initialInvoiceNo);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trackingData, setTrackingData] = useState<any | null>(null);

  const fetchTracking = async (inv: string) => {
    const clean = inv.trim();
    if (!clean) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/track/${encodeURIComponent(clean)}`);
      const json = await res.json();

      if (json.success && json.data) {
        setTrackingData(json.data);
      } else {
        setError(json.message || "Pesanan dengan nomor nota tersebut tidak ditemukan.");
        setTrackingData(null);
      }
    } catch (err: any) {
      setError(err.message || "Gagal menghubungi server pelacakan resi.");
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialInvoiceNo) {
      fetchTracking(initialInvoiceNo);
    }
  }, [initialInvoiceNo]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (invoiceQuery.trim()) {
      fetchTracking(invoiceQuery);
      window.history.replaceState(null, "", `/track/${encodeURIComponent(invoiceQuery.trim())}`);
    }
  };

  // Status mapping
  const order = trackingData?.order;
  const outlet = trackingData?.outlet;
  const customer = trackingData?.customer;

  const getStepIndex = (status: string) => {
    switch (status) {
      case "pending":
        return 0;
      case "washing":
        return 1;
      case "drying_ironing":
      case "process":
        return 2;
      case "ready":
        return 3;
      case "completed":
        return 4;
      default:
        return 1;
    }
  };

  const currentStep = order ? getStepIndex(order.status) : 0;
  const isCancelled = order?.status === "cancelled";

  const steps = [
    { label: "Diterima", desc: "Nota dibuat & masuk antrian" },
    { label: "Pencucian", desc: "Proses pencucian higienis" },
    { label: "Kering & Setrika", desc: "Pengeringan & setrika uap rapi" },
    { label: "Siap Diambil", desc: "Tersimpan di rak kasir" },
    { label: "Selesai", desc: "Pakaian sudah diambil" },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-950">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-bold text-sm sm:text-base leading-tight tracking-tight text-white">
                {outlet?.outletName || "Laundry Cleanique"}
              </h1>
              <p className="text-[10px] text-zinc-400">Portal Cek Resi Cucian Mandiri</p>
            </div>
          </div>

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              Masuk Kasir
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 sm:p-6 space-y-5">
        {/* Search Bar */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xl">
          <form onSubmit={handleSearch} className="space-y-3">
            <label className="block text-xs font-semibold text-zinc-300">
              Lacak Pesanan Laundry Anda
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Masukkan No. Nota (Contoh: INV-202609-001)"
                  value={invoiceQuery}
                  onChange={(e) => setInvoiceQuery(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-800/90 border border-zinc-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 font-mono tracking-wider focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                />
              </div>
              <button
                type="submit"
                disabled={loading || !invoiceQuery.trim()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition disabled:opacity-50 cursor-pointer shadow-md shadow-emerald-950/40"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <span>Cek Status</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-rose-300">Pesanan Tidak Ditemukan</h3>
              <p className="text-xs text-rose-300/80 mt-1 leading-relaxed">{error}</p>
              <p className="text-[11px] text-zinc-400 mt-2">
                Pastikan nomor nota yang Anda masukkan sesuai dengan yang tercantum di struk kasir
                atau hubungi outlet via WhatsApp.
              </p>
            </div>
          </div>
        )}

        {/* Order Details & Progress */}
        {order && (
          <div className="space-y-5 animate-in fade-in duration-300">
            {/* Status Hero Card */}
            <div
              className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden ${
                isCancelled
                  ? "bg-rose-950/30 border-rose-800/80"
                  : order.status === "ready"
                  ? "bg-gradient-to-br from-emerald-950/50 via-zinc-900 to-zinc-900 border-emerald-500/60 shadow-emerald-950/50 shadow-xl"
                  : "bg-zinc-900/90 border-zinc-800 shadow-xl"
              }`}
            >
              {/* Header Status */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
                <div>
                  <div className="text-[11px] font-mono text-zinc-400 flex items-center gap-1.5">
                    <span>NO. NOTA:</span>
                    <span className="font-bold text-white text-xs">{order.invoiceNo}</span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-1">
                    Halo, Kak {customer?.name || "Pelanggan"}! 👋
                  </h2>
                </div>

                <div className="self-start sm:self-auto">
                  {isCancelled ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-900/80 text-rose-200 border border-rose-700">
                      Pesanan Dibatalkan
                    </span>
                  ) : order.status === "ready" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" /> Cucian Siap Diambil!
                    </span>
                  ) : order.status === "completed" ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Selesai Diambil
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Sedang Diproses
                    </span>
                  )}
                </div>
              </div>

              {/* Stepper Progress Bar */}
              {!isCancelled && (
                <div className="mt-6 pt-2">
                  <p className="text-xs font-bold text-zinc-300 mb-4 tracking-wide uppercase">
                    Tahapan Pengerjaan Cucian
                  </p>

                  {/* Desktop / Tablet Stepper */}
                  <div className="relative">
                    {/* Line behind steps */}
                    <div className="hidden sm:block absolute top-4 left-6 right-6 h-0.5 bg-zinc-800 z-0">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-500"
                        style={{
                          width: `${(Math.min(currentStep, 4) / 4) * 100}%`,
                        }}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 relative z-10">
                      {steps.map((step, idx) => {
                        const isDone = idx < currentStep || (currentStep === 4 && idx === 4);
                        const isCurrent = idx === currentStep && currentStep < 4;
                        return (
                          <div
                            key={step.label}
                            className={`flex sm:flex-col items-center sm:text-center gap-3 sm:gap-2 p-2.5 sm:p-2 rounded-xl transition ${
                              isCurrent
                                ? "bg-emerald-950/40 sm:bg-transparent border border-emerald-500/30 sm:border-none"
                                : ""
                            }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                                isDone
                                  ? "bg-emerald-500 text-zinc-950 font-black"
                                  : isCurrent
                                  ? "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500 animate-pulse"
                                  : "bg-zinc-800 text-zinc-500"
                              }`}
                            >
                              {isDone ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                            </div>
                            <div>
                              <p
                                className={`text-xs font-semibold ${
                                  isDone || isCurrent ? "text-white" : "text-zinc-500"
                                }`}
                              >
                                {step.label}
                              </p>
                              <p className="text-[10px] text-zinc-400 hidden sm:block mt-0.5">
                                {step.desc}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* SLA / Dates Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                <Calendar className="w-5 h-5 text-zinc-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-zinc-400">Tanggal Cucian Masuk</p>
                  <p className="text-xs font-semibold text-zinc-200 mt-0.5">
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}{" "}
                    · {new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>

              <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
                <Clock className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-[11px] text-zinc-400">
                    {order.completedAt ? "Waktu Selesai Diambil" : "Estimasi Selesai (SLA)"}
                  </p>
                  <p className="text-xs font-semibold text-emerald-400 mt-0.5">
                    {order.completedAt
                      ? new Date(order.completedAt).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) + " · Selesai"
                      : order.estimatedCompletionAt
                      ? new Date(order.estimatedCompletionAt).toLocaleDateString("id-ID", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        }) +
                        " " +
                        new Date(order.estimatedCompletionAt).toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        }) +
                        " WIB"
                      : "Sesuai antrian pengerjaan"}
                  </p>
                </div>
              </div>
            </div>

            {/* Rincian Cucian & Tagihan */}
            <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wide flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-emerald-400" /> Rincian Cucian
                </h3>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                    order.paymentStatus === "paid"
                      ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      : "bg-amber-950 text-amber-300 border border-amber-800"
                  }`}
                >
                  {order.paymentStatus === "paid" ? "✅ LUNAS" : "⚠️ BELUM LUNAS"}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-zinc-800/50 last:border-none"
                    >
                      <div>
                        <span className="font-semibold text-white">{it.serviceType}</span>
                        <p className="text-[11px] text-zinc-400">
                          {it.weightOrQty} {it.unit} @ Rp{" "}
                          {(Number(it.pricePerUnit) || 0).toLocaleString("id-ID")}
                        </p>
                      </div>
                      <span className="font-bold text-zinc-200 font-mono">
                        Rp{" "}
                        {(
                          Number(it.subtotal) ||
                          Number(it.weightOrQty) * Number(it.pricePerUnit)
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-between text-xs py-1.5">
                    <div>
                      <span className="font-semibold text-white">{order.serviceType}</span>
                      <p className="text-[11px] text-zinc-400">
                        {order.weightOrQty} {order.unit} @ Rp{" "}
                        {(Number(order.pricePerUnit) || 0).toLocaleString("id-ID")}
                      </p>
                    </div>
                    <span className="font-bold text-zinc-200 font-mono">
                      Rp {Number(order.totalAmount || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                )}
              </div>

              {/* Total Summary */}
              <div className="pt-3 border-t border-dashed border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-400">Total Tagihan:</span>
                <span className="text-base sm:text-lg font-black text-white font-mono">
                  Rp {Number(order.totalAmount || 0).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Outlet Information & Contact */}
            <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-5 space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-bold text-zinc-300 uppercase tracking-wide">
                <MapPin className="w-4 h-4 text-emerald-400" /> Informasi Outlet & Pengambilan
              </div>

              <div className="space-y-2 text-xs text-zinc-300">
                <p className="font-semibold text-white text-sm">
                  {outlet?.outletName || "Laundry Cleanique"}
                </p>
                {outlet?.address && (
                  <p className="text-zinc-400 leading-relaxed flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span>{outlet.address}</span>
                  </p>
                )}
                {outlet?.phone && (
                  <p className="text-zinc-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                    <span>+{outlet.phone}</span>
                  </p>
                )}
              </div>

              {/* Jam Buka Outlet */}
              <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-xs space-y-1">
                <p className="font-bold text-zinc-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-400" /> Jam Buka Outlet:
                </p>
                <div className="text-[11px] text-zinc-400 pl-5 space-y-0.5">
                  <p>• {outlet?.operatingHours?.weekdays || "Senin - Jumat : 08.00 - 16.00"}</p>
                  <p>• {outlet?.operatingHours?.saturday || "Sabtu : 08.00 - 13.00"}</p>
                  <p className="text-zinc-500">• {outlet?.operatingHours?.sunday || "Minggu / Tanggal Merah : Tutup"}</p>
                </div>
              </div>

              {/* WhatsApp Button */}
              {outlet?.phone && (
                <div className="pt-1">
                  <a
                    href={`https://wa.me/${outlet.phone.replace(/[^0-9]/g, "").replace(/^0/, "62")}?text=${encodeURIComponent(
                      `Halo ${outlet.outletName}, saya ingin menanyakan pesanan cucian saya dengan No. Nota *${order.invoiceNo}*`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition shadow-md shadow-emerald-950/40"
                  >
                    <WhatsAppIcon className="w-4 h-4" />
                    <span>Hubungi Outlet via WhatsApp</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <footer className="text-center py-6 text-[11px] text-zinc-600 space-y-1">
          <p className="flex items-center justify-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-500" />
            <span>Sistem Pelacakan Resmi Laundry Cleanique</span>
          </p>
          <p>© {new Date().getFullYear()} Laundry Cleanique. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};
