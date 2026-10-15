"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo,
  useLayoutEffect, useRef, useState, type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { Pause, Play, Timer, Watch, Zap, X, ChevronRight, HelpCircle, Check, Ban, Target, ShieldCheck, LoaderCircle } from "lucide-react";
import { completeFocusSession, type FocusResult } from "@/server/actions";
import { abandonFocusRunAction, answerProofCheckAction, beginFocusRunAction, cancelFocusRunAction, pollProofCheckAction, type SessionStartDetails } from "@/server/distractions";
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
  runKey: string | null;
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
  project: string | null;
  note: string | null;
  goalMinutes: number;
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
  runKey: string | null;
  todayMin: number;
  lastResult: FocusResult | null;
  dismissResult: () => void;
  pToggle: () => void;
  startFocusWithDetails: (details: SessionStartDetails) => Promise<{ error?: string; ok?: boolean }>;
  pReset: () => void;
  pSkip: () => void;
  pSetMode: (m: Mode) => void;
  pSetTask: (id: number | null) => void;
  settings: { durations: Durations; autoStart: boolean; muted: boolean };
  setSettings: (durations: Durations, autoStart: boolean, muted: boolean) => void;
  partialMode: PartialMode;
  setPartialMode: (m: PartialMode) => void;
  project: string | null;
  setProject: (p: string | null) => void;
  note: string | null;
  setNote: (n: string | null) => void;
  seedDaily: (cycles: number, todayMin: number, goalMinutes?: number) => void;
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
    pomodoro: { mode: "focus", status: "idle", endAt: null, remainingMs: null, cycles: 0, taskId: null, runKey: null },
    stopwatch: { status: "idle", startedAt: null, accumulatedMs: 0, taskId: null },
    durations: DEFAULT_DURATIONS,
    autoStart: false,
    muted: false,
    partialMode: "ask",
    project: null,
    note: null,
    goalMinutes: 120,
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
  const [pendingFocusSetup, setPendingFocusSetup] = useState(false);
  const [focusGoal, setFocusGoal] = useState("");
  const [focusConsequence, setFocusConsequence] = useState("");
  const [focusEnergy, setFocusEnergy] = useState<number | null>(null);
  const [proofOptIn, setProofOptIn] = useState(false);
  const [focusSetupError, setFocusSetupError] = useState<string | null>(null);
  const [focusSetupSaving, setFocusSetupSaving] = useState(false);
  const [proofPromptRunKey, setProofPromptRunKey] = useState<string | null>(null);
  const [proofPromptError, setProofPromptError] = useState<string | null>(null);
  const proofShownRunRef = useRef<string | null>(null);
  const stRef = useRef<StoredState | null>(null);
  const pathRef = useRef(pathname);
  const resolvingEndAtRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    stRef.current = st;
    pathRef.current = pathname;
  }, [st, pathname]);

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

  const credit = useCallback(async (minutes: number, taskId: number | null, kind: "focus" | "bank", runKey: string | null = null) => {
    try {
      const res = await completeFocusSession({
        minutes, taskId,
        project: stRef.current?.project ?? null,
        note: stRef.current?.note ?? null,
        runKey,
      });
      setLastResult(res);
      const cur = stRef.current;
      if (cur) {
        const before = cur.todayMin;
        const after = before + minutes;
        persist({ ...cur, todayMin: after, note: null });
        if (res.leveledUp) {
          pushCelebration({ icon: "badge", title: `Level ${res.level} reached`, sub: "Your grind is compounding", hue: 205 });
        }
        if (before < cur.goalMinutes && after >= cur.goalMinutes) {
          pushCelebration({ icon: "xp", title: `Daily goal crushed — ${after}m today`, sub: "Bonus rounds still count", hue: 150 });
          if (!cur.muted) playChime("bank");
        }
      }
      if (!stRef.current?.muted) playChime(kind);

      pushCelebration({
        icon: "xp",
        title: kind === "bank" ? `Banked +${res.gained} XP` : `Round banked — +${res.gained} XP`,
        sub: `streak ${res.streak}d · level ${res.level}`,
        hue: 255,
      });
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
    const resolvingEndAt = cur.pomodoro.endAt;
    // Prevent overlapping interval ticks from resolving the same phase twice.
    if (resolvingEndAtRef.current === resolvingEndAt) return;
    resolvingEndAtRef.current = resolvingEndAt;

    let { mode, cycles, taskId, runKey } = cur.pomodoro;
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
          await credit(cur.durations.focus, taskId, "focus", runKey);
        }
        cycles = done;
        runKey = null;
        const next: Mode = done % 4 === 0 ? "long" : "short";
        if (!cur.autoStart && endAt + durationMs(next, cur.durations) > now) {
          // stop and wait for the user on the break
          persist({
            ...stRef.current!,
            pomodoro: { mode: next, status: "paused", endAt: null, remainingMs: durationMs(next, cur.durations), cycles, taskId, runKey: null },
          });
          resolvingEndAtRef.current = null;
          return;
        }
        mode = next;
        endAt += durationMs(next, cur.durations);
      } else {
        // Every new focus round must pass the private commitment/energy check-in.
        persist({
          ...stRef.current!,
          pomodoro: { mode: "focus", status: "paused", endAt: null, remainingMs: durationMs("focus", cur.durations), cycles, taskId, runKey: null },
        });
        resolvingEndAtRef.current = null;
        return;
      }
    }

    if (endAt <= now) {
      // absurdly long absence — just park the timer, nothing is lost
      if (runKey) void abandonFocusRunAction(runKey).catch(() => undefined);
      persist({
        ...stRef.current!,
        pomodoro: { mode: "focus", status: "paused", endAt: null, remainingMs: durationMs("focus", cur.durations), cycles, taskId, runKey: null },
      });
      resolvingEndAtRef.current = null;
      return;
    }

    persist({
      ...stRef.current!,
      pomodoro: { mode, status: "running", endAt, remainingMs: null, cycles, taskId, runKey },
    });
    resolvingEndAtRef.current = null;
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
    const id = window.setTimeout(() => {
      stRef.current = loaded;
      setSt(loaded);
    }, 0);
    return () => window.clearTimeout(id);
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

  const activeProofRunKey = st?.pomodoro.mode === "focus" && st.pomodoro.status === "running" ? st.pomodoro.runKey : null;
  useEffect(() => {
    if (!activeProofRunKey) return;
    let alive = true;
    const poll = async () => {
      try {
        const result = await pollProofCheckAction(activeProofRunKey);
        if (alive && result.due && proofShownRunRef.current !== activeProofRunKey) {
          proofShownRunRef.current = activeProofRunKey;
          setProofPromptRunKey(activeProofRunKey);
          setProofPromptError(null);
        }
      } catch { /* Connectivity errors do not count as a missed attention check. */ }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 15_000);
    return () => { alive = false; window.clearInterval(id); };
  }, [activeProofRunKey]);

  const answerProofPrompt = useCallback(async () => {
    if (!proofPromptRunKey) return;
    setProofPromptError(null);
    try {
      const response = await answerProofCheckAction(proofPromptRunKey);
      if (response.error) setProofPromptError(response.error);
      setProofPromptRunKey(null);
    } catch {
      setProofPromptError("Could not reach the server. Try again before the check expires.");
    }
  }, [proofPromptRunKey]);

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
    if (p.mode === "focus" && (p.status !== "paused" || !p.runKey)) {
      if (cur.partialMode === "ask") setPendingAsk("pomodoro");
      else setPendingFocusSetup(true);
      return;
    }
    // first run of the day/device: ask how early stops should be handled
    if (cur.partialMode === "ask" && p.status !== "paused") {
      setPendingAsk("pomodoro");
      return;
    }
    const base = p.status === "paused" && p.remainingMs !== null ? p.remainingMs : durationMs(p.mode, cur.durations);
    const runKey = p.mode === "focus" ? p.runKey ?? crypto.randomUUID() : null;
    persist({ ...cur, pomodoro: { ...p, runKey, status: "running", endAt: Date.now() + base, remainingMs: null } });
  }, [persist, durationMs]);

  const startFocusWithDetails = useCallback(async (details: SessionStartDetails) => {
    const cur = stRef.current;
    if (!cur || cur.pomodoro.mode !== "focus" || cur.pomodoro.status === "running" || cur.pomodoro.runKey) {
      return { error: "The focus timer changed; try starting again." };
    }
    setFocusSetupSaving(true);
    setFocusSetupError(null);
    unlockAudio();
    const runKey = crypto.randomUUID();
    try {
      const started = await beginFocusRunAction(runKey, cur.durations.focus, details);
      if ("error" in started) {
        setFocusSetupError(started.error ?? "Could not save the session setup.");
        return { error: started.error ?? "Could not save the session setup." };
      }
      const latest = stRef.current;
      if (!latest || latest.pomodoro.mode !== "focus" || latest.pomodoro.runKey) {
        await abandonFocusRunAction(runKey);
        return { error: "The timer changed while saving; the new round was cancelled." };
      }
      const p = latest.pomodoro;
      const base = p.status === "paused" && p.remainingMs !== null ? p.remainingMs : durationMs("focus", latest.durations);
      persist({ ...latest, pomodoro: { ...p, runKey, status: "running", endAt: Date.now() + base, remainingMs: null } });
      setPendingFocusSetup(false);
      setFocusGoal(""); setFocusConsequence(""); setFocusEnergy(null); setProofOptIn(false);
      return { ok: true };
    } catch {
      setFocusSetupError("Could not reach the server. Your timer has not started; try again.");
      return { error: "Could not reach the server." };
    } finally {
      setFocusSetupSaving(false);
    }
  }, [durationMs, persist]);

  /**
   * Bank the minutes already spent in the running focus phase.
   * Used by Reset, Skip and mode-switch so ending a round *never* silently
   * throws the time away when the user opted into partial crediting.
   */
  const bankPartialFocus = useCallback((cur: StoredState): boolean => {
    const p = cur.pomodoro;
    if (p.mode !== "focus" || p.status === "idle") return false;
    if (cur.partialMode !== "yes") return false;
    const total = durationMs("focus", cur.durations);
    const left = p.status === "running" ? Math.max(0, (p.endAt ?? 0) - Date.now()) : p.remainingMs ?? total;
    const elapsedMs = Math.max(0, total - left);
    // round to the nearest minute, but anything over 30s counts as 1
    const elapsedMin = elapsedMs >= 30_000 ? Math.max(1, Math.round(elapsedMs / 60_000)) : 0;
    if (elapsedMin < 1) {
      pushCelebration({ icon: "xp", title: "Less than a minute — nothing to bank", hue: 20 });
      return false;
    }
    void credit(elapsedMin, p.taskId, "bank");
    return true;
  }, [credit, durationMs, pushCelebration]);

  const pReset = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const p = cur.pomodoro;
    if (p.status === "running" && p.endAt !== null && p.endAt <= Date.now()) {
      void resolvePomodoro();
      return;
    }
    if (p.runKey) void cancelFocusRunAction(p.runKey).catch(() => undefined);
    bankPartialFocus(cur);
    persist({
      ...cur,
      pomodoro: { ...p, status: "idle", endAt: null, remainingMs: null, runKey: null },
    });
  }, [persist, bankPartialFocus, resolvePomodoro]);

  const pSetMode = useCallback((mode: Mode) => {
    const cur = stRef.current;
    if (!cur) return;
    if (cur.pomodoro.status === "running" && cur.pomodoro.endAt !== null && cur.pomodoro.endAt <= Date.now()) {
      void resolvePomodoro();
      return;
    }
    if (cur.pomodoro.runKey) void abandonFocusRunAction(cur.pomodoro.runKey).catch(() => undefined);
    if (mode !== "focus") bankPartialFocus(cur);
    persist({
      ...cur,
      pomodoro: { ...cur.pomodoro, mode, status: "idle", endAt: null, remainingMs: null, runKey: null },
    });
  }, [persist, bankPartialFocus, resolvePomodoro]);

  const pSkip = useCallback(() => {
    const cur = stRef.current;
    if (!cur) return;
    const p = cur.pomodoro;
    if (p.status === "running" && p.endAt !== null && p.endAt <= Date.now()) {
      void resolvePomodoro();
      return;
    }
    if (p.runKey) void abandonFocusRunAction(p.runKey).catch(() => undefined);
    const banked = bankPartialFocus(cur);
    const next: Mode = p.mode === "focus" ? (p.cycles + 1) % 4 === 0 ? "long" : "short" : "focus";
    persist({
      ...cur,
      pomodoro: {
        ...p,
        mode: next,
        status: "idle",
        endAt: null,
        remainingMs: null,
        runKey: null,
        cycles: banked ? p.cycles + 1 : p.cycles,
      },
    });
    setMsLeft(durationMs(next, cur.durations));
  }, [persist, durationMs, bankPartialFocus, resolvePomodoro]);

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

  const seedDaily = useCallback((cycles: number, todayMin: number, goalMinutes?: number) => {
    const cur = stRef.current;
    if (!cur) return;
    // only seed when the store has no data for today yet
    if (goalMinutes && cur.goalMinutes !== goalMinutes) {
      persist({ ...stRef.current!, goalMinutes });
    }
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

  const setNote = useCallback((n: string | null) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, note: n ? n.slice(0, 200) : null });
  }, [persist]);

  const setProject = useCallback((proj: string | null) => {
    const cur = stRef.current;
    if (!cur) return;
    persist({ ...cur, project: proj ? proj.trim().slice(0, 40) : null });
  }, [persist]);

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
      if (p.mode === "focus") {
        persist(next);
        setPendingFocusSetup(true);
        unlockAudio();
        return;
      }
      const base = p.status === "paused" && p.remainingMs !== null ? p.remainingMs : durationMs(p.mode, next.durations);
      const runKey = null;
      next.pomodoro = { ...p, runKey, status: "running", endAt: Date.now() + base, remainingMs: null };
    } else {
      next.stopwatch = { ...next.stopwatch, status: "running", startedAt: Date.now() };
    }
    persist(next);
    unlockAudio();
  }, [pendingAsk, persist, durationMs]);

  const dismissResult = useCallback(() => setLastResult(null), []);

  const value = useMemo<TimerContextValue>(() => ({
    mode: st?.pomodoro.mode ?? "focus",
    runKey: st?.pomodoro.runKey ?? null,
    runStatus: st?.pomodoro.status ?? "idle",
    msLeft,
    cycles: st?.pomodoro.cycles ?? 0,
    taskId: st?.pomodoro.taskId ?? null,
    todayMin: st?.todayMin ?? 0,
    lastResult,
    dismissResult,
    pToggle, startFocusWithDetails, pReset, pSkip, pSetMode, pSetTask,
    settings: {
      durations: st?.durations ?? DEFAULT_DURATIONS,
      autoStart: st?.autoStart ?? false,
      muted: st?.muted ?? false,
    },
    setSettings,
    partialMode: st?.partialMode ?? "ask",
    setPartialMode,
    project: st?.project ?? null,
    setProject,
    note: st?.note ?? null,
    setNote,
    seedDaily,
    swStatus: st?.stopwatch.status ?? "idle",
    swElapsedMs,
    swTaskId: st?.stopwatch.taskId ?? null,
    swToggle, swSetTask, swBank, swDiscard,
    celebrations,
    dismissCelebration,
  }), [st, msLeft, swElapsedMs, lastResult, dismissResult, pToggle, startFocusWithDetails, pReset, pSkip, pSetMode, pSetTask, setSettings, setPartialMode, setProject, setNote, seedDaily, swToggle, swSetTask, swBank, swDiscard, celebrations, dismissCelebration]);

  const pomodoroActive = (st?.pomodoro.status ?? "idle") !== "idle";
  const stopwatchActive = (st?.stopwatch.status ?? "idle") !== "idle";

  return (
    <TimerContext.Provider value={value}>
      {children}

      {pendingFocusSetup && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void startFocusWithDetails({ intendedOutcome: focusGoal, consequence: focusConsequence, energyRating: focusEnergy, verificationEnabled: proofOptIn });
            }}
            className="glass-card max-h-[92vh] w-full max-w-xl overflow-y-auto p-6 sm:p-7 animate-scale-in"
            role="dialog" aria-modal="true" aria-labelledby="focus-checkin-title"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-300"><Target size={21} /></span>
            <h2 id="focus-checkin-title" className="mt-4 text-xl font-bold tracking-tight text-white">Set your intention</h2>
            <p className="mt-1 text-sm text-[#8f8cb0]">A quick private check-in before this focus round. You can skip the energy rating and attention checks.</p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
              What exactly do you want to accomplish? <span className="text-rose-300">*</span>
              <textarea required minLength={3} maxLength={240} value={focusGoal} onChange={(e) => setFocusGoal(e.target.value)} className="input mt-2 min-h-20 resize-y normal-case tracking-normal" placeholder="Finish the outline for section two…" />
            </label>
            <label className="mt-4 block text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">
              A personal consequence if you do not fulfill it <span className="font-normal normal-case tracking-normal text-[#5c5a78]">· optional</span>
              <input maxLength={240} value={focusConsequence} onChange={(e) => setFocusConsequence(e.target.value)} className="input mt-2 normal-case tracking-normal" placeholder="Take a short walk before the next round" />
            </label>
            <div className="mt-5">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8f8cb0]">Energy right now? <span className="font-normal normal-case tracking-normal text-[#5c5a78]">· optional</span></p>
              <div className="mt-2 grid grid-cols-5 gap-2">
                {["Very low", "Low", "Moderate", "High", "Very high"].map((label, index) => {
                  const value = index + 1;
                  return <button key={value} type="button" aria-pressed={focusEnergy === value} onClick={() => setFocusEnergy(focusEnergy === value ? null : value)} className={`tab-pill !flex-col !gap-1 !px-1.5 !py-2 ${focusEnergy === value ? "tab-pill-active" : ""}`}><b>{value}</b><span className="text-[0.55rem] leading-tight">{label}</span></button>;
                })}
              </div>
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-white/[0.025] p-3.5">
              <input type="checkbox" checked={proofOptIn} onChange={(e) => setProofOptIn(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#7c6cff]" />
              <span><span className="flex items-center gap-1.5 text-sm font-semibold text-white"><ShieldCheck size={14} className="text-neon-300" /> Enable optional attention check</span><span className="mt-1 block text-xs leading-relaxed text-[#6d6a8f]">For rounds of 15+ minutes, one server-timed prompt may appear; it expires after two minutes. It is an accountability aid, not proof of cheating or continuous attention.</span></span>
            </label>

            {focusSetupError && <p role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">{focusSetupError}</p>}
            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <button type="button" disabled={focusSetupSaving} onClick={() => { setPendingFocusSetup(false); setFocusSetupError(null); }} className="btn btn-ghost !px-4 !py-2.5">Cancel</button>
              <button type="submit" disabled={focusSetupSaving || focusGoal.trim().length < 3} className="btn btn-primary !px-5 !py-2.5">
                {focusSetupSaving ? <LoaderCircle size={15} className="animate-spin" /> : <Play size={15} />} {focusSetupSaving ? "Saving…" : "Save & start focus"}
              </button>
            </div>
          </form>
        </div>
      )}

      {proofPromptRunKey && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-ink-950/75 p-4 backdrop-blur-sm">
          <div className="glass-card w-full max-w-sm p-6 text-center" role="dialog" aria-modal="true" aria-labelledby="proof-prompt-title">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-neon-400/12 text-neon-300"><ShieldCheck size={22} /></span>
            <h2 id="proof-prompt-title" className="mt-4 text-lg font-bold text-white">Are you still focused?</h2>
            <p className="mt-2 text-sm text-[#8f8cb0]">Confirm within two minutes. A missed response can also mean an interruption or connection issue.</p>
            {proofPromptError && <p role="alert" className="mt-3 text-xs text-rose-300">{proofPromptError}</p>}
            <button onClick={() => void answerProofPrompt()} className="btn btn-primary mt-5 w-full !py-3"><Check size={16} /> Yes, I’m here</button>
          </div>
        </div>
      )}
      {proofPromptError && !proofPromptRunKey && <p role="status" className="fixed bottom-5 left-1/2 z-[175] -translate-x-1/2 rounded-xl border border-gold-400/30 bg-ink-900 px-4 py-3 text-sm text-gold-200 shadow-xl">{proofPromptError}</p>}

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
