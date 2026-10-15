"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { distractionEvents, focusSessionRuns, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const SOURCES = ["phone", "interruption", "thought", "noise", "other"] as const;
export type DistractionSource = (typeof SOURCES)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function beginFocusRunAction(runKey: string, plannedMinutes: number) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to start a tracked focus session." };
  if (!UUID_RE.test(runKey)) return { error: "Invalid focus session." };
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 120) return { error: "Invalid focus duration." };

  const run = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update").limit(1);
    await tx.insert(focusSessionRuns).values({ runKey, userId: user.id, plannedMinutes }).onConflictDoNothing();
    const [found] = await tx.select({ userId: focusSessionRuns.userId, status: focusSessionRuns.status })
      .from(focusSessionRuns).where(eq(focusSessionRuns.runKey, runKey)).limit(1);
    return found;
  });
  if (!run || run.userId !== user.id || run.status !== "active") return { error: "This focus session is no longer active." };
  revalidatePath("/distractions");
  return { ok: true };
}

export async function recordDistractionAction(input: {
  runKey: string;
  plannedMinutes: number;
  clientEventId: string;
  source: string;
  note: string;
}) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to record a distraction." };
  if (!input || typeof input !== "object") return { error: "Invalid distraction event." };
  if (!UUID_RE.test(input.runKey) || !UUID_RE.test(input.clientEventId)) return { error: "Invalid distraction event." };
  if (!Number.isInteger(input.plannedMinutes) || input.plannedMinutes < 1 || input.plannedMinutes > 120) return { error: "Invalid focus duration." };
  if (!SOURCES.includes(input.source as DistractionSource)) return { error: "Choose a valid distraction source." };
  if (typeof input.note !== "string" || input.note.length > 240) return { error: "Notes must be 240 characters or fewer." };

  // Ensure the run exists even when the network delayed its initial start request.
  const saved = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update").limit(1);
    await tx.insert(focusSessionRuns).values({ runKey: input.runKey, userId: user.id, plannedMinutes: input.plannedMinutes }).onConflictDoNothing();
    const [run] = await tx.select({ userId: focusSessionRuns.userId, status: focusSessionRuns.status })
      .from(focusSessionRuns).where(eq(focusSessionRuns.runKey, input.runKey)).limit(1);
    if (!run || run.userId !== user.id || run.status !== "active") return false;
    await tx.insert(distractionEvents).values({
      userId: user.id,
      runKey: input.runKey,
      clientEventId: input.clientEventId,
      source: input.source,
      note: input.note.trim() || null,
    }).onConflictDoNothing();
    return true;
  });
  if (!saved) return { error: "The focus session is not active." };
  revalidatePath("/distractions");
  return { ok: true };
}

export async function abandonFocusRunAction(runKey: string) {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return { ok: false };
  await db.update(focusSessionRuns).set({ status: "abandoned", endedAt: new Date() })
    .where(and(eq(focusSessionRuns.runKey, runKey), eq(focusSessionRuns.userId, user.id), eq(focusSessionRuns.status, "active")));
  return { ok: true };
}
