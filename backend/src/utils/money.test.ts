import { describe, it, expect } from "bun:test";
import { roundRupiah, applyDiscount, calculateCommission } from "./money";

describe("roundRupiah", () => {
  it("membulatkan ke bilangan bulat terdekat", () => {
    expect(roundRupiah(10500.7)).toBe(10501);
    expect(roundRupiah(10500.2)).toBe(10500);
  });

  it("nilai negatif dikembalikan sebagai 0", () => {
    expect(roundRupiah(-500)).toBe(0);
    expect(roundRupiah(-0.1)).toBe(0);
  });

  it("nilai 0 tetap 0", () => {
    expect(roundRupiah(0)).toBe(0);
  });
});

describe("applyDiscount — type percent", () => {
  it("diskon 10% dari 150.000 → diskon 15.000, final 135.000", () => {
    const result = applyDiscount(150_000, "percent", 10);
    expect(result.discountAmount).toBe(15_000);
    expect(result.finalPrice).toBe(135_000);
  });

  it("diskon 100% → final 0", () => {
    const result = applyDiscount(100_000, "percent", 100);
    expect(result.discountAmount).toBe(100_000);
    expect(result.finalPrice).toBe(0);
  });

  it("diskon > 100% dicap di 100%", () => {
    const result = applyDiscount(100_000, "percent", 150);
    expect(result.discountAmount).toBe(100_000);
    expect(result.finalPrice).toBe(0);
  });

  it("diskon 0% tidak mengubah harga", () => {
    const result = applyDiscount(100_000, "percent", 0);
    expect(result.discountAmount).toBe(0);
    expect(result.finalPrice).toBe(100_000);
  });

  it("diskon negatif tidak mengubah harga", () => {
    const result = applyDiscount(100_000, "percent", -5);
    expect(result.discountAmount).toBe(0);
    expect(result.finalPrice).toBe(100_000);
  });
});

describe("applyDiscount — type fixed", () => {
  it("diskon Rp20.000 dari Rp150.000 → final Rp130.000", () => {
    const result = applyDiscount(150_000, "fixed", 20_000);
    expect(result.discountAmount).toBe(20_000);
    expect(result.finalPrice).toBe(130_000);
  });

  it("diskon fixed tidak boleh melebihi harga dasar", () => {
    const result = applyDiscount(50_000, "fixed", 100_000);
    expect(result.discountAmount).toBe(50_000);
    expect(result.finalPrice).toBe(0);
  });
});

describe("calculateCommission — type percent", () => {
  it("komisi 5% dari pembayaran Rp150.000 → Rp7.500", () => {
    expect(calculateCommission(150_000, "percent", 5)).toBe(7_500);
  });

  it("komisi 0% → 0", () => {
    expect(calculateCommission(150_000, "percent", 0)).toBe(0);
  });

  it("komisi negatif → 0", () => {
    expect(calculateCommission(150_000, "percent", -10)).toBe(0);
  });
});

describe("calculateCommission — type fixed", () => {
  it("komisi fixed Rp25.000 → Rp25.000", () => {
    expect(calculateCommission(150_000, "fixed", 25_000)).toBe(25_000);
  });

  it("komisi fixed tidak boleh melebihi pembayaran", () => {
    expect(calculateCommission(10_000, "fixed", 50_000)).toBe(10_000);
  });
});
