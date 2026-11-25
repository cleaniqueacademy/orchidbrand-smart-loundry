import { Hono, type Context } from "hono";
import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { storedFiles } from "../db/schema";
import { authMiddleware, getUser } from "../middleware/auth";
import { getUploadsBaseDir } from "../services/storageService";

const files = new Hono();
async function serve(c: Context, sensitive: boolean) {
  let relative: string;
  try { relative = decodeURIComponent(c.req.path.replace(/^\/uploads\//, "")); } catch { return c.text("Path tidak valid", 400); }
  if (!/^(payments|general|qris|logos)\/\d{4}-\d{2}\/[a-f0-9-]+\.(png|jpg|webp|pdf)$/.test(relative)) return c.notFound();
  const url = "/uploads/" + relative;
  const [record] = await db.select().from(storedFiles).where(eq(storedFiles.path, url));
  if (sensitive) {
    const actor = getUser(c);
    if (!record || record.quarantined || (actor.role !== "superadmin" && record.ownerId !== actor.userId)) return c.notFound();
  }
  try {
    const root = await fs.realpath(getUploadsBaseDir());
    const actual = await fs.realpath(path.join(root, relative));
    const within = path.relative(root, actual);
    if (within.startsWith("..") || path.isAbsolute(within)) return c.notFound();
    const file = Bun.file(actual);
    if (!await file.exists()) return c.notFound();
    c.header("Cache-Control", sensitive ? "private, no-store, max-age=0" : "public, max-age=3600");
    c.header("X-Content-Type-Options", "nosniff");
    c.header("Content-Security-Policy", "default-src 'none'; sandbox");
    if (relative.endsWith(".pdf")) c.header("Content-Disposition", 'attachment; filename="bukti-pembayaran.pdf"');
    return new Response(file, { headers: c.res.headers });
  } catch { return c.notFound(); }
}
files.get("/payments/*", authMiddleware, c => serve(c, true));
files.get("/general/*", authMiddleware, c => serve(c, true));
files.get("/qris/*", c => serve(c, false));
files.get("/logos/*", c => serve(c, false));
export default files;
