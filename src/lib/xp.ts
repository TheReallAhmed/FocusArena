export const XP_PER_MINUTE = 1;

/** XP required to *reach* a given level: 0, 100, 300, 600, 1000... */
export function xpForLevel(level: number): number {
  return 50 * (level - 1) * level;
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}

export function levelProgress(xp: number) {
  const level = levelFromXp(xp);
  const floor = xpForLevel(level);
  const ceil = xpForLevel(level + 1);
  const into = xp - floor;
  const span = ceil - floor;
  return {
    level,
    into,
    span,
    pct: Math.min(100, Math.round((into / span) * 100)),
    nextIn: ceil - xp,
  };
}

export type BadgeStats = {
  sessions: number;
  minutes: number;
  streak: number;
  tasksDone: number;
  hour: number | null; // UTC hour of the completed session
  dayOfWeek: number | null; // UTC 0=Sun..6=Sat
  level: number;
  todayMinutes: number;
  todaySessions: number;
  groupSessions: number;
  squadsJoined: number;
  squadsCreated: number;
};

export type BadgeDef = {
  key: string;
  name: string;
  desc: string;
  icon: string;
  hue: number;
  test: (s: BadgeStats) => boolean;
};

export const BADGES: BadgeDef[] = [
  /* ── Session milestones ─────────────────────────── */
  { key: "first-blood", name: "First Blood", desc: "Complete your first focus session", icon: "zap", hue: 45, test: (s) => s.sessions >= 1 },
  { key: "grinder", name: "Grinder", desc: "Complete 25 focus sessions", icon: "timer", hue: 200, test: (s) => s.sessions >= 25 },
  { key: "century", name: "Century Club", desc: "Complete 100 focus sessions", icon: "medal", hue: 265, test: (s) => s.sessions >= 100 },
  { key: "machine", name: "The Machine", desc: "Complete 250 focus sessions", icon: "cog", hue: 215, test: (s) => s.sessions >= 250 },
  { key: "immortal", name: "Immortal", desc: "Complete 500 focus sessions", icon: "skull", hue: 280, test: (s) => s.sessions >= 500 },

  /* ── Time milestones ────────────────────────────── */
  { key: "marathon", name: "Marathoner", desc: "Focus for 1,000 total minutes", icon: "rocket", hue: 20, test: (s) => s.minutes >= 1000 },
  { key: "deep-end", name: "The Deep End", desc: "Focus for 5,000 total minutes", icon: "crown", hue: 300, test: (s) => s.minutes >= 5000 },
  { key: "zen-master", name: "Zen Master", desc: "Focus for 10,000 total minutes", icon: "leaf", hue: 130, test: (s) => s.minutes >= 10000 },
  { key: "time-lord", name: "Time Lord", desc: "Focus for 25,000 total minutes", icon: "hourglass", hue: 190, test: (s) => s.minutes >= 25000 },

  /* ── Streaks ────────────────────────────────────── */
  { key: "streak-3", name: "On Fire", desc: "Hold a 3-day focus streak", icon: "flame", hue: 15, test: (s) => s.streak >= 3 },
  { key: "streak-7", name: "Week Warrior", desc: "Hold a 7-day focus streak", icon: "calendar-check", hue: 160, test: (s) => s.streak >= 7 },
  { key: "streak-14", name: "Fortnight Fighter", desc: "Hold a 14-day focus streak", icon: "calendar-days", hue: 175, test: (s) => s.streak >= 14 },
  { key: "streak-30", name: "Unstoppable", desc: "Hold a 30-day focus streak", icon: "trophy", hue: 45, test: (s) => s.streak >= 30 },
  { key: "streak-60", name: "The Monk", desc: "Hold a 60-day focus streak", icon: "gem", hue: 185, test: (s) => s.streak >= 60 },

  /* ── Time-of-day ────────────────────────────────── */
  { key: "early-bird", name: "Early Bird", desc: "Finish a session between 5–8 AM", icon: "sunrise", hue: 35, test: (s) => s.hour !== null && s.hour >= 5 && s.hour < 8 },
  { key: "night-owl", name: "Night Owl", desc: "Finish a session between 10 PM–4 AM", icon: "moon", hue: 250, test: (s) => s.hour !== null && (s.hour >= 22 || s.hour < 4) },
  { key: "weekend-warrior", name: "Weekend Warrior", desc: "Finish a session on a weekend", icon: "swords", hue: 0, test: (s) => s.dayOfWeek !== null && (s.dayOfWeek === 0 || s.dayOfWeek === 6) },

  /* ── Big days ───────────────────────────────────── */
  { key: "big-day", name: "Big Day", desc: "Focus 300+ minutes in a single day", icon: "sun", hue: 50, test: (s) => s.todayMinutes >= 300 },
  { key: "double-down", name: "Double Down", desc: "Complete 8+ sessions in one day", icon: "layers", hue: 230, test: (s) => s.todaySessions >= 8 },

  /* ── Tasks ──────────────────────────────────────── */
  { key: "sharpshooter", name: "Sharpshooter", desc: "Complete 10 tasks", icon: "target", hue: 350, test: (s) => s.tasksDone >= 10 },
  { key: "taskmaster", name: "Taskmaster", desc: "Complete 25 tasks", icon: "check-circle", hue: 140, test: (s) => s.tasksDone >= 25 },
  { key: "executioner", name: "The Executioner", desc: "Complete 50 tasks", icon: "axe", hue: 10, test: (s) => s.tasksDone >= 50 },

  /* ── Social & squads ────────────────────────────── */
  { key: "squad-up", name: "Squad Up", desc: "Join your first squad", icon: "users", hue: 195, test: (s) => s.squadsJoined >= 1 },
  { key: "founder", name: "Founder", desc: "Create your own squad", icon: "flag", hue: 155, test: (s) => s.squadsCreated >= 1 },
  { key: "together", name: "Stronger Together", desc: "Finish a group focus room round", icon: "handshake", hue: 90, test: (s) => s.groupSessions >= 1 },
  { key: "hive-mind", name: "Hive Mind", desc: "Finish 10 group focus room rounds", icon: "brain", hue: 320, test: (s) => s.groupSessions >= 10 },

  /* ── Levels ─────────────────────────────────────── */
  { key: "level-10", name: "Rising Star", desc: "Reach level 10", icon: "star", hue: 55, test: (s) => s.level >= 10 },
  { key: "level-25", name: "Atomic", desc: "Reach level 25", icon: "atom", hue: 205, test: (s) => s.level >= 25 },
];

export function badgeByKey(key: string) {
  return BADGES.find((b) => b.key === key);
}
