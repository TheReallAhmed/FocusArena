import { and, eq, count, sum, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import {
  users, tasks, focusSessions, squads, squadMembers, userBadges, type User,
} from "@/db/schema";
import { BADGES, levelFromXp, type BadgeStats } from "@/lib/xp";
import { dayKey, addDays } from "@/lib/dates";

export type EarnedBadge = { key: string; name: string; desc: string; icon: string; hue: number };

/** Gather all stats used by badge rules for a user. */
export async function collectBadgeStats(
  user: { id: number; xp: number; streak: number },
  overrides: Partial<BadgeStats> = {}
): Promise<BadgeStats> {
  const today = dayKey();

  const [sess] = await db.select({ value: count() }).from(focusSessions).where(eq(focusSessions.userId, user.id));
  const [grp] = await db
    .select({ value: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), isNotNull(focusSessions.roomId)));
  const [td] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.done, true)));
  const [sj] = await db.select({ value: count() }).from(squadMembers).where(eq(squadMembers.userId, user.id));
  const [sc] = await db.select({ value: count() }).from(squads).where(eq(squads.createdBy, user.id));
  const [todayAgg] = await db
    .select({ minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), eq(focusSessions.day, today)));

  return {
    sessions: sess.value,
    minutes: user.xp,
    streak: user.streak,
    tasksDone: td.value,
    hour: null,
    dayOfWeek: null,
    level: levelFromXp(user.xp),
    todayMinutes: Number(todayAgg.minutes ?? 0),
    todaySessions: todayAgg.sessions,
    groupSessions: grp.value,
    squadsJoined: sj.value,
    squadsCreated: sc.value,
    ...overrides,
  };
}

/** Award any newly-earned badges; returns the fresh ones. */
export async function evaluateBadges(userId: number, stats: BadgeStats): Promise<EarnedBadge[]> {
  const earnedRows = await db
    .select({ key: userBadges.badgeKey })
    .from(userBadges)
    .where(eq(userBadges.userId, userId));
  const earned = new Set(earnedRows.map((r) => r.key));
  const fresh = BADGES.filter((b) => !earned.has(b.key) && b.test(stats));
  if (fresh.length > 0) {
    await db.insert(userBadges).values(fresh.map((b) => ({ userId, badgeKey: b.key })));
  }
  return fresh.map(({ key, name, desc, icon, hue }) => ({ key, name, desc, icon, hue }));
}

export type CreditResult = {
  xp: number;
  level: number;
  leveledUp: boolean;
  streak: number;
  newBadges: EarnedBadge[];
};

/**
 * Credit a completed focus block: insert session, update XP/streak,
 * optionally add minutes to a task, then evaluate badges.
 */
export async function creditFocusSession(
  user: User,
  input: { minutes: number; taskId?: number | null; roomId?: number | null; at?: Date }
): Promise<CreditResult> {
  const minutes = Math.max(1, Math.min(180, Math.round(input.minutes)));
  const now = input.at ?? new Date();
  const day = dayKey(now);
  const prevLevel = levelFromXp(user.xp);

  let taskId: number | null = null;
  if (input.taskId) {
    const t = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(and(eq(tasks.id, input.taskId), eq(tasks.userId, user.id)))
      .limit(1);
    if (t[0]) taskId = t[0].id;
  }

  await db.insert(focusSessions).values({
    userId: user.id,
    taskId,
    roomId: input.roomId ?? null,
    minutes,
    day,
    startedAt: now,
  });

  const yesterday = addDays(day, -1);
  const streak = user.lastFocusDay === day ? user.streak : user.lastFocusDay === yesterday ? user.streak + 1 : 1;
  const xp = user.xp + minutes;

  await db.update(users).set({ xp, streak, lastFocusDay: day }).where(eq(users.id, user.id));

  if (taskId) {
    const t = await db.select({ focusMinutes: tasks.focusMinutes }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
    await db.update(tasks).set({ focusMinutes: (t[0]?.focusMinutes ?? 0) + minutes }).where(eq(tasks.id, taskId));
  }

  const freshUser = { id: user.id, xp, streak };
  const stats = await collectBadgeStats(freshUser, { dayOfWeek: now.getUTCDay(), hour: now.getUTCHours() });
  const newBadges = await evaluateBadges(user.id, stats);

  return { xp, level: levelFromXp(xp), leveledUp: levelFromXp(xp) > prevLevel, streak, newBadges };
}
