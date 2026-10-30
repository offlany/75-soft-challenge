import SoftChallengeApp from "@/components/soft-challenge-app";
import { LanguageProvider } from "@/components/language-provider";

export default function HomePage() {
  return <LanguageProvider><SoftChallengeApp /></LanguageProvider>;
}
