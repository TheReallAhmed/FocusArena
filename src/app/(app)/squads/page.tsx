import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, ChevronRight, Crown } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { getMySquads } from "@/server/queries";
import { EmptyState } from "@/components/widgets";
import { SquadForms } from "@/components/squad-forms";
import { fmtMinutes } from "@/lib/dates";

export const metadata: Metadata = { title: "Squads" };
export const dynamic = "force-dynamic";

export default async function SquadsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const squads = await getMySquads(user);

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-brand-300">Your Crew</p>
        <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Squad <span className="text-gradient">HQ</span>
        </h1>
        <p className="mt-1.5 text-sm text-[#8f8cb0]">
          Private boards for you and your friends. Create a squad, share the code, battle weekly.
        </p>
      </div>

      <SquadForms />

      {squads.length === 0 ? (
        <div className="glass-card">
          <EmptyState
            icon={Users}
            title="No squads yet"
            hint="Create one above and send the invite code to your friends."
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {squads.map((s) => (
            <Link key={s.id} href={`/squads/${s.id}`} className="glass-card glass-card-hover group p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 truncate text-base font-bold text-white">
                    {s.name}
                    {s.isOwner && <Crown size={14} className="shrink-0 text-gold-400" />}
                  </h2>
                  <p className="mt-1 font-mono text-xs tracking-[0.2em] text-[#6d6a8f]">{s.code}</p>
                </div>
                <ChevronRight size={17} className="mt-1 shrink-0 text-[#5c5a78] transition group-hover:translate-x-1 group-hover:text-white" />
              </div>
              <div className="mt-4 flex items-center gap-4 text-xs text-[#8f8cb0]">
                <span className="flex items-center gap-1.5">
                  <Users size={13} /> {s.memberCount} member{s.memberCount === 1 ? "" : "s"}
                </span>
                <span className="tnum font-semibold text-brand-300">{fmtMinutes(s.weekMinutes)} this week</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
