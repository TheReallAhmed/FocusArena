"use client";

import { useEffect, useRef, useState } from "react";
import {
  Play, Pause, ListChecks, Zap, PiggyBank, Trash2, Flame,
  Trophy, Info,
} from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { BadgeIcon } from "@/components/widgets";

type TaskLite = { id: number; title: string; priority: string };

const A = "#fbbf24";
const B = "#fb7185";

function fmtHMS(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function StopwatchClient({
  tasks,
  todayMinutes,
  dailyGoal,
}: {
  tasks: TaskLite[];
  todayMinutes: number;
  dailyGoal: number;
}) {
  const timer = useTimer();
  const { swStatus, swElapsedMs, swTaskId, swToggle, swSetTask, swBank, swDiscard, todayMin, lastResult, runStatus, partialMode } = timer;

  const [bankToast, setBankToast] = useState<number | null>(null);
  const [showBadges, setShowBadges] = useState(false);
  const seededRef = useRef(false);
  const prevResultRef = useRef(lastResult);

  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
      timer.seedDaily(0, todayMinutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* bank feedback */
  useEffect(() => {
    if (lastResult && lastResult !== prevResultRef.current) {
      prevResultRef.current = lastResult;
      setBankToast(lastResult.gained);
      if (lastResult.newBadges.length > 0) setShowBadges(true);
      setTimeout(() => setBankToast(null), 2200);
    }
  }, [lastResult]);

  const running = swStatus === "running";
  const bankableMin = Math.floor(swElapsedMs / 60_000);
  const activeTask = tasks.find((t) => t.id === swTaskId) ?? null;
  const pomodoroRunning = runStatus === "running";
  const blocked = pomodoroRunning && !running;

  /* tab title */
  useEffect(() => {
    if (swStatus !== "idle") {
      document.title = `${fmtHMS(swElapsedMs)} Stopwatch · FocusArena`;
      return () => { document.title = "Stopwatch · FocusArena"; };
    }
    document.title = "Stopwatch · FocusArena";
  }, [swElapsedMs, swStatus]);

  const ring = () => {
    // visual progress inside each completed hour
    const withinHour = (swElapsedMs % 3_600_000) / 3_600_000;
    const C = 2 * Math.PI * 150;
    return (
      <div className="relative mx-auto aspect-square w-full max-w-[400px]">
        {running && (
          <div className="absolute inset-8 rounded-full animate-pulse-ring" style={{ border: `1px solid ${A}55` }} />
        )}
        <svg viewBox="0 0 320 320" className="relative h-full w-full -rotate-90">
          <defs>
            <linearGradient id="sw-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor={A} />
              <stop offset="1" stopColor={B} />
            </linearGradient>
          </defs>
          <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
          <circle
            cx="160" cy="160" r="150" fill="none" stroke="url(#sw-grad)" strokeWidth="9"
            strokeLinecap="round" strokeDasharray={C}
            strokeDashoffset={C * (1 - Math.max(withinHour, running ? 0.003 : 0))}
            style={{ transition: "stroke-dashoffset 0.4s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.4em] text-gold-400">
            {running ? "Tracking" : swStatus === "paused" ? "Paused" : "Stopwatch"}
          </span>
          <span className="tnum font-mono text-[3.6rem] font-bold leading-none tracking-tight text-white sm:text-[4.2rem]">
            {fmtHMS(swElapsedMs)}
          </span>
          <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-[#8f8cb0]">
            <Zap size={11} className="text-gold-400" />
            {bankableMin > 0 ? `${bankableMin}m bankable → +${bankableMin} XP` : "full hours glow the ring"}
          </span>
          {bankToast !== null && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 animate-xp-pop">
              <span className="chip !border-gold-400/50 !bg-gold-400/15 !text-gold-300 !text-sm !font-bold">
                <PiggyBank size={14} /> +{bankToast} XP banked
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-400">Time Logger</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Stopwatch <span className="text-gradient">mode</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#8f8cb0]">
          Free-form tracking for long study blocks. Pick a task, start the clock, and{" "}
          <b className="text-white">bank the time as XP</b> whenever you stop — it also feeds your streak, badges and the leaderboard.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Stage */}
        <div className="glass-card relative overflow-hidden p-6 sm:p-9">
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full blur-[120px]"
            style={{ background: `color-mix(in srgb, ${A} 18%, transparent)` }}
          />

          <div className="relative flex justify-center">
            <span className="chip !border-mint-400/30 !bg-mint-400/8 !text-[0.62rem] !font-semibold !text-mint-400/90">
              <Zap size={10} /> Keeps counting while you navigate — even if you close the site
            </span>
          </div>

          <div className="mt-4">{ring()}</div>

          {/* result line */}
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
            </div>
          )}

          {/* controls */}
          <div className="relative mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <button
              onClick={swDiscard}
              disabled={swStatus === "idle"}
              className={`btn btn-ghost !rounded-full !p-3.5 ${partialMode === "yes" ? "hover:!text-mint-400" : "hover:!text-rose-300"}`}
              title={partialMode === "yes" ? "Stop — tracked minutes are banked automatically" : "Stop and discard tracked time"}
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={swToggle}
              disabled={blocked}
              title={blocked ? "Pomodoro is running — finish or pause it first" : undefined}
              className="btn btn-primary !rounded-full !px-11 !py-4 !text-lg !font-bold"
              style={{
                boxShadow: `0 12px 42px -8px ${A}`,
                background: `linear-gradient(135deg, ${A}, #d97706)`,
                opacity: blocked ? 0.5 : 1,
              }}
            >
              {running ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              {running ? "Pause" : swStatus === "paused" ? "Resume" : "Start"}
            </button>
            <button
              onClick={swBank}
              disabled={bankableMin < 1}
              className="btn !rounded-full !px-5 !py-3.5 !font-bold text-ink-950 transition-all"
              style={{
                background: bankableMin >= 1 ? "linear-gradient(135deg,#4ade9e,#22d3ee)" : "rgba(255,255,255,0.06)",
                color: bankableMin >= 1 ? "#06060d" : "#5c5a78",
                boxShadow: bankableMin >= 1 ? "0 10px 34px -8px rgba(74,222,158,0.55)" : undefined,
                cursor: bankableMin >= 1 ? "pointer" : "not-allowed",
                border: "none",
              }}
              title={bankableMin >= 1 ? `Bank ${bankableMin} minutes as XP` : "Track at least 1 minute to bank"}
            >
              <PiggyBank size={18} />
              Bank{bankableMin >= 1 ? ` +${bankableMin}` : ""}
            </button>
          </div>

          {/* blocked note */}
          {blocked && (
            <p className="relative mt-4 flex items-center justify-center gap-2 text-xs text-gold-400/90">
              <Info size={13} /> A Pomodoro round is already running — one engine at a time.
            </p>
          )}

          {/* active task */}
          <div className="relative mx-auto mt-6 max-w-md">
            {activeTask ? (
              <div className="flex items-center gap-3 rounded-2xl border border-gold-400/35 bg-gold-400/10 px-4 py-3">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-gold-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-gold-400">Tracking time on</p>
                  <p className="truncate text-sm font-semibold text-white">{activeTask.title}</p>
                </div>
                <button onClick={() => swSetTask(null)} className="shrink-0 text-[#6d6a8f] hover:text-white" title="Unlink">
                  ×
                </button>
              </div>
            ) : (
              <p className="text-center text-xs text-[#6d6a8f]">
                No task linked — pick one on the right, or track free study time.
              </p>
            )}
          </div>
        </div>

        {/* Side */}
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <ListChecks size={15} className="text-gold-400" /> What are you working on?
            </h2>
            {tasks.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-sm text-[#8f8cb0]">No open tasks.</p>
                <a href="/tasks" className="mt-2 inline-block text-xs font-semibold text-brand-300 hover:text-brand-200">
                  Create one first →
                </a>
              </div>
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {tasks.map((t) => {
                  const active = t.id === swTaskId;
                  return (
                    <li key={t.id}>
                      <button
                        onClick={() => swSetTask(active ? null : t.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all ${
                          active ? "border-gold-400/50 bg-gold-400/10" : "border-line bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <span className={`h-2 w-2 shrink-0 rounded-full ${
                          t.priority === "high" ? "bg-rose-400" : t.priority === "low" ? "bg-sky-400" : "bg-brand-400"
                        }`} />
                        <span className={`min-w-0 flex-1 truncate text-sm ${active ? "font-semibold text-white" : "text-[#c7c4de]"}`}>
                          {t.title}
                        </span>
                        {active && <Zap size={13} className="shrink-0 text-gold-400" />}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="glass-card p-5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <Flame size={15} className="text-brand-300" /> Today so far
            </h2>
            <p className="tnum mt-3 text-3xl font-bold text-white">
              {Math.round(todayMin)}<span className="text-base font-semibold text-[#8f8cb0]">m / {dailyGoal}m</span>
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-400 to-brand-500 transition-all duration-700"
                style={{ width: `${Math.min(100, Math.round((todayMin / Math.max(1, dailyGoal)) * 100))}%` }}
              />
            </div>
            <p className="mt-2.5 text-xs text-[#8f8cb0]">
              Every banked minute counts here, on your streak and on the board.
            </p>
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-white">How banking works</h2>
            <ul className="mt-3 space-y-2.5 text-[0.83rem] leading-relaxed text-[#8f8cb0]">
              <li className="flex gap-2.5"><span className="tnum font-bold text-gold-400">01</span> Press start and go do the work — the clock survives navigation and closed tabs.</li>
              <li className="flex gap-2.5"><span className="tnum font-bold text-gold-400">02</span> Hit <b className="text-white">Bank</b> to convert tracked minutes into XP (1m = 1 XP) and deep-work minutes on the task.</li>
              <li className="flex gap-2.5"><span className="tnum font-bold text-gold-400">03</span> Banking fires the loud chime, updates your streak and can unlock badges.</li>
              <li className="flex gap-2.5">
                <span className="tnum font-bold text-gold-400">04</span>
                {partialMode === "yes"
                  ? "Your setting: stopping early still banks the tracked minutes."
                  : partialMode === "no"
                    ? "Your setting: minutes only count when you press Bank."
                    : "You will be asked how early stops are handled when you start."}
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Badge modal */}
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
