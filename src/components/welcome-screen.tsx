"use client";

import { Cloud, Leaf, LogIn, ShieldCheck, UserRound } from "lucide-react";
import { useLanguage } from "./language-provider";
import LanguageSwitcher from "./language-switcher";
import { LegalLinks } from "./legal-links";
import type { CloudSyncController } from "@/lib/use-cloud-sync";

export default function WelcomeScreen({ sync, onGuest }: { sync: CloudSyncController; onGuest: () => void }) {
  const { t } = useLanguage();
  const signingIn = sync.status === "signing-in";
  return <main className="welcome-screen">
    <section className="welcome-hero">
      <div className="welcome-brand"><span className="brand-mark"><Leaf size={22} /></span><span><strong>75 soft</strong><small>{t("napi tervező")}</small></span></div>
      <div className="welcome-hero-copy"><div className="eyebrow light">{t("75 NAPOS KIHÍVÁS")}</div><h1>{t("A saját")}<br /><em>{t("ritmusodban.")}</em></h1><p>{t("Egy nyugodtabb, követhetőbb hely a szokásaidnak, étkezéseidnek és a haladásodnak.")}</p></div>
      <div className="welcome-hero-foot"><span><ShieldCheck size={17} /> {t("Adataid felett te rendelkezel")}</span><span><Cloud size={17} /> {t("Google vagy böngészős mentés")}</span></div>
    </section>
    <section className="welcome-panel">
      <div className="welcome-panel-head"><div><div className="eyebrow">{t("ÜDVÖZLÜNK")}</div><h2>{t("Hogyan szeretnél továbbmenni?")}</h2><p>{t("Válaszd ki, hol szeretnéd tárolni a kihívásod adatait.")}</p></div><LanguageSwitcher /></div>
      <div className="welcome-choices">
        <button type="button" className="welcome-choice welcome-choice-primary" onClick={() => { void sync.signIn(); }} disabled={!sync.configured || signingIn}>
          <span className="welcome-choice-icon"><Cloud size={25} /></span><span className="welcome-choice-copy"><strong>{t("Folytatás Google-fiókkal")}</strong><small>{t("A kihívásod adatai szinkronizálódnak az eszközeid között. Telefonon és számítógépen is folytathatod.")}</small>{!sync.configured ? <em>{t("A Google-szinkronizálás ezen a példányon nincs konfigurálva.")}</em> : null}{sync.status === "error" && sync.errorKey ? <em role="alert">{t(sync.errorKey)}</em> : null}</span><LogIn size={20} />
        </button>
        <button type="button" className="welcome-choice" onClick={onGuest}>
          <span className="welcome-choice-icon"><UserRound size={25} /></span><span className="welcome-choice-copy"><strong>{t("Folytatás bejelentkezés nélkül")}</strong><small>{t("Adataid ebben a böngészőben maradnak. Más eszközön nem jelennek meg automatikusan, és a böngészőadatok törlésekor elveszhetnek.")}</small></span>
        </button>
      </div>
      <p className="welcome-storage-note"><ShieldCheck size={16} /> {t("Vendég módban az adatok IndexedDB-ben, localStorage tartalékban maradnak. JSON biztonsági mentést bármikor készíthetsz a Beállításokban.")}</p>
      <LegalLinks className="welcome-legal" />
    </section>
  </main>;
}
