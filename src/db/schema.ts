import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  date,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 24 }).notNull(),
    displayName: varchar("display_name", { length: 40 }).notNull(),
    passwordHash: text("password_hash").notNull(),
    role: varchar("role", { length: 10 }).notNull().default("member"),
    avatarHue: integer("avatar_hue").notNull().default(258),
    avatarUrl: text("avatar_url"),
    bio: varchar("bio", { length: 280 }),
    location: varchar("location", { length: 80 }),
    linkedInUrl: varchar("linkedin_url", { length: 300 }),
    githubUrl: varchar("github_url", { length: 300 }),
    websiteUrl: varchar("website_url", { length: 300 }),
    dailyGoal: integer("daily_goal").notNull().default(120),
    apiKey: varchar("api_key", { length: 48 }),
    xp: integer("xp").notNull().default(0),
    xpBalance: integer("xp_balance").notNull().default(0),
    equippedTitle: varchar("equipped_title", { length: 40 }),
    equippedFrame: varchar("equipped_frame", { length: 40 }),
    publicAccountability: boolean("public_accountability").notNull().default(false),
    streak: integer("streak").notNull().default(0),
    lastFocusDay: varchar("last_focus_day", { length: 10 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("users_username_idx").on(t.username),
    check("users_xp_balance_nonnegative_chk", sql`${t.xpBalance} >= 0`),
  ]
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    token: varchar("token", { length: 80 }).primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("auth_sessions_user_idx").on(t.userId)]
);

export const focusSessions = pgTable(
  "focus_sessions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    taskId: integer("task_id"),
    roomId: integer("room_id"),
    project: varchar("project", { length: 40 }),
    note: varchar("note", { length: 200 }),
    minutes: integer("minutes").notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    runKey: varchar("run_key", { length: 36 }),
    focusQuality: integer("focus_quality"),
    focusQualityVersion: integer("focus_quality_version"),
    energyRating: integer("energy_rating"),
    verificationStatus: varchar("verification_status", { length: 24 }),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("focus_sessions_user_day_idx").on(t.userId, t.day),
    index("focus_sessions_day_idx").on(t.day),
    index("focus_sessions_project_idx").on(t.userId, t.project),
    uniqueIndex("focus_sessions_run_key_idx").on(t.runKey),
    check("focus_sessions_quality_range_chk", sql`${t.focusQuality} is null or ${t.focusQuality} between 0 and 100`),
    check("focus_sessions_energy_range_chk", sql`${t.energyRating} is null or ${t.energyRating} between 1 and 5`),
    check("focus_sessions_verification_status_chk", sql`${t.verificationStatus} is null or ${t.verificationStatus} in ('verified', 'partially_verified', 'unverified', 'not_enabled', 'unavailable')`),
  ]
);

