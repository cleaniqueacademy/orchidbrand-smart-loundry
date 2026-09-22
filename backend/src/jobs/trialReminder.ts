import { db } from "../db/index";
import { tenants, users, subscriptionEvents } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { daysRemaining, today } from "../utils/date";
import { newId } from "../utils/id";

export interface TrialReminderResult {
  h3RemindersSent: number;
  h1RemindersSent: number;
  expiredMarked: number;
  totalChecked: number;
}

/**
 * Job pemeriksa masa trial secara berkala:
 * - H-3: Kirim reminder sisa 3 hari (anti-duplikat per tanggal)
 * - H-1: Kirim reminder sisa 1 hari (anti-duplikat per tanggal)
 * - H-0 / Negatif: Tandai expired, nonaktifkan tenant & user jika belum diperpanjang
 */
export async function runTrialReminderCheck(): Promise<TrialReminderResult> {
  const trialTenants = await db
    .select()
    .from(tenants)
    .where(eq(tenants.isTrial, "true"));

  let h3RemindersSent = 0;
  let h1RemindersSent = 0;
  let expiredMarked = 0;
  const todayStr = today();
  const nowIso = new Date().toISOString();

  for (const tenant of trialTenants) {
    if (!tenant.subscriptionUntil) continue;

    const remaining = daysRemaining(tenant.subscriptionUntil);

    // 1. Kasus H-3
    if (remaining === 3) {
      const existing = await db
        .select()
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.tenantId, tenant.id),
            eq(subscriptionEvents.eventType, "trial_reminder_h3")
          )
        );

      if (existing.length === 0) {
        await db.insert(subscriptionEvents).values({
          id: newId("subevt"),
          tenantId: tenant.id,
          eventType: "trial_reminder_h3",
          eventDate: todayStr,
          messageSent: `Halo ${tenant.outletName}, masa trial gratis Anda tersisa 3 hari lagi (hingga ${tenant.subscriptionUntil}). Perpanjang sekarang agar operasional laundry tidak terhenti!`,
          createdAt: nowIso,
        });
        h3RemindersSent++;
      }
    }

    // 2. Kasus H-1
    else if (remaining === 1) {
      const existing = await db
        .select()
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.tenantId, tenant.id),
            eq(subscriptionEvents.eventType, "trial_reminder_h1")
          )
        );

      if (existing.length === 0) {
        await db.insert(subscriptionEvents).values({
          id: newId("subevt"),
          tenantId: tenant.id,
          eventType: "trial_reminder_h1",
          eventDate: todayStr,
          messageSent: `PERHATIAN: Masa trial ${tenant.outletName} berakhir BESOK (${tenant.subscriptionUntil}). Segera pilih paket langganan untuk terus menggunakan aplikasi!`,
          createdAt: nowIso,
        });
        h1RemindersSent++;
      }
    }

    // 3. Kasus Expired (<= 0)
    else if (remaining <= 0 && tenant.status === "active") {
      const existing = await db
        .select()
        .from(subscriptionEvents)
        .where(
          and(
            eq(subscriptionEvents.tenantId, tenant.id),
            eq(subscriptionEvents.eventType, "trial_expired")
          )
        );

      if (existing.length === 0) {
        // Nonaktifkan outlet & user owner
        await db
          .update(tenants)
          .set({ status: "inactive" })
          .where(eq(tenants.id, tenant.id));

        await db
          .update(users)
          .set({ status: "inactive" })
          .where(eq(users.id, tenant.userId));

        await db.insert(subscriptionEvents).values({
          id: newId("subevt"),
          tenantId: tenant.id,
          eventType: "trial_expired",
          eventDate: todayStr,
          messageSent: `Masa trial ${tenant.outletName} telah berakhir pada ${tenant.subscriptionUntil}. Akun telah dinonaktifkan sementara hingga perpanjangan dilakukan.`,
          createdAt: nowIso,
        });
        expiredMarked++;
      }
    }
  }

  return {
    h3RemindersSent,
    h1RemindersSent,
    expiredMarked,
    totalChecked: trialTenants.length,
  };
}
