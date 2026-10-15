import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, Clock3, Swords, Trophy } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { fmtMinutes } from "@/lib/dates";
import { LiveRefresh } from "@/components/live-refresh";
import { CancelDuelButton, DuelCountdown, DuelInvitationActions } from "@/components/duel-controls";
import { getDuelForParticipant } from "@/server/duels";

export const metadata: Metadata = { title: "Duel details" };
export const dynamic = "force-dynamic";
const utc = (date: Date | null) => date ? `${date.toLocaleString("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC` : "—";

export default async function DuelDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const id = Number((await params).id);
  const duel = await getDuelForParticipant(id);
  if (!duel) notFound();
  const challengerName = duel.challengerId === user.id ? user.displayName : duel.opponent?.displayName ?? "Player";
  const opponentName = duel.opponentId === user.id ? user.displayName : duel.opponent?.displayName ?? "Player";
  const active = duel.status === "active";
  const percentA = Math.min(100, duel.challengerProgress.rounds / duel.requiredRounds * 100);
  const percentB = Math.min(100, duel.opponentProgress.rounds / duel.requiredRounds * 100);
  const winnerText = duel.status !== "completed" ? "" : duel.winnerId === null ? "The duel ended in a draw." : duel.winnerId === user.id ? "You won this duel." : "Your opponent won this duel.";

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link href="/duels" className="inline-flex items-center gap-2 text-xs text-[#8f8cb0] hover:text-white"><ArrowLeft size={14} /> All duels</Link>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Duel #{duel.id} · {duel.status}</p><h1 className="mt-1.5 flex items-center gap-3 text-2xl font-bold text-white sm:text-3xl"><Swords className="text-brand-300" /> {challengerName} <span className="text-gradient">vs.</span> {opponentName}</h1><p className="mt-1.5 text-sm text-[#8f8cb0]">{active && <LiveRefresh intervalMs={30000} label="Refresh" />}</p></div>
        {(active || (duel.status === "pending" && duel.challengerId === user.id)) && <CancelDuelButton duelId={duel.id} />}
      </header>

      <section className="glass-card p-5 sm:p-6">
        <h2 className="text-sm font-bold text-white">Challenge rules — review before accepting</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            ["Duration", "Exactly seven days, starting when the opponent accepts."],
            ["Goal", `${duel.requiredRounds} qualifying focus rounds per player.`],
            ["Qualifying round", `A completed, server-timed focus round of at least ${duel.minimumFocusMinutes} minutes. It counts once.`],
            ["Eligible work", "Any task or free-focus round; both players use the same rule."],
            ["Winner", "Most qualifying rounds; if tied, most qualifying focus minutes; otherwise a draw."],
            ["Invitation", `Expires ${utc(duel.invitationExpiresAt)} if not accepted.`],
          ].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-white/[0.025] p-3"><p className="text-[0.65rem] font-bold uppercase tracking-wider text-brand-300">{label}</p><p className="mt-1 text-xs leading-relaxed text-[#c7c4de]">{value}</p></div>)}
        </div>
        {duel.stake && <p className="mt-4 rounded-xl border border-gold-400/20 bg-gold-400/5 p-3 text-xs text-[#c7c4de]">Optional friendly stake: “{duel.stake}” — informal only; it never changes scoring and no payment is involved.</p>}
        <p className="mt-4 text-[0.68rem] text-[#6d6a8f]">Sessions count only once they have a server-recorded run, valid focus duration, and start/completion within the challenge window. The app records activity, not genuine human attention.</p>
        {duel.status === "pending" && duel.opponentId === user.id && <div className="mt-5 border-t border-line pt-4"><DuelInvitationActions duelId={duel.id} /></div>}
      </section>

      {active && duel.startsAt && duel.endsAt && (
        <section className="glass-card p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-white">Progress comparison</h2><p className="mt-1 text-xs text-[#6d6a8f]">Started {utc(duel.startsAt)} · deadline {utc(duel.endsAt)}</p></div><span className="chip !text-xs"><CalendarClock size={12} /> 7-day challenge</span></div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {[
              { name: challengerName, score: duel.challengerProgress, daily: duel.challengerToday, percent: percentA, hue: "bg-brand-400" },
              { name: opponentName, score: duel.opponentProgress, daily: duel.opponentToday, percent: percentB, hue: "bg-neon-400" },
            ].map((player) => <div key={player.name} className="rounded-2xl border border-line bg-white/[0.02] p-4">
              <div className="flex items-center justify-between gap-2"><p className="truncate text-sm font-bold text-white">{player.name}</p><span className="tnum text-sm text-white">{player.score.rounds}/{duel.requiredRounds} rounds</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className={`h-full rounded-full ${player.hue}`} style={{ width: `${player.percent}%` }} /></div>
              <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs text-[#8f8cb0]"><span>{fmtMinutes(player.score.minutes)} total qualifying focus</span><span>{player.daily.rounds} rounds today (UTC) · {fmtMinutes(player.daily.minutes)}</span></div>
            </div>)}
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-xs text-[#8f8cb0]"><span className="flex items-center gap-2"><Clock3 size={14} className="text-brand-300" /> <DuelCountdown endsAt={duel.endsAt.toISOString()} /></span><span>Progress refreshes automatically every 30 seconds while this page is open.</span></div>
        </section>
      )}

      {duel.status === "completed" && <section className="glass-card p-6 text-center"><Trophy size={27} className="mx-auto text-gold-400" /><h2 className="mt-3 text-lg font-bold text-white">{winnerText}</h2><p className="mt-1 text-sm text-[#8f8cb0]">Final score: {duel.challengerProgress.rounds}–{duel.opponentProgress.rounds} rounds · {fmtMinutes(duel.challengerProgress.minutes)}–{fmtMinutes(duel.opponentProgress.minutes)}.</p></section>}
      {duel.status === "declined" && <section className="glass-card p-5 text-sm text-[#8f8cb0]">This invitation was declined.</section>}
      {duel.status === "cancelled" && <section className="glass-card p-5 text-sm text-[#8f8cb0]">This duel was cancelled. Its sessions do not count toward a result.</section>}
      {duel.status === "expired" && <section className="glass-card p-5 text-sm text-[#8f8cb0]">The invitation expired before it was accepted.</section>}

      <section className="glass-card overflow-hidden">
        <div className="border-b border-line p-5"><h2 className="flex items-center gap-2 text-sm font-bold text-white"><CheckCircle2 size={15} className="text-mint-400" /> Recent qualifying rounds</h2><p className="mt-1 text-xs text-[#6d6a8f]">Only one server-recorded round per completed Pomodoro focus run.</p></div>
        {duel.recentSessions.length === 0 ? <p className="p-5 text-sm text-[#6d6a8f]">No qualifying rounds recorded yet.</p> : duel.recentSessions.map((session) => <div key={session.id} className="flex flex-wrap justify-between gap-2 border-b border-line/70 px-5 py-3 last:border-0"><div><p className="text-sm font-semibold text-white">{session.userId === duel.challengerId ? challengerName : opponentName} · {fmtMinutes(session.minutes)}</p><p className="text-[0.68rem] text-[#6d6a8f]">Completed {utc(session.completedAt ? new Date(session.completedAt) : null)}</p></div><span className="chip !text-xs">{session.focusQuality}% self-reported quality</span></div>)}
      </section>
    </div>
  );
}
