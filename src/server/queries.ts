import { and, eq, gte, lte, desc, asc, sql, count, sum, isNotNull, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  users, tasks, focusSessions, focusSessionRuns, sessionCommitments, squads, squadMembers, userBadges, rooms, roomMembers, type User,
} from "@/db/schema";
import { dayKey, weekStartKey, lastNDays } from "@/lib/dates";
import { badgeByKey } from "@/lib/xp";
import { commitmentFulfillment, energyOutcomeStats } from "@/lib/accountability-metrics";

export type WeekPoint = { day: string; label: string; minutes: number; isToday: boolean };

export async function getDashboardData(user: User) {
  const today = dayKey();
  const seven = lastNDays(7, today);

  const dayRows = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, seven[0])))
    .groupBy(focusSessions.day);

  const byDay = new Map(dayRows.map((r) => [r.day, Number(r.minutes ?? 0)]));
  const week: WeekPoint[] = seven.map((d) => ({
    day: d,
    label: d,
    minutes: byDay.get(d) ?? 0,
    isToday: d === today,
  }));

  const [{ value: totalSessions }] = await db
    .select({ value: count() })
    .from(focusSessions)
    .where(eq(focusSessions.userId, user.id));

  const weekTotal = week.reduce((a, b) => a + b.minutes, 0);

  const activeTasks = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.done, false)))
    .orderBy(desc(tasks.createdAt))
    .limit(5);

  const earnedBadges = await db
    .select({ key: userBadges.badgeKey, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, user.id))
    .orderBy(desc(userBadges.earnedAt));

  const recentSessions = await db
    .select({
      id: focusSessions.id,
      minutes: focusSessions.minutes,
      startedAt: focusSessions.startedAt,
      roomId: focusSessions.roomId,
      taskTitle: tasks.title,
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(eq(focusSessions.userId, user.id))
    .orderBy(desc(focusSessions.startedAt))
    .limit(6);

  return {
    todayMinutes: byDay.get(today) ?? 0,
    weekTotal,
    week,
    totalSessions,
    activeTasks,
    earnedBadges,
    recentSessions,
  };
}

/* ---------------------------- LEADERBOARD ---------------------------- */

export type LeaderRow = {
  id: number;
  username: string;
  displayName: string;
  role: string;
  avatarHue: number;
  avatarUrl: string | null;
  equippedTitle: string | null;
  equippedFrame: string | null;
  equippedLogo: string | null;
  equippedColor: string | null;
  equippedIcon: string | null;
  accountabilityActive: boolean;
  streak: number;
  minutes: number;
  badges: number;
  badgeKeys: string[];
};

const userCols = {
  id: users.id,
  username: users.username,
  displayName: users.displayName,
  role: users.role,
  avatarHue: users.avatarHue,
  avatarUrl: users.avatarUrl,
  equippedTitle: users.equippedTitle,
  equippedFrame: users.equippedFrame,
  equippedLogo: users.equippedLogo,
  equippedColor: users.equippedColor,
  equippedIcon: users.equippedIcon,
  accountabilityActive: sql<boolean>`(${users.publicAccountability} and exists (
    select 1 from ${sessionCommitments} sc
    where sc.user_id = ${users.id} and sc.status = 'broken' and sc.accountability_expires_at > now()
  ))`,
  streak: users.streak,
};

const badgesSub = sql<number>`(select count(*) from ${userBadges} ub where ub.user_id = ${users.id})`;

/** Most recent badge keys, newest first, for the leaderboard badge rail. */
const badgeKeysSub = sql<string | null>`(
  select string_agg(k, ',') from (
    select ub.badge_key as k from ${userBadges} ub
    where ub.user_id = ${users.id}
    order by ub.earned_at desc
    limit 6
  ) recent
)`;

const parseKeys = (v: string | null | undefined): string[] =>
  v ? v.split(",").filter(Boolean) : [];

export async function getLeaderboard(tab: "week" | "all" | "streak", limit = 50): Promise<LeaderRow[]> {
  if (tab === "all") {
    const rows = await db
      .select({ ...userCols, minutes: users.xp, badges: badgesSub, badgeKeys: badgeKeysSub })
      .from(users)
      .orderBy(desc(users.xp), asc(users.id))
      .limit(limit);
    return rows.map((r) => ({ ...r, minutes: Number(r.minutes), badges: Number(r.badges), badgeKeys: parseKeys(r.badgeKeys) }));
  }
  if (tab === "streak") {
    const rows = await db
      .select({ ...userCols, minutes: users.xp, badges: badgesSub, badgeKeys: badgeKeysSub })
      .from(users)
      .orderBy(desc(users.streak), desc(users.xp), asc(users.id))
      .limit(limit);
    return rows.map((r) => ({ ...r, minutes: Number(r.minutes), badges: Number(r.badges), badgeKeys: parseKeys(r.badgeKeys) }));
  }
  const start = weekStartKey();
  const rows = await db
    .select({
      ...userCols,
      minutes: sql<number>`coalesce(sum(${focusSessions.minutes}), 0)`,
      badges: badgesSub,
      badgeKeys: badgeKeysSub,
    })
    .from(users)
    .leftJoin(focusSessions, and(eq(focusSessions.userId, users.id), gte(focusSessions.day, start)))
    .groupBy(users.id)
    .orderBy(desc(sql`coalesce(sum(${focusSessions.minutes}), 0)`), asc(users.id))
    .limit(limit);
  return rows.map((r) => ({ ...r, minutes: Number(r.minutes), badges: Number(r.badges), badgeKeys: parseKeys(r.badgeKeys) }));
}

/** Separate, self-reported focus-quality metric; the existing XP/time leaderboard is unchanged. */
export async function getFocusQualityLeaderboard(limit = 5) {
  const averageQuality = sql<number>`round(avg(${focusSessions.focusQuality}))::int`;
  const scoredRounds = count(focusSessions.id);
  return db.select({
    id: users.id,
    username: users.username,
    displayName: users.displayName,
    avatarHue: users.avatarHue,
    averageQuality,
    scoredRounds,
  }).from(users)
    .innerJoin(focusSessions, eq(focusSessions.userId, users.id))
    .where(isNotNull(focusSessions.focusQuality))
    .groupBy(users.id)
    .having(sql`count(${focusSessions.id}) >= 5`)
    .orderBy(desc(averageQuality), desc(scoredRounds), asc(users.id))
    .limit(limit);
}

/* ----------------------------- CALENDAR ----------------------------- */

export async function getCalendarData(user: User, year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const next = new Date(Date.UTC(year, month, 1));
  const last = dayKey(new Date(next.getTime() - 86400000));

  const rows = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, first), lte(focusSessions.day, last)))
    .groupBy(focusSessions.day);

  const byDay = new Map(rows.map((r) => [r.day, { minutes: Number(r.minutes ?? 0), sessions: r.sessions }]));
  const monthTotal = rows.reduce((a, r) => a + Number(r.minutes ?? 0), 0);
  const activeDays = rows.filter((r) => Number(r.minutes) > 0).length;
  let bestDay: { day: string; minutes: number } | null = null;
  for (const [d, v] of byDay) {
    if (v.minutes > 0 && (!bestDay || v.minutes > bestDay.minutes)) bestDay = { day: d, minutes: v.minutes };
  }
  return { byDay, monthTotal, activeDays, bestDay };
}

