import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Copy, Check, QrCode as QrIcon, FileText, RefreshCw, ExternalLink, AlertCircle, CheckCircle2 } from "lucide-react";
import QRCode from "qrcode";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Order, Tenant } from "../../types";
import { useToast } from "../common/ToastContext";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";
import { ModalWrapper } from "../common/ModalWrapper";
import { useThermalPrinter } from "../../hooks/useThermalPrinter";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  tenant?: Tenant | null;
  waData?: WAStatusData;
  onSendBaileys?: (phone: string, text: string) => Promise<{ success: boolean; error?: string }>;
  onNavigateToSettings?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  tenant,
  waData,
  onSendBaileys,
  onNavigateToSettings,
}) => {
  const toast = useToast();
  const { config: printerConfig, connectPrinter, isConnecting } = useThermalPrinter();
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">(printerConfig.paperWidth || "58mm");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  // Sync paper width with configured setting
  useEffect(() => {
    if (printerConfig.paperWidth) {
      setPaperWidth(printerConfig.paperWidth);
    }
  }, [printerConfig.paperWidth]);

  const activeTenant = tenant || {
    id: "tenant-01",
    outletName: "Laundry Cleanique - Cabang Melati",
    phone: "081234567890",
    address: "Jl. Melati Raya No. 45, Jakarta",
  };

  useEffect(() => {
    if (order?.invoiceNo) {
      // Generate QR Code containing public tracking link
      const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(order.invoiceNo)}`;
      QRCode.toDataURL(trackingUrl, {
        width: 140,
        margin: 1,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch(() => setQrDataUrl(""));
    }
  }, [order?.invoiceNo]);

  if (!order) return null;

  const orderDate = new Date(order.createdAt);
  const formattedDate = orderDate.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = orderDate.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handlePrint = () => {
    if (printerConfig.requireConnectedBeforePrint && !printerConfig.isConnected) {
      toast.warning(
        "Printer Thermal Belum Terhubung!",
        "Mencoba menyambungkan printer thermal..."
      );
      handleQuickConnect();
      return;
    }
    window.print();
  };

  const handleQuickConnect = async () => {
    try {
      const res = await connectPrinter(
        printerConfig.connectionType,
        printerConfig.deviceName,
        paperWidth
      );
      if (res.success) {
        toast.success(
          "Printer Thermal Terhubung!",
          `${res.deviceName} siap mencetak struk.`
        );
      } else {
        toast.error("Koneksi Gagal", res.error || "Gagal menyambungkan ke printer.");
      }
    } catch (err: any) {
      toast.error("Gagal", err.message);
    }
  };

  const handleCopyText = () => {
    const itemsSection =
      order.items && order.items.length > 0
        ? order.items
            .map(
              (it, idx) =>
                `${idx + 1}. ${it.serviceType}\n   ${it.weightOrQty} ${it.unit} @ Rp ${it.pricePerUnit.toLocaleString("id-ID")} = Rp ${it.subtotal.toLocaleString("id-ID")}`
            )
            .join("\n")
        : `Layanan : ${order.serviceType}\nJumlah  : ${order.weightOrQty} ${order.unit} @ Rp ${order.pricePerUnit.toLocaleString("id-ID")}`;

    const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(order.invoiceNo)}`;

    const text = `🧾 *NOTA LAUNDRY - ${activeTenant.outletName.toUpperCase()}*
📍 ${activeTenant.address}
📞 ${activeTenant.phone}
----------------------------------------
No. Nota: ${order.invoiceNo}
Tanggal : ${formattedDate} ${formattedTime}
Pelanggan: ${order.customer?.name || "Pelanggan Umum"} (${order.customer?.phone || "-"})
----------------------------------------
${itemsSection}
----------------------------------------
TOTAL   : Rp ${order.totalAmount.toLocaleString("id-ID")}
Status  : ${order.paymentStatus === "paid" ? `LUNAS (${order.paymentMethod || "Tunai"})` : "BELUM LUNAS"}
----------------------------------------
🔍 *Lacak Status Cucian Online:*
${trackingUrl}
----------------------------------------
⏰ Jam Buka Outlet:
• Senin - Jumat : 08.00 - 16.00
• Sabtu : 08.00 - 13.00
----------------------------------------
Terima kasih telah mempercayakan pakaian Anda kepada Laundry Cleanique!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Teks Nota Disalin", "Rincian nota berhasil disalin ke clipboard.");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleCopyTrackingLink = () => {
    const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(order.invoiceNo)}`;
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopiedLink(true);
      toast.success("Link Pelacakan Disalin", "Tautan pelacakan publik siap dibagikan ke pelanggan.");
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const [isSendingViaBaileys, setIsSendingViaBaileys] = useState(false);

  const getReceiptText = () => {
    const trackingUrl = `${window.location.origin}/track/${encodeURIComponent(order.invoiceNo)}`;
    const paymentNote =
      order.paymentStatus === "paid"
        ? `✅ LUNAS (${order.paymentMethod?.toUpperCase() || "CASH"})`
        : `⚠️ BELUM LUNAS (Rp ${order.totalAmount.toLocaleString("id-ID")})`;

    const itemsSummary =
      order.items && order.items.length > 0
        ? `🧺 *Rincian Layanan:*\n` +
          order.items
            .map(
              (it, idx) =>
                `  ${idx + 1}. ${it.serviceType} (${it.weightOrQty} ${it.unit} @ Rp ${it.pricePerUnit.toLocaleString("id-ID")}) = *Rp ${it.subtotal.toLocaleString("id-ID")}*`
            )
            .join("\n")
        : `🧺 *Layanan:* ${order.serviceType}\n⚖️ *Jumlah:* ${order.weightOrQty} ${order.unit} @ Rp ${order.pricePerUnit.toLocaleString("id-ID")}`;

    return `🧾 *NOTA DIGITAL - ${activeTenant.outletName.toUpperCase()}*\n\nHalo Kak ${order.customer?.name || "Pelanggan"}! 👋\nBerikut rincian nota pesanan cucian Anda:\n\n📄 *No. Nota:* ${order.invoiceNo}\n📅 *Tanggal:* ${formattedDate} ${formattedTime}\n${itemsSummary}\n💰 *Total Tagihan:* Rp ${order.totalAmount.toLocaleString("id-ID")}\n💳 *Status:* ${paymentNote}\n\n🔍 *Lacak Status Cucian Online:*\n${trackingUrl}\n\n⏰ *Jam Buka Outlet:*\n• Senin - Jumat : 08.00 - 16.00\n• Sabtu : 08.00 - 13.00\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;
  };

  const handleSendViaBaileys = async () => {
    if (!order.customer?.phone) {
      toast.warning("Nomor WA Tidak Ditemukan", "Pelanggan ini tidak memiliki nomor telepon terdaftar.");
      return;
    }
    if (!onSendBaileys) {
      handleSendWhatsAppManual();
      return;
    }

    try {
      setIsSendingViaBaileys(true);
      const text = getReceiptText();
      const res = await onSendBaileys(order.customer.phone, text);
      if (res.success) {
        toast.success(
          "Nota Terkirim!",
          `Berhasil dikirim ke WhatsApp ${order.customer.name || "pelanggan"} (${order.customer.phone}).`
        );
      } else {
        toast.error("Gagal Mengirim", res.error || "Membuka opsi WhatsApp...");
        handleSendWhatsAppManual();
      }
    } catch (err: any) {
      toast.error("Gagal Mengirim", err.message || "Beralih ke WhatsApp");
      handleSendWhatsAppManual();
    } finally {
      setIsSendingViaBaileys(false);
    }
  };

  const handleSendWhatsAppManual = () => {
    if (!order.customer?.phone) {
      toast.warning("Nomor WA Tidak Ditemukan", "Pelanggan ini tidak memiliki nomor telepon terdaftar.");
      return;
    }
    const cleanPhone = order.customer.phone.replace(/[^0-9]/g, "").replace(/^0/, "62");
    const text = getReceiptText();
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`, "_blank");
  };


  return (
    <>
      {/* Print Specific CSS */}
      <style>{`
        @media print {
          @page {
            size: ${paperWidth === "58mm" ? "58mm auto" : "80mm auto"};
            margin: 0;
          }

          body * {
            visibility: hidden !important;
          }

          .receipt-print-area,
          .receipt-print-area * {
            visibility: visible !important;
          }

          .receipt-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: ${paperWidth === "58mm" ? "58mm" : "80mm"} !important;
            max-width: ${paperWidth === "58mm" ? "58mm" : "80mm"} !important;
            margin: 0 auto !important;
            padding: ${paperWidth === "58mm" ? "2mm 3mm" : "4mm 5mm"} !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
            border: none !important;
            font-size: ${paperWidth === "58mm" ? "9.5pt" : "11pt"} !important;
            line-height: 1.25 !important;
          }

          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Screen Modal Overlay */}
      <ModalWrapper isOpen={isOpen && !!order} onClose={onClose} maxWidth="max-w-lg">
        <div className="bg-zinc-900 rounded-2xl w-full p-4 sm:p-6 shadow-2xl border border-zinc-800 my-auto text-white">
          {/* Header Actions */}
          <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 flex items-center justify-center">
                <Printer className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm sm:text-base text-zinc-100">
                  Cetak Struk
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Pratinjau cetak struk kasir
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Thermal Printer Connection Status Banner */}
          {printerConfig.isConnected ? (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs mb-3.5">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-emerald-300">Printer Thermal:</span>
                <span className="text-zinc-200 font-medium">
                  {printerConfig.deviceName} ({printerConfig.paperWidth})
                </span>
              </div>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-mono uppercase font-semibold">
                {printerConfig.connectionType}
              </span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs mb-3.5 space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-200">Printer Thermal Belum Terhubung</p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed mt-0.5">
                    Harus menghubungkan printer thermal di Pengaturan sebelum mencetak struk fisik kasir.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                {onNavigateToSettings && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onNavigateToSettings();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium border border-zinc-700 transition cursor-pointer"
                  >
                    Buka Pengaturan
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleQuickConnect}
                  disabled={isConnecting}
                  className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1.5 shadow transition disabled:opacity-50 cursor-pointer"
                >
                  {isConnecting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3 h-3" />
                  )}
                  Hubungkan Sekarang
                </button>
              </div>
            </div>
          )}

          {/* Paper Width Selector */}
          <div className="flex items-center justify-between bg-zinc-800/80 p-2 rounded-xl mb-4 text-xs">
            <span className="text-zinc-400 font-medium pl-1">Ukuran Kertas:</span>
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-lg border border-zinc-700/60">
              <button
                type="button"
                onClick={() => setPaperWidth("58mm")}
                className={`px-3 py-1 rounded-md font-semibold text-xs transition ${
                  paperWidth === "58mm"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                58mm
              </button>
              <button
                type="button"
                onClick={() => setPaperWidth("80mm")}
                className={`px-3 py-1 rounded-md font-semibold text-xs transition ${
                  paperWidth === "80mm"
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                80mm
              </button>
            </div>
          </div>

          {/* Thermal Receipt Paper Visual Container */}
          <div className="flex justify-center p-3 bg-zinc-950/60 rounded-xl border border-zinc-800/80 max-h-[62vh] overflow-y-auto">
            <div
              ref={receiptRef}
              style={{ width: paperWidth === "58mm" ? "290px" : "380px" }}
              className="receipt-print-area bg-white text-zinc-950 p-4 font-mono text-[11px] sm:text-xs shadow-xl rounded-sm transition-all duration-200 border-t-4 border-t-zinc-300"
            >
              {/* Header Toko */}
              <div className="text-center pb-2">
                <div className="font-extrabold text-sm sm:text-base tracking-tight uppercase">
                  {activeTenant.outletName}
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5 leading-tight">
                  {activeTenant.address}
                </div>
                <div className="text-[10px] text-zinc-600 mt-0.5">
                  Telp/WA: {activeTenant.phone}
                </div>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-zinc-400 my-2" />

              {/* Info Nota */}
              <div className="space-y-0.5 text-[10.5px]">
                <div className="flex justify-between">
                  <span className="text-zinc-600">No. Nota:</span>
                  <span className="font-bold">{order.invoiceNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Tanggal:</span>
                  <span>{formattedDate} {formattedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-600">Pelanggan:</span>
                  <span className="font-bold truncate max-w-[150px]">
                    {order.customer?.name || "Pelanggan Umum"}
                  </span>
                </div>
                {order.customer?.phone && (
                  <div className="flex justify-between">
                    <span className="text-zinc-600">No. WA:</span>
                    <span>{order.customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-zinc-400 my-2" />

              {/* Rincian Layanan Table */}
              <div className="text-[11px] space-y-1.5">
                {order.items && order.items.length > 0 ? (
                  order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="border-b border-dashed border-zinc-200 pb-1.5 last:border-0 last:pb-0"
                    >
                      <div className="font-bold text-zinc-900">{it.serviceType}</div>
                      <div className="flex justify-between items-center text-[10px] text-zinc-600 mt-0.5">
                        <span>
                          {it.weightOrQty} {it.unit} × Rp {it.pricePerUnit.toLocaleString("id-ID")}
                        </span>
                        <span className="font-bold text-zinc-900 text-[11px]">
                          Rp {it.subtotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                      {it.notes && (
                        <div className="text-[9px] text-zinc-500 italic mt-0.5">
                          Ket: {it.notes}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div>
                    <div className="font-bold text-zinc-900">{order.serviceType}</div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-600 mt-0.5">
                      <span>
                        {order.weightOrQty} {order.unit} × Rp {order.pricePerUnit.toLocaleString("id-ID")}
                      </span>
                      <span className="font-bold text-zinc-900 text-[11px]">
                        Rp {order.totalAmount.toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                )}
                {order.notes && (
                  <div className="text-[9.5px] text-zinc-500 italic mt-1 bg-zinc-50 p-1 rounded border border-zinc-200">
                    Catatan: {order.notes}
                  </div>
                )}
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-zinc-400 my-2" />

              {/* Total & Status Bayar */}
              <div className="space-y-1.5 pt-0.5">
                <div className="flex justify-between items-center font-black text-xs sm:text-sm">
                  <span>TOTAL TAGIHAN:</span>
                  <span>Rp {order.totalAmount.toLocaleString("id-ID")}</span>
                </div>

                <div className="flex justify-between items-center pt-1">
                  <span className="text-[10px] font-semibold text-zinc-600">STATUS PEMBAYARAN:</span>
                  {order.paymentStatus === "paid" ? (
                    <span className="font-black px-1.5 py-0.5 bg-zinc-900 text-white text-[10px] rounded">
                      LUNAS
                    </span>
                  ) : (
                    <span className="font-black px-1.5 py-0.5 border border-zinc-900 text-zinc-900 text-[10px] rounded">
                      BELUM LUNAS
                    </span>
                  )}
                </div>
              </div>

              {/* Dashed line */}
              <div className="border-b border-dashed border-zinc-400 my-2.5" />

              {/* QR Code Container */}
              <div className="flex flex-col items-center justify-center pt-1 pb-1">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="QR Code Nota"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain"
                  />
                ) : (
                  <div className="w-20 h-20 border border-zinc-300 flex items-center justify-center text-[9px] text-zinc-400">
                    QR Nota
                  </div>
                )}
                <div className="text-[9px] text-zinc-700 tracking-wider mt-1 text-center font-bold">
                  Scan QR untuk Cek Progres Cucian
                </div>
                <div className="text-[7.5px] text-zinc-500 font-mono text-center">
                  {window.location.host}/track/{order.invoiceNo}
                </div>
              </div>

              {/* Syarat & Ketentuan Footer */}
              <div className="border-t border-dashed border-zinc-300 pt-2 mt-2 text-[8.5px] leading-tight text-zinc-500 text-center space-y-0.5">
                <p>1. Pengambilan cucian wajib membawa nota ini.</p>
                <p>2. Barang tidak diambil &gt; 30 hari di luar tanggung jawab kami.</p>
                <div className="py-1 font-medium text-zinc-600">
                  <p className="font-bold text-zinc-700">⏰ Jam Buka Outlet:</p>
                  <p>Senin - Jumat : 08.00 - 16.00</p>
                  <p>Sabtu : 08.00 - 13.00</p>
                </div>
                <p className="font-bold text-zinc-700 pt-0.5">
                  *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***
                </p>
                <p className="text-[8px] text-zinc-400">Powered by Laundry Cleanique</p>
              </div>
            </div>
          </div>

          {/* Modal Footer Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 mt-4 pt-3 border-t border-zinc-800">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCopyText}
                className="w-1/2 sm:w-auto px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Teks</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyTrackingLink}
                className="w-1/2 sm:w-auto px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition"
                title="Salin link pelacakan publik untuk pelanggan"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Link Tersalin!</span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Salin Link</span>
                  </>
                )}
              </button>

              {waData?.waMode === "baileys" && waData.status === "connected" ? (
                <div className="flex items-center gap-1 w-1/2 sm:w-auto">
                  <button
                    type="button"
                    onClick={handleSendViaBaileys}
                    disabled={isSendingViaBaileys}
                    className="flex-1 sm:flex-initial px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition disabled:opacity-50 cursor-pointer"
                    title="Kirim Nota via WhatsApp"
                  >
                    {isSendingViaBaileys ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Mengirim...</span>
                      </>
                    ) : (
                      <>
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                        <span>Kirim Otomatis</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleSendWhatsAppManual}
                    className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs transition cursor-pointer"
                    title="Buka WhatsApp"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleSendWhatsAppManual}
                  className="w-1/2 sm:w-auto px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Kirim Nota via WhatsApp"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="w-1/2 sm:w-auto px-3.5 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className={`w-1/2 sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg transition cursor-pointer ${
                  printerConfig.requireConnectedBeforePrint && !printerConfig.isConnected
                    ? "bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/40"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/20"
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>
                  {printerConfig.requireConnectedBeforePrint && !printerConfig.isConnected
                    ? "Perlu Sambung Printer"
                    : "Cetak Struk"}
                </span>
              </button>
            </div>
          </div>
        </div>
      </ModalWrapper>
    </>
  );
};
