import {
  pgTable,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

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
    xp: integer("xp").notNull().default(0),
    streak: integer("streak").notNull().default(0),
    lastFocusDay: varchar("last_focus_day", { length: 10 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("users_username_idx").on(t.username)]
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
    minutes: integer("minutes").notNull(),
    day: varchar("day", { length: 10 }).notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("focus_sessions_user_day_idx").on(t.userId, t.day),
    index("focus_sessions_day_idx").on(t.day),
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
