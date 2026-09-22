import { describe, it, expect } from "bun:test";
import { signToken, verifyToken, authMiddleware, getUser } from "./auth";
import { Hono } from "hono";

describe("auth middleware & token helpers", () => {
  it("dapat membuat dan memverifikasi token HMAC yang valid", async () => {
    const payload = {
      userId: "user-test-01",
      role: "tenant_owner",
      tenantId: "tenant-test-01",
    };

    const token = await signToken(payload);
    expect(token).toBeDefined();
    expect(token.includes(".")).toBe(true);

    const verified = await verifyToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe("user-test-01");
    expect(verified?.role).toBe("tenant_owner");
    expect(verified?.tenantId).toBe("tenant-test-01");
    expect(verified?.exp).toBeGreaterThan(Date.now());
  });

  it("menolak token yang dimanipulasi (tampered payload)", async () => {
    const token = await signToken({
      userId: "user-normal",
      role: "staff",
      tenantId: "tenant-01",
    });

    const [encoded, sig] = token.split(".");
    // Manipulasi payload agar role berubah jadi superadmin
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    decoded.role = "superadmin";
    const tamperedEncoded = Buffer.from(JSON.stringify(decoded)).toString("base64url");
    const tamperedToken = `${tamperedEncoded}.${sig}`;

    const verified = await verifyToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it("menolak token yang dimanipulasi (tampered signature)", async () => {
    const token = await signToken({
      userId: "user-normal",
      role: "staff",
      tenantId: "tenant-01",
    });

    const [encoded] = token.split(".");
    const tamperedToken = `${encoded}.invalidsignature12345`;

    const verified = await verifyToken(tamperedToken);
    expect(verified).toBeNull();
  });

  it("menolak token yang telah kedaluwarsa", async () => {
    const expiredToken = await signToken({
      userId: "user-expired",
      role: "tenant_owner",
      tenantId: "tenant-01",
      exp: Date.now() - 1000, // 1 detik lalu
    });

    const verified = await verifyToken(expiredToken);
    expect(verified).toBeNull();
  });

  it("menolak format token yang tidak valid", async () => {
    expect(await verifyToken("randomstringwithoutdot")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("invalid.base64.dot.too.many")).toBeNull();
  });

  it("authMiddleware mengizinkan request dengan Bearer token yang sah", async () => {
    const app = new Hono();
    app.use("/protected/*", authMiddleware);
    app.get("/protected/me", (c) => {
      const user = getUser(c);
      return c.json({ success: true, user });
    });

    const validToken = await signToken({
      userId: "user-tester",
      role: "superadmin",
      tenantId: null,
    });

    const res = await app.request("/protected/me", {
      headers: {
        Authorization: `Bearer ${validToken}`,
      },
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.user.userId).toBe("user-tester");
    expect(body.user.role).toBe("superadmin");
  });

  it("authMiddleware mengembalikan 401 jika header Authorization tidak ada", async () => {
    const app = new Hono();
    app.use("/protected/*", authMiddleware);
    app.get("/protected/me", (c) => c.json({ ok: true }));

    const res = await app.request("/protected/me");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });
});
