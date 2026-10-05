import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Crown, Flame, Medal, Users } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getSquadDetail } from "@/server/queries";
import { Avatar, AdminChip, LevelChip } from "@/components/widgets";
import { CopyButton } from "@/components/client-utils";
import { LiveRefresh } from "@/components/live-refresh";
import { LeaveSquadButton } from "@/components/squad-leave";
import { levelFromXp } from "@/lib/xp";
import { fmtMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Squad" };
export const dynamic = "force-dynamic";

export default async function SquadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; joined?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [{ id }, flags] = await Promise.all([params, searchParams]);
  const detail = await getSquadDetail(user, Number(id));
  if (!detail) notFound();

  const { squad, members, isOwner } = detail;

  return (
    <div className="space-y-5">
      <Link href="/squads" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8f8cb0] transition hover:text-white">
        <ArrowLeft size={14} /> All squads
      </Link>

      <div className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full bg-brand-500/16 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {squad.name}
              {isOwner && <Crown size={20} className="text-gold-400" />}
            </h1>
            <p className="mt-1.5 flex items-center gap-2 text-sm text-[#8f8cb0]">
              <Users size={14} /> {members.length} member{members.length === 1 ? "" : "s"} · weekly board resets Monday
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="chip font-mono !px-3.5 !py-2 !text-sm !font-bold tracking-[0.3em] text-brand-300">
              {squad.code}
            </span>
            <CopyButton text={squad.code} />
            <LeaveSquadButton squadId={squad.id} />
          </div>
        </div>
        {(flags.created || flags.joined) && (
          <p className="relative mt-4 rounded-xl border border-mint-400/30 bg-mint-400/10 px-4 py-2.5 text-xs font-semibold text-mint-400 animate-fade-up">
            {flags.created
              ? "Squad created — send the code above to your friends so they can join."
              : "You joined the squad. Start a sprint and take the top spot."}
          </p>
        )}
      </div>

      <div className="glass-card divide-y divide-line overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Medal size={15} className="text-gold-400" /> This week
            <LiveRefresh intervalMs={20000} label="Live" />
          </h2>
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#6d6a8f]">Focus minutes</span>
        </div>
        {members.map((m, i) => (
          <div key={m.id} className={`flex items-center gap-3.5 px-5 py-4 ${m.id === user.id ? "bg-brand-500/8" : ""}`}>
            <span
              className={`tnum w-6 shrink-0 text-center text-sm font-black ${
                i === 0 ? "text-gold-400" : i === 1 ? "text-[#c7c4de]" : i === 2 ? "text-[#e08a4c]" : "text-[#6d6a8f]"
              }`}
            >
              {i + 1}
            </span>
            <Avatar name={m.displayName} hue={m.avatarHue} imageUrl={m.avatarUrl} size={38} />
            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                {m.displayName}
                {m.role === "admin" && <AdminChip small />}
                {m.id === user.id && <span className="text-xs font-bold text-brand-300">(you)</span>}
                {m.id === squad.createdBy && <Crown size={12} className="inline text-gold-400" />}
              </p>
              <p className="text-[0.68rem] text-[#6d6a8f]">@{m.username}</p>
            </div>
            <div className="hidden items-center gap-1.5 sm:flex">
              <LevelChip level={levelFromXp(m.xp)} small />
              {m.streak > 0 && (
                <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-gold-400">
                  <Flame size={10} /> {m.streak}
                </span>
              )}
            </div>
            {/* mini bar */}
            <div className="hidden w-28 md:block">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-brand-500 to-neon-400"
                  style={{ width: `${Math.max(4, Math.round((Number(m.weekMinutes) / Math.max(1, Number(members[0]?.weekMinutes ?? 1))) * 100))}%` }}
                />
              </div>
            </div>
            <span className="tnum w-16 shrink-0 text-right text-sm font-bold text-white">
              {fmtMinutes(Number(m.weekMinutes))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
