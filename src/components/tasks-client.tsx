"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, Circle, CheckCircle2, Trash2, Zap, LoaderCircle, Plus } from "lucide-react";
import { addTaskAction, toggleTaskAction, deleteTaskAction } from "@/server/actions";
import { EmptyState, BadgeIcon } from "@/components/widgets";
import { fmtMinutes } from "@/lib/dates";
import type { Task } from "@/db/schema";

const PRIO_STYLE: Record<string, { dot: string; label: string; cls: string }> = {
  high: { dot: "bg-rose-400", label: "High", cls: "border-rose-500/40 bg-rose-500/12 text-rose-300" },
  normal: { dot: "bg-brand-400", label: "Normal", cls: "border-brand-500/40 bg-brand-500/12 text-brand-300" },
  low: { dot: "bg-sky-400", label: "Low", cls: "border-sky-500/40 bg-sky-500/12 text-sky-300" },
};

type BadgeToast = { key: string; name: string; desc: string; icon: string; hue: number };

export function TasksClient({ initialTasks }: { initialTasks: Task[] }) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("normal");
  const [pending, start] = useTransition();
  const [badgeToast, setBadgeToast] = useState<BadgeToast | null>(null);

  const active = initialTasks.filter((t) => !t.done);
  const completed = initialTasks.filter((t) => t.done);
  const pct = initialTasks.length ? Math.round((completed.length / initialTasks.length) * 100) : 0;

  const add = () => {
    const clean = title.trim();
    if (clean.length < 2) return;
    setTitle("");
    start(async () => { await addTaskAction(clean, priority); });
  };

  const toggle = (id: number) => {
    start(async () => {
      const res = await toggleTaskAction(id);
      if (res?.newBadges && res.newBadges.length > 0) {
        setBadgeToast(res.newBadges[0]);
        setTimeout(() => setBadgeToast(null), 3500);
      }
    });
  };

  const remove = (id: number) => start(async () => { await deleteTaskAction(id); });

  return (
    <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
      <div className="space-y-5">
        {/* Add form */}
        <div className="glass-card flex flex-col gap-3 p-4 sm:flex-row">
          <input
            className="input flex-1"
            placeholder="What needs to get done?"
            value={title}
            maxLength={200}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
          />
          <div className="flex gap-3">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="input !w-28 appearance-none"
            >
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
            </select>
            <button onClick={add} disabled={pending || title.trim().length < 2} className="btn btn-primary shrink-0">
              {pending ? <LoaderCircle size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </div>
        </div>

        {/* Active list */}
        <div className="glass-card p-5">
          <h2 className="mb-3 text-sm font-bold text-white">
            Open <span className="tnum ml-1 text-xs font-semibold text-[#8f8cb0]">{active.length}</span>
          </h2>
          {active.length === 0 ? (
            <EmptyState icon={Circle} title="All clear" hint="Add a task above and sprint on it." />
          ) : (
            <ul className="space-y-2">
              {active.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} pending={pending} />
              ))}
            </ul>
          )}
        </div>

        {/* Completed list */}
        {completed.length > 0 && (
          <div className="glass-card p-5">
            <h2 className="mb-3 text-sm font-bold text-white">
              Completed <span className="tnum ml-1 text-xs font-semibold text-[#8f8cb0]">{completed.length}</span>
            </h2>
            <ul className="space-y-2">
              {completed.map((t) => (
                <TaskRow key={t.id} task={t} onToggle={toggle} onDelete={remove} pending={pending} />
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Side column */}
      <div className="space-y-5">
        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-white">Completion</h2>
          <p className="tnum mt-3 text-4xl font-bold text-white">{pct}%</p>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/8">
            <div
              className="h-full rounded-full bg-gradient-to-r from-mint-400 to-neon-400 transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-[#8f8cb0]">
            {completed.length} of {initialTasks.length} tasks crushed
          </p>
        </div>

        <div className="glass-card p-5">
          <h2 className="text-sm font-bold text-white">How it works</h2>
          <ul className="mt-3 space-y-2.5 text-[0.83rem] leading-relaxed text-[#8f8cb0]">
            <li className="flex gap-2.5">
              <Zap size={14} className="mt-0.5 shrink-0 text-brand-300" />
              Hit the bolt on any task to jump into a timed focus sprint with it.
            </li>
            <li className="flex gap-2.5">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint-400" />
              Minutes you focus on a task are tracked on it — see who does the deep work.
            </li>
            <li className="flex gap-2.5">
              <Check size={14} className="mt-0.5 shrink-0 text-gold-400" />
              Completing 10 and 25 tasks unlocks the Sharpshooter and Taskmaster badges.
            </li>
          </ul>
        </div>
      </div>

      {/* Badge toast */}
      {badgeToast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-scale-in">
          <div className="glass-card flex items-center gap-3 !rounded-2xl border-gold-400/40 px-5 py-3.5 shadow-[0_10px_50px_-10px_rgba(251,191,36,0.35)]">
            <BadgeIcon badge={badgeToast} size={42} />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-gold-400">Badge unlocked</p>
              <p className="text-sm font-bold text-white">{badgeToast.name}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  onToggle,
  onDelete,
  pending,
}: {
  task: Task;
  onToggle: (id: number) => void;
  onDelete: (id: number) => void;
  pending: boolean;
}) {
  const prio = PRIO_STYLE[task.priority] ?? PRIO_STYLE.normal;
  return (
    <li
      className={`group flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all ${
        task.done ? "border-line bg-white/[0.01] opacity-60" : "border-line bg-white/[0.02] hover:border-white/18"
      }`}
    >
      <button
        onClick={() => onToggle(task.id)}
        disabled={pending}
        className={`flex h-5.5 w-5.5 shrink-0 items-center justify-center rounded-md border transition-all ${
          task.done
            ? "border-mint-400 bg-mint-400/25 text-mint-400"
            : "border-white/25 text-transparent hover:border-mint-400 hover:text-mint-400/60"
        }`}
        title={task.done ? "Reopen" : "Mark done"}
      >
        <Check size={13} strokeWidth={3} />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm ${task.done ? "text-[#6d6a8f] line-through" : "text-[#e7e5f7]"}`}>
          {task.title}
        </p>
        {task.focusMinutes > 0 && (
          <p className="tnum mt-0.5 text-[0.65rem] text-brand-300/80">{fmtMinutes(task.focusMinutes)} of deep work</p>
        )}
      </div>
      <span className={`chip shrink-0 !px-2 !py-0.5 !text-[0.62rem] !font-bold ${prio.cls}`}>{prio.label}</span>
      {!task.done && (
        <Link
          href={`/focus?task=${task.id}`}
          className="shrink-0 text-[#6d6a8f] transition hover:text-brand-300"
          title="Focus on this task"
        >
          <Zap size={15} />
        </Link>
      )}
      <button
        onClick={() => onDelete(task.id)}
        disabled={pending}
        className="shrink-0 text-[#4a4866] opacity-0 transition group-hover:opacity-100 hover:!text-rose-400"
        title="Delete"
      >
        <Trash2 size={15} />
      </button>
    </li>
  );
}
