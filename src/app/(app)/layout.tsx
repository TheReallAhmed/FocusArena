import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { Sidebar } from "@/components/sidebar";
import { TimerProvider } from "@/components/timer-provider";
import { CommandPalette } from "@/components/command-palette";
import { RotatingGuidance } from "@/components/rotating-guidance";
import { LocaleProvider } from "@/components/locale-provider";
import { normalizeLocale } from "@/lib/i18n";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const locale = normalizeLocale(user.locale);

  return (
    <LocaleProvider locale={locale}><div className="relative min-h-dvh">
      <div className="pointer-events-none fixed inset-0 bg-noise opacity-[0.035]" />
      <div className="pointer-events-none fixed -top-52 left-1/3 h-[420px] w-[700px] -translate-x-1/2 rounded-full bg-brand-600/14 blur-[150px]" />
      <TimerProvider>
        <Sidebar user={user} />
        <CommandPalette isAdmin={user.role === "admin"} username={user.username} />
        <main className="relative px-4 pb-16 pt-28 sm:px-7 lg:ps-[17.5rem] lg:pt-9">
          <div className="mx-auto max-w-6xl animate-fade-up">
            <RotatingGuidance />
            {children}
          </div>
        </main>
      </TimerProvider>
    </div></LocaleProvider>
  );
}
