import { and, eq, count, sum, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  users, tasks, focusSessions, squads, squadMembers, userBadges, rooms, type User,
} from "@/db/schema";
import { BADGES, levelFromXp, type BadgeStats } from "@/lib/xp";
import { dayKey, addDays } from "@/lib/dates";

export type EarnedBadge = {
  key: string; name: string; desc: string; icon: string; hue: number; tier: string;
};

/** Gather every stat used by badge rules in a small number of queries. */
export async function collectBadgeStats(
  user: { id: number; xp: number; streak: number; dailyGoal?: number },
  overrides: Partial<BadgeStats> = {}
): Promise<BadgeStats> {
  const today = dayKey();
  const goal = user.dailyGoal ?? 120;

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
  const [rh] = await db.select({ value: count() }).from(rooms).where(eq(rooms.hostId, user.id));
  const [todayAgg] = await db
    .select({ minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), eq(focusSessions.day, today)));

  /* one aggregate pass for the heavier stats */
  const agg = await db.execute(sql`
    select
      coalesce(max(minutes), 0)                                              as longest,
      count(distinct day)                                                    as active_days,
      count(distinct project) filter (where project is not null)             as projects,
      count(*) filter (where extract(hour from started_at) >= 22
                          or extract(hour from started_at) < 4)              as night,
      count(*) filter (where extract(hour from started_at) >= 5
                         and extract(hour from started_at) < 8)              as morning,
      count(*) filter (where extract(hour from started_at) >= 16
                         and extract(hour from started_at) < 20)             as evening,
      count(distinct day) filter (where extract(isodow from day::date) >= 6)  as weekend_days
    from focus_sessions where user_id = ${user.id}
  `);
  const a = (agg.rows[0] ?? {}) as Record<string, unknown>;

  const topProject = await db.execute(sql`
    select coalesce(max(total), 0) as top from (
      select sum(minutes) as total from focus_sessions
      where user_id = ${user.id} and project is not null group by project
    ) p
  `);

  const goalRows = await db.execute(sql`
    select count(*) as days from (
      select day, sum(minutes) as m from focus_sessions
      where user_id = ${user.id} group by day
    ) d where d.m >= ${goal}
  `);

  const perfectRows = await db.execute(sql`
    select count(*) as weeks from (
      select date_trunc('week', day::date) as wk, count(distinct day) as d
      from focus_sessions where user_id = ${user.id}
      group by 1
    ) w where w.d >= 7
  `);

  const [bc] = await db.select({ value: count() }).from(userBadges).where(eq(userBadges.userId, user.id));

  /* comeback: any gap of 7+ days between consecutive active days */
  const comebackRows = await db.execute(sql`
    select exists (
      select 1 from (
        select day::date as d, lag(day::date) over (order by day::date) as prev
        from (select distinct day from focus_sessions where user_id = ${user.id}) x
      ) g where g.prev is not null and g.d - g.prev >= 7
    ) as back
  `);

  const num = (v: unknown) => Number(v ?? 0);

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
    activeDays: num(a.active_days),
    longestSession: num(a.longest),
    projects: num(a.projects),
    topProjectMinutes: num((topProject.rows[0] as Record<string, unknown>)?.top),
    goalDays: num((goalRows.rows[0] as Record<string, unknown>)?.days),
    perfectWeeks: num((perfectRows.rows[0] as Record<string, unknown>)?.weeks),
    roomsHosted: rh.value,
    nightSessions: num(a.night),
    morningSessions: num(a.morning),
    eveningSessions: num(a.evening),
    weekendDays: num(a.weekend_days),
    badgeCount: bc.value,
    comeback: Boolean((comebackRows.rows[0] as Record<string, unknown>)?.back),
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

  // pass 1: regular badges
  const fresh = BADGES.filter((b) => !b.meta && !earned.has(b.key) && b.test(stats));
  // pass 2: meta badges, counting the ones just earned in pass 1
  const afterCount = earned.size + fresh.length;
  const metaFresh = BADGES.filter(
    (b) => b.meta && !earned.has(b.key) && b.test({ ...stats, badgeCount: afterCount })
  );

  const all = [...fresh, ...metaFresh];
  if (all.length > 0) {
    await db.insert(userBadges).values(all.map((b) => ({ userId, badgeKey: b.key })));
  }
  return all.map(({ key, name, desc, icon, hue, tier }) => ({ key, name, desc, icon, hue, tier }));
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
  input: {
    minutes: number;
    taskId?: number | null;
    roomId?: number | null;
    project?: string | null;
    note?: string | null;
    at?: Date;
  }
): Promise<CreditResult> {
  const minutes = Math.max(1, Math.min(600, Math.round(input.minutes)));
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

  const project = input.project ? input.project.trim().slice(0, 40) || null : null;
  const note = input.note ? input.note.trim().slice(0, 200) || null : null;

  await db.insert(focusSessions).values({
    userId: user.id,
    taskId,
    roomId: input.roomId ?? null,
    project,
    note,
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

  const freshUser = { id: user.id, xp, streak, dailyGoal: user.dailyGoal };
  const stats = await collectBadgeStats(freshUser, { dayOfWeek: now.getUTCDay(), hour: now.getUTCHours() });
  const newBadges = await evaluateBadges(user.id, stats);

  return { xp, level: levelFromXp(xp), leveledUp: levelFromXp(xp) > prevLevel, streak, newBadges };
}
