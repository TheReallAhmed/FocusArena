"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { randomInt } from "crypto";
import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  users, tasks, rooms, roomMembers, squads, squadMembers, type User,
} from "@/db/schema";
import { createSession, destroySession, getSessionUser } from "@/lib/auth";
import { creditFocusSession, collectBadgeStats, evaluateBadges } from "@/server/core";

export type FormState = { error?: string } & Record<string, unknown>;

async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/dashboard");
  return user;
}

function revalidateAll() {
  for (const p of ["/dashboard", "/focus", "/tasks", "/calendar", "/leaderboard", "/squads", "/rooms", "/admin"]) {
    revalidatePath(p);
  }
}

/* ------------------------------ AUTH ------------------------------ */

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const displayName = String(formData.get("displayName") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username: 3–20 chars, lowercase letters, numbers, underscore." };
  }
  if (displayName.length < 2 || displayName.length > 40) {
    return { error: "Display name must be 2–40 characters." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const existing = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (existing.length > 0) return { error: "That username is taken. Pick another one." };

  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await db
    .insert(users)
    .values({ username, displayName, passwordHash, avatarHue: randomInt(0, 360) })
    .returning({ id: users.id });

  await createSession(inserted[0].id);
  redirect("/dashboard");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
  const user = rows[0];
  if (!user) return { error: "No account with that username." };

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return { error: "Wrong password. Try again." };

  await createSession(user.id);
  redirect("/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/");
}

/* --------------------------- FOCUS SESSIONS --------------------------- */

export type FocusResult = {
  ok: boolean;
  gained: number;
  xp: number;
  level: number;
  leveledUp: boolean;
  streak: number;
  newBadges: { key: string; name: string; desc: string; icon: string; hue: number }[];
};

export async function completeFocusSession(input: { minutes: number; taskId?: number | null }): Promise<FocusResult> {
  const user = await requireUser();
  const minutes = Math.max(1, Math.min(180, Math.round(input.minutes)));
  const res = await creditFocusSession(user, { minutes, taskId: input.taskId });
  revalidateAll();
  return { ok: true, gained: minutes, ...res };
}

/* ------------------------------- TASKS ------------------------------- */

export async function addTaskAction(title: string, priority: string) {
  const user = await requireUser();
  const clean = title.trim().slice(0, 200);
  if (clean.length < 2) return { error: "Task title is too short." };
  const prio = ["low", "normal", "high"].includes(priority) ? priority : "normal";
  const rows = await db.insert(tasks).values({ userId: user.id, title: clean, priority: prio }).returning();
  revalidateAll();
  return { task: rows[0] };
}

export async function toggleTaskAction(taskId: number) {
  const user = await requireUser();
  const rows = await db.select().from(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id))).limit(1);
  const task = rows[0];
  if (!task) return { error: "Task not found." };

  const done = !task.done;
  await db.update(tasks).set({ done, completedAt: done ? new Date() : null }).where(eq(tasks.id, taskId));

  let newBadges: Awaited<ReturnType<typeof evaluateBadges>> = [];
  if (done) {
    const stats = await collectBadgeStats(user);
    newBadges = await evaluateBadges(user.id, stats);
  }
  revalidateAll();
  return { done, newBadges };
}

export async function deleteTaskAction(taskId: number) {
  const user = await requireUser();
  await db.delete(tasks).where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)));
  revalidateAll();
  return { ok: true };
}

/* ------------------------------- SQUADS ------------------------------- */

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateCode(table: "squads" | "rooms"): Promise<string> {
  for (let i = 0; i < 12; i++) {
    let code = "";
    for (let j = 0; j < 6; j++) code += CODE_ALPHABET[randomInt(0, CODE_ALPHABET.length)];
    const clash =
      table === "squads"
        ? await db.select({ id: squads.id }).from(squads).where(eq(squads.code, code)).limit(1)
        : await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
    if (clash.length === 0) return code;
  }
  return `${Date.now()}`.slice(-8);
}

