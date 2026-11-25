import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../db";
import { plans, tenants, users, subscriptionEvents } from "../db/schema";
import { today } from "../utils/date";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export async function assertActiveQuota(tx: Tx, ownerId: string, kind: "branch" | "staff", excludeId?: string) {
  const [owner] = await tx.select().from(users).where(eq(users.id, ownerId)).for("update");
  if (!owner || owner.archivedAt || owner.suspendedAt || owner.status !== "active") throw new Error("Owner tidak aktif");
  const [plan] = await tx.select().from(plans).where(eq(plans.code, owner.tier === "premium" ? "premium" : "pro"));
  if (!plan) throw new Error("Paket tidak tersedia");
  const branches = await tx.select().from(tenants).where(eq(tenants.userId, ownerId));
  if (kind === "branch") {
    const count = branches.filter(b => b.id !== excludeId && !b.archivedAt && b.status === "active").length;
    if (count >= (owner.tier === "premium" ? Math.min(5, plan.maxBranches) : 1)) throw new Error("Kuota cabang aktif terlampaui");
  } else {
    if (owner.tier !== "premium") throw new Error("Staf membutuhkan Premium");
    const staff = branches.length ? await tx.select().from(users).where(and(eq(users.role, "staff"), inArray(users.tenantId, branches.map(b => b.id)), isNull(users.archivedAt), eq(users.status, "active"))) : [];
    if (staff.filter(u => u.id !== excludeId).length >= plan.maxStaff) throw new Error("Kuota staf aktif terlampaui");
  }
}
/** Archive/status operations retain financial references and serialize active quota changes. */
export async function changeLifecycle(kind: "branch" | "user", id: string, action: "archive" | "active" | "inactive", actorId: string) {
  return db.transaction(async tx => {
    const [record] = kind === "branch" ? await tx.select().from(tenants).where(eq(tenants.id, id)) : await tx.select().from(users).where(eq(users.id, id));
    if (!record) throw new Error("Data tidak ditemukan");
    const user = kind === "user" ? record as typeof users.$inferSelect : null;
    let ownerId = kind === "branch" ? (record as typeof tenants.$inferSelect).userId : user?.id;
    if (user?.role === "staff") {
      const [branch] = user.tenantId ? await tx.select().from(tenants).where(eq(tenants.id, user.tenantId)) : [];
      ownerId = branch?.userId;
    }
    if (!ownerId) throw new Error("Owner tidak ditemukan");
    await tx.select().from(users).where(eq(users.id, ownerId)).for("update");
    if (action === "active" && (kind === "branch" || user?.role === "staff")) await assertActiveQuota(tx, ownerId, kind === "branch" ? "branch" : "staff", id);
    const values = action === "archive" ? { archivedAt: new Date().toISOString(), status: "inactive" } : { archivedAt: null, suspendedAt: action === "inactive" ? new Date().toISOString() : null, status: action };
    if (kind === "branch") {
      await tx.update(tenants).set(values).where(eq(tenants.id, id));
      await tx.insert(subscriptionEvents).values({ id: crypto.randomUUID(), tenantId: id, eventType: `branch_${action}`, eventDate: today(), metadata: JSON.stringify({ actorId }) });
    } else {
      await tx.update(users).set(values).where(eq(users.id, id));
      console.info("[accounts] lifecycle changed", { actorId, subjectId: id, action });
    }
  });
}
