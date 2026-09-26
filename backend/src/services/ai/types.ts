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
