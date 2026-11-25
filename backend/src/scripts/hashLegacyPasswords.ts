import { client, db } from "../db";
import { users } from "../db/schema";
import { and, eq } from "drizzle-orm";
/** One-time operator migration. No password values or account identifiers are logged. */
if(import.meta.main) {
  try {
    const rows = await db.select({id:users.id,hash:users.passwordHash}).from(users);
    const legacy = rows.filter(row=>!/^\$(2[aby]|argon2(?:id|i|d))\$/.test(row.hash));
    console.info("[password-migration] legacy count",{count:legacy.length,apply:process.env.APPLY_LEGACY_HASH==="yes"});
    if(process.env.APPLY_LEGACY_HASH==="yes") for(const row of legacy) {
      if (!row.hash || row.hash.length>128) throw new Error("Kredensial lama tidak valid; perlukan reset administratif");
      const hash=await Bun.password.hash(row.hash,{algorithm:"bcrypt",cost:12});
      await db.update(users).set({passwordHash:hash}).where(and(eq(users.id,row.id),eq(users.passwordHash,row.hash)));
    }
  } catch {console.error("[password-migration] failed; review required");process.exitCode=1;} finally {await client.end();}
}
