import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@sub-tracker/db";
import { getUserId } from "@/lib/auth-server";

type Context = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));

  let value: number | null = null;
  if (body?.value !== undefined && body.value !== null && body.value !== "") {
    const parsed = Number(body.value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return NextResponse.json({ error: "value must be a non-negative number" }, { status: 400 });
    }
    value = parsed;
  }

  const event = { id: randomUUID(), subscriptionId: id, usedAt: new Date(), value };
  await db.insert(usageEvents).values(event);

  return NextResponse.json(event, { status: 201 });
}
