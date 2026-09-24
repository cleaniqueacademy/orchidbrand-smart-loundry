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
