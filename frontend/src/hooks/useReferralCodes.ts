import { useState, useEffect, useCallback } from "react";
import { ReferralCode, ReferralStats } from "../types";
import { fetchApi } from "../utils/api";

export interface TenantActivationItem {
  tenantId: string;
  outletName: string;
  phone: string;
  city?: string | null;
  isEnabled: boolean;
}

export function useReferralCodes() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchApi<ReferralCode[]>("/api/referral-codes");
      if (res.success && res.data) {
        setCodes(res.data);
      } else {
        setError(res.message || "Gagal memuat kode referral");
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const createCode = async (
    payload: Partial<ReferralCode>
  ): Promise<{ success: boolean; message?: string; data?: ReferralCode }> => {
    const res = await fetchApi<ReferralCode>("/api/referral-codes", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.success) {
      await fetchCodes();
    }
    return res;
  };

  const updateCode = async (
    id: string,
    payload: Partial<ReferralCode>
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchApi(`/api/referral-codes/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (res.success) {
      await fetchCodes();
    }
    return res;
  };

  const deleteCode = async (id: string): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchApi(`/api/referral-codes/${id}`, {
      method: "DELETE",
    });
    if (res.success) {
      await fetchCodes();
    }
    return res;
  };

  const fetchStats = async (id: string): Promise<ReferralStats | null> => {
    const res = await fetchApi<ReferralStats>(`/api/referral-codes/${id}/stats`);
    return res.success && res.data ? res.data : null;
  };

  const fetchTenants = async (id: string): Promise<TenantActivationItem[]> => {
    const res = await fetchApi<TenantActivationItem[]>(`/api/referral-codes/${id}/tenants`);
    return res.success && res.data ? res.data : [];
  };

  const toggleTenant = async (
    id: string,
    tenantId: string,
    isEnabled: boolean
  ): Promise<{ success: boolean; message?: string }> => {
    return await fetchApi(`/api/referral-codes/${id}/toggle-tenant`, {
      method: "POST",
      body: JSON.stringify({ tenantId, isEnabled }),
    });
  };

  return {
    codes,
    loading,
    error,
    refresh: fetchCodes,
    createCode,
    updateCode,
    deleteCode,
    fetchStats,
    fetchTenants,
    toggleTenant,
  };
}
