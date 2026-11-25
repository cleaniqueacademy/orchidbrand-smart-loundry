import type { Sql } from "postgres";

export async function migrateInvoiceLifecycle(client: Sql) {
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('cleanique-invoice-lifecycle'))`;
    const applied = await tx`INSERT INTO schema_migrations(name) VALUES ('20261114_invoice_lifecycle') ON CONFLICT DO NOTHING RETURNING name`;
    if (!applied.length) return;
    await tx`ALTER TABLE subscription_invoices ADD COLUMN IF NOT EXISTS qris_issued_at TEXT,
      ADD COLUMN IF NOT EXISTS invalidated_at TEXT, ADD COLUMN IF NOT EXISTS invalidation_reason TEXT`;
    await tx`CREATE TABLE IF NOT EXISTS invoice_lifecycle_events (
      id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES subscription_invoices(id),
      event_type TEXT NOT NULL, actor_id TEXT REFERENCES users(id), details TEXT NOT NULL DEFAULT '{}',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await tx`CREATE INDEX IF NOT EXISTS invoice_lifecycle_history ON invoice_lifecycle_events(invoice_id, created_at, id)`;
    // Preserve all legacy evidence. Ambiguous concurrent invoices require explicit admin review.
    await tx`WITH duplicates AS (
      SELECT user_id FROM subscription_invoices WHERE status IN ('unpaid','rejected','pending_verification') GROUP BY user_id HAVING count(*) > 1
    ), changed AS (
      UPDATE subscription_invoices SET status='review_required', invalidated_at=CURRENT_TIMESTAMP::text, invalidation_reason='legacy_duplicate_invoice'
      WHERE user_id IN (SELECT user_id FROM duplicates) AND status IN ('unpaid','rejected','pending_verification') RETURNING id
    ) INSERT INTO invoice_lifecycle_events(id,invoice_id,event_type,details)
      SELECT 'legacy-review:'||id,id,'review_required','{"reason":"legacy_duplicate_invoice"}' FROM changed ON CONFLICT DO NOTHING`;
    await tx`CREATE UNIQUE INDEX IF NOT EXISTS one_active_subscription_invoice_per_owner ON subscription_invoices(user_id)
      WHERE status IN ('unpaid','rejected','pending_verification')`;
  });
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('cleanique-invoice-lifecycle'))`;
    const applied = await tx`INSERT INTO schema_migrations(name) VALUES ('20261114_manual_receipt_review') ON CONFLICT DO NOTHING RETURNING name`;
    if (!applied.length) return;
    await tx`CREATE TABLE manual_payment_receipts (
      id TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES subscription_invoices(id), reference TEXT NOT NULL UNIQUE,
      amount DOUBLE PRECISION NOT NULL CHECK(amount > 0), received_at TEXT NOT NULL, notes TEXT NOT NULL,
      applied_to_invoice BOOLEAN NOT NULL DEFAULT false, actor_id TEXT NOT NULL REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`;
    await tx`CREATE INDEX manual_payment_receipt_invoice ON manual_payment_receipts(invoice_id)`;
  });
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('cleanique-invoice-lifecycle'))`;
    const applied = await tx`INSERT INTO schema_migrations(name) VALUES ('20261114_invoice_request_keys') ON CONFLICT DO NOTHING RETURNING name`;
    if (!applied.length) return;
    await tx`CREATE TABLE invoice_request_keys (request_key TEXT PRIMARY KEY, invoice_id TEXT NOT NULL REFERENCES subscription_invoices(id), fingerprint TEXT NOT NULL)`;
  });
}
