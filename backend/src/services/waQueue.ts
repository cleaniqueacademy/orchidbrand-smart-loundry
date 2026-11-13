import { sql } from "drizzle-orm";
import { client, db } from "../db";
import { sendWhatsAppMessage } from "./whatsapp";

type Delivery = typeof sendWhatsAppMessage;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function enqueueWaDelivery(input: { tenantId: string; orderId: string; phone: string; name: string; message: string; event: "created" | "ready"; automatic: boolean }, executor?: Transaction) {
  const id = `wa:${input.orderId}:${input.event}`;
  const persist = async (tx: Transaction) => {
    await tx.execute(sql`INSERT INTO wa_logs(id,tenant_id,order_id,recipient_phone,recipient_name,message_preview,status,mode,created_at)
      VALUES (${id},${input.tenantId},${input.orderId},${input.phone},${input.name},${input.message.slice(0,200)},${input.automatic ? "queued" : "manual_pending"},${input.automatic ? "baileys" : "manual"},${new Date().toISOString()}) ON CONFLICT DO NOTHING`);
    if (input.automatic) await tx.execute(sql`INSERT INTO wa_delivery_jobs(id,tenant_id,phone,message,dedup_key,log_id,available_at)
      VALUES (${id},${input.tenantId},${input.phone},${input.message},${id},${id},now()+interval '3 seconds') ON CONFLICT DO NOTHING`);
  };
  return executor ? persist(executor) : db.transaction(persist);
}
let working = false;
/** PostgreSQL queue, bounded retries and recoverable leases; delivery is at-least-once after a process crash. */
export async function processWaQueue(deliver: Delivery = sendWhatsAppMessage) {
  if (working) return;
  working = true;
  try {
    const jobs = await client.begin(async tx => {
      const rows = await tx`SELECT * FROM wa_delivery_jobs WHERE (status='queued' AND available_at<=now()) OR (status='sending' AND leased_until<now()) ORDER BY available_at LIMIT 1 FOR UPDATE SKIP LOCKED`;
      if (rows.length) await tx`UPDATE wa_delivery_jobs SET status='sending', leased_until=now()+interval '5 minutes', attempts=attempts+1 WHERE id=${rows[0].id}`;
      return rows;
    });
    for (const job of jobs) {
      let result: Awaited<ReturnType<Delivery>>;
      try { result = await deliver(job.tenant_id, job.phone, job.message); }
      catch { result = { success: false, error: "delivery_unavailable" }; }
      const sent = result.success && !result.skipped;
      const status = sent ? "sent" : Number(job.attempts) >= 2 && !result.skipped ? "failed" : "queued";
      const reason = result.skipped ? "recipient_cooldown" : sent ? null : "delivery_unavailable";
      await client.begin(async tx => {
        await tx`UPDATE wa_delivery_jobs SET status=${status}, leased_until=NULL, available_at=now()+interval '65 seconds',last_error=${reason} WHERE id=${job.id}`;
        await tx`UPDATE wa_logs SET status=${status}, error_message=${reason} WHERE id=${job.log_id}`;
      });
      console.info("[wa-queue] delivery state", { jobId: job.id, status });
    }
  } finally { working = false; }
}
