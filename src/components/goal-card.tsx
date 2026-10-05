"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Flame, LoaderCircle, Pencil, Target } from "lucide-react";
import { setDailyGoalAction } from "@/server/actions";
import { fmtMinutes } from "@/lib/dates";

/** Daily focus goal ring with inline editing. */
export function GoalCard({ todayMinutes, goal }: { todayMinutes: number; goal: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(goal);
  const [pending, start] = useTransition();

  const pct = Math.min(1, todayMinutes / Math.max(1, goal));
  const crushed = todayMinutes >= goal;
  const C = 2 * Math.PI * 44;
  const accent = crushed ? "#4ade9e" : "#7c6cff";

  const save = () => {
    start(async () => {
      await setDailyGoalAction(value);
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <div className="glass-card relative h-full overflow-hidden p-5">
      <div
        className="pointer-events-none absolute -bottom-20 -right-16 h-48 w-48 rounded-full blur-3xl transition-colors"
        style={{ background: `${accent}1f` }}
      />
      <div className="relative flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Target size={15} className="text-brand-300" /> Daily goal
        </h2>
        {!editing ? (
          <button onClick={() => setEditing(true)} className="text-[#6d6a8f] transition hover:text-white" title="Edit goal">
            <Pencil size={13} />
          </button>
        ) : (
          <button onClick={save} disabled={pending} className="text-mint-400 transition hover:text-mint-300" title="Save">
            {pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={15} />}
          </button>
        )}
      </div>

      <div className="relative mt-3 flex items-center gap-5">
        <div className="relative h-28 w-28 shrink-0">
          {crushed && <div className="absolute inset-2 rounded-full border border-mint-400/40 animate-pulse-ring" />}
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="goal-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor={accent} />
                <stop offset="1" stopColor="#4ce3ff" />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <circle
              cx="50" cy="50" r="44" fill="none" stroke="url(#goal-grad)" strokeWidth="8"
              strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="tnum text-xl font-bold text-white">{Math.round(pct * 100)}%</span>
            {crushed && <Flame size={12} className="text-gold-400" />}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          {crushed ? (
            <p className="text-sm font-bold text-mint-400">Goal crushed 🔥</p>
          ) : (
            <p className="text-sm font-bold text-white">
              {fmtMinutes(Math.max(0, goal - todayMinutes))} <span className="font-medium text-[#8f8cb0]">to go</span>
            </p>
          )}
          <p className="tnum mt-1 text-xs text-[#8f8cb0]">
            {fmtMinutes(todayMinutes)} of {fmtMinutes(goal)} today
          </p>
          {editing && (
            <div className="mt-3 flex items-center gap-2 animate-scale-in">
              <input
                type="number"
                min={15}
                max={600}
                step={15}
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                className="input tnum !w-20 !py-1.5 !px-2 text-center text-xs"
              />
              <span className="text-[0.65rem] text-[#6d6a8f]">min/day</span>
            </div>
          )}
          {!editing && !crushed && (
            <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-500 to-neon-400 transition-all duration-700"
                style={{ width: `${Math.round(pct * 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