export const focusSessionRuns = pgTable(
  "focus_session_runs",
  {
    runKey: varchar("run_key", { length: 36 }).primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    focusSessionId: integer("focus_session_id").references(() => focusSessions.id, { onDelete: "set null" }),
    plannedMinutes: integer("planned_minutes").notNull(),
    energyRating: integer("energy_rating"),
    verificationEnabled: boolean("verification_enabled").notNull().default(false),
    status: varchar("status", { length: 16 }).notNull().default("active"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => [
    index("focus_runs_user_started_idx").on(t.userId, t.startedAt),
    uniqueIndex("focus_runs_session_idx").on(t.focusSessionId),
    check("focus_runs_minutes_chk", sql`${t.plannedMinutes} between 1 and 120`),
    check("focus_runs_status_chk", sql`${t.status} in ('active', 'completed', 'abandoned', 'cancelled')`),
    check("focus_runs_energy_range_chk", sql`${t.energyRating} is null or ${t.energyRating} between 1 and 5`),
  ]
);

export const sessionCommitments = pgTable(
  "session_commitments",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    runKey: varchar("run_key", { length: 36 }).notNull().references(() => focusSessionRuns.runKey, { onDelete: "cascade" }),
    intendedOutcome: varchar("intended_outcome", { length: 240 }).notNull(),
    consequence: varchar("consequence", { length: 240 }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    accountabilityExpiresAt: timestamp("accountability_expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("session_commitments_run_idx").on(t.runKey),
    index("session_commitments_user_status_idx").on(t.userId, t.status, t.createdAt),
    check("session_commitments_status_chk", sql`${t.status} in ('pending', 'unresolved', 'fulfilled', 'broken', 'abandoned', 'cancelled')`),
  ]
);

export const proofChallenges = pgTable(
  "proof_challenges",
  {
    runKey: varchar("run_key", { length: 36 }).primaryKey().references(() => focusSessionRuns.runKey, { onDelete: "cascade" }),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    status: varchar("status", { length: 12 }).notNull().default("scheduled"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
  },
  (t) => [
    index("proof_challenges_user_status_idx").on(t.userId, t.status),
    check("proof_challenges_status_chk", sql`${t.status} in ('scheduled', 'asked', 'answered', 'missed')`),
  ]
);

export const userPerks = pgTable(
  "user_perks",
  {
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    rewardKey: varchar("reward_key", { length: 40 }).notNull(),
    category: varchar("category", { length: 12 }).notNull(),
    xpCost: integer("xp_cost").notNull(),
    purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.rewardKey] }),
    index("user_perks_user_purchased_idx").on(t.userId, t.purchasedAt),
    check("user_perks_category_chk", sql`${t.category} in ('title', 'frame')`),
    check("user_perks_cost_chk", sql`${t.xpCost} > 0`),
  ]
);

export const distractionEvents = pgTable(
  "distraction_events",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    runKey: varchar("run_key", { length: 36 }).notNull().references(() => focusSessionRuns.runKey, { onDelete: "cascade" }),
    clientEventId: varchar("client_event_id", { length: 36 }).notNull(),
    source: varchar("source", { length: 24 }).notNull(),
    note: varchar("note", { length: 240 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("distractions_user_created_idx").on(t.userId, t.createdAt),
    index("distractions_run_idx").on(t.runKey, t.createdAt),
    uniqueIndex("distractions_user_client_event_idx").on(t.userId, t.clientEventId),
    check("distractions_source_chk", sql`${t.source} in ('phone', 'interruption', 'thought', 'noise', 'other')`),
  ]
);

export const duels = pgTable(
  "duels",
  {
    id: serial("id").primaryKey(),
    pairKey: varchar("pair_key", { length: 48 }).notNull(),
    challengerId: integer("challenger_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    opponentId: integer("opponent_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 16 }).notNull().default("pending"),
    invitedAt: timestamp("invited_at", { withTimezone: true }).notNull().defaultNow(),
    invitationExpiresAt: timestamp("invitation_expires_at", { withTimezone: true }).notNull(),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    requiredRounds: integer("required_rounds").notNull().default(10),
    minimumFocusMinutes: integer("minimum_focus_minutes").notNull().default(25),
    taskCategory: varchar("task_category", { length: 20 }).notNull().default("any"),
    stake: varchar("stake", { length: 160 }),
    winnerId: integer("winner_id").references(() => users.id, { onDelete: "set null" }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [
    index("duels_challenger_status_idx").on(t.challengerId, t.status),
    index("duels_opponent_status_idx").on(t.opponentId, t.status),
    uniqueIndex("duels_open_pair_idx").on(t.pairKey).where(sql`${t.status} in ('pending', 'active')`),
    check("duels_distinct_players_chk", sql`${t.challengerId} <> ${t.opponentId}`),
    check("duels_status_chk", sql`${t.status} in ('pending', 'active', 'completed', 'declined', 'cancelled', 'expired')`),
    check("duels_rounds_chk", sql`${t.requiredRounds} between 1 and 100`),
    check("duels_minimum_minutes_chk", sql`${t.minimumFocusMinutes} between 1 and 120`),
  ]
);

export const deepWorkJournal = pgTable(
  "deep_work_journal",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    localDay: date("local_day", { mode: "string" }).notNull(),
    timeZone: varchar("time_zone", { length: 64 }).notNull(),
    wentWell: varchar("went_well", { length: 1200 }).notNull().default(""),
    blockers: varchar("blockers", { length: 1200 }).notNull().default(""),
    tomorrowPriority: varchar("tomorrow_priority", { length: 600 }).notNull().default(""),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("journal_user_day_idx").on(t.userId, t.localDay),
    index("journal_user_updated_idx").on(t.userId, t.updatedAt),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    priority: varchar("priority", { length: 10 }).notNull().default("normal"),
    done: boolean("done").notNull().default(false),
    focusMinutes: integer("focus_minutes").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (t) => [index("tasks_user_idx").on(t.userId)]
);

export const squads = pgTable(
  "squads",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 60 }).notNull(),
    code: varchar("code", { length: 10 }).notNull(),
    createdBy: integer("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("squads_code_idx").on(t.code)]
);

export const squadMembers = pgTable(
  "squad_members",
  {
    squadId: integer("squad_id")
      .notNull()
      .references(() => squads.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.squadId, t.userId] }),
    index("squad_members_user_idx").on(t.userId),
  ]
);

export const userBadges = pgTable(
  "user_badges",
  {
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeKey: varchar("badge_key", { length: 40 }).notNull(),
    earnedAt: timestamp("earned_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.badgeKey] })]
);

export const rooms = pgTable(
  "rooms",
  {
    id: serial("id").primaryKey(),
    code: varchar("code", { length: 10 }).notNull(),
    name: varchar("name", { length: 60 }).notNull(),
    hostId: integer("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: varchar("status", { length: 10 }).notNull().default("lobby"),
    currentRound: integer("current_round").notNull().default(0),
    totalRounds: integer("total_rounds").notNull().default(4),
    focusMinutes: integer("focus_minutes").notNull().default(25),
    breakMinutes: integer("break_minutes").notNull().default(5),
    phaseStartedAt: timestamp("phase_started_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("rooms_code_idx").on(t.code)]
);

export const roomMembers = pgTable(
  "room_members",
  {
    roomId: integer("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    joinedAt: timestamp("joined_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.roomId, t.userId] })]
);

export type User = typeof users.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Squad = typeof squads.$inferSelect;
export type Room = typeof rooms.$inferSelect;
