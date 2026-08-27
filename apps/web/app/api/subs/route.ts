import { randomUUID } from "node:crypto";
import { and, eq, gte } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@sub-tracker/db";
import { getUserId } from "@/lib/auth-server";
import { costPerMonth, isBillingPeriod } from "@/lib/billing";

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const subs = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId));

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const withUsage = await Promise.all(
    subs.map(async (sub) => {
      const events = await db
        .select()
        .from(usageEvents)
        .where(and(eq(usageEvents.subscriptionId, sub.id), gte(usageEvents.usedAt, startOfMonth)));

      const usesThisMonth = events.length;
      const totalValue = events.reduce((sum, event) => sum + (event.value ?? 0), 0);
      const hasValueData = events.some((event) => event.value != null);
      const monthlyEquivalent = costPerMonth(sub.cost, sub.billingPeriod);

      return {
        ...sub,
        usesThisMonth,
        totalValue,
        hasValueData,
        costPerMonth: monthlyEquivalent,
        perUseCost: usesThisMonth > 0 ? monthlyEquivalent / usesThisMonth : null,
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
