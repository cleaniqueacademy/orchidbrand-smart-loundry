import React, { useState } from "react";
import {
  Printer,
  Bluetooth,
  Usb,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Power,
  FileText,
  Sliders,
  Sparkles,
  HelpCircle,
  Laptop,
} from "lucide-react";
import { useThermalPrinter } from "../../hooks/useThermalPrinter";
import { useToast } from "../common/ToastContext";

interface ThermalPrinterSettingsSectionProps {
  outletName?: string;
  phone?: string;
  address?: string;
}

export const ThermalPrinterSettingsSection: React.FC<ThermalPrinterSettingsSectionProps> = ({
  outletName = "Cleanique Laundry",
  phone = "081234567890",
  address = "Jl. Melati Raya No. 45",
}) => {
  const toast = useToast();
  const {
    config,
    isConnecting,
    connectPrinter,
    disconnectPrinter,
    updateConfig,
    testPrint,
  } = useThermalPrinter();

  const [selectedType, setSelectedType] = useState<"bluetooth" | "usb" | "system">(
    config.connectionType || "bluetooth"
  );
  const [selectedDevice, setSelectedDevice] = useState(config.deviceName);
  const [selectedPaper, setSelectedPaper] = useState<"58mm" | "80mm">(
    config.paperWidth || "58mm"
  );

  const handleConnect = async () => {
    try {
      const res = await connectPrinter(selectedType, selectedDevice, selectedPaper);
      if (res.success) {
        toast.success(
          "Printer Thermal Terhubung!",
          `${res.deviceName} siap digunakan untuk mencetak nota kasir.`
        );
      } else {
        toast.error("Koneksi Gagal", res.error || "Pastikan Bluetooth/USB printer aktif.");
      }
    } catch (err: any) {
      toast.error("Gagal Menghubungkan", err.message);
    }
  };

  const handleDisconnect = () => {
    disconnectPrinter();
    toast.info("Printer Terputus", "Koneksi printer thermal telah diputus.");
  };

  const handleTestPrint = () => {
    if (!config.isConnected) {
      toast.warning(
        "Printer Belum Terhubung",
        "Silakan hubungkan printer thermal terlebih dahulu sebelum melakukan tes cetak."
      );
      return;
    }
    testPrint(outletName, phone, address);
    toast.success("Mencetak Struk Uji Coba", "Perintah cetak dikirim ke printer thermal.");
  };

  const formattedLastConnected = config.lastConnectedAt
    ? new Date(config.lastConnectedAt).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="space-y-5">
      {/* Header Status Banner Card */}
      <div
        className={`rounded-xl border p-5 transition-all shadow-2xs ${
          config.isConnected
            ? "border-emerald-200/90 bg-gradient-to-r from-emerald-50/70 via-teal-50/30 to-white"
            : "border-amber-200/90 bg-gradient-to-r from-amber-50/70 via-orange-50/30 to-white"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                config.isConnected
                  ? "bg-emerald-500 text-white border-emerald-600"
                  : "bg-amber-500 text-white border-amber-600"
              }`}
            >
              <Printer className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-zinc-900 text-sm sm:text-base">
                  {config.isConnected ? config.deviceName : "Printer Thermal Belum Terhubung"}
                </h3>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                    config.isConnected
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                      : "bg-amber-100 text-amber-800 border-amber-300"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      config.isConnected ? "bg-emerald-600 animate-pulse" : "bg-amber-600"
                    }`}
                  />
                  {config.isConnected ? "TERHUBUNG (CONNECTED)" : "BELUM TERHUBUNG"}
                </span>
              </div>

              <p className="text-[11px] sm:text-xs text-zinc-500 mt-0.5">
                {config.isConnected
                  ? `Format kertas ${config.paperWidth} via koneksi ${config.connectionType.toUpperCase()} • Terakhir disambungkan: ${formattedLastConnected || "Sesi aktif"}`
                  : "Kasir memerlukan sambungan printer thermal aktif untuk mencetak nota struk fisik otomatis."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            {config.isConnected ? (
              <>
                <button
                  type="button"
                  onClick={handleTestPrint}
                  className="px-3 py-2 rounded-lg bg-white hover:bg-zinc-50 text-zinc-700 text-xs font-semibold border border-zinc-200/90 shadow-2xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  Tes Cetak Struk
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-3 py-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Power className="w-3.5 h-3.5" />
                  Putuskan
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Hubungkan Sekarang
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid: 2 Clean Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Kolom Kiri: Konfigurasi Perangkat (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-100 shadow-2xs">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900 text-sm">Konfigurasi Perangkat Kasir</h2>
                <p className="text-[11px] text-zinc-500">Tipe sambungan hardware dan model printer nota</p>
              </div>
            </div>
            <span className="text-[11px] font-mono text-zinc-400 font-medium">
              Mode: {config.connectionType.toUpperCase()}
            </span>
          </div>

          {/* Connection Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Tipe Sambungan Printer
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "bluetooth", label: "Bluetooth", icon: Bluetooth, desc: "Printer Saku / Mini" },
                { id: "usb", label: "USB Kabel", icon: Usb, desc: "Desktop POS Meja" },
                { id: "system", label: "Driver Sistem", icon: Laptop, desc: "Spooler Bawaan OS" },
              ].map((opt) => {
                const Icon = opt.icon;
                const isSelected = selectedType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setSelectedType(opt.id as any);
                      if (opt.id === "bluetooth") setSelectedDevice("RPP02N Bluetooth POS");
                      if (opt.id === "usb") setSelectedDevice("Epson TM-T82 POS");
                      if (opt.id === "system") setSelectedDevice("Driver Printer Sistem");
                    }}
                    className={`p-3 rounded-lg border text-left transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-1 ring-blue-600 shadow-2xs"
                        : "border-zinc-200 bg-zinc-50/50 hover:bg-white text-zinc-700"
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mb-2 ${
                        isSelected ? "text-blue-700" : "text-zinc-500"
                      }`}
                    />
                    <div>
                      <div className={`text-xs font-bold ${isSelected ? "text-blue-900" : "text-zinc-900"}`}>
                        {opt.label}
                      </div>
                      <div className="text-[10px] text-zinc-500 mt-0.5 leading-tight">
                        {opt.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Model / Device Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Nama / Model Perangkat Printer
            </label>
            <input
              type="text"
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              placeholder="Contoh: RPP02N, Zjiang 5802, Epson TM-T82, Xprinter XP-58"
              className="w-full px-3 py-2 text-xs font-medium border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition bg-zinc-50/50 hover:bg-white focus:bg-white text-zinc-900"
            />
            <p className="text-[11px] text-zinc-500">
              Mendukung printer thermal saku bluetooth 58mm & printer kasir desktop 80mm.
            </p>
          </div>

          {/* Paper Width */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-zinc-700">
              Ukuran Kertas Nota Kasir
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedPaper("58mm")}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  selectedPaper === "58mm"
                    ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-white text-zinc-700"
                }`}
              >
                <div className={`text-xs font-bold ${selectedPaper === "58mm" ? "text-emerald-900" : "text-zinc-900"}`}>
                  58 mm (Standar Saku)
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  Ukuran paling umum, hemat kertas, cocok untuk printer kasir portabel.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedPaper("80mm")}
                className={`p-3 rounded-lg border text-left transition cursor-pointer ${
                  selectedPaper === "80mm"
                    ? "border-emerald-600 bg-emerald-50/60 ring-1 ring-emerald-600 shadow-2xs"
                    : "border-zinc-200 bg-zinc-50/50 hover:bg-white text-zinc-700"
                }`}
              >
                <div className={`text-xs font-bold ${selectedPaper === "80mm" ? "text-emerald-900" : "text-zinc-900"}`}>
                  80 mm (Desktop POS)
                </div>
                <div className="text-[10px] text-zinc-500 mt-1 leading-snug">
                  Format lebar penuh, tampilan rincian item lega, mendukung auto-cut kertas.
                </div>
              </button>
            </div>
          </div>

          {/* Action Button */}
          {!config.isConnected && (
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="w-full py-2.5 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {isConnecting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                Simpan & Sambungkan Printer
              </button>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Kebijakan Kasir & Panduan (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-zinc-200/90 shadow-2xs p-5 space-y-4">
            <div className="flex items-center gap-2.5 border-b border-zinc-100 pb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100 shadow-2xs">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-zinc-900 text-sm">Kebijakan Cetak Kasir</h2>
                <p className="text-[11px] text-zinc-500">Aturan validasi cetak nota di meja kasir</p>
              </div>
            </div>

            <div className="space-y-3">
              {/* Toggle 1: Wajib Connected */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-50/70 border border-zinc-200/80">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">
                    Wajibkan Thermal Terhubung
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Kasir diingatkan jika belum ada printer thermal yang aktif sebelum mencetak nota.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      requireConnectedBeforePrint: !config.requireConnectedBeforePrint,
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.requireConnectedBeforePrint ? "bg-blue-600" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.requireConnectedBeforePrint ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 2: Cetak QR Code */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-50/70 border border-zinc-200/80">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">
                    Cetak QR Code Resi Publik
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Mencetak barcode QR di bawah nota agar pelanggan dapat scan cek status laundry.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      printQrResi: !config.printQrResi,
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.printQrResi ? "bg-blue-600" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.printQrResi ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Toggle 3: Auto Cut Kertas */}
              <div className="flex items-start justify-between gap-3 p-3 rounded-lg bg-zinc-50/70 border border-zinc-200/80">
                <div>
                  <p className="text-xs font-semibold text-zinc-900">
                    Auto-Cut Kertas (80mm)
                  </p>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Mengirim sinyal pisau pemotong otomatis setelah nota selesai diprint.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateConfig({
                      autoCut: !config.autoCut,
                    })
                  }
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    config.autoCut ? "bg-blue-600" : "bg-zinc-300"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      config.autoCut ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Setup Guide Card */}
          <div className="bg-blue-50/60 rounded-xl border border-blue-200/80 p-4 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold text-xs">
              <HelpCircle className="w-4 h-4 text-blue-700" />
              <span>Langkah Cepat Sambungan:</span>
            </div>
            <ol className="text-[11px] text-blue-900/80 space-y-1.5 list-decimal list-inside leading-relaxed">
              <li>Nyalakan printer thermal (lampu power / bluetooth menyala).</li>
              <li>Pastikan Bluetooth di perangkat aktif, atau kabel USB terhubung ke PC.</li>
              <li>Klik tombol <strong>Hubungkan Sekarang</strong> di atas untuk sinkronisasi instan.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};
