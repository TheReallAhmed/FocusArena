import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UsersRound, ChevronRight, Crown, Radio, CircleCheck, Hourglass } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getMyRooms } from "@/server/queries";
import { EmptyState } from "@/components/widgets";
import { RoomForms } from "@/components/room-forms";

export const metadata: Metadata = { title: "Focus Rooms" };
export const dynamic = "force-dynamic";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  lobby: { label: "Lobby", cls: "border-white/20 bg-white/5 text-[#c7c4de]" },
  focus: { label: "Live · Focus", cls: "border-brand-500/50 bg-brand-500/15 text-brand-300" },
  break: { label: "Live · Break", cls: "border-mint-400/50 bg-mint-400/12 text-mint-400" },
  done: { label: "Finished", cls: "border-white/10 bg-white/[0.03] text-[#6d6a8f]" },
};

export default async function RoomsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const myRooms = await getMyRooms(user);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Collective Flow</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Focus <span className="text-gradient">Rooms</span>
        </h1>
        <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[#8f8cb0]">
          Synchronized group Pomodoro. One shared clock — when the round ends,{" "}
          <b className="text-white">everyone in the room banks the XP together</b>. No excuses, no ghosting.
        </p>
      </div>

      <RoomForms />

      {myRooms.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={UsersRound}
            title="No rooms yet"
            hint="Create a room above and share the code or link with your friends."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {myRooms.map((r) => {
            const st = STATUS_META[r.status] ?? STATUS_META.done;
            return (
              <Link key={r.id} href={`/rooms/${r.code}`} className="glass-card glass-card-hover group p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="flex items-center gap-2 truncate text-base font-bold text-white">
                      {r.name}
                      {r.hostId === user.id && <Crown size={14} className="shrink-0 text-gold-400" />}
                    </h2>
                    <p className="mt-1 text-xs text-[#6d6a8f]">
                      hosted by {r.hostName} · <span className="font-mono tracking-[0.2em]">{r.code}</span>
                    </p>
                  </div>
                  <ChevronRight size={17} className="mt-1 shrink-0 text-[#5c5a78] transition group-hover:translate-x-1 group-hover:text-white" />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2.5 text-xs">
                  <span className={`chip !text-[0.68rem] !font-bold ${st.cls}`}>
                    {r.status === "focus" && <Radio size={11} className="animate-pulse" />}
                    {r.status === "done" && <CircleCheck size={11} />}
                    {r.status === "lobby" && <Hourglass size={11} />}
                    {st.label}
                  </span>
                  <span className="chip !text-[0.68rem]">
                    <UsersRound size={11} /> {r.memberCount}
                  </span>
                  <span className="tnum text-[#8f8cb0]">
                    {r.totalRounds}×{r.focusMinutes}m + {r.breakMinutes}m breaks
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
