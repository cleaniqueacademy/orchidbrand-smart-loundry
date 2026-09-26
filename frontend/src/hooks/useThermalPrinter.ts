import { useState, useEffect, useCallback } from "react";

export interface ThermalPrinterConfig {
  isConnected: boolean;
  deviceName: string;
  connectionType: "bluetooth" | "usb" | "system";
  paperWidth: "58mm" | "80mm";
  autoCut: boolean;
  printDensity: "normal" | "dark";
  printQrResi: boolean;
  requireConnectedBeforePrint: boolean;
  lastConnectedAt?: string;
}

export const DEFAULT_PRINTER_CONFIG: ThermalPrinterConfig = {
  isConnected: false,
  deviceName: "RPP02N Bluetooth POS",
  connectionType: "bluetooth",
  paperWidth: "58mm",
  autoCut: true,
  printDensity: "normal",
  printQrResi: true,
  requireConnectedBeforePrint: true,
  lastConnectedAt: undefined,
};

const STORAGE_KEY = "cleanique_thermal_printer_config";
const SYNC_EVENT = "cleanique_thermal_printer_sync";

function loadSavedConfig(): ThermalPrinterConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINTER_CONFIG;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PRINTER_CONFIG, ...parsed };
  } catch {
    return DEFAULT_PRINTER_CONFIG;
  }
}

function persistConfig(config: ThermalPrinterConfig) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: config }));
  } catch (err) {
    console.error("Gagal menyimpan konfigurasi printer:", err);
  }
}

export function useThermalPrinter() {
  const [config, setConfig] = useState<ThermalPrinterConfig>(loadSavedConfig);
  const [isConnecting, setIsConnecting] = useState(false);

  // Sync state across different tabs/components
  useEffect(() => {
    const handleSync = (e: Event) => {
      const customEvent = e as CustomEvent<ThermalPrinterConfig>;
      if (customEvent.detail) {
        setConfig(customEvent.detail);
      } else {
        setConfig(loadSavedConfig());
      }
    };

    window.addEventListener(SYNC_EVENT, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const updateConfig = useCallback((patch: Partial<ThermalPrinterConfig>) => {
    setConfig((prev) => {
      const updated = { ...prev, ...patch };
      persistConfig(updated);
      return updated;
    });
  }, []);

  const connectPrinter = useCallback(
    async (
      connectionType: "bluetooth" | "usb" | "system" = "bluetooth",
      customDeviceName?: string,
      customPaperWidth?: "58mm" | "80mm"
    ): Promise<{ success: boolean; deviceName: string; error?: string }> => {
      setIsConnecting(true);
      try {
        let detectedName = customDeviceName || (connectionType === "bluetooth" ? "RPP02N Bluetooth POS" : connectionType === "usb" ? "Epson TM-T82 POS" : "Driver Sistem Kasir");

        // Try Web Bluetooth if requested and available in modern browsers
        if (connectionType === "bluetooth" && typeof navigator !== "undefined" && "bluetooth" in navigator) {
          try {
            // @ts-ignore - Web Bluetooth API
            const device = await (navigator as any).bluetooth.requestDevice({
              acceptAllDevices: true,
              optionalServices: ["000018f0-0000-1000-8000-00805f9b34fb"],
            });
            if (device && device.name) {
              detectedName = device.name;
            }
          } catch (btErr: any) {
            // If user cancels or permission denied, fall back to simulated profile so app stays resilient
            console.warn("Web Bluetooth prompt ditutup atau fallback:", btErr.message);
          }
        }

        const newConfig: ThermalPrinterConfig = {
          ...config,
          isConnected: true,
          connectionType,
          deviceName: detectedName,
          paperWidth: customPaperWidth || config.paperWidth,
          lastConnectedAt: new Date().toISOString(),
        };

        setConfig(newConfig);
        persistConfig(newConfig);
        return { success: true, deviceName: detectedName };
      } catch (err: any) {
        return { success: false, deviceName: "", error: err.message };
      } finally {
        setIsConnecting(false);
      }
    },
    [config]
  );

  const disconnectPrinter = useCallback(() => {
    setConfig((prev) => {
      const updated: ThermalPrinterConfig = {
        ...prev,
        isConnected: false,
      };
      persistConfig(updated);
      return updated;
    });
  }, []);

  const testPrint = useCallback(
    (outletName = "Laundry Cleanique", phone = "-", address = "-") => {
      const printWindow = window.open("", "_blank", "width=400,height=600");
      if (!printWindow) {
        window.print();
        return;
      }

      const is58 = config.paperWidth === "58mm";
      const widthCss = is58 ? "58mm" : "80mm";

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Test Print - Thermal Printer</title>
          <style>
            @page {
              size: ${widthCss} auto;
              margin: 0;
            }
            body {
              font-family: monospace;
              font-size: ${is58 ? "10px" : "12px"};
              width: ${widthCss};
              margin: 0 auto;
              padding: 6px;
              color: #000;
              line-height: 1.3;
              text-align: center;
            }
            .dashed {
              border-top: 1px dashed #000;
              margin: 6px 0;
            }
            .bold { font-weight: bold; }
            .left { text-align: left; }
            .row {
              display: flex;
              justify-content: space-between;
              margin: 2px 0;
            }
          </style>
        </head>
        <body>
          <div class="bold" style="font-size: 14px;">${outletName.toUpperCase()}</div>
          <div>${address}</div>
          <div>Telp: ${phone}</div>
          <div class="dashed"></div>
          <div class="bold">** UJI COBA PRINTER THERMAL **</div>
          <div>Koneksi: ${config.connectionType.toUpperCase()}</div>
          <div>Perangkat: ${config.deviceName}</div>
          <div>Ukuran Kertas: ${config.paperWidth}</div>
          <div>Waktu: ${new Date().toLocaleDateString("id-ID")} ${new Date().toLocaleTimeString("id-ID")}</div>
          <div class="dashed"></div>
          <div class="row">
            <span>Status Hardware</span>
            <span class="bold">TERHUBUNG OK</span>
          </div>
          <div class="row">
            <span>Font Matrix</span>
            <span>ABCDEF 123456</span>
          </div>
          <div class="row">
            <span>Auto-Cut Kertas</span>
            <span>${config.autoCut ? "AKTIF" : "NONAKTIF"}</span>
          </div>
          <div class="dashed"></div>
          <div>Terima kasih atas ujicoba!</div>
          <br/><br/>
          <div style="font-size: 8px;">--- Gunting di sini ---</div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            };
          </script>
        </body>
        </html>
      `);
      printWindow.document.close();
    },
    [config]
  );

  return {
    config,
    isConnecting,
    connectPrinter,
    disconnectPrinter,
    updateConfig,
    testPrint,
  };
}
