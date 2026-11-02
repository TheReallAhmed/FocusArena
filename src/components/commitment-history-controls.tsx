"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, LoaderCircle, Undo2, XCircle } from "lucide-react";
import { useLocale } from "@/components/locale-provider";
import { setCommitmentStatusAction } from "@/server/distractions";

type Outcome = "fulfilled" | "broken" | "unresolved" | "cancelled";

export function CommitmentHistoryControls({
  runKey,
  status,
  runStatus,
}: {
  runKey: string;
  status: string;
  runStatus: string;
}) {
  const { locale } = useLocale();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const copy = locale === "ar" ? {
    fulfilled: "تسجيل الوفاء",
    notFulfilled: "تسجيل عدم الوفاء",
    undo: "إلغاء تسجيل الوفاء",
    cancel: "إلغاء الجلسة",
    error: "تعذر تحديث سجل الجلسة. حاول مجددًا.",
  } : {
    fulfilled: "Mark fulfilled",
    notFulfilled: "Mark not fulfilled",
    undo: "Undo outcome",
    cancel: "Cancel session",
    error: "Could not update this focus record. Try again.",
  };

  const update = (outcome: Outcome) => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await setCommitmentStatusAction(runKey, outcome);
        if ("error" in result) {
          setError(result.error ?? copy.error);
          return;
        }
        if (outcome === "cancelled") {
          window.dispatchEvent(new CustomEvent("focusarena:run-cancelled", { detail: runKey }));
        }
        router.refresh();
      } catch {
        setError(copy.error);
      }
    });
  };

  const actions: { outcome: Outcome; label: string; icon: typeof CheckCircle2; tone: string }[] = [];
  if (status === "pending" && (runStatus === "active" || runStatus === "completed")) {
    actions.push(
      { outcome: "fulfilled", label: copy.fulfilled, icon: CheckCircle2, tone: "hover:!text-mint-300" },
      { outcome: "broken", label: copy.notFulfilled, icon: XCircle, tone: "hover:!text-rose-300" },
    );
    if (runStatus === "active") actions.push({ outcome: "cancelled", label: copy.cancel, icon: Ban, tone: "hover:!text-rose-300" });
  } else if (runStatus === "completed" && status === "unresolved") {
    actions.push(
      { outcome: "fulfilled", label: copy.fulfilled, icon: CheckCircle2, tone: "hover:!text-mint-300" },
      { outcome: "broken", label: copy.notFulfilled, icon: XCircle, tone: "hover:!text-rose-300" },
    );
  } else if (runStatus === "completed" && (status === "fulfilled" || status === "broken")) {
    actions.push(
      ...(status === "fulfilled" ? [{ outcome: "broken" as const, label: copy.notFulfilled, icon: XCircle, tone: "hover:!text-rose-300" }] : [{ outcome: "fulfilled" as const, label: copy.fulfilled, icon: CheckCircle2, tone: "hover:!text-mint-300" }]),
      { outcome: "unresolved", label: copy.undo, icon: Undo2, tone: "hover:!text-gold-300" },
    );
  }

  if (actions.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {actions.map(({ outcome, label, icon: Icon, tone }) => (
        <button
          key={outcome}
          type="button"
          disabled={pending}
          onClick={() => update(outcome)}
          className={`btn btn-ghost !gap-1 !rounded-lg !px-2.5 !py-1 !text-[0.65rem] ${tone}`}
        >
          <Icon size={12} /> {label}
        </button>
      ))}
      {pending && <LoaderCircle size={14} className="animate-spin text-brand-300" />}
      {error && <p role="alert" className="w-full text-[0.68rem] text-rose-300">{error}</p>}
    </div>
  );
}
