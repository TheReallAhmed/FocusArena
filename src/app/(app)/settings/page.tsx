import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Globe2, Settings2 } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { normalizeLocale, t } from "@/lib/i18n";
import { LanguageSettings } from "@/components/language-settings";
import { AccountabilitySettings } from "@/components/accountability-settings";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  const locale = normalizeLocale(user.locale);
  return <div className="space-y-5">
    <header><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.22em] text-brand-300"><Settings2 size={14} />{t(locale,"settings.title")}</p><h1 className="mt-1.5 text-2xl font-bold text-white sm:text-3xl">{t(locale,"settings.subtitle")}</h1></header>
    <section className="glass-card p-5 sm:p-6"><div className="mb-4 flex items-center gap-2"><Globe2 size={17} className="text-neon-300"/><div><h2 className="text-sm font-bold text-white">{t(locale,"language.title")}</h2><p className="mt-1 text-xs text-[#8f8cb0]">{t(locale,"language.description")}</p></div></div><LanguageSettings initialLocale={locale} /></section>
    <AccountabilitySettings initialEnabled={user.publicAccountability} />
  </div>;
}
