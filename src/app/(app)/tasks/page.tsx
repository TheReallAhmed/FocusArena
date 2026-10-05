import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getAllTasks } from "@/server/queries";
import { TasksClient } from "@/components/tasks-client";

export const metadata: Metadata = { title: "Tasks" };
export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const items = await getAllTasks(user);
  const done = items.filter((t) => t.done).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Task Flow</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Your <span className="text-gradient">hit list</span>
          </h1>
        </div>
        <div className="tnum text-sm text-[#8f8cb0]">
          <span className="font-bold text-mint-400">{done}</span> / {items.length} completed
        </div>
      </div>
      <TasksClient initialTasks={items} />
    </div>
  );
}
