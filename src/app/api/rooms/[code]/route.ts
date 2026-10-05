import { eq } from "drizzle-orm";
import { db } from "@/db";
import { rooms, roomMembers, users } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { creditFocusSession } from "@/server/core";

export const dynamic = "force-dynamic";

const PRESENCE_WINDOW_MS = 240_000; // counted as "in the room" for XP credit
const FRESH_CREDIT_WINDOW_MS = 6 * 60_000; // don't credit phases that went stale

/**
 * Room heartbeat — GET performs:
 *  1. membership upsert + presence ping for the caller,
 *  2. lazy phase transitions (serverless-friendly shared clock),
 *  3. XP crediting to everyone present when a focus round ends.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { code } = await params;
  const rows = await db.select().from(rooms).where(eq(rooms.code, code.toUpperCase())).limit(1);
  let room = rows[0];
  if (!room) return Response.json({ error: "not_found" }, { status: 404 });

  const now = new Date();

  // Join + presence ping
  await db
    .insert(roomMembers)
    .values({ roomId: room.id, userId: user.id, lastSeenAt: now })
    .onConflictDoUpdate({
      target: [roomMembers.roomId, roomMembers.userId],
      set: { lastSeenAt: now },
    });

  // Lazy state machine — advance phases whose time has elapsed.
  let guard = 0;
  while ((room.status === "focus" || room.status === "break") && room.phaseStartedAt && guard < 20) {
    const phaseMs = (room.status === "focus" ? room.focusMinutes : room.breakMinutes) * 60_000;
    const phaseEnd = room.phaseStartedAt.getTime() + phaseMs;
    if (now.getTime() < phaseEnd) break;
    guard++;

    if (room.status === "focus") {
      const isLastRound = room.currentRound >= room.totalRounds;
      const fresh = now.getTime() - phaseEnd < FRESH_CREDIT_WINDOW_MS;

      if (fresh) {
        // Credit everyone currently present in the room.
        const cutoff = new Date(now.getTime() - PRESENCE_WINDOW_MS);
        const memberRows = await db
          .select({ lastSeenAt: roomMembers.lastSeenAt, user: users })
          .from(roomMembers)
          .innerJoin(users, eq(roomMembers.userId, users.id))
          .where(eq(roomMembers.roomId, room.id));
        for (const m of memberRows) {
          if (m.lastSeenAt >= cutoff) {
            try {
              await creditFocusSession(m.user, {
                minutes: room.focusMinutes,
                roomId: room.id,
                at: new Date(phaseEnd),
              });
            } catch {
              /* crediting one member must not break transitions */
            }
          }
        }
      }

      if (isLastRound) {
        await db.update(rooms).set({ status: "done", phaseStartedAt: null }).where(eq(rooms.id, room.id));
        room = { ...room, status: "done", phaseStartedAt: null };
        break;
      }
      const nextStart = new Date(phaseEnd);
      await db.update(rooms).set({ status: "break", phaseStartedAt: nextStart }).where(eq(rooms.id, room.id));
      room = { ...room, status: "break", phaseStartedAt: nextStart };
    } else {
      // break finished → next focus round
      const nextStart = new Date(phaseEnd);
      const nextRound = room.currentRound + 1;
      await db
        .update(rooms)
        .set({ status: "focus", currentRound: nextRound, phaseStartedAt: nextStart })
        .where(eq(rooms.id, room.id));
      room = { ...room, status: "focus", currentRound: nextRound, phaseStartedAt: nextStart };
    }
  }

  const memberRows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      username: users.username,
      role: users.role,
      avatarHue: users.avatarHue,
      avatarUrl: users.avatarUrl,
      streak: users.streak,
      lastSeenAt: roomMembers.lastSeenAt,
    })
    .from(roomMembers)
    .innerJoin(users, eq(roomMembers.userId, users.id))
    .where(eq(roomMembers.roomId, room.id));

  return Response.json({
    ok: true,
    serverNow: now.toISOString(),
    room: {
      code: room.code,
      name: room.name,
      status: room.status,
      currentRound: room.currentRound,
      totalRounds: room.totalRounds,
      focusMinutes: room.focusMinutes,
      breakMinutes: room.breakMinutes,
      phaseStartedAt: room.phaseStartedAt ? room.phaseStartedAt.toISOString() : null,
      hostId: room.hostId,
    },
    members: memberRows
      .map((m) => ({
        ...m,
        lastSeenAt: m.lastSeenAt.toISOString(),
        isHost: m.id === room.hostId,
      }))
      .sort((a, b) => Number(b.isHost) - Number(a.isHost)),
    meId: user.id,
  });
}