export async function createSquadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 3) return { error: "Squad name must be at least 3 characters." };

  const owned = await db.select({ id: squads.id }).from(squads).where(eq(squads.createdBy, user.id));
  if (owned.length >= 5) return { error: "You can create up to 5 squads." };

  const code = await generateCode("squads");
  const rows = await db.insert(squads).values({ name, code, createdBy: user.id }).returning({ id: squads.id });
  await db.insert(squadMembers).values({ squadId: rows[0].id, userId: user.id });

  const stats = await collectBadgeStats(user);
  await evaluateBadges(user.id, stats);

  revalidatePath("/squads");
  redirect(`/squads/${rows[0].id}?created=1`);
}

export async function joinSquadAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (code.length < 4) return { error: "Enter a valid invite code." };

  const found = await db.select().from(squads).where(eq(squads.code, code)).limit(1);
  const squad = found[0];
  if (!squad) return { error: "No squad with that code. Double-check it." };

  const already = await db
    .select({ squadId: squadMembers.squadId })
    .from(squadMembers)
    .where(and(eq(squadMembers.squadId, squad.id), eq(squadMembers.userId, user.id)))
    .limit(1);
  if (already.length > 0) return { error: "You are already in that squad." };

  const memberships = await db.select({ squadId: squadMembers.squadId }).from(squadMembers).where(eq(squadMembers.userId, user.id));
  if (memberships.length >= 10) return { error: "You can join up to 10 squads." };

  await db.insert(squadMembers).values({ squadId: squad.id, userId: user.id });

  const stats = await collectBadgeStats(user);
  await evaluateBadges(user.id, stats);

  revalidatePath("/squads");
  redirect(`/squads/${squad.id}?joined=1`);
}

export async function leaveSquadAction(squadId: number) {
  const user = await requireUser();
  await db.delete(squadMembers).where(and(eq(squadMembers.squadId, squadId), eq(squadMembers.userId, user.id)));
  revalidateAll();
  return { ok: true };
}

/* ------------------------------- ROOMS ------------------------------- */

export async function createRoomAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  if (name.length < 3) return { error: "Room name must be at least 3 characters." };

  const clamp = (v: string, dflt: number, min: number, max: number) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : dflt;
  };
  const focusMinutes = clamp(String(formData.get("focusMinutes") ?? ""), 25, 5, 120);
  const breakMinutes = clamp(String(formData.get("breakMinutes") ?? ""), 5, 1, 60);
  const totalRounds = clamp(String(formData.get("totalRounds") ?? ""), 4, 1, 12);

  const code = await generateCode("rooms");
  const rows = await db
    .insert(rooms)
    .values({ name, code, hostId: user.id, focusMinutes, breakMinutes, totalRounds })
    .returning({ id: rooms.id });
  await db.insert(roomMembers).values({ roomId: rows[0].id, userId: user.id });

  revalidatePath("/rooms");
  redirect(`/rooms/${code}`);
}

export async function joinRoomByCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireUser();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  if (code.length < 4) return { error: "Enter a valid room code." };
  const found = await db.select({ id: rooms.id, status: rooms.status }).from(rooms).where(eq(rooms.code, code)).limit(1);
  if (!found[0]) return { error: "No room with that code." };
  redirect(`/rooms/${code}`);
}

export async function startRoomAction(code: string) {
  const user = await requireUser();
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  const room = rows[0];
  if (!room || room.hostId !== user.id) return { error: "Only the host can start." };
  if (room.status !== "lobby") return { error: "Room already started." };
  await db
    .update(rooms)
    .set({ status: "focus", currentRound: 1, phaseStartedAt: new Date() })
    .where(eq(rooms.id, room.id));
  revalidatePath(`/rooms/${code}`);
  return { ok: true };
}

export async function endRoomAction(code: string) {
  const user = await requireUser();
  const rows = await db.select().from(rooms).where(eq(rooms.code, code)).limit(1);
  const room = rows[0];
  if (!room || (room.hostId !== user.id && user.role !== "admin")) return { error: "Only the host can end the room." };
  await db.update(rooms).set({ status: "done", phaseStartedAt: null }).where(eq(rooms.id, room.id));
  revalidatePath(`/rooms/${code}`);
  revalidatePath("/rooms");
  return { ok: true };
}

