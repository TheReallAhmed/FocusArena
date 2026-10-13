"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Timer, Watch, ListChecks, CalendarDays, Trophy,
  Users, UsersRound, UserRoundCog, ShieldCheck, Play, Pause, RotateCcw,
  SkipForward, Download, Command, Search, CornerDownLeft, Volume2, VolumeX,
} from "lucide-react";
import { useTimer } from "@/components/timer-provider";

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof Timer;
  group: "Navigate" | "Timer" | "Data";
  run: () => void;
};

/** ⌘K / Ctrl+K command palette — navigate and drive the timer without the mouse. */
export function CommandPalette({ isAdmin, username }: { isAdmin: boolean; username: string }) {
  const router = useRouter();
  const t = useTimer();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Item[] = [
      { id: "dash", label: "Dashboard", icon: LayoutDashboard, group: "Navigate", run: go("/dashboard") },
      { id: "focus", label: "Focus timer", icon: Timer, group: "Navigate", run: go("/focus") },
      { id: "sw", label: "Stopwatch", icon: Watch, group: "Navigate", run: go("/stopwatch") },
      { id: "tasks", label: "Tasks", icon: ListChecks, group: "Navigate", run: go("/tasks") },
      { id: "cal", label: "Calendar & insights", icon: CalendarDays, group: "Navigate", run: go("/calendar") },
      { id: "board", label: "Leaderboard", icon: Trophy, group: "Navigate", run: go("/leaderboard") },
      { id: "rooms", label: "Focus rooms", icon: UsersRound, group: "Navigate", run: go("/rooms") },
      { id: "squads", label: "Squads", icon: Users, group: "Navigate", run: go("/squads") },
      { id: "me", label: "My profile", hint: `@${username}`, icon: UserRoundCog, group: "Navigate", run: go(`/u/${username}`) },
      { id: "settings", label: "Edit profile & API key", icon: UserRoundCog, group: "Navigate", run: go("/settings/profile") },
      {
        id: "toggle",
        label: t.runStatus === "running" ? "Pause the round" : "Start / resume focus",
        hint: "Space on the focus page",
        icon: t.runStatus === "running" ? Pause : Play,
        group: "Timer",
        run: () => t.pToggle(),
      },
      { id: "reset", label: "Stop current round", icon: RotateCcw, group: "Timer", run: () => t.pReset() },
      { id: "skip", label: "Skip to next phase", icon: SkipForward, group: "Timer", run: () => t.pSkip() },
      {
        id: "mute",
        label: t.settings.muted ? "Unmute chimes" : "Mute chimes",
        icon: t.settings.muted ? VolumeX : Volume2,
        group: "Timer",
        run: () => t.setSettings(t.settings.durations, t.settings.autoStart, !t.settings.muted),
      },
      { id: "swstart", label: t.swStatus === "running" ? "Pause stopwatch" : "Start stopwatch", icon: Watch, group: "Timer", run: () => t.swToggle() },
      { id: "bank", label: "Bank stopwatch time", hint: "converts minutes to XP", icon: Play, group: "Timer", run: () => t.swBank() },
      { id: "csv", label: "Export sessions as CSV", icon: Download, group: "Data", run: () => window.open("/api/export?format=csv", "_blank") },
      { id: "json", label: "Export sessions as JSON", icon: Download, group: "Data", run: () => window.open("/api/export?format=json", "_blank") },
      { id: "api", label: "Open personal stats API", hint: "/api/v1/me", icon: Command, group: "Data", run: () => window.open("/api/v1/me", "_blank") },
    ];
    if (isAdmin) list.splice(9, 0, { id: "admin", label: "Admin console", icon: ShieldCheck, group: "Navigate", run: go("/admin") });
    return list;
  }, [router, t, isAdmin, username]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) => `${i.label} ${i.hint ?? ""} ${i.group}`.toLowerCase().includes(term));
  }, [q, items]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        setQ("");
        setIdx(0);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 40);
  }, [open]);

  if (!open) return null;

  const groups = ["Navigate", "Timer", "Data"] as const;
  let cursor = -1;

  return (
    <div className="fixed inset-0 z-[160] flex items-start justify-center bg-ink-950/80 px-4 pt-[12vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="glass-card w-full max-w-xl overflow-hidden animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
          <Search size={16} className="shrink-0 text-[#6d6a8f]" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => { setQ(e.target.value); setIdx(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, filtered.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
              if (e.key === "Enter") {
                e.preventDefault();
                const it = filtered[idx];
                if (it) { it.run(); setOpen(false); }
              }
            }}
            placeholder="Jump to a page, control the timer, export data…"
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#5c5a78]"
          />
          <kbd className="rounded-md border border-line bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] font-bold text-[#6d6a8f]">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-[#6d6a8f]">Nothing matches “{q}”.</p>
          )}
          {groups.map((g) => {
            const rows = filtered.filter((i) => i.group === g);
            if (rows.length === 0) return null;
            return (
              <div key={g} className="mb-1">
                <p className="px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#5c5a78]">{g}</p>
                {rows.map((i) => {
                  cursor++;
                  const active = cursor === idx;
                  return (
                    <button
                      key={i.id}
                      onMouseEnter={() => setIdx(filtered.indexOf(i))}
                      onClick={() => { i.run(); setOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        active ? "bg-brand-500/15 text-white" : "text-[#c7c4de] hover:bg-white/[0.04]"
                      }`}
                    >
                      <i.icon size={15} className={active ? "text-brand-300" : "text-[#6d6a8f]"} />
                      <span className="flex-1 text-sm font-medium">{i.label}</span>
                      {i.hint && <span className="font-mono text-[0.62rem] text-[#5c5a78]">{i.hint}</span>}
                      {active && <CornerDownLeft size={13} className="text-brand-300" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
