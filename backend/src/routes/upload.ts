import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { db } from "../db";
import { storedFiles, users } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireRole } from "../middleware/rbac";
import { authMiddleware, getUser } from "../middleware/auth";
import { saveUploadedFile } from "../services/storageService";

const upload = new Hono();

/**
 * POST /api/upload
 * Endpoint upload file umum berbasis Local Storage
 * Wajib menggunakan Authorization Bearer token
 * Content-Type: multipart/form-data (field: 'file', opsional: 'category')
 */
upload.post("/", bodyLimit({ maxSize: 6 * 1024 * 1024 }), authMiddleware, requireRole(["tenant_owner", "superadmin"]), async (c) => {
  try {
    const contentType = c.req.header("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return c.json(
        {
          success: false,
          message: "Content-Type request harus multipart/form-data.",
        },
        400
      );
    }

    const body = await c.req.parseBody();
    const file = body["file"];
    const category = typeof body["category"] === "string" ? body["category"] : "general";

    if (!file || !(file instanceof File)) {
      return c.json(
        {
          success: false,
          message: "Field 'file' wajib disertakan dengan file yang valid.",
        },
        400
      );
    }

    const actor = getUser(c);
    const [owner] = await db.select().from(users).where(eq(users.id, actor.userId));
    if (actor.role !== "superadmin" && category !== "payments" && (!owner?.subscriptionUntil || owner.subscriptionUntil < new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date()))) {
      return c.json({ success: false, message: "Langganan aktif diperlukan" }, 403);
    }
    const saved = await saveUploadedFile(file, category);
    await db.insert(storedFiles).values({ path: saved.url, ownerId: actor.userId, category: saved.category, mimeType: saved.mimeType });

    return c.json(
      {
        success: true,
        message: "File berhasil diunggah.",
        data: {
          url: saved.url,
          filename: saved.filename,
          category: saved.category,
          size: saved.size,
          mimeType: saved.mimeType,
        },
      },
      201
    );
  } catch (error: any) {
    return c.json(
      {
        success: false,
        message: error.message || "Gagal mengunggah file.",
      },
      400
    );
  }
});

export default upload;
