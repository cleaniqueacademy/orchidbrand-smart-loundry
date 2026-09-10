export interface CashflowStats {
  totalIncome: number;
  pendingPaymentAmount: number;
  totalExpense: number;
  netProfit: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  readyOrdersCount: number;
  completedOrdersCount: number;
}

export type OrderStatus = "pending" | "washing" | "drying_ironing" | "ready" | "completed";
export type PaymentStatus = "paid" | "unpaid";

export interface Order {
  id: string;
  tenantId: string;
  customerId?: string;
  invoiceNo: string;
  serviceType: string;
  weightOrQty: number;
  unit: string;
  pricePerUnit: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  completedAt?: string | null;
  customer?: { id: string; name: string; phone: string } | null;
}

export interface Customer {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  address?: string;
  notes?: string;
  createdAt?: string;
}

export interface Expense {
  id: string;
  tenantId?: string;
  category: string;
  amount: number;
  notes: string;
  expenseDate: string;
  createdAt?: string;
}

export interface Tenant {
  id: string;
  outletName: string;
  phone: string;
  address: string;
  owner?: { id: string; name: string; email: string; role: string } | null;
  totalOrders: number;
  totalOmset: number;
}

export type TabType = "overview" | "orders" | "cashflow" | "customers" | "tenants";
