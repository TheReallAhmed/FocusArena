import { and, eq, count, sum, isNotNull, sql, lt, gt, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  users, tasks, focusSessions, focusSessionRuns, distractionEvents, squads, squadMembers, userBadges, rooms, type User,
} from "@/db/schema";
import { BADGES, levelFromXp, type BadgeStats } from "@/lib/xp";
import { calculateFocusQuality } from "@/lib/feature-metrics";
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
  gained: number;
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
    runKey?: string | null;
    at?: Date;
  }
): Promise<CreditResult> {
  const minutes = Math.max(1, Math.min(600, Math.round(input.minutes)));
  const now = input.at ?? new Date();
  const day = dayKey(now);

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

  const outcome = await db.transaction(async (tx) => {
    // Serialize a user's awards and lock the run to make retries/concurrent callbacks safe.
    const currentRows = await tx.select().from(users).where(eq(users.id, user.id)).for("update").limit(1);
    const current = currentRows[0] ?? user;
    let creditedMinutes = minutes;
    let validRunKey: string | null = null;
    let quality: number | null = null;
    let focusStartedAt = now;

    if (input.runKey) {
      const prior = await tx.select({ id: focusSessions.id })
        .from(focusSessions).where(eq(focusSessions.runKey, input.runKey)).limit(1);
      if (prior.length > 0) {
        return { duplicate: true as const, gained: 0, xp: current.xp, streak: current.streak, leveledUp: false };
      }

      const runs = await tx.select().from(focusSessionRuns)
        .where(and(eq(focusSessionRuns.runKey, input.runKey), eq(focusSessionRuns.userId, user.id)))
        .for("update").limit(1);
      const run = runs[0];
      if (!run || run.status !== "active") throw new Error("The focus run is not available for completion.");
      const overlaps = await tx.select({ runKey: focusSessionRuns.runKey }).from(focusSessionRuns).where(and(
        eq(focusSessionRuns.userId, user.id),
        ne(focusSessionRuns.runKey, run.runKey),
        or(
          and(eq(focusSessionRuns.status, "active"), or(
            lt(focusSessionRuns.startedAt, run.startedAt),
            and(eq(focusSessionRuns.startedAt, run.startedAt), lt(focusSessionRuns.runKey, run.runKey)),
          )),
          and(eq(focusSessionRuns.status, "completed"), lt(focusSessionRuns.startedAt, now), isNotNull(focusSessionRuns.endedAt), gt(focusSessionRuns.endedAt, run.startedAt)),
        ),
      )).limit(1);
      if (overlaps.length) throw new Error("Overlapping focus runs cannot count as qualifying rounds.");
      const requiredMs = run.plannedMinutes * 60_000;
      if (now.getTime() - run.startedAt.getTime() + 15_000 < requiredMs) {
        throw new Error("The focus round has not run for its planned duration.");
      }
      const [eventCount] = await tx.select({ value: count() }).from(distractionEvents)
        .where(and(eq(distractionEvents.runKey, input.runKey), eq(distractionEvents.userId, user.id)));
      quality = calculateFocusQuality(eventCount.value);
      validRunKey = input.runKey;
      focusStartedAt = run.startedAt;
      creditedMinutes = run.plannedMinutes;
    }

    const inserted = await tx.insert(focusSessions).values({
      userId: user.id,
      taskId,
      roomId: input.roomId ?? null,
      project,
      note,
      minutes: creditedMinutes,
      day,
      runKey: validRunKey,
      focusQuality: quality,
      focusQualityVersion: validRunKey ? 1 : null,
      startedAt: focusStartedAt,
      completedAt: now,
    }).onConflictDoNothing({ target: focusSessions.runKey }).returning({ id: focusSessions.id });
    if (inserted.length === 0) {
      return { duplicate: true as const, gained: 0, xp: current.xp, streak: current.streak, leveledUp: false };
    }

    const previousLevel = levelFromXp(current.xp);
    const yesterday = addDays(day, -1);
    const streak = current.lastFocusDay === day ? current.streak : current.lastFocusDay === yesterday ? current.streak + 1 : 1;
    const xp = current.xp + creditedMinutes;
    await tx.update(users).set({ xp, streak, lastFocusDay: day }).where(eq(users.id, user.id));

    if (taskId) {
      const rows = await tx.select({ focusMinutes: tasks.focusMinutes }).from(tasks).where(eq(tasks.id, taskId)).limit(1);
      await tx.update(tasks).set({ focusMinutes: (rows[0]?.focusMinutes ?? 0) + creditedMinutes }).where(eq(tasks.id, taskId));
    }
    if (validRunKey) {
      await tx.update(focusSessionRuns).set({ status: "completed", focusSessionId: inserted[0].id, endedAt: now })
        .where(and(eq(focusSessionRuns.runKey, validRunKey), eq(focusSessionRuns.userId, user.id)));
    }
    return { duplicate: false as const, gained: creditedMinutes, xp, streak, leveledUp: levelFromXp(xp) > previousLevel };
  });

  if (outcome.duplicate) {
    return { gained: outcome.gained, xp: outcome.xp, level: levelFromXp(outcome.xp), leveledUp: false, streak: outcome.streak, newBadges: [] };
  }

  const freshUser = { id: user.id, xp: outcome.xp, streak: outcome.streak, dailyGoal: user.dailyGoal };
  const stats = await collectBadgeStats(freshUser, { dayOfWeek: now.getUTCDay(), hour: now.getUTCHours() });
  const newBadges = await evaluateBadges(user.id, stats);
  return { gained: outcome.gained, xp: outcome.xp, level: levelFromXp(outcome.xp), leveledUp: outcome.leveledUp, streak: outcome.streak, newBadges };
}