/* ------------------------------ TASKS ------------------------------ */

export async function getAllTasks(user: User) {
  return db.select().from(tasks).where(eq(tasks.userId, user.id)).orderBy(asc(tasks.done), desc(tasks.createdAt));
}

export async function getActiveTasks(user: User) {
  return db
    .select({ id: tasks.id, title: tasks.title, priority: tasks.priority })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.done, false)))
    .orderBy(desc(tasks.createdAt))
    .limit(30);
}

/** Distinct project tags the user has used, most-used first. */
export async function getRecentProjects(user: User, limit = 8): Promise<string[]> {
  const rows = await db
    .select({ project: focusSessions.project, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), sql`${focusSessions.project} is not null`))
    .groupBy(focusSessions.project)
    .orderBy(desc(sum(focusSessions.minutes)))
    .limit(limit);
  return rows.map((r) => r.project).filter((p): p is string => Boolean(p));
}

export type ProjectStat = { name: string; minutes: number; sessions: number };

/** Raw session log for the History page (filterable by project). */
export async function getSessionHistory(user: User, project?: string | null, limit = 40) {
  const conds = [eq(focusSessions.userId, user.id)];
  if (project) conds.push(eq(focusSessions.project, project));
  const rows = await db
    .select({
      id: focusSessions.id,
      startedAt: focusSessions.startedAt,
      day: focusSessions.day,
      minutes: focusSessions.minutes,
      project: focusSessions.project,
      note: focusSessions.note,
      roomId: focusSessions.roomId,
      task: tasks.title,
      energyRating: focusSessions.energyRating,
      focusQuality: focusSessions.focusQuality,
      verificationStatus: focusSessions.verificationStatus,
      completedAt: focusSessions.completedAt,
      intendedOutcome: sessionCommitments.intendedOutcome,
      consequence: sessionCommitments.consequence,
      commitmentStatus: sessionCommitments.status,
      commitmentResolvedAt: sessionCommitments.resolvedAt,
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .leftJoin(sessionCommitments, and(eq(sessionCommitments.runKey, focusSessions.runKey), eq(sessionCommitments.userId, user.id)))
    .where(and(...conds))
    .orderBy(desc(focusSessions.startedAt))
    .limit(limit);
  return rows;
}

export async function getCommitmentHistory(user: User, limit = 50) {
  return db.select({
    runKey: sessionCommitments.runKey,
    intendedOutcome: sessionCommitments.intendedOutcome,
    consequence: sessionCommitments.consequence,
    status: sessionCommitments.status,
    createdAt: sessionCommitments.createdAt,
    resolvedAt: sessionCommitments.resolvedAt,
    plannedMinutes: focusSessionRuns.plannedMinutes,
    runStatus: focusSessionRuns.status,
    startedAt: focusSessionRuns.startedAt,
    endedAt: focusSessionRuns.endedAt,
  }).from(sessionCommitments)
    .innerJoin(focusSessionRuns, eq(focusSessionRuns.runKey, sessionCommitments.runKey))
    .where(and(eq(sessionCommitments.userId, user.id), eq(focusSessionRuns.userId, user.id)))
    .orderBy(desc(sessionCommitments.createdAt)).limit(limit);
}

/** Private user-only summaries; no commitment text or energy history enters public queries. */
export async function getPersonalFocusInsights(user: User) {
  const rows = await db.select({
    energyRating: focusSessions.energyRating,
    minutes: focusSessions.minutes,
    focusQuality: focusSessions.focusQuality,
    verificationStatus: focusSessions.verificationStatus,
    startedAt: focusSessions.startedAt,
  }).from(focusSessions)
    .where(eq(focusSessions.userId, user.id))
    .orderBy(desc(focusSessions.startedAt)).limit(1000);
  const commitmentAgg = await db.execute(sql`
    select
      count(*) filter (where status = 'fulfilled')::int as fulfilled,
      count(*) filter (where status = 'broken')::int as broken,
      count(*) filter (where status = 'unresolved')::int as unresolved
    from ${sessionCommitments} where user_id = ${user.id}
  `);
  const c = (commitmentAgg.rows[0] ?? {}) as Record<string, unknown>;
  const countValue = (value: unknown) => Number(value ?? 0);
  const verification = rows.reduce((acc, row) => {
    const status = row.verificationStatus;
    if (status === "verified") acc.verified++;
    else if (status === "partially_verified") acc.partial++;
    else if (status === "unverified" || status === "unavailable") acc.unverified++;
    return acc;
  }, { verified: 0, partial: 0, unverified: 0 });
  const energy = energyOutcomeStats(rows.map((row) => ({ energyRating: row.energyRating, minutes: row.minutes, focusQuality: row.focusQuality })));
  const endedRuns = await db.select({ energyRating: focusSessionRuns.energyRating, status: focusSessionRuns.status })
    .from(focusSessionRuns)
    .where(and(eq(focusSessionRuns.userId, user.id), ne(focusSessionRuns.status, "active")))
    .orderBy(desc(focusSessionRuns.startedAt)).limit(1000);
  const completionByEnergy = [1, 2, 3, 4, 5].map((rating) => {
    const group = endedRuns.filter((run) => run.energyRating === rating);
    const completed = group.filter((run) => run.status === "completed").length;
    return { rating, attempts: group.length, completed, percentage: group.length ? Math.round((completed / group.length) * 100) : null };
  });
  const byUtcHour = new Map<number, { count: number; minutes: number }>();
  const byUtcWeekday = new Map<number, { count: number; minutes: number }>();
  for (const row of rows) {
    if (row.energyRating === null) continue;
    const hour = row.startedAt.getUTCHours();
    const weekday = row.startedAt.getUTCDay();
    const h = byUtcHour.get(hour) ?? { count: 0, minutes: 0 }; h.count++; h.minutes += row.minutes; byUtcHour.set(hour, h);
    const d = byUtcWeekday.get(weekday) ?? { count: 0, minutes: 0 }; d.count++; d.minutes += row.minutes; byUtcWeekday.set(weekday, d);
  }
  const pattern = (map: Map<number, { count: number; minutes: number }>) => [...map.entries()].map(([key, value]) => ({ key, count: value.count, averageMinutes: Math.round((value.minutes / value.count) * 10) / 10 }));
  const hourPatterns = pattern(byUtcHour);
  const weekdayPatterns = pattern(byUtcWeekday);
  const bestUtcHour = hourPatterns.filter((item) => item.count >= 3).sort((a, b) => b.averageMinutes - a.averageMinutes)[0] ?? null;
  const bestUtcWeekday = weekdayPatterns.filter((item) => item.count >= 3).sort((a, b) => b.averageMinutes - a.averageMinutes)[0] ?? null;
  return {
    commitments: { ...commitmentFulfillment(countValue(c.fulfilled), countValue(c.broken)), unresolved: countValue(c.unresolved) },
    energy,
    completionByEnergy,
    verification,
    byUtcHour: hourPatterns,
    byUtcWeekday: weekdayPatterns,
    bestUtcHour,
    bestUtcWeekday: bestUtcWeekday ? { ...bestUtcWeekday, label: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][bestUtcWeekday.key] } : null,
    sampleSessions: rows.length,
  };
}

export async function getProjectBreakdown(user: User, limit = 8): Promise<ProjectStat[]> {
  const rows = await db
    .select({ project: focusSessions.project, minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), sql`${focusSessions.project} is not null`))
    .groupBy(focusSessions.project)
    .orderBy(desc(sum(focusSessions.minutes)))
    .limit(limit);
  return rows.map((r) => ({ name: r.project ?? "—", minutes: Number(r.minutes ?? 0), sessions: r.sessions }));
}

