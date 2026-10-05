import { and, eq, gte, sql, desc, count, sum } from "drizzle-orm";
import { db } from "@/db";
import { users, focusSessions, userBadges, type User } from "@/db/schema";
import { badgeByKey } from "@/lib/xp";
import { dayKey, lastNDays, addDays, dayLabel } from "@/lib/dates";

/* ----------------------------- ARENA PULSE ----------------------------- */

export type PulseItem = {
  kind: "session" | "badge" | "joined" | "squad";
  at: string;
  username: string;
  displayName: string;
  avatarHue: number;
  avatarUrl?: string | null;
  minutes?: number;
  badgeName?: string;
  badgeIcon?: string;
  badgeHue?: number;
  squadName?: string;
};

/** Cross-user live activity feed for the whole arena. */
export async function getArenaPulse(limit = 14): Promise<PulseItem[]> {
  const res = await db.execute(sql`
    select * from (
      select 'session' as kind, fs.started_at as at, u.username, u.display_name, u.avatar_hue,
             fs.minutes as n, null::text as s
      from focus_sessions fs join users u on u.id = fs.user_id
      union all
      select 'badge', ub.earned_at, u.username, u.display_name, u.avatar_hue, null, ub.badge_key
      from user_badges ub join users u on u.id = ub.user_id
      union all
      select 'joined', u.created_at, u.username, u.display_name, u.avatar_hue, null, null
      from users u
      union all
      select 'squad', s.created_at, u.username, u.display_name, u.avatar_hue, null, s.name
      from squads s join users u on u.id = s.created_by
    ) feed
    order by at desc
    limit ${limit}
  `);

  return res.rows.map((r: Record<string, unknown>) => {
    const kind = r.kind as PulseItem["kind"];
    const item: PulseItem = {
      kind,
      at: new Date(r.at as string | Date).toISOString(),
      username: r.username as string,
      displayName: r.display_name as string,
      avatarHue: r.avatar_hue as number,
      avatarUrl: (r.avatar_url as string | null) ?? null,
    };
    if (kind === "session") item.minutes = Number(r.n);
    if (kind === "badge") {
      const def = badgeByKey(r.s as string);
      item.badgeName = def?.name ?? "a badge";
      item.badgeIcon = def?.icon;
      item.badgeHue = def?.hue;
    }
    if (kind === "squad") item.squadName = r.s as string;
    return item;
  });
}

/* ---------------------------- ARENA TOTALS ---------------------------- */

/** Public counters for the landing page band. */
export async function getArenaTotals() {
  const [u] = await db.select({ value: count() }).from(users);
  const [s] = await db.select({ value: count() }).from(focusSessions);
  const [m] = await db.select({ value: sum(focusSessions.minutes) }).from(focusSessions);
  const [b] = await db.select({ value: count() }).from(userBadges);
  return {
    players: u.value,
    sessions: s.value,
    minutes: Number(m.value ?? 0),
    badgesGiven: b.value,
  };
}

/* ---------------------------- WEEK COMPARE ---------------------------- */

/** This week vs last week minutes → percentage delta. */
export async function getWeekDelta(user: User, currentWeekTotal: number) {
  const weekStart = addDays(lastNDays(7)[0], 0); // seven[0] is 6 days ago; for a clean comparison use rolling windows
  const prevStart = addDays(weekStart, -7);
  const prevEnd = addDays(weekStart, -1);
  const rows = await db
    .select({ minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, prevStart), sql`${focusSessions.day} <= ${prevEnd}`));
  const prev = Number(rows[0]?.minutes ?? 0);
  if (prev === 0) return { prev, pct: currentWeekTotal > 0 ? 100 : 0 };
  return { prev, pct: Math.round(((currentWeekTotal - prev) / prev) * 100) };
}

/* -------------------------- CALENDAR INSIGHTS -------------------------- */

export type CalendarInsights = {
  weekdayAvg: { label: string; avg: number }[]; // Mon..Sun averages
  bestHour: number | null;
  longestSession: number;
  avgPerActiveDay: number;
  activeDays: number;
  weeklyTotals: { label: string; minutes: number }[]; // last 6 weeks
};

export async function getCalendarInsights(user: User): Promise<CalendarInsights> {
  const days = lastNDays(56);
  const dayRows = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, days[0])))
    .groupBy(focusSessions.day);
  const byDay = new Map(dayRows.map((r) => [r.day, Number(r.minutes ?? 0)]));

  // weekday averages
  const sums = [0, 0, 0, 0, 0, 0, 0];
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of days) {
    const dow = (new Date(d + "T00:00:00Z").getUTCDay() + 6) % 7;
    sums[dow] += byDay.get(d) ?? 0;
    counts[dow]++;
  }
  const weekdayAvg = sums.map((s, i) => ({ label: dayLabel(addDays(days[0], 0)) && ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][i], avg: Math.round(s / Math.max(1, counts[i])) }));

  // active day stats
  let activeDays = 0;
  let totalMin = 0;
  for (const v of byDay.values()) if (v > 0) { activeDays++; totalMin += v; }

  // sessions: longest + hour histogram (last 400)
  const sess = await db
    .select({ minutes: focusSessions.minutes, startedAt: focusSessions.startedAt })
    .from(focusSessions)
    .where(eq(focusSessions.userId, user.id))
    .orderBy(desc(focusSessions.startedAt))
    .limit(400);
  let longestSession = 0;
  const hourMin = new Array<number>(24).fill(0);
  for (const s of sess) {
    if (s.minutes > longestSession) longestSession = s.minutes;
    hourMin[new Date(s.startedAt).getUTCHours()] += s.minutes;
  }
  let bestHour: number | null = null;
  let bestVal = 0;
  hourMin.forEach((v, h) => { if (v > bestVal) { bestVal = v; bestHour = h; } });

  // last 6 ISO weeks totals
  const weeklyTotals: { label: string; minutes: number }[] = [];
  for (let w = 5; w >= 0; w--) {
    const weekDays = lastNDays(7, addDays(dayKey(), -w * 7 - 1));
    // take Mon..Sun slice: use 7 days ending Sunday of that week — approximate by window
    const total = weekDays.reduce((a, d) => a + (byDay.get(d) ?? 0), 0);
    weeklyTotals.push({ label: w === 0 ? "Now" : `${w}w`, minutes: total });
  }

  return {
    weekdayAvg,
    bestHour,
    longestSession,
    avgPerActiveDay: activeDays ? Math.round(totalMin / activeDays) : 0,
    activeDays,
    weeklyTotals,
  };
}
