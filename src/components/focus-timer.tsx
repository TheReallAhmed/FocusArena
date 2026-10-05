"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Play, Pause, RotateCcw, SkipForward, Settings2, Zap, Flame,
  CheckCircle2, ListChecks, X, LoaderCircle, Trophy, Maximize2,
  Minimize2, Volume2, VolumeX, Keyboard,
} from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { toggleTaskAction } from "@/server/actions";
import { fmtClock } from "@/lib/dates";
import { BadgeIcon } from "@/components/widgets";

type Mode = "focus" | "short" | "long";
type TaskLite = { id: number; title: string; priority: string };

const MODE_META: Record<Mode, { label: string; a: string; b: string; chip: string }> = {
  focus: { label: "Focus", a: "#7c6cff", b: "#4ce3ff", chip: "text-brand-300" },
  short: { label: "Short break", a: "#34d399", b: "#4ce3ff", chip: "text-mint-400" },
  long: { label: "Long break", a: "#38bdf8", b: "#a78bfa", chip: "text-sky-300" },
};

export function FocusTimer({
  tasks,
  initialTaskId,
  doneToday,
  displayName,
  todayMinutes = 0,
  dailyGoal = 120,
}: {
  tasks: TaskLite[];
  initialTaskId: number | null;
  doneToday: number;
  displayName: string;
  todayMinutes?: number;
  dailyGoal?: number;
}) {
  const router = useRouter();
  const timer = useTimer();
  const {
    mode, runStatus, msLeft, cycles, taskId, todayMin, lastResult,
    settings, setSettings, seedDaily, pToggle, pReset, pSkip, pSetMode, pSetTask,
    partialMode, setPartialMode,
  } = timer;

  const [zen, setZen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showBadges, setShowBadges] = useState(false);
  const [xpPop, setXpPop] = useState<number | null>(null);
  const [saving, startSave] = useTransition();
  const [prevGained, setPrevGained] = useState<number | null>(null);
  const resultRef = useRef(lastResult);
  const seededRef = useRef(false);

  /* seed day counters + initial task from the server */
  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      seedDaily(doneToday, todayMinutes);
      if (initialTaskId) pSetTask(initialTaskId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* react to freshly-banked rounds */
  useEffect(() => {
    if (lastResult && lastResult !== resultRef.current) {
      resultRef.current = lastResult;
      setPrevGained(lastResult.gained);
      setXpPop(lastResult.gained);
      if (lastResult.newBadges.length > 0) setShowBadges(true);
      const t = setTimeout(() => setXpPop(null), 2000);
      return () => clearTimeout(t);
    }
  }, [lastResult]);

  /* tab title */
  const secondsLeft = Math.round(msLeft / 1000);
  useEffect(() => {
    document.title = `${fmtClock(secondsLeft)} ${MODE_META[mode].label} · FocusArena`;
    return () => { document.title = "Focus · FocusArena"; };
  }, [secondsLeft, mode]);

  const toggleZen = useCallback(() => {
    const next = !zen;
    setZen(next);
    try {
      if (next && !document.fullscreenElement) void document.documentElement.requestFullscreen().catch(() => {});
      if (!next && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch { /* fullscreen unsupported */ }
  }, [zen]);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT") return;
      if (e.code === "Space") { e.preventDefault(); pToggle(); }
      else if (e.key === "r" || e.key === "R") pReset();
      else if (e.key === "s" || e.key === "S") pSkip();
      else if (e.key === "m" || e.key === "M") setSettings(settings.durations, settings.autoStart, !settings.muted);
      else if (e.key === "Escape") setZen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pToggle, pReset, pSkip, setSettings, settings]);

  const onDurationChange = (key: Mode, value: number) => {
    const v = Math.max(1, Math.min(120, Math.round(value || 0)));
    setSettings({ ...settings.durations, [key]: v }, settings.autoStart, settings.muted);
  };

  const completeCurrentTask = () => {
    if (!taskId) return;
    const id = taskId;
    pSetTask(null);
    startSave(async () => {
      await toggleTaskAction(id);
      router.refresh();
    });
  };

  const meta = MODE_META[mode];
  const total = settings.durations[mode] * 60_000;
  const progress = total > 0 ? 1 - msLeft / total : 0;
  const C = 2 * Math.PI * 150;
  const running = runStatus === "running";
  const activeTask = tasks.find((t) => t.id === taskId) ?? null;
  const dotsInCycle = cycles % 4;

  const ring = (sizeCls: string) => (
    <div className={`relative mx-auto aspect-square w-full ${sizeCls}`}>
      {running && (
        <div className="absolute inset-8 rounded-full animate-pulse-ring" style={{ border: `1px solid ${meta.a}55` }} />
      )}
      <svg viewBox="0 0 320 320" className="relative h-full w-full -rotate-90">
        <defs>
          <linearGradient id="timer-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={meta.a} />
            <stop offset="1" stopColor={meta.b} />
          </linearGradient>
        </defs>
        <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
        <circle
          cx="160" cy="160" r="150" fill="none" stroke="url(#timer-grad)" strokeWidth="9"
          strokeLinecap="round" strokeDasharray={C}
          strokeDashoffset={C * (1 - progress)}
          style={{ transition: "stroke-dashoffset 0.35s linear, stroke 0.5s" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
        <span className={`text-[0.65rem] font-bold uppercase tracking-[0.4em] ${meta.chip}`}>{meta.label}</span>
        <span className="tnum font-mono text-[4.2rem] font-bold leading-none tracking-tight text-white sm:text-[4.8rem]">
          {fmtClock(secondsLeft)}
        </span>
        <div className="mt-1 flex items-center gap-2">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-2 w-2 rounded-full transition-all duration-500"
              style={{
                background: i < dotsInCycle ? meta.a : "rgba(255,255,255,0.12)",
                boxShadow: i < dotsInCycle ? `0 0 10px ${meta.a}` : undefined,
              }}
            />
          ))}
          <span className="tnum ml-1 text-[0.65rem] font-medium text-[#6d6a8f]">
            {cycles} round{cycles === 1 ? "" : "s"} today
          </span>
        </div>
      </div>
      {xpPop !== null && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 animate-xp-pop">
          <span className="chip !border-brand-500/50 !bg-brand-500/20 !text-brand-200 !text-sm !font-bold">
            <Zap size={14} /> +{xpPop} XP
          </span>
        </div>
      )}
    </div>
  );

  const controls = (
    <div className="relative mt-7 flex items-center justify-center gap-3.5">
      <button
        onClick={pReset}
        className="btn btn-ghost !rounded-full !p-3.5"
        title={partialMode === "yes" ? "Stop — elapsed minutes are banked (R)" : "Reset — no credit for partial time (R)"}
      >
        <RotateCcw size={18} />
      </button>
      <button
        onClick={pToggle}
        disabled={saving}
        className="btn btn-primary !rounded-full !px-11 !py-4 !text-lg !font-bold"
        style={{ boxShadow: `0 12px 42px -8px ${meta.a}` }}
      >
        {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
        {running ? "Pause" : runStatus === "paused" ? "Resume" : "Start"}
      </button>
      <button onClick={pSkip} className="btn btn-ghost !rounded-full !p-3.5" title="Skip phase (S)">
        <SkipForward size={18} />
      </button>
    </div>
  );

  return (
    <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
      {/* Stage */}
      <div className="glass-card relative overflow-hidden p-6 sm:p-9">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full blur-[120px] transition-colors duration-1000"
          style={{ background: `color-mix(in srgb, ${meta.a} 22%, transparent)` }}
        />

        {/* top bar */}
        <div className="relative flex items-center justify-between gap-2">
          <div className="flex gap-1.5 rounded-full border border-line bg-white/[0.03] p-1">
            {(Object.keys(MODE_META) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => pSetMode(m)}
                className={`tab-pill !px-3 !py-1.5 !text-[0.72rem] sm:!px-4 ${mode === m ? "tab-pill-active" : ""}`}
              >
                {MODE_META[m].label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettings(settings.durations, settings.autoStart, !settings.muted)}
              className={`btn btn-ghost !rounded-full !p-2.5 ${settings.muted ? "!text-rose-300" : ""}`}
              title={settings.muted ? "Unmute (M)" : "Mute (M)"}
            >
              {settings.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className={`btn btn-ghost !rounded-full !p-2.5 ${showSettings ? "!text-white !border-brand-500/40" : ""}`}
              title="Timer settings"
            >
              <Settings2 size={16} />
            </button>
            <button onClick={toggleZen} className="btn btn-ghost !rounded-full !p-2.5 hover:!text-neon-300" title="Zen mode — fullscreen">
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* persistence notice */}
        <div className="relative mt-3 flex justify-center">
          <span className="chip !border-mint-400/30 !bg-mint-400/8 !text-[0.62rem] !font-semibold !text-mint-400/90">
            <Zap size={10} /> Keeps running while you navigate — even if you leave the site
          </span>
        </div>
        {partialMode !== "ask" && (
          <div className="relative mt-2 flex justify-center">
            <span className="chip !py-0.5 !text-[0.6rem] !font-semibold">
              {partialMode === "yes"
                ? "Partial time counts if you stop early"
                : "Only completed rounds count"}
            </span>
          </div>
        )}

        {/* settings drawer */}
        {showSettings && (
          <div className="relative mt-3 grid gap-3 rounded-2xl border border-line bg-ink-900/80 p-4 animate-scale-in sm:grid-cols-4">
            {(["focus", "short", "long"] as Mode[]).map((m) => (
              <label key={m} className="block">
                <span className="mb-1 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8f8cb0]">
                  {MODE_META[m].label} (min)
                </span>
                <input
                  type="number" min={1} max={120} value={settings.durations[m]}
                  onChange={(e) => onDurationChange(m, Number(e.target.value))}
                  className="input tnum !py-2 text-center"
                />
              </label>
            ))}
            <label className="flex items-end justify-between gap-2 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5">
              <span className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8f8cb0]">Auto-start</span>
              <input
                type="checkbox" checked={settings.autoStart}
                onChange={(e) => setSettings(settings.durations, e.target.checked, settings.muted)}
                className="h-4 w-4 accent-[#7c6cff]"
              />
            </label>

            <div className="sm:col-span-4">
              <span className="mb-1.5 block text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#8f8cb0]">
                If you stop mid-round
              </span>
              <div className="flex flex-wrap gap-2">
                {([
                  { k: "yes", label: "Count the minutes" },
                  { k: "no", label: "Only completed rounds" },
                  { k: "ask", label: "Ask me again" },
                ] as const).map((o) => (
                  <button
                    key={o.k}
                    type="button"
                    onClick={() => setPartialMode(o.k)}
                    className={`tab-pill !px-3.5 !py-1.5 !text-[0.7rem] ${partialMode === o.k ? "tab-pill-active" : ""}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {ring("mt-4 max-w-[400px]")}

        {/* today goal chip */}
        <div className="relative mx-auto mt-4 flex justify-center">
          <span
            className={`chip !text-[0.7rem] !font-semibold ${
              todayMin >= dailyGoal ? "!border-mint-400/45 !bg-mint-400/12 !text-mint-400" : ""
            }`}
            title={`Daily goal: ${dailyGoal}m`}
          >
            <Flame size={12} className={todayMin >= dailyGoal ? "text-gold-400" : "text-brand-300"} />
            Today: {Math.round(todayMin)}m / {dailyGoal}m
            {todayMin >= dailyGoal && " · goal crushed"}
          </span>
        </div>

        {/* result chips */}
        {lastResult && (
          <div className="relative mx-auto mt-2 flex max-w-sm flex-wrap items-center justify-center gap-2 animate-fade-up">
            <span className="chip !text-[0.7rem]">
              <Flame size={12} className="text-gold-400" /> {lastResult.streak} day streak
            </span>
            {lastResult.leveledUp && (
              <span className="chip !border-neon-400/50 !bg-neon-400/15 !text-neon-300 !text-[0.7rem] !font-bold">
                <Trophy size={12} /> LEVEL {lastResult.level} REACHED
              </span>
            )}
            {prevGained !== null && (
              <span className="chip !text-[0.7rem] text-brand-300">+{prevGained} XP banked</span>
            )}
          </div>
        )}

        {controls}

        <p className="relative mt-4 hidden items-center justify-center gap-4 text-[0.68rem] text-[#5c5a78] sm:flex">
          <Keyboard size={12} />
          <span><b className="text-[#8f8cb0]">Space</b> start/pause</span>
          <span><b className="text-[#8f8cb0]">R</b> reset</span>
          <span><b className="text-[#8f8cb0]">S</b> skip</span>
          <span><b className="text-[#8f8cb0]">M</b> mute</span>
        </p>

        {/* active task */}
        <div className="relative mx-auto mt-5 max-w-md">
          {activeTask ? (
            <div className="flex items-center gap-3 rounded-2xl border border-brand-500/35 bg-brand-500/10 px-4 py-3">
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-400" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-brand-300">Focusing on</p>
                <p className="truncate text-sm font-semibold text-white">{activeTask.title}</p>
              </div>
              <button
                onClick={completeCurrentTask}
                className="btn btn-ghost shrink-0 !px-3 !py-1.5 !text-[0.7rem] hover:!text-mint-400"
                title="Mark task done"
              >
                <CheckCircle2 size={14} /> Done
              </button>
              <button onClick={() => pSetTask(null)} className="shrink-0 text-[#6d6a8f] hover:text-white" title="Unlink">
                <X size={15} />
              </button>
            </div>
          ) : (
            <p className="text-center text-xs text-[#6d6a8f]">
              Free focus — pick a task on the right to sprint against it.
            </p>
          )}
        </div>
      </div>

      {/* Side panel */}
      <div className="space-y-5">
        <div className="glass-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <ListChecks size={15} className="text-brand-300" /> Attack a task
            </h2>
            {saving && <LoaderCircle size={14} className="animate-spin text-[#6d6a8f]" />}
          </div>
          {tasks.length === 0 ? (
            <div className="py-5 text-center">
              <p className="text-sm text-[#8f8cb0]">No open tasks.</p>
              <a href="/tasks" className="mt-2 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200">
                Create one on the Tasks page →
              </a>
            </div>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
              {tasks.map((t) => {
                const active = t.id === taskId;
                return (
                  <li key={t.id}>
                    <button
                      onClick={() => pSetTask(active ? null : t.id)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                        active ? "border-brand-500/50 bg-brand-500/12" : "border-line bg-white/[0.02] hover:border-white/20"
                      }`}
                    >
                      <span className={`h-2 w-2 shrink-0 rounded-full ${
                        t.priority === "high" ? "bg-rose-400" : t.priority === "low" ? "bg-sky-400" : "bg-brand-400"
                      }`} />
                      <span className={`min-w-0 flex-1 truncate text-sm ${active ? "font-semibold text-white" : "text-[#c7c4de]"}`}>
                        {t.title}
                      </span>
                      {active && <Zap size={13} className="shrink-0 text-brand-300" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-white">Ritual</h2>
          <ul className="mt-3 space-y-2.5 text-[0.83rem] leading-relaxed text-[#8f8cb0]">
            <li className="flex gap-2.5"><span className="tnum font-bold text-brand-300">01</span> One task per round. No multitasking.</li>
            <li className="flex gap-2.5"><span className="tnum font-bold text-brand-300">02</span> Timer survives navigation — feel free to check the board mid-round.</li>
            <li className="flex gap-2.5"><span className="tnum font-bold text-brand-300">03</span> After 4 rounds, take the long break — you earned it.</li>
            <li className="flex gap-2.5"><span className="tnum font-bold text-brand-300">04</span> Check the board. Pass {displayName.split(" ")[0]} if you can.</li>
          </ul>
        </div>
      </div>

      {/* ── Zen mode overlay ── */}
      {zen && (
        <div className="fixed inset-0 z-[130] flex flex-col items-center justify-center bg-ink-950/98 backdrop-blur-2xl animate-fade-up">
          <div className="pointer-events-none absolute inset-0 bg-noise opacity-[0.04]" />
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[140px] transition-colors duration-1000"
            style={{ background: `color-mix(in srgb, ${meta.a} 18%, transparent)` }}
          />
          <button
            onClick={toggleZen}
            className="btn btn-ghost absolute right-5 top-5 !rounded-full !p-3"
            title="Exit zen mode (Esc)"
          >
            <Minimize2 size={18} />
          </button>
          {activeTask && (
            <p className="relative mb-6 max-w-md truncate text-center text-sm font-semibold text-[#a5a2c8]">
              {activeTask.title}
            </p>
          )}
          {ring("relative max-w-[min(74vw,440px)]")}
          <div className="relative">{controls}</div>
          <p className="relative mt-6 text-[0.68rem] font-medium uppercase tracking-[0.3em] text-[#5c5a78]">
            Zen mode · Esc to exit
          </p>
        </div>
      )}

      {/* Badge unlock modal */}
      {showBadges && lastResult && lastResult.newBadges.length > 0 && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-ink-950/80 p-4 backdrop-blur-sm" onClick={() => setShowBadges(false)}>
          <div className="glass-card w-full max-w-sm p-8 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.35em] text-gold-400">Badge unlocked</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
              {lastResult.newBadges.map((b) => (
                <div key={b.key} className="flex flex-col items-center gap-2.5">
                  <BadgeIcon badge={b} size={72} />
                  <div>
                    <p className="text-sm font-bold text-white">{b.name}</p>
                    <p className="mt-0.5 max-w-44 text-[0.7rem] text-[#8f8cb0]">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setShowBadges(false)} className="btn btn-primary mt-8 w-full !py-3">
              Keep grinding
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
