"use client";

import { useEffect, useState } from "react";
import { BookOpen, Lightbulb, Quote } from "lucide-react";

type Guidance = { kind: "آية قرآنية" | "حديث نبوي" | "نصيحة"; text: string; source?: string };

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

function Icon({ kind }: { kind: Guidance["kind"] }) {
  if (kind === "آية قرآنية") return <BookOpen size={16} aria-hidden="true" />;
  if (kind === "حديث نبوي") return <Quote size={16} aria-hidden="true" />;
  return <Lightbulb size={16} aria-hidden="true" />;
}

export function RotatingGuidance() {
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

  const item = GUIDANCE[index];
  return (
    <aside
      dir="rtl"
      aria-label="آية أو حديث أو نصيحة متجددة"
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
