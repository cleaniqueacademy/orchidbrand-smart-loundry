import { useState, useEffect, useCallback } from "react";
import { useToast } from "../components/common/ToastContext";
import { authHeaders, getAuthToken } from "../utils/api";

const API_BASE = "/api";

export interface WAStatusData {
  status: "disconnected" | "connecting" | "qrcode" | "connected";
  qrCodeDataUrl: string | null;
  connectedUser: { id: string; name?: string } | null;
  lastError: string | null;
  hasSavedCredentials?: boolean;
  tenantId?: string;
  outletName?: string;
  waMode: "manual" | "baileys";
}

export function useWhatsAppGateway(tenantId: string) {
  const toast = useToast();

  const [waData, setWaData] = useState<WAStatusData>({
    status: "disconnected",
    qrCodeDataUrl: null,
    connectedUser: null,
    lastError: null,
    waMode: "manual",
  });
  const [loading, setLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Fetch status
  const fetchStatus = useCallback(async () => {
    const token = getAuthToken();
    if (!tenantId || !token) return;
    try {
      const res = await fetch(`${API_BASE}/whatsapp/status?tenantId=${tenantId}`, {
        headers: authHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setWaData((prev) => {
            // If just transitioned to connected from qrcode
            if (prev.status === "qrcode" && json.data.status === "connected") {
              toast.success("WhatsApp Terhubung!", `Nomor ${json.data.connectedUser?.id || ""} siap digunakan via Baileys.`);
            }
            return json.data;
          });
        }
      }
    } catch (err) {
      console.error("Fetch WA status error:", err);
    }
  }, [tenantId, toast]);

  useEffect(() => {
    if (tenantId && getAuthToken()) {
      fetchStatus();
    }
  }, [fetchStatus, tenantId]);

  // Polling when waiting for QR scan or connecting
  useEffect(() => {
    if (waData.status === "qrcode" || waData.status === "connecting") {
      const interval = setInterval(() => {
        fetchStatus();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [waData.status, fetchStatus]);

  // Connect / Request QR
  const connectWA = async (forceRefresh = false) => {
    try {
      setLoading(true);
      toast.info("Menghubungkan Baileys...", "Sedang menyiapkan sesi WhatsApp Baileys...");
      const res = await fetch(`${API_BASE}/whatsapp/connect`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tenantId, forceRefresh }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      } else {
        toast.error("Gagal Menghubungkan WA", json.message || "Terjadi kesalahan pada server");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message || "Gagal menghubungi server");
    } finally {
      setLoading(false);
    }
  };

  // Disconnect
  const disconnectWA = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/whatsapp/disconnect`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tenantId }),
      });
      const json = await res.json();
      if (json.success) {
        toast.info("WhatsApp Diputuskan", "Sesi Baileys perangkat telah dibersihkan.");
        await fetchStatus();
      } else {
        toast.error("Gagal Memutuskan", json.message || "Respons server gagal");
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Switch Delivery Mode (manual vs baileys)
  const updateMode = async (newMode: "manual" | "baileys") => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/whatsapp/mode`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify({ tenantId, waMode: newMode }),
      });
      const json = await res.json();
      if (json.success) {
        setWaData((prev) => ({ ...prev, waMode: newMode }));
        toast.success(
          "Mode WhatsApp Diperbarui",
          newMode === "baileys"
            ? "Mode Otomatis (Baileys Gateway) aktif. Server siap kirim pesan langsung."
            : "Mode Manual (Tautan wa.me) aktif. Pesan dibuka via WhatsApp Web."
        );
      } else {
        toast.error("Gagal Mengubah Mode", json.message);
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Send Direct Message (used by Receipt, Orders, etc.)
  const sendDirectMessage = async (
    phone: string,
    message: string,
    meta?: { orderId?: string; recipientName?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/whatsapp/send`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ tenantId, phone, message, ...meta }),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true };
      } else {
        return { success: false, error: json.message || "Gagal mengirim pesan" };
      }
    } catch (err: any) {
      return { success: false, error: err.message || "Kesalahan jaringan" };
    }
  };

  // Send Test Message (with UI feedback)
  const sendTestMessage = async (phone: string, message: string) => {
    try {
      setIsSendingTest(true);
      const res = await sendDirectMessage(phone, message);
      if (res.success) {
        toast.success("Pesan Uji Coba Terkirim!", `Berhasil dikirim ke nomor ${phone} via Baileys.`);
        return true;
      } else {
        toast.error("Gagal Mengirim Pesan", res.error || "Cek koneksi WhatsApp Anda");
        return false;
      }
    } catch (err: any) {
      toast.error("Kesalahan Jaringan", err.message);
      return false;
    } finally {
      setIsSendingTest(false);
    }
  };

  return {
    waData,
    loading,
    isSendingTest,
    fetchStatus,
    connectWA,
    disconnectWA,
    updateMode,
    sendTestMessage,
    sendDirectMessage,
  };
}

