import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BriefcaseBusiness, Clock3, Code2, Flame, Globe2, MapPin, Medal,
  Pencil, Rocket, Users, Lock, History, CalendarCheck, CheckCircle2,
  Sigma, TrendingUp, UsersRound,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getProfile } from "@/server/queries";
import { Avatar, AdminChip, LevelChip, BadgeIcon } from "@/components/widgets";
import { BADGES, levelProgress } from "@/lib/xp";
import { fmtMinutes } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username}` };
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const me = await getSessionUser();
  if (!me) redirect("/login");

  const { username } = await params;
  const profile = await getProfile(username.toLowerCase());
  if (!profile) notFound();

  const { user, stats, earnedBadges, recentSessions, squads } = profile;
  const prog = levelProgress(user.xp);
  const earnedKeys = new Set(earnedBadges.map((b) => b.key));
  const isMe = me.id === user.id;

  return (
    <div className="space-y-5">
      {/* Hero card */}
      <div className="glass-card relative overflow-hidden p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-32 h-72 w-72 rounded-full blur-3xl"
          style={{ background: `hsl(${user.avatarHue} 85% 55% / 0.18)` }}
        />
        <div className="relative flex flex-wrap items-center gap-5 sm:gap-7">
          <span className="relative">
            <Avatar name={user.displayName} hue={user.avatarHue} imageUrl={user.avatarUrl} size={92} />
            {user.streak >= 7 && (
              <span className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink-900 bg-gold-400 text-ink-950">
                <Flame size={15} strokeWidth={2.5} />
              </span>
            )}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {user.displayName}
              {user.role === "admin" && <AdminChip />}
              {isMe && <span className="chip !text-[0.65rem] text-brand-300">this is you</span>}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[#8f8cb0]">
              <span>@{user.username}</span>
              <span>· grinding since {new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</span>
              {user.location && <span className="inline-flex items-center gap-1"><MapPin size={12} /> {user.location}</span>}
            </p>
            {user.bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-[#c7c4de]">{user.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <LevelChip level={prog.level} />
              {user.streak > 0 && (
                <span className="chip !text-[0.7rem] !font-bold text-gold-400">
                  <Flame size={12} /> {user.streak} day streak
                </span>
              )}
              <span className="chip !text-[0.7rem]">
                <Medal size={12} className="text-brand-300" /> {earnedBadges.length}/{BADGES.length} badges
              </span>
            </div>
            {(user.linkedInUrl || user.githubUrl || user.websiteUrl || isMe) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {user.linkedInUrl && (
                  <a href={user.linkedInUrl} target="_blank" rel="noreferrer" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem] hover:!text-sky-300">
                    <BriefcaseBusiness size={13} /> LinkedIn
                  </a>
                )}
                {user.githubUrl && (
                  <a href={user.githubUrl} target="_blank" rel="noreferrer" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem] hover:!text-white">
                    <Code2 size={13} /> GitHub
                  </a>
                )}
                {user.websiteUrl && (
                  <a href={user.websiteUrl} target="_blank" rel="noreferrer" className="btn btn-ghost !px-3 !py-1.5 !text-[0.7rem] hover:!text-neon-300">
                    <Globe2 size={13} /> Portfolio
                  </a>
                )}
                {isMe && (
                  <Link href="/settings/profile" className="btn btn-primary !px-3 !py-1.5 !text-[0.7rem]">
                    <Pencil size={13} /> Edit profile
                  </Link>
                )}
              </div>
            )}
          </div>
          {/* Level progress */}
          <div className="w-full sm:w-56">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-brand-300">Level {prog.level}</span>
              <span className="tnum text-[#8f8cb0]">{prog.nextIn} XP to {prog.level + 1}</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-500 to-neon-400"
                style={{ width: `${prog.pct}%` }}
              />
            </div>
            <p className="tnum mt-1.5 text-right text-[0.68rem] text-[#6d6a8f]">{user.xp} XP total</p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { icon: Sigma, label: "Total focus", value: fmtMinutes(user.xp), hue: 255 },
          { icon: Clock3, label: "Sessions", value: String(stats.sessions), hue: 190 },
          { icon: UsersRound, label: "Group rounds", value: String(stats.groupSessions), hue: 160 },
          { icon: CheckCircle2, label: "Tasks done", value: String(stats.tasksDone), hue: 140 },
          { icon: CalendarCheck, label: "Active days", value: String(stats.activeDays), hue: 45 },
          { icon: TrendingUp, label: "Best day", value: stats.bestDay ? fmtMinutes(stats.bestDay.minutes) : "—", hue: 350 },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4 text-center">
            <span
              className="mx-auto flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `hsl(${s.hue} 85% 62% / 0.13)`, color: `hsl(${s.hue} 90% 72%)` }}
            >
              <s.icon size={15} />
            </span>
            <p className="tnum mt-2.5 text-lg font-bold leading-none text-white">{s.value}</p>
            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Badge showcase */}
      <div className="glass-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Medal size={17} className="text-gold-400" /> Badge collection
          </h2>
          <span className="tnum text-xs text-[#8f8cb0]">{earnedBadges.length} of {BADGES.length} unlocked</span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {BADGES.map((b) => {
            const earned = earnedBadges.find((e) => e.key === b.key);
            const locked = !earnedKeys.has(b.key);
            return (
              <div
                key={b.key}
                className={`flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                  locked
                    ? "border-line bg-white/[0.015] opacity-55"
                    : "border-white/12 bg-white/[0.035] hover:-translate-y-1"
                }`}
                style={locked ? undefined : { boxShadow: `0 10px 35px -14px hsl(${b.hue} 85% 60% / 0.4)` }}
              >
                <span className="relative">
                  <BadgeIcon badge={b} size={54} locked={locked} />
                  {locked && (
                    <span className="absolute -bottom-1 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-ink-700 text-[#8f8cb0]">
                      <Lock size={10} />
                    </span>
                  )}
                </span>
                <div>
                  <p className={`text-xs font-bold ${locked ? "text-[#6d6a8f]" : "text-white"}`}>{b.name}</p>
                  <p className="mt-0.5 text-[0.65rem] leading-snug text-[#6d6a8f]">{b.desc}</p>
                  {earned && (
                    <p className="mt-1 text-[0.6rem] font-semibold text-mint-400/90">
                      {new Date(earned.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Squads + history */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass-card p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <Users size={15} className="text-neon-400" /> Squads
          </h2>
          {squads.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#6d6a8f]">Not in any squad yet.</p>
          ) : (
            <ul className="space-y-2">
              {squads.map((s) => (
                <li key={s.id}>
                  <Link
                    href={`/squads/${s.id}`}
                    className="flex items-center justify-between rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5 text-sm text-[#d9d7ec] transition hover:border-white/20"
                  >
                    {s.name}
                    <Rocket size={13} className="text-[#6d6a8f]" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="glass-card p-5 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
            <History size={15} className="text-brand-300" /> Recent rounds
          </h2>
          {recentSessions.length === 0 ? (
            <p className="py-4 text-center text-xs text-[#6d6a8f]">No focus sessions yet.</p>
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {recentSessions.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate text-sm text-[#d9d7ec]">
                      {s.roomId ? <UsersRound size={12} className="shrink-0 text-neon-400" /> : null}
                      {s.taskTitle ?? (s.roomId ? "Group room round" : "Free focus")}
                    </p>
                    <p className="text-[0.65rem] text-[#6d6a8f]">
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
    </div>
  );
}
