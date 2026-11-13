import type { Sql } from "postgres";

/** Additive, serialized migration. Financial history is never reset or repriced here. */
export async function migrateProductionV1(client: Sql) {
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('cleanique-production-v1'))`;
    const applied = await tx`INSERT INTO schema_migrations(name) VALUES ('20261113_production_v1') ON CONFLICT DO NOTHING RETURNING name`;
    if (!applied.length) return;
    await tx`ALTER TABLE users ADD COLUMN IF NOT EXISTS archived_at TEXT, ADD COLUMN IF NOT EXISTS suspended_at TEXT, ADD COLUMN IF NOT EXISTS auth_version INTEGER NOT NULL DEFAULT 1`;
    await tx`ALTER TABLE tenants ADD COLUMN IF NOT EXISTS archived_at TEXT, ADD COLUMN IF NOT EXISTS suspended_at TEXT`;
    // Existing inactive records remain blocked until reviewed; never infer an administrative pardon.
    await tx`UPDATE users SET suspended_at = CURRENT_TIMESTAMP::text WHERE status = 'inactive' AND suspended_at IS NULL`;
    await tx`UPDATE tenants SET suspended_at = CURRENT_TIMESTAMP::text WHERE status = 'inactive' AND suspended_at IS NULL`;
    await tx`CREATE TABLE auth_sessions (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), auth_version INTEGER NOT NULL,
      csrf_hash TEXT NOT NULL, expires_at TIMESTAMPTZ NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await tx`CREATE INDEX auth_sessions_user ON auth_sessions(user_id)`;
    await tx`CREATE INDEX auth_sessions_expiry ON auth_sessions(expires_at)`;
    await tx`CREATE FUNCTION bump_auth_version() RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        IF ROW(NEW.password_hash,NEW.role,NEW.status,NEW.tenant_id,NEW.archived_at,NEW.suspended_at)
          IS DISTINCT FROM ROW(OLD.password_hash,OLD.role,OLD.status,OLD.tenant_id,OLD.archived_at,OLD.suspended_at) THEN
          NEW.auth_version := OLD.auth_version + 1;
        END IF;
        RETURN NEW;
      END $$`;
    await tx`CREATE TRIGGER users_auth_version BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION bump_auth_version()`;
    await tx`CREATE TABLE stored_files (
      path TEXT PRIMARY KEY, owner_id TEXT REFERENCES users(id), category TEXT NOT NULL,
      mime_type TEXT, quarantined BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    // Legacy payment proofs may only be assigned using an actual invoice reference.
    await tx`INSERT INTO stored_files(path,owner_id,category)
      SELECT payment_proof_url, MIN(user_id), 'payments' FROM subscription_invoices
      WHERE payment_proof_url LIKE '/uploads/payments/%' GROUP BY payment_proof_url
      HAVING COUNT(DISTINCT user_id) = 1 ON CONFLICT DO NOTHING`;
    await tx`ALTER TABLE subscription_invoices
      ADD COLUMN IF NOT EXISTS expires_at TEXT,
      ADD COLUMN IF NOT EXISTS entitlement_tier TEXT,
      ADD COLUMN IF NOT EXISTS payment_source TEXT,
      ADD COLUMN IF NOT EXISTS activation_reviewed_by TEXT REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS activation_reviewed_at TEXT,
      ADD COLUMN IF NOT EXISTS activation_review_notes TEXT,
      ADD COLUMN IF NOT EXISTS activation_status TEXT NOT NULL DEFAULT 'not_requested',
      ADD COLUMN IF NOT EXISTS activation_reason TEXT,
      ADD COLUMN IF NOT EXISTS commission_type TEXT,
      ADD COLUMN IF NOT EXISTS commission_value DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS commission_profile_id TEXT REFERENCES marketing_profiles(id),
      ADD COLUMN IF NOT EXISTS idempotency_key TEXT`;
    // Profile identity can be recovered from an existing commission ledger; commission rates cannot be inferred safely.
    await tx`UPDATE subscription_invoices i SET commission_profile_id=c.profile_id FROM (
      SELECT subscription_invoice_id, MIN(marketing_profile_id) profile_id FROM marketing_commissions
      WHERE subscription_invoice_id IS NOT NULL GROUP BY subscription_invoice_id HAVING COUNT(DISTINCT marketing_profile_id)=1
    ) c WHERE i.id=c.subscription_invoice_id AND i.commission_profile_id IS NULL`;
    await tx`CREATE UNIQUE INDEX invoice_idempotency ON subscription_invoices(idempotency_key) WHERE idempotency_key IS NOT NULL`;
    await tx`UPDATE subscription_invoices SET activation_status = 'active' WHERE status = 'paid'`;
    // Unpaid legacy invoices are kept for review; expiry remains NULL rather than silently cancelled.
    await tx`CREATE TABLE referral_assignments (
      id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), referral_code_id TEXT NOT NULL REFERENCES referral_codes(id),
      active BOOLEAN NOT NULL DEFAULT true, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), UNIQUE(owner_id, referral_code_id)
    )`;
    await tx`CREATE UNIQUE INDEX one_active_owner_referral ON referral_assignments(owner_id) WHERE active`;
    await tx`INSERT INTO referral_assignments(id,owner_id,referral_code_id)
      SELECT 'legacy-' || users.id, users.id, tenants.referral_code_id FROM users JOIN tenants ON tenants.user_id = users.id
      WHERE tenants.referral_code_id IS NOT NULL AND users.role = 'tenant_owner'
      AND tenants.id = COALESCE(users.tenant_id, (SELECT t.id FROM tenants t WHERE t.user_id=users.id ORDER BY t.created_at,t.id LIMIT 1))
      ON CONFLICT DO NOTHING`;
    await tx`CREATE TABLE payment_adjustments (
      id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES subscription_invoices(id), request_key TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL, amount DOUBLE PRECISION NOT NULL CHECK(amount >= 0), commission_amount DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK(commission_amount >= 0),
      notes TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await tx`CREATE TABLE wa_delivery_jobs (
      id TEXT PRIMARY KEY, tenant_id TEXT NOT NULL REFERENCES tenants(id), phone TEXT NOT NULL, message TEXT NOT NULL,
      dedup_key TEXT NOT NULL UNIQUE, log_id TEXT REFERENCES wa_logs(id), status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0,
      available_at TIMESTAMPTZ NOT NULL DEFAULT now(), leased_until TIMESTAMPTZ, last_error TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await tx`CREATE INDEX wa_delivery_available ON wa_delivery_jobs(available_at) WHERE status='queued'`;
    await tx`CREATE INDEX wa_delivery_lease ON wa_delivery_jobs(leased_until) WHERE status='sending'`;
  });
}
