"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, CircleHelp, LoaderCircle, LockKeyhole, XCircle } from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { useLocale } from "@/components/locale-provider";
import { getLatestUnresolvedCommitmentAction, resolveCommitmentAction } from "@/server/distractions";

type Commitment = NonNullable<Awaited<ReturnType<typeof getLatestUnresolvedCommitmentAction>>>;

export function CommitmentReview() {
  const timer = useTimer();
  const { t } = useLocale();
  const router = useRouter();
  const [item, setItem] = useState<Commitment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const refresh = useCallback(async () => {
    try {
      const current = await getLatestUnresolvedCommitmentAction();
      setItem(current);
    } catch { /* Keep the existing private prompt available if offline. */ }
  }, []);
  useEffect(() => {
    const id = window.setTimeout(() => { void refresh(); }, 0);
    return () => window.clearTimeout(id);
  }, [refresh, timer.lastResult?.gained, timer.lastResult?.xp, timer.lastResult?.streak]);

  const resolve = (outcome: "fulfilled" | "broken") => {
    if (!item) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await resolveCommitmentAction(item.runKey, outcome);
        if ("error" in result) setError(t("commitment.saveError"));
        else { setItem(null); router.refresh(); }
      } catch { setError(t("commitment.connectionError")); }
    });
  };

  if (!item) return null;
  return (
    <section className="glass-card border-brand-500/25 p-5" aria-labelledby="commitment-review-title">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/12 text-brand-300"><CircleHelp size={19} /></span>
        <div className="min-w-0 flex-1">
          <h2 id="commitment-review-title" className="text-sm font-bold text-white">{t("commitment.title")}</h2>
          <p className="mt-1 text-xs text-[#6d6a8f]">{t("commitment.description")}</p>
        </div>
        <span className="chip !text-[0.62rem]"><LockKeyhole size={11} /> {t("commitment.private")}</span>
      </div>
      <blockquote className="mt-4 rounded-xl border border-line bg-white/[0.025] px-4 py-3 text-sm text-[#d9d7ec]">{item.intendedOutcome}</blockquote>
      {item.consequence && <p className="mt-2 text-xs text-[#8f8cb0]">{t("commitment.consequence")} {item.consequence}</p>}
      {error && <p role="alert" className="mt-3 text-xs text-rose-300">{error}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={() => resolve("fulfilled")} className="btn btn-primary !px-4 !py-2 text-xs"><CheckCircle2 size={14} /> {t("commitment.fulfilled")}</button>
        <button type="button" disabled={pending} onClick={() => resolve("broken")} className="btn btn-ghost !px-4 !py-2 text-xs hover:!text-rose-300"><XCircle size={14} /> {t("commitment.notFulfilled")}</button>
        {pending && <LoaderCircle size={15} className="animate-spin self-center text-brand-300" />}
      </div>
    </section>
  );
}
