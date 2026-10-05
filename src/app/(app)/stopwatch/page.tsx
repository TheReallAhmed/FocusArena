import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getFocusContext } from "@/server/queries";
import { StopwatchClient } from "@/components/stopwatch-client";

export const metadata: Metadata = { title: "Stopwatch" };
export const dynamic = "force-dynamic";

export default async function StopwatchPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const { activeTasks, todayMinutes } = await getFocusContext(user);

  return (
    <StopwatchClient
      tasks={activeTasks}
      todayMinutes={todayMinutes}
      dailyGoal={user.dailyGoal}
    />
  );
}
