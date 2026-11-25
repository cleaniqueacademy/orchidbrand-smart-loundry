import { afterAll, afterEach, beforeAll, describe, expect, it, spyOn } from "bun:test";
import { api, fetchApi, authHeaders } from "./api";

const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
beforeAll(() => {
  Object.defineProperty(globalThis, "document", { configurable: true, value: { cookie: "" } });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => null } });
});
afterAll(() => {
  for (const [key, descriptor] of [["document", originalDocument], ["localStorage", originalStorage]] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});
afterEach(() => { fetchMock?.mockRestore(); });
let fetchMock: ReturnType<typeof spyOn<typeof globalThis, "fetch">> | undefined;
function respond(body: string, status: number) {
  fetchMock = spyOn(globalThis, "fetch").mockResolvedValue(new Response(body, { status }));
}

describe("API responses when the backend/proxy is unavailable", () => {
  it("reports an empty proxy 500 as service unavailable instead of a JSON parse error", async () => {
    respond("", 500);
    await expect(api.get("/api/platform/cashflow")).rejects.toThrow("Layanan server tidak tersedia (HTTP 500)");
  });
  it("does not expose an HTML gateway error to the user", async () => {
    respond("<html>private upstream details</html>", 502);
    await expect(api.post("/api/platform/cashflow", {})).rejects.toThrow("Layanan server tidak tersedia (HTTP 502)");
  });
  it("rejects truncated successful JSON without leaking parser details", async () => {
    respond('{"success":', 200);
    await expect(api.get("/api/platform/cashflow")).rejects.toThrow("Respons server tidak valid");
  });
  it("preserves a valid API failure envelope for existing callers", async () => {
    respond('{"success":false,"message":"Akses ditolak"}', 403);
    expect(await api.delete("/api/platform/cashflow/one")).toEqual({ success: false, message: "Akses ditolak" });
  });
  it("preserves successful records and summary", async () => {
    const body = { success: true, data: { records: [{ id: "one", amount: 150000 }], summary: { totalIncome: 150000 } } };
    respond(JSON.stringify(body), 200);
    expect(await api.get("/api/platform/cashflow")).toEqual(body);
  });
  it("returns the same actionable failure through fetchApi", async () => {
    respond("", 503);
    const result = await fetchApi("/api/platform/cashflow");
    expect(result.success).toBe(false);
    expect(result.message).toContain("Layanan server tidak tersedia (HTTP 503)");
  });
});

describe("authHeaders utility", () => {
  it("extracts csrf token from cookie and sends X-CSRF-Token", () => {
    globalThis.document.cookie = "cleanique_csrf=test-token-123";
    const headers = authHeaders();
    expect(headers["X-CSRF-Token"]).toBe("test-token-123");
    globalThis.document.cookie = "";
  });

  it("extracts __Host-cleanique_csrf from cookie for production mode", () => {
    globalThis.document.cookie = "__Host-cleanique_csrf=prod-token-456";
    const headers = authHeaders();
    expect(headers["X-CSRF-Token"]).toBe("prod-token-456");
    globalThis.document.cookie = "";
  });
});
