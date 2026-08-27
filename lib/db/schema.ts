import { sqliteTable, text, real, integer, index } from "drizzle-orm/sqlite-core";

export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    cost: real("cost").notNull(),
    billingPeriod: text("billing_period", { enum: ["monthly", "yearly"] })
      .notNull()
      .default("monthly"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
  }),
);

export const usageEvents = sqliteTable(
  "usage_events",
  {
    id: text("id").primaryKey(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => subscriptions.id, { onDelete: "cascade" }),
    usedAt: integer("used_at", { mode: "timestamp" }).notNull(),
    value: real("value"),
  },
  (table) => ({
    subscriptionUsedAtIdx: index("usage_events_subscription_id_used_at_idx").on(
      table.subscriptionId,
      table.usedAt,
    ),
  }),
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type UsageEvent = typeof usageEvents.$inferSelect;
export type NewUsageEvent = typeof usageEvents.$inferInsert;
