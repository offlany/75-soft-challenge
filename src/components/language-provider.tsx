"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectBrowserLocale, readPreferredLocale, savePreferredLocale, setLocale, translate, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  changeLocale: (locale: Locale) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>(() => {
    const initial = readPreferredLocale() ?? detectBrowserLocale();
    setLocale(initial);
    return initial;
  });

  useEffect(() => {
    const preferred = readPreferredLocale() ?? detectBrowserLocale();
    setLocale(preferred);
    setCurrentLocale(preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = (nextLocale: Locale) => {
    setLocale(nextLocale);
    savePreferredLocale(nextLocale);
    setCurrentLocale(nextLocale);
  };

  const value = useMemo(() => ({ locale, changeLocale, t: (value: string) => translate(value, locale) }), [locale]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
