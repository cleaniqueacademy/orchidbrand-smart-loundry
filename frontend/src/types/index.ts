export interface CashflowStats {
  totalIncome: number;
  pendingPaymentAmount: number;
  totalExpense: number;
  netProfit: number;
  totalOrdersCount: number;
  activeOrdersCount: number;
  readyOrdersCount: number;
  completedOrdersCount: number;
  cancelledOrdersCount?: number;
}

export type OrderStatus =
  | "process"
  | "ready"
  | "completed"
  | "cancelled"
  | "pending"
  | "washing"
  | "drying_ironing";
export type PaymentStatus = "paid" | "unpaid";

export interface OrderItem {
  id: string;
  serviceType: string;
  weightOrQty: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
  notes?: string;
}

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
  items?: OrderItem[];
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: string;
  notes?: string;
  createdAt: string;
  estimatedCompletionAt?: string | null;
  completedAt?: string | null;
  customer?: { id: string; name: string; phone: string } | null;
  waSent?: boolean;
  waLogsCount?: number;
  latestWaLog?: WhatsAppLog | null;
}

export interface WhatsAppLog {
  id: string;
  tenantId: string;
  orderId?: string | null;
  recipientPhone: string;
  recipientName?: string | null;
  messagePreview?: string | null;
  status: "sent" | "failed" | "queued";
  mode: "baileys" | "manual";
  errorMessage?: string | null;
  createdAt: string;
}

export interface CashierShift {
  id: string;
  tenantId: string;
  userId: string;
  cashierName?: string;
  cashierEmail?: string;
  openedAt: string;
  closedAt?: string | null;
  startingCash: number;
  systemCashTotal: number;
  actualCashTotal?: number | null;
  discrepancy?: number | null;
  status: "open" | "closed";
  notes?: string | null;
  createdAt: string;
  expectedCash?: number;
  ordersCount?: number;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  unit: string;
  pricePerUnit: number;
  minOrder?: number;
  durationHours?: number;
  status: "active" | "inactive";
  createdAt?: string;
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
  type?: "income" | "expense";
  category: string;
  amount: number;
  notes: string;
  expenseDate: string;
  createdAt?: string;
}

export interface LaundryService {
  id: string;
  name: string;
  unit: string;
  price: number;
}

export interface Tenant {
  id: string;
  userId?: string;
  outletName: string;
  phone: string;
  address: string;
  city?: string | null;
  status: "active" | "inactive";
  subscriptionUntil?: string | null;
  services?: LaundryService[];
  enableCashierShift?: string | boolean;
  owner?: { id: string; name: string; email: string; role: string } | null;
  totalOrders: number;
  totalOmset: number;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  qrisInfo?: string | null;
  openingHours?: string | null;
  isTrial?: string | boolean;
  source?: string;
  referralCodeId?: string | null;
  acquiredAt?: string | null;
}

export type Role = "superadmin" | "tenant_owner" | "staff" | "marketing";

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "inactive";
  subscriptionUntil?: string | null;
  createdAt: string;
  tenantId?: string | null;
  tenantName?: string | null;
  isTrial?: string | boolean;
  signupRequestId?: string | null;
  marketingUserId?: string | null;
  tutorialCompleted?: boolean | string;
  metadata?: string | null;
}

export type DateFilterPreset = "all" | "today" | "this_week" | "this_month" | "this_year";

export type TabType =
  | "overview"
  | "orders"
  | "cashflow"
  | "customers"
  | "services"
  | "reports"
  | "finance"
  | "tenants"
  | "users"
  | "settings"
  | "create-order"
  | "edit-order"
  | "logs"
  | "marketing"
  | "referral_codes"
  | "subscription"
  | "plans"
  | "signups"
  | "invoices"
  | "settings_platform"
  | "wa_numbers"
  | "ai";

// ==========================================
// Types: Referral & Marketing
// ==========================================

export interface ReferralCode {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  discountType: "percent" | "fixed";
  discountValue: number;
  commissionType: "percent" | "fixed";
  commissionValue: number;
  maxUsage?: number | null;
  currentUsage: number;
  validFrom?: string | null;
  validUntil?: string | null;
  isActive: string | boolean;
  appliesToAllTenants: string | boolean;
  marketingProfileId?: string | null;
  createdByUserId?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface MarketingProfile {
  id: string;
  userId: string;
  phone: string;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  commissionRateDefault: number;
  totalEarned: number;
  totalWithdrawn: number;
  notes?: string | null;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userStatus?: string;
}

export interface MarketingCommission {
  id: string;
  marketingProfileId: string;
  referralCodeId: string;
  subscriptionInvoiceId?: string | null;
  tenantId?: string | null;
  baseAmount: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid" | "rejected";
  paidAt?: string | null;
  notes?: string | null;
  createdAt: string;
  codeName?: string;
  marketingName?: string;
}

export interface ReferralStats {
  code: string;
  currentUsage: number;
  maxUsage?: number | null;
  clicks: number;
  signups: number;
  conversionRate: number;
  paymentsCount: number;
  totalRevenue: number;
  totalCommission: number;
}

// ==========================================
// Types: Subscription, Plans & Settings
// ==========================================

export interface Plan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  durationMonths: number;
  pricePerMonth: number;
  features?: string[] | string;
  maxWaNumbers: number;
  maxStaff: number;
  aiTokenQuotaDaily: number;
  isTrialAllowed: string | boolean;
  isActive: string | boolean;
  sortOrder: number;
  createdAt?: string;
}

export interface PlatformSettings {
  id: string;
  platformName: string;
  platformLogo?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  qrisInfo?: string | null;
  defaultTrialDays: number;
  defaultAiDailyQuota: number;
  supportPhone?: string | null;
  supportEmail?: string | null;
  termsUrl?: string | null;
  privacyUrl?: string | null;
  updatedAt?: string;
}

export interface SignupRequest {
  id: string;
  outletName: string;
  ownerName: string;
  phone: string;
  email: string;
  city?: string | null;
  address?: string | null;
  referralCode?: string | null;
  referralCodeId?: string | null;
  planId?: string | null;
  status: "pending" | "activated" | "rejected";
  ipAddress?: string | null;
  userAgent?: string | null;
  createdTenantId?: string | null;
  createdUserId?: string | null;
  activatedAt?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface SubscriptionInvoice {
  id: string;
  invoiceNo: string;
  tenantId: string;
  userId: string;
  planId?: string | null;
  referralCodeId?: string | null;
  durationMonths: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  status: "unpaid" | "pending_verification" | "paid" | "rejected" | "cancelled";
  paymentProofUrl?: string | null;
  paymentProofUploadedAt?: string | null;
  verifiedByUserId?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  notes?: string | null;
  createdAt: string;
  outletName?: string;
  ownerName?: string;
  planName?: string;
}

export interface SubscriptionSummary {
  tenantId: string;
  outletName: string;
  isTrial: boolean;
  isActive: boolean;
  subscriptionUntil: string | null;
  daysRemaining: number;
  status: string;
  referralCodeUsed?: string | null;
  pendingInvoice?: SubscriptionInvoice | null;
  platformBank?: {
    bankName: string | null;
    bankAccountNumber: string | null;
    bankAccountName: string | null;
    qrisInfo: string | null;
  };
}
