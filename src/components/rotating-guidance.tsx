"use client";

import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Quote } from "lucide-react";
import { useLocale } from "@/components/locale-provider";

type Guidance = { kind: string; text: string; source?: string };

// Curated offline content: no API keys, paid service, or network request.
const GUIDANCE: Guidance[] = [
  { kind: "آية قرآنية", text: "وَقُل رَّبِّ زِدْنِي عِلْمًا", source: "طه، ١١٤" },
  { kind: "آية قرآنية", text: "فَإِذَا فَرَغْتَ فَانصَبْ ۝ وَإِلَىٰ رَبِّكَ فَارْغَب", source: "الشرح، ٧–٨" },
  { kind: "آية قرآنية", text: "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ", source: "النجم، ٣٩" },
  { kind: "حديث نبوي", text: "أحبُّ الأعمالِ إلى اللهِ أدومُها وإن قلَّ", source: "صحيح البخاري، ٦٤٦٤؛ صحيح مسلم، ٧٨٣" },
  { kind: "حديث نبوي", text: "احرص على ما ينفعك، واستعن بالله ولا تعجز", source: "صحيح مسلم، ٢٦٦٤" },
  { kind: "نصيحة", text: "اختر مهمة واحدة، أبعد المشتتات، وابدأ بخمس دقائق فقط." },
  { kind: "نصيحة", text: "قسّم العمل الكبير إلى خطوة صغيرة واضحة، ثم ابدأ بها الآن." },
  { kind: "نصيحة", text: "الاستراحة القصيرة جزء من التركيز؛ عد بعدها إلى أولويتك." },
];
const EN_GUIDANCE: Guidance[] = [
  { kind: "Qur'anic verse", text: "And say: My Lord, increase me in knowledge.", source: "Qur'an 20:114" },
  { kind: "Qur'anic verse", text: "When you have finished, then stand up for worship; and to your Lord direct your longing.", source: "Qur'an 94:7–8" },
  { kind: "Qur'anic verse", text: "And that each person will have only what they endeavored toward.", source: "Qur'an 53:39" },
  { kind: "Prophetic hadith", text: "The deeds most beloved to Allah are those done consistently, even if small.", source: "Sahih al-Bukhari 6464; Sahih Muslim 783" },
  { kind: "Prophetic hadith", text: "Be keen on what benefits you, seek Allah's help, and do not give up.", source: "Sahih Muslim 2664" },
  { kind: "Tip", text: "Choose one task, remove distractions, and begin with just five minutes." },
  { kind: "Tip", text: "Break big work into one clear next step, then start it now." },
  { kind: "Tip", text: "A short break is part of focus; return to your priority afterward." },
];

function Icon({ kind }: { kind: Guidance["kind"] }) {
  if (kind === "آية قرآنية" || kind === "Qur'anic verse") return <BookOpen size={16} aria-hidden="true" />;
  if (kind === "حديث نبوي" || kind === "Prophetic hadith") return <Quote size={16} aria-hidden="true" />;
  return <Lightbulb size={16} aria-hidden="true" />;
}

export function RotatingGuidance() {
  const { locale } = useLocale();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((previous) => {
        if (GUIDANCE.length < 2) return previous;
        let next = previous;
        while (next === previous) next = Math.floor(Math.random() * GUIDANCE.length);
        return next;
      });
    }, 18_000);
    return () => window.clearInterval(timer);
  }, []);

  const items = locale === "ar" ? GUIDANCE : EN_GUIDANCE;
  const item = items[index % items.length];
  return (
    <aside
      dir="rtl"
      aria-label={locale === "ar" ? "آية أو حديث أو نصيحة متجددة" : "Rotating verse, hadith or focus tip"}
      className="mb-5 flex min-h-[4.25rem] items-center gap-3 rounded-2xl border border-brand-400/20 bg-gradient-to-l from-brand-500/[0.12] via-white/[0.035] to-neon-400/[0.06] px-4 py-3 shadow-[0_10px_40px_-30px_rgba(124,108,255,0.6)] sm:px-5"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-brand-300/20 bg-brand-400/10 text-brand-200">
        <Icon kind={item.kind} />
      </span>
      <div key={index} className="min-w-0 flex-1 animate-fade-up">
        <p className="text-[0.65rem] font-bold tracking-wide text-brand-200">{item.kind}</p>
        <p className="mt-0.5 text-sm leading-7 text-[#eeeafa] sm:text-[0.93rem]">{item.text}</p>
      </div>
      {item.source && <span className="hidden shrink-0 text-[0.68rem] text-[#8f8cb0] sm:block">{item.source}</span>}
    </aside>
  );
}
