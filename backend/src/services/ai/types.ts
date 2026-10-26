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
