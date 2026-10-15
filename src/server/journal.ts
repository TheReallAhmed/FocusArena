"use server";

import { and, count, desc, eq, gte, ilike, isNotNull, lte, ne, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { deepWorkJournal, focusSessions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { journalStreakStats } from "@/lib/feature-metrics";
import { isValidTimeZone, localDayInTimeZone } from "@/lib/time-zones";

function validTimeZone(value: string): boolean {
  return isValidTimeZone(value);
}

function localDayInZone(date: Date, timeZone: string): string {
  return localDayInTimeZone(date, timeZone);
}

function validDay(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export async function saveJournalAction(input: {
  localDay: string;
  timeZone: string;
  wentWell: string;
  blockers: string;
  tomorrowPriority: string;
  complete: boolean;
}) {
  const user = await getSessionUser();
  if (!user) return { error: "Sign in to save your journal." };
  if (!input || typeof input !== "object") return { error: "Enter valid journal details." };
  if (typeof input.localDay !== "string" || !validDay(input.localDay)) return { error: "Choose a valid calendar day." };
  if (typeof input.timeZone !== "string" || !validTimeZone(input.timeZone)) return { error: "Choose a valid time zone." };
  if (typeof input.wentWell !== "string" || typeof input.blockers !== "string" || typeof input.tomorrowPriority !== "string") return { error: "Enter valid journal text." };
  if (input.wentWell.length > 1200 || input.blockers.length > 1200 || input.tomorrowPriority.length > 600) return { error: "One or more responses exceed the allowed length." };
  const wentWell = input.wentWell.trim().slice(0, 1200);
  const blockers = input.blockers.trim().slice(0, 1200);
  const tomorrowPriority = input.tomorrowPriority.trim().slice(0, 600);
  const today = localDayInZone(new Date(), input.timeZone);
  if (input.localDay > today) return { error: "Future-day entries are not allowed." };
  const complete = input.complete === true;
  if (complete && (!wentWell || !blockers || !tomorrowPriority)) return { error: "Complete the three reflection prompts before marking the day done." };
  const now = new Date();

  await db.insert(deepWorkJournal).values({
    userId: user.id,
    localDay: input.localDay,
    timeZone: input.timeZone,
    wentWell,
    blockers,
    tomorrowPriority,
    completedAt: complete ? now : null,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [deepWorkJournal.userId, deepWorkJournal.localDay],
    set: {
      timeZone: input.timeZone,
      wentWell,
      blockers,
      tomorrowPriority,
      completedAt: complete
        ? now
        : sql`case when ${wentWell} <> '' and ${blockers} <> '' and ${tomorrowPriority} <> '' then ${deepWorkJournal.completedAt} else null end`,
      updatedAt: now,
    },
  });
  revalidatePath("/journal");
  return { ok: true, message: complete ? "Reflection completed and saved." : "Draft saved." };
}

export async function getJournalPageData(input: {
  localDay: string;
  month: string;
  timeZone: string;
  search: string;
  page: number;
  fromDay?: string;
  toDay?: string;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const userId = user.id;
  const timeZone = validTimeZone(input.timeZone) ? input.timeZone : "UTC";
  const localDay = validDay(input.localDay) ? input.localDay : localDayInZone(new Date(), timeZone);
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) ? input.month : localDay.slice(0, 7);
  const monthFirst = `${month}-01`;
  const nextMonthDate = new Date(`${monthFirst}T00:00:00.000Z`);
  nextMonthDate.setUTCMonth(nextMonthDate.getUTCMonth() + 1);
  const monthLast = new Date(nextMonthDate.getTime() - 86_400_000).toISOString().slice(0, 10);
  const search = (typeof input.search === "string" ? input.search : "").trim().slice(0, 100);
  const page = Math.max(1, Math.min(10_000, Math.floor(input.page) || 1));
  const pageSize = 20;
  const filters = [eq(deepWorkJournal.userId, userId)];
  const fromDay = input.fromDay && validDay(input.fromDay) ? input.fromDay : "";
  const toDay = input.toDay && validDay(input.toDay) ? input.toDay : "";
  const invalidRange = Boolean(fromDay && toDay && fromDay > toDay);
  if (invalidRange) filters.push(sql`false`);
  else if (fromDay && toDay) {
    filters.push(gte(deepWorkJournal.localDay, fromDay), lte(deepWorkJournal.localDay, toDay));
  } else if (fromDay && !toDay) filters.push(gte(deepWorkJournal.localDay, fromDay));
  else if (toDay && !fromDay) filters.push(lte(deepWorkJournal.localDay, toDay));
  if (search) filters.push(or(
    ilike(deepWorkJournal.wentWell, `%${search}%`),
    ilike(deepWorkJournal.blockers, `%${search}%`),
    ilike(deepWorkJournal.tomorrowPriority, `%${search}%`),
  )!);
  const filter = and(...filters);

  const [selectedRows, monthRows, completedRows, countRows, historyRows, commonBlockers, commonPriorities, selectedSessions] = await Promise.all([
    db.select().from(deepWorkJournal).where(and(eq(deepWorkJournal.userId, userId), eq(deepWorkJournal.localDay, localDay))).limit(1),
    db.select({ localDay: deepWorkJournal.localDay, completedAt: deepWorkJournal.completedAt })
      .from(deepWorkJournal).where(and(eq(deepWorkJournal.userId, userId), gte(deepWorkJournal.localDay, monthFirst), lte(deepWorkJournal.localDay, monthLast))),
    db.select({ localDay: deepWorkJournal.localDay }).from(deepWorkJournal)
      .where(and(eq(deepWorkJournal.userId, userId), isNotNull(deepWorkJournal.completedAt))),
    db.select({ total: count() }).from(deepWorkJournal).where(filter),
    db.select().from(deepWorkJournal).where(filter).orderBy(desc(deepWorkJournal.localDay)).limit(pageSize).offset((page - 1) * pageSize),
    db.select({ blockers: deepWorkJournal.blockers, total: count() }).from(deepWorkJournal)
      .where(and(eq(deepWorkJournal.userId, userId), ne(deepWorkJournal.blockers, "")))
      .groupBy(deepWorkJournal.blockers).orderBy(desc(count())).limit(5),
    db.select({ priority: deepWorkJournal.tomorrowPriority, total: count() }).from(deepWorkJournal)
      .where(and(eq(deepWorkJournal.userId, userId), ne(deepWorkJournal.tomorrowPriority, "")))
      .groupBy(deepWorkJournal.tomorrowPriority).orderBy(desc(count())).limit(5),
    (() => {
      const midnightUtc = new Date(`${localDay}T00:00:00.000Z`).getTime();
      const from = new Date(midnightUtc - 14 * 60 * 60 * 1000);
      const to = new Date(midnightUtc + 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000);
      return db.select({ startedAt: focusSessions.startedAt, minutes: focusSessions.minutes, quality: focusSessions.focusQuality }).from(focusSessions)
        .where(and(eq(focusSessions.userId, userId), gte(focusSessions.startedAt, from), lte(focusSessions.startedAt, to), isNotNull(focusSessions.startedAt)));
    })(),
  ]);

  const localSessionRows = selectedSessions.filter((row) => localDayInZone(row.startedAt, selectedRows[0]?.timeZone ?? timeZone) === localDay);
  const totalPages = Math.max(1, Math.ceil(Number(countRows[0]?.total ?? 0) / pageSize));
  const days = completedRows.map((row) => row.localDay);
  return {
    selected: selectedRows[0] ?? null,
    monthEntries: monthRows,
    today: localDayInZone(new Date(), timeZone),
    streak: journalStreakStats(days, localDayInZone(new Date(), timeZone)),
    totalEntries: days.length,
    historyMatches: Number(countRows[0]?.total ?? 0),
    history: historyRows,
    currentPage: page,
    totalPages,
    query: search,
    fromDay,
    toDay,
    invalidRange,
    blockers: commonBlockers.filter((row) => row.blockers.trim()).map((row) => ({ text: row.blockers, total: Number(row.total) })),
    priorities: commonPriorities.filter((row) => row.priority.trim()).map((row) => ({ text: row.priority, total: Number(row.total) })),
    dayFocusMinutes: localSessionRows.reduce((total, row) => total + Math.max(0, row.minutes), 0),
    dayFocusSessions: localSessionRows.length,
    dayAverageQuality: localSessionRows.filter((row) => row.quality !== null).length
      ? Math.round(localSessionRows.filter((row) => row.quality !== null).reduce((total, row) => total + (row.quality ?? 0), 0) / localSessionRows.filter((row) => row.quality !== null).length)
      : null,
  };
}
