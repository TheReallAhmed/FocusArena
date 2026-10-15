"use client";

import { FolderGit2 } from "lucide-react";
import { fmtMinutes } from "@/lib/dates";
import { useLocale } from "@/components/locale-provider";

const HUES = [255, 190, 150, 45, 320, 15, 210, 100];

/** Where the hours actually went — per project tag. */
export function ProjectBreakdown({
  projects,
}: {
  projects: { name: string; minutes: number; sessions: number }[];
}) {
  const { locale } = useLocale();
  const total = projects.reduce((a, p) => a + p.minutes, 0) || 1;

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 text-base font-bold text-white">
          <FolderGit2 size={16} className="text-neon-400" /> {locale === "ar" ? "توزيع المشاريع" : "Project breakdown"}
        </h2>
        <span className="tnum text-xs text-[#8f8cb0]">
          {locale === "ar" ? `${projects.length} مشروع` : `${projects.length} project${projects.length === 1 ? "" : "s"}`} · {fmtMinutes(total, locale)}
        </span>
      </div>

      {/* stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-white/[0.05]">
        {projects.map((p, i) => (
          <span
            key={p.name}
            className="h-full transition-all"
            style={{
              width: `${(p.minutes / total) * 100}%`,
              background: `linear-gradient(90deg, hsl(${HUES[i % HUES.length]} 85% 62%), hsl(${HUES[i % HUES.length]} 85% 48%))`,
            }}
            title={`${p.name} — ${fmtMinutes(p.minutes, locale)}`}
          />
        ))}
      </div>

      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {projects.map((p, i) => (
          <li
            key={p.name}
            className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5"
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: `hsl(${HUES[i % HUES.length]} 85% 62%)` }}
            />
            <span className="min-w-0 flex-1 truncate font-mono text-sm text-[#e7e5f7]">{p.name}</span>
            <span className="tnum shrink-0 text-xs text-[#8f8cb0]">{p.sessions}×</span>
            <span className="tnum w-16 shrink-0 text-right text-sm font-bold text-white">
              {fmtMinutes(p.minutes, locale)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
