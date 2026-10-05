"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play, Square, Crown, Radio, ArrowLeft, UsersRound, Link2, Check,
  CheckCircle2, PartyPopper, LoaderCircle, LogOut, Flame, Zap, Trash2,
  AlertTriangle,
} from "lucide-react";
import { startRoomAction, endRoomAction, leaveRoomAction, deleteRoomAction } from "@/server/actions";
import { Avatar, AdminChip } from "@/components/widgets";
import { fmtClock } from "@/lib/dates";

type RoomState = {
  serverNow: string;
  room: {
    code: string;
    name: string;
    status: "lobby" | "focus" | "break" | "done";
    currentRound: number;
    totalRounds: number;
    focusMinutes: number;
    breakMinutes: number;
    phaseStartedAt: string | null;
    hostId: number;
  };
  members: {
    id: number;
    displayName: string;
    username: string;
    role: string;
    avatarHue: number;
    avatarUrl: string | null;
    streak: number;
    lastSeenAt: string;
    isHost: boolean;
  }[];
  meId: number;
};

import { playChime as loudChime } from "@/lib/sound";
const playChime = (kind: "focus-done" | "break-done") => loudChime(kind === "focus-done" ? "focus" : "break");

export function RoomClient({
  code,
  meId,
  isHostMe,
  iAmAdmin,
}: {
  code: string;
  meId: number;
  isHostMe: boolean;
  iAmAdmin: boolean;
}) {
  const router = useRouter();
  const [state, setState] = useState<RoomState | null>(null);
  const [secLeft, setSecLeft] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const offsetRef = useRef(0);
  const prevStatusRef = useRef<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 5000);
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as RoomState;
      offsetRef.current = new Date(data.serverNow).getTime() - Date.now();

      const prev = prevStatusRef.current;
      const cur = data.room.status;
      if (prev && prev !== cur) {
        if (prev === "focus" && cur === "break") {
          playChime("focus-done");
          showToast(`Round banked — +${data.room.focusMinutes} XP for everyone in the room!`);
        } else if (prev === "break" && cur === "focus") {
          playChime("break-done");
          showToast(`Round ${data.room.currentRound} started — lock in.`);
        } else if (prev === "focus" && cur === "done") {
          playChime("focus-done");
          showToast("Session complete — GG everyone!");
        }
      }
      prevStatusRef.current = cur;
      setState(data);
    } catch { /* network blip — retry next tick */ }
  }, [code, showToast]);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), 4000);
    return () => clearInterval(id);
  }, [poll]);

  /* synchronized countdown */
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        if (!s || !s.room.phaseStartedAt || (s.room.status !== "focus" && s.room.status !== "break")) {
          setSecLeft(null);
          return s;
        }
        const phaseMs = (s.room.status === "focus" ? s.room.focusMinutes : s.room.breakMinutes) * 60_000;
        const end = new Date(s.room.phaseStartedAt).getTime() + phaseMs;
        const now = Date.now() + offsetRef.current;
        setSecLeft(Math.max(0, Math.round((end - now) / 1000)));
        return s;
      });
    }, 500);
    return () => clearInterval(id);
  }, []);

  const room = state?.room;
  const members = state?.members ?? [];
  const live = room?.status === "focus" || room?.status === "break";

  /* tab title */
  useEffect(() => {
    if (room && live && secLeft !== null) {
      document.title = `${fmtClock(secLeft)} ${room.status === "focus" ? "Focus" : "Break"} · ${room.name}`;
    } else if (room) {
      document.title = `${room.name} · Focus Room`;
    }
    return () => { document.title = "Focus Room · FocusArena"; };
  }, [secLeft, room, live]);

  const accent = room?.status === "focus" ? "#7c6cff" : room?.status === "break" ? "#34d399" : "#8f8cb0";
  const phaseTotal = room ? (room.status === "focus" ? room.focusMinutes : room.breakMinutes) * 60 : 0;
  const progress = live && secLeft !== null && phaseTotal > 0 ? 1 - secLeft / phaseTotal : 0;
  const C = 2 * Math.PI * 150;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/rooms/${code}`);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1800);
    } catch { /* ignore */ }
  };

  const startRoom = () => start(async () => { await startRoomAction(code); await poll(); });
  const endRoom = () => start(async () => { await endRoomAction(code); await poll(); });
  const leaveRoom = () => start(async () => { await leaveRoomAction(code); router.push("/rooms"); });
  const deleteRoom = () => start(async () => {
    const res = await deleteRoomAction(code);
    if (res?.error) { setDeleteError(res.error); setConfirmDelete(false); return; }
    router.push("/rooms");
  });

  return (
    <div className="space-y-5">
      <Link href="/rooms" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8f8cb0] transition hover:text-white">
        <ArrowLeft size={14} /> All rooms
      </Link>

      {/* Header */}
      <div className="glass-card relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-20 -top-28 h-64 w-64 rounded-full blur-3xl" style={{ background: `${accent}22` }} />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {room?.name ?? "Loading room..."}
              {live && <Radio size={20} className="animate-pulse" style={{ color: accent }} />}
            </h1>
            <p className="mt-1.5 text-sm text-[#8f8cb0]">
              {room
                ? `${room.totalRounds} rounds · ${room.focusMinutes}m focus / ${room.breakMinutes}m break · hosted by ${members.find((m) => m.isHost)?.displayName ?? "—"}`
                : "Syncing with the room..."}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="chip font-mono !px-3.5 !py-2 !text-sm !font-bold tracking-[0.3em] text-brand-300">{code}</span>
            <button onClick={copyLink} className="btn btn-ghost !px-3.5 !py-2 text-xs">
              {linkCopied ? <Check size={14} className="text-mint-400" /> : <Link2 size={14} />}
              {linkCopied ? "Link copied!" : "Copy invite link"}
            </button>
            {!isHostMe && (
              <button onClick={leaveRoom} disabled={pending} className="btn btn-ghost !px-3.5 !py-2 text-xs hover:!text-rose-300">
                <LogOut size={14} /> Leave
              </button>
            )}
            {(isHostMe || iAmAdmin) && (
              <button
                onClick={() => setConfirmDelete(true)}
                disabled={pending}
                className="btn btn-ghost !border-rose-500/30 !px-3.5 !py-2 text-xs !text-rose-300 hover:!bg-rose-500/10"
                title="Delete this room permanently"
              >
                <Trash2 size={14} /> Delete room
              </button>
            )}
          </div>
        </div>
        {deleteError && (
          <p className="relative mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2.5 text-xs font-semibold text-rose-300">
            {deleteError}
          </p>
        )}
        {!isHostMe && !iAmAdmin && (
          <p className="relative mt-4 text-[0.68rem] text-[#5c5a78]">
            Only the room creator can delete this room.
          </p>
        )}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        {/* Stage */}
        <div className="glass-card relative overflow-hidden p-6 sm:p-9">
          <div
            className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[36rem] -translate-x-1/2 rounded-full blur-[120px] transition-colors duration-1000"
            style={{ background: `color-mix(in srgb, ${accent} 20%, transparent)` }}
          />

          {/* LOBBY */}
          {room?.status === "lobby" && (
            <div className="relative flex flex-col items-center gap-6 py-10 text-center animate-fade-up">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-500/35 bg-brand-500/12 text-brand-300">
                <UsersRound size={36} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">The lobby is filling up</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#8f8cb0]">
                  Share the code or link. When the crew is in, the host starts the clock —
                  <b className="text-white"> and everyone focuses on the exact same timer.</b>
                </p>
              </div>
              <p className="tnum text-sm text-[#6d6a8f]">{members.length} in the room</p>
              {isHostMe ? (
                <button onClick={startRoom} disabled={pending} className="btn btn-primary !px-10 !py-4 !text-base">
                  {pending ? <LoaderCircle size={18} className="animate-spin" /> : <Play size={18} />}
                  Start round 1
                </button>
              ) : (
                <p className="chip !py-2 text-xs">Waiting for the host to start...</p>
              )}
            </div>
          )}

          {/* LIVE */}
          {live && (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[400px]">
                <div className="absolute inset-8 rounded-full animate-pulse-ring" style={{ border: `1px solid ${accent}55` }} />
                <svg viewBox="0 0 320 320" className="relative h-full w-full -rotate-90">
                  <defs>
                    <linearGradient id="room-grad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0" stopColor={accent} />
                      <stop offset="1" stopColor="#4ce3ff" />
                    </linearGradient>
                  </defs>
                  <circle cx="160" cy="160" r="150" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                  <circle
                    cx="160" cy="160" r="150" fill="none" stroke="url(#room-grad)" strokeWidth="9"
                    strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - progress)}
                    style={{ transition: "stroke-dashoffset 0.5s linear" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.4em]" style={{ color: accent }}>
                    {room.status === "focus" ? `Focus · Round ${room.currentRound}/${room.totalRounds}` : "Break"}
                  </span>
                  <span className="tnum font-mono text-[4.4rem] font-bold leading-none tracking-tight text-white">
                    {secLeft !== null ? fmtClock(secLeft) : "--:--"}
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    {Array.from({ length: room.totalRounds }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full transition-all duration-500"
                        style={{
                          background: i < room.currentRound - (room.status === "focus" ? 0 : 1) ? accent : "rgba(255,255,255,0.12)",
                          boxShadow: i < room.currentRound - (room.status === "focus" ? 0 : 1) ? `0 0 10px ${accent}` : undefined,
                        }}
                      />
                    ))}
                  </div>
                  <span className="mt-1 flex items-center gap-1.5 text-[0.68rem] text-[#8f8cb0]">
                    <UsersRound size={11} /> {members.length} synchronized
                  </span>
                </div>
              </div>
              {(isHostMe || iAmAdmin) && (
                <div className="relative mt-6 flex justify-center">
                  <button onClick={endRoom} disabled={pending} className="btn btn-ghost !px-5 !py-2.5 text-xs hover:!text-rose-300">
                    <Square size={13} /> End session for everyone
                  </button>
                </div>
              )}
            </>
          )}

          {/* DONE */}
          {room?.status === "done" && (
            <div className="relative flex flex-col items-center gap-6 py-10 text-center animate-scale-in">
              <span className="flex h-20 w-20 items-center justify-center rounded-3xl border border-gold-400/40 bg-gold-400/12 text-gold-400 shadow-[0_0_40px_-6px_rgba(251,191,36,0.5)]">
                <PartyPopper size={36} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">Session complete. GG.</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[#8f8cb0]">
                  {room.totalRounds} rounds in the books, together. Your XP, streak and badges are already banked —
                  check the board to see who else showed up.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                <Link href="/leaderboard" className="btn btn-primary">Check the leaderboard</Link>
                <Link href="/rooms" className="btn btn-ghost">Back to rooms</Link>
              </div>
            </div>
          )}
        </div>

        {/* Members */}
        <div className="space-y-5">
          <div className="glass-card p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-white">
              <UsersRound size={15} className="text-brand-300" /> In the room
              <span className="tnum text-xs font-semibold text-[#8f8cb0]">{members.length}</span>
            </h2>
            {members.length === 0 ? (
              <p className="py-4 text-center text-xs text-[#6d6a8f]">Syncing members...</p>
            ) : (
              <ul className="max-h-96 space-y-2 overflow-y-auto pr-1">
                {members.map((m) => {
                  const present = Date.now() + offsetRef.current - new Date(m.lastSeenAt).getTime() < 45_000;
                  return (
                    <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5">
                      <span className="relative">
                        <Avatar name={m.displayName} hue={m.avatarHue} imageUrl={m.avatarUrl} size={34} />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 ${
                            present ? "bg-mint-400" : "bg-[#4a4866]"
                          }`}
                          title={present ? "In the room now" : "Away"}
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-white">
                          {m.displayName}
                          {m.id === meId && <span className="text-[0.65rem] text-brand-300">(you)</span>}
                          {m.isHost && <Crown size={12} className="shrink-0 text-gold-400" />}
                          {m.role === "admin" && <AdminChip small />}
                        </p>
                        <p className="flex items-center gap-1 text-[0.65rem] text-[#6d6a8f]">
                          @{m.username}
                          {m.streak > 0 && (
                            <span className="flex items-center gap-0.5 text-gold-400/90">
                              <Flame size={9} /> {m.streak}
                            </span>
                          )}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="glass-card p-5">
            <h2 className="text-sm font-bold text-white">How rooms work</h2>
            <ul className="mt-3 space-y-2.5 text-[0.83rem] leading-relaxed text-[#8f8cb0]">
              <li className="flex gap-2.5"><Zap size={14} className="mt-0.5 shrink-0 text-brand-300" /> When a focus round ends, everyone present banks the same XP.</li>
              <li className="flex gap-2.5"><Radio size={14} className="mt-0.5 shrink-0 text-neon-400" /> The clock is server-synced — same second for the whole crew.</li>
              <li className="flex gap-2.5"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-mint-400" /> Group rounds count toward the Stronger Together and Hive Mind badges.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-ink-950/85 p-4 backdrop-blur-sm" onClick={() => setConfirmDelete(false)}>
          <div className="glass-card w-full max-w-sm p-7 animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
              <AlertTriangle size={22} />
            </span>
            <h2 className="mt-4 text-lg font-bold text-white">Delete this room?</h2>
            <p className="mt-2 text-sm leading-relaxed text-[#8f8cb0]">
              The room and its invite code disappear for everyone. XP and badges that members already
              banked stay safe on their profiles.
            </p>
            <div className="mt-6 flex gap-2.5">
              <button onClick={() => setConfirmDelete(false)} className="btn btn-ghost flex-1 !py-2.5 text-sm">
                Keep it
              </button>
              <button
                onClick={deleteRoom}
                disabled={pending}
                className="btn flex-1 !py-2.5 text-sm !font-bold"
                style={{ background: "linear-gradient(135deg,#f43f5e,#be123c)", color: "#fff", border: "none" }}
              >
                {pending ? <LoaderCircle size={15} className="animate-spin" /> : <Trash2 size={15} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-scale-in">
          <div className="glass-card flex items-center gap-3 !rounded-2xl border-brand-500/40 px-5 py-3.5 shadow-[0_10px_50px_-10px_rgba(124,108,255,0.4)]">
            <Zap size={16} className="text-brand-300" />
            <p className="text-sm font-semibold text-white">{toast}</p>
          </div>
        </div>
      )}

      {!state && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-ink-950/70 backdrop-blur-sm">
          <LoaderCircle size={28} className="animate-spin text-brand-300" />
        </div>
      )}
    </div>
  );
}
