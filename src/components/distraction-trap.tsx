"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertCircle, Check, LoaderCircle, Phone, X } from "lucide-react";
import { recordDistractionAction, type DistractionSource } from "@/server/distractions";
import { useLocale } from "@/components/locale-provider";

const SOURCES: { value: DistractionSource; label: string }[] = [
  { value: "phone", label: "Phone" },
  { value: "interruption", label: "Person / social interruption" },
  { value: "thought", label: "Random thought" },
  { value: "noise", label: "Environment / noise" },
  { value: "other", label: "Other" },
];

export function DistractionTrap({ runKey, plannedMinutes, active }: { runKey: string | null; plannedMinutes: number; active: boolean }) {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<DistractionSource>("phone");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const [pending, setPending] = useState(false);
  const eventId = useRef<string | null>(null);

  if (!active || !runKey) return null;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setMessage(null);
    eventId.current ??= crypto.randomUUID();
    try {
      const result = await recordDistractionAction({
        runKey,
        plannedMinutes,
        clientEventId: eventId.current,
        source,
        note: note.trim(),
      });
      if (result.error) {
        setMessage({ text: result.error, error: true });
        return;
      }
      eventId.current = null;
      setNote("");
      setOpen(false);
      setMessage({ text: t("distractions.saved"), error: false });
    } catch {
      // Keep the note and selection so a transient network failure is recoverable.
      setMessage({ text: "Could not save this yet. Your note is still here — try again.", error: true });
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto mt-5 w-full max-w-md">
      {!open ? (
        <button type="button" onClick={() => { setMessage(null); setOpen(true); }} className="btn btn-ghost w-full !border-rose-400/25 !py-2.5 text-sm hover:!border-rose-400/50 hover:!text-rose-200">
          <Phone size={15} /> {t("distractions.log")}
        </button>
      ) : (
        <form onSubmit={submit} className="glass-card space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white">{t("distractions.question")}</h3>
            <button type="button" onClick={() => setOpen(false)} className="text-[#8f8cb0] hover:text-white" aria-label="Close distraction form"><X size={16} /></button>
          </div>
          <select className="input !py-2.5" value={source} onChange={(event) => setSource(event.target.value as DistractionSource)}>
            {SOURCES.map((item) => <option key={item.value} value={item.value}>{t(`distractions.${item.value === "phone" ? "phone" : item.value === "interruption" ? "person" : item.value === "thought" ? "thought" : item.value === "noise" ? "noise" : "other"}`)}</option>)}
          </select>
          <input className="input !py-2.5" value={note} onChange={(event) => setNote(event.target.value.slice(0, 240))} maxLength={240} placeholder={t("distractions.note")} />
          {message && <p role="status" className={`flex items-center gap-2 text-xs ${message.error ? "text-rose-300" : "text-mint-400"}`}>{message.error ? <AlertCircle size={13} /> : <Check size={13} />}{message.text}</p>}
          <button disabled={pending} className="btn btn-primary w-full !py-2.5 text-sm">
            {pending ? <><LoaderCircle size={15} className="animate-spin" /> {t("common.working")}</> : t("distractions.submit")}
          </button>
        </form>
      )}
      {!open && message && <p role="status" className={`mt-2 flex items-center justify-center gap-2 text-xs ${message.error ? "text-rose-300" : "text-mint-400"}`}>{message.error ? <AlertCircle size={13} /> : <Check size={13} />}{message.text}</p>}
    </div>
  );
}
