import React, { useState, useEffect } from "react";
import { X, Edit3, Calculator, ShoppingBag } from "lucide-react";
import { Order, Customer, OrderStatus, PaymentStatus } from "../../types";
import { useToast } from "../common/ToastContext";

interface EditOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  customers: Customer[];
  onSubmit: (
    orderId: string,
    updatedData: {
      customerId?: string;
      serviceType: string;
      weightOrQty: number;
      unit: string;
      pricePerUnit: number;
      totalAmount: number;
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string;
      notes?: string;
      rackNumber?: string;
    }
  ) => Promise<void>;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({
  isOpen,
  onClose,
  order,
  customers,
  onSubmit,
}) => {
  const toast = useToast();
  const [customerId, setCustomerId] = useState("");
  const [serviceType, setServiceType] = useState("Cuci Komplit (Kg)");
  const [weightOrQty, setWeightOrQty] = useState(1);
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState(8000);
  const [totalAmount, setTotalAmount] = useState(8000);
  const [isManualTotal, setIsManualTotal] = useState(false);
  const [status, setStatus] = useState<OrderStatus>("pending");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [rackNumber, setRackNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (order) {
      setCustomerId(order.customerId || (order.customer?.id || ""));
      setServiceType(order.serviceType || "Cuci Komplit (Kg)");
      setWeightOrQty(order.weightOrQty || 1);
      setUnit(order.unit || "kg");
      setPricePerUnit(order.pricePerUnit || 8000);
      setTotalAmount(order.totalAmount || 8000);
      setIsManualTotal(false);
      setStatus(order.status || "pending");
      setPaymentStatus(order.paymentStatus || "unpaid");
      setPaymentMethod(order.paymentMethod || "cash");
      setNotes(order.notes || "");
      setRackNumber(order.rackNumber || "");
    }
  }, [order]);

  // Recalculate total when qty or price changes, unless manually overridden
  const handleQtyChange = (qty: number) => {
    setWeightOrQty(qty);
    if (!isManualTotal) {
      setTotalAmount(Math.round(qty * pricePerUnit));
    }
  };

  const handlePriceChange = (price: number) => {
    setPricePerUnit(price);
    if (!isManualTotal) {
      setTotalAmount(Math.round(weightOrQty * price));
    }
  };

  const handleServiceChange = (type: string) => {
    setServiceType(type);
    let price = 8000;
    let u = "kg";
    if (type.includes("Express")) price = 12000;
    if (type.includes("Bedcover")) {
      price = 35000;
      u = "pcs";
    }
    if (type.includes("Setrika")) price = 6000;
    setPricePerUnit(price);
    setUnit(u);
    if (!isManualTotal) {
      setTotalAmount(Math.round(weightOrQty * price));
    }
  };

  if (!isOpen || !order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (weightOrQty <= 0) {
      toast.warning("Input Tidak Valid", "Berat atau kuantitas harus lebih dari 0!");
      return;
    }
    if (pricePerUnit < 0 || totalAmount < 0) {
      toast.warning("Input Tidak Valid", "Harga tidak boleh bernilai negatif!");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit(order.id, {
        customerId: customerId || undefined,
        serviceType,
        weightOrQty,
        unit,
        pricePerUnit,
        totalAmount,
        status,
        paymentStatus,
        paymentMethod,
        notes,
        rackNumber: rackNumber.trim() || undefined,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto no-print">
      <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-slate-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center border border-blue-200">
              <Edit3 className="w-4 h-4 text-blue-800" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                  Edit Pesanan Laundry
                </h3>
                <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                  {order.invoiceNo}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Koreksi berat, tarif harga, layanan, atau status pesanan
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Pelanggan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pelanggan
            </label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
            >
              <option value="">-- Tetap Gunakan Pelanggan Saat Ini --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          {/* Paket Layanan */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Paket Layanan
            </label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
            >
              <option value="Cuci Komplit (Kg)">Cuci Komplit Reguler (Rp 8.000/kg)</option>
              <option value="Cuci Kering + Setrika Express">
                Cuci + Setrika Express (Rp 12.000/kg)
              </option>
              <option value="Setrika Saja (Kg)">Setrika Saja (Rp 6.000/kg)</option>
              <option value="Bedcover King (Pcs)">Bedcover King (Rp 35.000/pcs)</option>
              <option value="Cuci Sepatu">Cuci Sepatu (Rp 25.000/pasang)</option>
              <option value="Cuci Karpet">Cuci Karpet (Rp 15.000/meter)</option>
            </select>
          </div>

          {/* Berat/Qty, Satuan, dan Tarif per Unit */}
          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Berat / Qty <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={weightOrQty}
                onChange={(e) => handleQtyChange(parseFloat(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Satuan
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-semibold text-slate-800"
              >
                <option value="kg">Kg</option>
                <option value="pcs">Pcs</option>
                <option value="pasang">Pasang</option>
                <option value="meter">Meter</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tarif / {unit}
              </label>
              <input
                type="number"
                step="500"
                min="0"
                required
                value={pricePerUnit}
                onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Total Tagihan (Auto / Custom Override) */}
          <div className="bg-slate-50 border border-slate-200/80 p-3 rounded-2xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
                <Calculator className="w-3.5 h-3.5 text-blue-600" />
                Total Biaya Akhir (Rp)
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsManualTotal(!isManualTotal);
                  if (isManualTotal) {
                    setTotalAmount(Math.round(weightOrQty * pricePerUnit));
                  }
                }}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold"
              >
                {isManualTotal ? "Kembalikan ke Auto Hitung" : "Edit Total Manual"}
              </button>
            </div>

            <div className="relative">
              <input
                type="number"
                min="0"
                required
                disabled={!isManualTotal}
                value={totalAmount}
                onChange={(e) => setTotalAmount(parseFloat(e.target.value) || 0)}
                className={`w-full text-sm sm:text-base font-extrabold rounded-xl px-3 py-2 border outline-none ${
                  isManualTotal
                    ? "bg-white border-blue-500 text-blue-900 ring-2 ring-blue-500/20"
                    : "bg-slate-100 border-slate-200 text-slate-900 cursor-not-allowed"
                }`}
              />
              <span className="absolute right-3 top-2 text-xs font-bold text-slate-400">
                {unit === "kg" ? `${weightOrQty} kg × Rp ${pricePerUnit.toLocaleString("id-ID")}` : ""}
              </span>
            </div>
          </div>

          {/* Status Proses & Status Pembayaran */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Status Cucian
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as OrderStatus)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-semibold text-slate-800"
              >
                <option value="pending">Antrian (Pending)</option>
                <option value="washing">Sedang Dicuci</option>
                <option value="drying_ironing">Setrika / Lipat</option>
                <option value="ready">Siap Diambil</option>
                <option value="completed">Selesai</option>
                <option value="cancelled">Dibatalkan (Cancelled)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Status Pembayaran
              </label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-semibold text-slate-800"
              >
                <option value="unpaid">Belum Lunas</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
          </div>

          {/* Metode Pembayaran */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Metode Pembayaran
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "cash", label: "Tunai (Cash)" },
                { id: "qris", label: "QRIS" },
                { id: "transfer", label: "Transfer" },
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setPaymentMethod(m.id)}
                  className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition ${
                    paymentMethod === m.id
                      ? "bg-blue-900 text-white border-blue-900 shadow-xs"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Catatan Khusus & No. Rak */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan / Instruksi Khusus
              </label>
              <input
                type="text"
                placeholder="Contoh: Jangan campur baju putih..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1 flex items-center justify-between">
                <span>No. Rak / Keranjang</span>
                <span className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded font-bold">Lokasi Simpan</span>
              </label>
              <input
                type="text"
                placeholder="Contoh: Rak B-03 / Keranjang 4"
                value={rackNumber}
                onChange={(e) => setRackNumber(e.target.value)}
                className="w-full text-xs border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-900 hover:bg-blue-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-900/20 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? "Menyimpan..." : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
