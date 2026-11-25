import { z } from "zod";

export const planConfiguration = z.object({
  pricePerMonth: z.number().int().min(0).max(1000000000),
  maxBranches: z.number().int().min(1).max(5).default(1),
  maxStaff: z.number().int().min(0).max(1000).default(3),
  promotionAmount: z.number().int().min(0).default(0),
  promotionStartsAt: z.string().datetime({ offset: true }).nullable().default(null),
  promotionEndsAt: z.string().datetime({ offset: true }).nullable().default(null),
}).superRefine((value, ctx) => {
  if (value.promotionAmount > value.pricePerMonth) ctx.addIssue({ code: "custom", message: "Promo melebihi harga normal", path: ["promotionAmount"] });
  if (Boolean(value.promotionStartsAt) !== Boolean(value.promotionEndsAt) ||
      (value.promotionStartsAt && value.promotionEndsAt && Date.parse(value.promotionStartsAt) >= Date.parse(value.promotionEndsAt))) {
    ctx.addIssue({ code: "custom", message: "Isi awal dan akhir promo dengan akhir setelah awal", path: ["promotionEndsAt"] });
  }
});
