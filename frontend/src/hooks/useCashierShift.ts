import { useState, useCallback, useEffect } from "react";
import { CashierShift } from "../types";
import { authHeaders } from "../utils/api";

export function useCashierShift(tenantId: string | null, userId: string | null) {
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<CashierShift[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchActiveShift = useCallback(async (tId?: string, uId?: string) => {
    const targetTenant = tId || tenantId;
    const targetUser = uId || userId;
    if (!targetTenant) return null;

    setLoading(true);
    try {
      const url = targetUser
        ? `/api/shifts/active?tenantId=${encodeURIComponent(targetTenant)}&userId=${encodeURIComponent(targetUser)}`
        : `/api/shifts/active?tenantId=${encodeURIComponent(targetTenant)}`;
      const res = await fetch(url, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentShift(json.data || null);
        return json.data as CashierShift | null;
      }
      return null;
    } catch (err) {
      console.error("[useCashierShift] fetchActiveShift error:", err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  const openShift = useCallback(async (startingCash: number, notes?: string) => {
    if (!tenantId || !userId) {
      alert("Tenant atau Pengguna belum teridentifikasi");
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shifts/open", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          tenantId,
          userId,
          startingCash,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentShift(json.data);
        return true;
      } else {
        alert(json.message || "Gagal membuka shift kasir");
        return false;
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan saat membuka shift: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, userId]);

  const closeShift = useCallback(async (actualCashTotal: number, notes?: string) => {
    if (!currentShift) {
      alert("Tidak ada shift aktif yang dapat ditutup");
      return false;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/shifts/close", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          shiftId: currentShift.id,
          actualCashTotal,
          notes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setCurrentShift(null);
        return json.data;
      } else {
        alert(json.message || "Gagal menutup shift kasir");
        return false;
      }
    } catch (err: any) {
      alert("Terjadi kesalahan jaringan saat menutup shift: " + err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [currentShift]);

  const fetchShiftHistory = useCallback(async (tId?: string) => {
    const targetTenant = tId || tenantId;
    setHistoryLoading(true);
    try {
      const url = targetTenant && targetTenant !== "all"
        ? `/api/shifts/history?tenantId=${encodeURIComponent(targetTenant)}`
        : `/api/shifts/history`;
      const res = await fetch(url, {
        headers: authHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setHistory(json.data || []);
        return json.data as CashierShift[];
      }
      return [];
    } catch (err) {
      console.error("[useCashierShift] fetchShiftHistory error:", err);
      return [];
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) {
      fetchActiveShift();
    }
  }, [tenantId, userId, fetchActiveShift]);

  return {
    currentShift,
    loading,
    history,
    historyLoading,
    fetchActiveShift,
    openShift,
    closeShift,
    fetchShiftHistory,
  };
}
