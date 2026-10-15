import { and, count, desc, eq, gte, gt, isNotNull, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import { distractionEvents, focusSessionRuns, focusSessions } from "@/db/schema";
import { distractionsPerHour } from "@/lib/feature-metrics";
import { lastNDays } from "@/lib/dates";

export async function getDistractionAnalytics(userId: number) {
  const utcHour = sql<number>`extract(hour from (${distractionEvents.createdAt} at time zone 'UTC'))::int`;
  const utcDay = sql<string>`to_char(${distractionEvents.createdAt} at time zone 'UTC', 'YYYY-MM-DD')`;
  const recentCutoff = new Date(Date.now() - 29 * 86_400_000);
  const completedEventFilter = and(
    eq(distractionEvents.userId, userId),
    eq(focusSessionRuns.status, "completed"),
    isNotNull(focusSessionRuns.focusSessionId),
  );
  const validSessionFilter = and(
    eq(focusSessions.userId, userId),
    isNotNull(focusSessions.runKey),
    isNotNull(focusSessions.focusQuality),
    gt(focusSessions.minutes, 0),
  );

  const [eventTotals, sessionTotals, sources, hours, trend, sessions] = await Promise.all([
    db.select({ total: count() })
      .from(distractionEvents)
      .innerJoin(focusSessionRuns, eq(distractionEvents.runKey, focusSessionRuns.runKey))
      .where(completedEventFilter),
    db.select({ minutes: sum(focusSessions.minutes), sessions: count() })
      .from(focusSessions).where(validSessionFilter),
    db.select({ source: distractionEvents.source, total: count() })
      .from(distractionEvents)
      .innerJoin(focusSessionRuns, eq(distractionEvents.runKey, focusSessionRuns.runKey))
      .where(completedEventFilter)
      .groupBy(distractionEvents.source)
      .orderBy(desc(count())),
    db.select({ hour: utcHour, total: count() })
      .from(distractionEvents)
      .innerJoin(focusSessionRuns, eq(distractionEvents.runKey, focusSessionRuns.runKey))
      .where(completedEventFilter)
      .groupBy(utcHour)
      .orderBy(desc(count())),
    db.select({ day: utcDay, total: count() })
      .from(distractionEvents)
      .innerJoin(focusSessionRuns, eq(distractionEvents.runKey, focusSessionRuns.runKey))
      .where(and(completedEventFilter, gte(distractionEvents.createdAt, recentCutoff)))
      .groupBy(utcDay)
      .orderBy(utcDay),
    db.select({
      sessionId: focusSessions.id,
      minutes: focusSessions.minutes,
      quality: focusSessions.focusQuality,
      startedAt: focusSessions.startedAt,
      total: count(distractionEvents.id),
    })
      .from(focusSessions)
      .innerJoin(focusSessionRuns, eq(focusSessions.id, focusSessionRuns.focusSessionId))
      .leftJoin(distractionEvents, and(
        eq(distractionEvents.runKey, focusSessionRuns.runKey),
        eq(distractionEvents.userId, userId),
      ))
      .where(and(validSessionFilter, eq(focusSessionRuns.status, "completed")))
      .groupBy(focusSessions.id)
      .orderBy(desc(focusSessions.startedAt))
      .limit(15),
  ]);

  const total = Number(eventTotals[0]?.total ?? 0);
  const focusMinutes = Number(sessionTotals[0]?.minutes ?? 0);
  const sourceCounts = sources.map((row) => ({
    source: row.source,
    total: Number(row.total),
    percent: total > 0 ? Math.round((Number(row.total) / total) * 100) : 0,
  }));
  const hourCounts = hours.map((row) => ({ hour: Number(row.hour), total: Number(row.total) }));
  const busiestHour = [...hourCounts].sort((a, b) => b.total - a.total)[0] ?? null;
  const trendByDay = new Map(trend.map((row) => [row.day, Number(row.total)]));

  return {
    total,
    focusMinutes,
    completedSessions: Number(sessionTotals[0]?.sessions ?? 0),
    perHour: distractionsPerHour(total, focusMinutes),
    sourceCounts,
    busiestHour,
    hourCounts,
    trend: lastNDays(30).map((day) => ({ day, total: trendByDay.get(day) ?? 0 })),
    sessions: sessions.map((row) => ({
      id: row.sessionId,
      minutes: row.minutes,
      quality: row.quality,
      startedAt: row.startedAt.toISOString(),
      distractions: Number(row.total),
    })),
    timezone: "UTC" as const,
  };
}
