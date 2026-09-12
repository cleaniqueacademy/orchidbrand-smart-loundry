import React, { useState } from "react";
import { X, ShoppingBag } from "lucide-react";
import { Customer } from "../../types";
import { useToast } from "../common/ToastContext";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  initialCustomerId?: string;
  onSubmit: (orderData: {
    customerId: string;
    serviceType: string;
    weightOrQty: number;
    unit: string;
    pricePerUnit: number;
    paymentStatus: string;
    paymentMethod: string;
    notes?: string;
  }) => Promise<void>;
}

export const CreateOrderModal: React.FC<CreateOrderModalProps> = ({
  isOpen,
  onClose,
  customers,
  initialCustomerId = "",
  onSubmit,
}) => {
  const toast = useToast();
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [serviceType, setServiceType] = useState("Cuci Komplit (Kg)");
  const [weightOrQty, setWeightOrQty] = useState(3.5);
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState(8000);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      toast.warning("Pelanggan Belum Dipilih", "Silakan pilih pelanggan terlebih dahulu!");
      return;
    }
    try {
      setSubmitting(true);
      await onSubmit({
        customerId,
        serviceType,
        weightOrQty,
        unit,
        pricePerUnit,
        paymentStatus,
        paymentMethod,
        notes,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = weightOrQty * pricePerUnit;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl animate-in fade-in zoom-in-95 duration-150 border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-950 flex items-center justify-center border border-sky-200">
              <ShoppingBag className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Tambah Order Laundry Baru
              </h3>
              <p className="text-xs text-slate-500">Catat pesanan pelanggan & terhubung ke kasir</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pilih Pelanggan <span className="text-sky-600">*</span>
            </label>
            <select
              required
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            >
              <option value="">-- Pilih Pelanggan --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">Paket Layanan</label>
            <select
              value={serviceType}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            >
              <option value="Cuci Komplit (Kg)">Cuci Komplit Reguler (Rp 8.000/kg)</option>
              <option value="Cuci Kering + Setrika Express">
                Cuci + Setrika Express (Rp 12.000/kg)
              </option>
              <option value="Setrika Saja (Kg)">Setrika Saja (Rp 6.000/kg)</option>
              <option value="Bedcover King (Pcs)">Bedcover King (Rp 35.000/pcs)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Berat / Jumlah ({unit})
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                required
                value={weightOrQty}
                onChange={(e) => setWeightOrQty(parseFloat(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Harga per {unit} (Rp)
              </label>
              <input
                type="number"
                required
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(parseInt(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-bold"
              />
            </div>
          </div>

          {/* Price Calculation Card */}
          <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200 flex justify-between items-center">
            <span className="text-xs font-bold text-blue-900">Total Biaya Cucian:</span>
            <span className="text-base sm:text-lg font-black text-blue-950">
              Rp {totalAmount.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Status Bayar</label>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-semibold"
              >
                <option value="unpaid">Belum Lunas</option>
                <option value="paid">Lunas</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">Metode Bayar</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-semibold"
              >
                <option value="cash">Tunai (Cash)</option>
                <option value="qris">QRIS</option>
                <option value="transfer">Transfer Bank</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Catatan Order (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: baju putih dipisah, lipat rapi"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
            />
          </div>

          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm hover:bg-slate-50 transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="w-1/2 py-2.5 rounded-xl bg-blue-900 hover:bg-black text-white font-bold text-xs sm:text-sm shadow-md transition disabled:opacity-50"
            >
              {submitting ? "Menyimpan..." : "Simpan Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
