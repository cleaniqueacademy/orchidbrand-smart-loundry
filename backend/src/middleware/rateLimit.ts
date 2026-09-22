import type { Context, Next } from "hono";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

interface RateLimitOptions {
  windowMs?: number; // Durasi jendela waktu dalam ms (default: 1 menit)
  max?: number; // Maksimal request dalam windowMs (default: 60)
  message?: string;
  keyGenerator?: (c: Context) => string;
}

/**
 * In-memory store untuk rate limiter.
 * Menggunakan cleanup otomatis berkala agar tidak memicu memory leak.
 */
const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup timer setiap 5 menit
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetTime <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export function rateLimit(options: RateLimitOptions = {}) {
  const windowMs = options.windowMs ?? 60 * 1000;
  const max = options.max ?? 60;
  const message =
    options.message ?? "Terlalu banyak permintaan, silakan coba lagi beberapa saat lagi.";

  return async (c: Context, next: Next) => {
    // Ekstraksi IP klien
    let ip =
      c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
      c.req.header("x-real-ip") ||
      c.req.header("cf-connecting-ip") ||
      "127.0.0.1";

    const key = options.keyGenerator
      ? options.keyGenerator(c)
      : `${ip}:${c.req.path}`;

    const now = Date.now();
    let record = rateLimitStore.get(key);

    if (!record || record.resetTime <= now) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    c.header("X-RateLimit-Limit", max.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", resetSeconds.toString());

    if (record.count > max) {
      c.header("Retry-After", resetSeconds.toString());
      return c.json(
        {
          success: false,
          message,
          retryAfterSeconds: resetSeconds,
        },
        429
      );
    }

    await next();
  };
}
