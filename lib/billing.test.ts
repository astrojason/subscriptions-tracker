import { describe, expect, it } from "vitest";
import {
  costForWorthItWindow,
  costPerMonth,
  eventsSince,
  isWorthIt,
  perUseCost,
  periodStart,
  rollingWindowStart,
  usesInWorthItWindow,
  worthItWindowStart,
} from "@/lib/billing";

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

describe("rollingWindowStart", () => {
  it("returns the 1st of the month 2 months back (a 3-month trailing window)", () => {
    const now = new Date(2026, 7, 27, 15, 30); // Aug 27 2026
    expect(rollingWindowStart(now)).toEqual(new Date(2026, 5, 1, 0, 0, 0, 0)); // Jun 1 2026
  });

  it("crosses into the previous year near the start of the year", () => {
    const now = new Date(2026, 1, 10); // Feb 10 2026
    expect(rollingWindowStart(now)).toEqual(new Date(2025, 11, 1, 0, 0, 0, 0)); // Dec 1 2025
  });
});

describe("worthItWindowStart", () => {
  it("uses the rolling 3-month window for monthly plans", () => {
    const now = new Date(2026, 7, 27);
    expect(worthItWindowStart("monthly", now)).toEqual(rollingWindowStart(now));
  });

  it("uses year-to-date for yearly plans, matching perUseCost's window", () => {
    const now = new Date(2026, 7, 27);
    expect(worthItWindowStart("yearly", now)).toEqual(periodStart("yearly", now));
  });
});

describe("eventsSince", () => {
  it("keeps only events on or after the window start", () => {
    const windowStart = new Date(2026, 5, 1);
    const inWindow = { usedAt: new Date(2026, 6, 15) };
    const beforeWindow = { usedAt: new Date(2026, 4, 10) };
    expect(eventsSince([inWindow, beforeWindow], windowStart)).toEqual([inWindow]);
  });
});

describe("costForWorthItWindow", () => {
  it("multiplies monthly cost by the rolling window length", () => {
    // A slow current month shouldn't sink a plan used well over the past
    // 3 months, so the cost compared against is 3 months' worth, not 1.
    expect(costForWorthItWindow(20, "monthly")).toBe(60);
  });

  it("uses the full cost as-is for yearly plans", () => {
    expect(costForWorthItWindow(224, "yearly")).toBe(224);
  });
});

describe("isWorthIt", () => {
  it("is true when logged value meets or exceeds the cost for the window", () => {
    // A $224/yr plan used enough this year to log $250 of value should be
    // "worth it" even if this calendar month alone logged nothing, because
    // the comparison spans the full year the cost covers.
    expect(isWorthIt(224, 250)).toBe(true);
    expect(isWorthIt(224, 224)).toBe(true);
  });

  it("is false when logged value falls short of the cost for the window", () => {
    expect(isWorthIt(224, 100)).toBe(false);
  });

  it("stays worth it through a slow month if the rolling window still clears cost", () => {
    // $20/mo plan, $60 logged over the 3-month window (e.g. $55 last month,
    // $5 this month) still clears the $60 window cost.
    expect(isWorthIt(costForWorthItWindow(20, "monthly"), 60)).toBe(true);
  });

  it("falls short once the rolling window's usage has actually dropped off", () => {
    // Same plan, but only $10 logged across the whole 3-month window.
    expect(isWorthIt(costForWorthItWindow(20, "monthly"), 10)).toBe(false);
  });
});

describe("usesInWorthItWindow", () => {
  it("still counts last month's uses on the 1st of a new month (monthly plan)", () => {
    // Heavy use in August shouldn't vanish the instant September starts —
    // the "worth it" window is a 3-month trailing window, not the
    // current calendar month.
    const now = new Date(2026, 8, 1); // Sep 1 2026
    const augustEvents = Array.from({ length: 20 }, (_, i) => ({
      usedAt: new Date(2026, 7, i + 1),
    }));
    expect(usesInWorthItWindow(augustEvents, "monthly", now)).toBe(20);
  });

  it("excludes uses from outside the trailing window", () => {
    const now = new Date(2026, 8, 1); // Sep 1 2026
    const tooOld = [{ usedAt: new Date(2026, 4, 15) }]; // May 2026, outside Jun 1-Sep 1 window
    expect(usesInWorthItWindow(tooOld, "monthly", now)).toBe(0);
  });

  it("uses year-to-date for yearly plans", () => {
    const now = new Date(2026, 8, 1); // Sep 1 2026
    const events = [{ usedAt: new Date(2026, 1, 10) }, { usedAt: new Date(2025, 11, 20) }];
    expect(usesInWorthItWindow(events, "yearly", now)).toBe(1);
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
