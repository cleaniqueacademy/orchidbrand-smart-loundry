import { createHash } from "node:crypto";
import sharp from "sharp";
import jsQR from "jsqr";
import { parse, validate, staticToDynamic, renderQrToDataUrl } from "qris-saurus";

export class QrisCheckoutError extends Error {
  constructor(message: string, public readonly status: 404 | 409 | 422 = 422) { super(message); }
}

export function validateStaticQris(payload: string) {
  if (payload.length > 2048 || !validate(payload).valid) throw new QrisCheckoutError("QRIS platform tidak valid. Minta admin mengunggah QRIS merchant yang benar.");
  const nodes = parse(payload).nodes;
  const value = (id: string) => nodes.find(node => node.id === id)?.value;
  if (new Set(nodes.map(node => node.id)).size !== nodes.length || value("00") !== "01" || value("53") !== "360" || value("58") !== "ID" ||
      !nodes.some(node => Number(node.id) >= 26 && Number(node.id) <= 51) || !value("59")?.trim() ||
      (value("01") !== undefined && value("01") !== "11")) {
    throw new QrisCheckoutError("Gunakan QRIS statis merchant Indonesia dalam Rupiah, bukan QR dari transaksi lain.");
  }
  return { merchantName: value("59")!, merchantCity: value("60") || "" };
}

export async function decodeStaticQris(image: Buffer): Promise<string> {
  if (image.length === 0 || image.length > 5 * 1024 * 1024) throw new QrisCheckoutError("Ukuran gambar QRIS harus antara 1 byte dan 5 MB.");
  const png = image.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpg = image[0] === 255 && image[1] === 216 && image[2] === 255;
  const webp = image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP";
  if (!png && !jpg && !webp) throw new QrisCheckoutError("Gambar QRIS harus berupa PNG, JPG, atau WEBP.");
  try {
    const { data, info } = await sharp(image, { limitInputPixels: 12_000_000, animated: false, failOn: "error" })
      .rotate().resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .toColourspace("srgb").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height, { inversionAttempts: "attemptBoth" });
    if (!decoded?.data) throw new QrisCheckoutError("QR tidak terbaca. Unggah gambar QRIS yang tajam dan tidak terpotong melalui Setting Platform.");
    validateStaticQris(decoded.data);
    return decoded.data;
  } catch (error) {
    if (error instanceof QrisCheckoutError) throw error;
    throw new QrisCheckoutError("Gambar QRIS tidak dapat diproses. Unggah ulang gambar PNG, JPG, atau WEBP yang valid.");
  }
}

export interface QrisInvoice {
  id: string; finalAmount: number; status: string; expiresAt: string | null;
}
export function assertQrisInvoice(invoice: QrisInvoice, now = Date.now()) {
  if (!["unpaid", "rejected"].includes(invoice.status)) throw new QrisCheckoutError("Invoice ini tidak menunggu pembayaran. Periksa status tagihan.", 409);
  if (!invoice.expiresAt || !(Date.parse(invoice.expiresAt) > now)) throw new QrisCheckoutError("Invoice kedaluwarsa atau memerlukan review admin.", 409);
  if (!Number.isSafeInteger(invoice.finalAmount) || invoice.finalAmount <= 0) throw new QrisCheckoutError("Nominal invoice memerlukan pemeriksaan admin.", 409);
}

export async function generateInvoiceQris(invoice: QrisInvoice, staticPayload: string) {
  assertQrisInvoice(invoice);
  const merchant = validateStaticQris(staticPayload);
  // ASCII reference avoids SDK UTF-8 length ambiguity; it is not settlement evidence.
  const reference = `CL${createHash("sha256").update(invoice.id).digest("hex").slice(0, 23)}`;
  const payload = staticToDynamic(staticPayload, { amount: invoice.finalAmount, merchantRef: reference, tipType: "none" });
  if (!validate(payload).valid || parse(payload).nodes.find(node => node.id === "54")?.value !== invoice.finalAmount.toFixed(2)) {
    throw new QrisCheckoutError("QRIS tagihan gagal divalidasi. Hubungi admin.");
  }
  const qrImage = await renderQrToDataUrl(payload, { width: 480, margin: 4 });
  assertQrisInvoice(invoice);
  return { invoiceId: invoice.id, amount: invoice.finalAmount, currency: "IDR" as const, qrImage,
    reference, ...merchant, expiresAt: invoice.expiresAt, confirmation: "admin_verification" as const };
}
