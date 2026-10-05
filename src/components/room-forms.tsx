"use client";

import { useActionState } from "react";
import { AlertCircle, UsersRound, LogIn, LoaderCircle } from "lucide-react";
import { createRoomAction, joinRoomByCodeAction, type FormState } from "@/server/actions";

export function RoomForms() {
  const [createState, createAction, createPending] = useActionState<FormState, FormData>(createRoomAction, {});
  const [joinState, joinAction, joinPending] = useActionState<FormState, FormData>(joinRoomByCodeAction, {});

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <form action={createAction} className="glass-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <UsersRound size={15} className="text-brand-300" /> Host a room
        </h2>
        <p className="mt-1 text-xs text-[#8f8cb0]">You control the clock. Friends join with a code or link.</p>
        <div className="mt-4 grid gap-2.5 sm:grid-cols-[1fr_auto_auto_auto]">
          <input name="name" className="input" placeholder="e.g. Study Night — Chapter 4" maxLength={60} required minLength={3} />
          <label className="flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] px-3">
            <input name="focusMinutes" type="number" defaultValue={25} min={5} max={120} className="tnum w-12 bg-transparent py-2.5 text-center text-sm text-white outline-none" />
            <span className="text-[0.62rem] font-bold uppercase text-[#6d6a8f]">focus</span>
          </label>
          <label className="flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] px-3">
            <input name="breakMinutes" type="number" defaultValue={5} min={1} max={60} className="tnum w-12 bg-transparent py-2.5 text-center text-sm text-white outline-none" />
            <span className="text-[0.62rem] font-bold uppercase text-[#6d6a8f]">break</span>
          </label>
          <label className="flex items-center gap-1.5 rounded-xl border border-line bg-white/[0.03] px-3">
            <input name="totalRounds" type="number" defaultValue={4} min={1} max={12} className="tnum w-12 bg-transparent py-2.5 text-center text-sm text-white outline-none" />
            <span className="text-[0.62rem] font-bold uppercase text-[#6d6a8f]">rounds</span>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between">
          {createState.error ? (
            <p className="flex items-center gap-2 text-xs text-rose-300"><AlertCircle size={13} /> {createState.error}</p>
          ) : <span />}
          <button disabled={createPending} className="btn btn-primary shrink-0">
            {createPending ? <LoaderCircle size={15} className="animate-spin" /> : "Create room"}
          </button>
        </div>
      </form>

      <form action={joinAction} className="glass-card p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-white">
          <LogIn size={15} className="text-neon-400" /> Join a room
        </h2>
        <p className="mt-1 text-xs text-[#8f8cb0]">Or just open a room link a friend sent you — it joins you automatically.</p>
        <div className="mt-4 flex gap-2.5">
          <input name="code" className="input font-mono uppercase tracking-[0.25em]" placeholder="X7K2P9" maxLength={10} required />
          <button disabled={joinPending} className="btn btn-ghost shrink-0">
            {joinPending ? <LoaderCircle size={15} className="animate-spin" /> : "Join"}
          </button>
        </div>
        {joinState.error && (
          <p className="mt-3 flex items-center gap-2 text-xs text-rose-300"><AlertCircle size={13} /> {joinState.error}</p>
        )}
      </form>
    </div>
  );
}
