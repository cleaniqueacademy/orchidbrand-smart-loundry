import { describe, expect, test } from "bun:test";
import { calculateSubscriptionPrice } from "./subscriptionPricing";

const campaign = {
  pricePerMonth: 200000, promotionAmount: 50000,
  promotionStartsAt: "2026-11-01T00:00:00Z", promotionEndsAt: "2026-12-01T00:00:00Z",
  now: new Date("2026-11-13T00:00:00Z"),
};

describe("stacked subscription pricing", () => {
  test("applies referral to the promoted monthly price, then multiplies duration", () => {
    const price = calculateSubscriptionPrice({ ...campaign, durationMonths: 3, referral: { type: "percent", value: 10 } });
    expect(price.originalAmount).toBe(600000);
    expect(price.promotionDiscountAmount).toBe(150000);
    expect(price.referralDiscountAmount).toBe(45000);
    expect(price.finalAmount).toBe(405000);
  });
  test("fixed referral is per month and capped at the remaining price", () => {
    expect(calculateSubscriptionPrice({ ...campaign, referral: { type: "fixed", value: 10000 } }).finalPrice).toBe(140000);
    expect(calculateSubscriptionPrice({ ...campaign, referral: { type: "fixed", value: 300000 } }).finalPrice).toBe(0);
  });
  test("requires a complete active campaign and respects exclusive end", () => {
    expect(calculateSubscriptionPrice(campaign).finalPrice).toBe(150000);
    expect(calculateSubscriptionPrice({ ...campaign, now: new Date(campaign.promotionEndsAt) }).finalPrice).toBe(200000);
    expect(calculateSubscriptionPrice({ ...campaign, promotionStartsAt: null }).finalPrice).toBe(200000);
  });
  test("rejects invalid money, discount and duration", () => {
    for (const durationMonths of [0, -1, 1.5, 121, Infinity]) expect(() => calculateSubscriptionPrice({ ...campaign, durationMonths })).toThrow();
    expect(() => calculateSubscriptionPrice({ ...campaign, pricePerMonth: NaN })).toThrow();
    expect(() => calculateSubscriptionPrice({ ...campaign, referral: { type: "percent", value: 101 } })).toThrow();
  });
});
