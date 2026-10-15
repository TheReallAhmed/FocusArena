import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Clock3, Swords, Trophy } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { fmtMinutes } from "@/lib/dates";
import { LiveRefresh } from "@/components/live-refresh";
import { DuelInviteForm } from "@/components/duel-controls";
import { listDuelsForUser } from "@/server/duels";

export const metadata: Metadata = { title: "Duel Mode" };
export const dynamic = "force-dynamic";
const dateLabel = (date: Date | null) => date ? `${date.toLocaleString("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC` : "Not started";
const statusName: Record<string, string> = { pending: "Invitation", active: "In progress", completed: "Completed", declined: "Declined", cancelled: "Cancelled", expired: "Expired" };

export default async function DuelsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const duels = await listDuelsForUser();
  const incoming = duels.filter((duel) => duel.status === "pending" && duel.opponentId === user.id);
  const outgoing = duels.filter((duel) => duel.status === "pending" && duel.challengerId === user.id);
  const others = duels.filter((duel) => duel.status !== "pending");
  const hasActive = others.some((duel) => duel.status === "active");

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Friendly competition</p><h1 className="mt-1.5 flex items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl"><Swords size={25} className="text-brand-300" /> Duel Mode {hasActive && <LiveRefresh intervalMs={30000} label="Refresh" />}</h1><p className="mt-1.5 text-sm text-[#8f8cb0]">A fair, seven-day focus challenge. Progress is derived from completed, server-timed focus rounds.</p></div>
      </header>

      <DuelInviteForm />

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="glass-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Clock3 size={15} className="text-gold-400" /> Invitations to you ({incoming.length})</h2>
          {incoming.length === 0 ? <p className="mt-4 text-sm text-[#6d6a8f]">No pending invitations.</p> : <div className="mt-3 space-y-3">{incoming.map((duel) => <article key={duel.id} className="rounded-xl border border-line bg-white/[0.025] p-4"><p className="text-sm font-semibold text-white">{duel.challenger?.displayName ?? "Player"} <span className="font-normal text-[#8f8cb0]">(@{duel.challenger?.username ?? "unknown"}) challenged you</span></p><p className="mt-1 text-xs text-[#6d6a8f]">Invitation expires {dateLabel(duel.invitationExpiresAt)} · 10 rounds · optional stake only</p><Link href={`/duels/${duel.id}`} className="btn btn-primary mt-3 !py-2 text-xs">Review rules & respond <ArrowRight size={13} /></Link></article>)}</div>}
        </div>

        <div className="glass-card p-5">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Clock3 size={15} className="text-brand-300" /> Sent invitations ({outgoing.length})</h2>
          {outgoing.length === 0 ? <p className="mt-4 text-sm text-[#6d6a8f]">No pending outgoing invitations.</p> : <div className="mt-3 space-y-3">{outgoing.map((duel) => <Link key={duel.id} href={`/duels/${duel.id}`} className="block rounded-xl border border-line bg-white/[0.025] p-4 hover:bg-white/[0.05]"><p className="text-sm font-semibold text-white">{duel.opponent?.displayName ?? "Player"} <span className="font-normal text-[#8f8cb0]">(@{duel.opponent?.username ?? "unknown"})</span></p><p className="mt-1 text-xs text-[#6d6a8f]">Waiting for a response · expires {dateLabel(duel.invitationExpiresAt)}</p></Link>)}</div>}
        </div>
      </section>

      <section className="glass-card overflow-hidden">
        <div className="border-b border-line p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-white"><Trophy size={15} className="text-gold-400" /> Active & past duels</h2></div>
        {others.length === 0 ? <p className="p-6 text-sm text-[#8f8cb0]">Your accepted, completed, and cancelled duels will appear here.</p> : others.map((duel) => {
          const opponent = duel.challengerId === user.id ? duel.opponent : duel.challenger;
          const percent = Math.min(100, Math.round((duel.myRounds / duel.requiredRounds) * 100));
          const result = duel.status === "completed" ? duel.winnerId === null ? "Draw" : duel.winnerId === user.id ? "You won" : "Opponent won" : null;
          return <Link key={duel.id} href={`/duels/${duel.id}`} className="block border-b border-line/70 p-5 last:border-0 hover:bg-white/[0.02]">
            <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-semibold text-white">vs. {opponent?.displayName ?? "Player"} <span className="font-normal text-[#6d6a8f]">(@{opponent?.username ?? "unknown"})</span></p><p className="mt-1 text-[0.68rem] text-[#6d6a8f]">{statusName[duel.status] ?? duel.status}{duel.status === "active" ? ` · ends ${dateLabel(duel.endsAt)}` : ""}{result ? ` · ${result}` : ""}</p></div><span className="chip !text-xs">{duel.status}</span></div>
            {duel.status === "active" && <div className="mt-4 grid gap-4 sm:grid-cols-2"><div><div className="mb-1 flex justify-between text-xs"><span className="text-[#c7c4de]">You</span><span className="tnum text-white">{duel.myRounds}/{duel.requiredRounds} rounds</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-brand-400" style={{ width: `${percent}%` }} /></div><p className="mt-1 text-[0.65rem] text-[#6d6a8f]">{fmtMinutes(duel.myMinutes)} qualifying focus</p></div><div><div className="mb-1 flex justify-between text-xs"><span className="text-[#c7c4de]">Opponent</span><span className="tnum text-white">{duel.opponentRounds}/{duel.requiredRounds} rounds</span></div><div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-neon-400" style={{ width: `${Math.min(100, duel.opponentRounds / duel.requiredRounds * 100)}%` }} /></div><p className="mt-1 text-[0.65rem] text-[#6d6a8f]">{fmtMinutes(duel.opponentMinutes)} qualifying focus</p></div></div>}
            {duel.stake && <p className="mt-3 text-xs text-[#8f8cb0]">Friendly stake: “{duel.stake}”</p>}
          </Link>;
        })}
      </section>
      <p className="text-center text-[0.68rem] text-[#6d6a8f]">Rules are fixed: 10 qualifying rounds, at least 25 minutes each, any task, within seven days. Rounds count once per recorded session. Ties are broken by qualifying focus minutes, then remain a draw.</p>
    </div>
  );
}
