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

/* ------------------------------ BADGES ------------------------------ */

export type BadgeStats = {
  sessions: number;
  minutes: number;
  streak: number;
  tasksDone: number;
  hour: number | null;       // UTC hour of the completed session
  dayOfWeek: number | null;  // UTC 0=Sun..6=Sat
  level: number;
  todayMinutes: number;
  todaySessions: number;
  groupSessions: number;
  squadsJoined: number;
  squadsCreated: number;
  /* extended */
  activeDays: number;        // distinct days with focus
  longestSession: number;    // minutes of the single longest session
  projects: number;          // distinct project tags used
  topProjectMinutes: number; // minutes on the biggest project
  goalDays: number;          // days the daily goal was reached
  perfectWeeks: number;      // calendar weeks with 7/7 active days
  roomsHosted: number;       // focus rooms created
  nightSessions: number;     // sessions finished 22:00–04:00
  morningSessions: number;   // sessions finished 05:00–08:00
  eveningSessions: number;   // sessions finished 16:00–20:00
  weekendDays: number;       // distinct weekend days with focus
  badgeCount: number;        // total badges earned (for meta badges)
  comeback: boolean;         // returned after a 7+ day gap
};

export type BadgeTier = "common" | "rare" | "epic" | "legendary";

export type BadgeCategory =
  | "sessions" | "time" | "streak" | "clock" | "intensity"
  | "tasks" | "social" | "projects" | "mastery";

export type BadgeDef = {
  key: string;
  name: string;
  desc: string;
  icon: string;
  hue: number;
  tier: BadgeTier;
  category: BadgeCategory;
  /** Meta badges are evaluated after every other badge in a pass. */
  meta?: boolean;
  test: (s: BadgeStats) => boolean;
};

const MB = (
  key: string, name: string, desc: string, icon: string, hue: number,
  tier: BadgeTier, test: (s: BadgeStats) => boolean
): BadgeDef => ({ key, name, desc, icon, hue, tier, category: "mastery", meta: true, test });

export const TIER_META: Record<BadgeTier, { label: string; ring: string; glow: string; text: string }> = {
  common:    { label: "Common",    ring: "rgba(148,163,184,0.45)", glow: "rgba(148,163,184,0.25)", text: "#cbd5e1" },
  rare:      { label: "Rare",      ring: "rgba(76,227,255,0.5)",   glow: "rgba(76,227,255,0.35)",  text: "#7dedff" },
  epic:      { label: "Epic",      ring: "rgba(167,139,250,0.55)", glow: "rgba(167,139,250,0.4)",  text: "#c4b5fd" },
  legendary: { label: "Legendary", ring: "rgba(251,191,36,0.6)",   glow: "rgba(251,191,36,0.45)",  text: "#fbbf24" },
};

export const CATEGORY_META: Record<BadgeCategory, { label: string; icon: string }> = {
  sessions:  { label: "Sessions",   icon: "timer" },
  time:      { label: "Deep hours", icon: "hourglass" },
  streak:    { label: "Streaks",    icon: "flame" },
  clock:     { label: "Body clock", icon: "sunrise" },
  intensity: { label: "Intensity",  icon: "activity" },
  tasks:     { label: "Tasks",      icon: "check-circle" },
  social:    { label: "Social",     icon: "users" },
  projects:  { label: "Projects",   icon: "folder-git" },
  mastery:   { label: "Mastery",    icon: "star" },
};

const B = (
  key: string, name: string, desc: string, icon: string, hue: number,
  tier: BadgeTier, category: BadgeCategory, test: (s: BadgeStats) => boolean
): BadgeDef => ({ key, name, desc, icon, hue, tier, category, test });

