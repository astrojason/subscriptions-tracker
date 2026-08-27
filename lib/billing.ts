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
