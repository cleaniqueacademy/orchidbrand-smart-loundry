import React, { useState } from "react";
import { useThermalPrinter } from "../../hooks/useThermalPrinter";
export const ThermalPrinterSettingsSection: React.FC<{ outletName?: string; phone?: string; address?: string }> = ({ outletName, phone, address }) => {
  const { config, updateConfig, testPrint } = useThermalPrinter();
  const [error, setError] = useState("");
  return <section className="space-y-4 bg-white rounded-xl border border-zinc-200 p-5">
    <h2 className="font-bold text-lg">Printer dan struk</h2>
    <p className="text-sm text-zinc-600">Siapkan printer melalui pengaturan sistem operasi. Saat mencetak nota, pilih printer dan ukuran kertas pada dialog cetak browser.</p>
    <label className="block text-sm">Lebar struk
      <select className="block border rounded-lg p-2 mt-1" value={config.paperWidth} onChange={e => updateConfig({ paperWidth: e.target.value as "58mm" | "80mm" })}>
        <option value="58mm">58 mm</option><option value="80mm">80 mm</option>
      </select>
    </label>
    {error && <p role="alert" className="text-red-700 text-sm">{error}</p>}
    <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm" onClick={() => { setError(""); try { testPrint(outletName, phone, address); } catch (err) { setError(err instanceof Error ? err.message : "Dialog cetak tidak dapat dibuka"); } }}>Buka dialog uji cetak</button>
  </section>;
};
