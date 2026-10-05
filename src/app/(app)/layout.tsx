import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-[0.035]" />
      <div className="pointer-events-none fixed -top-52 left-1/3 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-brand-600/14 blur-[150px]" />
      <Sidebar user={user} />
      <main className="relative px-4 pb-16 pt-28 sm:px-7 lg:pl-[17.5rem] lg:pt-9">
        <div className="mx-auto max-w-5xl animate-fade-up">{children}</div>
      </main>
    </div>
  );
}
