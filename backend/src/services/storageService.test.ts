import { describe, it, expect, afterAll } from "bun:test";
import {
  saveUploadedFile,
  sanitizeCategory,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  getUploadsBaseDir,
} from "./storageService";
import fs from "fs";
import path from "path";

describe("Storage Service - Local Storage Backend", () => {
  const createdFiles: string[] = [];

  afterAll(() => {
    // Bersihkan file testing yang dibuat
    for (const filePath of createdFiles) {
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch {
        // ignore
      }
    }
  });

  it("sanitizeCategory mengembalikan 'general' jika input kosong atau null", () => {
    expect(sanitizeCategory(null)).toBe("general");
    expect(sanitizeCategory(undefined)).toBe("general");
    expect(sanitizeCategory("")).toBe("general");
    expect(sanitizeCategory("   ")).toBe("general");
  });

  it("sanitizeCategory membersihkan karakter berbahaya", () => {
    expect(sanitizeCategory("../../payments")).toBe("payments");
    expect(sanitizeCategory("QRIS & Rekening")).toBe("qrisrekening");
  });

  it("berhasil menyimpan file gambar PNG dengan kategori 'payments'", async () => {
    const dummyBlob = new Blob(["dummy png data content"], { type: "image/png" });
    const file = new File([dummyBlob], "bukti.png", { type: "image/png" });

    const result = await saveUploadedFile(file, "payments");
    createdFiles.push(result.absolutePath);

    expect(result.url).toMatch(/^\/uploads\/payments\/\d{4}-\d{2}\/[a-f0-9-]+\.png$/);
    expect(result.category).toBe("payments");
    expect(result.mimeType).toBe("image/png");
    expect(result.size).toBe(file.size);
    expect(fs.existsSync(result.absolutePath)).toBe(true);

    const content = await Bun.file(result.absolutePath).text();
    expect(content).toBe("dummy png data content");
  });

  it("berhasil menyimpan file dokumen PDF", async () => {
    const dummyBlob = new Blob(["%PDF-1.4 dummy content"], { type: "application/pdf" });
    const file = new File([dummyBlob], "dokumen.pdf", { type: "application/pdf" });

    const result = await saveUploadedFile(file, "qris");
    createdFiles.push(result.absolutePath);

    expect(result.url).toMatch(/^\/uploads\/qris\/\d{4}-\d{2}\/[a-f0-9-]+\.pdf$/);
    expect(result.category).toBe("qris");
    expect(result.mimeType).toBe("application/pdf");
    expect(fs.existsSync(result.absolutePath)).toBe(true);
  });

  it("menolak file dengan ukuran melebihi 5 MB", async () => {
    const largeBlob = new Blob([new Uint8Array(MAX_FILE_SIZE_BYTES + 10)], { type: "image/jpeg" });
    const file = new File([largeBlob], "large.jpg", { type: "image/jpeg" });

    expect(saveUploadedFile(file, "payments")).rejects.toThrow("Ukuran file melebihi batas maksimal 5 MB");
  });

  it("menolak file kosong (0 bytes)", async () => {
    const emptyBlob = new Blob([], { type: "image/jpeg" });
    const file = new File([emptyBlob], "empty.jpg", { type: "image/jpeg" });

    expect(saveUploadedFile(file, "payments")).rejects.toThrow("File tidak boleh kosong");
  });

  it("menolak tipe file yang tidak diizinkan (misal .exe atau .txt)", async () => {
    const scriptBlob = new Blob(["malicious code"], { type: "application/x-msdownload" });
    const file = new File([scriptBlob], "virus.exe", { type: "application/x-msdownload" });

    expect(saveUploadedFile(file, "payments")).rejects.toThrow("Format file");
  });
});