export async function leaveRoomAction(code: string) {
  const user = await requireUser();
  const rows = await db.select({ id: rooms.id }).from(rooms).where(eq(rooms.code, code)).limit(1);
  if (rows[0]) {
    await db.delete(roomMembers).where(and(eq(roomMembers.roomId, rows[0].id), eq(roomMembers.userId, user.id)));
  }
  revalidatePath("/rooms");
  return { ok: true };
}

/* ------------------------------ PROFILE ------------------------------ */

export type ProfileState = { error?: string; success?: string };

function cleanOptional(value: FormDataEntryValue | null, max: number): string | null {
  const clean = String(value ?? "").trim().slice(0, max);
  return clean || null;
}

function validateProfileUrl(
  value: FormDataEntryValue | null,
  kind: "linkedin" | "github" | "website"
): { value: string | null; error?: string } {
  const raw = String(value ?? "").trim();
  if (!raw) return { value: null };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!['http:', 'https:'].includes(url.protocol)) return { value: null, error: "Only http/https links are allowed." };
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (kind === "linkedin" && host !== "linkedin.com") return { value: null, error: "Use a valid linkedin.com profile link." };
    if (kind === "github" && host !== "github.com") return { value: null, error: "Use a valid github.com profile link." };
    return { value: url.toString().slice(0, 300) };
  } catch {
    return { value: null, error: `The ${kind} link is not valid.` };
  }
}

export async function updateProfileAction(
  _prev: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await requireUser();
  const displayName = String(formData.get("displayName") ?? "").trim().slice(0, 40);
  const bio = cleanOptional(formData.get("bio"), 280);
  const location = cleanOptional(formData.get("location"), 80);
  if (displayName.length < 2) return { error: "Display name must be at least 2 characters." };

  const linkedIn = validateProfileUrl(formData.get("linkedInUrl"), "linkedin");
  const github = validateProfileUrl(formData.get("githubUrl"), "github");
  const website = validateProfileUrl(formData.get("websiteUrl"), "website");
  const urlError = linkedIn.error ?? github.error ?? website.error;
  if (urlError) return { error: urlError };

  const avatarMode = String(formData.get("avatarMode") ?? "keep");
  let avatarUrl = user.avatarUrl;
  if (avatarMode === "remove") {
    avatarUrl = null;
  } else if (avatarMode === "replace") {
    const data = String(formData.get("avatarData") ?? "");
    if (!/^data:image\/(webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(data)) {
      return { error: "The profile photo is not a valid image." };
    }
    if (data.length > 350_000) {
      return { error: "The compressed photo is too large. Choose a smaller image." };
    }
    avatarUrl = data;
  }

  await db
    .update(users)
    .set({
      displayName,
      bio,
      location,
      linkedInUrl: linkedIn.value,
      githubUrl: github.value,
      websiteUrl: website.value,
      avatarUrl,
    })
    .where(eq(users.id, user.id));

  revalidateAll();
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/settings/profile");
  return { success: "Profile updated — your new identity is live across the arena." };
}

/* ------------------------------- GOAL ------------------------------- */

export async function setDailyGoalAction(minutes: number) {
  const user = await requireUser();
  const v = Math.max(15, Math.min(600, Math.round(minutes)));
  await db.update(users).set({ dailyGoal: v }).where(eq(users.id, user.id));
  revalidateAll();
  return { ok: true, value: v };
}

/* ------------------------------- ADMIN ------------------------------- */

export async function setUserRoleAction(targetUserId: number, role: "admin" | "member") {
  const admin = await requireAdmin();
  if (targetUserId === admin.id) return { error: "You cannot change your own role." };
  await db.update(users).set({ role }).where(eq(users.id, targetUserId));
  revalidateAll();
  return { ok: true };
}

export async function deleteUserAction(targetUserId: number) {
  const admin = await requireAdmin();
  if (targetUserId === admin.id) return { error: "You cannot delete yourself." };
  await db.delete(users).where(and(eq(users.id, targetUserId), ne(users.id, admin.id)));
  revalidateAll();
  return { ok: true };
}
