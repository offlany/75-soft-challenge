import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = { title: "Privacy Notice · 75 soft" };

export default function PrivacyPage() {
  return <LanguageProvider><LegalPage kind="privacy" /></LanguageProvider>;
}