export const BADGES: BadgeDef[] = [
  /* ── Sessions ───────────────────────────────────────── */
  B("first-blood", "First Blood", "Complete your first focus session", "zap", 45, "common", "sessions", (s) => s.sessions >= 1),
  B("warming-up", "Warming Up", "Complete 10 focus sessions", "activity", 190, "common", "sessions", (s) => s.sessions >= 10),
  B("grinder", "Grinder", "Complete 25 focus sessions", "timer", 200, "common", "sessions", (s) => s.sessions >= 25),
  B("fifty-cal", "Fifty Cal", "Complete 50 focus sessions", "crosshair", 350, "rare", "sessions", (s) => s.sessions >= 50),
  B("century", "Century Club", "Complete 100 focus sessions", "medal", 265, "rare", "sessions", (s) => s.sessions >= 100),
  B("machine", "The Machine", "Complete 250 focus sessions", "cog", 215, "epic", "sessions", (s) => s.sessions >= 250),
  B("immortal", "Immortal", "Complete 500 focus sessions", "skull", 280, "epic", "sessions", (s) => s.sessions >= 500),
  B("thousand-club", "Thousand Club", "Complete 1,000 focus sessions", "infinity", 310, "legendary", "sessions", (s) => s.sessions >= 1000),

  /* ── Deep hours ─────────────────────────────────────── */
  B("first-hour", "First Hour", "Focus for 60 total minutes", "hourglass", 170, "common", "time", (s) => s.minutes >= 60),
  B("ten-hours", "Ten Hours Deep", "Focus for 600 total minutes", "waves", 195, "common", "time", (s) => s.minutes >= 600),
  B("marathon", "Marathoner", "Focus for 1,000 total minutes", "rocket", 20, "rare", "time", (s) => s.minutes >= 1000),
  B("deep-end", "The Deep End", "Focus for 5,000 total minutes", "crown", 300, "epic", "time", (s) => s.minutes >= 5000),
  B("zen-master", "Zen Master", "Focus for 10,000 total minutes", "leaf", 130, "epic", "time", (s) => s.minutes >= 10000),
  B("time-lord", "Time Lord", "Focus for 25,000 total minutes", "orbit", 190, "legendary", "time", (s) => s.minutes >= 25000),
  B("ten-k-hours", "Ten Thousand Hours", "Focus for 50,000 total minutes", "mountain", 45, "legendary", "time", (s) => s.minutes >= 50000),

  /* ── Streaks ────────────────────────────────────────── */
  B("streak-3", "On Fire", "Hold a 3-day focus streak", "flame", 15, "common", "streak", (s) => s.streak >= 3),
  B("streak-7", "Week Warrior", "Hold a 7-day focus streak", "calendar-check", 160, "common", "streak", (s) => s.streak >= 7),
  B("streak-14", "Fortnight Fighter", "Hold a 14-day focus streak", "calendar-days", 175, "rare", "streak", (s) => s.streak >= 14),
  B("streak-30", "Unstoppable", "Hold a 30-day focus streak", "trophy", 45, "epic", "streak", (s) => s.streak >= 30),
  B("streak-60", "The Monk", "Hold a 60-day focus streak", "gem", 185, "epic", "streak", (s) => s.streak >= 60),
  B("streak-100", "Century Streak", "Hold a 100-day focus streak", "diamond", 290, "legendary", "streak", (s) => s.streak >= 100),
  B("streak-365", "The Year", "Hold a 365-day focus streak", "infinity", 50, "legendary", "streak", (s) => s.streak >= 365),
  B("comeback", "The Comeback", "Return to focus after a week away", "repeat", 150, "rare", "streak", (s) => s.comeback),
  B("perfect-week", "Perfect Week", "Focus every single day of a calendar week", "calendar-heart", 340, "rare", "streak", (s) => s.perfectWeeks >= 1),
  B("perfect-month", "Perfect Month", "Hit four perfect weeks", "castle", 265, "epic", "streak", (s) => s.perfectWeeks >= 4),

  /* ── Body clock ─────────────────────────────────────── */
  B("early-bird", "Early Bird", "Finish a session between 5–8 AM", "sunrise", 35, "common", "clock", (s) => s.hour !== null && s.hour >= 5 && s.hour < 8),
  B("night-owl", "Night Owl", "Finish a session between 10 PM–4 AM", "moon", 250, "common", "clock", (s) => s.hour !== null && (s.hour >= 22 || s.hour < 4)),
  B("dawn-patrol", "Dawn Patrol", "Finish 10 sessions before 8 AM", "bird", 30, "rare", "clock", (s) => s.morningSessions >= 10),
  B("midnight-oil", "Midnight Oil", "Finish 10 sessions after 10 PM", "cloud-moon", 255, "rare", "clock", (s) => s.nightSessions >= 10),
  B("weekend-warrior", "Weekend Warrior", "Finish a session on a weekend", "swords", 0, "common", "clock", (s) => s.dayOfWeek !== null && (s.dayOfWeek === 0 || s.dayOfWeek === 6)),
  B("golden-hour", "Golden Hour", "Finish a session between 4–6 PM", "sunset", 25, "common", "clock", (s) => s.hour !== null && s.hour >= 16 && s.hour < 18),
  B("vampire", "Vampire Mode", "Finish 50 sessions after 10 PM", "ghost", 275, "epic", "clock", (s) => s.nightSessions >= 50),

  /* ── Intensity ──────────────────────────────────────── */
  B("big-day", "Big Day", "Focus 300+ minutes in a single day", "sun", 50, "rare", "intensity", (s) => s.todayMinutes >= 300),
  B("double-down", "Double Down", "Complete 8+ sessions in one day", "layers", 230, "rare", "intensity", (s) => s.todaySessions >= 8),
  B("ten-hour-day", "Ten Hour Day", "Focus 600+ minutes in a single day", "battery-full", 140, "epic", "intensity", (s) => s.todayMinutes >= 600),
  B("deep-diver", "Deep Diver", "Log a single session of 60+ minutes", "anchor", 205, "rare", "intensity", (s) => s.longestSession >= 60),
  B("flow-state", "Flow State", "Log a single session of 90+ minutes", "wind", 185, "epic", "intensity", (s) => s.longestSession >= 90),
  B("iron-focus", "Iron Focus", "Log a single session of 120+ minutes", "shield", 220, "legendary", "intensity", (s) => s.longestSession >= 120),
  B("goal-getter", "Goal Getter", "Hit your daily goal for the first time", "target", 350, "common", "intensity", (s) => s.goalDays >= 1),
  B("goal-week", "Goal Streak", "Hit your daily goal on 7 days", "gauge", 160, "rare", "intensity", (s) => s.goalDays >= 7),
  B("goal-month", "Goal Machine", "Hit your daily goal on 30 days", "trophy", 40, "epic", "intensity", (s) => s.goalDays >= 30),

  /* ── Tasks ──────────────────────────────────────────── */
  B("first-task", "Checked Off", "Complete your first task", "check-circle", 150, "common", "tasks", (s) => s.tasksDone >= 1),
  B("sharpshooter", "Sharpshooter", "Complete 10 tasks", "target", 350, "common", "tasks", (s) => s.tasksDone >= 10),
  B("taskmaster", "Taskmaster", "Complete 25 tasks", "check-circle", 140, "rare", "tasks", (s) => s.tasksDone >= 25),
  B("executioner", "The Executioner", "Complete 50 tasks", "axe", 10, "rare", "tasks", (s) => s.tasksDone >= 50),
  B("backlog-slayer", "Backlog Slayer", "Complete 100 tasks", "bomb", 5, "epic", "tasks", (s) => s.tasksDone >= 100),
  B("ship-it", "Ship It", "Complete 250 tasks", "package", 195, "legendary", "tasks", (s) => s.tasksDone >= 250),

  /* ── Social ─────────────────────────────────────────── */
  B("squad-up", "Squad Up", "Join your first squad", "users", 195, "common", "social", (s) => s.squadsJoined >= 1),
  B("founder", "Founder", "Create your own squad", "flag", 155, "common", "social", (s) => s.squadsCreated >= 1),
  B("together", "Stronger Together", "Finish a group focus room round", "handshake", 90, "common", "social", (s) => s.groupSessions >= 1),
  B("hive-mind", "Hive Mind", "Finish 10 group focus room rounds", "brain", 320, "rare", "social", (s) => s.groupSessions >= 10),
  B("room-host", "Room Host", "Host your first focus room", "megaphone", 210, "common", "social", (s) => s.roomsHosted >= 1),
  B("guild-leader", "Guild Leader", "Host 10 focus rooms", "castle", 260, "epic", "social", (s) => s.roomsHosted >= 10),
  B("collective", "The Collective", "Finish 50 group rounds", "boxes", 300, "epic", "social", (s) => s.groupSessions >= 50),

  /* ── Projects (dev-style tagging) ───────────────────── */
  B("first-project", "Version 0.1", "Tag your first session with a project", "git-branch", 200, "common", "projects", (s) => s.projects >= 1),
  B("multi-tasker", "Context Switcher", "Track 3 different projects", "folder-git", 180, "rare", "projects", (s) => s.projects >= 3),
  B("portfolio", "Portfolio Builder", "Track 10 different projects", "boxes", 265, "epic", "projects", (s) => s.projects >= 10),
  B("committed", "Fully Committed", "Log 500 minutes on one project", "terminal", 150, "rare", "projects", (s) => s.topProjectMinutes >= 500),
  B("magnum-opus", "Magnum Opus", "Log 2,000 minutes on one project", "code", 285, "legendary", "projects", (s) => s.topProjectMinutes >= 2000),

  /* ── Body clock extras ──────────────────────────────── */
  B("monday-motivation", "Monday Momentum", "Finish a session on a Monday", "bell", 45, "common", "clock", (s) => s.dayOfWeek === 1),
  B("friday-flow", "Friday Flow", "Finish a session on a Friday", "calendar-heart", 300, "common", "clock", (s) => s.dayOfWeek === 5),
  B("lunch-breaker", "Lunch Breaker", "Finish a session between 12–2 PM", "coffee", 20, "common", "clock", (s) => s.hour !== null && s.hour >= 12 && s.hour < 14),
  B("sunrise-protocol", "Sunrise Protocol", "Finish 25 sessions before 8 AM", "feather", 30, "rare", "clock", (s) => s.morningSessions >= 25),
  B("golden-regular", "Golden Regular", "Finish 20 sessions between 4–8 PM", "award", 25, "rare", "clock", (s) => s.eveningSessions >= 20),
  B("weekend-regular", "Weekend Regular", "Focus on 10 different weekend days", "rainbow", 300, "rare", "clock", (s) => s.weekendDays >= 10),
  B("weekend-legend", "Weekend Legend", "Focus on 30 different weekend days", "siren", 280, "epic", "clock", (s) => s.weekendDays >= 30),

  /* ── Intensity extras ───────────────────────────────── */
  B("two-a-day", "Two-a-Days", "Complete 2 sessions in a single day", "refresh-ccw", 190, "common", "intensity", (s) => s.todaySessions >= 2),

  /* ── Social extras ──────────────────────────────────── */
  B("raid-party", "Raid Party", "Finish 25 group focus room rounds", "party-popper", 320, "rare", "social", (s) => s.groupSessions >= 25),

  /* ── Project extras ─────────────────────────────────── */
  B("polyglot", "Polyglot Developer", "Track 5 different projects", "code-2", 180, "rare", "projects", (s) => s.projects >= 5),
  B("main-quest", "Main Quest", "Log 1,000 minutes on one project", "scroll", 260, "epic", "projects", (s) => s.topProjectMinutes >= 1000),

  /* ── Mastery ────────────────────────────────────────── */
  B("level-10", "Rising Star", "Reach level 10", "star", 55, "common", "mastery", (s) => s.level >= 10),
  B("level-25", "Atomic", "Reach level 25", "atom", 205, "rare", "mastery", (s) => s.level >= 25),
  B("level-50", "Grandmaster", "Reach level 50", "sparkles", 290, "epic", "mastery", (s) => s.level >= 50),
  B("level-100", "Ascended", "Reach level 100", "crown", 48, "legendary", "mastery", (s) => s.level >= 100),
  B("consistent-30", "Thirty Days In", "Focus on 30 different days", "calendar-clock", 165, "rare", "mastery", (s) => s.activeDays >= 30),
  B("consistent-100", "Hundred Days In", "Focus on 100 different days", "compass", 215, "epic", "mastery", (s) => s.activeDays >= 100),
  B("consistent-365", "A Year of Depth", "Focus on 365 different days", "telescope", 270, "legendary", "mastery", (s) => s.activeDays >= 365),

  /* ── Meta badges (earned by earning badges) ─────────── */
  MB("trophy-cabinet", "Trophy Cabinet", "Collect 10 badges", "briefcase", 48, "common", (s) => s.badgeCount >= 10),
  MB("collector", "The Collector", "Collect 25 badges", "key", 200, "rare", (s) => s.badgeCount >= 25),
  MB("curator", "Curator", "Collect 40 badges", "palette", 290, "epic", (s) => s.badgeCount >= 40),
  MB("museum", "The Museum", "Collect 55 badges", "graduation-cap", 46, "legendary", (s) => s.badgeCount >= 55),
];

