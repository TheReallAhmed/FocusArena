"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Swords } from "lucide-react";
import { answerDuelAction, cancelDuelAction, createDuelAction } from "@/server/duels";
import { useLocale } from "@/components/locale-provider";

export function DuelCountdown({ endsAt }: { endsAt: string }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  useEffect(() => {
    const deadline = Date.parse(endsAt);
    const id = window.setInterval(() => {
      setSecondsLeft(Number.isFinite(deadline) ? Math.max(0, Math.ceil((deadline - Date.now()) / 1000)) : 0);
    }, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);
  if (secondsLeft === null) return <span aria-live="off">{ar ? "جارٍ الحساب…" : "Calculating…"}</span>;
  if (secondsLeft === 0) return <span aria-live="polite">{ar ? "انتهى الموعد" : "Deadline reached"}</span>;
  const days = Math.floor(secondsLeft / 86400);
  const hours = Math.floor((secondsLeft % 86400) / 3600);
  const minutes = Math.floor((secondsLeft % 3600) / 60);
  const seconds = secondsLeft % 60;
  return <span aria-live="off" className="tnum">{days ? `${days}${ar ? "ي " : "d "}` : ""}{String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")} {ar ? "متبقية" : "remaining"}</span>;
}

export function DuelInviteForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const username = String(form.get("username") ?? "");
    const stake = String(form.get("stake") ?? "");
    start(async () => {
      try {
        const result = await createDuelAction({ username, stake });
        setMessage(result.error ? { text: result.error, error: true } : { text: ar ? "أُرسلت الدعوة. لدى الخصم 72 ساعة للرد." : "Invitation sent. The opponent has 72 hours to respond.", error: false });
        if (result.ok) {
          formElement.reset();
          router.refresh();
        }
      } catch {
        setMessage({ text: ar ? "تعذر إرسال الدعوة. حاول مجددًا؛ لم يُسجل رهان أو نتيجة." : "Could not send the invitation. Please retry; no stake or score was recorded.", error: true });
      }
    });
  };
  return (
    <form onSubmit={submit} className="glass-card p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Swords size={16} className="text-brand-300" /> {ar ? "تحدَّ لاعبًا" : "Challenge a player"}</h2>
      <p className="mt-1 text-xs text-[#8f8cb0]">{ar ? "اكتب اسم المستخدم العام بدقة. تنتهي الدعوة بعد 72 ساعة." : "Search by exact public username. Invites expire after 72 hours."}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input name="username" className="input" autoComplete="off" placeholder={ar ? "اسم المستخدم" : "Username"} minLength={3} maxLength={25} required />
        <input name="stake" className="input" placeholder={ar ? "رهان ودي (اختياري)" : "Friendly stake (optional)"} maxLength={160} />
        <button disabled={pending} className="btn btn-primary">{pending ? <LoaderCircle size={15} className="animate-spin" /> : ar ? "إرسال الدعوة" : "Send invite"}</button>
      </div>
      {message && <p role="status" className={`mt-3 flex items-center gap-2 text-xs ${message.error ? "text-rose-300" : "text-mint-400"}`}>{message.error && <AlertCircle size={13} />}{message.text}</p>}
      <p className="mt-3 text-[0.68rem] text-[#6d6a8f]">{ar ? "الرهانات اتفاقات ودية فقط؛ لا توجد مدفوعات أو أنشطة مالية." : "Stakes are informal agreements only; no payments or financial activity are involved."}</p>
    </form>
  );
}

export function DuelInvitationActions({ duelId }: { duelId: number }) {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  const act = (accept: boolean) => start(async () => {
    setError("");
    try {
      const result = await answerDuelAction(duelId, accept);
      if (result.error) setError(result.error);
      else router.refresh();
    } catch {
      setError(ar ? "تعذر تحديث الدعوة. حاول مجددًا." : "Could not update the invitation. Please try again.");
    }
  });
  return <div className="flex flex-wrap items-center gap-2">
    <button type="button" disabled={pending} onClick={() => act(true)} className="btn btn-primary !py-2 text-xs">{pending ? <LoaderCircle size={14} className="animate-spin" /> : ar ? "قبول وابدأ" : "Accept & start"}</button>
    <button type="button" disabled={pending} onClick={() => act(false)} className="btn btn-ghost !py-2 text-xs">{ar ? "رفض" : "Decline"}</button>
    {error && <span role="status" className="text-xs text-rose-300">{error}</span>}
  </div>;
}

export function CancelDuelButton({ duelId }: { duelId: number }) {
  const router = useRouter();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return <div className="text-right">
    <button type="button" disabled={pending} onClick={() => start(async () => {
      try {
        const result = await cancelDuelAction(duelId);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError(ar ? "تعذر إلغاء المواجهة. حاول مجددًا." : "Could not cancel the duel. Please retry.");
      }
    })} className="text-xs text-[#8f8cb0] hover:text-rose-300">{pending ? (ar ? "جارٍ الإلغاء…" : "Cancelling…") : ar ? "إلغاء المواجهة" : "Cancel duel"}</button>
    {error && <p role="status" className="mt-1 text-xs text-rose-300">{error}</p>}
  </div>;
}
