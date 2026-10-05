"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo,
  useRef, useState, type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Timer, Watch, Zap, X, ChevronRight, HelpCircle, Check, Ban } from "lucide-react";
import { completeFocusSession, type FocusResult } from "@/server/actions";
import { playChime, unlockAudio } from "@/lib/sound";
import { fmtClock } from "@/lib/dates";

/* ------------------------------- TYPES ------------------------------- */

type Mode = "focus" | "short" | "long";
type RunStatus = "idle" | "running" | "paused";

type Durations = { focus: number; short: number; long: number };

/** How early stops are handled: ask the user, count them, or discard them. */
export type PartialMode = "ask" | "yes" | "no";

type PomodoroState = {
  mode: Mode;
  status: RunStatus;
  endAt: number | null;      // epoch ms when running
  remainingMs: number | null; // when paused
  cycles: number;
  taskId: number | null;
};

type StopwatchState = {
  status: RunStatus;
  startedAt: number | null;   // epoch ms baseline when running
  accumulatedMs: number;
  taskId: number | null;
};

type StoredState = {
  v: 1;
  day: string;
  pomodoro: PomodoroState;
  stopwatch: StopwatchState;
  durations: Durations;
  autoStart: boolean;
  muted: boolean;
  partialMode: PartialMode;
  todayMin: number;
};

export type Celebration = {
  id: number;
  icon: "xp" | "badge";
  title: string;
  sub?: string;
  hue?: number;
};

type TimerContextValue = {
  /* pomodoro */
  mode: Mode;
  runStatus: RunStatus;
  msLeft: number;
  cycles: number;
  taskId: number | null;
  todayMin: number;
  lastResult: FocusResult | null;
  dismissResult: () => void;
  pToggle: () => void;
  pReset: () => void;
  pSkip: () => void;
  pSetMode: (m: Mode) => void;
  pSetTask: (id: number | null) => void;
  settings: { durations: Durations; autoStart: boolean; muted: boolean };
  setSettings: (durations: Durations, autoStart: boolean, muted: boolean) => void;
  partialMode: PartialMode;
  setPartialMode: (m: PartialMode) => void;
  seedDaily: (cycles: number, todayMin: number) => void;
  /* stopwatch */
  swStatus: RunStatus;
  swElapsedMs: number;
  swTaskId: number | null;
  swToggle: () => void;
  swSetTask: (id: number | null) => void;
  swBank: () => void;
  swDiscard: () => void;
  /* celebrations */
  celebrations: Celebration[];
  dismissCelebration: (id: number) => void;
};

const TimerContext = createContext<TimerContextValue | null>(null);

export function useTimer(): TimerContextValue {
  const v = useContext(TimerContext);
  if (!v) throw new Error("useTimer must be used inside TimerProvider");
  return v;
}

/* ------------------------------ STORAGE ------------------------------ */

const KEY = "fa_timer_v1";

const utcDay = () => new Date().toISOString().slice(0, 10);

const DEFAULT_DURATIONS: Durations = { focus: 25, short: 5, long: 15 };

function defaultState(day: string): StoredState {
  return {
    v: 1,
    day,
    pomodoro: { mode: "focus", status: "idle", endAt: null, remainingMs: null, cycles: 0, taskId: null },
    stopwatch: { status: "idle", startedAt: null, accumulatedMs: 0, taskId: null },
    durations: DEFAULT_DURATIONS,
    autoStart: false,
    muted: false,
    partialMode: "ask",
    todayMin: 0,
  };
}

function loadState(): StoredState {
  const day = utcDay();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState(day);
    const s = JSON.parse(raw) as Partial<StoredState>;
    const base = defaultState(day);
    const merged: StoredState = {
      ...base,
      ...s,
      durations: { ...base.durations, ...(s.durations ?? {}) },
      pomodoro: { ...base.pomodoro, ...(s.pomodoro ?? {}) },
      stopwatch: { ...base.stopwatch, ...(s.stopwatch ?? {}) },
    } as StoredState;
    // new day → reset daily counters (focus page will reseed from server)
    if (merged.day !== day) {
      merged.day = day;
      merged.pomodoro.cycles = 0;
      merged.todayMin = 0;
    }
    return merged;
  } catch {
    return defaultState(day);
  }
}

