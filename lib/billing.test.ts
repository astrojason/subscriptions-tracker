import { describe, expect, it } from "vitest";
import { costPerMonth, perUseCost, periodStart } from "@/lib/billing";

describe("costPerMonth", () => {
  it("returns cost as-is for monthly billing", () => {
    expect(costPerMonth(20, "monthly")).toBe(20);
  });

  it("divides yearly cost by 12", () => {
    expect(costPerMonth(224, "yearly")).toBeCloseTo(18.6667, 3);
  });
});

describe("perUseCost", () => {
  it("divides the actual monthly cost by uses this month for monthly plans", () => {
    expect(perUseCost(20, 4)).toBe(5);
  });

  it("divides the actual yearly cost by uses so far this year for yearly plans", () => {
    // A $224/yr subscription used 10 times this year should read $22.40/use,
    // not the monthly-equivalent cost ($18.67) divided by 10 ($1.87/use).
    expect(perUseCost(224, 10)).toBeCloseTo(22.4, 5);
  });

  it("returns null when there are no uses", () => {
    expect(perUseCost(224, 0)).toBeNull();
  });
});

describe("periodStart", () => {
  it("returns the first of the current month for monthly billing", () => {
    const now = new Date(2026, 7, 27, 15, 30); // Aug 27 2026, 3:30pm
    const start = periodStart("monthly", now);
    expect(start).toEqual(new Date(2026, 7, 1, 0, 0, 0, 0));
  });

  it("returns Jan 1 of the current year for yearly billing", () => {
    const now = new Date(2026, 7, 27, 15, 30);
    const start = periodStart("yearly", now);
    expect(start).toEqual(new Date(2026, 0, 1, 0, 0, 0, 0));
  });
});
