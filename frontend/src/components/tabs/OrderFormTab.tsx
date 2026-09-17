import React, { useState, useEffect } from "react";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Minus,
  UserCheck,
  ShoppingBag,
  Receipt,
  Lock,
} from "lucide-react";
import { Order, Customer, OrderStatus, PaymentStatus, OrderItem, LaundryService } from "../../types";
import { useToast } from "../common/ToastContext";

interface OrderFormTabProps {
  mode: "create" | "edit";
  order?: Order | null;
  customers: Customer[];
  initialCustomerId?: string;
  tenantServices?: LaundryService[];
  onBack: () => void;
  onSubmitCreate: (orderData: {
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
    totalAmount: number;
    items: OrderItem[];
    paymentStatus: string;
    paymentMethod: string;
    notes?: string;
    rackNumber?: string;
  }) => Promise<void>;
  onSubmitEdit: (
    orderId: string,
    updatedData: {
      customerId?: string;
      serviceType: string;
      weightOrQty: number;
      unit: string;
      pricePerUnit: number;
      totalAmount: number;
      items: OrderItem[];
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      paymentMethod: string;
      notes?: string;
      rackNumber?: string;
    }
  ) => Promise<void>;
}

interface FormItem {
  id: string;
  serviceType: string;
  weightOrQty: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

const DEFAULT_SERVICE_PRESETS = [
  { label: "Cuci Komplit Reguler", unit: "kg", price: 8000, step: 0.5 },
  { label: "Cuci Setrika Express", unit: "kg", price: 12000, step: 0.5 },
  { label: "Setrika Saja", unit: "kg", price: 6000, step: 0.5 },
  { label: "Bedcover King", unit: "pcs", price: 35000, step: 1 },
  { label: "Bedcover Single", unit: "pcs", price: 25000, step: 1 },
  { label: "Cuci Sepatu", unit: "pasang", price: 25000, step: 1 },
  { label: "Cuci Karpet", unit: "meter", price: 15000, step: 1 },
  { label: "Cuci Selimut", unit: "pcs", price: 20000, step: 1 },
];

export const OrderFormTab: React.FC<OrderFormTabProps> = ({
  mode,
  order,
  customers,
  initialCustomerId = "",
  tenantServices = [],
  onBack,
  onSubmitCreate,
  onSubmitEdit,
}) => {
  const toast = useToast();

  const availableServices =
    tenantServices && tenantServices.length > 0
      ? tenantServices.map((s) => ({
          label: s.name,
          unit: s.unit,
          price: s.price,
          step: s.unit === "kg" ? 0.5 : 1,
        }))
      : DEFAULT_SERVICE_PRESETS;

  // Customer Mode & Selection
  const [customerMode, setCustomerMode] = useState<"existing" | "new">("existing");
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newCustomerPhone, setNewCustomerPhone] = useState("");
  const [newCustomerAddress, setNewCustomerAddress] = useState("");

  const initialPreset = availableServices[0] || DEFAULT_SERVICE_PRESETS[0];

  // Order Items
  const [items, setItems] = useState<FormItem[]>([
    {
      id: "item-1",
      serviceType: initialPreset.label,
      weightOrQty: 3,
      unit: initialPreset.unit,
      pricePerUnit: initialPreset.price,
      subtotal: Math.round(3 * initialPreset.price),
      notes: "",
    },
  ]);

