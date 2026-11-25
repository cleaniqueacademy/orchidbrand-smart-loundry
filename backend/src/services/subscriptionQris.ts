import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "../db";
import { paymentAttempts, platformSettings, storedFiles, subscriptionInvoices, tenants, users } from "../db/schema";
import { getUploadsBaseDir } from "./storageService";
import { assertQrisInvoice, decodeStaticQris, generateInvoiceQris, QrisCheckoutError } from "./qrisPayload";
import { blockingOwnerInvoice, expireOwnerInvoices, invoiceEvent, lockBillingOwner } from "./invoiceLifecycle";

const backendRoot = fileURLToPath(new URL("../../", import.meta.url));
const decodedFiles = new Map<string, Promise<string>>();

/** Only configured local files: no remote fetch, traversal, or implicit merchant fallback. */
export async function loadPlatformQris(source: string | null | undefined): Promise<string> {
  if (!source) throw new QrisCheckoutError("QRIS belum dikonfigurasi. Hubungi admin atau gunakan transfer bank.");
  let root: string;
  let relative: string;
  if (source === "/qris.png") {
    root = process.env.NODE_ENV === "production" ? path.join(backendRoot, "assets") : path.join(backendRoot, "..", "frontend", "public");
    relative = "qris.png";
  } else if (/^\/uploads\/qris\/\d{4}-\d{2}\/[a-f0-9-]+\.(png|jpg|webp)$/.test(source)) {
    const [record] = await db.select().from(storedFiles).where(eq(storedFiles.path, source));
    if (!record || record.quarantined || record.category !== "qris") throw new QrisCheckoutError("Berkas QRIS belum terdaftar. Minta admin mengunggah ulang QRIS platform.");
    root = getUploadsBaseDir(); relative = source.slice("/uploads/".length);
  } else {
    throw new QrisCheckoutError("Untuk membuat QR bernominal, admin perlu mengunggah gambar QRIS langsung. Tautan gambar eksternal tidak didukung.");
  }
  try {
    const realRoot = await fs.realpath(root);
    const actual = await fs.realpath(path.join(realRoot, relative));
    const within = path.relative(realRoot, actual);
    if (within.startsWith("..") || path.isAbsolute(within)) throw new QrisCheckoutError("Lokasi berkas QRIS tidak diizinkan.");
    const stat = await fs.stat(actual);
    if (!stat.isFile() || stat.size === 0 || stat.size > 5 * 1024 * 1024) throw new QrisCheckoutError("Ukuran berkas QRIS tidak valid.");
    const key = `${actual}:${stat.mtimeMs}:${stat.size}`;
    let pending = decodedFiles.get(key);
    if (!pending) {
      if (decodedFiles.size >= 8) decodedFiles.delete(decodedFiles.keys().next().value!);
      pending = fs.readFile(actual).then(decodeStaticQris);
      decodedFiles.set(key, pending);
      void pending.catch(() => { decodedFiles.delete(key); });
    }
    return await pending;
  } catch (error) {
    if (error instanceof QrisCheckoutError) throw error;
    throw new QrisCheckoutError("Berkas QRIS tidak tersedia. Minta admin mengunggah ulang QRIS platform.");
  }
}

export async function checkoutSubscriptionQris(invoiceId: string, actorId: string, isAdmin: boolean) {
  const [invoice] = await db.select().from(subscriptionInvoices).where(and(eq(subscriptionInvoices.id, invoiceId), isAdmin ? undefined : eq(subscriptionInvoices.userId, actorId)));
  if (!invoice) throw new QrisCheckoutError("Invoice tidak ditemukan atau akses ditolak.", 404);
  await expireOwnerInvoices(invoice.userId);
  assertQrisInvoice(invoice);
  const [owner] = await db.select().from(users).where(eq(users.id, invoice.userId));
  const [branch] = await db.select().from(tenants).where(eq(tenants.id, invoice.tenantId));
  if (!owner || owner.archivedAt || owner.suspendedAt || owner.status !== "active" || !branch || branch.userId !== owner.id || branch.archivedAt || branch.suspendedAt || branch.status !== "active") {
    throw new QrisCheckoutError("Penerima langganan memerlukan pemeriksaan admin.", 409);
  }
  const [openGateway] = await db.select({ id: paymentAttempts.id }).from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoiceId), inArray(paymentAttempts.status, ["creating", "pending"])));
  if (openGateway) throw new QrisCheckoutError("Masih ada pembayaran online yang belum selesai. Periksa status pembayaran tersebut sebelum menggunakan QRIS.", 409);
  const [settings] = await db.select({ qrisInfo: platformSettings.qrisInfo }).from(platformSettings).limit(1);
  const payload = await loadPlatformQris(settings?.qrisInfo);
  const result = await db.transaction(async tx => {
    await lockBillingOwner(tx, invoice.userId);
    const [current] = await tx.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id, invoiceId)).for("update");
    if (!current || current.userId !== invoice.userId || current.finalAmount !== invoice.finalAmount) throw new QrisCheckoutError("Invoice berubah. Muat ulang tagihan.", 409);
    const blocker = await blockingOwnerInvoice(tx, current.userId);
    if (blocker && blocker.id !== current.id) throw new QrisCheckoutError("Tagihan lain memerlukan pemeriksaan admin. Jangan membayar ulang.", 409);
    const [pending] = await tx.select().from(paymentAttempts).where(and(eq(paymentAttempts.invoiceId, invoiceId), inArray(paymentAttempts.status, ["creating", "pending"])));
    if (pending) throw new QrisCheckoutError("Pembayaran online masih diproses. Periksa status sebelum memakai QRIS.", 409);
    const generated = await generateInvoiceQris(current, payload);
    if (!current.qrisIssuedAt) {
      await tx.update(subscriptionInvoices).set({ qrisIssuedAt: new Date().toISOString() }).where(eq(subscriptionInvoices.id, current.id));
      await invoiceEvent(tx, current.id, "qris_issued", actorId, { amount: generated.amount, reference: generated.reference }, `qris:${current.id}`);
    }
    return generated;
  });
  console.info("[subscription-qris] generated", { invoiceId, actorId, amount: result.amount });
  return result;
}
