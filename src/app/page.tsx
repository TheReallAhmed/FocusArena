import Link from "next/link";
import {
  ArrowRight, Flame, Trophy, Users, CalendarDays, ListChecks, Timer,
  Zap, Crown, Medal, Sparkles, ChevronRight, Target,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Reveal } from "@/components/client-utils";
import { Avatar, BadgeIcon, LevelChip } from "@/components/widgets";
import { getSessionUser } from "@/lib/auth";
import { getArenaTotals } from "@/server/insights";
import { fmtBig, fmtMinutes } from "@/lib/dates";

const MARQUEE = [
  "DEEP WORK", "POMODORO SPRINTS", "XP + LEVELS", "SQUAD BATTLES", "STREAKS",
  "LIVE LEADERBOARD", "BADGES", "TASK FLOW", "HEATMAPS", "100% FREE",
];

function HeroRing() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      {/* pulse ring */}
      <div className="absolute inset-6 rounded-full border border-brand-500/30 animate-pulse-ring" />
      {/* glow */}
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(124,108,255,0.28),transparent_62%)] blur-2xl" />
      <svg viewBox="0 0 200 200" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="hero-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#7c6cff" />
            <stop offset="1" stopColor="#4ce3ff" />
          </linearGradient>
        </defs>
        <circle cx="100" cy="100" r="86" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle
          cx="100" cy="100" r="86" fill="none" stroke="url(#hero-grad)" strokeWidth="7"
          strokeLinecap="round" strokeDasharray="540" strokeDashoffset="150"
          className="animate-spin-slow" style={{ transformOrigin: "center" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-brand-300">Focus</span>
        <span className="tnum font-mono text-6xl font-bold tracking-tight text-white">24:59</span>
        <span className="chip mt-2"><Flame size={12} className="text-gold-400" /> 12 day streak</span>
      </div>
      {/* floating cards */}
      <div className="glass-card absolute -left-2 top-10 hidden items-center gap-2.5 !rounded-xl px-3.5 py-2.5 animate-float sm:flex">
        <BadgeIcon badge={{ icon: "flame", hue: 15, name: "On Fire" }} size={34} />
        <div>
          <p className="text-xs font-bold text-white">Badge unlocked</p>
          <p className="text-[0.65rem] text-[#8f8cb0]">On Fire · 3-day streak</p>
        </div>
      </div>
      <div className="glass-card absolute -right-3 bottom-12 hidden items-center gap-2.5 !rounded-xl px-3.5 py-2.5 animate-float-slow sm:flex">
        <Avatar name="Faris" hue={200} size={30} />
        <div>
          <p className="text-xs font-bold text-white">+25 XP</p>
          <p className="text-[0.65rem] text-[#8f8cb0]">Level 8 reached</p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Timer, hue: 255, title: "Pomodoro Engine",
    desc: "25/5 sprints with a cinematic timer, session dots, sounds, auto-cycles and custom durations.",
    visual: (
      <div className="mt-5 flex items-center gap-3">
        <svg viewBox="0 0 60 60" className="h-14 w-14 -rotate-90">
          <circle cx="30" cy="30" r="24" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="#7c6cff" strokeWidth="5" strokeLinecap="round" strokeDasharray="150" strokeDashoffset="44" />
        </svg>
        <div>
          <p className="tnum font-mono text-2xl font-bold text-white">14:32</p>
          <div className="mt-1 flex gap-1.5">
            {[1, 1, 1, 0].map((f, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full ${f ? "bg-brand-500" : "bg-white/10"}`} />
            ))}
          </div>
        </div>
      </div>
    ),
  },
  {
    icon: Trophy, hue: 45, title: "Live Leaderboard",
    desc: "Weekly and all-time boards. Every minute you focus pushes you up the ranks.",
    visual: (
      <div className="mt-5 space-y-2">
        {[
          { n: "Layla", h: 320, m: "312m", rank: 1 },
          { n: "Omar", h: 200, m: "280m", rank: 2 },
          { n: "You", h: 258, m: "247m", rank: 3 },
        ].map((r) => (
          <div key={r.n} className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.03] px-3 py-2">
            <span className={`tnum w-4 text-xs font-bold ${r.rank === 1 ? "text-gold-400" : "text-[#6d6a8f]"}`}>{r.rank}</span>
            <Avatar name={r.n} hue={r.h} size={22} />
            <span className={`flex-1 text-xs font-semibold ${r.n === "You" ? "text-brand-300" : "text-white"}`}>{r.n}</span>
            <span className="tnum text-xs text-[#8f8cb0]">{r.m}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Users, hue: 190, title: "Squads",
    desc: "Create a squad, share one invite code with your friends, and battle on private boards.",
    visual: (
      <div className="mt-5 flex items-center justify-between rounded-xl border border-line bg-white/[0.03] p-3.5">
        <div className="flex -space-x-2.5">
          {[["Rami", 20], ["Sara", 150], ["Joe", 260], ["Nour", 330]].map(([n, h]) => (
            <Avatar key={n as string} name={n as string} hue={h as number} size={32} ring />
          ))}
        </div>
        <span className="chip font-mono !text-brand-300">SQUAD · X7K2P9</span>
      </div>
    ),
  },
  {
    icon: CalendarDays, hue: 160, title: "Focus Heatmap",
    desc: "A GitHub-style calendar of your deep work. Watch the grid light up as your streak grows.",
    visual: (
      <div className="mt-5 grid grid-cols-12 gap-1.5">
        {Array.from({ length: 48 }).map((_, i) => {
          const lvl = [0, 0, 1, 2, 0, 3, 1, 2, 0, 1, 3, 2][i % 12];
          const cls = ["bg-white/[0.05]", "bg-brand-500/25", "bg-brand-500/55", "bg-brand-400 shadow-[0_0_8px_rgba(124,108,255,0.5)]"][lvl];
          return <span key={i} className={`aspect-square rounded-[4px] ${cls}`} />;
        })}
      </div>
    ),
  },
  {
    icon: ListChecks, hue: 210, title: "Task Flow",
    desc: "A built-in to-do list tied to your timer. Link a task, sprint on it, check it off.",
    visual: (
      <div className="mt-5 space-y-2">
        {["Ship the landing page", "Review pull requests"].map((t, i) => (
          <div key={t} className="flex items-center gap-2.5 rounded-lg border border-line bg-white/[0.03] px-3 py-2.5">
            <span className={`flex h-4.5 w-4.5 items-center justify-center rounded-md border ${i === 0 ? "border-mint-400 bg-mint-400/20 text-mint-400" : "border-white/20"}`}>
              {i === 0 && <Zap size={10} strokeWidth={3} />}
            </span>
            <span className={`text-xs font-medium ${i === 0 ? "text-white" : "text-[#a5a2c8]"}`}>{t}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: Medal, hue: 330, title: "Badges + XP Levels",
    desc: "Every focused minute earns XP. Unlock 12 badges — from First Blood to The Deep End.",
    visual: (
      <div className="mt-5 flex items-center gap-3">
        <BadgeIcon badge={{ icon: "zap", hue: 45, name: "First Blood" }} size={44} />
        <BadgeIcon badge={{ icon: "flame", hue: 15, name: "On Fire" }} size={44} />
        <BadgeIcon badge={{ icon: "crown", hue: 300, name: "The Deep End" }} size={44} />
        <LevelChip level={8} />
      </div>
    ),
  },
];

const STEPS = [
  { n: "01", icon: Sparkles, title: "Create your account", desc: "20 seconds. Username, password, done. No email, no credit card, no nonsense." },
  { n: "02", icon: Users, title: "Form your squad", desc: "Spin up a squad, drop the invite code in your group chat, and your crew is in." },
  { n: "03", icon: Crown, title: "Climb the board", desc: "Sprint, earn XP, stack streaks, unlock badges — and take the crown from your friends." },
];

export default async function LandingPage() {
  const [user, totals] = await Promise.all([getSessionUser(), getArenaTotals()]);

  return (
    <div className="relative min-h-dvh overflow-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none absolute inset-0 bg-grid mask-fade-b" />
      <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.05]" />
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[860px] -translate-x-1/2 rounded-full bg-brand-600/22 blur-[140px] animate-blob" />
      <div className="pointer-events-none absolute top-[38rem] -left-40 h-[420px] w-[420px] rounded-full bg-neon-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute top-[52rem] -right-40 h-[420px] w-[420px] rounded-full bg-brand-500/14 blur-[120px]" />

      {/* Nav */}
      <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <Link href="/" aria-label="FocusArena home"><Logo /></Link>
        <nav className="hidden items-center gap-7 text-sm font-medium text-[#a5a2c8] md:flex">
          <a href="#features" className="transition hover:text-white">Features</a>
          <a href="#how" className="transition hover:text-white">How it works</a>
          <Link href="/leaderboard" className="transition hover:text-white">Leaderboard</Link>
        </nav>
        <div className="flex items-center gap-2.5">
          {user ? (
            <Link href="/dashboard" className="btn btn-primary !py-2.5">Open the Arena <ArrowRight size={15} /></Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost !py-2.5">Log in</Link>
              <Link href="/register" className="btn btn-primary !py-2.5">Start free</Link>
            </>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-10 md:pt-16 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <Reveal>
            <span className="chip !py-1.5 !text-[0.72rem]">
              <Sparkles size={12} className="text-neon-400" />
              The gamified Pomodoro arena — built for you and your crew
            </span>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="mt-6 text-[2.9rem] font-bold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl lg:text-[4.4rem]">
              Deep work
              <br />
              is a <span className="text-gradient">sport.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p className="mt-6 max-w-lg text-[1.05rem] leading-relaxed text-[#a5a2c8]">
              FocusArena turns Pomodoro sessions into a competition. Sprint in 25-minute rounds,
              earn XP, hold streaks, unlock badges — then flex on your friends from the top of the leaderboard.
            </p>
          </Reveal>
          <Reveal delay={260}>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <Link href="/register" className="btn btn-primary !px-7 !py-3.5 !text-base">
                Enter the Arena <ArrowRight size={17} />
              </Link>
              <a href="#how" className="btn btn-ghost !px-6 !py-3.5 !text-base">
                See how it works <ChevronRight size={16} />
              </a>
            </div>
          </Reveal>
          <Reveal delay={340}>
            <div className="mt-10 flex flex-wrap gap-x-9 gap-y-4">
              {[
                ["25/5", "Pomodoro cycles"],
                ["28", "Badges to unlock"],
                ["100%", "Free, forever"],
              ].map(([v, l]) => (
                <div key={l}>
                  <p className="tnum text-2xl font-bold text-white">{v}</p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-[0.14em] text-[#6d6a8f]">{l}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal delay={200} className="hidden md:block">
          <HeroRing />
        </Reveal>
      </section>

      {/* Live arena stats band */}
      {totals.sessions > 0 && (
        <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16">
          <Reveal>
            <div className="glass-card glass-card-hover grid grid-cols-2 gap-6 p-7 sm:grid-cols-4 sm:gap-4">
              {[
                { label: "Players in the arena", value: fmtBig(totals.players), hue: "#4ce3ff" },
                { label: "Focus sessions logged", value: fmtBig(totals.sessions), hue: "#7c6cff" },
                { label: "Minutes of deep work", value: fmtMinutes(totals.minutes), hue: "#4ade9e" },
                { label: "Badges unlocked", value: fmtBig(totals.badgesGiven), hue: "#fbbf24" },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="tnum text-2xl font-black tracking-tight sm:text-3xl" style={{ color: s.hue }}>
                    {s.value}
                  </p>
                  <p className="mt-1 text-[0.66rem] font-bold uppercase tracking-[0.16em] text-[#6d6a8f]">{s.label}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* Marquee */}
      <div className="relative z-10 border-y border-line bg-ink-900/60 py-4 backdrop-blur-sm">
        <div className="mask-fade-x overflow-hidden">
          <div className="flex w-max animate-marquee items-center gap-8 pr-8">
            {[...MARQUEE, ...MARQUEE].map((w, i) => (
              <span key={i} className="flex items-center gap-8 text-[0.8rem] font-bold tracking-[0.28em] text-[#6d6a8f]">
                {w} <Target size={12} className="text-brand-500" />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Features bento */}
      <section id="features" className="relative z-10 mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-brand-300">The Arsenal</p>
          <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-5xl">
            Everything you need to <span className="text-gradient">out-focus everyone</span>
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90}>
              <div className="glass-card glass-card-hover h-full p-6">
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{ background: `hsl(${f.hue} 85% 62% / 0.13)`, color: `hsl(${f.hue} 90% 72%)` }}
                >
                  <f.icon size={21} strokeWidth={2.1} />
                </span>
                <h3 className="mt-4 text-lg font-bold text-white">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-[#8f8cb0]">{f.desc}</p>
                {f.visual}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative z-10 border-y border-line bg-ink-900/50 py-24">
        <div className="mx-auto max-w-6xl px-5">
          <Reveal>
            <p className="text-center text-xs font-bold uppercase tracking-[0.3em] text-neon-400">Zero to locked-in</p>
            <h2 className="mt-3 text-center text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Up and running in <span className="text-gradient">one minute</span>
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 110}>
                <div className="glass-card glass-card-hover relative h-full overflow-hidden p-7">
                  <span className="tnum absolute -right-2 -top-6 text-[5.5rem] font-bold text-white/[0.045]">{s.n}</span>
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/14 text-brand-300">
                    <s.icon size={21} />
                  </span>
                  <h3 className="mt-5 text-lg font-bold text-white">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8f8cb0]">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 mx-auto max-w-6xl px-5 py-24">
        <Reveal>
          <div className="glass-card relative overflow-hidden p-1">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-64 w-[520px] -translate-x-1/2 rounded-full bg-brand-500/25 blur-[90px]" />
            <div className="relative flex flex-col items-center gap-6 rounded-[1.1rem] border border-line bg-ink-900/70 px-6 py-16 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
                <Trophy size={26} />
              </span>
              <h2 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-4xl">
                The board is empty and the <span className="text-gradient">crown is unclaimed.</span>
              </h2>
              <p className="max-w-md text-sm leading-relaxed text-[#8f8cb0]">
                Grab your friends, start your first sprint tonight, and find out who in the group chat can actually focus.
              </p>
              <Link href="/register" className="btn btn-primary !px-8 !py-3.5 !text-base">
                Claim your spot <ArrowRight size={17} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-8 sm:flex-row">
          <Logo size={28} />
          <p className="text-xs text-[#6d6a8f]">
            FocusArena — deep work is a sport. Free forever, no ads, no tracking.
          </p>
          <div className="flex gap-5 text-xs font-medium text-[#8f8cb0]">
            <Link href="/login" className="hover:text-white">Log in</Link>
            <Link href="/register" className="hover:text-white">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
