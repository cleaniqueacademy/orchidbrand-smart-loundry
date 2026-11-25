import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { client, initPostgresTables } from "../db";
import { seedInitialData } from "../db/seed";
import { localMaintenanceFile } from "../services/localMaintenance";

const { values } = parseArgs({ options: { database: { type: "string" }, container: { type: "string" }, "reset-local-data": { type: "boolean" } } });
const target = new URL(process.env.DATABASE_URL || "postgresql://invalid/unknown");
const database = decodeURIComponent(target.pathname.slice(1));
if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1", "[::1]"].includes(target.hostname) || !values["reset-local-data"] || values.database !== database || !/^[A-Za-z0-9_-]+$/.test(database) || !values.container || !/^[A-Za-z0-9_.-]+$/.test(values.container)) throw new Error("Reset hanya untuk database lokal yang disebut eksplisit dengan --database, --container, dan --reset-local-data.");
const container = values.container;
const username = decodeURIComponent(target.username);
async function docker(args: string[]) {
  const process = Bun.spawn(["docker", ...args], { stdout: "pipe", stderr: "pipe" });
  const [output, , code] = await Promise.all([new Response(process.stdout).text(), new Response(process.stderr).text(), process.exited]);
  if (code !== 0) throw new Error(`Operasi database lokal gagal: ${args[0]}`);
  return output;
}
const mapping = await docker(["port", container, "5432/tcp"]);
if (!mapping.split("\n").some(line => line.trim() === `127.0.0.1:${target.port || "5432"}`)) throw new Error("Container tidak sesuai dengan port database lokal. Reset dibatalkan.");
const nonce = crypto.randomUUID();
const archive = `/tmp/cleanique-reset-${nonce}.dump`;
const backupDir = path.join(path.dirname(localMaintenanceFile), "backups");
const backupFile = path.join(backupDir, `${database}-${Date.now()}-${nonce}.dump`);
const rehearsalDb = `cleanique_backup_${nonce.replaceAll("-", "")}`;
let backupReady = false, truncated = false, recovered = false, rehearsalCreated = false;
const credentialsFile = process.env.SEED_CREDENTIALS_FILE || fileURLToPath(new URL("../../users.local.txt", import.meta.url));
let credentialsBackedUp = false;
await fs.mkdir(backupDir, { recursive: true });
await fs.writeFile(localMaintenanceFile, JSON.stringify({ database, startedAt: new Date().toISOString() }), { flag: "wx" });
try {
  await new Promise(resolve => setTimeout(resolve, 1500));
  await initPostgresTables();
  await docker(["exec", container, "pg_dump", `--username=${username}`, `--dbname=${database}`, "--format=custom", `--file=${archive}`]);
  await docker(["cp", `${container}:${archive}`, backupFile]);
  await docker(["exec", container, "pg_restore", "--list", archive]);
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(backupFile)) hash.update(chunk);
  const checksum = hash.digest("hex");
  await docker(["exec", container, "createdb", `--username=${username}`, "--template=template0", rehearsalDb]);
  rehearsalCreated = true;
  await docker(["exec", container, "pg_restore", `--username=${username}`, `--dbname=${rehearsalDb}`, "--exit-on-error", "--no-owner", archive]);
  const countQuery = "SELECT (SELECT count(*) FROM users)||','||(SELECT count(*) FROM subscription_invoices)||','||(SELECT count(*) FROM orders)||','||COALESCE((SELECT sum(final_amount) FROM subscription_invoices WHERE status='paid'),0)||','||(SELECT count(*) FROM platform_cashflow)||','||COALESCE((SELECT sum(amount) FROM platform_cashflow),0)||','||(SELECT count(*) FROM manual_payment_receipts)||','||(SELECT count(*) FROM stored_files)";
  const original = (await docker(["exec", container, "psql", `--username=${username}`, `--dbname=${database}`, "-Atc", countQuery])).trim();
  const restored = (await docker(["exec", container, "psql", `--username=${username}`, `--dbname=${rehearsalDb}`, "-Atc", countQuery])).trim();
  if (original !== restored) throw new Error("Hasil restore backup tidak cocok. Reset dibatalkan.");
  await fs.writeFile(backupFile + ".json", JSON.stringify({ database, host: target.hostname, port: target.port, sha256: checksum, restoredCounts: restored, createdAt: new Date().toISOString() }, null, 2));
  backupReady = true;
  if (await Bun.file(credentialsFile).exists()) { await fs.copyFile(credentialsFile, backupFile + ".credentials.local.txt"); credentialsBackedUp = true; }
  await client.begin(async tx => {
    await tx`SELECT pg_advisory_xact_lock(hashtext('cleanique-local-reset'))`;
    const tables = await tx`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> 'schema_migrations' ORDER BY tablename`;
    if (!tables.length) throw new Error("Tidak ada tabel lokal yang dapat direset.");
    const identifiers = tables.map(row => '"public"."' + String(row.tablename).replaceAll('"', '""') + '"').join(",");
    await tx.unsafe(`TRUNCATE TABLE ${identifiers} RESTART IDENTITY CASCADE`);
  });
  truncated = true;
  process.env.ALLOW_DEMO_RESET = "yes-local-only";
  await seedInitialData();
  const counts = await client`SELECT (SELECT count(*)::int FROM users) accounts, (SELECT count(*)::int FROM tenants) branches, (SELECT count(*)::int FROM subscription_invoices) invoices, (SELECT count(*)::int FROM orders) orders, (SELECT count(*)::int FROM auth_sessions) sessions`;
  if (counts[0].accounts !== 19 || counts[0].branches !== 1 || counts[0].invoices !== 0 || counts[0].orders !== 0 || counts[0].sessions !== 0) throw new Error("Verifikasi seeder tidak sesuai.");
  recovered = true;
  console.info("[local-reset] selesai", { database, ...counts[0], backupFile, sha256: checksum });
} catch {
  if (truncated && backupReady) {
    try {
      await client.end({ timeout: 5 });
      await docker(["exec", container, "pg_restore", `--username=${username}`, `--dbname=${database}`, "--clean", "--if-exists", "--no-owner", "--exit-on-error", archive]);
      if (credentialsBackedUp) await fs.copyFile(backupFile + ".credentials.local.txt", credentialsFile);
      recovered = true;
      console.error("[local-reset] seed gagal; database dipulihkan dari backup");
    } catch { console.error("[local-reset] pemulihan gagal; maintenance tetap aktif", { backupFile }); }
  }
  if (!truncated) recovered = true;
  process.exitCode = 1;
  console.error("[local-reset] proses tidak selesai; tidak ada kredensial dicetak");
} finally {
  if (rehearsalCreated) await docker(["exec", container, "dropdb", `--username=${username}`, "--if-exists", rehearsalDb]).catch(() => console.warn("[local-reset] database rehearsal perlu dibersihkan", { rehearsalDb }));
  if (recovered) await fs.unlink(localMaintenanceFile);
  await client.end({ timeout: 5 });
}
