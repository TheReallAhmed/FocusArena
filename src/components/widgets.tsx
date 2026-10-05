import {
  Zap, Timer, Medal, Rocket, Crown, Flame, CalendarCheck, Trophy,
  Sunrise, Moon, Target, CheckCircle2, Award, Cog, Skull, Leaf,
  Hourglass, CalendarDays, Gem, Swords, Sun, Layers, Axe, Users,
  Flag, Handshake, Brain, Star, Atom, ShieldCheck, type LucideIcon,
} from "lucide-react";
import type { BadgeDef } from "@/lib/xp";

/* ------------------------------ Avatar ------------------------------ */

export function Avatar({
  name,
  hue,
  imageUrl,
  size = 38,
  ring = false,
}: {
  name: string;
  hue: number;
  imageUrl?: string | null;
  size?: number;
  ring?: boolean;
}) {
  const initial = (name || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(135deg, hsl(${hue} 80% 62%), hsl(${(hue + 60) % 360} 85% 45%))`,
        boxShadow: ring ? `0 0 0 2px #06060d, 0 0 0 4px hsl(${hue} 80% 62% / 0.55)` : undefined,
      }}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={`${name}'s avatar`} className="h-full w-full object-cover" />
      ) : (
        initial
      )}
    </span>
  );
}

/* ---------------------------- Level chip ---------------------------- */

export function LevelChip({ level, small = false }: { level: number; small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-brand-500/35 bg-brand-500/12 font-semibold text-brand-300 ${
        small ? "px-2 py-0.5 text-[0.66rem]" : "px-2.5 py-0.5 text-xs"
      }`}
    >
      <Zap size={small ? 10 : 12} strokeWidth={2.5} />
      LVL {level}
    </span>
  );
}

/* ----------------------------- Stat card ----------------------------- */

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  hue = 255,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  hue?: number;
}) {
  return (
    <div className="glass-card glass-card-hover p-5">
      <div className="flex items-center justify-between">
        <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-[#8f8cb0]">{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: `hsl(${hue} 85% 62% / 0.14)`, color: `hsl(${hue} 90% 72%)` }}
        >
          <Icon size={16} strokeWidth={2.2} />
        </span>
      </div>
      <div className="tnum mt-2 text-[1.7rem] font-bold leading-none tracking-tight text-white">{value}</div>
      {sub && <div className="mt-1.5 text-xs text-[#7b78a0]">{sub}</div>}
    </div>
  );
}

/* ---------------------------- Week chart ---------------------------- */

export function WeekChart({ data }: { data: { label: string; minutes: number; isToday: boolean }[] }) {
  const max = Math.max(60, ...data.map((d) => d.minutes));
  return (
    <div className="flex h-44 items-end gap-2.5 sm:gap-3.5">
      {data.map((d) => {
        const h = Math.max(3, Math.round((d.minutes / max) * 100));
        return (
          <div key={d.label} className="group flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="tnum text-[0.68rem] font-medium text-[#8f8cb0] opacity-0 transition-opacity group-hover:opacity-100">
              {d.minutes}m
            </span>
            <div
              className={`w-full max-w-10 rounded-t-lg rounded-b-sm transition-all duration-500 ${
                d.isToday
                  ? "bg-gradient-to-t from-brand-600 via-brand-500 to-neon-400 shadow-[0_0_24px_-2px_rgba(124,108,255,0.55)]"
                  : "bg-gradient-to-t from-[#23234a] to-[#34346b] group-hover:to-brand-700"
              }`}
              style={{ height: `${h}%` }}
            />
            <span className={`text-[0.68rem] font-semibold ${d.isToday ? "text-brand-300" : "text-[#6d6a8f]"}`}>
              {d.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------------------- Badge icon ---------------------------- */

const BADGE_ICONS: Record<string, LucideIcon> = {
  zap: Zap, timer: Timer, medal: Medal, rocket: Rocket, crown: Crown,
  flame: Flame, "calendar-check": CalendarCheck, trophy: Trophy,
  sunrise: Sunrise, moon: Moon, target: Target, "check-circle": CheckCircle2,
  cog: Cog, skull: Skull, leaf: Leaf, hourglass: Hourglass,
  "calendar-days": CalendarDays, gem: Gem, swords: Swords, sun: Sun,
  layers: Layers, axe: Axe, users: Users, flag: Flag, handshake: Handshake,
  brain: Brain, star: Star, atom: Atom,
};

/* ---------------------------- Admin chip ---------------------------- */

export function AdminChip({ small = false }: { small?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border border-gold-400/50 bg-gold-400/12 font-black uppercase tracking-wider text-gold-400 ${
        small ? "px-1.5 py-0 text-[0.58rem]" : "px-2.5 py-0.5 text-[0.65rem]"
      }`}
      title="Project admin"
    >
      <ShieldCheck size={small ? 9 : 11} strokeWidth={2.5} />
      Admin
    </span>
  );
}

export function BadgeIcon({
  badge,
  size = 44,
  locked = false,
}: {
  badge: Pick<BadgeDef, "icon" | "hue" | "name">;
  size?: number;
  locked?: boolean;
}) {
  const Icon = BADGE_ICONS[badge.icon] ?? Award;
  return (
    <span
      title={badge.name}
      className="flex items-center justify-center rounded-2xl border"
      style={{
        width: size,
        height: size,
        borderColor: locked ? "rgba(255,255,255,0.08)" : `hsl(${badge.hue} 85% 65% / 0.4)`,
        background: locked ? "rgba(255,255,255,0.03)" : `hsl(${badge.hue} 85% 60% / 0.14)`,
        color: locked ? "#4a4866" : `hsl(${badge.hue} 92% 72%)`,
        boxShadow: locked ? undefined : `0 0 22px -6px hsl(${badge.hue} 85% 60% / 0.5)`,
      }}
    >
      <Icon size={size * 0.45} strokeWidth={2.1} />
    </span>
  );
}

/* ---------------------------- Empty state ---------------------------- */

export function EmptyState({
  icon: Icon,
  title,
  hint,
}: {
  icon: LucideIcon;
  title: string;
  hint?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-line bg-white/[0.03] text-[#5c5a78]">
        <Icon size={20} />
      </span>
      <p className="text-sm font-medium text-[#a5a2c8]">{title}</p>
      {hint && <p className="text-xs text-[#6d6a8f]">{hint}</p>}
    </div>
  );
}
