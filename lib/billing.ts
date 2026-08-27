import type { BillingPeriod } from "@/lib/types";

export const BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];

export function isBillingPeriod(value: unknown): value is BillingPeriod {
  return value === "monthly" || value === "yearly";
}

export function costPerMonth(cost: number, billingPeriod: BillingPeriod): number {
  return billingPeriod === "yearly" ? cost / 12 : cost;
}
