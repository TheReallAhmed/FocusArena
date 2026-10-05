import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Flame, Trophy, Medal, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getLeaderboard } from "@/server/queries";
import { Avatar, AdminChip, LevelChip } from "@/components/widgets";
import { levelFromXp } from "@/lib/xp";
import { fmtMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Leaderboard" };
export const dynamic = "force-dynamic";

const PODIUM_HUE = ["#fbbf24", "#c7c4de", "#e08a4c"];
type Tab = "week" | "all" | "streak";

const TABS: { key: Tab; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "all", label: "All time" },
  { key: "streak", label: "Streaks" },
];

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const tab: Tab = params.tab === "all" || params.tab === "streak" ? params.tab : "week";
  const rows = await getLeaderboard(tab);
  const allTime = tab === "week" ? await getLeaderboard("all") : rows;
  const levelMap = new Map(allTime.map((r) => [r.id, levelFromXp(r.minutes)]));

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);
  const myRank = rows.findIndex((r) => r.id === user.id);

  const metric = (r: (typeof rows)[number]) =>
    tab === "streak" ? `${r.streak}d` : fmtMinutes(Number(r.minutes));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">The Arena</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Leader<span className="text-gradient">board</span>
          </h1>
        </div>
        <div className="flex gap-1.5 rounded-full border border-line bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "week" ? "/leaderboard" : `/leaderboard?tab=${t.key}`}
              className={`tab-pill ${tab === t.key ? "tab-pill-active" : ""}`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      {myRank >= 0 && (
        <div className="glass-card flex items-center gap-3 border-brand-500/35 p-4">
          <Sparkles size={16} className="shrink-0 text-brand-300" />
          <p className="text-sm text-[#c7c4de]">
            You are <span className="tnum font-bold text-white">#{myRank + 1}</span>{" "}
            {tab === "week" ? "this week" : tab === "all" ? "of all time" : "on the streak board"}
            {myRank === 0 ? " — defend the throne." : myRank === 1 ? " — one spot from glory." : " — keep climbing."}
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy size={28} className="mx-auto text-[#4a4866]" />
          <p className="mt-3 text-sm text-[#8f8cb0]">The board is empty. Be the first to log a session.</p>
        </div>
      ) : (
        <>
          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-4">
            {[top3[1], top3[0], top3[2]].map((r, slot) => {
              if (!r) return <div key={`podium-empty-${slot}`} />;
              const rank = rows.findIndex((x) => x.id === r.id) + 1;
              const isFirst = rank === 1;
              return (
                <Link
                  key={r.id}
                  href={`/u/${r.username}`}
                  className={`glass-card glass-card-hover relative flex flex-col items-center gap-2 p-4 pt-6 text-center sm:p-5 ${
                    isFirst ? "border-gold-400/40 shadow-[0_0_50px_-12px_rgba(251,191,36,0.35)]" : ""
                  } ${r.id === user.id ? "!border-brand-500/50" : ""}`}
                >
                  {isFirst && (
                    <span className="absolute -top-3.5 flex h-7 w-7 items-center justify-center rounded-full bg-gold-400 text-ink-950 shadow-[0_0_20px_rgba(251,191,36,0.6)]">
                      <Crown size={14} strokeWidth={2.5} />
                    </span>
                  )}
                  <span className="relative">
                    <Avatar name={r.displayName} hue={r.avatarHue} size={isFirst ? 62 : 50} />
                    <span
                      className="tnum absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-950 text-[0.68rem] font-black text-ink-950"
                      style={{ background: PODIUM_HUE[rank - 1] }}
                    >
                      {rank}
                    </span>
                  </span>
                  <div className="mt-1 min-w-0 max-w-full">
                    <p className="flex items-center justify-center gap-1.5 truncate text-sm font-bold text-white">
                      {r.displayName}
                      {r.role === "admin" && <AdminChip small />}
                    </p>
                    <p className="text-[0.68rem] text-[#6d6a8f]">
                      @{r.username} {r.id === user.id && <span className="text-brand-300">(you)</span>}
                    </p>
                  </div>
                  <p className="tnum text-lg font-bold text-white sm:text-xl">{metric(r)}</p>
                  <div className="flex flex-wrap items-center justify-center gap-1.5">
                    <LevelChip level={levelMap.get(r.id) ?? 1} small />
                    {r.streak > 0 && (
                      <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-gold-400">
                        <Flame size={10} /> {r.streak}
                      </span>
                    )}
                    <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-[#a5a2c8]">
                      <Medal size={10} /> {r.badges}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Rest */}
          <div className="glass-card divide-y divide-line overflow-hidden">
            {rest.length === 0 && (
              <p className="p-5 text-center text-xs text-[#6d6a8f]">
                Only {rows.length} contender{rows.length === 1 ? "" : "s"} so far — invite your crew to fill the board.
              </p>
            )}
            {rest.map((r, i) => (
              <Link
                key={r.id}
                href={`/u/${r.username}`}
                className={`flex items-center gap-3.5 px-4 py-3.5 transition sm:px-5 ${
                  r.id === user.id ? "bg-brand-500/8" : "hover:bg-white/[0.02]"
                }`}
              >
                <span className="tnum w-7 shrink-0 text-center text-sm font-bold text-[#6d6a8f]">{i + 4}</span>
                <Avatar name={r.displayName} hue={r.avatarHue} imageUrl={r.avatarUrl} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    {r.displayName}
                    {r.role === "admin" && <AdminChip small />}
                    {r.id === user.id && <span className="text-xs font-bold text-brand-300">(you)</span>}
                  </p>
                  <p className="text-[0.68rem] text-[#6d6a8f]">@{r.username}</p>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <LevelChip level={levelMap.get(r.id) ?? 1} small />
                  {r.streak > 0 && (
                    <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-gold-400">
                      <Flame size={10} /> {r.streak}
                    </span>
                  )}
                  <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-[#a5a2c8]">
                    <Medal size={10} /> {r.badges}
                  </span>
                </div>
                <span className="tnum w-16 shrink-0 text-right text-sm font-bold text-white">{metric(r)}</span>
              </Link>
            ))}
          </div>

          <p className="flex items-center justify-center gap-2 text-xs text-[#5c5a78]">
            <Medal size={13} /> Weekly resets every Monday · Streaks board ranks longest active streaks.
          </p>
        </>
      )}
    </div>
  );
}
