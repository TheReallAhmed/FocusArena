"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LayoutDashboard, Timer, Watch, ListChecks, CalendarDays, Trophy,
  Users, UsersRound, UserRoundCog, ShieldCheck, Play, Pause, RotateCcw,
  SkipForward, Download, Command, Search, CornerDownLeft, Volume2, VolumeX, ShoppingBag,
} from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { useLocale } from "@/components/locale-provider";

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
  const timer = useTimer();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => {
    const go = (href: string) => () => router.push(href);
    const list: Item[] = [
      { id: "dash", label: ar ? "لوحة التحكم" : "Dashboard", icon: LayoutDashboard, group: "Navigate", run: go("/dashboard") },
      { id: "focus", label: ar ? "مؤقت التركيز" : "Focus timer", icon: Timer, group: "Navigate", run: go("/focus") },
      { id: "sw", label: ar ? "ساعة الإيقاف" : "Stopwatch", icon: Watch, group: "Navigate", run: go("/stopwatch") },
      { id: "tasks", label: ar ? "المهام" : "Tasks", icon: ListChecks, group: "Navigate", run: go("/tasks") },
      { id: "cal", label: ar ? "التقويم والتحليلات" : "Calendar & insights", icon: CalendarDays, group: "Navigate", run: go("/calendar") },
      { id: "board", label: ar ? "لوحة الصدارة" : "Leaderboard", icon: Trophy, group: "Navigate", run: go("/leaderboard") },
      { id: "rooms", label: ar ? "غرف التركيز" : "Focus rooms", icon: UsersRound, group: "Navigate", run: go("/rooms") },
      { id: "squads", label: ar ? "الفرق" : "Squads", icon: Users, group: "Navigate", run: go("/squads") },
      { id: "me", label: ar ? "ملفي الشخصي" : "My profile", hint: `@${username}`, icon: UserRoundCog, group: "Navigate", run: go(`/u/${username}`) },
      { id: "settings", label: ar ? "الإعدادات" : "Settings", icon: UserRoundCog, group: "Navigate", run: go("/settings") },
      { id: "shop", label: ar ? "متجر التخصيص" : "Cosmetic shop", icon: ShoppingBag, group: "Navigate", run: go("/shop") },
      {
        id: "toggle",
        label: timer.runStatus === "running" ? (ar ? "إيقاف الجولة مؤقتًا" : "Pause the round") : (ar ? "بدء / استئناف التركيز" : "Start / resume focus"),
        hint: ar ? "مسافة في صفحة التركيز" : "Space on the focus page",
        icon: timer.runStatus === "running" ? Pause : Play,
        group: "Timer",
        run: () => timer.pToggle(),
      },
      { id: "reset", label: ar ? "إيقاف الجولة الحالية" : "Stop current round", icon: RotateCcw, group: "Timer", run: () => timer.pReset() },
      { id: "skip", label: ar ? "تجاوز إلى المرحلة التالية" : "Skip to next phase", icon: SkipForward, group: "Timer", run: () => timer.pSkip() },
      {
        id: "mute",
        label: timer.settings.muted ? (ar ? "تشغيل النغمات" : "Unmute chimes") : (ar ? "كتم النغمات" : "Mute chimes"),
        icon: timer.settings.muted ? VolumeX : Volume2,
        group: "Timer",
        run: () => timer.setSettings(timer.settings.durations, timer.settings.autoStart, !timer.settings.muted),
      },
      { id: "swstart", label: timer.swStatus === "running" ? (ar ? "إيقاف ساعة الإيقاف مؤقتًا" : "Pause stopwatch") : (ar ? "بدء ساعة الإيقاف" : "Start stopwatch"), icon: Watch, group: "Timer", run: () => timer.swToggle() },
      { id: "bank", label: ar ? "احتساب وقت ساعة الإيقاف" : "Bank stopwatch time", hint: ar ? "تحويل الدقائق إلى XP" : "converts minutes to XP", icon: Play, group: "Timer", run: () => timer.swBank() },
      { id: "csv", label: ar ? "تصدير الجلسات CSV" : "Export sessions as CSV", icon: Download, group: "Data", run: () => window.open("/api/export?format=csv", "_blank") },
      { id: "json", label: ar ? "تصدير الجلسات JSON" : "Export sessions as JSON", icon: Download, group: "Data", run: () => window.open("/api/export?format=json", "_blank") },
      { id: "api", label: ar ? "فتح واجهة إحصاءات الحساب" : "Open personal stats API", hint: "/api/v1/me", icon: Command, group: "Data", run: () => window.open("/api/v1/me", "_blank") },
    ];
    if (isAdmin) list.splice(10, 0, { id: "admin", label: ar ? "لوحة الإدارة" : "Admin console", icon: ShieldCheck, group: "Navigate", run: go("/admin") });
    return list;
  }, [router, timer, isAdmin, username, ar]);

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
            placeholder={ar ? "ابحث عن صفحة أو تحكم بالمؤقت أو صدّر بياناتك…" : "Jump to a page, control the timer, export data…"}
            className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-[#5c5a78]"
          />
          <kbd className="rounded-md border border-line bg-white/[0.04] px-1.5 py-0.5 text-[0.6rem] font-bold text-[#6d6a8f]">ESC</kbd>
        </div>

        <div className="max-h-[52vh] overflow-y-auto p-2">
          {filtered.length === 0 && (
            <p className="py-8 text-center text-sm text-[#6d6a8f]">{ar ? `لا توجد نتائج مطابقة لـ «${q}».` : `Nothing matches “${q}”.`}</p>
          )}
          {groups.map((g) => {
            const rows = filtered.filter((i) => i.group === g);
            if (rows.length === 0) return null;
            return (
              <div key={g} className="mb-1">
                <p className="px-3 py-1.5 text-[0.58rem] font-bold uppercase tracking-[0.2em] text-[#5c5a78]">{ar ? g === "Navigate" ? "التنقل" : g === "Timer" ? "المؤقت" : "البيانات" : g}</p>
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