  // Payment & General Info
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("unpaid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [orderStatus, setOrderStatus] = useState<OrderStatus>("process");
  const [notes, setNotes] = useState("");
  const [rackNumber, setRackNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Initialize data on edit or preselected customer
  useEffect(() => {
    if (mode === "edit" && order) {
      setCustomerId(order.customerId || order.customer?.id || "");
      setCustomerMode("existing");
      setPaymentStatus(order.paymentStatus || "unpaid");
      setPaymentMethod(order.paymentMethod || "cash");
      const initialStatus = ["pending", "washing", "drying_ironing"].includes(order.status || "")
        ? "process"
        : (order.status || "process");
      setOrderStatus(initialStatus);
      setNotes(order.notes || "");
      setRackNumber(order.rackNumber || "");

      if (order.items && order.items.length > 0) {
        setItems(
          order.items.map((it, idx) => ({
            id: it.id || `item-${idx + 1}`,
            serviceType: it.serviceType,
            weightOrQty: it.weightOrQty,
            unit: it.unit,
            pricePerUnit: it.pricePerUnit,
            subtotal: it.subtotal || it.weightOrQty * it.pricePerUnit,
            notes: it.notes || "",
          }))
        );
      } else {
        setItems([
          {
            id: "item-1",
            serviceType: order.serviceType || "Cuci Komplit Reguler",
            weightOrQty: order.weightOrQty || 1,
            unit: order.unit || "kg",
            pricePerUnit: order.pricePerUnit || 8000,
            subtotal: order.totalAmount || 8000,
            notes: "",
          },
        ]);
      }
    } else if (initialCustomerId) {
      setCustomerId(initialCustomerId);
      setCustomerMode("existing");
    }
  }, [mode, order, initialCustomerId]);

  // Update item service
  const handleServiceSelect = (index: number, serviceName: string) => {
    const preset = availableServices.find((p) => p.label === serviceName);
    const updated = [...items];
    const target = updated[index];
    target.serviceType = serviceName;

    if (preset) {
      target.unit = preset.unit;
      target.pricePerUnit = preset.price;
    }
    target.subtotal = Math.round(target.weightOrQty * target.pricePerUnit);
    setItems(updated);
  };

  // Adjust item quantity (stepper or input)
  const handleQtyChange = (index: number, newQty: number) => {
    const validQty = Math.max(0.1, Math.round(newQty * 10) / 10);
    const updated = [...items];
    updated[index].weightOrQty = validQty;
    updated[index].subtotal = Math.round(validQty * updated[index].pricePerUnit);
    setItems(updated);
  };

  const handleStepQty = (index: number, delta: number) => {
    const item = items[index];
    const isKg = item.unit === "kg";
    const step = isKg ? 0.5 : 1;
    handleQtyChange(index, item.weightOrQty + delta * step);
  };

  // Update item price
  const handlePriceChange = (index: number, price: number) => {
    const validPrice = Math.max(0, price);
    const updated = [...items];
    updated[index].pricePerUnit = validPrice;
    updated[index].subtotal = Math.round(updated[index].weightOrQty * validPrice);
    setItems(updated);
  };

  // Update item note
  const handleItemNoteChange = (index: number, note: string) => {
    const updated = [...items];
    updated[index].notes = note;
    setItems(updated);
  };

  // Add new item line
  const handleAddItem = () => {
    const firstSrv = availableServices[0] || DEFAULT_SERVICE_PRESETS[0];
    const newItem: FormItem = {
      id: `item-${Date.now()}-${items.length + 1}`,
      serviceType: firstSrv.label,
      weightOrQty: 1,
      unit: firstSrv.unit,
      pricePerUnit: firstSrv.price,
      subtotal: firstSrv.price,
      notes: "",
    };
    setItems([...items, newItem]);
  };

  // Remove item line
  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      toast.warning("Item Minimal Satu", "Pesanan laundry harus memiliki minimal 1 item cucian!");
      return;
    }
    setItems(items.filter((_, i) => i !== index));
  };

  // Grand Total Calculation
  const totalAmount = items.reduce((sum, it) => sum + it.subtotal, 0);
  const totalQty = items.reduce((sum, it) => sum + it.weightOrQty, 0);

  // Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (customerMode === "existing" && !customerId) {
      toast.warning("Pilih Pelanggan", "Silakan tentukan pelanggan atau buat pelanggan baru!");
      return;
    }

    if (customerMode === "new") {
      if (!newCustomerName.trim()) {
        toast.warning("Nama Pelanggan", "Nama pelanggan baru wajib diisi!");
        return;
      }
      if (!newCustomerPhone.trim()) {
        toast.warning("Nomor Telepon", "Nomor telepon / WhatsApp wajib diisi!");
        return;
      }
    }

    if (items.length === 0) {
      toast.warning("Item Kosong", "Minimal tambahkan 1 item cucian!");
      return;
    }

    for (const it of items) {
      if (it.weightOrQty <= 0) {
        toast.warning("Kuantitas Tidak Valid", `Jumlah untuk ${it.serviceType} harus lebih dari 0!`);
        return;
      }
    }

    const payloadItems: OrderItem[] = items.map((it) => ({
      id: it.id,
      serviceType: it.serviceType,
      weightOrQty: it.weightOrQty,
      unit: it.unit,
      pricePerUnit: it.pricePerUnit,
      subtotal: it.subtotal,
      notes: it.notes?.trim() || undefined,
    }));

    const primaryService = items.map((it) => it.serviceType).join(", ");
    const primaryUnit = items[0]?.unit || "kg";
    const primaryPrice = items[0]?.pricePerUnit || 0;

    try {
      setSubmitting(true);
      if (mode === "create") {
        await onSubmitCreate({
          customerId: customerMode === "existing" ? customerId : undefined,
          newCustomer:
            customerMode === "new"
              ? {
                  name: newCustomerName.trim(),
                  phone: newCustomerPhone.trim(),
                  address: newCustomerAddress.trim() || undefined,
                }
              : undefined,
          serviceType: primaryService,
          weightOrQty: totalQty,
          unit: primaryUnit,
          pricePerUnit: primaryPrice,
          totalAmount,
          items: payloadItems,
          paymentStatus,
          paymentMethod,
          notes: notes.trim() || undefined,
          rackNumber: rackNumber.trim() || undefined,
        });
      } else if (mode === "edit" && order) {
        await onSubmitEdit(order.id, {
          customerId: customerId || undefined,
          serviceType: primaryService,
          weightOrQty: totalQty,
          unit: primaryUnit,
          pricePerUnit: primaryPrice,
          totalAmount,
          items: payloadItems,
          status: orderStatus,
          paymentStatus,
          paymentMethod,
          notes: notes.trim() || undefined,
          rackNumber: rackNumber.trim() || undefined,
        });
      }
      onBack();
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between gap-4 pb-4 border-b border-zinc-200">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition cursor-pointer"
            title="Kembali"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 tracking-tight">
              {mode === "create" ? "Buat Pesanan" : "Edit Pesanan"}
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">
              {mode === "create"
                ? "Formulir transaksi kasir dan rincian item cucian"
                : `Pembaruan pesanan ${order?.invoiceNo || ""}`}
            </p>
          </div>
        </div>

        {mode === "edit" && order?.invoiceNo && (
          <div className="font-mono font-bold text-xs bg-zinc-100 border border-zinc-200 px-3 py-1.5 rounded-lg text-zinc-800">
            {order.invoiceNo}
          </div>
        )}
      </div>

      {mode === "edit" && order?.status === "completed" && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium">
          <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>Pesanan ini sudah selesai dan tidak dapat diubah lagi. Status pembayaran telah lunas.</span>
        </div>
      )}

      {/* Main Form Layout */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Data Pelanggan & Item Cucian (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Card 1: Data Pelanggan */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-zinc-700" />
                  <h2 className="text-sm font-bold text-zinc-900">Data Pelanggan</h2>
                </div>

                {/* Switcher: Terdaftar vs Baru */}
                <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setCustomerMode("existing")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      customerMode === "existing"
                        ? "bg-white text-zinc-900 shadow-xs font-bold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    Pelanggan Terdaftar
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomerMode("new")}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      customerMode === "new"
                        ? "bg-zinc-900 text-white shadow-xs font-bold"
                        : "text-zinc-500 hover:text-zinc-800"
                    }`}
                  >
                    + Pelanggan Baru
                  </button>
                </div>
              </div>

              {customerMode === "existing" ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Pilih Pelanggan <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2.5 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                  >
                    <option value="">-- Pilih dari daftar pelanggan --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.phone}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Nama Pelanggan <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required={customerMode === "new"}
                      placeholder="Contoh: Ibu Rina"
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Nomor Telepon <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required={customerMode === "new"}
                      placeholder="Contoh: 081234567890"
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-zinc-700 mb-1">
                      Alamat Pelanggan
                    </label>
                    <input
                      type="text"
                      placeholder="Alamat penjemputan / pengantaran"
                      value={newCustomerAddress}
                      onChange={(e) => setNewCustomerAddress(e.target.value)}
                      className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Card 2: Item Cucian (Multi-Item Management) */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-4 h-4 text-zinc-700" />
                  <h2 className="text-sm font-bold text-zinc-900">Item Cucian</h2>
                </div>
                <span className="text-xs text-zinc-500 font-medium">
                  {items.length} jenis cucian
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div
                    key={item.id || index}
                    className="p-4 rounded-xl border border-zinc-200/90 bg-zinc-50/50 hover:bg-zinc-50 transition space-y-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-zinc-800">
                        Item {index + 1}
                      </span>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="text-xs font-medium text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition inline-flex items-center gap-1 cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hapus Item</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      {/* Layanan */}
                      <div className="md:col-span-5">
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          Paket Layanan
                        </label>
                        <select
                          value={item.serviceType}
                          onChange={(e) => handleServiceSelect(index, e.target.value)}
                          className="w-full text-xs font-semibold border border-zinc-200 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none"
                        >
                          {availableServices.map((p) => (
                            <option key={p.label} value={p.label}>
                              {p.label} - Rp {p.price.toLocaleString("id-ID")}/{p.unit}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Stepper Kuantitas / Berat */}
                      <div className="md:col-span-4">
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          Kuantitas ({item.unit})
                        </label>
                        <div className="flex items-center border border-zinc-200 rounded-lg bg-white overflow-hidden">
                          <button
                            type="button"
                            onClick={() => handleStepQty(index, -1)}
                            className="p-2 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer border-r border-zinc-200"
                            title="Kurangi Kuantitas"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            value={item.weightOrQty}
                            onChange={(e) =>
                              handleQtyChange(index, parseFloat(e.target.value) || 0)
                            }
                            className="w-full text-center text-xs font-bold py-1.5 text-zinc-900 outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleStepQty(index, 1)}
                            className="p-2 hover:bg-zinc-100 text-zinc-700 transition cursor-pointer border-l border-zinc-200"
                            title="Tambah Kuantitas"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Harga Satuan */}
                      <div className="md:col-span-3">
                        <label className="block text-[11px] font-semibold text-zinc-600 mb-1">
                          Harga Satuan (Rp)
                        </label>
                        <input
                          type="number"
                          value={item.pricePerUnit}
                          onChange={(e) =>
                            handlePriceChange(index, parseInt(e.target.value) || 0)
                          }
                          className="w-full text-xs font-semibold border border-zinc-200 rounded-lg px-2.5 py-2 bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none"
                        />
                      </div>
                    </div>

                    {/* Subtotal Baris Item */}
                    <div className="flex items-center justify-between pt-2 border-t border-zinc-200/60 text-xs">
                      <input
                        type="text"
                        placeholder="Catatan item (opsional)..."
                        value={item.notes || ""}
                        onChange={(e) => handleItemNoteChange(index, e.target.value)}
                        className="text-[11px] bg-transparent border-b border-transparent hover:border-zinc-300 focus:border-zinc-900 outline-none text-zinc-600 py-0.5 max-w-xs transition"
                      />
                      <div className="flex items-center gap-1 font-semibold text-zinc-800">
                        <span className="text-zinc-400">Subtotal:</span>
                        <span className="font-bold font-mono text-zinc-900">
                          Rp {item.subtotal.toLocaleString("id-ID")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Tombol Tambah Item */}
              <button
                type="button"
                onClick={handleAddItem}
                className="w-full py-2.5 border-2 border-dashed border-zinc-300 hover:border-zinc-900 hover:bg-zinc-50 rounded-xl text-xs font-bold text-zinc-700 hover:text-zinc-900 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Item</span>
              </button>
            </div>

            {/* Card 3: Catatan & Nomor Rak */}
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-zinc-900 pb-2 border-b border-zinc-100">
                Informasi Tambahan
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Catatan Pesanan
                  </label>
                  <input
                    type="text"
                    placeholder="Instruksi khusus cucian..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Nomor Rak
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Rak A-03 / Keranjang 2"
                    value={rackNumber}
                    onChange={(e) => setRackNumber(e.target.value)}
                    className="w-full text-sm border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none transition"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Ringkasan & Pembayaran (4 cols) */}
          <div className="lg:col-span-4 space-y-6 sticky top-6">
            <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-zinc-100">
                <Receipt className="w-4 h-4 text-zinc-700" />
                <h2 className="text-sm font-bold text-zinc-900">Ringkasan Biaya</h2>
              </div>

              {/* Rincian Subtotal per Item */}
              <div className="space-y-2 text-xs">
                {items.map((it, idx) => (
                  <div key={idx} className="flex justify-between items-center text-zinc-600">
                    <span className="truncate max-w-[160px] font-medium">
                      {it.serviceType} ({it.weightOrQty} {it.unit})
                    </span>
                    <span className="font-mono font-semibold text-zinc-900">
                      Rp {it.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total Biaya Block */}
              <div className="pt-3 border-t border-zinc-200">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-xs font-bold text-zinc-700">Total Biaya</span>
                  <span className="text-xl font-black text-zinc-950 font-mono tracking-tight">
                    Rp {totalAmount.toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Total kuantitas: {totalQty} unit/kg
                </p>
              </div>

              {/* Status Bayar */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Status Bayar
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("unpaid")}
                    className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      paymentStatus === "unpaid"
                        ? "bg-amber-50 text-amber-900 border-amber-300 shadow-xs"
                        : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Belum Lunas
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentStatus("paid")}
                    className={`py-2 rounded-lg text-xs font-bold border transition cursor-pointer ${
                      paymentStatus === "paid"
                        ? "bg-emerald-50 text-emerald-900 border-emerald-300 shadow-xs"
                        : "bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50"
                    }`}
                  >
                    Lunas
                  </button>
                </div>
              </div>

              {/* Metode Bayar */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                  Metode Bayar
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full text-xs font-semibold border border-zinc-200 rounded-lg px-3 py-2 bg-zinc-50 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 outline-none"
                >
                  <option value="cash">Tunai</option>
                  <option value="qris">QRIS</option>
                  <option value="transfer">Transfer Bank</option>
                </select>
              </div>

              {/* Status Cucian (Hanya Mode Edit) */}
              {mode === "edit" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                    Status Cucian
                  </label>
                  <select
                    value={orderStatus}
                    disabled={order?.status === "completed"}
                    onChange={(e) => {
                      const newSt = e.target.value as OrderStatus;
                      setOrderStatus(newSt);
                      if (newSt === "completed") {
                        setPaymentStatus("paid");
                      }
                    }}
                    className={`w-full text-xs font-semibold border rounded-lg px-3 py-2 outline-none transition ${
                      order?.status === "completed"
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 cursor-not-allowed"
                        : "bg-zinc-50 border-zinc-200 focus:bg-white focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900"
                    }`}
                  >
                    <option value="process">Diproses</option>
                    <option value="ready">Siap Diambil</option>
                    <option value="completed">Selesai</option>
                    <option value="cancelled">Dibatalkan</option>
                  </select>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-3 border-t border-zinc-100">
                <button
                  type="submit"
                  disabled={submitting || (mode === "edit" && order?.status === "completed")}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-black text-white rounded-lg text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? "Menyimpan..."
                    : mode === "create"
                    ? "Simpan Pesanan"
                    : mode === "edit" && order?.status === "completed"
                    ? "Pesanan Terkunci"
                    : "Simpan Perubahan"}
                </button>
                <button
                  type="button"
                  onClick={onBack}
                  disabled={submitting}
                  className="w-full py-2.5 border border-zinc-200 hover:bg-zinc-50 text-zinc-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
