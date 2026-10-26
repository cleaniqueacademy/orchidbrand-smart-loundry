import path from "path";
import fs from "fs";
import crypto from "crypto";

export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export const ALLOWED_CATEGORIES = ["payments", "qris", "logos", "general"] as const;
export type StorageCategory = (typeof ALLOWED_CATEGORIES)[number] | string;

export interface SavedFileResult {
  url: string;
  filename: string;
  category: string;
  size: number;
  mimeType: string;
  absolutePath: string;
}

/**
 * Mendapatkan direktori dasar penyimpanan upload secara andal
 * baik saat dijalankan dari root proyek maupun subfolder backend.
 */
export function getUploadsBaseDir(): string {
  if (process.env.UPLOADS_DIR) {
    return path.resolve(process.env.UPLOADS_DIR);
  }

  // Jika dijalankan dari subfolder backend di dev lokal
  if (
    path.basename(process.cwd()) === "backend" &&
    fs.existsSync(path.resolve(process.cwd(), "..", "package.json"))
  ) {
    return path.resolve(process.cwd(), "..", "data", "uploads");
  }

  return path.resolve(process.cwd(), "data", "uploads");
}

/**
 * Validasi dan sanitasi kategori upload
 */
export function sanitizeCategory(category?: string | null): string {
  if (!category || typeof category !== "string") {
    return "general";
  }
  const cleaned = category.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
  return cleaned || "general";
}

/**
 * Menyimpan file yang diunggah ke local storage
 */
export async function saveUploadedFile(
  file: File | Blob,
  categoryInput?: string | null
): Promise<SavedFileResult> {
  if (!file) {
    throw new Error("File tidak ditemukan dalam request.");
  }

  // 1. Validasi Ukuran File (Maksimal 5MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error("Ukuran file melebihi batas maksimal 5 MB.");
  }
  if (file.size === 0) {
    throw new Error("File tidak boleh kosong (0 bytes).");
  }

  // 2. Validasi MIME Type
  const mimeType = file.type?.toLowerCase();
  const allowedExt = ALLOWED_MIME_TYPES[mimeType];
  if (!allowedExt) {
    const supportedList = Object.keys(ALLOWED_MIME_TYPES).join(", ");
    throw new Error(
      `Format file '${mimeType || "tidak diketahui"}' tidak didukung. Format yang diizinkan: JPG, PNG, WEBP, PDF.`
    );
  }

  // 3. Persiapkan Struktur Folder: data/uploads/{category}/{YYYY-MM}/
  const category = sanitizeCategory(categoryInput);
  const yearMonth = new Date().toISOString().slice(0, 7); // e.g. "2026-10"
  const baseDir = getUploadsBaseDir();
  const targetDir = path.join(baseDir, category, yearMonth);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 4. Generate Nama File Unik Berbasis UUID v4
  const filename = `${crypto.randomUUID()}${allowedExt}`;
  const targetFilePath = path.join(targetDir, filename);

  // 5. Tulis File ke Disk Server
  const arrayBuffer = await file.arrayBuffer();
  await Bun.write(targetFilePath, arrayBuffer);

  const url = `/uploads/${category}/${yearMonth}/${filename}`;

  return {
    url,
    filename,
    category,
    size: file.size,
    mimeType,
    absolutePath: targetFilePath,
  };
}
