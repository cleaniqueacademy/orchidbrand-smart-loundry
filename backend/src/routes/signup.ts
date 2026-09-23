import { Hono } from "hono";
import { db } from "../db/index";
import { signupRequests, users, tenants } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import { rateLimit } from "../middleware/rateLimit";
import { authMiddleware, getUser } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { registerNewTenant, isEmailAvailable, isPhoneAvailable } from "../services/signupService";
import { validateCode } from "../services/referralService";

const signupRoutes = new Hono();

/**
 * 1. POST /api/public/signup (atau mounted di /api/signup)
 * Endpoint pendaftaran mandiri publik (diberi rate limiting 15 req/menit per IP)
 */
signupRoutes.post(
  "/",
  rateLimit({ max: 15, windowMs: 60 * 1000 }),
  async (c) => {
    try {
      const body = await c.req.json();
      const ipAddress = c.req.header("x-forwarded-for") || "unknown";
      const userAgent = c.req.header("user-agent") || "unknown";

      const res = await registerNewTenant({
        ...body,
        ipAddress,
        userAgent,
      });

      if (!res.success) {
        return c.json({ success: false, message: res.message }, 400);
      }

      return c.json({
        success: true,
        message: res.message,
        data: res.data,
      });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

/**
 * 2. GET /api/signup/check-email
 * Cek ketersediaan email saat user mengetik di form
 */
signupRoutes.get("/check-email", rateLimit({ max: 60, windowMs: 60 * 1000 }), async (c) => {
  try {
    const email = c.req.query("email");
    if (!email) {
      return c.json({ success: false, message: "Email diperlukan" }, 400);
    }

    const available = await isEmailAvailable(email);
    return c.json({
      success: true,
      available,
      message: available ? "Email tersedia" : "Email sudah terdaftar",
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 3. GET /api/signup/check-phone
 * Cek ketersediaan nomor HP
 */
signupRoutes.get("/check-phone", rateLimit({ max: 60, windowMs: 60 * 1000 }), async (c) => {
  try {
    const phone = c.req.query("phone");
    if (!phone) {
      return c.json({ success: false, message: "Nomor telepon diperlukan" }, 400);
    }

    const available = await isPhoneAvailable(phone);
    return c.json({
      success: true,
      available,
      message: available ? "Nomor telepon tersedia" : "Nomor telepon sudah terdaftar",
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 4. GET /api/signup/check-referral
 * Cek validitas kode referral secara realtime
 */
signupRoutes.get("/check-referral", rateLimit({ max: 60, windowMs: 60 * 1000 }), async (c) => {
  try {
    const code = c.req.query("code");
    if (!code) {
      return c.json({ success: false, message: "Kode referral diperlukan" }, 400);
    }

    const valRes = await validateCode(code);
    return c.json({
      success: true,
      valid: valRes.valid,
      message: valRes.message || (valRes.valid ? "Kode referral valid!" : "Kode referral tidak valid atau kedaluwarsa"),
      discountType: valRes.discountType,
      discountValue: valRes.discountValue,
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

/**
 * 4. GET /api/signup/requests
 * Daftar riwayat pendaftaran mandiri (Khusus Superadmin)
 */
signupRoutes.get(
  "/requests",
  authMiddleware,
  requireRole(["superadmin"]),
  async (c) => {
    try {
      const requests = await db
        .select()
        .from(signupRequests)
        .orderBy(desc(signupRequests.createdAt));

      return c.json({ success: true, data: requests });
    } catch (err: any) {
      return c.json({ success: false, message: err.message }, 500);
    }
  }
);

export default signupRoutes;
