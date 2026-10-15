import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getFocusContext, getRecentProjects } from "@/server/queries";
import { FocusTimer } from "@/components/focus-timer";
import { CommitmentReview } from "@/components/commitment-review";

export const metadata: Metadata = { title: "Focus" };
export const dynamic = "force-dynamic";

export default async function FocusPage({
  searchParams,
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [{ activeTasks, doneToday, todayMinutes }, params, recentProjects] = await Promise.all([
    getFocusContext(user), searchParams, getRecentProjects(user),
  ]);

  const taskParam = Number(params.task);
  const initialTaskId = activeTasks.some((t) => t.id === taskParam) ? taskParam : null;

  return (
    <div className="space-y-4">
      <CommitmentReview />
      <FocusTimer
        tasks={activeTasks}
        initialTaskId={initialTaskId}
        doneToday={doneToday}
        displayName={user.displayName}
        todayMinutes={todayMinutes}
        dailyGoal={user.dailyGoal}
        recentProjects={recentProjects}
      />
    </div>
  );
}
