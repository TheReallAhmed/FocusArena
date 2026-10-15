import type { Metadata } from "next";
import Link from "next/link";
import {
  Flame, Clock3, CalendarRange, Sigma, Zap, ArrowRight, Quote,
  ListChecks, History, Lock, Radio, UserPlus, Users, Sparkles,
  TrendingUp, TrendingDown, Medal,
} from "lucide-react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getDashboardData, getLeaderboard, getPersonalFocusInsights } from "@/server/queries";
import { getArenaPulse, getWeekDelta, type PulseItem } from "@/server/insights";
import { getDailyQuote } from "@/lib/quote";
import { StatCard, WeekChart, BadgeIcon, Avatar, AdminChip, PerkTitleBadge } from "@/components/widgets";
import { GoalCard } from "@/components/goal-card";
import { WeeklyReport } from "@/components/weekly-report";
import { LiveRefresh } from "@/components/live-refresh";
import { BadgeRail } from "@/components/badge-rail";
import { BADGES, levelProgress } from "@/lib/xp";
import { fmtMinutes, dayLabel, timeAgo } from "@/lib/dates";
import { normalizeLocale, t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function greeting(locale: "en" | "ar") {
  const h = new Date().getUTCHours();
  if (h < 5) return t(locale, "dashboard.greeting.night");
  if (h < 12) return t(locale, "dashboard.greeting.morning");
  if (h < 17) return t(locale, "dashboard.greeting.afternoon");
  return t(locale, "dashboard.greeting.evening");
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
  const locale = normalizeLocale(user.locale);
  const text = (key: string) => t(locale, key);

  const [data, quote, pulse, top3, insights] = await Promise.all([
    getDashboardData(user),
    getDailyQuote(),
    getArenaPulse(14),
    getLeaderboard("week", 3),
    getPersonalFocusInsights(user),
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
            {new Date().toLocaleDateString(locale === "ar" ? "ar" : "en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" })}
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {greeting(locale)}, <span className="text-gradient">{user.displayName}</span>
            {user.role === "admin" && <span className="ml-2 align-middle"><AdminChip /></span>}
          </h1>
        </div>
        <Link href="/focus" className="btn btn-primary">
          <Zap size={16} /> {text("dashboard.start")}
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
                {user.streak} {locale === "ar" ? text(user.streak === 1 ? "common.day" : "common.days") : user.streak === 1 ? "day" : "days"}
              </p>
              <p className="text-xs font-medium text-[#8f8cb0]">
                {user.streak > 0 ? text("dashboard.streak") : text("dashboard.streakEmpty")}
              </p>
            </div>
          </div>
          <div className="min-w-52 flex-1 sm:max-w-xs">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-300">{text("common.level")} {prog.level}</span>
              <span className="tnum text-[#8f8cb0]">{prog.nextIn} XP {locale === "ar" ? "للمستوى" : "to level"} {prog.level + 1}</span>
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
        <StatCard icon={Clock3} label={text("dashboard.today")} value={fmtMinutes(data.todayMinutes)} sub={text("dashboard.focused")} hue={255} />
        <StatCard icon={CalendarRange} label={text("dashboard.thisWeek")} value={fmtMinutes(data.weekTotal)} sub={locale === "ar" ? "من الاثنين إلى اليوم" : "Monday → today"} hue={190} />
        <StatCard icon={Sigma} label={text("dashboard.allTime")} value={fmtMinutes(user.xp)} sub={`${data.totalSessions} ${text("dashboard.sessions")}`} hue={150} />
        <StatCard icon={Zap} label={text("dashboard.totalXp")} value={String(user.xp)} sub={`${text("common.level")} ${prog.level} · ${data.earnedBadges.length}/${BADGES.length} ${locale === "ar" ? "شارة" : "badges"}`} hue={45} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="glass-card p-5" aria-label="Commitment outcomes">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-white">{text("dashboard.commitment")}</h2>
            <span className="chip !text-[0.62rem]">{text("dashboard.private")}</span>
          </div>
          <p className="tnum mt-3 text-2xl font-black text-white">{insights.commitments.percentage === null ? "—" : `${insights.commitments.percentage}%`}</p>
          <p className="mt-1 text-xs text-[#8f8cb0]">{insights.commitments.fulfilled} {text("dashboard.fulfilled")} {locale === "ar" ? "من أصل" : "out of"} {insights.commitments.resolved} {text("dashboard.resolved")}</p>
          <p className="mt-1 text-[0.68rem] text-[#6d6a8f]">{insights.commitments.broken} self-reported not fulfilled · {insights.commitments.unresolved} unresolved</p>
          <Link href="/history" className="mt-3 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200">{text("dashboard.history")}</Link>
        </section>

        <section className="glass-card p-5" aria-label="Energy and focus duration">
          <h2 className="text-sm font-bold text-white">{text("dashboard.energy")}</h2>
          <p className="mt-1 text-[0.65rem] text-[#6d6a8f]">By energy: completed-round duration, logged quality and ended-round completion rate.</p>
          <div className="mt-4 space-y-2">
            {insights.energy.byEnergy.map((bucket) => {
              const max = Math.max(1, ...insights.energy.byEnergy.map((item) => item.count));
              const completion = insights.completionByEnergy.find((item) => item.rating === bucket.rating);
              return <div key={bucket.rating} className="grid grid-cols-[2.5rem_1fr_4.7rem] items-center gap-2 text-[0.68rem]">
                <span className="text-[#8f8cb0]">{bucket.rating}/5</span>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-neon-400" style={{ width: `${Math.max(bucket.count ? 5 : 0, Math.round((bucket.count / max) * 100))}%` }} /></div>
                <span title={`Average quality: ${bucket.averageQuality ?? "not available"}. Ended tracked rounds completed: ${completion?.completed ?? 0}/${completion?.attempts ?? 0}.`} className="tnum text-right text-[#a5a2c8]">{bucket.averageMinutes === null ? "—" : `${bucket.averageMinutes}m`} · Q{bucket.averageQuality ?? "—"}</span>
              </div>;
            })}
          </div>
          <p className="mt-2 text-[0.6rem] text-[#6d6a8f]">Bars = completed rated sessions · Q = average focus quality · completion (done/ended): {insights.completionByEnergy.map((item) => `${item.rating}:${item.completed}/${item.attempts}`).join(" · ")}</p>
          <p className="mt-3 text-[0.65rem] leading-relaxed text-[#6d6a8f]">
            {insights.energy.highVsLowRatio === null
              ? `Need at least ${insights.energy.minimumSample} sessions in both low- and high-energy groups for a comparison.`
              : `Observed association: high-energy rounds averaged ${insights.energy.highVsLowRatio}× the duration of low-energy rounds (n=${insights.energy.highSample} vs ${insights.energy.lowSample}); this is not causal.`}
          </p>
          {(insights.bestUtcHour || insights.bestUtcWeekday) && <p className="mt-2 border-t border-line pt-2 text-[0.63rem] text-[#6d6a8f]">Observed longer-session periods (UTC, n≥3): {insights.bestUtcHour && `${String(insights.bestUtcHour.key).padStart(2, "0")}:00 hour · `}{insights.bestUtcWeekday && `${insights.bestUtcWeekday.label} (${insights.bestUtcWeekday.count} sessions)`}</p>}
        </section>

        <section className="glass-card p-5" aria-label="Verification and XP balance">
          <h2 className="text-sm font-bold text-white">{text("dashboard.accountability")}</h2>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-line bg-white/[0.02] p-2"><p className="tnum text-lg font-bold text-mint-300">{insights.verification.verified}</p><p className="text-[0.58rem] text-[#6d6a8f]">verified</p></div>
            <div className="rounded-xl border border-line bg-white/[0.02] p-2"><p className="tnum text-lg font-bold text-gold-300">{insights.verification.partial}</p><p className="text-[0.58rem] text-[#6d6a8f]">partial</p></div>
            <div className="rounded-xl border border-line bg-white/[0.02] p-2"><p className="tnum text-lg font-bold text-[#a5a2c8]">{insights.verification.unverified}</p><p className="text-[0.58rem] text-[#6d6a8f]">unverified</p></div>
          </div>
          <p className="mt-3 text-[0.68rem] text-[#6d6a8f]">Attention prompts are optional and do not prove continuous focus.</p>
          <div className="mt-3 flex items-center justify-between border-t border-line pt-3"><span className="text-xs text-[#8f8cb0]">Spendable XP</span><span className="tnum text-sm font-bold text-gold-300">{user.xpBalance.toLocaleString()}</span></div>
          <Link href="/shop" className="mt-2 inline-flex text-xs font-semibold text-brand-300 hover:text-brand-200">{text("dashboard.shop")} →</Link>
        </section>
      </div>

      {/* Chart + quote */}
      <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-5">
        <div className="glass-card p-5 xl:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold text-white">{text("dashboard.last7")}</h2>
              {(delta.pct !== 0 || data.weekTotal > 0) && (
                <span className={`chip !py-0.5 !text-[0.65rem] !font-bold ${delta.pct >= 0 ? "text-mint-400" : "text-rose-300"}`}>
                  {delta.pct >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {delta.pct >= 0 ? "+" : ""}{delta.pct}% vs last week
                </span>
              )}
            </div>
            <Link href="/calendar" className="text-xs font-semibold text-brand-300 hover:text-brand-200">
              {text("dashboard.calendar")} →
            </Link>
          </div>
          <WeekChart data={week} />
        </div>

        <div className="glass-card flex flex-col justify-between gap-5 p-5 xl:col-span-2">
          <div>
            <div className="flex items-center gap-2 text-brand-300">
              <Quote size={15} />
              <span className="text-xs font-bold uppercase tracking-[0.18em]">{text("dashboard.fuel")}</span>
            </div>
            <p className="mt-3 text-[0.95rem] leading-relaxed text-[#d9d7ec]">&ldquo;{quote.text}&rdquo;</p>
            <p className="mt-2 text-xs font-medium text-[#6d6a8f]">— {quote.author}</p>
          </div>
          <Link href="/focus" className="btn btn-ghost w-full !py-2.5 text-sm">
            {text("dashboard.useIt")} <ArrowRight size={15} />
          </Link>
        </div>
      </div>

      {/* Goal + report card + Arena Pulse */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <GoalCard todayMinutes={data.todayMinutes} goal={user.dailyGoal} />
        <div>
          <WeeklyReport
            weekTotal={data.weekTotal}
            weekGoal={user.dailyGoal * 7}
            activeDays={data.week.filter((d) => d.minutes > 0).length}
            goalDays={data.week.filter((d) => d.minutes >= user.dailyGoal).length}
            streak={user.streak}
          />
        </div>

        <div className="glass-card p-5 sm:col-span-2 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Radio size={15} className="text-neon-400" /> {text("dashboard.pulse")}
              <LiveRefresh intervalMs={20000} label={text("dashboard.live")} />
            </h2>
            <Link href="/leaderboard" className="text-xs font-semibold text-brand-300 hover:text-brand-200">{text("dashboard.board")} →</Link>
          </div>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto pr-1">
            {pulse.length === 0 && (
              <li className="py-6 text-center text-xs text-[#6d6a8f]">
                {text("dashboard.quiet")}
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
                    <Avatar name={r.displayName} hue={r.avatarHue} imageUrl={r.avatarUrl} frameKey={r.equippedFrame} size={30} />
                    <span className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-sm font-semibold text-white">
                      {r.displayName}
                      {r.role === "admin" && <AdminChip small />}
                      <PerkTitleBadge rewardKey={r.equippedTitle} />
                    </span>
                    <span className="hidden sm:flex"><BadgeRail keys={r.badgeKeys} total={r.badges} max={3} size={19} /></span>
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
