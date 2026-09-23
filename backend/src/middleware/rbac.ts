import type { Context, Next } from "hono";
import { getUser } from "./auth";

/**
 * Middleware untuk membatasi akses berdasarkan role pengguna.
 * Contoh: `requireRole(["superadmin"])`, `requireRole(["superadmin", "tenant_owner"])`
 */
export function requireRole(allowedRoles: string[]) {
  return async (c: Context, next: Next) => {
    const user = getUser(c);
    if (!user) {
      return c.json({ success: false, message: "Autentikasi diperlukan" }, 401);
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json(
        {
          success: false,
          message: `Akses ditolak. Role '${user.role === "staff" ? "Staff" : user.role}' tidak diizinkan untuk resource ini.`,
        },
        403
      );
    }

    await next();
  };
}

/**
 * Middleware untuk memvalidasi bahwa pengguna memiliki akses ke tenant tertentu.
 * - `superadmin`: selalu diizinkan.
 * - Role lain (`tenant_owner`, `staff`): hanya diizinkan jika `user.tenantId === targetTenantId`.
 *
 * @param getTenantId Fungsi pemetik tenantId dari Context (default: query/param/header tenantId)
 */
export function requireTenantAccess(
  getTenantId?: (c: Context) => string | undefined | null
) {
  return async (c: Context, next: Next) => {
    const user = getUser(c);
    if (!user) {
      return c.json({ success: false, message: "Autentikasi diperlukan" }, 401);
    }

    // Superadmin punya hak akses ke semua tenant
    if (user.role === "superadmin") {
      return await next();
    }

    // Ambil target tenantId dari custom extractor, atau fallback ke param/query/body
    let targetTenantId: string | undefined | null;
    if (getTenantId) {
      targetTenantId = getTenantId(c);
    } else {
      targetTenantId =
        c.req.param("tenantId") ??
        c.req.query("tenantId") ??
        c.req.header("x-tenant-id");
    }

    if (!targetTenantId) {
      // Jika endpoint tidak menspesifikasikan target spesifik, izinkan jika user punya tenantId
      if (user.tenantId) {
        return await next();
      }
      return c.json({ success: false, message: "ID Tenant diperlukan" }, 400);
    }

    if (user.tenantId !== targetTenantId) {
      return c.json(
        {
          success: false,
          message: "Akses ditolak: Anda tidak berhak mengakses data tenant lain",
        },
        403
      );
    }

    await next();
  };
}
