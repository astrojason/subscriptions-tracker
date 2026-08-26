export type SubscriptionWithUsage = {
  id: string;
  userId: string;
  name: string;
  monthlyCost: number;
  createdAt: string;
  usesThisMonth: number;
  totalValue: number;
  hasValueData: boolean;
  perUseCost: number | null;
};
