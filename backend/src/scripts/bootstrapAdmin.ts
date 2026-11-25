import { client, db, initPostgresTables } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
/** Explicit operator bootstrap; never overwrites an existing account or seeds demo/payment data. */
async function main() {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 16 || password.length > 128) throw new Error("Set email admin dan sandi acak 16-128 karakter melalui environment");
  await initPostgresTables();
  const hash = await Bun.password.hash(password, { algorithm:"bcrypt",cost:12 });
  await db.transaction(async tx => {
    await tx.execute("SELECT pg_advisory_xact_lock(hashtext('bootstrap-admin'))");
    const existing = await tx.select({id:users.id}).from(users).where(eq(users.role,"superadmin"));
    if (existing.length) throw new Error("Superadmin sudah tersedia; gunakan pemulihan akun resmi");
    await tx.insert(users).values({id:crypto.randomUUID(),name:"Administrator",email,passwordHash:hash,role:"superadmin",status:"active"});
  });
  console.info("[bootstrap] administrator created");
}
if(import.meta.main) { try { await main(); } catch(error){ console.error(error instanceof Error ? error.message : "Bootstrap gagal"); process.exitCode=1; } finally { await client.end(); } }