export async function getFocusContext(user: User) {
  const today = dayKey();
  const active = await getActiveTasks(user);
  const [{ value: doneToday }] = await db
    .select({ value: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), eq(focusSessions.day, today)));
  const [{ value: minToday }] = await db
    .select({ value: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), eq(focusSessions.day, today)));
  return { activeTasks: active, doneToday, todayMinutes: Number(minToday ?? 0) };
}

/* ------------------------------ SQUADS ------------------------------ */

export type SquadCard = {
  id: number;
  name: string;
  code: string;
  memberCount: number;
  weekMinutes: number;
  isOwner: boolean;
};

export async function getMySquads(user: User): Promise<SquadCard[]> {
  const start = weekStartKey();
  const rows = await db
    .select({
      id: squads.id,
      name: squads.name,
      code: squads.code,
      createdBy: squads.createdBy,
      memberCount: sql<number>`(select count(*) from ${squadMembers} sm where sm.squad_id = ${squads.id})`,
      weekMinutes: sql<number>`coalesce((
        select sum(fs.minutes) from ${focusSessions} fs
        join ${squadMembers} sm2 on sm2.user_id = fs.user_id
        where sm2.squad_id = ${squads.id} and fs.day >= ${start}
      ), 0)`,
    })
    .from(squadMembers)
    .innerJoin(squads, eq(squadMembers.squadId, squads.id))
    .where(eq(squadMembers.userId, user.id))
    .orderBy(desc(squads.createdAt));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    code: r.code,
    memberCount: Number(r.memberCount),
    weekMinutes: Number(r.weekMinutes),
    isOwner: r.createdBy === user.id,
  }));
}

