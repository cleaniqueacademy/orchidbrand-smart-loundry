import { expect, test } from "bun:test";
import { planConfiguration } from "./planConfiguration";
test("campaign dates and quotas are validated before persistence", () => {
  expect(planConfiguration.safeParse({ pricePerMonth: 200000, promotionAmount: 50000, maxBranches: 5 }).success).toBe(true);
  expect(planConfiguration.safeParse({ pricePerMonth: 200000, maxBranches: 6 }).success).toBe(false);
  expect(planConfiguration.safeParse({ pricePerMonth: 200000, promotionAmount: 200001 }).success).toBe(false);
  expect(planConfiguration.safeParse({ pricePerMonth: 200000, promotionStartsAt: "2026-11-01T00:00:00Z" }).success).toBe(false);
  expect(planConfiguration.safeParse({ pricePerMonth: 200000, promotionStartsAt: "2026-12-01T00:00:00Z", promotionEndsAt: "2026-11-01T00:00:00Z" }).success).toBe(false);
});
