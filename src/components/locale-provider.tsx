"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import { normalizeLocale, t, type Locale } from "@/lib/i18n";

const LocaleContext = createContext<Locale>("en");

export function LocaleProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  useEffect(() => {
    const dir = locale === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = locale;
    document.documentElement.dir = dir;
    document.body.dir = dir;
  }, [locale]);
  return <LocaleContext.Provider value={normalizeLocale(locale)}><div lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={locale === "ar" ? "font-arabic" : undefined}>{children}</div></LocaleContext.Provider>;
}

export function useLocale() {
  const locale = useContext(LocaleContext);
  return { locale, t: (key: string, values?: Record<string, string | number>) => t(locale, key, values) };
}
