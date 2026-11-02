import type { Metadata } from "next";
import LegalPage from "@/components/legal-page";
import { LanguageProvider } from "@/components/language-provider";

export const metadata: Metadata = { title: "Terms of Use · 75 soft" };

export default function TermsPage() {
  return <LanguageProvider><LegalPage kind="terms" /></LanguageProvider>;
}
