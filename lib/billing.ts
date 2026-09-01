import type { BillingPeriod } from "@/lib/types";

export const BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

export function costPerMonth(cost: number, billingPeriod: BillingPeriod): number {
  return billingPeriod === "yearly" ? cost / 12 : cost;
}

/**
 * Start of the current billing cycle: the 1st of the month for monthly
 * plans, Jan 1 for yearly plans. Used to scope "uses in period" so
 * per-use cost divides the actual amount paid by the uses that cost
 * covers, rather than mixing a monthly-equivalent cost with a
 * calendar-month use count for yearly plans.
 */
export function periodStart(billingPeriod: BillingPeriod, now: Date = new Date()): Date {
  const start = new Date(now);
  if (billingPeriod === "yearly") {
    start.setMonth(0, 1);
  } else {
    start.setDate(1);
  }
  start.setHours(0, 0, 0, 0);
  return start;
}

export function perUseCost(cost: number, usesInPeriod: number): number | null {
  return usesInPeriod > 0 ? cost / usesInPeriod : null;
}

export const WORTH_IT_ROLLING_MONTHS = 3;

/**
 * Start of the trailing window "worth it" judges monthly plans against: the
 * 1st of the month (WORTH_IT_ROLLING_MONTHS - 1) months back, so this month
 * plus the two before it. A strong recent month keeps a plan looking worth
 * it through one slow month, while a sustained drop-off in usage still
 * surfaces once it's dragged the whole window down.
 */
export function rollingWindowStart(now: Date = new Date()): Date {
  const start = new Date(now);
  start.setMonth(start.getMonth() - (WORTH_IT_ROLLING_MONTHS - 1), 1);
  start.setHours(0, 0, 0, 0);
  return start;
}

/**
 * Window "worth it" should judge logged value against: the rolling window
 * for monthly plans, year-to-date for yearly plans (matching perUseCost's
 * window, so a yearly plan isn't judged by a single slow month against a
 * whole year's cost).
 */
export function worthItWindowStart(billingPeriod: BillingPeriod, now: Date = new Date()): Date {
  return billingPeriod === "yearly" ? periodStart("yearly", now) : rollingWindowStart(now);
}

export function eventsSince<T extends { usedAt: Date }>(events: T[], windowStart: Date): T[] {
  return events.filter((event) => event.usedAt >= windowStart);
}

/**
 * Use count over the same trailing window "worth it" judges against, rather
 * than the raw calendar month. Used for the "barely used" fallback so it
 * doesn't reset to 0 the instant a new calendar month starts.
 */
export function usesInWorthItWindow<T extends { usedAt: Date }>(
  events: T[],
  billingPeriod: BillingPeriod,
  now: Date = new Date(),
): number {
  return eventsSince(events, worthItWindowStart(billingPeriod, now)).length;
}

/** The cost "worth it" compares logged value against, scaled to match worthItWindowStart's window. */
export function costForWorthItWindow(cost: number, billingPeriod: BillingPeriod): number {
  return billingPeriod === "yearly" ? cost : cost * WORTH_IT_ROLLING_MONTHS;
}

export function isWorthIt(costForWindow: number, valueInWindow: number): boolean {
  return valueInWindow >= costForWindow;
}
