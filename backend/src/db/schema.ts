import { pgTable, text, doublePrecision } from "drizzle-orm/pg-core";

// ==========================================
// 1. Core Users & Tenants
// ==========================================

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("tenant_owner"), // 'superadmin' | 'tenant_owner' | 'staff' | 'marketing'
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  subscriptionUntil: text("subscription_until"), // ISO Date string e.g. '2026-12-31'
  tenantId: text("tenant_id"), // For staff users, linked to specific tenant outlet
  isTrial: text("is_trial").notNull().default("false"), // 'true' | 'false'
  signupRequestId: text("signup_request_id"), // Link ke signup_requests jika daftar mandiri
  marketingUserId: text("marketing_user_id"), // Link ke marketing user jika akun ini dibuat marketing
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  outletName: text("outlet_name").notNull(),
  phone: text("phone").notNull(),
  address: text("address").notNull(),
  city: text("city"), // Kota/Kecamatan cabang
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  subscriptionUntil: text("subscription_until"),
  waMode: text("wa_mode").notNull().default("manual"), // 'manual' | 'baileys'
  services: text("services"), // JSON stringified array of LaundryService
  enableCashierShift: text("enable_cashier_shift").notNull().default("true"), // 'true' | 'false'
  // Informasi Rekening Bank & Pembayaran
  bankName: text("bank_name"), // Nama bank: BCA, Mandiri, BRI, BNI, BSI, dll.
  bankAccountNumber: text("bank_account_number"), // Nomor rekening
  bankAccountName: text("bank_account_name"), // Atas nama pemilik rekening
  qrisInfo: text("qris_info"), // Nomor QRIS / link QRIS (opsional)
  openingHours: text("opening_hours"), // JSON: { weekdays: "08:00-16:00", saturday: "08:00-13:00", sunday: "Tutup" }
  // Metadata pendaftaran & referral
  isTrial: text("is_trial").notNull().default("false"), // 'true' | 'false'
  source: text("source").notNull().default("manual"), // 'manual' | 'signup' | 'referral'
  referralCodeId: text("referral_code_id"),
  acquiredAt: text("acquired_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  customerId: text("customer_id").notNull().references(() => customers.id),
  invoiceNo: text("invoice_no").notNull().unique(),
  serviceType: text("service_type").notNull(), // 'Cuci Komplit (Kg)', 'Cuci Kering (Kg)', etc.
  weightOrQty: doublePrecision("weight_or_qty").notNull(),
  unit: text("unit").notNull().default("kg"), // 'kg' | 'pcs'
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  totalAmount: doublePrecision("total_amount").notNull(),
  status: text("status").notNull().default("process"), // 'process' | 'ready' | 'completed' | 'cancelled'
  paymentStatus: text("payment_status").notNull().default("unpaid"), // 'unpaid' | 'paid'
  paymentMethod: text("payment_method").default("cash"), // 'cash' | 'transfer' | 'qris'
  notes: text("notes"),
  items: text("items"), // JSON stringified array of OrderItem
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  estimatedCompletionAt: text("estimated_completion_at"),
  completedAt: text("completed_at"),
  paidAt: text("paid_at"), // ISO timestamp when payment was received
  paidShiftId: text("paid_shift_id"), // Cashier shift ID during which payment was accepted
});

