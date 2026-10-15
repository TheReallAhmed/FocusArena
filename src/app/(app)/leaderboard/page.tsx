import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Flame, Trophy, Medal, Sparkles } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getFocusQualityLeaderboard, getLeaderboard } from "@/server/queries";
import { Avatar, AdminChip, LevelChip, PerkTitleBadge, StyledDisplayName } from "@/components/widgets";
import { BadgeRail } from "@/components/badge-rail";
import { LiveRefresh } from "@/components/live-refresh";
import { levelFromXp, BADGES, badgeScore } from "@/lib/xp";
import { fmtMinutes } from "@/lib/dates";
import { normalizeLocale, t } from "@/lib/i18n";

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
  const locale = normalizeLocale(user.locale);
  const text = (key: string) => t(locale, key);

  const params = await searchParams;
  const tab: Tab = params.tab === "all" || params.tab === "streak" ? params.tab : "week";
  const rows = await getLeaderboard(tab);
  const qualityRows = await getFocusQualityLeaderboard();
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
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">{locale === "ar" ? "الساحة" : "The Arena"}</p>
          <h1 className="mt-1.5 flex flex-wrap items-center gap-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            {text("leaderboard.title")}
            <LiveRefresh intervalMs={15000} label={text("leaderboard.live")} />
          </h1>
          <p className="mt-1.5 text-xs text-[#6d6a8f]">{locale === "ar" ? "يُحدّث الترتيب تلقائيًا دون إعادة تحميل." : "Ranks refresh automatically — no reload needed."}</p>
        </div>
        <div className="flex gap-1.5 rounded-full border border-line bg-white/[0.03] p-1">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={t.key === "week" ? "/leaderboard" : `/leaderboard?tab=${t.key}`}
              className={`tab-pill ${tab === t.key ? "tab-pill-active" : ""}`}
            >
              {text(`leaderboard.${t.key}`)}
            </Link>
          ))}
        </div>
      </div>

      {myRank >= 0 && (
        <div className="glass-card flex items-center gap-3 border-brand-500/35 p-4">
          <Sparkles size={16} className="shrink-0 text-brand-300" />
          <p className="text-sm text-[#c7c4de]">
            {locale === "ar" ? "ترتيبك" : "You are"} <span className="tnum font-bold text-white">#{myRank + 1}</span>{" "}
            {tab === "week" ? "this week" : tab === "all" ? "of all time" : "on the streak board"}
            {myRank === 0 ? " — defend the throne." : myRank === 1 ? " — one spot from glory." : " — keep climbing."}
          </p>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Trophy size={28} className="mx-auto text-[#4a4866]" />
          <p className="mt-3 text-sm text-[#8f8cb0]">{text("leaderboard.empty")}</p>
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
                    <Avatar name={r.displayName} hue={r.avatarHue} frameKey={r.equippedFrame} size={isFirst ? 62 : 50} />
                    <span
                      className="tnum absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-950 text-[0.68rem] font-black text-ink-950"
                      style={{ background: PODIUM_HUE[rank - 1] }}
                    >
                      {rank}
                    </span>
                  </span>
                  <div className="mt-1 min-w-0 max-w-full">
                    <p className="flex items-center justify-center gap-1.5 truncate text-sm font-bold text-white">
                      <StyledDisplayName name={r.displayName} colorKey={r.equippedColor} iconKey={r.equippedIcon} logoKey={r.equippedLogo} />
                      {r.role === "admin" && <AdminChip small />}
                      {r.accountabilityActive && <span title="Temporary, self-reported indicator — expires within 24 hours" className="chip !border-rose-400/30 !bg-rose-400/8 !px-1.5 !py-0 !text-[0.55rem] !text-rose-300">24h accountability</span>}
                    </p>
                    <PerkTitleBadge rewardKey={r.equippedTitle} />
                    <p className="text-[0.68rem] text-[#6d6a8f]">
                      @{r.username} {r.id === user.id && <span className="text-brand-300">{text("leaderboard.you")}</span>}
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
                  </div>
                  <div className="mt-1 flex flex-wrap items-center justify-center gap-1.5">
                    <BadgeRail keys={r.badgeKeys} total={r.badges} max={isFirst ? 3 : 2} size={isFirst ? 22 : 19} />
                  </div>
                  <span className="tnum text-[0.6rem] font-semibold text-[#6d6a8f]">
                    {r.badges}/{BADGES.length} badges · {badgeScore(r.badgeKeys)} pts
                  </span>
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
                <Avatar name={r.displayName} hue={r.avatarHue} imageUrl={r.avatarUrl} frameKey={r.equippedFrame} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                    <StyledDisplayName name={r.displayName} colorKey={r.equippedColor} iconKey={r.equippedIcon} logoKey={r.equippedLogo} />
                    {r.role === "admin" && <AdminChip small />}
                    {r.accountabilityActive && <span title="Temporary, self-reported indicator — expires within 24 hours" className="chip !border-rose-400/30 !bg-rose-400/8 !px-1.5 !py-0 !text-[0.55rem] !text-rose-300">24h</span>}
                    {r.id === user.id && <span className="text-xs font-bold text-brand-300">{text("leaderboard.you")}</span>}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5"><span className="text-[0.68rem] text-[#6d6a8f]">@{r.username}</span><PerkTitleBadge rewardKey={r.equippedTitle} /></div>
                </div>
                <div className="hidden items-center gap-1.5 sm:flex">
                  <LevelChip level={levelMap.get(r.id) ?? 1} small />
                  {r.streak > 0 && (
                    <span className="chip !px-1.5 !py-0 !text-[0.62rem] !font-bold text-gold-400">
                      <Flame size={10} /> {r.streak}
                    </span>
                  )}
                </div>
                <div className="hidden max-w-[22rem] items-center justify-end md:flex">
                  <BadgeRail keys={r.badgeKeys} total={r.badges} max={2} size={19} />
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

      <section className="glass-card overflow-hidden">
        <div className="border-b border-line p-5">
          <h2 className="text-sm font-bold text-white">Focus quality · separate metric</h2>
          <p className="mt-1 text-xs text-[#6d6a8f]">Average self-reported quality across at least 5 completed, tracked focus rounds. This does not alter the XP/time rankings above.</p>
        </div>
        {qualityRows.length === 0 ? <p className="p-5 text-xs text-[#8f8cb0]">No player has 5 scored focus rounds yet.</p> : qualityRows.map((row, index) => (
          <Link key={row.id} href={`/u/${row.username}`} className="flex items-center gap-3 border-b border-line/70 px-5 py-3 last:border-0 hover:bg-white/[0.02]">
            <span className="tnum w-6 text-center text-xs font-bold text-[#6d6a8f]">{index + 1}</span>
            <Avatar name={row.displayName} hue={row.avatarHue} size={32} />
            <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{row.displayName} <span className="text-xs font-normal text-[#6d6a8f]">@{row.username}</span></span>
            <span className="tnum text-sm font-bold text-mint-400">{row.averageQuality}%</span>
            <span className="text-[0.65rem] text-[#6d6a8f]">{row.scoredRounds} rounds</span>
          </Link>
        ))}
        <p className="px-5 py-3 text-[0.65rem] text-[#6d6a8f]">Quality formula v1: 100 − 12.5 points per user-logged distraction, rounded and clamped to 0–100. It cannot verify attention or unreported distractions.</p>
      </section>
    </div>
  );
}
