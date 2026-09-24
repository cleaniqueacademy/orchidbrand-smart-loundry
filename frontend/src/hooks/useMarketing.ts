import { useState, useEffect, useCallback } from "react";
import { MarketingProfile, MarketingCommission, ReferralCode } from "../types";
import { fetchApi } from "../utils/api";

export interface MarketingTenantUser {
  id: string;
  outletName: string;
  phone: string;
  city: string;
  status: string;
  isTrial: boolean;
  subscriptionUntil: string;
  referralCode?: string | null;
  createdAt: string;
}

export interface MarketingReferralCode extends ReferralCode {
  tenantCount?: number;
  tenants?: MarketingTenantUser[];
}

export interface MarketingDashboardData {
  profile?: MarketingProfile;
  codes?: MarketingReferralCode[];
  totalTenantsCount?: number;
  tenants?: MarketingTenantUser[];
  commissionsSummary?: {
    totalEarned: number;
    totalWithdrawn: number;
    pendingCommission: number;
    approvedCommission: number;
    paidCommission: number;
    totalCommissionsCount: number;
  };
  recentCommissions?: MarketingCommission[];
  isSuperadmin?: boolean;
}

export function useMarketing() {
  const [profiles, setProfiles] = useState<MarketingProfile[]>([]);
  const [commissions, setCommissions] = useState<MarketingCommission[]>([]);
  const [meData, setMeData] = useState<MarketingDashboardData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<MarketingDashboardData>("/api/marketing/me");
      if (res.success && res.data) {
        setMeData(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchApi<MarketingProfile[]>("/api/marketing/profiles");
      if (res.success && res.data) {
        setProfiles(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCommissions = useCallback(async (status?: string) => {
    setLoading(true);
    try {
      const url = status ? `/api/marketing/commissions?status=${status}` : "/api/marketing/commissions";
      const res = await fetchApi<MarketingCommission[]>(url);
      if (res.success && res.data) {
        setCommissions(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProfile = async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    commissionRateDefault?: number;
    notes?: string;
  }): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchApi("/api/marketing/profiles", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (res.success) {
      await fetchProfiles();
    }
    return res;
  };

  const updateProfile = async (
    id: string,
    payload: Partial<MarketingProfile & { name?: string }>
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchApi(`/api/marketing/profiles/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    if (res.success) {
      await fetchProfiles();
    }
    return res;
  };

  const updateCommissionStatus = async (
    id: string,
    status: "approved" | "paid" | "rejected" | "pending",
    notes?: string
  ): Promise<{ success: boolean; message?: string }> => {
    const res = await fetchApi(`/api/marketing/commissions/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
    if (res.success) {
      await fetchCommissions();
      await fetchProfiles();
    }
    return res;
  };

  return {
    profiles,
    commissions,
    meData,
    loading,
    error,
    fetchMe,
    fetchProfiles,
    fetchCommissions,
    createProfile,
    updateProfile,
    updateCommissionStatus,
  };
}