export function badgeByKey(key: string) {
  return BADGES.find((b) => b.key === key);
}

export const TIER_ORDER: BadgeTier[] = ["legendary", "epic", "rare", "common"];

/** Sort badge keys so the rarest show first in compact rails. */
export function sortByRarity(keys: string[]): BadgeDef[] {
  return keys
    .map(badgeByKey)
    .filter((b): b is BadgeDef => Boolean(b))
    .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));
}

type ProgressStats = { sessions: number; minutes: number; streak: number; tasksDone: number; level: number };

/** cur/req progress for locked, numeric-threshold badges (profile hints). */
export function badgeProgress(key: string, s: ProgressStats): { cur: number; req: number } | null {
  const M: Record<string, { cur: number; req: number }> = {
    "warming-up": { cur: s.sessions, req: 10 },
    "grinder": { cur: s.sessions, req: 25 },
    "fifty-cal": { cur: s.sessions, req: 50 },
    "century": { cur: s.sessions, req: 100 },
    "machine": { cur: s.sessions, req: 250 },
    "ten-hours": { cur: s.minutes, req: 600 },
    "marathon": { cur: s.minutes, req: 1000 },
    "deep-end": { cur: s.minutes, req: 5000 },
    "zen-master": { cur: s.minutes, req: 10000 },
    "streak-7": { cur: s.streak, req: 7 },
    "streak-14": { cur: s.streak, req: 14 },
    "streak-30": { cur: s.streak, req: 30 },
    "sharpshooter": { cur: s.tasksDone, req: 10 },
    "taskmaster": { cur: s.tasksDone, req: 25 },
    "executioner": { cur: s.tasksDone, req: 50 },
    "level-10": { cur: s.level, req: 10 },
    "level-25": { cur: s.level, req: 25 },
  };
  return M[key] ?? null;
}

export function badgeScore(keys: string[]): number {
  const pts: Record<BadgeTier, number> = { common: 1, rare: 3, epic: 7, legendary: 15 };
  return sortByRarity(keys).reduce((sum, b) => sum + pts[b.tier], 0);
}
