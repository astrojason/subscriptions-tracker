export type BillingPeriod = "monthly" | "yearly";

export type SubscriptionWithUsage = {
  id: string;
  userId: string;
  name: string;
  cost: number;
  billingPeriod: BillingPeriod;
  createdAt: string;
  usesThisMonth: number;
  /** Uses within the current billing cycle: this month for monthly plans, this year for yearly plans. */
  usesInPeriod: number;
  totalValue: number;
  hasValueData: boolean;
  perUseCost: number | null;
  /** `cost` normalized to a monthly figure, for cross-period comparisons. */
  costPerMonth: number;
};

export type UsageEventDTO = {
  id: string;
  subscriptionId: string;
  usedAt: string;
  value: number | null;
  label: string | null;
};