export async function getSquadDetail(user: User, squadId: number) {
  const rows = await db.select().from(squads).where(eq(squads.id, squadId)).limit(1);
  const squad = rows[0];
  if (!squad) return null;

  const member = await db
    .select({ userId: squadMembers.userId })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, user.id)))
    .limit(1);
  if (member.length === 0) return null;

  const start = weekStartKey();
  const members = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      avatarHue: users.avatarHue,
      avatarUrl: users.avatarUrl,
      streak: users.streak,
      xp: users.xp,
      weekMinutes: sql<number>`coalesce((
        select sum(fs.minutes) from ${focusSessions} fs
        where fs.user_id = ${users.id} and fs.day >= ${start}
      ), 0)`,
      joinedAt: squadMembers.joinedAt,
    })
    .from(squadMembers)
    .innerJoin(users, eq(squadMembers.userId, users.id))
    .where(eq(squadMembers.squadId, squadId))
    .orderBy(desc(sql`coalesce((select sum(fs.minutes) from focus_sessions fs where fs.user_id = ${users.id} and fs.day >= ${start}), 0)`));

  return {
    squad,
    isOwner: squad.createdBy === user.id,
    members: members.map((m) => ({ ...m, weekMinutes: Number(m.weekMinutes) })),
  };
}

export async function getTrophyCase(user: User) {
  const earned = await db
    .select({ key: userBadges.badgeKey, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, user.id))
    .orderBy(asc(userBadges.earnedAt));
  return earned
    .map((e) => ({ ...e, def: badgeByKey(e.key) }))
    .filter((e) => e.def !== undefined);
}

