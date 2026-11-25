import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { referralAssignments, referralCodes, referralEvents, tenants, users } from "../db/schema";
import { validateCode } from "./referralService";
import { newId } from "../utils/id";
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Owner lock precedes campaign lock; a prior recipient never consumes another quota slot. */
export async function setOwnerReferralTx(tx: Transaction, tenantId: string, actorId: string, isAdmin: boolean, code: string | null) {
  const [branch] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!branch || (!isAdmin && branch.userId !== actorId)) throw new Error("Akses referral ditolak");
  const [owner] = await tx.select().from(users).where(eq(users.id, branch.userId)).for("update");
  if (!owner || owner.archivedAt || owner.suspendedAt || owner.status !== "active") throw new Error("Owner tidak aktif");
  let campaign: typeof referralCodes.$inferSelect | null = null;
  if (code !== null) {
    const [found] = await tx.select().from(referralCodes).where(eq(sql`UPPER(${referralCodes.code})`, code.trim().toUpperCase())).for("update");
    if (!found) throw new Error("Kode referral tidak ditemukan");
    const eligible = await validateCode(found.code, tenantId, tx);
    if (!eligible.valid) throw new Error(eligible.message || "Kode tidak berlaku");
    campaign = found;
  }
  const assignments = await tx.select().from(referralAssignments).where(eq(referralAssignments.ownerId, owner.id));
  const same = assignments.find(a => a.referralCodeId === campaign?.id);
  await tx.update(referralAssignments).set({ active: false }).where(eq(referralAssignments.ownerId, owner.id));
  if (campaign) {
    if (same) await tx.update(referralAssignments).set({ active: true }).where(eq(referralAssignments.id, same.id));
    else {
      await tx.insert(referralAssignments).values({ id: newId("refowner"), ownerId: owner.id, referralCodeId: campaign.id });
      await tx.update(referralCodes).set({ currentUsage: sql`${referralCodes.currentUsage} + 1` }).where(eq(referralCodes.id, campaign.id));
    }
    if (!same || !same.active) await tx.insert(referralEvents).values({ id: newId("refevt"), referralCodeId: campaign.id, tenantId, eventType: "owner_assigned", metadata: JSON.stringify({ ownerId: owner.id, actorId }) });
  }
  await tx.update(tenants).set({ referralCodeId: campaign?.id ?? null }).where(eq(tenants.userId, owner.id));
  return campaign;
}
export async function setOwnerReferral(tenantId: string, actorId: string, isAdmin: boolean, code: string | null) {
  return db.transaction(tx => setOwnerReferralTx(tx, tenantId, actorId, isAdmin, code));
}
