"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";

type LocaleContextValue = { locale: Locale; setLocale: (locale: Locale) => void };
const LocaleContext = createContext<LocaleContextValue>({ locale: "en", setLocale: () => undefined });

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [activeLocale, setActiveLocale] = useState<Locale>(() => normalizeLocale(locale));
  useEffect(() => {
    const dir = activeLocale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = activeLocale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [activeLocale]);
  return <LocaleContext.Provider key={normalizeLocale(locale)} value={{ locale: activeLocale, setLocale: setActiveLocale }}><div lang={activeLocale} dir={activeLocale === "ar" ? "rtl" : "ltr"} className={activeLocale === "ar" ? "font-arabic" : undefined}>{children}</div></LocaleContext.Provider>;
}

export function useLocale() {
  const { locale, setLocale } = useContext(LocaleContext);
  return { locale, setLocale, t: (key: string, values?: Record<string, string | number>) => t(locale, key, values) };
}