export const services = pgTable("services", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  unit: text("unit").notNull().default("kg"), // 'kg' | 'pcs' | 'meter' | 'pasang'
  pricePerUnit: doublePrecision("price_per_unit").notNull(),
  minOrder: doublePrecision("min_order").default(1),
  durationHours: doublePrecision("duration_hours").default(48),
  status: text("status").notNull().default("active"), // 'active' | 'inactive'
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const expenses = pgTable("expenses", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  type: text("type").notNull().default("expense"), // 'expense' | 'income'
  category: text("category").notNull(),
  amount: doublePrecision("amount").notNull(),
  notes: text("notes").notNull(),
  expenseDate: text("expense_date").notNull().$defaultFn(() => new Date().toISOString().slice(0, 10)),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const shifts = pgTable("shifts", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull().references(() => users.id),
  openedAt: text("opened_at").notNull().$defaultFn(() => new Date().toISOString()),
  closedAt: text("closed_at"),
  startingCash: doublePrecision("starting_cash").notNull().default(0),
  systemCashTotal: doublePrecision("system_cash_total").notNull().default(0),
  actualCashTotal: doublePrecision("actual_cash_total"),
  discrepancy: doublePrecision("discrepancy").default(0),
  status: text("status").notNull().default("open"), // 'open' | 'closed'
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const waLogs = pgTable("wa_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  orderId: text("order_id").references(() => orders.id),
  recipientPhone: text("recipient_phone").notNull(),
  recipientName: text("recipient_name"),
  messagePreview: text("message_preview"),
  status: text("status").notNull().default("sent"), // 'sent' | 'failed' | 'queued'
  mode: text("mode").notNull().default("baileys"), // 'baileys' | 'manual'
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ==========================================
// 2. Marketing & Referral System
// ==========================================

export const marketingProfiles = pgTable("marketing_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().unique().references(() => users.id),
  phone: text("phone").notNull(),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  commissionRateDefault: doublePrecision("commission_rate_default").default(0),
  totalEarned: doublePrecision("total_earned").notNull().default(0),
  totalWithdrawn: doublePrecision("total_withdrawn").notNull().default(0),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const referralCodes = pgTable("referral_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // e.g. "DISKON50", "CLEANBERKAH"
  name: text("name").notNull(),
  description: text("description"),
  discountType: text("discount_type").notNull().default("percent"), // 'percent' | 'fixed'
  discountValue: doublePrecision("discount_value").notNull().default(0),
  commissionType: text("commission_type").notNull().default("percent"), // 'percent' | 'fixed'
  commissionValue: doublePrecision("commission_value").notNull().default(0),
  maxUsage: doublePrecision("max_usage"), // null or 0 = unlimited
  currentUsage: doublePrecision("current_usage").notNull().default(0),
  validFrom: text("valid_from"), // YYYY-MM-DD
  validUntil: text("valid_until"), // YYYY-MM-DD
  isActive: text("is_active").notNull().default("true"), // 'true' | 'false'
  appliesToAllTenants: text("applies_to_all_tenants").notNull().default("true"), // 'true' | 'false'
  marketingProfileId: text("marketing_profile_id").references(() => marketingProfiles.id),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const referralCodeTenants = pgTable("referral_code_tenants", {
  id: text("id").primaryKey(),
  referralCodeId: text("referral_code_id").notNull().references(() => referralCodes.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  isEnabled: text("is_enabled").notNull().default("true"), // 'true' | 'false'
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const referralEvents = pgTable("referral_events", {
  id: text("id").primaryKey(),
  referralCodeId: text("referral_code_id").notNull().references(() => referralCodes.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  eventType: text("event_type").notNull(), // 'click' | 'signup' | 'subscription_payment'
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ==========================================
// 3. Plans, Platform Settings & Subscriptions
// ==========================================

export const plans = pgTable("plans", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(), // 'basic', 'pro', 'enterprise'
  name: text("name").notNull(),
  description: text("description"),
  durationMonths: doublePrecision("duration_months").notNull().default(1),
  pricePerMonth: doublePrecision("price_per_month").notNull().default(0),
  features: text("features"), // JSON array of string
  maxWaNumbers: doublePrecision("max_wa_numbers").notNull().default(1),
  maxStaff: doublePrecision("max_staff").notNull().default(3),
  aiTokenQuotaDaily: doublePrecision("ai_token_quota_daily").notNull().default(100),
  isTrialAllowed: text("is_trial_allowed").notNull().default("true"), // 'true' | 'false'
  isActive: text("is_active").notNull().default("true"), // 'true' | 'false'
  sortOrder: doublePrecision("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const platformSettings = pgTable("platform_settings", {
  id: text("id").primaryKey(), // 'default'
  platformName: text("platform_name").notNull().default("Laundry Cleanique"),
  platformLogo: text("platform_logo"),
  bankName: text("bank_name"),
  bankAccountNumber: text("bank_account_number"),
  bankAccountName: text("bank_account_name"),
  qrisInfo: text("qris_info"),
  defaultTrialDays: doublePrecision("default_trial_days").notNull().default(7),
  defaultAiDailyQuota: doublePrecision("default_ai_daily_quota").notNull().default(50),
  supportPhone: text("support_phone"),
  supportEmail: text("support_email"),
  termsUrl: text("terms_url"),
  privacyUrl: text("privacy_url"),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const signupRequests = pgTable("signup_requests", {
  id: text("id").primaryKey(),
  outletName: text("outlet_name").notNull(),
  ownerName: text("owner_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  city: text("city"),
  address: text("address"),
  referralCode: text("referral_code"),
  referralCodeId: text("referral_code_id").references(() => referralCodes.id),
  planId: text("plan_id").references(() => plans.id),
  status: text("status").notNull().default("pending"), // 'pending' | 'activated' | 'rejected'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdTenantId: text("created_tenant_id").references(() => tenants.id),
  createdUserId: text("created_user_id").references(() => users.id),
  activatedAt: text("activated_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const subscriptionInvoices = pgTable("subscription_invoices", {
  id: text("id").primaryKey(),
  invoiceNo: text("invoice_no").notNull().unique(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull().references(() => users.id),
  planId: text("plan_id").references(() => plans.id),
  referralCodeId: text("referral_code_id").references(() => referralCodes.id),
  durationMonths: doublePrecision("duration_months").notNull().default(1),
  originalAmount: doublePrecision("original_amount").notNull(),
  discountAmount: doublePrecision("discount_amount").notNull().default(0),
  finalAmount: doublePrecision("final_amount").notNull(),
  status: text("status").notNull().default("unpaid"), // 'unpaid' | 'pending_verification' | 'paid' | 'rejected' | 'cancelled'
  paymentProofUrl: text("payment_proof_url"),
  paymentProofUploadedAt: text("payment_proof_uploaded_at"),
  verifiedByUserId: text("verified_by_user_id").references(() => users.id),
  verifiedAt: text("verified_at"),
  rejectionReason: text("rejection_reason"),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const marketingCommissions = pgTable("marketing_commissions", {
  id: text("id").primaryKey(),
  marketingProfileId: text("marketing_profile_id").notNull().references(() => marketingProfiles.id),
  referralCodeId: text("referral_code_id").notNull().references(() => referralCodes.id),
  subscriptionInvoiceId: text("subscription_invoice_id").references(() => subscriptionInvoices.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  baseAmount: doublePrecision("base_amount").notNull(),
  commissionAmount: doublePrecision("commission_amount").notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'paid' | 'rejected'
  paidAt: text("paid_at"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const subscriptionEvents = pgTable("subscription_events", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  eventType: text("event_type").notNull(), // 'trial_started' | 'trial_reminder_h3' | 'trial_reminder_h1' | 'trial_expired' | 'renewed' | 'expired'
  eventDate: text("event_date").notNull(), // YYYY-MM-DD
  messageSent: text("message_sent"),
  metadata: text("metadata"), // JSON string
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const platformCashflow = pgTable("platform_cashflow", {
  id: text("id").primaryKey(),
  type: text("type").notNull(), // 'income' | 'expense'
  category: text("category").notNull(), // 'subscription' | 'marketing_commission' | 'server' | 'wa_quota' | 'other'
  amount: doublePrecision("amount").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  tenantId: text("tenant_id").references(() => tenants.id),
  referralCode: text("referral_code"),
  durationMonths: doublePrecision("duration_months"),
  description: text("description").notNull(),
  proofUrl: text("proof_url"),
  notes: text("notes"),
  createdByUserId: text("created_by_user_id").references(() => users.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ==========================================
// 4. WhatsApp Multi-Number & Inbox
// ==========================================

export const waNumbers = pgTable("wa_numbers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  sessionKey: text("session_key").notNull().unique(), // e.g. "tenant-01" atau "tenant-01-cs"
  label: text("label").notNull(), // "Kasir Utama", "CS & Promo", dll.
  phoneNumber: text("phone_number"),
  isPrimary: text("is_primary").notNull().default("false"), // 'true' | 'false'
  botEnabled: text("bot_enabled").notNull().default("false"), // 'true' | 'false'
  aiEnabled: text("ai_enabled").notNull().default("false"), // 'true' | 'false'
  status: text("status").notNull().default("disconnected"), // 'connected' | 'disconnected' | 'connecting' | 'qr'
  qrCode: text("qr_code"),
  lastConnectedAt: text("last_connected_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const waMessages = pgTable("wa_messages", {
  id: text("id").primaryKey(),
  waNumberId: text("wa_number_id").references(() => waNumbers.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  direction: text("direction").notNull(), // 'inbound' | 'outbound'
  senderPhone: text("sender_phone").notNull(),
  recipientPhone: text("recipient_phone").notNull(),
  messageBody: text("message_body").notNull(),
  messageType: text("message_type").notNull().default("text"), // 'text' | 'image' | 'document' | 'template'
  status: text("status").notNull().default("sent"), // 'received' | 'sent' | 'failed' | 'read'
  relatedOrderId: text("related_order_id").references(() => orders.id),
  errorMessage: text("error_message"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ==========================================
// 5. In-Web AI Assistant
// ==========================================

export const aiConversations = pgTable("ai_conversations", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  tenantId: text("tenant_id").references(() => tenants.id),
  title: text("title").notNull().default("Percakapan Baru"),
  status: text("status").notNull().default("active"), // 'active' | 'archived'
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});

export const aiMessages = pgTable("ai_messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => aiConversations.id),
  role: text("role").notNull(), // 'user' | 'assistant' | 'system' | 'tool'
  content: text("content").notNull(),
  toolCalls: text("tool_calls"), // JSON stringified array of ToolCall
  toolCallId: text("tool_call_id"),
  tokensUsed: doublePrecision("tokens_used"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const aiUsageDaily = pgTable("ai_usage_daily", {
  id: text("id").primaryKey(), // `${tenantId || userId}-${YYYY-MM-DD}`
  tenantId: text("tenant_id").references(() => tenants.id),
  userId: text("user_id").references(() => users.id),
  usageDate: text("usage_date").notNull(), // YYYY-MM-DD
  requestCount: doublePrecision("request_count").notNull().default(0),
  tokenCount: doublePrecision("token_count").notNull().default(0),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at"),
});
