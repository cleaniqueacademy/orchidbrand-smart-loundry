import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { Hono } from "hono";
import uploadRoute from "./upload";
import { signToken } from "../middleware/auth";
import { getUploadsBaseDir } from "../services/storageService";
import path from "path";
import fs from "fs";

describe("Upload Route & Static Serving Tests", () => {
  let app: Hono;
  let validToken: string;
  const createdTestFiles: string[] = [];

  beforeAll(async () => {
    validToken = await signToken({
      userId: "test-user-1",
      email: "test@cleaniquelaundry.com",
      role: "tenant_owner",
      tenantId: "tenant-1",
    });

    app = new Hono();
    app.route("/api/upload", uploadRoute);

    // Static serving handler yang sama dengan di index.ts
    app.get("/uploads/*", async (c) => {
      const baseDir = getUploadsBaseDir();
      const relativePath = c.req.path.replace(/^\/uploads\//, "");
      const resolvedPath = path.resolve(baseDir, relativePath);

      if (!resolvedPath.startsWith(baseDir)) {
        return c.text("Forbidden", 403);
      }

      const file = Bun.file(resolvedPath);
      if (!(await file.exists())) {
        return c.text("Not Found", 404);
      }
      return new Response(file);
    });
  });

  afterAll(() => {
    for (const f of createdTestFiles) {
      try {
        if (fs.existsSync(f)) fs.unlinkSync(f);
      } catch {
        // ignore
      }
    }
  });

  it("gagal 401 jika request upload tanpa token otorisasi", async () => {
    const formData = new FormData();
    formData.append("file", new Blob(["test"], { type: "image/png" }), "test.png");

    const res = await app.request("/api/upload", {
      method: "POST",
      body: formData,
    });

    expect(res.status).toBe(401);
  });

  it("gagal 400 jika field file tidak disertakan", async () => {
    const formData = new FormData();
    formData.append("category", "payments");

    const res = await app.request("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: formData,
    });

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.message).toContain("file");
  });

  it("berhasil 201 upload gambar dengan token dan melayani file statis via GET /uploads/*", async () => {
    const formData = new FormData();
    const testContent = "PNG_DUMMY_IMAGE_CONTENT_123";
    formData.append("file", new Blob([testContent], { type: "image/png" }), "struk.png");
    formData.append("category", "payments");

    const res = await app.request("/api/upload", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
      body: formData,
    });

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.url).toMatch(/^\/uploads\/payments\/\d{4}-\d{2}\/.+\.png$/);
    expect(json.data.category).toBe("payments");

    // Catat file untuk dibersihkan
    const baseDir = getUploadsBaseDir();
    const filePath = path.resolve(baseDir, json.data.url.replace(/^\/uploads\//, ""));
    createdTestFiles.push(filePath);

    // Verifikasi dapat diakses via static serving
    const getRes = await app.request(json.data.url);
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("content-type")).toContain("image/png");
    const retrievedText = await getRes.text();
    expect(retrievedText).toBe(testContent);
  });

  it("menolak akses path traversal (../) pada /uploads/* (tidak boleh 200)", async () => {
    const res = await app.request("/uploads/../../package.json");
    expect([403, 404].includes(res.status)).toBe(true);
    expect(res.status).not.toBe(200);
  });

  it("mengembalikan 404 jika file tidak ada di folder upload", async () => {
    const res = await app.request("/uploads/payments/2026-10/non-existent-file-999.png");
    expect(res.status).toBe(404);
  });
});
