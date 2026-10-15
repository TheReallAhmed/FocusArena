"use client";

import { Gauge, Target, Flame, CalendarCheck } from "lucide-react";
import { fmtMinutes } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";

type Props = {
  weekTotal: number;
  weekGoal: number;      // dailyGoal * 7
  activeDays: number;    // of the last 7
  goalDays: number;      // days the daily goal was reached
  streak: number;
};

/** One compact, personal verdict on your week — grade S → D with a breakdown. */
export function WeeklyReport({ weekTotal, weekGoal, activeDays, goalDays, streak }: Props) {
  const { locale, t } = useLocale();
  const volume = Math.min(1, weekTotal / Math.max(1, weekGoal));
  const consistency = activeDays / 7;
  const goalRate = goalDays / 7;
  const streakScore = Math.min(1, streak / 7);

  const score = Math.round(volume * 40 + consistency * 25 + goalRate * 20 + streakScore * 15);
  const grade =
    score >= 90 ? { g: "S", hue: 45, label: t("weekly.untouchable") } :
    score >= 75 ? { g: "A", hue: 150, label: t("weekly.elite") } :
    score >= 60 ? { g: "B", hue: 190, label: t("weekly.strong") } :
    score >= 40 ? { g: "C", hue: 255, label: t("weekly.building") } :
                  { g: "D", hue: 0,   label: t("weekly.warmup") };

  const parts = [
    { icon: Gauge, label: t("weekly.volume"), pct: Math.round(volume * 100), hue: 255, sub: `${fmtMinutes(weekTotal, locale)} / ${fmtMinutes(weekGoal, locale)}` },
    { icon: CalendarCheck, label: t("weekly.consistency"), pct: Math.round(consistency * 100), hue: 190, sub: t("weekly.activeDays", { count: activeDays }) },
    { icon: Target, label: t("weekly.goalRate"), pct: Math.round(goalRate * 100), hue: 150, sub: t("weekly.goalDays", { count: goalDays }) },
    { icon: Flame, label: t("weekly.streak"), pct: Math.round(streakScore * 100), hue: 45, sub: t("weekly.dayStreak", { count: streak }) },
  ];

  const C = 2 * Math.PI * 40;

  return (
    <div className="glass-card relative h-full overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full blur-3xl"
        style={{ background: `hsl(${grade.hue} 85% 58% / 0.15)` }}
      />
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-bold text-white">{t("weekly.title")}</h2>
        <span className="tnum text-xs text-[#8f8cb0]">{t("weekly.score", { score })}</span>
      </div>

      <div className="relative flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="wr-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={`hsl(${grade.hue} 92% 62%)`} />
                <stop offset="1" stopColor="#4ce3ff" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="40" fill="none" stroke="url(#wr-grad)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - score / 100)}
              style={{ transition: "stroke-dashoffset 0.7s ease" }}
              filter={`drop-shadow(0 0 6px hsl(${grade.hue} 90% 62% / 0.6))`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-4xl font-black leading-none"
              style={{ color: `hsl(${grade.hue} 92% 68%)`, textShadow: `0 0 18px hsl(${grade.hue} 90% 60% / 0.7)` }}
            >
              {grade.g}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{grade.label}</p>
          <p className="mt-0.5 text-[0.7rem] text-[#6d6a8f]">{t("weekly.rolling")}</p>

          <ul className="mt-3 space-y-2">
            {parts.map((p) => (
              <li key={p.label} className="flex items-center gap-2.5" title={`${p.label}: ${p.sub}`}>
                <p.icon size={12} style={{ color: `hsl(${p.hue} 90% 70%)` }} />
                <span className="w-[4.2rem] shrink-0 text-[0.65rem] font-semibold text-[#a5a2c8]">{p.label}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/8">
                  <span
                    className="block h-full rounded-full transition-all duration-700"
                    style={{ width: `${p.pct}%`, background: `hsl(${p.hue} 85% 62%)` }}
                  />
                </span>
                <span className="tnum w-8 shrink-0 text-right text-[0.65rem] font-bold text-white">{p.pct}%</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
