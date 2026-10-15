"use client";

import { useMemo, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import {
  Atom, BadgeCheck, Brain, Check, Coins, Crown, Flame, Frame, Gem, Heart, Leaf,
  LoaderCircle, Moon, Rocket, Shield, ShoppingBag, Snowflake, Sparkles, Star,
  Target, Waves, Zap, type LucideIcon,
} from "lucide-react";
import { Avatar } from "@/components/widgets";
import { useLocale } from "@/components/locale-provider";
import { PERK_CATALOG, perkColor, type PerkCategory } from "@/lib/perks";
import { equipPerkAction, purchasePerkAction } from "@/server/actions";

const ICONS: Record<string, LucideIcon> = { sparkles: Sparkles, zap: Zap, flame: Flame, brain: Brain, moon: Moon, waves: Waves, shield: Shield, heart: Heart, snowflake: Snowflake, crown: Crown, comet: Rocket, orbit: Atom, flower: Sparkles, star: Star, wolf: Flame, eclipse: Moon, gem: Gem, leaf: Leaf };
function ShopGlyph({ symbol, size = 18, style }: { symbol?: string; size?: number; style?: CSSProperties }) { const Icon = ICONS[symbol ?? ""] ?? Sparkles; return <Icon size={size} style={style} />; }
const AR_NAMES: Record<string, string> = {
  "focus-beast": "وحش التركيز", "deep-work-master": "سيد العمل العميق", "arena-veteran": "مخضرم الساحة", "night-owl": "بومة الليل", "task-alchemist": "كيميائي المهام", "flow-state": "حالة التدفق", "zero-noise": "بلا ضجيج", "legendary-focus": "تركيز أسطوري",
  "aurora-frame": "إطار الشفق", "neon-frame": "إطار النيون", "gold-frame": "الإطار الذهبي", "rose-frame": "إطار الوردي", "emerald-frame": "إطار الزمرد", "ice-frame": "إطار الجليد",
  "comet-logo": "شعار ذيل المذنب", "phoenix-logo": "شعار العنقاء", "orbit-logo": "شعار المدار", "titan-logo": "شعار العملاق", "lotus-logo": "زهرة اللوتس", "nova-logo": "شارة نوفا", "wolf-logo": "شعار الذئب", "eclipse-logo": "علامة الكسوف",
  "ruby-name": "إشارة الياقوت", "amber-name": "العنبر الشمسي", "mint-name": "دائرة النعناع", "ocean-name": "نبض المحيط", "violet-name": "شعاع البنفسج", "rose-name": "كوارتز وردي", "ice-name": "النهر الجليدي", "prism-name": "تحوّل المنشور",
  "crown-icon": "أيقونة التاج", "bolt-icon": "أيقونة البرق", "flame-icon": "أيقونة اللهب", "star-icon": "أيقونة النجمة", "gem-icon": "أيقونة الجوهرة", "moon-icon": "أيقونة القمر", "leaf-icon": "أيقونة الورقة", "shield-icon": "أيقونة الدرع",
};
const FILTERS: { key: "all" | PerkCategory; label: string }[] = [
  { key: "all", label: "shop.filter.all" }, { key: "title", label: "shop.filter.title" },
  { key: "logo", label: "shop.filter.logo" }, { key: "color", label: "shop.filter.color" },
  { key: "icon", label: "shop.filter.icon" }, { key: "frame", label: "shop.filter.frame" },
];
const categoryNames: Record<PerkCategory, { en: string; ar: string }> = {
  title: { en: "TITLE", ar: "لقب" }, frame: { en: "AVATAR FRAME", ar: "إطار صورة" }, logo: { en: "PROFILE LOGO", ar: "شعار الملف" }, color: { en: "NAME COLOR", ar: "لون الاسم" }, icon: { en: "NAME ICON", ar: "أيقونة الاسم" },
};
const categoryDescriptions: Record<PerkCategory, { en: string; ar: string }> = {
  title: { en: "A collectible title shown on your identity card.", ar: "لقب تجميلي يظهر بجانب هويتك في الساحة." },
  frame: { en: "A luminous frame for your profile avatar.", ar: "إطار مضيء يحيط بصورتك الشخصية." },
  logo: { en: "A signature emblem to make your profile stand out.", ar: "شارة مميزة تجعل ملفك لافتًا في الساحة." },
  color: { en: "Set the accent color of your display name.", ar: "لون خاص يميّز اسمك المعروض." },
  icon: { en: "Add a small signature icon beside your name.", ar: "أضف أيقونة صغيرة بجانب اسمك." },
};

export function PerksStore({ xpBalance, ownedKeys, equippedTitle, equippedFrame, equippedLogo, equippedColor, equippedIcon, displayName, avatarHue, avatarUrl }: {
  xpBalance: number;
  ownedKeys: string[];
  equippedTitle: string | null;
  equippedFrame: string | null;
  equippedLogo: string | null;
  equippedColor: string | null;
  equippedIcon: string | null;
  displayName: string;
  avatarHue: number;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const { locale, t } = useLocale();
  const [category, setCategory] = useState<"all" | PerkCategory>("all");
  const [search, setSearch] = useState("");
  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const owned = useMemo(() => new Set(ownedKeys), [ownedKeys]);
  const equippedByCategory: Record<PerkCategory, string | null> = { title: equippedTitle, frame: equippedFrame, logo: equippedLogo, color: equippedColor, icon: equippedIcon };
  const filtered = PERK_CATALOG.filter((item) => (category === "all" || item.category === category) && `${item.name} ${AR_NAMES[item.key] ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const activeMark = PERK_CATALOG.find((item) => item.key === equippedLogo || item.key === equippedIcon);
  const nameColor = perkColor(equippedColor) ?? "#f7f5ff";

  const buy = (key: string) => {
    setBusyKey(key);
    startTransition(async () => {
      try {
        const result = await purchasePerkAction(key);
        setMessage("error" in result ? t("shop.purchaseError") : result.alreadyOwned ? t("shop.owned") : t("shop.purchaseSuccess"));
        setConfirmKey(null);
        router.refresh();
      } catch { setMessage(t("shop.purchaseError")); }
      finally { setBusyKey(null); }
    });
  };
  const equip = (key: string | null, itemCategory: PerkCategory) => {
    setBusyKey(key ?? `clear-${itemCategory}`);
    startTransition(async () => {
      try {
        const result = await equipPerkAction(key, itemCategory);
        setMessage("error" in result ? t("shop.purchaseError") : t("shop.equipSuccess"));
        router.refresh();
      } catch { setMessage(t("shop.purchaseError")); }
      finally { setBusyKey(null); }
    });
  };
  const resetLook = () => {
    setBusyKey("reset");
    startTransition(async () => {
      try { await equipPerkAction(null); setMessage(t("shop.equipSuccess")); router.refresh(); }
      catch { setMessage(t("shop.purchaseError")); }
      finally { setBusyKey(null); }
    });
  };

  return <section className="space-y-5" aria-label={t("shop.title")}>
    <div className="glass-card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -end-10 -top-20 h-52 w-52 rounded-full bg-brand-500/10 blur-3xl" />
      <div className="relative flex flex-wrap items-center justify-between gap-4">
        <div><p className="flex items-center gap-2 text-[.63rem] font-bold uppercase tracking-[.2em] text-brand-300"><Sparkles size={12}/>{t("shop.preview")}</p><p className="mt-1 text-xs text-[#777494]">{t("shop.tagline")}</p></div>
        <button type="button" onClick={resetLook} disabled={busy || ![equippedTitle,equippedFrame,equippedLogo,equippedColor,equippedIcon].some(Boolean)} className="btn btn-ghost !px-3 !py-2 !text-xs">{busy && busyKey === "reset" ? <LoaderCircle size={13} className="animate-spin"/> : null}{t("shop.reset")}</button>
      </div>
      <div className="relative mt-4 flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(ellipse_at_top_right,rgba(124,108,255,.18),transparent_60%),rgba(255,255,255,.025)] p-4 transition-all duration-500">
        <div className="relative"><Avatar name={displayName} hue={avatarHue} imageUrl={avatarUrl} size={58} frameKey={equippedFrame}/>{activeMark && <span className="absolute -bottom-1 -end-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-ink-900 bg-ink-800 shadow-lg" style={{ color: activeMark.color }}><ShopGlyph symbol={activeMark.symbol} size={13}/></span>}</div>
        <div className="min-w-0 flex-1"><p className="flex flex-wrap items-center gap-1.5 text-lg font-bold transition-all duration-300" style={{ color: nameColor, textShadow: equippedColor ? `0 0 18px ${nameColor}66` : undefined }}>{displayName}{equippedIcon && (() => { const item = PERK_CATALOG.find((entry) => entry.key === equippedIcon); return <ShopGlyph symbol={item?.symbol} size={16} style={{ color: item?.color }} />; })()}</p><p className="mt-1 flex flex-wrap items-center gap-2"><span className="text-xs text-[#777494]">@you</span>{equippedTitle && <span className="chip !border-neon-400/30 !bg-neon-400/8 !px-2 !py-0.5 !text-[.62rem] !text-neon-300">{PERK_CATALOG.find((item) => item.key === equippedTitle)?.name}</span>}</p></div>
        <div className="hidden sm:flex items-center gap-2">{equippedColor && <span className="h-7 w-7 rounded-full border border-white/20 shadow-[0_0_22px_currentColor]" style={{ background: nameColor, color: nameColor }} title={t("shop.filter.color")} />}{equippedLogo && <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-black/20" style={{ color: PERK_CATALOG.find((item) => item.key === equippedLogo)?.color }}><ShopGlyph symbol={PERK_CATALOG.find((item) => item.key === equippedLogo)?.symbol} size={20}/></span>}</div>
      </div>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{FILTERS.map((filter) => <button key={filter.key} type="button" onClick={() => setCategory(filter.key)} className={`tab-pill shrink-0 !px-3 !py-1.5 !text-[.7rem] ${category === filter.key ? "tab-pill-active" : ""}`}>{t(filter.label)}</button>)}</div>
      <input className="input !w-full !py-2.5 text-xs sm:max-w-64" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("shop.search")} />
    </div>
    {message && <p role="status" className="animate-fade-up rounded-xl border border-brand-500/25 bg-brand-500/[.07] px-4 py-3 text-sm text-[#d3d0eb]">{message}</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {filtered.map((perk, index) => {
        const hasIt = owned.has(perk.key);
        const equipped = equippedByCategory[perk.category] === perk.key;
        const affordable = xpBalance >= perk.price;
        const Icon = ICONS[perk.symbol ?? ""] ?? Sparkles;
        const title = locale === "ar" ? AR_NAMES[perk.key] ?? perk.name : perk.name;
        const desc = categoryDescriptions[perk.category][locale];
        return <article key={perk.key} style={{ animationDelay: `${Math.min(index, 12) * 35}ms`, "--perk-accent": perk.color ?? "#a78bfa" } as React.CSSProperties} className="group relative overflow-hidden rounded-2xl border border-line bg-[linear-gradient(150deg,rgba(255,255,255,.04),rgba(255,255,255,.012))] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[color:var(--perk-accent)]/50 hover:shadow-[0_18px_48px_-28px_var(--perk-accent)] animate-fade-up">
          <div className="pointer-events-none absolute -end-8 -top-12 h-32 w-32 rounded-full opacity-[.09] blur-2xl transition-opacity group-hover:opacity-20" style={{ background: perk.color ?? "#7c6cff" }}/>
          <div className="relative flex items-start justify-between gap-3">
            <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border bg-white/[.025] transition-transform duration-300 group-hover:scale-110 ${perk.category === "frame" ? "rounded-full" : ""}`} style={{ borderColor: `${perk.color ?? "#a78bfa"}55`, color: perk.color ?? "#b3aaff", boxShadow: `0 0 24px -12px ${perk.color ?? "#a78bfa"}` }}>
              {perk.category === "color" ? <span className="text-xl font-black" style={{ color: perk.color }}>Aa</span> : <Icon size={24} strokeWidth={1.8}/>}
              {perk.category === "frame" && <span className="absolute inset-1 rounded-full border" style={{ borderColor: `${perk.color ?? "#a78bfa"}99` }}/ >}
            </div>
            <span className="chip !px-2 !py-1 !text-[.58rem]" style={{ borderColor: `${perk.color ?? "#a78bfa"}45`, color: perk.color ?? undefined }}>{categoryNames[perk.category][locale]}</span>
          </div>
          <h3 className="relative mt-4 text-sm font-bold text-white">{title}</h3>
          <p className="relative mt-1 min-h-9 text-xs leading-relaxed text-[#777494]">{desc}</p>
          {perk.category === "color" && <div className="relative mt-3 flex items-center gap-2"><span className="h-6 w-6 rounded-lg border border-white/15 shadow-[0_0_18px_-4px_var(--perk-accent)]" style={{ background: perk.color }}/><span className="text-xs font-semibold" style={{ color: perk.color }}>{displayName}</span><span className="text-xs text-[#777494]">Aa</span></div>}
          <div className="relative mt-4 flex items-center justify-between gap-2 border-t border-white/[.06] pt-3">
            <span className="flex items-center gap-1.5 text-xs font-bold text-gold-300"><Coins size={13}/>{perk.price.toLocaleString()} XP</span>
            <div className="flex items-center gap-1.5">
              {equipped ? <><span className="chip !border-mint-400/30 !bg-mint-400/10 !px-2 !py-1 !text-[.62rem] !text-mint-300"><Check size={11}/>{t("shop.equipped")}</span><button type="button" onClick={() => equip(null, perk.category)} disabled={busy} className="btn btn-ghost !px-2 !py-1.5 !text-[.64rem]">{busy && busyKey === `clear-${perk.category}` ? <LoaderCircle size={12} className="animate-spin"/> : t("shop.unequip")}</button></>
                : hasIt ? <button type="button" onClick={() => equip(perk.key, perk.category)} disabled={busy} className="btn btn-primary !px-3 !py-1.5 !text-[.68rem]">{busy && busyKey === perk.key ? <LoaderCircle size={12} className="animate-spin"/> : t("shop.equip")}</button>
                : confirmKey === perk.key ? <><button type="button" onClick={() => buy(perk.key)} disabled={busy} className="btn btn-primary !px-2.5 !py-1.5 !text-[.65rem]">{busy && busyKey === perk.key ? <LoaderCircle size={12} className="animate-spin"/> : t("shop.confirm")}</button><button type="button" onClick={() => setConfirmKey(null)} disabled={busy} className="btn btn-ghost !px-2 !py-1.5 !text-[.65rem]">{t("shop.cancel")}</button></>
                : <button type="button" disabled={busy || !affordable} onClick={() => { setMessage(null); setConfirmKey(perk.key); }} className="btn btn-ghost !px-3 !py-1.5 !text-[.68rem]">{affordable ? t("shop.buy") : t("shop.enough")}</button>}
            </div>
          </div>
          {confirmKey === perk.key && <p className="relative mt-3 rounded-lg border border-gold-400/20 bg-gold-400/[.06] px-3 py-2 text-[.66rem] leading-relaxed text-gold-200">{t("shop.confirmText", { name: title, price: perk.price })}</p>}
        </article>;
      })}
    </div>
    {filtered.length === 0 && <div className="glass-card py-12 text-center text-sm text-[#8f8cb0]">{t("shop.noItems")}</div>}
    <p className="flex items-center justify-center gap-2 pb-3 text-center text-[.65rem] text-[#696683]"><BadgeCheck size={13} className="text-mint-400"/>{t("shop.tagline")} · {filtered.length} {locale === "ar" ? "عنصرًا" : "items"}</p>
  </section>;
}
