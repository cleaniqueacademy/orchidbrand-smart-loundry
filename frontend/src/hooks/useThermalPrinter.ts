import { useCallback, useEffect, useState } from "react";
export interface ThermalPrinterConfig {
  isConnected: boolean; deviceName: string; connectionType: "bluetooth" | "usb" | "system";
  paperWidth: "58mm" | "80mm"; autoCut: boolean; printDensity: "normal" | "dark";
  printQrResi: boolean; requireConnectedBeforePrint: boolean; lastConnectedAt?: string;
}
export const DEFAULT_PRINTER_CONFIG: ThermalPrinterConfig = {
  isConnected: false, deviceName: "Dialog cetak browser", connectionType: "system", paperWidth: "58mm",
  autoCut: false, printDensity: "normal", printQrResi: true, requireConnectedBeforePrint: false,
};
const KEY = "cleanique_thermal_printer_config";
function read(): ThermalPrinterConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { ...DEFAULT_PRINTER_CONFIG, paperWidth: saved.paperWidth === "80mm" ? "80mm" : "58mm" };
  } catch { return DEFAULT_PRINTER_CONFIG; }
}
export function useThermalPrinter() {
  const [config, setConfig] = useState(read);
  useEffect(() => {
    const sync = () => setConfig(read());
    window.addEventListener("storage", sync); window.addEventListener(KEY, sync);
    return () => { window.removeEventListener("storage", sync); window.removeEventListener(KEY, sync); };
  }, []);
  const updateConfig = useCallback((patch: Partial<ThermalPrinterConfig>) => {
    const next = { ...read(), paperWidth: patch.paperWidth === "80mm" ? "80mm" as const : "58mm" as const };
    try { localStorage.setItem(KEY, JSON.stringify(next)); window.dispatchEvent(new Event(KEY)); }
    catch { console.warn("[printer] preferences could not be persisted"); }
    setConfig(next);
  }, []);
  const testPrint = useCallback((outletName = "Laundry Cleanique", phone = "-", address = "-") => {
    const popup = window.open("", "_blank", "width=400,height=600");
    if (!popup) throw new Error("Izinkan jendela cetak pada browser");
    popup.document.title = "Uji cetak struk";
    const style = popup.document.createElement("style");
    style.textContent = `@page{size:${config.paperWidth} auto;margin:0}body{width:${config.paperWidth};margin:0;padding:3mm;box-sizing:border-box}pre{white-space:pre-wrap;font:12px monospace}`;
    const content = popup.document.createElement("pre");
    content.textContent = `${outletName}\n${phone}\n${address}\n------------------------\nUJI CETAK ${config.paperWidth}\nPilih printer di dialog browser.`;
    popup.document.head.append(style); popup.document.body.append(content);
    popup.addEventListener("afterprint", () => popup.close(), { once: true });
    popup.focus(); popup.print();
  }, [config.paperWidth]);
  return { config, updateConfig, testPrint, isConnecting: false,
    connectPrinter: async (..._args: unknown[]) => ({ success: false, deviceName: "", error: "Pilih printer melalui dialog cetak browser" }),
    disconnectPrinter: () => {},
  };
}
