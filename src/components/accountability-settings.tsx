"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, LoaderCircle } from "lucide-react";
import { updatePublicAccountabilityAction } from "@/server/actions";
import { useLocale } from "@/components/locale-provider";

export function AccountabilitySettings({ initialEnabled }: { initialEnabled: boolean }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="glass-card p-5" aria-labelledby="accountability-privacy-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neon-400/10 text-neon-300">{enabled ? <Eye size={16} /> : <EyeOff size={16} />}</span>
        <div className="min-w-0 flex-1">
          <h2 id="accountability-privacy-title" className="text-sm font-bold text-white">{ar ? "مؤشر المحاسبة العام" : "Public accountability indicator"}</h2>
          <p className="mt-1 text-xs leading-relaxed text-[#8f8cb0]">{ar ? "اختياري ومعطّل افتراضيًا. عند تفعيله، قد يظهر مؤشر صغير على لوحة الصدارة لمدة 24 ساعة بعد إبلاغك بنفسك عن عدم الوفاء بالتزام. يظل نص التزامك وعاقبته خاصين." : "Optional and off by default. If enabled, a small indicator may appear on the leaderboard for 24 hours after you self-report a broken commitment. Your commitment and consequence text stay private."}</p>
          {error && <p role="alert" className="mt-2 flex items-center gap-1.5 text-xs text-rose-300"><AlertCircle size={13} />{error}</p>}
        </div>
        <label className="flex shrink-0 items-center gap-2 text-xs font-semibold text-[#c7c4de]">
          <input type="checkbox" checked={enabled} disabled={pending} onChange={(event) => {
            const next = event.target.checked;
            setEnabled(next); setError(null);
            startTransition(async () => {
              try {
                const result = await updatePublicAccountabilityAction(next);
                if ("error" in result) { setEnabled(!next); setError(ar ? "تعذر حفظ هذا الإعداد." : result.error ?? "Could not save this setting."); }
                else router.refresh();
              } catch {
                setEnabled(!next); setError(ar ? "تعذر الاتصال بالخادم. لم يُحفظ الإعداد." : "Could not reach the server. The setting was not saved.");
              }
            });
          }} className="h-4 w-4 accent-[#7c6cff]" />
          {pending ? <LoaderCircle size={13} className="animate-spin" /> : enabled ? (ar ? "مفعّل" : "On") : (ar ? "معطّل" : "Off")}
        </label>
      </div>
    </section>
  );
}
