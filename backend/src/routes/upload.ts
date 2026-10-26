import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth";
import { saveUploadedFile } from "../services/storageService";

const upload = new Hono();

/**
 * POST /api/upload
 * Endpoint upload file umum berbasis Local Storage
 * Wajib menggunakan Authorization Bearer token
 * Content-Type: multipart/form-data (field: 'file', opsional: 'category')
 */
upload.post("/", authMiddleware, async (c) => {
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

    if (!file || !(file instanceof File || file instanceof Blob)) {
      return c.json(
        {
          success: false,
          message: "Field 'file' wajib disertakan dengan file yang valid.",
        },
        400
      );
    }

    const saved = await saveUploadedFile(file, category);

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
