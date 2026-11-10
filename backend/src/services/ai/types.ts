export interface ChatMessage {
  role: "user" | "model" | "assistant";
  content: string;
}

export interface ChatOptions {
  message: string;
  tenantId: string | null;
  user: {
    userId: string;
    role: string;
  };
  history?: ChatMessage[];
}

export interface MarketingMetrics {
  quietDays: string[];
  busiestDays: string[];
  topServices: Array<{ name: string; orderCount: number; revenue: number }>;
  underperformingServices: Array<{ name: string; currentPrice: number; unit: string; orderCount: number }>;
  inactiveCustomersCount: number;
  totalCustomersCount: number;
  averageOrderValue: number;
  safeMaxDiscountPct: number;
}

export interface SuperadminDatabaseStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: {
    superadmin: number;
    tenant_owner: number;
    staff: number;
    marketing: number;
  };
  usersList: Array<{
    name: string;
    email: string;
    role: string;
    status: string;
    outletName?: string;
  }>;
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  expiredTenants: number;
  tenantsList: Array<{
    id: string;
    outletName: string;
    city: string | null;
    tier: string;
    status: string;
    isTrial: boolean;
    subscriptionUntil: string | null;
    ownerName?: string;
    phone: string;
  }>;
  totalOrdersAllPlatform: number;
  totalVolumeAllPlatform: number;
  activeOrdersAllPlatform: number;
  invoices: {
    total: number;
    pendingVerification: number;
    paid: number;
    rejected: number;
    totalPaidRevenue: number;
    pendingList: Array<{
      invoiceNo: string;
      outletName?: string;
      finalAmount: number;
      durationMonths: number;
      createdAt: string;
    }>;
  };
  signups: {
    total: number;
    pending: number;
    activated: number;
    recentList: Array<{
      outletName: string;
      ownerName: string;
      phone: string;
      status: string;
      createdAt: string;
    }>;
  };
  marketing: {
    totalProfiles: number;
    totalReferralCodes: number;
    activeReferralCodes: number;
  };
}

export interface OperationalContext {
  outletName: string;
  todayStr: string;
  ordersTodayCount: number;
  revenueToday: number;
  processCount: number;
  readyCount: number;
  completedCount: number;
  unpaidCount: number;
  // Detail Analisa Finansial & Bahan (Khusus Owner / Superadmin)
  businessHealth?: {
    healthScore: number;
    ratingText: string;
    totalWashKg: number;
    monthlyRevenue: number;
    monthlyExpense: number;
    monthlyNetProfit: number;
    netMarginPct: number;
    chemicalRatioPct: number;
    materials: Array<{
      name: string;
      estimatedQty: number;
      unitLabel: string;
      estimatedCost: number;
      actualCost: number;
      statusText: string;
    }>;
    rent: {
      hasRent: boolean;
      remainingMonths: number;
      endDate: string | null;
      monthlyAmortization: number;
    };
    recommendations: string[];
  };
  // Metrik Analitik Pemasaran & Promo (Khusus Owner / Superadmin)
  marketingMetrics?: MarketingMetrics;
  // Data Lengkap Database & Platform HQ (Khusus Super Admin Terotentikasi)
  superadminStats?: SuperadminDatabaseStats;
}

export interface AIResponse {
  reply: string;
  model: string;
  contextSummary?: {
    outletName: string;
    ordersToday: number;
    revenueToday: number;
    pendingOrders: number;
    readyOrders: number;
  };
}