/* ----------------------------- PROFILE ----------------------------- */

export async function getProfile(username: string) {
  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  if (!user) return null;

  const [sess] = await db.select({ value: count() }).from(focusSessions).where(eq(focusSessions.userId, user.id));
  const [grp] = await db
    .select({ value: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), isNotNull(focusSessions.roomId)));
  const [td] = await db
    .select({ value: count() })
    .from(tasks)
    .where(and(eq(tasks.userId, user.id), eq(tasks.done, true)));
  const [daysRow] = await db
    .select({ value: sql<number>`count(distinct ${focusSessions.day})` })
    .from(focusSessions)
    .where(eq(focusSessions.userId, user.id));

  const bestDayRows = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(eq(focusSessions.userId, user.id))
    .groupBy(focusSessions.day)
    .orderBy(desc(sum(focusSessions.minutes)))
    .limit(1);

  const earned = await db
    .select({ key: userBadges.badgeKey, earnedAt: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, user.id))
    .orderBy(asc(userBadges.earnedAt));

  const recentSessions = await db
    .select({
      id: focusSessions.id,
      minutes: focusSessions.minutes,
      startedAt: focusSessions.startedAt,
      roomId: focusSessions.roomId,
      taskTitle: tasks.title,
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(eq(focusSessions.userId, user.id))
    .orderBy(desc(focusSessions.startedAt))
    .limit(8);

  const squadsOf = await db
    .select({ id: squads.id, name: squads.name })
    .from(squadMembers)
    .innerJoin(squads, eq(squadMembers.squadId, squads.id))
    .where(eq(squadMembers.userId, user.id))
    .limit(6);

  // GitHub-style contribution grid — last 182 days (26 weeks)
  const gridDays = lastNDays(182);
  const gridRows = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, gridDays[0])))
    .groupBy(focusSessions.day);
  const gridMap = new Map(gridRows.map((r) => [r.day, Number(r.minutes ?? 0)]));
  const contributions = gridDays.map((d) => ({ day: d, minutes: gridMap.get(d) ?? 0 }));

  const projectRows = await db
    .select({ project: focusSessions.project, minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), sql`${focusSessions.project} is not null`))
    .groupBy(focusSessions.project)
    .orderBy(desc(sum(focusSessions.minutes)))
    .limit(8);

  return {
    user,
    contributions,
    projects: projectRows.map((r) => ({ name: r.project ?? "—", minutes: Number(r.minutes ?? 0), sessions: r.sessions })),
    stats: {
      sessions: sess.value,
      groupSessions: grp.value,
      tasksDone: td.value,
      activeDays: Number(daysRow.value),
      bestDay: bestDayRows[0] ? { day: bestDayRows[0].day, minutes: Number(bestDayRows[0].minutes ?? 0) } : null,
    },
    earnedBadges: earned.map((e) => ({ ...e, def: badgeByKey(e.key) })).filter((e) => e.def !== undefined),
    recentSessions,
    squads: squadsOf,
  };
}

