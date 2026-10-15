import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { userPerks } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { PerksStore } from "@/components/perks-store";
import { normalizeLocale, t } from "@/lib/i18n";
import { Coins, Crown, Sparkles } from "lucide-react";
import { levelFromXp } from "@/lib/xp";
import { eq } from "drizzle-orm";

export const metadata: Metadata = { title: "XP Shop" };
export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const locale = normalizeLocale(user.locale);
  const owned = await db.select({ rewardKey: userPerks.rewardKey }).from(userPerks).where(eq(userPerks.userId, user.id));
  const text = (key: string, values?: Record<string, string | number>) => t(locale, key, values);
  return <div className="space-y-6">
    <header className="relative overflow-hidden rounded-[1.6rem] border border-brand-400/20 bg-[radial-gradient(ellipse_at_top_right,rgba(124,108,255,.22),transparent_48%),linear-gradient(135deg,rgba(20,17,44,.94),rgba(8,9,20,.98))] p-6 shadow-[0_28px_90px_-48px_rgba(124,108,255,.7)] sm:p-9">
        <div className="pointer-events-none absolute -end-12 -top-20 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
      <div className="relative flex flex-wrap items-end justify-between gap-5">
        <div><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.24em] text-brand-300"><Sparkles size={13} />{text("shop.eyebrow")}</p><h1 className="mt-2 text-3xl font-black tracking-tight text-white sm:text-4xl">{text("shop.title")}</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#aaa7c5]">{text("shop.subtitle")}</p></div>
        <div className="flex flex-wrap gap-2"><span className="chip !border-gold-400/35 !bg-gold-400/10 !px-3 !py-2 !text-gold-300"><Coins size={14} />{user.xpBalance.toLocaleString()} {text("shop.balance")}</span><span className="chip !border-brand-400/25 !bg-brand-400/10 !px-3 !py-2 !text-brand-200"><Crown size={14} />{text("shop.level", { level: levelFromXp(user.xp) })} · {text("shop.levelsafe")}</span></div>
      </div>
      <div className="relative mt-6 grid max-w-xl grid-cols-2 gap-3"><div className="rounded-xl border border-white/10 bg-black/20 p-3"><p className="text-[.65rem] uppercase tracking-wider text-[#777494]">{text("shop.xpEarned")}</p><p className="tnum mt-1 text-lg font-bold text-white">{user.xp.toLocaleString()} XP</p></div><div className="rounded-xl border border-gold-400/20 bg-gold-400/[.06] p-3"><p className="text-[.65rem] uppercase tracking-wider text-gold-200/70">{text("shop.storeXP")}</p><p className="tnum mt-1 text-lg font-bold text-gold-300">{user.xpBalance.toLocaleString()} XP</p></div></div>
    </header>
    <PerksStore xpBalance={user.xpBalance} ownedKeys={owned.map((item) => item.rewardKey)} equippedTitle={user.equippedTitle} equippedFrame={user.equippedFrame} equippedLogo={user.equippedLogo} equippedColor={user.equippedColor} equippedIcon={user.equippedIcon} displayName={user.displayName} avatarHue={user.avatarHue} avatarUrl={user.avatarUrl} />
  </div>;
}
