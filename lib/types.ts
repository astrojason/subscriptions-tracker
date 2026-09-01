export type BillingPeriod = "monthly" | "yearly";

export type SubscriptionWithUsage = {
  id: string;
  userId: string;
  name: string;
  cost: number;
  billingPeriod: BillingPeriod;
  createdAt: string;
  usesThisMonth: number;
  /** Uses within the same trailing window "worth it" judges against (see worthItWindowStart), used for the "barely used" fallback so it doesn't reset every calendar month. */
  usesInWindow: number;
  /** Uses within the current billing cycle: this month for monthly plans, this year for yearly plans. */
  usesInPeriod: number;
  totalValue: number;
  hasValueData: boolean;
  perUseCost: number | null;
  /** `cost` normalized to a monthly figure, for cross-period comparisons. */
  costPerMonth: number;
  /** Whether logged value meets cost over the billing period (year for yearly plans), or null if no value has been logged in that period. */
  worthIt: boolean | null;
};

export type UsageEventDTO = {
  id: string;
  subscriptionId: string;
  usedAt: string;
  value: number | null;
  label: string | null;
};
