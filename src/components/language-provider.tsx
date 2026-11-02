"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { detectBrowserLocale, readPreferredLocale, savePreferredLocale, setLocale, translate, type Locale } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  localePreferenceRevision: number;
  changeLocale: (locale: Locale) => void;
  t: (value: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setCurrentLocale] = useState<Locale>("hu");
  const [localePreferenceRevision, setLocalePreferenceRevision] = useState(0);

  useEffect(() => {
    const preferred = readPreferredLocale() ?? detectBrowserLocale();
    setLocale(preferred);
    setCurrentLocale((current) => current === preferred ? current : preferred);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const changeLocale = useCallback((nextLocale: Locale) => {
    setLocale(nextLocale);
    savePreferredLocale(nextLocale);
    setLocalePreferenceRevision((revision) => revision + 1);
    setCurrentLocale((current) => current === nextLocale ? current : nextLocale);
  }, []);

  const value = useMemo(() => ({ locale, localePreferenceRevision, changeLocale, t: (value: string) => translate(value, locale) }), [changeLocale, locale, localePreferenceRevision]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
