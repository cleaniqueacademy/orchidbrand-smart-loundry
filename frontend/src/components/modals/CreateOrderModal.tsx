import React, { useState, useEffect } from "react";
import { X, ShoppingBag, UserPlus, Users } from "lucide-react";
import { Customer } from "../../types";
import { useToast } from "../common/ToastContext";
import { ModalWrapper } from "../common/ModalWrapper";

interface CreateOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  initialCustomerId?: string;
  onSubmit: (orderData: {
    customerId?: string;
    newCustomer?: {
      name: string;
      phone: string;
      address?: string;
      notes?: string;
    };
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
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(initialCustomerId);

  // New Customer Fields
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const [serviceType, setServiceType] = useState("Cuci Komplit (Kg)");
  const [weightOrQty, setWeightOrQty] = useState(3.5);
  const [unit, setUnit] = useState("kg");
  const [pricePerUnit, setPricePerUnit] = useState(8000);
  const [paymentStatus, setPaymentStatus] = useState("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialCustomerId) {
      setCustomerId(initialCustomerId);
      setCustomerMode("existing");
    }
  }, [initialCustomerId, isOpen]);

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
    if (type.includes("Sepatu")) {
      price = 25000;
      u = "pasang";
    }
    if (type.includes("Karpet")) {
      price = 15000;
      u = "meter";
    }
    setPricePerUnit(price);
    setUnit(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customerMode === "existing") {
      if (!customerId) {
        toast.warning(
          "Pelanggan Belum Dipilih",
          "Silakan pilih pelanggan dari daftar atau klik '+ Pelanggan Baru'!"
        );
        return;
      }
    } else {
      if (!newCustomerName.trim()) {
        toast.warning("Nama Pelanggan Wajib Diisi", "Silakan masukkan nama pelanggan baru!");
        return;
      }
      if (!newCustomerPhone.trim()) {
        toast.warning(
          "Nomor WhatsApp Wajib Diisi",
          "Silakan masukkan nomor telepon / WhatsApp pelanggan baru!"
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      await onSubmit({
        customerId: customerMode === "existing" ? customerId : undefined,
        newCustomer:
          customerMode === "new"
            ? {
                name: newCustomerName.trim(),
                phone: newCustomerPhone.trim(),
                address: newCustomerAddress.trim(),
              }
            : undefined,
        serviceType,
        weightOrQty,
        unit,
        pricePerUnit,
        paymentStatus,
        paymentMethod,
        notes,
      });

      // Reset form states
      setNewCustomerName("");
      setNewCustomerPhone("");
      setNewCustomerAddress("");
      setNotes("");
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const totalAmount = weightOrQty * pricePerUnit;

  return (
    <ModalWrapper isOpen={isOpen} onClose={onClose} maxWidth="max-w-lg">
      <div className="bg-white rounded-3xl w-full p-5 sm:p-7 shadow-2xl border border-slate-200 my-auto">
        {/* Header Modal */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-100 text-blue-950 flex items-center justify-center border border-sky-200">
              <ShoppingBag className="w-5 h-5 text-sky-700" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-950">
                Tambah Order Laundry Baru
              </h3>
              <p className="text-xs text-slate-500">
                Catat transaksi & pelanggan langsung tersimpan di sistem
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
          {/* Section: Pelanggan (Pilih Terdaftar vs + Pelanggan Baru) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>Pelanggan</span>
                <span className="text-sky-600">*</span>
              </label>

              {/* Toggle Segmented Switcher */}
              <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold border border-slate-200/60">
                <button
                  type="button"
                  onClick={() => setCustomerMode("existing")}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                    customerMode === "existing"
                      ? "bg-white text-slate-900 shadow-xs"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <Users className="w-3 h-3" />
                  <span>Terdaftar ({customers.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerMode("new")}
                  className={`px-2.5 py-1 rounded-md transition flex items-center gap-1 ${
                    customerMode === "new"
                      ? "bg-blue-900 text-white shadow-xs"
                      : "text-blue-700 hover:text-blue-900 hover:bg-blue-50"
                  }`}
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Pelanggan Baru</span>
                </button>
              </div>
            </div>

            {customerMode === "existing" ? (
              <div className="space-y-1">
                <select
                  required={customerMode === "existing"}
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
                >
                  <option value="">-- Pilih Pelanggan Terdaftar --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1"
                  >
                    <span>Pelanggan belum ada?</span>
                    <span className="font-bold">+ Input Data Baru di Sini</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Inline Form Pelanggan Baru */
              <div className="bg-blue-50/70 border border-blue-200/90 rounded-2xl p-3.5 space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-blue-950 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-blue-700" />
                    Data Pelanggan Baru
                  </span>
                  <span className="text-[10px] bg-blue-200/70 text-blue-900 font-bold px-2 py-0.5 rounded-full">
                    Auto-Save ke Database
                  </span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required={customerMode === "new"}
                    placeholder="Contoh: Ibu Rahmawati / Mas Dimas"
                    value={newCustomerName}
                    onChange={(e) => setNewCustomerName(e.target.value)}
                    className="w-full text-xs border border-blue-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      No. WhatsApp / HP <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required={customerMode === "new"}
                      placeholder="Contoh: 081234567890"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full text-xs border border-blue-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Alamat / Kos (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kos Melati Kamar 3"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      className="w-full text-xs border border-blue-200 rounded-xl px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 outline-none font-medium"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-0.5 text-[10.5px] text-blue-800">
                  <span>💡 Tersimpan otomatis, tidak perlu bolak-balik buka menu Pelanggan.</span>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className="font-semibold text-slate-600 hover:text-slate-900 underline shrink-0 ml-2"
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Paket Layanan */}
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
              <option value="Cuci Sepatu">Cuci Sepatu (Rp 25.000/pasang)</option>
              <option value="Cuci Karpet">Cuci Karpet (Rp 15.000/meter)</option>
            </select>
          </div>

          {/* Berat / Jumlah & Harga */}
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

          {/* Status Bayar & Metode Bayar */}
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

          {/* Catatan & No. Rak / Keranjang */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Catatan Order (Opsional)
              </label>
              <input
                type="text"
                placeholder="Contoh: jangan campur putih"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full text-xs sm:text-sm border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-sky-500/20 focus:border-sky-600 outline-none font-medium"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-2.5 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
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
    </ModalWrapper>
  );
};
