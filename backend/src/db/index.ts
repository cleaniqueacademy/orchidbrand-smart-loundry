import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is required but not set.");
}

export const client = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client, { schema });

// Auto-initialize PostgreSQL tables if not existing
export async function initPostgresTables() {
  try {
    // ----------------------------------------------------
    // 1. Core Users & Tenants
    // ----------------------------------------------------
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'tenant_owner',
        status TEXT NOT NULL DEFAULT 'active',
        subscription_until TEXT,
        tenant_id TEXT,
        is_trial TEXT NOT NULL DEFAULT 'false',
        signup_request_id TEXT,
        marketing_user_id TEXT,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_until TEXT;`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_trial TEXT NOT NULL DEFAULT 'false';`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS signup_request_id TEXT;`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_user_id TEXT;`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS tutorial_completed TEXT NOT NULL DEFAULT 'false';`;
    await client`ALTER TABLE users ADD COLUMN IF NOT EXISTS metadata TEXT;`;

    await client`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        outlet_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT NOT NULL,
        city TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        subscription_until TEXT,
        wa_mode TEXT NOT NULL DEFAULT 'manual',
        services TEXT,
        enable_cashier_shift TEXT NOT NULL DEFAULT 'true',
        bank_name TEXT,
        bank_account_number TEXT,
        bank_account_name TEXT,
        qris_info TEXT,
        opening_hours TEXT,
        is_trial TEXT NOT NULL DEFAULT 'false',
        source TEXT NOT NULL DEFAULT 'manual',
        referral_code_id TEXT,
        acquired_at TEXT,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS subscription_until TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_mode TEXT NOT NULL DEFAULT 'manual';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS services TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS enable_cashier_shift TEXT NOT NULL DEFAULT 'true';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS city TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_name TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_number TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bank_account_name TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS qris_info TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS opening_hours TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_trial TEXT NOT NULL DEFAULT 'false';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual';`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS referral_code_id TEXT;`;
    await client`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS acquired_at TEXT;`;

    await client`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        customer_id TEXT NOT NULL REFERENCES customers(id),
        invoice_no TEXT NOT NULL UNIQUE,
        service_type TEXT NOT NULL,
        weight_or_qty DOUBLE PRECISION NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        price_per_unit DOUBLE PRECISION NOT NULL,
        total_amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'process',
        payment_status TEXT NOT NULL DEFAULT 'unpaid',
        payment_method TEXT DEFAULT 'cash',
        notes TEXT,
        items TEXT,
        estimated_completion_at TEXT,
        completed_at TEXT,
        paid_at TEXT,
        paid_shift_id TEXT,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TEXT;`;
    await client`ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_shift_id TEXT;`;
    await client`ALTER TABLE orders ADD COLUMN IF NOT EXISTS items TEXT;`;
    await client`ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_completion_at TEXT;`;

    await client`
      CREATE TABLE IF NOT EXISTS services (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        name TEXT NOT NULL,
        unit TEXT NOT NULL DEFAULT 'kg',
        price_per_unit DOUBLE PRECISION NOT NULL,
        min_order DOUBLE PRECISION DEFAULT 1,
        duration_hours DOUBLE PRECISION DEFAULT 48,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        type TEXT NOT NULL DEFAULT 'expense',
        category TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        notes TEXT NOT NULL,
        expense_date TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `;
    await client`ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'expense';`;

    await client`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        opened_at TEXT NOT NULL,
        closed_at TEXT,
        starting_cash DOUBLE PRECISION NOT NULL DEFAULT 0,
        system_cash_total DOUBLE PRECISION NOT NULL DEFAULT 0,
        actual_cash_total DOUBLE PRECISION,
        discrepancy DOUBLE PRECISION DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'open',
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS wa_logs (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        order_id TEXT REFERENCES orders(id),
        recipient_phone TEXT NOT NULL,
        recipient_name TEXT,
        message_preview TEXT,
        status TEXT NOT NULL DEFAULT 'sent',
        mode TEXT NOT NULL DEFAULT 'baileys',
        error_message TEXT,
        created_at TEXT NOT NULL
      );
    `;

    // ----------------------------------------------------
    // 2. Marketing & Referral System
    // ----------------------------------------------------
    await client`
      CREATE TABLE IF NOT EXISTS marketing_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        phone TEXT NOT NULL,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_account_name TEXT,
        commission_rate_default DOUBLE PRECISION DEFAULT 0,
        total_earned DOUBLE PRECISION NOT NULL DEFAULT 0,
        total_withdrawn DOUBLE PRECISION NOT NULL DEFAULT 0,
        notes TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS referral_codes (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        discount_type TEXT NOT NULL DEFAULT 'percent',
        discount_value DOUBLE PRECISION NOT NULL DEFAULT 0,
        commission_type TEXT NOT NULL DEFAULT 'percent',
        commission_value DOUBLE PRECISION NOT NULL DEFAULT 0,
        max_usage DOUBLE PRECISION,
        current_usage DOUBLE PRECISION NOT NULL DEFAULT 0,
        valid_from TEXT,
        valid_until TEXT,
        is_active TEXT NOT NULL DEFAULT 'true',
        applies_to_all_tenants TEXT NOT NULL DEFAULT 'true',
        marketing_profile_id TEXT REFERENCES marketing_profiles(id),
        created_by_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS referral_code_tenants (
        id TEXT PRIMARY KEY,
        referral_code_id TEXT NOT NULL REFERENCES referral_codes(id),
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        is_enabled TEXT NOT NULL DEFAULT 'true',
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS referral_events (
        id TEXT PRIMARY KEY,
        referral_code_id TEXT NOT NULL REFERENCES referral_codes(id),
        tenant_id TEXT REFERENCES tenants(id),
        event_type TEXT NOT NULL,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `;

    // ----------------------------------------------------
    // 3. Plans, Platform Settings & Subscriptions
    // ----------------------------------------------------
    await client`
      CREATE TABLE IF NOT EXISTS plans (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        description TEXT,
        duration_months DOUBLE PRECISION NOT NULL DEFAULT 1,
        price_per_month DOUBLE PRECISION NOT NULL DEFAULT 0,
        features TEXT,
        max_wa_numbers DOUBLE PRECISION NOT NULL DEFAULT 1,
        max_staff DOUBLE PRECISION NOT NULL DEFAULT 3,
        ai_token_quota_daily DOUBLE PRECISION NOT NULL DEFAULT 100,
        is_trial_allowed TEXT NOT NULL DEFAULT 'true',
        is_active TEXT NOT NULL DEFAULT 'true',
        sort_order DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS platform_settings (
        id TEXT PRIMARY KEY,
        platform_name TEXT NOT NULL DEFAULT 'Laundry Cleanique',
        platform_logo TEXT,
        bank_name TEXT,
        bank_account_number TEXT,
        bank_account_name TEXT,
        qris_info TEXT,
        default_trial_days DOUBLE PRECISION NOT NULL DEFAULT 7,
        default_ai_daily_quota DOUBLE PRECISION NOT NULL DEFAULT 50,
        support_phone TEXT,
        support_email TEXT,
        terms_url TEXT,
        privacy_url TEXT,
        updated_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS signup_requests (
        id TEXT PRIMARY KEY,
        outlet_name TEXT NOT NULL,
        owner_name TEXT NOT NULL,
        phone TEXT NOT NULL,
        email TEXT NOT NULL,
        city TEXT,
        address TEXT,
        referral_code TEXT,
        referral_code_id TEXT REFERENCES referral_codes(id),
        plan_id TEXT REFERENCES plans(id),
        status TEXT NOT NULL DEFAULT 'pending',
        ip_address TEXT,
        user_agent TEXT,
        created_tenant_id TEXT REFERENCES tenants(id),
        created_user_id TEXT REFERENCES users(id),
        activated_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS subscription_invoices (
        id TEXT PRIMARY KEY,
        invoice_no TEXT NOT NULL UNIQUE,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        plan_id TEXT REFERENCES plans(id),
        referral_code_id TEXT REFERENCES referral_codes(id),
        duration_months DOUBLE PRECISION NOT NULL DEFAULT 1,
        original_amount DOUBLE PRECISION NOT NULL,
        discount_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
        final_amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'unpaid',
        payment_proof_url TEXT,
        payment_proof_uploaded_at TEXT,
        verified_by_user_id TEXT REFERENCES users(id),
        verified_at TEXT,
        rejection_reason TEXT,
        period_start TEXT,
        period_end TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS marketing_commissions (
        id TEXT PRIMARY KEY,
        marketing_profile_id TEXT NOT NULL REFERENCES marketing_profiles(id),
        referral_code_id TEXT NOT NULL REFERENCES referral_codes(id),
        subscription_invoice_id TEXT REFERENCES subscription_invoices(id),
        tenant_id TEXT REFERENCES tenants(id),
        base_amount DOUBLE PRECISION NOT NULL,
        commission_amount DOUBLE PRECISION NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        paid_at TEXT,
        notes TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS subscription_events (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        event_type TEXT NOT NULL,
        event_date TEXT NOT NULL,
        message_sent TEXT,
        metadata TEXT,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS platform_cashflow (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        date TEXT NOT NULL,
        tenant_id TEXT REFERENCES tenants(id),
        referral_code TEXT,
        duration_months DOUBLE PRECISION,
        description TEXT NOT NULL,
        proof_url TEXT,
        notes TEXT,
        created_by_user_id TEXT REFERENCES users(id),
        created_at TEXT NOT NULL
      );
    `;

    // ----------------------------------------------------
    // 4. WhatsApp Multi-Number & Messages
    // ----------------------------------------------------
    await client`
      CREATE TABLE IF NOT EXISTS wa_numbers (
        id TEXT PRIMARY KEY,
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        session_key TEXT NOT NULL UNIQUE,
        label TEXT NOT NULL,
        phone_number TEXT,
        is_primary TEXT NOT NULL DEFAULT 'false',
        bot_enabled TEXT NOT NULL DEFAULT 'false',
        ai_enabled TEXT NOT NULL DEFAULT 'false',
        status TEXT NOT NULL DEFAULT 'disconnected',
        qr_code TEXT,
        last_connected_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS wa_messages (
        id TEXT PRIMARY KEY,
        wa_number_id TEXT REFERENCES wa_numbers(id),
        tenant_id TEXT NOT NULL REFERENCES tenants(id),
        direction TEXT NOT NULL,
        sender_phone TEXT NOT NULL,
        recipient_phone TEXT NOT NULL,
        message_body TEXT NOT NULL,
        message_type TEXT NOT NULL DEFAULT 'text',
        status TEXT NOT NULL DEFAULT 'sent',
        related_order_id TEXT REFERENCES orders(id),
        error_message TEXT,
        created_at TEXT NOT NULL
      );
    `;

    // ----------------------------------------------------
    // 5. In-Web AI Assistant
    // ----------------------------------------------------
    await client`
      CREATE TABLE IF NOT EXISTS ai_conversations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        tenant_id TEXT REFERENCES tenants(id),
        title TEXT NOT NULL DEFAULT 'Percakapan Baru',
        status TEXT NOT NULL DEFAULT 'active',
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL REFERENCES ai_conversations(id),
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        tool_calls TEXT,
        tool_call_id TEXT,
        tokens_used DOUBLE PRECISION,
        created_at TEXT NOT NULL
      );
    `;

    await client`
      CREATE TABLE IF NOT EXISTS ai_usage_daily (
        id TEXT PRIMARY KEY,
        tenant_id TEXT REFERENCES tenants(id),
        user_id TEXT REFERENCES users(id),
        usage_date TEXT NOT NULL,
        request_count DOUBLE PRECISION NOT NULL DEFAULT 0,
        token_count DOUBLE PRECISION NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT
      );
    `;

    // ----------------------------------------------------
    // Indexes (Idempotent)
    // ----------------------------------------------------
    await client`CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);`;
    await client`CREATE INDEX IF NOT EXISTS idx_referral_events_code ON referral_events(referral_code_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_signup_requests_email ON signup_requests(email);`;
    await client`CREATE INDEX IF NOT EXISTS idx_subscription_invoices_tenant ON subscription_invoices(tenant_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_subscription_invoices_status ON subscription_invoices(status);`;
    await client`CREATE INDEX IF NOT EXISTS idx_wa_numbers_tenant ON wa_numbers(tenant_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_wa_numbers_session ON wa_numbers(session_key);`;
    await client`CREATE INDEX IF NOT EXISTS idx_wa_messages_tenant ON wa_messages(tenant_id);`;
    await client`CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON ai_messages(conversation_id);`;

    console.log("✅ PostgreSQL tables verified/initialized successfully (including v2.0 modules)");
  } catch (err: any) {
    console.warn("⚠️ PostgreSQL init notice:", err.message);
  }
}
