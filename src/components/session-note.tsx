"use client";

import { NotebookPen } from "lucide-react";
import { useTimer } from "@/components/timer-provider";
import { useLocale } from "@/components/locale-provider";

/**
 * Quick session note — saved with the next banked round and visible
 * in History, the export and the personal API. Classic dev log habit.
 */
export function SessionNoteInput() {
  const { note, setNote } = useTimer();
  const { t } = useLocale();
  const draft = note ?? "";

  return (
    <div className="glass-card p-5">
      <h2 className="mb-2.5 flex items-center gap-2 text-sm font-bold text-white">
        <NotebookPen size={15} className="text-mint-400" /> {t("session.noteTitle")}
      </h2>
      <textarea
        value={draft}
        maxLength={200}
        placeholder={t("session.notePlaceholder")}
        onChange={(e) => setNote(e.target.value || null)}
        className="input min-h-[74px] resize-y !text-[0.83rem] leading-relaxed"
      />
      <p className="mt-1.5 flex items-center justify-between text-[0.62rem] text-[#5c5a78]">
        <span>{t("session.noteSaved")}</span>
        <span className="tnum">{draft.length}/200</span>
      </p>
    </div>
  );
}
