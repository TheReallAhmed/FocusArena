"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { DoorOpen } from "lucide-react";
import { leaveSquadAction } from "@/server/actions";

export function LeaveSquadButton({ squadId }: { squadId: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        start(async () => {
          await leaveSquadAction(squadId);
          router.push("/squads");
        });
      }}
      className="btn btn-ghost !px-3.5 !py-2 text-xs hover:!text-rose-300"
      title="Leave squad"
    >
      <DoorOpen size={14} />
      {pending ? "Leaving..." : "Leave"}
    </button>
  );
}
