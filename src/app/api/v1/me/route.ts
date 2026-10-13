import { and, desc, eq, gte, sql, sum, count } from "drizzle-orm";
import { db } from "@/db";
import { users, focusSessions, userBadges } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { levelProgress, badgeByKey, badgeScore } from "@/lib/xp";
import { dayKey, lastNDays, weekStartKey } from "@/lib/dates";

export const dynamic = "force-dynamic";

/**
 * Personal stats API.
 *   curl "https://your-app/api/v1/me?key=fa_xxx"
 * Also works with an active browser session (no key needed).
 * Great for status bars, CLI scripts, Raycast/Alfred widgets or a README badge.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");

  let user = null;
  if (key) {
    const rows = await db.select().from(users).where(eq(users.apiKey, key)).limit(1);
    user = rows[0] ?? null;
  } else {
    user = await getSessionUser();
  }
  if (!user) {
    return Response.json({ error: "unauthorized", hint: "pass ?key=... or sign in" }, { status: 401 });
  }

  const today = dayKey();
  const week = lastNDays(7);
  const [todayAgg] = await db
    .select({ minutes: sum(focusSessions.minutes), sessions: count() })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), eq(focusSessions.day, today)));
  const [weekAgg] = await db
    .select({ minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, weekStartKey())));

  const daily = await db
    .select({ day: focusSessions.day, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), gte(focusSessions.day, week[0])))
    .groupBy(focusSessions.day);

  const projects = await db
    .select({ project: focusSessions.project, minutes: sum(focusSessions.minutes) })
    .from(focusSessions)
    .where(and(eq(focusSessions.userId, user.id), sql`${focusSessions.project} is not null`))
    .groupBy(focusSessions.project)
    .orderBy(desc(sum(focusSessions.minutes)))
    .limit(10);

  const badges = await db
    .select({ key: userBadges.badgeKey, at: userBadges.earnedAt })
    .from(userBadges)
    .where(eq(userBadges.userId, user.id))
    .orderBy(desc(userBadges.earnedAt));

  const prog = levelProgress(user.xp);
  const byDay = new Map(daily.map((d) => [d.day, Number(d.minutes ?? 0)]));

  return Response.json(
    {
      user: {
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        joinedAt: user.createdAt,
      },
      level: { level: prog.level, xp: user.xp, into: prog.into, next: prog.nextIn, pct: prog.pct },
      streak: user.streak,
      goal: { minutes: user.dailyGoal, reached: Number(todayAgg.minutes ?? 0) >= user.dailyGoal },
      today: { minutes: Number(todayAgg.minutes ?? 0), sessions: todayAgg.sessions },
      week: { minutes: Number(weekAgg.minutes ?? 0), days: week.map((d) => ({ day: d, minutes: byDay.get(d) ?? 0 })) },
      projects: projects.map((p) => ({ name: p.project, minutes: Number(p.minutes ?? 0) })),
      badges: {
        count: badges.length,
        score: badgeScore(badges.map((b) => b.key)),
        list: badges
          .map((b) => {
            const def = badgeByKey(b.key);
            return def ? { key: def.key, name: def.name, tier: def.tier, earnedAt: b.at } : null;
          })
          .filter(Boolean),
      },
    },
    { headers: { "cache-control": "no-store" } }
  );
}
