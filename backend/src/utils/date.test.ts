import { describe, it, expect } from "bun:test";
import { toDateOnly, addDays, daysBetween, daysRemaining, today } from "./date";

describe("date utility", () => {
  describe("toDateOnly", () => {
    it("mengonversi objek Date ke format YYYY-MM-DD", () => {
      const d = new Date("2026-05-15T10:30:00Z");
      expect(toDateOnly(d)).toBe("2026-05-15");
    });
  });

  describe("addDays", () => {
    it("menambah hari ke tanggal tertentu dengan benar", () => {
      const base = new Date("2026-01-01T00:00:00Z");
      expect(addDays(7, base)).toBe("2026-01-08");
    });

    it("menangani pergantian bulan dan tahun", () => {
      const base = new Date("2026-12-30T00:00:00Z");
      expect(addDays(5, base)).toBe("2027-01-04");
    });

    it("dapat mengurangi hari jika nilai negatif", () => {
      const base = new Date("2026-03-05T00:00:00Z");
      expect(addDays(-5, base)).toBe("2026-02-28");
    });

    it("menambahkan 0 hari mengembalikan tanggal yang sama", () => {
      const base = new Date("2026-07-20T00:00:00Z");
      expect(addDays(0, base)).toBe("2026-07-20");
    });
  });

  describe("daysBetween", () => {
    it("menghitung selisih hari antara dua string YYYY-MM-DD", () => {
      expect(daysBetween("2026-01-01", "2026-01-10")).toBe(9);
    });

    it("mengembalikan nilai negatif jika tanggal tujuan di masa lalu", () => {
      expect(daysBetween("2026-01-10", "2026-01-01")).toBe(-9);
    });

    it("mengembalikan 0 untuk tanggal yang sama", () => {
      expect(daysBetween("2026-05-01", "2026-05-01")).toBe(0);
    });

    it("dapat menerima objek Date maupun string ISO", () => {
      const d1 = new Date("2026-06-01T00:00:00");
      const d2 = new Date("2026-06-15T00:00:00");
      expect(daysBetween(d1, d2)).toBe(14);
      expect(daysBetween(d1, "2026-06-15")).toBe(14);
    });
  });

  describe("today & daysRemaining", () => {
    it("today() mengembalikan format YYYY-MM-DD yang sesuai hari ini", () => {
      const nowIso = new Date().toISOString().slice(0, 10);
      expect(today()).toBe(nowIso);
    });

    it("daysRemaining menghitung hari tersisa dari hari ini", () => {
      const futureDate = addDays(10);
      expect(daysRemaining(futureDate)).toBe(10);

      const pastDate = addDays(-3);
      expect(daysRemaining(pastDate)).toBe(-3);
    });
  });
});
