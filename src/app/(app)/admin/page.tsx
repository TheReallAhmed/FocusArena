import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Users, Clock3, Zap, Radio, History, Medal } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getAdminData } from "@/server/queries";
import { Avatar } from "@/components/widgets";
import { AdminUsersTable } from "@/components/admin-users";
import { fmtMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  const data = await getAdminData();

  return (
    <div className="space-y-5">
      <div>
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-gold-400">
          <ShieldCheck size={14} /> Commander Zone
        </p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Admin <span className="text-gradient">console</span>
        </h1>
        <p className="mt-1.5 text-sm text-[#8f8cb0]">
          Welcome back, {user.displayName}. The arena is yours.
        </p>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
        {[
          { icon: Users, label: "Players", value: String(data.totals.users), hue: 190 },
          { icon: Clock3, label: "All sessions", value: String(data.totals.sessions), hue: 255 },
          { icon: Zap, label: "Minutes focused", value: fmtMinutes(data.totals.minutes), hue: 45 },
          { icon: History, label: "Sessions today", value: String(data.totals.sessionsToday), hue: 160 },
          { icon: Radio, label: "Live rooms", value: String(data.totals.activeRooms), hue: 350 },
          { icon: Medal, label: "Badges awarded", value: String(data.totals.badgesGiven), hue: 280 },
        ].map((s) => (
          <div key={s.label} className="glass-card p-4">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: `hsl(${s.hue} 85% 62% / 0.13)`, color: `hsl(${s.hue} 90% 72%)` }}
            >
              <s.icon size={15} />
            </span>
            <p className="tnum mt-2.5 text-xl font-bold leading-none text-white">{s.value}</p>
            <p className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Users management */}
      <div className="glass-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Users size={15} className="text-brand-300" /> Players management
          </h2>
          <span className="tnum text-xs text-[#8f8cb0]">{data.users.length} shown</span>
        </div>
        <AdminUsersTable users={data.users} meId={user.id} />
      </div>

      {/* Recent activity */}
      <div className="glass-card p-5">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
          <History size={15} className="text-neon-400" /> Latest arena activity
        </h2>
        {data.recent.length === 0 ? (
          <p className="py-4 text-center text-xs text-[#6d6a8f]">No focus sessions logged yet.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
                <Avatar name={r.userName} hue={r.userHue} imageUrl={r.userAvatarUrl} size={28} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-[#d9d7ec]">{r.userName}</p>
                  <p className="text-[0.65rem] text-[#6d6a8f]">
                    {new Date(r.startedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                    {" · "}
                    {new Date(r.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                  </p>
                </div>
                <span className="tnum shrink-0 rounded-md bg-mint-400/12 px-2 py-1 text-xs font-bold text-mint-400">
                  +{r.minutes}m
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
