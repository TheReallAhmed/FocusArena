"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Timer, ListChecks, CalendarDays, Trophy, Users,
  UsersRound, ShieldCheck, UserRoundCog, Watch,
} from "lucide-react";
import { Logo } from "@/components/brand";
import { Avatar, LevelChip, AdminChip } from "@/components/widgets";
import { LogoutButton } from "@/components/client-utils";
import type { User } from "@/db/schema";
import { levelFromXp } from "@/lib/xp";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/focus", label: "Focus", icon: Timer },
  { href: "/stopwatch", label: "Stopwatch", icon: Watch },
  { href: "/rooms", label: "Rooms", icon: UsersRound },
  { href: "/tasks", label: "Tasks", icon: ListChecks },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/squads", label: "Squads", icon: Users },
  { href: "/settings/profile", label: "Edit profile", icon: UserRoundCog },
];

export function Sidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const level = levelFromXp(user.xp);
  const isAdmin = user.role === "admin";

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navItem = (item: (typeof NAV)[number], mobile = false) => {
    if (mobile) {
      return (
        <Link
          key={item.href}
          href={item.href}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
            isActive(item.href)
              ? "bg-brand-500/20 text-white border border-brand-500/40"
              : "text-[#8f8cb0] border border-transparent"
          }`}
        >
          <item.icon size={13} />
          {item.label}
        </Link>
      );
    }
    return (
      <Link key={item.href} href={item.href} className={`nav-link ${isActive(item.href) ? "nav-link-active" : ""}`}>
        <item.icon size={17} strokeWidth={2.1} />
        {item.label}
      </Link>
    );
  };

  const adminItem = { href: "/admin", label: "Admin", icon: ShieldCheck };

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-line bg-ink-900/85 backdrop-blur-xl lg:flex">
        <div className="px-5 py-6">
          <Link href="/"><Logo size={32} /></Link>
        </div>
        <nav className="flex-1 space-y-1 px-3.5">
          {NAV.map((item) => navItem(item))}
          {isAdmin && (
            <Link
              href="/admin"
              className={`nav-link !text-gold-400/90 hover:!text-gold-400 ${isActive("/admin") ? "!border-gold-400/40 !bg-gold-400/10" : ""}`}
            >
              <ShieldCheck size={17} strokeWidth={2.1} />
              Admin
            </Link>
          )}
        </nav>
        <div className="border-t border-line p-3.5">
          <Link
            href={`/u/${user.username}`}
            className="mb-1 flex items-center gap-3 rounded-xl border border-line bg-white/[0.03] px-3 py-2.5 transition hover:border-white/20"
          >
            <Avatar name={user.displayName} hue={user.avatarHue} imageUrl={user.avatarUrl} size={34} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                {user.displayName}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                {isAdmin ? <AdminChip small /> : <LevelChip level={level} small />}
                <span className="tnum text-[0.65rem] text-[#6d6a8f]">{user.xp} XP</span>
              </div>
            </div>
          </Link>
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-40 border-b border-line bg-ink-950/90 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/"><Logo size={28} /></Link>
          <div className="flex items-center gap-2.5">
            {isAdmin ? <AdminChip small /> : <LevelChip level={level} small />}
            <Link href={`/u/${user.username}`}>
              <Avatar name={user.displayName} hue={user.avatarHue} imageUrl={user.avatarUrl} size={30} />
            </Link>
          </div>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-2.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV.map((item) => navItem(item, true))}
          {isAdmin && navItem(adminItem, true)}
        </nav>
      </div>
    </>
  );
}
