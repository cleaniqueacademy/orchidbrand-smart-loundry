import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { plans, tenants, users } from "../db/schema";
import { newId } from "../utils/id";

export const staffInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(254).transform(v => v.toLowerCase()),
  password: z.string().min(10).max(128),
});

export async function createBranchStaff(tenantId: string, actorId: string, isAdmin: boolean, input: z.infer<typeof staffInput>) {
  const passwordHash = await Bun.password.hash(input.password, { algorithm: "bcrypt", cost: 12 });
  return db.transaction(async tx => {
    const [branch] = await tx.select().from(tenants).where(eq(tenants.id, tenantId));
    if (!branch || (!isAdmin && branch.userId !== actorId)) throw new Error("Akses cabang ditolak");
    const [owner] = await tx.select().from(users).where(eq(users.id, branch.userId)).for("update");
    if (!owner || (!isAdmin && owner.tier !== "premium")) throw new Error("Paket Premium diperlukan");
    const [plan] = await tx.select().from(plans).where(eq(plans.code, "premium"));
    const branches = await tx.select({ id: tenants.id }).from(tenants).where(eq(tenants.userId, branch.userId));
    const staff = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, "staff"), inArray(users.tenantId, branches.map(b => b.id))));
    if (!isAdmin && (!plan || staff.length >= plan.maxStaff)) throw new Error("Batas staf paket telah tercapai");
    const [created] = await tx.insert(users).values({
      id: newId("staff"), name: input.name, email: input.email, passwordHash,
      role: "staff", status: "active", tenantId,
    }).returning({ id: users.id, name: users.name, email: users.email, role: users.role, tenantId: users.tenantId });
    return created;
  });
}
