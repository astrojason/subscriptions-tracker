import { randomUUID } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@/lib/db";
import { getUserId } from "@/lib/auth-server";
import { parseLogUseInput } from "@/lib/usage";

type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));

  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const events = await db
    .select()
    .from(usageEvents)
    .where(eq(usageEvents.subscriptionId, id))
    .orderBy(desc(usageEvents.usedAt));

  return NextResponse.json(events);
}

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

  const parsed = parseLogUseInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const event = {
    id: randomUUID(),
    subscriptionId: id,
    usedAt: parsed.usedAt,
    value: parsed.value,
    label: parsed.label,
  };
  await db.insert(usageEvents).values(event);

  return NextResponse.json(event, { status: 201 });
}
