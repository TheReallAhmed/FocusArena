import type { Metadata } from "next";
import Link from "next/link";
import {
  Flame, Clock3, CalendarRange, Sigma, Zap, ArrowRight, Quote,
  ListChecks, History, Lock, Radio, UserPlus, Users, Sparkles,
  TrendingUp, TrendingDown, Medal,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData, getLeaderboard } from "@/server/queries";
import { getArenaPulse, getWeekDelta, type PulseItem } from "@/server/insights";
import { getDailyQuote } from "@/lib/quote";
import { StatCard, WeekChart, BadgeIcon, Avatar, AdminChip } from "@/components/widgets";
import { GoalCard } from "@/components/goal-card";
import { BADGES, levelProgress } from "@/lib/xp";
import { fmtMinutes, dayLabel, timeAgo } from "@/lib/dates";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function greeting() {
  const h = new Date().getUTCHours();
  if (h < 5) return "Grinding past midnight";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function pulseLine(item: PulseItem) {
  switch (item.kind) {
    case "session":
      return <>banked <b className="text-brand-300">+{item.minutes}m</b> of deep focus</>;
    case "badge":
      return <>unlocked the <b style={{ color: `hsl(${item.badgeHue} 92% 74%)` }}>{item.badgeName}</b> badge</>;
    case "joined":
      return <>just entered the arena</>;
    case "squad":
      return <>founded squad <b className="text-neon-300">{item.squadName}</b></>;
  }
}

function PULSE_ICON(kind: PulseItem["kind"]) {
  if (kind === "session") return { Icon: Zap, hue: 255 };
  if (kind === "badge") return { Icon: Medal, hue: 45 };
  if (kind === "joined") return { Icon: UserPlus, hue: 160 };
  return { Icon: Users, hue: 190 };
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [data, quote, pulse, top3] = await Promise.all([
    getDashboardData(user),
    getDailyQuote(),
    getArenaPulse(14),
    getLeaderboard("week", 3),
  ]);
  const delta = await getWeekDelta(user, data.weekTotal);

  const prog = levelProgress(user.xp);
  const earnedKeys = new Set(data.earnedBadges.map((b) => b.key));
  const week = data.week.map((d) => ({ ...d, label: dayLabel(d.day) }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greeting()}, <span className="text-gradient">{user.displayName}</span>
            {user.role === "admin" && <span className="ml-2 align-middle"><AdminChip /></span>}
          </h1>
        </div>
        <Link href="/focus" className="btn btn-primary">
          <Zap size={16} /> Start a sprint
        </Link>
      </div>

      {/* Streak banner */}
      <div className="glass-card relative overflow-hidden p-5">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-gold-400/12 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-400/14 text-gold-400 shadow-[0_0_30px_-4px_rgba(251,191,36,0.45)]">
              <Flame size={26} strokeWidth={2.1} />
            </span>
            <div>
              <p className="tnum text-2xl font-bold text-white">
                {user.streak} day{user.streak === 1 ? "" : "s"}
              </p>
              <p className="text-xs font-medium text-[#8f8cb0]">
                {user.streak > 0 ? "Current focus streak — keep it alive" : "Finish one session today to ignite your streak"}
              </p>
            </div>
          </div>
          <div className="min-w-52 flex-1 sm:max-w-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-300">Level {prog.level}</span>
              <span className="tnum text-[#8f8cb0]">{prog.nextIn} XP to level {prog.level + 1}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-neon-400 transition-all duration-700"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Clock3} label="Today" value={fmtMinutes(data.todayMinutes)} sub="focused so far" hue={255} />
        <StatCard icon={CalendarRange} label="This week" value={fmtMinutes(data.weekTotal)} sub="Monday → today" hue={190} />
        <StatCard icon={Sigma} label="All time" value={fmtMinutes(user.xp)} sub={`${data.totalSessions} sessions total`} hue={150} />
        <StatCard icon={Zap} label="Total XP" value={String(user.xp)} sub={`Level ${prog.level} · ${data.earnedBadges.length}/${BADGES.length} badges`} hue={45} />
      </div>

      {/* Chart + quote */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="glass-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-white">Last 7 days</h2>
              {(delta.pct !== 0 || data.weekTotal > 0) && (
                <span className={`chip !py-0.5 !text-[0.65rem] !font-bold ${delta.pct >= 0 ? "text-mint-400" : "text-rose-300"}`}>
                  {delta.pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {delta.pct >= 0 ? "+" : ""}{delta.pct}% vs last week
                </span>
              )}
            </div>
            <Link href="/calendar" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
              Full calendar →
            </Link>
          </div>
          <WeekChart data={week} />
        </div>

        <div className="glass-card flex flex-col justify-between gap-5 p-5 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2 text-brand-300">
              <Quote size={15} />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">Fuel for today</span>
            </div>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#d9d7ec]">&ldquo;{quote.text}&rdquo;</p>
            <p className="mt-2 text-xs font-medium text-[#6d6a8f]">— {quote.author}</p>
          </div>
          <Link href="/focus" className="btn btn-ghost w-full !py-2.5 text-sm">
            Put it to work <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Goal + Arena Pulse */}
      <div className="grid gap-4 lg:grid-cols-3">
        <GoalCard todayMinutes={data.todayMinutes} goal={user.dailyGoal} />

        <div className="glass-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Radio size={15} className="text-neon-400" /> Arena pulse
              <span className="chip !py-0.5 !text-[0.6rem] !font-bold text-mint-400">LIVE</span>
            </h2>
            <Link href="/leaderboard" className="text-xs font-semibold text-brand-300 hover:text-brand-200">Board →</Link>
          </div>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {pulse.length === 0 && (
              <li className="py-6 text-center text-xs text-[#6d6a8f]">
                The arena is quiet — your next session starts the pulse.
              </li>
            )}
            {pulse.map((item, i) => {
              const { Icon, hue } = PULSE_ICON(item.kind);
              return (
                <li key={`${item.kind}-${i}`} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3 py-2">
                  <Avatar name={item.displayName} hue={item.avatarHue} size={28} />
                  <p className="min-w-0 flex-1 truncate text-[0.82rem] text-[#c7c4de]">
                    <Link href={`/u/${item.username}`} className="font-semibold text-white hover:text-brand-300">
                      {item.displayName}
                    </Link>{" "}
                    {pulseLine(item)}
                  </p>
                  <span
                    className="hidden h-6 w-6 shrink-0 items-center justify-center rounded-md sm:flex"
                    style={{ background: `hsl(${hue} 85% 62% / 0.13)`, color: `hsl(${hue} 90% 72%)` }}
                  >
                    <Icon size={12} />
                  </span>
                  <span className="tnum shrink-0 text-[0.63rem] text-[#5c5a78]">{timeAgo(item.at)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {/* Mini board + tasks + trophies */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Mini top-3 */}
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Medal size={15} className="text-gold-400" /> This week&apos;s podium
            </h2>
            <Link href="/leaderboard" className="text-xs font-semibold text-brand-300 hover:text-brand-200">All →</Link>
          </div>
          {top3.length === 0 ? (
            <div className="py-6 text-center">
              <Sparkles size={20} className="mx-auto text-[#4a4866]" />
              <p className="mt-2 text-sm text-[#8f8cb0]">No contenders yet this week</p>
            </div>
          ) : (
            <ul className="space-y-2">
              {top3.map((r, i) => (
                <li key={r.id}>
                  <Link
                    href={`/u/${r.username}`}
                    className={`flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition ${
                      r.id === user.id ? "border-brand-500/40 bg-brand-500/10" : "border-line bg-white/[0.02] hover:border-white/18"
                    }`}
                  >
                    <span className={`tnum w-4 text-sm font-black ${i === 0 ? "text-gold-400" : i === 1 ? "text-[#c7c4de]" : "text-[#e08a4c]"}`}>
                      {i + 1}
                    </span>
                    <Avatar name={r.displayName} hue={r.avatarHue} imageUrl={r.avatarUrl} size={30} />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold text-white">
                      {r.displayName}
                      {r.role === "admin" && <AdminChip small />}
                    </span>
                    <span className="tnum text-xs font-bold text-[#a5a2c8]">{fmtMinutes(Number(r.minutes))}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Tasks preview */}
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Up next</h2>
            <Link href="/tasks" className="text-xs font-semibold text-brand-300 hover:text-brand-200">All tasks →</Link>
          </div>
          {data.activeTasks.length === 0 ? (
            <div className="py-6 text-center">
              <ListChecks size={20} className="mx-auto text-[#4a4866]" />
              <p className="mt-2 text-sm text-[#8f8cb0]">No open tasks</p>
              <Link href="/tasks" className="mt-3 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200">
                Add your first task →
              </Link>
            </div>
          ) : (
            <ul className="space-y-2">
              {data.activeTasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
                  <span
                    className={`h-2 w-2 shrink-0 rounded-full ${
                      t.priority === "high" ? "bg-rose-400" : t.priority === "low" ? "bg-sky-400" : "bg-brand-400"
                    }`}
                  />
                  <span className="min-w-0 flex-1 truncate text-sm text-[#d9d7ec]">{t.title}</span>
                  <Link href={`/focus?task=${t.id}`} className="shrink-0 text-[#6d6a8f] transition hover:text-brand-300" title="Focus on this">
                    <Zap size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Trophy case */}
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Trophy case</h2>
            <span className="tnum text-xs text-[#8f8cb0]">{data.earnedBadges.length}/{BADGES.length}</span>
          </div>
          <div className="grid grid-cols-4 gap-2.5">
            {BADGES.slice(0, 12).map((b) => {
              const locked = !earnedKeys.has(b.key);
              return (
                <div key={b.key} className="flex flex-col items-center gap-1.5" title={locked ? `${b.name} — ${b.desc}` : `${b.name} unlocked!`}>
                  <div className="relative">
                    <BadgeIcon badge={b} size={44} locked={locked} />
                    {locked && (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink-700 text-[#6d6a8f]">
                        <Lock size={9} />
                      </span>
                    )}
                  </div>
                  <span className={`text-center text-[0.55rem] font-semibold leading-tight ${locked ? "text-[#4a4866]" : "text-[#a5a2c8]"}`}>
                    {b.name}
                  </span>
                </div>
              );
            })}
          </div>
          <Link href={`/u/${user.username}`} className="btn btn-ghost mt-4 w-full !py-2 text-xs">
            Full collection ({BADGES.length}) →
          </Link>
        </div>
      </div>

      {/* Recent rounds */}
      <div className="glass-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <History size={15} className="text-brand-300" /> Recent rounds
          </h2>
          <span className="tnum text-xs text-[#8f8cb0]">{data.totalSessions} all time</span>
        </div>
        {data.recentSessions.length === 0 ? (
          <div className="py-6 text-center">
            <p className="text-sm text-[#8f8cb0]">No sessions yet — your first sprint is waiting.</p>
          </div>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.recentSessions.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-[#d9d7ec]">{s.taskTitle ?? "Free focus"}</p>
                  <p className="text-[0.68rem] text-[#6d6a8f]">
                    {timeAgo(s.startedAt)} ·{" "}
                    {new Date(s.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </p>
                </div>
                <span className="tnum shrink-0 rounded-md bg-brand-500/12 px-2 py-1 text-xs font-bold text-brand-300">
                  +{s.minutes}m
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
