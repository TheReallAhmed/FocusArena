"use client";

import { useActionState } from "react";
import { AlertCircle, Users, LogIn, LoaderCircle } from "lucide-react";
import { createSquadAction, joinSquadAction, type FormState } from "@/server/actions";

export function SquadForms() {
  const [createState, createAction, createPending] = useActionState<FormState, FormData>(createSquadAction, {});
  const [joinState, joinAction, joinPending] = useActionState<FormState, FormData>(joinSquadAction, {});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <form action={createAction} className="glass-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <Users size={15} className="text-brand-300" /> Create a squad
        </h2>
        <p className="mt-1 text-xs text-[#8f8cb0]">You get an invite code to drop in the group chat.</p>
        <div className="mt-4 flex gap-2.5">
          <input name="name" className="input" placeholder="e.g. The Night Shift" maxLength={60} required minLength={3} />
          <button disabled={createPending} className="btn btn-primary shrink-0">
            {createPending ? <LoaderCircle size={15} className="animate-spin" /> : "Create"}
          </button>
        </div>
        {createState.error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={13} /> {createState.error}
          </p>
        )}
      </form>

      <form action={joinAction} className="glass-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <LogIn size={15} className="text-neon-400" /> Join with a code
        </h2>
        <p className="mt-1 text-xs text-[#8f8cb0]">Got a code from a friend? Paste it here.</p>
        <div className="mt-4 flex gap-2.5">
          <input
            name="code"
            className="input font-mono uppercase tracking-[0.25em]"
            placeholder="X7K2P9"
            maxLength={10}
            required
          />
          <button disabled={joinPending} className="btn btn-ghost shrink-0">
            {joinPending ? <LoaderCircle size={15} className="animate-spin" /> : "Join"}
          </button>
        </div>
        {joinState.error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-rose-300">
            <AlertCircle size={13} /> {joinState.error}
          </p>
        )}
      </form>
    </div>
  );
}
