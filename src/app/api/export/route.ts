import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { focusSessions, tasks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Export your own focus log: /api/export?format=csv|json */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "unauthorized" }, { status: 401 });

  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "csv";

  const rows = await db
    .select({
      id: focusSessions.id,
      startedAt: focusSessions.startedAt,
      day: focusSessions.day,
      minutes: focusSessions.minutes,
      project: focusSessions.project,
      note: focusSessions.note,
      roomId: focusSessions.roomId,
      task: tasks.title,
    })
    .from(focusSessions)
    .leftJoin(tasks, eq(focusSessions.taskId, tasks.id))
    .where(eq(focusSessions.userId, user.id))
    .orderBy(desc(focusSessions.startedAt));

  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    return new Response(JSON.stringify({ user: user.username, exportedAt: new Date(), sessions: rows }, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="focusarena-${user.username}-${stamp}.json"`,
      },
    });
  }

  const header = "id,started_at,day,minutes,project,task,note,group_room";
  const body = rows
    .map((r) =>
      [r.id, r.startedAt.toISOString(), r.day, r.minutes, r.project, r.task, r.note, r.roomId ? "yes" : "no"]
        .map(esc)
        .join(",")
    )
    .join("\n");

  return new Response(`${header}\n${body}\n`, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="focusarena-${user.username}-${stamp}.csv"`,
    },
  });
}
