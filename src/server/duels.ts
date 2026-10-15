"use server";

import { and, eq, gt, gte, inArray, isNotNull, lte, or, sum, count, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { duels, focusSessions, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { duelWinner } from "@/lib/feature-metrics";

const INVITATION_MS = 72 * 60 * 60 * 1000;
const CHALLENGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function createDuelAction(input: { username: string; stake: string }) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to challenge another player." };
  if (!input || typeof input !== "object" || typeof input.username !== "string" || typeof input.stake !== "string") return { error: "Enter valid invitation details." };
  const username = input.username.trim().toLowerCase().replace(/^@/, "");
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return { error: "Enter a valid username." };
  const [opponent] = await db.select({ id: users.id, username: users.username })
    .from(users).where(eq(users.username, username)).limit(1);
  if (!opponent) return { error: "No player with that username was found." };
  if (opponent.id === user.id) return { error: "You cannot challenge yourself." };

  const pairKey = [user.id, opponent.id].sort((a, b) => a - b).join(":");
  const existing = await db.select({ id: duels.id }).from(duels)
    .where(and(eq(duels.pairKey, pairKey), inArray(duels.status, ["pending", "active"]))).limit(1);
  if (existing.length) return { error: "An open invitation or duel already exists between you." };

  try {
    const cleanStake = input.stake.trim().slice(0, 160) || null;
    const [created] = await db.insert(duels).values({
      pairKey,
      challengerId: user.id,
      opponentId: opponent.id,
      status: "pending",
      invitationExpiresAt: new Date(Date.now() + INVITATION_MS),
      requiredRounds: 10,
      minimumFocusMinutes: 25,
      taskCategory: "any",
      stake: cleanStake,
    }).returning({ id: duels.id });
    revalidatePath("/duels");
    return { ok: true, duelId: created.id };
  } catch {
    return { error: "An open duel already exists, or the invitation could not be saved." };
  }
}

export async function answerDuelAction(duelId: number, accept: boolean) {
  const user = await getSessionUser();
  if (!user || !Number.isSafeInteger(duelId) || duelId < 1 || typeof accept !== "boolean") return { error: "Invalid duel." };
  const now = new Date();
  if (accept) {
    const [updated] = await db.update(duels).set({
      status: "active",
      startsAt: now,
      endsAt: new Date(now.getTime() + CHALLENGE_MS),
    }).where(and(
      eq(duels.id, duelId), eq(duels.opponentId, user.id), eq(duels.status, "pending"), gt(duels.invitationExpiresAt, now),
    )).returning({ id: duels.id });
    if (!updated) return { error: "This invitation expired or is no longer available." };
  } else {
    const [updated] = await db.update(duels).set({ status: "declined" }).where(and(
      eq(duels.id, duelId), eq(duels.opponentId, user.id), eq(duels.status, "pending"), gt(duels.invitationExpiresAt, now),
    )).returning({ id: duels.id });
    if (!updated) return { error: "This invitation expired or is no longer available." };
  }
  revalidatePath("/duels");
  revalidatePath(`/duels/${duelId}`);
  return { ok: true };
}

export async function cancelDuelAction(duelId: number) {
  const user = await getSessionUser();
  if (!user || !Number.isSafeInteger(duelId) || duelId < 1) return { error: "Invalid duel." };
  const [updated] = await db.update(duels).set({ status: "cancelled" }).where(and(
    eq(duels.id, duelId),
    or(eq(duels.challengerId, user.id), eq(duels.opponentId, user.id)),
    inArray(duels.status, ["pending", "active"]),
  )).returning({ id: duels.id });
  if (!updated) return { error: "This duel can no longer be cancelled." };
  revalidatePath("/duels");
  revalidatePath(`/duels/${duelId}`);
  return { ok: true };
}

export async function resolveDuelIfDue(duelId: number) {
  const user = await getSessionUser();
  if (!user || !Number.isSafeInteger(duelId) || duelId < 1) return;
  const [duel] = await db.select().from(duels).where(eq(duels.id, duelId)).limit(1);
  if (!duel || (duel.challengerId !== user.id && duel.opponentId !== user.id) || duel.status !== "active" || !duel.startsAt || !duel.endsAt || duel.endsAt > new Date()) return;
  const rows = await db.select({ userId: focusSessions.userId, rounds: count(), minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(
      inArray(focusSessions.userId, [duel.challengerId, duel.opponentId]),
      isNotNull(focusSessions.runKey),
      isNotNull(focusSessions.focusQuality),
      gte(focusSessions.minutes, duel.minimumFocusMinutes),
      gte(focusSessions.startedAt, duel.startsAt),
      lte(focusSessions.completedAt, duel.endsAt),
    ))
    .groupBy(focusSessions.userId);
  const stats = (id: number) => rows.find((row) => row.userId === id);
  const challenger = stats(duel.challengerId);
  const opponent = stats(duel.opponentId);
  const winner = duelWinner(
    { rounds: Number(challenger?.rounds ?? 0), minutes: Number(challenger?.minutes ?? 0) },
    { rounds: Number(opponent?.rounds ?? 0), minutes: Number(opponent?.minutes ?? 0) },
  );
  await db.update(duels).set({
    status: "completed",
    winnerId: winner === "a" ? duel.challengerId : winner === "b" ? duel.opponentId : null,
    completedAt: new Date(),
  }).where(and(eq(duels.id, duelId), eq(duels.status, "active"), lte(duels.endsAt, new Date())));
}

export async function listDuelsForUser() {
  const user = await getSessionUser();
  if (!user) return [];
  const userId = user.id;
  const now = new Date();
  await db.update(duels).set({ status: "expired" }).where(and(eq(duels.status, "pending"), lte(duels.invitationExpiresAt, now)));
  const rows = await db.select().from(duels)
    .where(or(eq(duels.challengerId, userId), eq(duels.opponentId, userId)))
    .orderBy(desc(duels.invitedAt)).limit(100);
  const due = rows.filter((row) => row.status === "active" && row.endsAt && row.endsAt <= now);
  await Promise.all(due.map((row) => resolveDuelIfDue(row.id)));
  const freshRows = due.length
    ? await db.select().from(duels).where(or(eq(duels.challengerId, userId), eq(duels.opponentId, userId))).orderBy(desc(duels.invitedAt)).limit(100)
    : rows;
  const ids = [...new Set(freshRows.flatMap((row) => [row.challengerId, row.opponentId]))];
  const profiles = ids.length ? await db.select({ id: users.id, username: users.username, displayName: users.displayName, avatarHue: users.avatarHue }).from(users).where(inArray(users.id, ids)) : [];
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
  const active = freshRows.filter((row) => row.status === "active" && row.startsAt && row.endsAt);
  const sessionRows = active.length ? await db.select({
    duelId: duels.id,
    userId: focusSessions.userId,
    rounds: count(),
    minutes: sum(focusSessions.minutes),
  }).from(duels).innerJoin(focusSessions, and(
    or(eq(focusSessions.userId, duels.challengerId), eq(focusSessions.userId, duels.opponentId)),
    isNotNull(focusSessions.runKey),
    isNotNull(focusSessions.focusQuality),
    gte(focusSessions.minutes, duels.minimumFocusMinutes),
    gte(focusSessions.startedAt, duels.startsAt),
    lte(focusSessions.completedAt, duels.endsAt),
  )).where(and(eq(duels.status, "active"), inArray(duels.id, active.map((row) => row.id))))
    .groupBy(duels.id, focusSessions.userId) : [];
  return freshRows.map((duel) => {
    const mine = duel.challengerId === userId;
    const myId = userId;
    const opponentId = mine ? duel.opponentId : duel.challengerId;
    const progress = (id: number) => sessionRows.find((row) => row.duelId === duel.id && row.userId === id) ?? null;
    const my = progress(myId);
    const other = progress(opponentId);
    return {
      ...duel,
      mine,
      challenger: profileMap.get(duel.challengerId) ?? null,
      opponent: profileMap.get(duel.opponentId) ?? null,
      myRounds: Number(my?.rounds ?? 0),
      myMinutes: Number(my?.minutes ?? 0),
      opponentRounds: Number(other?.rounds ?? 0),
      opponentMinutes: Number(other?.minutes ?? 0),
    };
  });
}

export async function getDuelForParticipant(duelId: number) {
  const user = await getSessionUser();
  if (!user) return null;
  const userId = user.id;
  if (!Number.isSafeInteger(duelId) || duelId < 1) return null;
  await resolveDuelIfDue(duelId);
  const [duel] = await db.select().from(duels).where(and(
    eq(duels.id, duelId), or(eq(duels.challengerId, userId), eq(duels.opponentId, userId)),
  )).limit(1);
  if (!duel) return null;
  const opponentId = duel.challengerId === userId ? duel.opponentId : duel.challengerId;
  const [opponent] = await db.select({ id: users.id, username: users.username, displayName: users.displayName, avatarHue: users.avatarHue })
    .from(users).where(eq(users.id, opponentId)).limit(1);
  const standings = (duel.status === "active" || duel.status === "completed") && duel.startsAt && duel.endsAt
    ? await db.select({ userId: focusSessions.userId, rounds: count(), minutes: sum(focusSessions.minutes) })
      .from(focusSessions).where(and(
        inArray(focusSessions.userId, [duel.challengerId, duel.opponentId]),
        isNotNull(focusSessions.runKey), isNotNull(focusSessions.focusQuality),
        gte(focusSessions.minutes, duel.minimumFocusMinutes),
        gte(focusSessions.startedAt, duel.startsAt), lte(focusSessions.completedAt, duel.endsAt),
      )).groupBy(focusSessions.userId)
    : [];
  const byUser = (id: number) => standings.find((row) => row.userId === id);
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setUTCHours(0, 0, 0, 0);
  const dailyRows = duel.status === "active" && duel.startsAt && duel.endsAt
    ? await db.select({ userId: focusSessions.userId, rounds: count(), minutes: sum(focusSessions.minutes) })
      .from(focusSessions).where(and(
        inArray(focusSessions.userId, [duel.challengerId, duel.opponentId]),
        isNotNull(focusSessions.runKey), isNotNull(focusSessions.focusQuality),
        gte(focusSessions.minutes, duel.minimumFocusMinutes),
        gte(focusSessions.startedAt, duel.startsAt),
        gte(focusSessions.completedAt, todayStart), lte(focusSessions.completedAt, now), lte(focusSessions.completedAt, duel.endsAt),
      )).groupBy(focusSessions.userId)
    : [];
  const dailyByUser = (id: number) => dailyRows.find((row) => row.userId === id);
  const recentSessions = (duel.status === "active" || duel.status === "completed") && duel.startsAt && duel.endsAt ? await db.select({
    id: focusSessions.id,
    userId: focusSessions.userId,
    minutes: focusSessions.minutes,
    focusQuality: focusSessions.focusQuality,
    completedAt: focusSessions.completedAt,
  }).from(focusSessions).where(and(
    inArray(focusSessions.userId, [duel.challengerId, duel.opponentId]),
    isNotNull(focusSessions.runKey), isNotNull(focusSessions.focusQuality),
    gte(focusSessions.minutes, duel.minimumFocusMinutes),
    gte(focusSessions.startedAt, duel.startsAt), lte(focusSessions.completedAt, duel.endsAt),
  )).orderBy(desc(focusSessions.completedAt)).limit(10) : [];
  return {
    ...duel,
    currentUserId: userId,
    opponent: opponent ?? null,
    challengerProgress: { rounds: Number(byUser(duel.challengerId)?.rounds ?? 0), minutes: Number(byUser(duel.challengerId)?.minutes ?? 0) },
    opponentProgress: { rounds: Number(byUser(duel.opponentId)?.rounds ?? 0), minutes: Number(byUser(duel.opponentId)?.minutes ?? 0) },
    challengerToday: { rounds: Number(dailyByUser(duel.challengerId)?.rounds ?? 0), minutes: Number(dailyByUser(duel.challengerId)?.minutes ?? 0) },
    opponentToday: { rounds: Number(dailyByUser(duel.opponentId)?.rounds ?? 0), minutes: Number(dailyByUser(duel.opponentId)?.minutes ?? 0) },
    recentSessions: recentSessions.map((session) => ({ ...session, completedAt: session.completedAt?.toISOString() ?? null })),
  };
}
