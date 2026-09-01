import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@/lib/db";
import { getUserId } from "@/lib/auth-server";
import {
  costForWorthItWindow,
  costPerMonth,
  eventsSince,
  isBillingPeriod,
  isWorthIt,
  perUseCost,
  periodStart,
  worthItWindowStart,
} from "@/lib/billing";

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

  const startOfMonth = periodStart("monthly");
  const startOfYear = periodStart("yearly");

  const withUsage = await Promise.all(
    subs.map(async (sub) => {
      // Fetch since whichever window starts earlier: the year (for yearly
      // plans' per-use cost) or the rolling "worth it" window (for monthly
      // plans, which can dip into the previous year in Jan/Feb).
      const windowStart = worthItWindowStart(sub.billingPeriod);
      const fetchFloor = windowStart < startOfYear ? windowStart : startOfYear;
      const events = await db
        .select()
        .from(usageEvents)
        .where(and(eq(usageEvents.subscriptionId, sub.id), gte(usageEvents.usedAt, fetchFloor)));

      const monthEvents = eventsSince(events, startOfMonth);
      const usesThisMonth = monthEvents.length;
      const usesInPeriod =
        sub.billingPeriod === "yearly" ? eventsSince(events, startOfYear).length : usesThisMonth;
      const totalValue = monthEvents.reduce((sum, event) => sum + (event.value ?? 0), 0);
      const hasValueData = monthEvents.some((event) => event.value != null);
      const monthlyEquivalent = costPerMonth(sub.cost, sub.billingPeriod);

      // "Worth it" compares logged value against a rolling multi-month
      // window for monthly plans (so one slow month doesn't sink a plan
      // used well recently) and year-to-date for yearly plans.
      const windowEvents = eventsSince(events, windowStart);
      const windowTotalValue = windowEvents.reduce((sum, event) => sum + (event.value ?? 0), 0);
      const windowHasValueData = windowEvents.some((event) => event.value != null);

      return {
        ...sub,
        usesThisMonth,
        usesInPeriod,
        totalValue,
        hasValueData,
        costPerMonth: monthlyEquivalent,
        perUseCost: perUseCost(sub.cost, usesInPeriod),
        worthIt: windowHasValueData
          ? isWorthIt(costForWorthItWindow(sub.cost, sub.billingPeriod), windowTotalValue)
          : null,
      };
    }),
  );

  return NextResponse.json(withUsage);
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const cost = Number(body?.cost);
  const billingPeriod = body?.billingPeriod === undefined ? "monthly" : body.billingPeriod;

  if (!name || !Number.isFinite(cost) || cost < 0) {
    return NextResponse.json(
      { error: "name and a non-negative cost are required" },
      { status: 400 },
    );
  }
  if (!isBillingPeriod(billingPeriod)) {
    return NextResponse.json(
      { error: "billingPeriod must be 'monthly' or 'yearly'" },
      { status: 400 },
    );
  }

  const db = getDb();
  const sub = {
    id: randomUUID(),
    userId,
    name,
    cost,
    billingPeriod,
    createdAt: new Date(),
  };
  await db.insert(subscriptions).values(sub);

  return NextResponse.json(sub, { status: 201 });
}
