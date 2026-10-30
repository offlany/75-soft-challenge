"use client";

import { useLanguage } from "./language-provider";

export default function LanguageSwitcher() {
  const { locale, changeLocale, t } = useLanguage();
  return <div className="language-switcher" role="group" aria-label={t("Válassz nyelvet")}>
    <button type="button" className={locale === "hu" ? "active" : ""} aria-pressed={locale === "hu"} onClick={() => changeLocale("hu")}>HU</button>
    <button type="button" className={locale === "en" ? "active" : ""} aria-pressed={locale === "en"} onClick={() => changeLocale("en")}>EN</button>
  </div>;
}
