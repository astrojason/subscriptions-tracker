import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, subscriptions, usageEvents } from "@/lib/db";
import { getUserId } from "@/lib/auth-server";
import { parseLogUseInput } from "@/lib/usage";

type Context = { params: Promise<{ id: string; usageId: string }> };

async function loadOwnedEvent(userId: string, id: string, usageId: string) {
  const db = getDb();
  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
  if (!sub) return null;

  const [event] = await db
    .select()
    .from(usageEvents)
    .where(and(eq(usageEvents.id, usageId), eq(usageEvents.subscriptionId, id)));
  return event ?? null;
}

export async function PATCH(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, usageId } = await params;
  const existing = await loadOwnedEvent(userId, id, usageId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const parsed = parseLogUseInput(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(usageEvents)
    .set({ value: parsed.value, label: parsed.label, usedAt: parsed.usedAt })
    .where(eq(usageEvents.id, usageId))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(request: Request, { params }: Context) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, usageId } = await params;
  const existing = await loadOwnedEvent(userId, id, usageId);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const db = getDb();
  await db.delete(usageEvents).where(eq(usageEvents.id, usageId));

  return new NextResponse(null, { status: 204 });
}