/* ------------------------------ ROOMS ------------------------------ */

export type RoomCard = {
  id: number;
  code: string;
  name: string;
  status: string;
  currentRound: number;
  totalRounds: number;
  focusMinutes: number;
  breakMinutes: number;
  hostName: string;
  hostId: number;
  memberCount: number;
  createdAt: Date;
};

export async function getMyRooms(user: User): Promise<RoomCard[]> {
  const rows = await db
    .select({
      id: rooms.id,
      code: rooms.code,
      name: rooms.name,
      status: rooms.status,
      currentRound: rooms.currentRound,
      totalRounds: rooms.totalRounds,
      focusMinutes: rooms.focusMinutes,
      breakMinutes: rooms.breakMinutes,
      hostId: rooms.hostId,
      createdAt: rooms.createdAt,
      hostName: users.displayName,
      memberCount: sql<number>`(select count(*) from ${roomMembers} rm where rm.room_id = ${rooms.id})`,
    })
    .from(roomMembers)
    .innerJoin(rooms, eq(roomMembers.roomId, rooms.id))
    .innerJoin(users, eq(rooms.hostId, users.id))
    .where(eq(roomMembers.userId, user.id))
    .orderBy(desc(rooms.createdAt))
    .limit(20);

  const rank = (s: string) => (s === "lobby" ? 0 : s === "focus" ? 1 : s === "break" ? 2 : 3);
  return rows
    .map((r) => ({ ...r, memberCount: Number(r.memberCount) }))
    .sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getRoomByCode(code: string) {
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  return rows[0] ?? null;
}

/* ------------------------------ ADMIN ------------------------------ */

export async function getAdminData() {
  const [u] = await db.select({ value: count() }).from(users);
  const [s] = await db.select({ value: count() }).from(focusSessions);
  const [m] = await db.select({ value: sum(focusSessions.minutes) }).from(focusSessions);
  const today = dayKey();
  const [ts] = await db
    .select({ value: count() })
    .from(focusSessions)
    .where(eq(focusSessions.day, today));
  const [ar] = await db
    .select({ value: count() })
    .from(rooms)
    .where(ne(rooms.status, "done"));
  const [bg] = await db.select({ value: count() }).from(userBadges);

  const allUsers = await db
    .select({
      id: users.id,
      username: users.username,
      displayName: users.displayName,
      role: users.role,
      avatarHue: users.avatarHue,
      avatarUrl: users.avatarUrl,
      xp: users.xp,
      streak: users.streak,
      createdAt: users.createdAt,
      sessions: sql<number>`(select count(*) from ${focusSessions} fs where fs.user_id = ${users.id})`,
      badges: sql<number>`(select count(*) from ${userBadges} ub where ub.user_id = ${users.id})`,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);

  const recent = await db
    .select({
      id: focusSessions.id,
      minutes: focusSessions.minutes,
      startedAt: focusSessions.startedAt,
      userName: users.displayName,
      userHue: users.avatarHue,
      userAvatarUrl: users.avatarUrl,
    })
    .from(focusSessions)
    .innerJoin(users, eq(focusSessions.userId, users.id))
    .orderBy(desc(focusSessions.startedAt))
    .limit(10);

  return {
    totals: {
      users: u.value,
      sessions: s.value,
      minutes: Number(m.value ?? 0),
      sessionsToday: ts.value,
      activeRooms: ar.value,
      badgesGiven: bg.value,
    },
    users: allUsers.map((x) => ({ ...x, sessions: Number(x.sessions), badges: Number(x.badges) })),
    recent,
  };
}
