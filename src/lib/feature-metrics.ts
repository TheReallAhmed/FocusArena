export type DuelScore = { rounds: number; minutes: number };

/**
 * Quality v1 is a user-reported interruption proxy, not an attention sensor:
 * 100 minus 12.5 points per recorded distraction, rounded to an integer and clamped.
 */
export function calculateFocusQuality(distractionCount: number): number {
  const count = Number.isFinite(distractionCount) ? Math.max(0, Math.floor(distractionCount)) : 0;
  return Math.max(0, Math.min(100, Math.round(100 - count * 12.5)));
}

/** Counts user-reported events per actual, recorded hour; zero/invalid duration is safe. */
export function distractionsPerHour(eventCount: number, focusMinutes: number): number {
  if (!Number.isFinite(eventCount) || !Number.isFinite(focusMinutes) || focusMinutes <= 0) return 0;
  return Math.round((Math.max(0, eventCount) / (focusMinutes / 60)) * 10) / 10;
}

/** Duel standings prioritize completed qualifying rounds, then qualifying minutes. */
export function duelWinner(a: DuelScore, b: DuelScore): "a" | "b" | "draw" {
  if (a.rounds !== b.rounds) return a.rounds > b.rounds ? "a" : "b";
  if (a.minutes !== b.minutes) return a.minutes > b.minutes ? "a" : "b";
  return "draw";
}

/** Date keys are local calendar strings (YYYY-MM-DD); arithmetic uses UTC only on those keys. */
export function journalStreakStats(days: string[], today: string): { current: number; longest: number } {
  const unique = [...new Set(days)].filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort();
  const set = new Set(unique);
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const day of unique) {
    const date = new Date(`${day}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime())) continue;
    if (previous && (Date.parse(`${previous}T00:00:00.000Z`) + 86_400_000 === date.getTime())) run += 1;
    else run = 1;
    longest = Math.max(longest, run);
    previous = day;
  }

  const yesterdayDate = new Date(`${today}T00:00:00.000Z`);
  yesterdayDate.setUTCDate(yesterdayDate.getUTCDate() - 1);
  const anchor = set.has(today) ? today : yesterdayDate.toISOString().slice(0, 10);
  let current = 0;
  let cursor = new Date(`${anchor}T00:00:00.000Z`);
  while (set.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return { current, longest };
}
