import { describe, it, expect } from "bun:test";
import { newId } from "./id";

describe("newId utility", () => {
  it("menghasilkan ID dengan prefix yang sesuai", () => {
    const id = newId("tenant");
    expect(id.startsWith("tenant-")).toBe(true);
  });

  it("memiliki format {prefix}-{timestamp}-{random5}", () => {
    const id = newId("ref");
    const parts = id.split("-");
    expect(parts.length).toBe(3);
    expect(parts[0]).toBe("ref");
    // Timestamp base-36 biasanya 7-9 karakter
    expect(parts[1].length).toBeGreaterThanOrEqual(6);
    // Random 5 karakter base-36
    expect(parts[2].length).toBe(5);
  });

  it("menghasilkan ID yang unik (1000 ID tanpa tabrakan)", () => {
    const set = new Set<string>();
    const count = 1000;
    for (let i = 0; i < count; i++) {
      const id = newId("test");
      set.add(id);
    }
    expect(set.size).toBe(count);
  });
});
