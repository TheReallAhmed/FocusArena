"use client";

import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AlertCircle, Check, LoaderCircle, Save } from "lucide-react";
import { saveJournalAction } from "@/server/journal";

type JournalFields = { wentWell: string; blockers: string; tomorrowPriority: string };

export function JournalTimezoneSync({ timeZone }: { timeZone: string }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    if (localZone === timeZone) return;
    const params = new URLSearchParams(window.location.search);
    params.set("tz", localZone);
    if (!params.has("date")) {
      const now = new Date();
      const parts = new Intl.DateTimeFormat("en-CA", { timeZone: localZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
      const part = (type: string) => parts.find((value) => value.type === type)?.value ?? "";
      const today = `${part("year")}-${part("month")}-${part("day")}`;
      params.set("date", today);
      params.set("month", today.slice(0, 7));
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, timeZone]);
  return null;
}

export function JournalEditor({
  userId,
  localDay,
  timeZone,
  initial,
}: {
  userId: number;
  localDay: string;
  timeZone: string;
  initial: JournalFields;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const dirtyRef = useRef(false);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const draftKey = `focusarena:journal-draft:${userId}:${localDay}`;

  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (!dirtyRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", beforeUnload);
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<JournalFields>;
        const form = formRef.current;
        if (form) {
          const fields = ["wentWell", "blockers", "tomorrowPriority"] as const;
          for (const name of fields) {
            const element = form.elements.namedItem(name);
            if (element instanceof HTMLTextAreaElement && typeof draft[name] === "string") element.value = draft[name];
          }
          dirtyRef.current = true;
        }
      }
    } catch { /* Ignore an unavailable or malformed local draft. */ }
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [draftKey]);

  const onChange = (event: FormEvent<HTMLFormElement>) => {
    dirtyRef.current = true;
    const form = event.currentTarget;
    try {
      const values = new FormData(form);
      const draft = {
        wentWell: String(values.get("wentWell") ?? ""),
        blockers: String(values.get("blockers") ?? ""),
        tomorrowPriority: String(values.get("tomorrowPriority") ?? ""),
      };
      localStorage.setItem(draftKey, JSON.stringify(draft));
    } catch { /* The database save remains available when local storage is blocked. */ }
  };

  const save = (complete: boolean) => {
    const form = formRef.current;
    if (!form || pending) return;
    const values = new FormData(form);
    const payload: JournalFields = {
      wentWell: String(values.get("wentWell") ?? ""),
      blockers: String(values.get("blockers") ?? ""),
      tomorrowPriority: String(values.get("tomorrowPriority") ?? ""),
    };
    if (complete && Object.values(payload).some((value) => !value.trim())) {
      setMessage({ text: "Fill in all three prompts before completing this reflection.", error: true });
      return;
    }
    setMessage(null);
    start(async () => {
      try {
        const result = await saveJournalAction({ localDay, timeZone, ...payload, complete });
        if (result.error) {
          setMessage({ text: result.error, error: true });
          return;
        }
        dirtyRef.current = false;
        localStorage.removeItem(draftKey);
        setMessage({ text: result.message ?? "Saved.", error: false });
        router.refresh();
      } catch {
        setMessage({ text: "Could not reach the server. Your text remains saved in this browser draft; try again.", error: true });
      }
    });
  };

  return (
    <form ref={formRef} onChange={onChange} onSubmit={(event) => event.preventDefault()} className="glass-card p-5 sm:p-6">
      <input type="hidden" name="localDay" value={localDay} />
      <input type="hidden" name="timeZone" value={timeZone} />
      <h2 className="text-sm font-bold text-white">Daily reflection · {localDay}</h2>
      <p className="mt-1 text-xs text-[#6d6a8f]">Saved privately under your local calendar day ({timeZone}).</p>
      <div className="mt-4 space-y-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#c7c4de]">What went well today?</span><textarea name="wentWell" defaultValue={initial.wentWell} maxLength={1200} rows={3} className="input resize-y !py-3" placeholder="Name a win, however small…" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#c7c4de]">What blocked your focus?</span><textarea name="blockers" defaultValue={initial.blockers} maxLength={1200} rows={3} className="input resize-y !py-3" placeholder="Notice recurring patterns without judging yourself…" /></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold text-[#c7c4de]">What is your top priority tomorrow?</span><textarea name="tomorrowPriority" defaultValue={initial.tomorrowPriority} maxLength={600} rows={2} className="input resize-y !py-3" placeholder="Choose one clear next action…" /></label>
      </div>
      {message && <p role="status" className={`mt-3 flex items-center gap-2 text-xs ${message.error ? "text-rose-300" : "text-mint-400"}`}>{message.error ? <AlertCircle size={14} /> : <Check size={14} />}{message.text}</p>}
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={pending} onClick={() => save(false)} className="btn btn-ghost !py-2.5 text-xs">{pending ? <LoaderCircle size={14} className="animate-spin" /> : <Save size={14} />} Save draft</button>
        <button type="button" disabled={pending} onClick={() => save(true)} className="btn btn-primary !py-2.5 text-xs">{pending ? <LoaderCircle size={14} className="animate-spin" /> : <Check size={14} />} Complete reflection</button>
      </div>
    </form>
  );
}
