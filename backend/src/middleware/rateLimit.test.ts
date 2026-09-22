import { describe, it, expect } from "bun:test";
import { Hono } from "hono";
import { rateLimit } from "./rateLimit";

describe("rateLimit middleware", () => {
  it("mengizinkan request dalam batas maksimum", async () => {
    const app = new Hono();
    app.use(
      "/limited",
      rateLimit({
        max: 3,
        windowMs: 10000,
        keyGenerator: () => "test-ip-1",
      })
    );
    app.get("/limited", (c) => c.json({ success: true }));

    const res1 = await app.request("/limited");
    expect(res1.status).toBe(200);
    expect(res1.headers.get("X-RateLimit-Limit")).toBe("3");
    expect(res1.headers.get("X-RateLimit-Remaining")).toBe("2");

    const res2 = await app.request("/limited");
    expect(res2.status).toBe(200);
    expect(res2.headers.get("X-RateLimit-Remaining")).toBe("1");

    const res3 = await app.request("/limited");
    expect(res3.status).toBe(200);
    expect(res3.headers.get("X-RateLimit-Remaining")).toBe("0");
  });

  it("mengembalikan 429 saat batas terlampaui", async () => {
    const app = new Hono();
    app.use(
      "/limited",
      rateLimit({
        max: 2,
        windowMs: 10000,
        keyGenerator: () => "test-ip-2",
      })
    );
    app.get("/limited", (c) => c.json({ success: true }));

    await app.request("/limited"); // req 1
    await app.request("/limited"); // req 2
    const res3 = await app.request("/limited"); // req 3 (over limit)

    expect(res3.status).toBe(429);
    const body = await res3.json();
    expect(body.success).toBe(false);
    expect(res3.headers.get("Retry-After")).toBeDefined();
  });
});
