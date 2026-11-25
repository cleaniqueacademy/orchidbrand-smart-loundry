import { describe, expect, test } from "bun:test";
import fs from "node:fs/promises";
import QRCode from "qrcode";
import sharp from "sharp";
import jsQR from "jsqr";
import { computeCrc, parse, validate } from "qris-saurus";
import { assertQrisInvoice, decodeStaticQris, generateInvoiceQris, validateStaticQris } from "./qrisPayload";

const tlv = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;
const body = tlv("00", "01") + tlv("01", "11") + tlv("26", tlv("00", "ID.CO.QRIS.WWW") + tlv("01", "FIXTURE-MERCHANT")) +
  tlv("52", "5812") + tlv("53", "360") + tlv("58", "ID") + tlv("59", "MERCHANT TEST") + tlv("60", "JAKARTA");
const fixture = body + "6304" + computeCrc(body + "6304");
const invoice = { id: "invoice-test-1", finalAmount: 60000, status: "unpaid", expiresAt: new Date(Date.now() + 3600000).toISOString() };

describe("QRIS Saurus invoice generation", () => {
  test("renders a decodable QR with invoice amount and preserved merchant", async () => {
    const result = await generateInvoiceQris(invoice, fixture);
    const bytes = Buffer.from(result.qrImage.split(",")[1], "base64");
    const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const qr = jsQR(new Uint8ClampedArray(data), info.width, info.height)!;
    expect(validate(qr.data).valid).toBe(true);
    const nodes = parse(qr.data).nodes;
    expect(nodes.find(n => n.id === "54")?.value).toBe("60000.00");
    expect(nodes.find(n => n.id === "01")?.value).toBe("12");
    expect(nodes.find(n => n.id === "26")?.value).toBe(parse(fixture).nodes.find(n => n.id === "26")?.value);
    expect(nodes.find(n => n.id === "59")?.value).toBe("MERCHANT TEST");
    expect(result.confirmation).toBe("admin_verification");
    expect(invoice.status).toBe("unpaid");
  });
  test("different invoices receive different ASCII references", async () => {
    const a = await generateInvoiceQris(invoice, fixture);
    const b = await generateInvoiceQris({ ...invoice, id: "other", finalAmount: 150000 }, fixture);
    expect(a.reference).not.toBe(b.reference);
    expect(a.reference).toMatch(/^[A-Z0-9a-f]{25}$/);
    expect(b.amount).toBe(150000);
  });
  test("rejects tampered CRC and non-QR input", () => {
    expect(() => validateStaticQris(fixture.slice(0, -4) + "FFFF")).toThrow();
    expect(() => validateStaticQris("https://example.invalid")).toThrow();
  });
  test("rejects paid, pending verification, zero, fractional and expired invoices", () => {
    for (const update of [{ status: "paid" }, { status: "pending_verification" }, { finalAmount: 0 }, { finalAmount: 10.2 }, { expiresAt: null }, { expiresAt: "invalid" }, { expiresAt: "2020-01-01" }]) {
      expect(() => assertQrisInvoice({ ...invoice, ...update })).toThrow();
    }
  });
  test("does not reuse an already dynamic QR", async () => {
    const result = await generateInvoiceQris(invoice, fixture);
    const { data, info } = await sharp(Buffer.from(result.qrImage.split(",")[1], "base64")).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    expect(() => validateStaticQris(jsQR(new Uint8ClampedArray(data), info.width, info.height)!.data)).toThrow("QRIS statis");
  });
  for (const format of ["png", "jpeg", "webp"] as const) test(`reads uploaded ${format} QR images`, async () => {
    const image = await QRCode.toBuffer(fixture, { width: 400, margin: 4 });
    expect(await decodeStaticQris(await sharp(image)[format]().toBuffer())).toBe(fixture);
  });
  test("reads the existing configured /qris.png asset without logging its payload", async () => {
    const source = await fs.readFile(new URL("../../../frontend/public/qris.png", import.meta.url));
    const payload = await decodeStaticQris(source);
    expect(validateStaticQris(payload).merchantName.length).toBeGreaterThan(0);
    const result = await generateInvoiceQris(invoice, payload);
    expect(result.amount).toBe(60000);
    expect(result.qrImage.startsWith("data:image/png;base64,")).toBe(true);
  });
  test("rejects oversized, empty and corrupt uploads", async () => {
    for (const data of [Buffer.alloc(0), Buffer.alloc(5 * 1024 * 1024 + 1), Buffer.from("not an image")]) await expect(decodeStaticQris(data)).rejects.toThrow();
  });
});
