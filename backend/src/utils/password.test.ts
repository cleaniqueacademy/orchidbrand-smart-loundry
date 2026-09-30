import { describe, expect, it } from "bun:test";
import { generateRandomPassword } from "./password";

describe("generateRandomPassword utility", () => {
  it("should generate password with default length 10", () => {
    const pwd = generateRandomPassword();
    expect(pwd).toHaveLength(10);
  });

  it("should support custom length", () => {
    expect(generateRandomPassword(12)).toHaveLength(12);
    expect(generateRandomPassword(16)).toHaveLength(16);
    expect(generateRandomPassword(8)).toHaveLength(8);
  });

  it("should include uppercase, lowercase, and digits", () => {
    for (let i = 0; i < 20; i++) {
      const pwd = generateRandomPassword(10);
      expect(/[A-Z]/.test(pwd)).toBe(true);
      expect(/[a-z]/.test(pwd)).toBe(true);
      expect(/[0-9]/.test(pwd)).toBe(true);
    }
  });

  it("should produce unique/randomized values on successive invocations", () => {
    const set = new Set<string>();
    for (let i = 0; i < 50; i++) {
      set.add(generateRandomPassword(10));
    }
    // All 50 passwords should be distinct
    expect(set.size).toBe(50);
  });

  it("should include special characters when requested", () => {
    const pwd = generateRandomPassword(12, true);
    expect(pwd).toHaveLength(12);
    expect(/[!@#$%&*]/.test(pwd)).toBe(true);
  });
});
