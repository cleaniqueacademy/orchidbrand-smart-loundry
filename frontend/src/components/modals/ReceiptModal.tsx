import React, { useState, useEffect, useRef } from "react";
import { X, Printer, Copy, Check, QrCode as QrIcon, FileText, RefreshCw, ExternalLink } from "lucide-react";
import QRCode from "qrcode";
import WhatsAppIcon from "../common/WhatsAppIcon";
import { Order, Tenant } from "../../types";
import { useToast } from "../common/ToastContext";
import { WAStatusData } from "../../hooks/useWhatsAppGateway";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  tenant?: Tenant | null;
  waData?: WAStatusData;
  onSendBaileys?: (phone: string, text: string) => Promise<{ success: boolean; error?: string }>;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  order,
  tenant,
  waData,
  onSendBaileys,
}) => {
  const toast = useToast();
  const [paperWidth, setPaperWidth] = useState<"58mm" | "80mm">("58mm");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  const activeTenant = tenant || {
    id: "tenant-01",
    outletName: "Orchid Laundry - Cabang Melati",
    phone: "081234567890",
    address: "Jl. Melati Raya No. 45, Jakarta",
  };

  useEffect(() => {
    if (order?.invoiceNo) {
      // Generate QR Code containing invoice tracking info
      QRCode.toDataURL(order.invoiceNo, {
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

  if (!isOpen || !order) return null;

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
    window.print();
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
Terima kasih telah mempercayakan pakaian Anda kepada Orchid Laundry!`;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      toast.success("Teks Nota Disalin", "Rincian nota berhasil disalin ke clipboard.");
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const [isSendingViaBaileys, setIsSendingViaBaileys] = useState(false);

  const getReceiptText = () => {
    const paymentNote =
      order.paymentStatus === "paid"
        ? `✅ LUNAS (${order.paymentMethod?.toUpperCase() || "CASH"})`
        : `⚠️ BELUM LUNAS (Rp ${order.totalAmount.toLocaleString("id-ID")})`;
    const rackText = order.rackNumber ? `\n📍 *Lokasi Rak/Keranjang:* ${order.rackNumber}` : "";

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

    return `🧾 *NOTA DIGITAL - ${activeTenant.outletName.toUpperCase()}*\n\nHalo Kak ${order.customer?.name || "Pelanggan"}! 👋\nBerikut rincian nota pesanan cucian Anda:\n\n📄 *No. Nota:* ${order.invoiceNo}\n📅 *Tanggal:* ${formattedDate} ${formattedTime}\n${itemsSummary}\n💰 *Total Tagihan:* Rp ${order.totalAmount.toLocaleString("id-ID")}\n💳 *Status:* ${paymentNote}${rackText}\n\nTerima kasih telah mempercayakan pakaian Anda kepada kami! 🙏`;
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
      <div className="fixed inset-0 bg-zinc-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
        <div className="bg-zinc-900 rounded-2xl max-w-lg w-full p-4 sm:p-6 shadow-2xl border border-zinc-800 animate-in fade-in zoom-in-95 duration-150 my-auto text-white">
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
                {order.rackNumber && (
                  <div className="flex justify-between font-bold text-zinc-900">
                    <span className="text-zinc-600">No. Rak/Keranjang:</span>
                    <span className="bg-zinc-100 px-1 rounded">{order.rackNumber}</span>
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
                <div className="text-[9px] text-zinc-500 tracking-wider mt-1 text-center font-medium">
                  Scan untuk Cek Resi
                </div>
              </div>

              {/* Syarat & Ketentuan Footer */}
              <div className="border-t border-dashed border-zinc-300 pt-2 mt-2 text-[8.5px] leading-tight text-zinc-500 text-center space-y-0.5">
                <p>1. Pengambilan cucian wajib membawa nota ini.</p>
                <p>2. Barang tidak diambil &gt; 30 hari di luar tanggung jawab kami.</p>
                <p className="font-bold text-zinc-700 pt-1">
                  *** TERIMA KASIH ATAS KUNJUNGAN ANDA ***
                </p>
                <p className="text-[8px] text-zinc-400">Powered by Orchid Brand Smart Laundry</p>
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
                className="w-1/2 sm:w-auto px-3.5 py-2 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 text-xs font-medium transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="w-1/2 sm:w-auto px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/20 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Struk</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
