"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe2, LoaderCircle } from "lucide-react";
import { updateLocaleAction } from "@/server/actions";
import { useLocale } from "@/components/locale-provider";
import type { Locale } from "@/lib/i18n";

export function LanguageSettings({ initialLocale }: { initialLocale: Locale }) {
  const router = useRouter();
  const { t } = useLocale();
  const [selected, setSelected] = useState<Locale>(initialLocale);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const choose = (locale: Locale) => {
    if (pending || selected === locale) return;
    setSelected(locale);
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await updateLocaleAction(locale);
        if ("error" in result) {
          setSelected(initialLocale);
          setMessage(result.error ?? t("language.error"));
          return;
        }
        setMessage(t("language.saved"));
        router.refresh();
      } catch {
        setSelected(initialLocale);
        setMessage(t("language.error"));
      }
    });
  };

  return <div>
    <div className="grid gap-3 sm:grid-cols-2">
      {(["en", "ar"] as const).map((locale) => <button key={locale} type="button" disabled={pending} onClick={() => choose(locale)} aria-pressed={selected === locale} className={`group flex items-center justify-between rounded-2xl border p-4 text-start transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-400/40 hover:bg-brand-500/[.06] ${selected === locale ? "border-brand-400/50 bg-brand-500/[.1] shadow-[0_10px_35px_-20px_rgba(124,108,255,.8)]" : "border-line bg-white/[.02]"}`}>
        <span className="flex items-center gap-3"><span className={`flex h-10 w-10 items-center justify-center rounded-xl ${selected === locale ? "bg-brand-500/20 text-brand-200" : "bg-white/[.04] text-[#8f8cb0]"}`}><Globe2 size={18}/></span><span><span className="block text-sm font-bold text-white">{locale === "en" ? t("language.english") : t("language.arabic")}</span><span className="mt-0.5 block text-xs text-[#777494]">{locale === "en" ? "Left-to-right · English" : "من اليمين إلى اليسار · العربية"}</span></span></span>
        <span className="flex h-6 w-6 items-center justify-center rounded-full border border-line text-brand-200">{pending && selected === locale ? <LoaderCircle size={14} className="animate-spin"/> : selected === locale ? <Check size={14}/> : null}</span>
      </button>)}
    </div>
    {message && <p role="status" className="mt-3 text-xs text-mint-300">{message}</p>}
  </div>;
}
