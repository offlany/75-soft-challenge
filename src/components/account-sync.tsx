"use client";

import { AlertTriangle, Cloud, Download, LogIn, LogOut, RefreshCw, ShieldCheck, Trash2, UserCircle2, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "./language-provider";
import type { CloudSyncController, MigrationChoice } from "@/lib/use-cloud-sync";

function statusLabel(sync: CloudSyncController, t: (value: string) => string): string {
  if (!sync.configured) return t("Csak helyben");
  if (sync.status === "signing-in") return t("Bejelentkezés…");
  if (sync.status === "syncing") return t("Szinkronizálás…");
  if (sync.status === "synced") return t("Szinkronizálva");
  if (sync.status === "offline") return t("Offline");
  if (sync.status === "error") return t("Szinkronizálás sikertelen");
  return t("Vendég mód");
}

function initials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.trim() || "75";
  return source.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

export function AccountControl({ sync }: { sync: CloudSyncController }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const label = sync.user?.displayName || sync.user?.email || t("Google-fiók");

  return <div className="account-control">
    <button type="button" className={`account-trigger ${sync.user ? "signed-in" : ""}`} onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-haspopup="dialog">
      {sync.user ? <span className="account-avatar">{initials(sync.user.displayName, sync.user.email)}</span> : <UserCircle2 size={19} />}
      <span className="account-trigger-copy"><strong>{sync.user ? label : t("Vendég mód")}</strong><small><span className={`sync-indicator ${sync.status}`} />{statusLabel(sync, t)}</small></span>
    </button>
    {open ? <div className="account-menu" role="dialog" aria-label={t("Fiók")}>
      <div className="account-menu-heading"><span className="round-icon lavender"><Cloud size={18} /></span><div><strong>{t("Fiók és szinkronizálás")}</strong><small>{statusLabel(sync, t)}</small></div><button type="button" className="icon-button" onClick={() => setOpen(false)} aria-label={t("Bezárás")}><X size={17} /></button></div>
      {sync.configured ? sync.user ? <>
        <p className="account-email">{sync.user.email ?? sync.user.displayName}</p>
        <p className="account-note"><ShieldCheck size={16} /> {t("A kihívás adatai ezen a Google-fiókon belül szinkronizálódnak.")}</p>
        <p className="account-note">{t("A progress képek fotói csak ezen az eszközön maradnak meg; a felhőbe csak a dátum és a megjegyzés kerül.")}</p>
        {sync.status === "error" ? <button type="button" className="secondary-button full-button" onClick={sync.retry}><RefreshCw size={16} /> {t("Újrapróbálás")}</button> : null}
        <button type="button" className="secondary-button full-button" onClick={() => { void sync.signOut(); setOpen(false); }}><LogOut size={16} /> {t("Kijelentkezés")}</button>
        <button type="button" className="danger-button full-button" onClick={() => { if (window.confirm(t("Törlöd a Google-fiókod cloud adatait? Ez kijelentkeztet, de a Firebase-fiókod megmarad."))) void sync.deleteCloudData(); }}><Trash2 size={16} /> {t("Cloud adatok törlése és kijelentkezés")}</button>
        <button type="button" className="danger-button full-button" onClick={() => { if (window.confirm(t("Véglegesen törlöd a Google-fiókodat és az ismert cloud adataidat? Ez nem vonható vissza."))) void sync.deleteAccount(); }}><Trash2 size={16} /> {t("Google-fiók törlése")}</button>
      </> : <>
        <p className="account-note">{t("Google-fiókkal több eszközön is elérheted a kihívásodat. Vendég módban minden adat csak ebben a böngészőben marad.")}</p>
        {sync.status === "error" && sync.errorKey ? <p className="account-error" role="alert">{t(sync.errorKey)}</p> : null}
        <button type="button" className="primary-button full-button" onClick={() => { void sync.signIn(); }} disabled={sync.status === "signing-in"}><LogIn size={17} /> {t("Bejelentkezés Google-fiókkal")}</button>
      </> : <>
        <p className="account-note">{t("A Google-szinkronizálás ezen a példányon még nincs konfigurálva. Az alkalmazás vendég módban, IndexedDB-ben működik tovább.")}</p>
        <span className="local-only-badge"><ShieldCheck size={16} /> {t("Csak helyben mentve")}</span>
      </>}
    </div> : null}
  </div>;
}

export function AccountSection({ sync }: { sync?: CloudSyncController }) {
  const { t } = useLanguage();
  if (!sync) return null;
  return <section className="card settings-card account-section"><div className="card-heading"><div><div className="eyebrow">{t("FIÓK")}</div><h3>{t("Fiók és szinkronizálás")}</h3></div><span className="round-icon lavender"><Cloud size={20} /></span></div>
    {sync.user ? <><p className="account-email">{sync.user.email ?? sync.user.displayName}</p><div className="account-status-line"><span className={`sync-indicator ${sync.status}`} />{statusLabel(sync, t)}</div><p className="account-note"><ShieldCheck size={16} /> {t("A progress képek fotói csak ezen az eszközön maradnak meg; a felhőbe csak a dátum és a megjegyzés kerül.")}</p>{sync.status === "error" && sync.errorKey ? <p className="account-error" role="alert">{t(sync.errorKey)}</p> : null}<div className="account-section-actions"><button type="button" className="secondary-button" onClick={sync.downloadBackup}><Download size={16} /> {t("Helyi mentés letöltése")}</button><button type="button" className="secondary-button" onClick={() => { void sync.signOut(); }}><LogOut size={16} /> {t("Kijelentkezés")}</button><button type="button" className="danger-button" onClick={() => { if (window.confirm(t("Törlöd a Google-fiókod cloud adatait? Ez kijelentkeztet, de a Firebase-fiókod megmarad."))) void sync.deleteCloudData(); }}><Trash2 size={16} /> {t("Cloud adatok törlése és kijelentkezés")}</button><button type="button" className="danger-button" onClick={() => { if (window.confirm(t("Véglegesen törlöd a Google-fiókodat és az ismert cloud adataidat? Ez nem vonható vissza."))) void sync.deleteAccount(); }}><Trash2 size={16} /> {t("Google-fiók törlése")}</button></div></> : sync.configured ? <><p className="account-note">{t("Google-fiókkal több eszközön is elérheted a kihívásodat. Vendég módban minden adat csak ebben a böngészőben marad.")}</p>{sync.status === "error" && sync.errorKey ? <p className="account-error" role="alert">{t(sync.errorKey)}</p> : null}<button type="button" className="primary-button" onClick={() => { void sync.signIn(); }} disabled={sync.status === "signing-in"}><LogIn size={17} /> {t("Bejelentkezés Google-fiókkal")}</button></> : <><p className="account-note">{t("A Google-szinkronizálás ezen a példányon még nincs konfigurálva. Az alkalmazás vendég módban, IndexedDB-ben működik tovább.")}</p><span className="local-only-badge"><ShieldCheck size={16} /> {t("Csak helyben mentve")}</span></>}
  </section>;
}

function MigrationChoiceButton({ choice, label, detail, onClick, primary = false }: { choice: MigrationChoice; label: string; detail: string; onClick: (choice: MigrationChoice) => void; primary?: boolean }) {
  return <button type="button" className={`migration-choice ${primary ? "primary" : ""}`} onClick={() => onClick(choice)}><strong>{label}</strong><small>{detail}</small></button>;
}

export function MigrationDialog({ sync }: { sync: CloudSyncController }) {
  const { t } = useLanguage();
  if (!sync.migration) return null;
  const isBoth = sync.migration.kind === "both";
  const resolve = (choice: MigrationChoice) => { void sync.resolveMigration(choice); };
  return <div className="modal-backdrop migration-backdrop"><section className="migration-dialog" role="dialog" aria-modal="true" aria-labelledby="cloud-migration-title">
    <div className="migration-heading"><span className="round-icon lavender"><Cloud size={20} /></span><div><div className="eyebrow">{t("ADAT-EGYEZTETÉS")}</div><h2 id="cloud-migration-title">{t(isBoth ? "Helyi és felhős adatok találhatók" : "Meglévő helyi kihívás feltöltése?")}</h2></div><AlertTriangle size={22} /></div>
    <p className="migration-copy">{t(isBoth ? "A két helyen eltérő adatok vannak. Válassz, mielőtt bármit felülírnánk; az alkalmazás addig a jelenlegi helyi adatokat mutatja." : "A helyi kihívásod már tartalmaz adatokat. Ments le egy biztonsági másolatot, majd válaszd ki, hogyan szeretnéd folytatni.")}</p>
    <button type="button" className="secondary-button" onClick={sync.downloadBackup}><Download size={16} /> {t("Helyi mentés letöltése")}</button>
    {sync.status === "error" && sync.errorKey ? <p className="account-error" role="alert">{t(sync.errorKey)}</p> : null}
    <div className="migration-choices">
      {isBoth ? <MigrationChoiceButton choice="cloud" label={t("Cloud adatok megtartása")} detail={t("A Google-fiókban lévő adatokat használom ezen az eszközön.")} onClick={resolve} /> : null}
      <MigrationChoiceButton choice="local" label={t("Helyi adatok feltöltése")} detail={t("A mostani böngészős kihívást töltöm fel a Google-fiókba.")} onClick={resolve} primary={!isBoth} />
      {isBoth ? <MigrationChoiceButton choice="merge" label={t("Adatok biztonságos egyesítése")} detail={t("Az eltérő elemeket azonosító alapján egyesítem; azonos elemnél a helyi változat marad.")} onClick={resolve} primary /> : null}
    </div>
    <p className="migration-footnote"><ShieldCheck size={15} /> {t("A művelet hibája esetén az eredeti helyi állapot változatlan marad.")}</p>
    <button type="button" className="text-button" onClick={() => { void sync.signOut(); }}>{t("Mégsem, maradok vendég módban")}</button>
  </section></div>;
}
