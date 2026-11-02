"use client";

import Link from "next/link";
import { useLanguage } from "./language-provider";

export function LegalLinks({ className = "" }: { className?: string }) {
  const { t } = useLanguage();
  return <nav className={`legal-links ${className}`} aria-label={t("Jogi információk")}>
    <Link href="/privacy">{t("Adatkezelési tájékoztató")}</Link>
    <span aria-hidden="true">·</span>
    <Link href="/terms">{t("Felhasználási feltételek")}</Link>
  </nav>;
}
