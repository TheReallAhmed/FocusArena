import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Flame, CalendarCheck, TrendingUp, Sigma, Moon, Sun, Zap, BarChart3 } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getCalendarData } from "@/server/queries";
import { getCalendarInsights } from "@/server/insights";
import { parseMonthParam, shiftMonth, monthLabel, dayKey, fmtMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Calendar" };
export const dynamic = "force-dynamic";

const CELL = ["bg-white/[0.045]", "bg-brand-500/30", "bg-brand-500/60", "bg-brand-500", "bg-neon-400"];

function levelFor(min: number): number {
  if (min <= 0) return 0;
  if (min < 30) return 1;
  if (min < 75) return 2;
  if (min < 150) return 3;
  return 4;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const { year, month } = parseMonthParam(params.m);
  const [data, insights] = await Promise.all([
    getCalendarData(user, year, month),
    getCalendarInsights(user),
  ]);

  const fmtHour = (h: number) => {
    const label = h === 0 ? "12 AM" : h < 12 ? `${h} AM` : h === 12 ? "12 PM" : `${h - 12} PM`;
    return label;
  };
  const maxWeekday = Math.max(1, ...insights.weekdayAvg.map((w) => w.avg));
  const maxWeek = Math.max(1, ...insights.weeklyTotals.map((w) => w.minutes));

  const today = dayKey();
  const firstDow = (new Date(`${year}-${String(month).padStart(2, "0")}-01T00:00:00Z`).getUTCDay() + 6) % 7;
  const dim = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrentMonth = today.startsWith(`${year}-${String(month).padStart(2, "0")}`);

  // streak day set (for glow) — streak counts backwards from today
  const streakDays = new Set<string>();
  if (isCurrentMonth && user.streak > 0) {
    for (let i = 0; i < user.streak; i++) {
      const d = new Date(today + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - i);
      streakDays.add(d.toISOString().slice(0, 10));
    }
  }

  const cells: ({ key: string; dayNum: number } | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) {
    cells.push({ key: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`, dayNum: d });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Consistency Map</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Focus <span className="text-gradient">heatmap</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/calendar?m=${prev.y}-${String(prev.m).padStart(2, "0")}`} className="btn btn-ghost !rounded-full !p-2.5" title="Previous month">
            <ChevronLeft size={17} />
          </Link>
          <span className="min-w-36 text-center text-sm font-bold text-white">{monthLabel(year, month)}</span>
          <Link href={`/calendar?m=${next.y}-${String(next.m).padStart(2, "0")}`} className="btn btn-ghost !rounded-full !p-2.5" title="Next month">
            <ChevronRight size={17} />
          </Link>
        </div>
      </div>

      {/* Month stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { icon: Sigma, label: "Total", value: fmtMinutes(data.monthTotal), hue: 255 },
          { icon: CalendarCheck, label: "Active days", value: String(data.activeDays), hue: 160 },
          { icon: TrendingUp, label: "Best day", value: data.bestDay ? fmtMinutes(data.bestDay.minutes) : "—", hue: 190 },
          { icon: Flame, label: "Streak", value: `${user.streak}d`, hue: 35 },
        ].map((s) => (
          <div key={s.label} className="glass-card flex items-center gap-3.5 p-4">
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
              style={{ background: `hsl(${s.hue} 85% 62% / 0.13)`, color: `hsl(${s.hue} 90% 72%)` }}
            >
              <s.icon size={16} />
            </span>
            <div>
              <p className="tnum text-lg font-bold leading-none text-white">{s.value}</p>
              <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="glass-card p-5 sm:p-6">
        <div className="mb-2 grid grid-cols-7 gap-1.5 sm:gap-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
            <div key={d} className="pb-1 text-center text-[0.65rem] font-bold uppercase tracking-widest text-[#5c5a78]">
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`x${i}`} />;
            const info = data.byDay.get(cell.key);
            const minutes = info?.minutes ?? 0;
            const level = levelFor(minutes);
            const isToday = cell.key === today;
            const inStreak = streakDays.has(cell.key);
            return (
              <div
                key={cell.key}
                title={`${cell.key} — ${minutes > 0 ? `${fmtMinutes(minutes)} · ${info?.sessions} session${(info?.sessions ?? 0) > 1 ? "s" : ""}` : "no focus"}`}
                className={`relative flex aspect-square items-center justify-center rounded-lg border text-xs font-semibold transition-transform hover:scale-105 sm:rounded-xl ${CELL[level]} ${
                  isToday ? "border-white/50" : "border-white/[0.05]"
                } ${inStreak ? "shadow-[0_0_16px_-2px_rgba(251,191,36,0.5)]" : ""}`}
              >
                <span className={minutes > 0 ? "text-white" : "text-[#4a4866]"}>{cell.dayNum}</span>
                {inStreak && (
                  <Flame size={9} className="absolute right-1 top-1 text-gold-400" />
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-5 flex items-center justify-end gap-2 text-[0.65rem] font-medium text-[#6d6a8f]">
          Less
          {CELL.map((c, i) => (
            <span key={i} className={`h-3 w-3 rounded ${c} border border-white/[0.06]`} />
          ))}
          More
          <span className="ml-3 flex items-center gap-1"><Flame size={10} className="text-gold-400" /> streak day</span>
        </div>
      </div>

      {/* ── Insights ── */}
      <div>
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-white">
          <BarChart3 size={17} className="text-neon-400" /> Deep work insights
        </h2>
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Weekday rhythm */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white">Your weekly rhythm</h3>
            <p className="mt-0.5 text-[0.68rem] text-[#6d6a8f]">Average focus minutes per weekday · last 8 weeks</p>
            <div className="mt-4 flex h-28 items-end gap-2">
              {insights.weekdayAvg.map((w) => (
                <div key={w.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="tnum text-[0.6rem] text-[#8f8cb0] opacity-0 transition-opacity group-hover:opacity-100">{w.avg}m</span>
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-[#23234a] to-brand-500/70 transition-all group-hover:to-brand-500"
                    style={{ height: `${Math.max(4, (w.avg / maxWeekday) * 100)}%` }}
                  />
                  <span className="text-[0.6rem] font-bold text-[#6d6a8f]">{w.label.slice(0, 2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Peak stats */}
          <div className="glass-card flex flex-col gap-4 p-5">
            <h3 className="text-sm font-bold text-white">Prime time</h3>
            <div className="grid flex-1 grid-cols-2 gap-3">
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white/[0.02] p-3 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-400/12 text-gold-400">
                  {insights.bestHour !== null && insights.bestHour >= 18 || insights.bestHour !== null && insights.bestHour < 5 ? <Moon size={15} /> : <Sun size={15} />}
                </span>
                <p className="tnum text-sm font-bold text-white">{insights.bestHour !== null ? fmtHour(insights.bestHour) : "—"}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#6d6a8f]">Best hour</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white/[0.02] p-3 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/14 text-brand-300"><Zap size={15} /></span>
                <p className="tnum text-sm font-bold text-white">{insights.longestSession ? fmtMinutes(insights.longestSession) : "—"}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#6d6a8f]">Longest round</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white/[0.02] p-3 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint-400/12 text-mint-400"><TrendingUp size={15} /></span>
                <p className="tnum text-sm font-bold text-white">{insights.avgPerActiveDay ? fmtMinutes(insights.avgPerActiveDay) : "—"}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#6d6a8f]">Avg / active day</p>
              </div>
              <div className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-line bg-white/[0.02] p-3 text-center">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-neon-500/12 text-neon-300"><CalendarCheck size={15} /></span>
                <p className="tnum text-sm font-bold text-white">{insights.activeDays}</p>
                <p className="text-[0.6rem] font-semibold uppercase tracking-wider text-[#6d6a8f]">Active days · 8w</p>
              </div>
            </div>
          </div>

          {/* 6-week trend */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-white">Momentum</h3>
            <p className="mt-0.5 text-[0.68rem] text-[#6d6a8f]">Total minutes per week · last 6 weeks</p>
            <div className="mt-4 flex h-28 items-end gap-2.5">
              {insights.weeklyTotals.map((w, i) => (
                <div key={i} className="group flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                  <span className="tnum text-[0.6rem] text-[#8f8cb0] opacity-0 transition-opacity group-hover:opacity-100">
                    {fmtMinutes(w.minutes)}
                  </span>
                  <div
                    className={`w-full rounded-t-md transition-all ${
                      i === insights.weeklyTotals.length - 1
                        ? "bg-gradient-to-t from-brand-600 via-brand-500 to-neon-400 shadow-[0_0_18px_-2px_rgba(124,108,255,0.5)]"
                        : "bg-gradient-to-t from-[#23234a] to-[#34346b] group-hover:to-brand-700"
                    }`}
                    style={{ height: `${Math.max(4, (w.minutes / maxWeek) * 100)}%` }}
                  />
                  <span className={`text-[0.6rem] font-bold ${i === insights.weeklyTotals.length - 1 ? "text-brand-300" : "text-[#6d6a8f]"}`}>
                    {w.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
