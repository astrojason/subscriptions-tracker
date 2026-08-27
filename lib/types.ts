export type BillingPeriod = "monthly" | "yearly";

export type SubscriptionWithUsage = {
  id: string;
  userId: string;
  name: string;
  cost: number;
  billingPeriod: BillingPeriod;
  createdAt: string;
  usesThisMonth: number;
  totalValue: number;
  hasValueData: boolean;
  perUseCost: number | null;
  /** `cost` normalized to a monthly figure, for cross-period comparisons. */
  costPerMonth: number;
};
