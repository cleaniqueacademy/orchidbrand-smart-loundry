import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db";
import { users, tenants, plans, aiUsageDaily, platformSettings } from "../../db/schema";
import { today } from "../../utils/date";
import type { OperationalContext } from "./types";

/** Deliberate allowlist: no original user text, conversation history, identifiers or named records cross the cloud boundary. */
export function buildCloudInput(message: string, context: OperationalContext, role: string) {
  const intent = /promo|diskon|promosi/i.test(message) ? "Saran promosi laundry berdasarkan agregat" : /laba|rugi|omset|keuangan|pendapatan/i.test(message) ? "Analisis ringkas keuangan agregat" : /pesanan|cucian|antrian/i.test(message) ? "Analisis antrean operasional" : "Panduan umum penggunaan aplikasi laundry";
  const safeNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
  const stats = { ordersToday: safeNumber(context.ordersTodayCount), process: safeNumber(context.processCount), ready: safeNumber(context.readyCount) };
  const financial = role === "tenant_owner" || role === "superadmin" ? { revenueToday: safeNumber(context.revenueToday), monthlyRevenue: safeNumber(context.businessHealth?.monthlyRevenue), monthlyExpense: safeNumber(context.businessHealth?.monthlyExpense), monthlyNetProfit: safeNumber(context.businessHealth?.monthlyNetProfit) } : {};
  return { systemPrompt: `Anda asisten aplikasi laundry. Jawab singkat dalam bahasa Indonesia. Peran terverifikasi: ${["staff","tenant_owner","superadmin","marketing"].includes(role) ? role : "staff"}. Data agregat: ${JSON.stringify({ ...stats, ...financial })}. Jangan mengarang identitas, detail rekening atau data transaksi. Staf hanya mengakses kasir dan shift; pengaturan dan finansial hanya Owner/admin.`, message: intent };
}
export async function reserveAiRequest(actorId: string, tenantId: string | null) {
  await db.transaction(async tx => {
    const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
    const [branch] = tenantId ? await tx.select().from(tenants).where(eq(tenants.id, tenantId)) : [];
    const billingId = branch?.userId || actorId;
    const [owner] = await tx.select().from(users).where(eq(users.id, billingId)).for("update");
    if (!actor || !owner) throw new Error("Identitas AI tidak tersedia");
    const [plan] = await tx.select().from(plans).where(eq(plans.code, owner.tier === "premium" ? "premium" : "pro"));
    const [settings] = await tx.select().from(platformSettings).limit(1);
    const quota = Math.max(0, Math.floor(plan?.aiTokenQuotaDaily ?? settings?.defaultAiDailyQuota ?? 50));
    const id = `ai:${billingId}:${today()}`;
    const [usage] = await tx.select().from(aiUsageDaily).where(eq(aiUsageDaily.id, id));
    if ((usage?.requestCount || 0) >= quota) throw new Error("Kuota pesan AI cloud harian telah habis");
    if (usage) await tx.update(aiUsageDaily).set({ requestCount: sql`${aiUsageDaily.requestCount} + 1`, updatedAt: new Date().toISOString() }).where(eq(aiUsageDaily.id, id));
    else await tx.insert(aiUsageDaily).values({ id, tenantId: null, userId: billingId, usageDate: today(), requestCount: 1 });
  });
}
