import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Activity, Clock3, Hourglass, Smartphone, Target } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { fmtMinutes } from "@/lib/dates";
import { getDistractionAnalytics } from "@/server/distraction-analytics";

export const metadata: Metadata = { title: "Distraction insights" };
export const dynamic = "force-dynamic";

const SOURCE_LABELS: Record<string, string> = {
  phone: "Phone",
  interruption: "Person / social interruption",
  thought: "Random thought",
  noise: "Environment / noise",
  other: "Other",
};
const hourLabel = (hour: number) => `${String(hour).padStart(2, "0")}:00`;

export default async function DistractionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const data = await getDistractionAnalytics(user.id);
  const maxHour = Math.max(1, ...data.hourCounts.map((item) => item.total));
  const maxTrend = Math.max(1, ...data.trend.map((item) => item.total));
  const recentDays = data.trend.slice(-14);

  return (
    <div className="space-y-5">
      <header>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Focus insights</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Distraction <span className="text-gradient">analytics</span></h1>
        <p className="mt-1.5 text-sm text-[#8f8cb0]">Patterns from distractions you logged during completed focus rounds.</p>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Recorded distractions", value: String(data.total), icon: Smartphone },
          { label: "Per hour of focus", value: data.perHour.toFixed(1), icon: Activity },
          { label: "Leading source", value: data.sourceCounts[0] ? SOURCE_LABELS[data.sourceCounts[0].source] ?? data.sourceCounts[0].source : "—", icon: Smartphone },
          { label: "Most distracting hour (UTC)", value: data.busiestHour ? hourLabel(data.busiestHour.hour) : "—", icon: Clock3 },
          { label: "Valid focus time", value: fmtMinutes(data.focusMinutes), icon: Hourglass },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4">
            <div className="flex items-center justify-between text-[#8f8cb0]"><span className="text-xs">{item.label}</span><item.icon size={16} className="text-brand-300" /></div>
            <p className="tnum mt-2 text-2xl font-bold text-white">{item.value}</p>
          </div>
        ))}
      </section>

      {data.total === 0 ? (
        <section className="glass-card p-8 text-center sm:p-12">
          <Target size={28} className="mx-auto text-brand-300" />
          <h2 className="mt-3 text-base font-bold text-white">No completed focus rounds with distraction logs yet</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[#8f8cb0]">During a focus round, use “I Got Distracted” to note what interrupted you. Your timer keeps running; the event appears here once that round is completed.</p>
        </section>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-white">Sources</h2>
            <p className="mt-1 text-xs text-[#6d6a8f]">Share of your {data.total} recorded events</p>
            <div className="mt-4 space-y-4">
              {data.sourceCounts.map((item) => (
                <div key={item.source}>
                  <div className="mb-1.5 flex justify-between gap-3 text-xs"><span className="text-[#c7c4de]">{SOURCE_LABELS[item.source] ?? item.source}</span><span className="tnum text-[#8f8cb0]">{item.total} · {item.percent}%</span></div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]"><div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-neon-400" style={{ width: `${item.percent}%` }} /></div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-white">When interruptions happen</h2>
            <p className="mt-1 text-xs text-[#6d6a8f]">Events are grouped by UTC hour for consistent comparisons.</p>
            <div className="mt-5 grid h-36 grid-cols-12 items-end gap-1 sm:grid-cols-24">
              {Array.from({ length: 24 }, (_, hour) => {
                const total = data.hourCounts.find((item) => item.hour === hour)?.total ?? 0;
                return <div key={hour} title={`${hourLabel(hour)} UTC · ${total}`} className="flex h-full flex-col justify-end"><div className="min-h-0 rounded-t-sm bg-brand-400/85" style={{ height: `${total ? Math.max(5, (total / maxHour) * 100) : 0}%` }} /></div>;
              })}
            </div>
            <div className="mt-2 flex justify-between text-[0.62rem] text-[#6d6a8f]"><span>00:00 UTC</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>
          </section>

          <section className="glass-card p-5">
            <h2 className="text-sm font-bold text-white">Last 30 days</h2>
            <p className="mt-1 text-xs text-[#6d6a8f]">Daily event counts by UTC calendar day</p>
            {recentDays.length === 0 ? <p className="mt-5 text-sm text-[#8f8cb0]">No recent events.</p> : (
              <div className="mt-5 flex h-36 items-end gap-1.5">
                {recentDays.map((item) => <div key={item.day} title={`${item.day} · ${item.total}`} className="flex h-full min-w-0 flex-1 flex-col justify-end"><div className="rounded-t bg-neon-400/80" style={{ height: `${Math.max(3, (item.total / maxTrend) * 100)}%` }} /><span className="mt-1 truncate text-center text-[0.55rem] text-[#6d6a8f]">{item.day.slice(8)}</span></div>)}
              </div>
            )}
          </section>

          <section className="glass-card overflow-hidden">
            <div className="border-b border-line p-5"><h2 className="text-sm font-bold text-white">Recent focus rounds</h2><p className="mt-1 text-xs text-[#6d6a8f]">Focus quality v1 is an interruption-count proxy, not a measure of attention or interruption duration.</p></div>
            {data.sessions.length === 0 ? <p className="p-5 text-sm text-[#8f8cb0]">No eligible sessions.</p> : data.sessions.map((session) => (
              <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-5 py-3 last:border-0">
                <div><p className="text-sm font-semibold text-white">{fmtMinutes(session.minutes)} focus</p><p className="text-[0.68rem] text-[#6d6a8f]">{new Date(session.startedAt).toLocaleString("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC · {session.distractions} logged</p></div>
                <span className="chip !text-xs">{session.quality}% quality</span>
              </div>
            ))}
          </section>
        </div>
      )}
      {data.total === 0 && data.sessions.length > 0 && (
        <section className="glass-card overflow-hidden">
          <div className="border-b border-line p-5"><h2 className="text-sm font-bold text-white">Completed tracked focus rounds</h2><p className="mt-1 text-xs text-[#6d6a8f]">These rounds currently have no logged distraction events; a zero event count does not verify attention.</p></div>
          {data.sessions.map((session) => <div key={session.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line/70 px-5 py-3 last:border-0"><div><p className="text-sm font-semibold text-white">{fmtMinutes(session.minutes)} focus · 0 logged</p><p className="text-[0.68rem] text-[#6d6a8f]">{new Date(session.startedAt).toLocaleString("en", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" })} UTC</p></div><span className="chip !text-xs">{session.quality}% self-reported quality</span></div>)}
        </section>
      )}
      <p className="text-center text-[0.68rem] text-[#6d6a8f]">Self-reported pattern data only. Distractions are not verified and no interruption duration is inferred. Rates use valid, recorded focus minutes; zero-duration sessions are excluded.</p>
    </div>
  );
}
