import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@/lib/db";
import { isBillingPeriod } from "@/lib/billing";
import { getUserId } from "@/lib/auth-server";
import type { BillingPeriod } from "@/lib/types";

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const patch: { name?: string; cost?: number; billingPeriod?: BillingPeriod } = {};
  if (typeof body?.name === "string" && body.name.trim()) patch.name = body.name.trim();
  if (body?.cost !== undefined) {
    const cost = Number(body.cost);
    if (!Number.isFinite(cost) || cost < 0) {
      return NextResponse.json({ error: "cost must be a non-negative number" }, { status: 400 });
    }
    patch.cost = cost;
  }
  if (body?.billingPeriod !== undefined) {
    if (!isBillingPeriod(body.billingPeriod)) {
      return NextResponse.json(
        { error: "billingPeriod must be 'monthly' or 'yearly'" },
        { status: 400 },
      );
    }
    patch.billingPeriod = body.billingPeriod;
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(subscriptions)
    .set(patch)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
    .returning();

  if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));

  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(usageEvents).where(eq(usageEvents.subscriptionId, id));
  await db.delete(subscriptions).where(eq(subscriptions.id, id));

  return new NextResponse(null, { status: 204 });
}
