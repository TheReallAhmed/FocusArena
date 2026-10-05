import { Flame } from "lucide-react";
import { fmtMinutes } from "@/lib/dates";

type Cell = { day: string; minutes: number };

const LEVELS = [
  "bg-white/[0.045]",
  "bg-brand-500/30",
  "bg-brand-500/55",
  "bg-brand-500",
  "bg-neon-400 shadow-[0_0_10px_rgba(76,227,255,0.55)]",
];

function levelFor(min: number): number {
  if (min <= 0) return 0;
  if (min < 30) return 1;
  if (min < 75) return 2;
  if (min < 150) return 3;
  return 4;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * GitHub-style contribution squares for deep-work minutes.
 * Columns = weeks (Mon→Sun top to bottom).
 */
export function ContributionGrid({ data }: { data: Cell[] }) {
  if (data.length === 0) return null;

  // pad the start so the first column begins on a Monday
  const firstDow = (new Date(data[0].day + "T00:00:00Z").getUTCDay() + 6) % 7;
  const padded: (Cell | null)[] = [...Array<null>(firstDow).fill(null), ...data];

  const weeks: (Cell | null)[][] = [];
  for (let i = 0; i < padded.length; i += 7) weeks.push(padded.slice(i, i + 7));

  const total = data.reduce((a, c) => a + c.minutes, 0);
  const activeDays = data.filter((c) => c.minutes > 0).length;
  const best = data.reduce((a, c) => (c.minutes > a ? c.minutes : a), 0);

  // month labels above the columns
  const monthLabels = weeks.map((w, i) => {
    const first = w.find((c) => c !== null);
    if (!first) return null;
    const d = new Date(first.day + "T00:00:00Z");
    const prev = i > 0 ? weeks[i - 1].find((c) => c !== null) : null;
    const prevMonth = prev ? new Date(prev.day + "T00:00:00Z").getUTCMonth() : -1;
    return d.getUTCMonth() !== prevMonth ? MONTHS[d.getUTCMonth()] : null;
  });

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold text-white">
            <Flame size={16} className="text-brand-300" /> Focus contributions
          </h2>
          <p className="mt-1 text-xs text-[#8f8cb0]">
            <span className="tnum font-semibold text-white">{fmtMinutes(total)}</span> of deep work across{" "}
            <span className="tnum font-semibold text-white">{activeDays}</span> active days · last 26 weeks
          </p>
        </div>
        <div className="flex items-center gap-2 text-[0.65rem] font-medium text-[#6d6a8f]">
          Less
          {LEVELS.map((c, i) => (
            <span key={i} className={`h-3 w-3 rounded-[3px] border border-white/[0.06] ${c}`} />
          ))}
          More
        </div>
      </div>

      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin]">
        <div className="min-w-max">
          {/* month row */}
          <div className="mb-1 flex gap-[3px] pl-[26px]">
            {monthLabels.map((m, i) => (
              <span key={i} className="w-[13px] text-[0.58rem] font-semibold text-[#5c5a78]">
                {m ?? ""}
              </span>
            ))}
          </div>
          <div className="flex gap-[3px]">
            {/* weekday labels */}
            <div className="mr-1 flex w-[22px] flex-col gap-[3px]">
              {["Mon", "", "Wed", "", "Fri", "", "Sun"].map((d, i) => (
                <span key={i} className="h-[13px] text-[0.55rem] leading-[13px] text-[#5c5a78]">
                  {d}
                </span>
              ))}
            </div>
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week[di];
                  if (!cell) return <span key={di} className="h-[13px] w-[13px]" />;
                  const lvl = levelFor(cell.minutes);
                  return (
                    <span
                      key={di}
                      className={`h-[13px] w-[13px] rounded-[3px] border border-white/[0.05] transition-transform hover:scale-125 ${LEVELS[lvl]}`}
                      title={`${cell.day} — ${cell.minutes > 0 ? fmtMinutes(cell.minutes) : "no focus"}`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4 border-t border-line pt-4 text-xs">
        <span className="text-[#8f8cb0]">
          Best day <span className="tnum font-bold text-white">{best > 0 ? fmtMinutes(best) : "—"}</span>
        </span>
        <span className="text-[#8f8cb0]">
          Consistency{" "}
          <span className="tnum font-bold text-white">
            {Math.round((activeDays / data.length) * 100)}%
          </span>
        </span>
      </div>
    </div>
  );
}
