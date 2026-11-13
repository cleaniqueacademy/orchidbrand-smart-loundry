import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { tenants, users, services, plans } from "../db/schema";
import { newId } from "../utils/id";

export const branchInput = z.object({
  outletName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().min(1).max(500),
  city: z.string().trim().max(120).optional(),
});

/** Owner row serializes creation and billing so concurrent requests cannot exceed quota. */
export async function createOwnerBranch(ownerId: string, input: z.infer<typeof branchInput>) {
  return db.transaction(async tx => {
    const [owner] = await tx.select().from(users).where(and(eq(users.id, ownerId), eq(users.role, "tenant_owner"))).for("update");
    if (!owner || owner.tier !== "premium") throw new Error("Paket Premium diperlukan");
    const branches = await tx.select().from(tenants).where(eq(tenants.userId, ownerId));
    const [plan] = await tx.select().from(plans).where(eq(plans.code, "premium"));
    if (!plan) throw new Error("Konfigurasi Premium tidak tersedia");
    if (branches.length >= Math.min(5, plan.maxBranches)) throw new Error("Batas lima cabang telah tercapai");
    const [branch] = await tx.insert(tenants).values({
      id: newId("tenant"), userId: ownerId, ...input,
      tier: owner.tier, subscriptionUntil: owner.subscriptionUntil,
      isTrial: owner.isTrial, status: owner.status, waMode: "manual",
    }).returning();
    // Only copy non-sensitive service definitions; customers, payments and WA sessions stay isolated.
    if (branches[0]) {
      const definitions = await tx.select().from(services).where(eq(services.tenantId, branches[0].id));
      if (definitions.length) await tx.insert(services).values(definitions.map(definition => ({
        ...definition, id: newId("srv"), tenantId: branch.id, createdAt: new Date().toISOString(),
      })));
    }
    return branch;
  });
}
