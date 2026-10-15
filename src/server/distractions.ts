"use server";

import { randomInt } from "node:crypto";
import { and, desc, eq, gt, lte } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { distractionEvents, focusSessionRuns, proofChallenges, sessionCommitments, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const SOURCES = ["phone", "interruption", "thought", "noise", "other"] as const;
export type DistractionSource = (typeof SOURCES)[number];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type SessionStartDetails = {
  intendedOutcome: string;
  consequence?: string;
  energyRating: number | null;
  verificationEnabled: boolean;
};

export async function beginFocusRunAction(runKey: string, plannedMinutes: number, details: SessionStartDetails) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to start a tracked focus session." };
  if (!UUID_RE.test(runKey)) return { error: "Invalid focus session." };
  if (!Number.isInteger(plannedMinutes) || plannedMinutes < 1 || plannedMinutes > 120) return { error: "Invalid focus duration." };
  if (!details || typeof details.intendedOutcome !== "string") return { error: "Complete the focus commitment before starting." };
  const intendedOutcome = details.intendedOutcome.trim().slice(0, 240);
  const consequence = typeof details.consequence === "string" ? details.consequence.trim().slice(0, 240) : "";
  const energyRating = details.energyRating;
  const verificationEnabled = details.verificationEnabled === true;
  if (intendedOutcome.length < 3) return { error: "Describe what you intend to accomplish (at least 3 characters)." };
  if (energyRating !== null && (!Number.isInteger(energyRating) || energyRating < 1 || energyRating > 5)) return { error: "Choose an energy level from 1 to 5, or skip it." };

  const result = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update").limit(1);
    await tx.insert(focusSessionRuns).values({ runKey, userId: user.id, plannedMinutes, energyRating, verificationEnabled }).onConflictDoNothing();
    const [run] = await tx.select().from(focusSessionRuns).where(eq(focusSessionRuns.runKey, runKey)).limit(1);
    if (!run || run.userId !== user.id || run.status !== "active") return { error: "This focus session is no longer active." };
    const [priorCommitment] = await tx.select().from(sessionCommitments).where(eq(sessionCommitments.runKey, runKey)).limit(1);
    if (priorCommitment) {
      if (priorCommitment.intendedOutcome !== intendedOutcome || priorCommitment.consequence !== (consequence || null) || run.energyRating !== energyRating || run.verificationEnabled !== verificationEnabled) {
        return { error: "This session already has a saved setup; start a new round to change it." };
      }
    } else {
      if (run.energyRating !== energyRating || run.verificationEnabled !== verificationEnabled) {
        await tx.update(focusSessionRuns).set({ energyRating, verificationEnabled }).where(eq(focusSessionRuns.runKey, runKey));
      }
      await tx.insert(sessionCommitments).values({ userId: user.id, runKey, intendedOutcome, consequence: consequence || null });
    }

    let proofScheduled = false;
    if (verificationEnabled && plannedMinutes >= 15) {
      const startedAt = run.startedAt.getTime();
      const durationMs = plannedMinutes * 60_000;
      const earliest = Math.max(4 * 60_000, Math.floor(durationMs * 0.25));
      const latest = durationMs - 2 * 60_000;
      if (latest > earliest) {
        const dueAt = new Date(startedAt + randomInt(earliest, latest));
        const inserted = await tx.insert(proofChallenges).values({
          runKey,
          userId: user.id,
          scheduledAt: dueAt,
          expiresAt: new Date(dueAt.getTime() + 2 * 60_000),
        }).onConflictDoNothing().returning({ runKey: proofChallenges.runKey });
        proofScheduled = inserted.length > 0;
      }
    }
    return { ok: true as const, proofScheduled };
  });
  if ("error" in result) return result;
  revalidatePath("/focus");
  return result;
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

  const saved = await db.transaction(async (tx) => {
    await tx.select({ id: users.id }).from(users).where(eq(users.id, user.id)).for("update").limit(1);
    await tx.insert(focusSessionRuns).values({ runKey: input.runKey, userId: user.id, plannedMinutes: input.plannedMinutes }).onConflictDoNothing();
    const [run] = await tx.select({ userId: focusSessionRuns.userId, status: focusSessionRuns.status })
      .from(focusSessionRuns).where(eq(focusSessionRuns.runKey, input.runKey)).limit(1);
    if (!run || run.userId !== user.id || run.status !== "active") return false;
    await tx.insert(distractionEvents).values({
      userId: user.id, runKey: input.runKey, clientEventId: input.clientEventId,
      source: input.source, note: input.note.trim() || null,
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
  await db.transaction(async (tx) => {
    await tx.update(focusSessionRuns).set({ status: "abandoned", endedAt: new Date() })
      .where(and(eq(focusSessionRuns.runKey, runKey), eq(focusSessionRuns.userId, user.id), eq(focusSessionRuns.status, "active")));
    await tx.update(sessionCommitments).set({ status: "abandoned", resolvedAt: new Date() })
      .where(and(eq(sessionCommitments.runKey, runKey), eq(sessionCommitments.userId, user.id), eq(sessionCommitments.status, "pending")));
  });
  return { ok: true };
}

export async function cancelFocusRunAction(runKey: string) {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return { ok: false };
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(focusSessionRuns).set({ status: "cancelled", endedAt: now })
      .where(and(eq(focusSessionRuns.runKey, runKey), eq(focusSessionRuns.userId, user.id), eq(focusSessionRuns.status, "active")));
    await tx.update(sessionCommitments).set({ status: "cancelled", resolvedAt: now })
      .where(and(eq(sessionCommitments.runKey, runKey), eq(sessionCommitments.userId, user.id), eq(sessionCommitments.status, "pending")));
  });
  return { ok: true };
}

export async function getLatestUnresolvedCommitmentAction() {
  const user = await getSessionUser();
  if (!user) return null;
  const [row] = await db.select({
    id: sessionCommitments.id,
    runKey: sessionCommitments.runKey,
    intendedOutcome: sessionCommitments.intendedOutcome,
    consequence: sessionCommitments.consequence,
    createdAt: sessionCommitments.createdAt,
  }).from(sessionCommitments)
    .where(and(eq(sessionCommitments.userId, user.id), eq(sessionCommitments.status, "unresolved")))
    .orderBy(desc(sessionCommitments.createdAt)).limit(1);
  return row ?? null;
}

export async function getActiveCommitmentAction(runKey: string) {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return null;
  const [row] = await db.select({
    intendedOutcome: sessionCommitments.intendedOutcome,
    consequence: sessionCommitments.consequence,
    energyRating: focusSessionRuns.energyRating,
  }).from(sessionCommitments)
    .innerJoin(focusSessionRuns, eq(focusSessionRuns.runKey, sessionCommitments.runKey))
    .where(and(
      eq(sessionCommitments.runKey, runKey),
      eq(sessionCommitments.userId, user.id),
      eq(sessionCommitments.status, "pending"),
      eq(focusSessionRuns.status, "active"),
    )).limit(1);
  return row ?? null;
}

export async function resolveCommitmentAction(runKey: string, outcome: "fulfilled" | "broken") {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return { error: "Sign in to resolve this commitment." };
  if (outcome !== "fulfilled" && outcome !== "broken") return { error: "Choose one of the available outcomes." };
  const [run] = await db.select({ status: focusSessionRuns.status, endedAt: focusSessionRuns.endedAt })
    .from(focusSessionRuns).where(and(eq(focusSessionRuns.runKey, runKey), eq(focusSessionRuns.userId, user.id))).limit(1);
  if (!run || run.status !== "completed" || !run.endedAt) return { error: "Only a completed focus session can be resolved." };
  const now = new Date();
  const updated = await db.update(sessionCommitments).set({
    status: outcome,
    resolvedAt: now,
    accountabilityExpiresAt: outcome === "broken" ? new Date(now.getTime() + 24 * 60 * 60_000) : null,
  }).where(and(
    eq(sessionCommitments.runKey, runKey),
    eq(sessionCommitments.userId, user.id),
    eq(sessionCommitments.status, "unresolved"),
  )).returning({ id: sessionCommitments.id });
  if (!updated.length) return { error: "This commitment has already been resolved." };
  revalidatePath("/focus"); revalidatePath("/history"); revalidatePath("/dashboard"); revalidatePath("/leaderboard");
  return { ok: true };
}

/** Return a challenge only when its server-chosen deadline has arrived. */
export async function pollProofCheckAction(runKey: string) {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return { due: false as const };
  const now = new Date();
  const [challenge] = await db.select().from(proofChallenges)
    .where(and(eq(proofChallenges.runKey, runKey), eq(proofChallenges.userId, user.id))).limit(1);
  if (!challenge || challenge.status === "answered" || challenge.status === "missed") return { due: false as const };
  if (now > challenge.expiresAt) {
    await db.update(proofChallenges).set({ status: "missed" })
      .where(and(eq(proofChallenges.runKey, runKey), eq(proofChallenges.userId, user.id), eq(proofChallenges.status, "asked")));
    return { due: false as const, missed: true };
  }
  if (now < challenge.scheduledAt) return { due: false as const };
  await db.update(proofChallenges).set({ status: "asked" })
    .where(and(eq(proofChallenges.runKey, runKey), eq(proofChallenges.userId, user.id), eq(proofChallenges.status, "scheduled"), lte(proofChallenges.scheduledAt, now)));
  const [current] = await db.select({ status: proofChallenges.status, expiresAt: proofChallenges.expiresAt })
    .from(proofChallenges).where(and(eq(proofChallenges.runKey, runKey), eq(proofChallenges.userId, user.id))).limit(1);
  return current?.status === "asked" && current.expiresAt > now ? { due: true as const, runKey } : { due: false as const };
}

export async function answerProofCheckAction(runKey: string) {
  const user = await getSessionUser();
  if (!user || !UUID_RE.test(runKey)) return { error: "This focus check is unavailable." };
  const now = new Date();
  const rows = await db.update(proofChallenges).set({ status: "answered", respondedAt: now })
    .where(and(eq(proofChallenges.runKey, runKey), eq(proofChallenges.userId, user.id), eq(proofChallenges.status, "asked"), gt(proofChallenges.expiresAt, now)))
    .returning({ runKey: proofChallenges.runKey });
  if (!rows.length) return { error: "The check expired or was already answered." };
  return { ok: true };
}
