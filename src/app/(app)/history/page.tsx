import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ScrollText, FolderGit2, UsersRound, Sigma, Clock3, Download, FileSpreadsheet } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getSessionHistory, getRecentProjects } from "@/server/queries";
import { fmtMinutes, timeAgo } from "@/lib/dates";
import { EmptyState } from "@/components/widgets";

export const metadata: Metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const filter = params.project?.trim().slice(0, 40) || null;
  const [rows, projects] = await Promise.all([
    getSessionHistory(user, filter, 45),
    getRecentProjects(user, 10),
  ]);

  const totalMin = rows.reduce((a, r) => a + r.minutes, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Deep Work Ledger</p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Session <span className="text-gradient">history</span>
          </h1>
          <p className="mt-1.5 text-sm text-[#8f8cb0]">
            Every banked minute — filter it, audit it, export it.
          </p>
        </div>
        <a href={`/api/export?format=csv${filter ? "" : ""}`} className="btn btn-ghost !py-2.5">
          <FileSpreadsheet size={15} /> Export CSV
        </a>
      </div>

      {/* project filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-[#6d6a8f]">
          <FolderGit2 size={12} /> Filter
        </span>
        <Link href="/history" className={`tab-pill !px-3 !py-1.5 !text-[0.72rem] ${!filter ? "tab-pill-active" : ""}`}>
          All sessions
        </Link>
        {projects.map((p) => (
          <Link
            key={p}
            href={`/history?project=${encodeURIComponent(p)}`}
            className={`tab-pill !px-3 !py-1.5 !text-[0.72rem] font-mono ${filter === p ? "tab-pill-active" : ""}`}
          >
            {p}
          </Link>
        ))}
      </div>

      {/* summary strip */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="glass-card flex items-center gap-3.5 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/14 text-brand-300">
            <Clock3 size={16} />
          </span>
          <div>
            <p className="tnum text-lg font-bold leading-none text-white">{fmtMinutes(totalMin)}</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">
              {filter ? `on ${filter}` : "last 45 sessions"}
            </p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3.5 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-500/12 text-neon-300">
            <Sigma size={16} />
          </span>
          <div>
            <p className="tnum text-lg font-bold leading-none text-white">{rows.length}</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">sessions shown</p>
          </div>
        </div>
        <div className="glass-card flex items-center gap-3.5 p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-mint-400/12 text-mint-400">
            <Download size={16} />
          </span>
          <div>
            <p className="tnum text-lg font-bold leading-none text-white">CSV / JSON</p>
            <p className="mt-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-[#6d6a8f]">your data, portable</p>
          </div>
        </div>
      </div>

      {/* ledger table */}
      <div className="glass-card overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState icon={ScrollText} title={filter ? `No sessions tagged “${filter}” yet` : "No sessions yet"} hint="Start a round on the Focus page and it lands here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#5c5a78]">
                  <th className="px-5 py-3.5">When</th>
                  <th className="px-3 py-3.5">Project</th>
                  <th className="px-3 py-3.5">Task</th>
                  <th className="hidden px-3 py-3.5 md:table-cell">Note</th>
                  <th className="px-5 py-3.5 text-right">Minutes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((r) => (
                  <tr key={r.id} className="transition hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <span className="block font-medium text-white">{timeAgo(r.startedAt)}</span>
                      <span className="tnum block text-[0.63rem] text-[#6d6a8f]">
                        {new Date(r.startedAt).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}
                        {" · "}
                        {new Date(r.startedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", timeZone: "UTC" })}
                      </span>
                    </td>
                    <td className="max-w-36 truncate px-3 py-3">
                      {r.project ? (
                        <Link href={`/history?project=${encodeURIComponent(r.project)}`} className="chip font-mono !px-2 !py-0.5 !text-[0.66rem] !text-neon-300 hover:!border-neon-400/50">
                          {r.project}
                        </Link>
                      ) : (
                        <span className="text-[0.7rem] text-[#4a4866]">—</span>
                      )}
                    </td>
                    <td className="max-w-44 truncate px-3 py-3 text-[#c7c4de]">
                      <span className="flex items-center gap-1.5">
                        {r.roomId && <UsersRound size={11} className="shrink-0 text-neon-400" />}
                        <span className="truncate">{r.task ?? (r.roomId ? "Group room" : "Free focus")}</span>
                      </span>
                    </td>
                    <td className="hidden max-w-52 truncate px-3 py-3 text-[0.78rem] text-[#8f8cb0] md:table-cell">
                      {r.note ?? <span className="text-[#4a4866]">—</span>}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className="tnum rounded-md bg-brand-500/12 px-2 py-1 text-xs font-bold text-brand-300">
                        +{r.minutes}m
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-center text-[0.65rem] text-[#5c5a78]">
        Showing the latest {rows.length} sessions · full archive lives in the export file.
      </p>
    </div>
  );
}