/* ----------------------------- ACENTS -------------------------------- */

const ACCENT: Record<Mode, { a: string; b: string; label: string }> = {
  focus: { a: "#7c6cff", b: "#4ce3ff", label: "Focus" },
  short: { a: "#34d399", b: "#4ce3ff", label: "Short break" },
  long: { a: "#38bdf8", b: "#a78bfa", label: "Long break" },
};

/* ------------------------------ PROVIDER ------------------------------ */

export function TimerProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [st, setSt] = useState<StoredState | null>(null);
  const [msLeft, setMsLeft] = useState(0);
  const [swElapsedMs, setSwElapsedMs] = useState(0);
  const [lastResult, setLastResult] = useState<FocusResult | null>(null);
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const [pendingAsk, setPendingAsk] = useState<null | "pomodoro" | "stopwatch">(null);
  const stRef = useRef<StoredState | null>(null);
  const pathRef = useRef(pathname);

  stRef.current = st;
  pathRef.current = pathname;

  const persist = useCallback((next: StoredState) => {
    stRef.current = next;
    setSt(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch { /* storage unavailable */ }
  }, []);

  const dismissCelebration = useCallback((id: number) => {
    setCelebrations((cs) => cs.filter((c) => c.id !== id));
  }, []);

  const pushCelebration = useCallback((c: Omit<Celebration, "id">) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setCelebrations((cs) => [...cs.slice(-2), { ...c, id }]);
    setTimeout(() => {
      setCelebrations((cs) => cs.filter((x) => x.id !== id));
    }, 6000);
  }, []);

  const migrateSettings = useCallback(() => {
    // One-time migration of old focus-page settings
    try {
      const raw = localStorage.getItem("fa_settings");
      if (!raw) return null;
      localStorage.removeItem("fa_settings");
      return JSON.parse(raw) as { focus?: number; short?: number; long?: number; autoStart?: boolean; muted?: boolean };
    } catch {
      return null;
    }
  }, []);

  /* --------------------------- CREDIT ENGINE --------------------------- */

  const credit = useCallback(async (minutes: number, taskId: number | null, kind: "focus" | "bank") => {
    try {
      const res = await completeFocusSession({ minutes, taskId });
      setLastResult(res);
      const cur = stRef.current;
      if (cur) persist({ ...cur, todayMin: cur.todayMin + minutes });
      if (!stRef.current?.muted) playChime(kind);

      const onFocusPage = pathRef.current === "/focus" || pathRef.current === "/stopwatch";
      if (!onFocusPage) {
        pushCelebration({
          icon: "xp",
          title: kind === "bank" ? `Banked +${res.gained} XP` : `Round banked — +${res.gained} XP`,
          sub: `streak ${res.streak}d · level ${res.level}`,
          hue: 255,
        });
      }
      for (const b of res.newBadges) {
        pushCelebration({ icon: "badge", title: `Badge unlocked: ${b.name}`, sub: b.desc, hue: b.hue });
      }
    } catch { /* offline: keep going */ }
  }, [persist, pushCelebration]);

  /* ---------------------- POMODORO TRANSITIONS ------------------------- */

  const durationMs = useCallback((mode: Mode, durations: Durations) => durations[mode] * 60_000, []);

  /** Resolve elapsed phases (also catches phases missed while the site was closed). */
  const resolvePomodoro = useCallback(async () => {
    const cur = stRef.current;
    if (!cur || cur.pomodoro.status !== "running" || !cur.pomodoro.endAt) return;

    let { mode, cycles, taskId } = cur.pomodoro;
    let endAt = cur.pomodoro.endAt;
    const now = Date.now();
    let guard = 0;

    while (endAt <= now && guard < 24) {
      guard++;
      if (mode === "focus") {
        const done = cycles + 1;
        const marker = `fa_claim_${endAt}`;
        let claimed = false;
        try {
          if (!localStorage.getItem(marker)) {
            localStorage.setItem(marker, "1");
            claimed = true;
          }
        } catch { claimed = true; }
        if (claimed) {
          await credit(cur.durations.focus, taskId, "focus");
        }
        cycles = done;
        const next: Mode = done % 4 === 0 ? "long" : "short";
        if (!cur.autoStart && endAt + durationMs(next, cur.durations) > now) {
          // stop and wait for the user on the break
          persist({
            ...stRef.current!,
            pomodoro: { mode: next, status: "paused", endAt: null, remainingMs: durationMs(next, cur.durations), cycles, taskId },
          });
          return;
        }
        mode = next;
        endAt += durationMs(next, cur.durations);
      } else {
        if (!cur.autoStart && endAt + durationMs("focus", cur.durations) > now) {
          persist({
            ...stRef.current!,
            pomodoro: { mode: "focus", status: "paused", endAt: null, remainingMs: durationMs("focus", cur.durations), cycles, taskId },
          });
          return;
        }
        mode = "focus";
        endAt += durationMs("focus", cur.durations);
      }
    }

    if (endAt <= now) {
      // absurdly long absence — just park the timer, nothing is lost
      persist({
        ...stRef.current!,
        pomodoro: { mode: "focus", status: "paused", endAt: null, remainingMs: durationMs("focus", cur.durations), cycles, taskId },
      });
      return;
    }

    persist({
      ...stRef.current!,
      pomodoro: { mode, status: "running", endAt, remainingMs: null, cycles, taskId },
    });
  }, [credit, durationMs, persist]);

  /* ------------------------------ TICK --------------------------------- */

  useEffect(() => {
    let loaded = loadState();
    const old = migrateSettings();
    if (old) {
      const clamp = (v: number | undefined, dflt: number) =>
        typeof v === "number" && v >= 1 && v <= 120 ? v : dflt;
      loaded = {
        ...loaded,
        durations: { focus: clamp(old.focus, 25), short: clamp(old.short, 5), long: clamp(old.long, 15) },
        autoStart: Boolean(old.autoStart),
        muted: Boolean(old.muted),
      };
    }
    setSt(loaded);
    stRef.current = loaded;
  }, [migrateSettings]);

  useEffect(() => {
    if (!st) return;
    // resolve any phases that ended while the page was closed
    void resolvePomodoro();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [st === null]);

  useEffect(() => {
    if (!st) return;
    const id = setInterval(() => {
      const cur = stRef.current;
      if (!cur) return;
      const now = Date.now();

      if (cur.pomodoro.status === "running" && cur.pomodoro.endAt) {
        const left = cur.pomodoro.endAt - now;
        setMsLeft(Math.max(0, left));
        if (left <= 0) {
          void resolvePomodoro();
        } else if (Math.floor(left / 1000) % 2 === 0) {
          // light-touch persistence while running
          try { localStorage.setItem(KEY, JSON.stringify(cur)); } catch { /* ignore */ }
        }
      } else if (cur.pomodoro.status === "paused" && cur.pomodoro.remainingMs !== null) {
        setMsLeft(cur.pomodoro.remainingMs);
      } else if (cur.pomodoro.status === "idle") {
        setMsLeft(durationMs(cur.pomodoro.mode, cur.durations));
      }

      if (cur.stopwatch.status === "running" && cur.stopwatch.startedAt) {
        setSwElapsedMs(cur.stopwatch.accumulatedMs + (now - cur.stopwatch.startedAt));
      } else {
        setSwElapsedMs(cur.stopwatch.accumulatedMs);
      }
    }, 250);
    return () => clearInterval(id);
  }, [st, resolvePomodoro, durationMs]);

  /* --------------------------- POMODORO API ----------------------------- */

  const pToggle = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    unlockAudio();
    const p = cur.pomodoro;
    if (cur.stopwatch.status === "running") return; // one engine at a time
    if (p.status === "running") {
      const remaining = Math.max(0, (p.endAt ?? 0) - Date.now());
      persist({ ...cur, pomodoro: { ...p, status: "paused", endAt: null, remainingMs: remaining } });
      return;
    }
    // first run of the day/device: ask how early stops should be handled
    if (cur.partialMode === "ask" && p.status !== "paused") {
      setPendingAsk("pomodoro");
      return;
    }
    const base = p.status === "paused" && p.remainingMs !== null ? p.remainingMs : durationMs(p.mode, cur.durations);
    persist({ ...cur, pomodoro: { ...p, status: "running", endAt: Date.now() + base, remainingMs: null } });
  }, [persist, durationMs]);

  const pReset = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const p = cur.pomodoro;
    // Stopping mid-round: bank the elapsed minutes only if the user opted in.
    if (p.mode === "focus" && p.status !== "idle" && cur.partialMode === "yes") {
      const total = durationMs("focus", cur.durations);
      const left = p.status === "running" ? Math.max(0, (p.endAt ?? 0) - Date.now()) : p.remainingMs ?? total;
      const elapsedMin = Math.floor((total - left) / 60_000);
      if (elapsedMin >= 1) void credit(elapsedMin, p.taskId, "bank");
    }
    persist({
      ...cur,
      pomodoro: { ...p, status: "idle", endAt: null, remainingMs: null },
    });
  }, [persist, durationMs, credit]);

  const pSetMode = useCallback((mode: Mode) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({
      ...cur,
      pomodoro: { ...cur.pomodoro, mode, status: "idle", endAt: null, remainingMs: null },
    });
  }, [persist]);

  const pSkip = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const p = cur.pomodoro;
    const next: Mode = p.mode === "focus" ? (p.cycles + 1) % 4 === 0 ? "long" : "short" : "focus";
    persist({
      ...cur,
      pomodoro: { ...p, mode: next, status: "idle", endAt: null, remainingMs: null },
    });
    setMsLeft(durationMs(next, cur.durations));
  }, [persist, durationMs]);

  const pSetTask = useCallback((id: number | null) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, pomodoro: { ...cur.pomodoro, taskId: id } });
  }, [persist]);

  const setSettings = useCallback((durations: Durations, autoStart: boolean, muted: boolean) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, durations, autoStart, muted });
    if (cur.pomodoro.status === "idle") {
      setMsLeft(durations[cur.pomodoro.mode] * 60_000);
    }
  }, [persist]);

  const seedDaily = useCallback((cycles: number, todayMin: number) => {
    const cur = stRef.current;
    if (!cur) return;
    // only seed when the store has no data for today yet
    if (cur.pomodoro.cycles === 0 && cycles > 0) {
      persist({ ...stRef.current!, pomodoro: { ...cur.pomodoro, cycles } });
    }
    if (cur.todayMin === 0 && todayMin > 0) {
      persist({ ...stRef.current!, todayMin });
    }
  }, [persist]);

  /* --------------------------- STOPWATCH API ---------------------------- */

  const swToggle = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    unlockAudio();
    const sw = cur.stopwatch;
    if (cur.pomodoro.status === "running" && sw.status !== "running") return;
    if (sw.status === "running" && sw.startedAt) {
      const acc = sw.accumulatedMs + (Date.now() - sw.startedAt);
      persist({ ...cur, stopwatch: { ...sw, status: "paused", startedAt: null, accumulatedMs: acc } });
      return;
    }
    if (cur.partialMode === "ask" && sw.status !== "paused") {
      setPendingAsk("stopwatch");
      return;
    }
    persist({ ...cur, stopwatch: { ...sw, status: "running", startedAt: Date.now() } });
  }, [persist]);

  const swSetTask = useCallback((id: number | null) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, stopwatch: { ...cur.stopwatch, taskId: id } });
  }, [persist]);

  const swBank = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const sw = cur.stopwatch;
    const elapsed = sw.status === "running" && sw.startedAt
      ? sw.accumulatedMs + (Date.now() - sw.startedAt)
      : sw.accumulatedMs;
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return;
    persist({ ...cur, stopwatch: { status: "idle", startedAt: null, accumulatedMs: 0, taskId: null } });
    void credit(minutes, sw.taskId, "bank");
  }, [credit, persist]);

  const swDiscard = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const sw = cur.stopwatch;
    const elapsed = sw.status === "running" && sw.startedAt
      ? sw.accumulatedMs + (Date.now() - sw.startedAt)
      : sw.accumulatedMs;
    const minutes = Math.floor(elapsed / 60_000);
    persist({ ...cur, stopwatch: { status: "idle", startedAt: null, accumulatedMs: 0, taskId: null } });
    // "Count partial time" users keep their minutes even when they stop early.
    if (cur.partialMode === "yes" && minutes >= 1) void credit(minutes, sw.taskId, "bank");
  }, [persist, credit]);

  /* --------------------------- CONTEXT VALUE ---------------------------- */

  const setPartialMode = useCallback((m: PartialMode) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, partialMode: m });
  }, [persist]);

  /** User answered the "count partial minutes?" question → save it and start. */
  const answerPartial = useCallback((choice: "yes" | "no") => {
    const cur = stRef.current;
    const which = pendingAsk;
    setPendingAsk(null);
    if (!cur || !which) return;
    const next: StoredState = { ...cur, partialMode: choice };
    if (which === "pomodoro") {
      const p = next.pomodoro;
      const base = p.status === "paused" && p.remainingMs !== null ? p.remainingMs : durationMs(p.mode, next.durations);
      next.pomodoro = { ...p, status: "running", endAt: Date.now() + base, remainingMs: null };
    } else {
      next.stopwatch = { ...next.stopwatch, status: "running", startedAt: Date.now() };
    }
    persist(next);
    unlockAudio();
  }, [pendingAsk, persist, durationMs]);

  const dismissResult = useCallback(() => setLastResult(null), []);

  const value = useMemo<TimerContextValue>(() => ({
    mode: st?.pomodoro.mode ?? "focus",
    runStatus: st?.pomodoro.status ?? "idle",
    msLeft,
    cycles: st?.pomodoro.cycles ?? 0,
    taskId: st?.pomodoro.taskId ?? null,
    todayMin: st?.todayMin ?? 0,
    lastResult,
    dismissResult,
    pToggle, pReset, pSkip, pSetMode, pSetTask,
    settings: {
      durations: st?.durations ?? DEFAULT_DURATIONS,
      autoStart: st?.autoStart ?? false,
      muted: st?.muted ?? false,
    },
    setSettings,
    partialMode: st?.partialMode ?? "ask",
    setPartialMode,
    seedDaily,
    swStatus: st?.stopwatch.status ?? "idle",
    swElapsedMs,
    swTaskId: st?.stopwatch.taskId ?? null,
    swToggle, swSetTask, swBank, swDiscard,
    celebrations,
    dismissCelebration,
  }), [st, msLeft, swElapsedMs, lastResult, dismissResult, pToggle, pReset, pSkip, pSetMode, pSetTask, setSettings, setPartialMode, seedDaily, swToggle, swSetTask, swBank, swDiscard, celebrations, dismissCelebration]);

  const pomodoroActive = (st?.pomodoro.status ?? "idle") !== "idle";
  const stopwatchActive = (st?.stopwatch.status ?? "idle") !== "idle";

  return (
    <TimerContext.Provider value={value}>
      {children}

      {/* Floating widget — visible while timer runs on ANY page */}
      {(pomodoroActive || stopwatchActive) && !(pomodoroActive && pathname === "/focus") && !(stopwatchActive && pathname === "/stopwatch" && !pomodoroActive) && (
        <FloatingWidget
          pathname={pathname}
          pomodoroActive={pomodoroActive}
          stopwatchActive={stopwatchActive}
          mode={value.mode}
          runStatus={value.runStatus}
          msLeft={msLeft}
          swElapsedMs={swElapsedMs}
          onToggle={pomodoroActive ? pToggle : swToggle}
        />
      )}

      {/* Partial-credit question — shown the first time a timer starts */}
      {pendingAsk && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-md p-7 animate-scale-in">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300">
              <HelpCircle size={22} />
            </span>
            <h2 className="mt-4 text-xl font-bold tracking-tight text-white">
              If you stop in the middle, should the minutes count?
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8f8cb0]">
              You are about to start a{" "}
              <b className="text-white">{pendingAsk === "pomodoro" ? "Pomodoro round" : "stopwatch session"}</b>.
              Choose how FocusArena treats time when you stop early.
            </p>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => answerPartial("yes")}
                className="group flex w-full items-start gap-3 rounded-2xl border border-mint-400/35 bg-mint-400/10 p-4 text-left transition hover:border-mint-400/60 hover:bg-mint-400/15"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-mint-400/20 text-mint-400">
                  <Check size={16} strokeWidth={2.6} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">Yes — count every minute</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#a5a2c8]">
                    Whether you finish the round or stop halfway, the elapsed minutes are banked as XP.
                  </span>
                </span>
              </button>

              <button
                onClick={() => answerPartial("no")}
                className="group flex w-full items-start gap-3 rounded-2xl border border-line bg-white/[0.03] p-4 text-left transition hover:border-white/25 hover:bg-white/[0.06]"
              >
                <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-[#a5a2c8]">
                  <Ban size={15} strokeWidth={2.4} />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">No — only completed sessions</span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-[#a5a2c8]">
                    Hardcore mode. Minutes only count when the round finishes (or when you press Bank).
                  </span>
                </span>
              </button>
            </div>

            <div className="mt-5 flex items-center justify-between gap-3 border-t border-line pt-4">
              <p className="text-[0.68rem] text-[#5c5a78]">You can change this anytime in timer settings.</p>
              <button onClick={() => setPendingAsk(null)} className="btn btn-ghost !px-3.5 !py-2 !text-xs">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global celebration toasts */}
      {celebrations.length > 0 && (
        <div className="fixed bottom-6 left-1/2 z-[120] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
          {celebrations.map((c) => (
            <div
              key={c.id}
              className="glass-card flex w-full items-center gap-3 !rounded-2xl px-5 py-3.5 animate-scale-in"
              style={{
                borderColor: `hsl(${c.hue ?? 255} 85% 62% / 0.4)`,
                boxShadow: `0 10px 50px -10px hsl(${c.hue ?? 255} 85% 60% / 0.35)`,
              }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `hsl(${c.hue ?? 255} 85% 62% / 0.15)`,
                  color: `hsl(${c.hue ?? 255} 92% 72%)`,
                }}
              >
                <Zap size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">{c.title}</p>
                {c.sub && <p className="truncate text-[0.7rem] text-[#8f8cb0]">{c.sub}</p>}
              </div>
              <button onClick={() => dismissCelebration(c.id)} className="shrink-0 text-[#6d6a8f] hover:text-white">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </TimerContext.Provider>
  );
}

/* --------------------------- FLOATING WIDGET --------------------------- */

function FloatingWidget({
  pathname,
  pomodoroActive,
  stopwatchActive,
  mode,
  runStatus,
  msLeft,
  swElapsedMs,
  onToggle,
}: {
  pathname: string;
  pomodoroActive: boolean;
  stopwatchActive: boolean;
  mode: Mode;
  runStatus: RunStatus;
  msLeft: number;
  swElapsedMs: number;
  onToggle: () => void;
}) {
  const isPomodoro = pomodoroActive;
  const meta = ACCENT[mode];

  const fmtHMS = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  const paused = isPomodoro ? runStatus === "paused" : false;
  const href = isPomodoro ? "/focus" : "/stopwatch";
  const showHere = !((isPomodoro && pathname === "/focus") || (!isPomodoro && pathname === "/stopwatch"));
  void showHere;

  return (
    <a
      href={href}
      className="fixed bottom-5 right-5 z-[110] flex items-center gap-3 rounded-2xl border border-line bg-ink-900/92 py-2.5 pl-3 pr-2.5 shadow-[0_14px_50px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl animate-scale-in hover:border-brand-500/40"
      style={!isPomodoro ? { borderColor: "rgba(251,191,36,0.35)" } : undefined}
    >
      <span
        className="flex h-8 w-8 items-center justify-center rounded-xl transition-colors"
        style={{
          background: isPomodoro ? `${meta.a}26` : "rgba(251,191,36,0.13)",
          color: isPomodoro ? meta.a : "#fbbf24",
        }}
      >
        {isPomodoro ? <Timer size={15} /> : <Watch size={15} />}
      </span>
      <span className="flex flex-col leading-none">
        <span className="text-[0.58rem] font-bold uppercase tracking-[0.18em] text-[#6d6a8f]">
          {isPomodoro ? (paused ? `${meta.label} · paused` : meta.label) : "Stopwatch"}
        </span>
        <span className="tnum font-mono text-base font-bold text-white">
          {isPomodoro ? fmtClock(Math.round(msLeft / 1000)) : fmtHMS(swElapsedMs)}
        </span>
      </span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggle(); }}
        className="flex h-8 w-8 items-center justify-center rounded-xl border border-line bg-white/5 text-[#c7c4de] transition hover:text-white"
        title="Pause / resume"
      >
        {(isPomodoro ? runStatus === "running" : stopwatchActive) ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <ChevronRight size={14} className="text-[#5c5a78]" />
    </a>
  );
}
