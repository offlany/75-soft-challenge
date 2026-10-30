"use client";

import { Activity, ArrowRight, BookOpen, Check, CheckCircle2, Droplets, Heart, Leaf, Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { makeId, type ChallengeSettings, type CustomHabit, type HabitId } from "@/lib/soft-challenge";
import { translateDay } from "@/lib/i18n";
import LanguageSwitcher from "./language-switcher";
import { useLanguage } from "./language-provider";

const habitLabels: Record<HabitId, { title: string; detail: string; icon: typeof Activity }> = {
  movement: { title: "Mozgás", detail: "30 perc mozgás", icon: Activity },
  reading: { title: "Olvasás", detail: "10 oldal vagy 30 perc", icon: BookOpen },
  water: { title: "Víz", detail: "Napi cél", icon: Droplets },
  mindful: { title: "Tudatos étkezés", detail: "Figyelmesen, jelenléttel", icon: Heart }
};

const habitCategories = ["Mozgás", "Táplálkozás", "Mentális jóllét", "Saját fókusz"];
const restDays = ["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  return <label className="field"><span>{t(label)}</span>{children}</label>;
}

function HabitIcon({ icon: Icon }: { icon: typeof Activity }) {
  return <span className="habit-icon"><Icon size={19} strokeWidth={1.8} /></span>;
}

export default function OnboardingForm({ settings, onStart }: { settings: ChallengeSettings; onStart: (settings: ChallengeSettings) => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<ChallengeSettings>({ ...settings, customHabits: settings.customHabits ?? [] });
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState(habitCategories[3]);

  const update = <K extends keyof ChallengeSettings>(key: K, value: ChallengeSettings[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleHabit = (habit: HabitId) => {
    setDraft((current) => ({ ...current, habits: { ...current.habits, [habit]: !current.habits[habit] } }));
  };

  const addCustomHabit = (event: FormEvent) => {
    event.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;
    const customHabit: CustomHabit = { id: makeId("habit"), name, category: newHabitCategory };
    setDraft((current) => ({ ...current, customHabits: [...(current.customHabits ?? []), customHabit] }));
    setNewHabitName("");
  };

  const removeCustomHabit = (habitId: string) => {
    setDraft((current) => ({ ...current, customHabits: (current.customHabits ?? []).filter((habit) => habit.id !== habitId) }));
  };

  return <div className="onboarding">
    <div className="onboarding-art">
      <div className="onboarding-botanical" aria-hidden="true"><Leaf size={88} strokeWidth={1.1} /></div>
      <div className="onboarding-copy">
        <div className="eyebrow light">{t("75 NAPOS KIHÍVÁS")}</div>
        <h1>{t("A saját")}<br /><em>{t("ritmusodban.")}</em></h1>
        <p>{t("Állítsd be a szokásaidat, és kövesd a haladásodat egy helyen.")}</p>
      </div>
      <div className="onboarding-art-foot"><span><CheckCircle2 size={17} /> {t("Saját beállítások")}</span><span><CheckCircle2 size={17} /> {t("Helyi mentés")}</span></div>
    </div>
    <div className="onboarding-panel">
      <div className="onboarding-panel-head">
        <div className="brand-lockup"><div className="brand-mark"><Leaf size={21} /></div><div><strong>75 soft</strong><span>{t("NAPI TERVEZŐ")}</span></div></div>
        <div className="onboarding-panel-actions"><LanguageSwitcher /></div>
      </div>
      <div className="onboarding-form">
        <div className="eyebrow">{t("ELSŐ BEÁLLÍTÁS")}</div>
        <h2>{t("Állítsd be a 75 napos kihívásodat")}</h2>
        <p className="muted onboarding-intro">{t("A kihívás később is szerkeszthető a beállításokban.")}</p>
        <div className="form-grid"><Field label="Kezdő dátum"><input data-testid="onboarding-start-date" type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label="Kezdés időpontja"><input type="time" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field></div>
        <section className="setup-block onboarding-section">
          <div className="setup-section-heading"><div><div className="setup-label">{t("NAPI SZOKÁSOK")}</div><p>{t("Kapcsold be az alapokat, amelyek tényleg támogatnak.")}</p></div><span className="section-count">{Object.values(draft.habits).filter(Boolean).length} {t("kiválasztva")}</span></div>
          <div className="setup-habits">{(Object.keys(habitLabels) as HabitId[]).map((habit) => { const item = habitLabels[habit]; return <button type="button" key={habit} className={`setup-habit ${draft.habits[habit] ? "selected" : ""}`} onClick={() => toggleHabit(habit)}><HabitIcon icon={item.icon} /><span><strong>{t(item.title)}</strong><small>{t(item.detail)}</small></span><span className="check-box">{draft.habits[habit] ? <Check size={15} /> : null}</span></button>; })}</div>
        </section>
        <section className="setup-block custom-habit-builder onboarding-section">
          <div className="setup-section-heading"><div><div className="setup-label">{t("SAJÁT SZOKÁSOK")}</div><p>{t("Add hozzá azt, ami neked fontos.")}</p></div><span className="section-count">{(draft.customHabits ?? []).length} {t("saját")}</span></div>
          <form className="custom-habit-form" onSubmit={addCustomHabit}><input data-testid="custom-habit-name" value={newHabitName} onChange={(event) => setNewHabitName(event.target.value)} placeholder={t("pl. 10 perc nyújtás")} aria-label={t("Saját szokás neve")} /><select value={newHabitCategory} onChange={(event) => setNewHabitCategory(event.target.value)} aria-label={t("Saját szokás kategóriája")}>{habitCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select><button type="submit" className="secondary-button" disabled={!newHabitName.trim()}><Plus size={16} /> {t("Hozzáadás")}</button></form>
          {(draft.customHabits ?? []).length ? <div className="custom-habit-chips">{(draft.customHabits ?? []).map((habit) => <div className="custom-habit-chip" key={habit.id}><span><strong>{habit.name}</strong><small>{t(habit.category)}</small></span><button type="button" aria-label={`${habit.name} ${t("eltávolítása")}`} onClick={() => removeCustomHabit(habit.id)}><Trash2 size={15} /></button></div>)}</div> : <p className="custom-habit-empty">{t("A saját szokásaid itt jelennek meg, és a napi naplóban is követhetők lesznek.")}</p>}
        </section>
        <div className="form-grid"><Field label="Víz cél (liter / nap)"><div className="input-with-suffix"><input type="number" min="0.5" step="0.25" value={draft.waterTarget} onChange={(event) => update("waterTarget", Number(event.target.value))} /><span>L</span></div></Field><Field label="Progress kép gyakorisága"><div className="input-with-suffix"><input type="number" min="1" step="1" value={draft.pictureInterval} onChange={(event) => update("pictureInterval", Math.max(1, Number(event.target.value)))} /><span>{t("naponta")}</span></div></Field></div>
        <div className="onboarding-options-grid">
          <Field label="Heti pihenőnap"><select value={draft.restDay} onChange={(event) => update("restDay", event.target.value)}>{restDays.map((day) => <option key={day} value={day}>{translateDay(day)}</option>)}</select></Field>
          <label className="toggle-row picture-toggle"><input type="checkbox" checked={draft.includeDayOnePicture} onChange={(event) => update("includeDayOnePicture", event.target.checked)} /><span className="toggle" /><span><strong>{t("Induló kép az 1. napon")}</strong><small>{draft.includeDayOnePicture ? t("Első progress kép: az indulás napján.") : t("Az első kép a beállított időköz szerint esedékes.")}</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={draft.skipsEnabled} onChange={(event) => update("skipsEnabled", event.target.checked)} /><span className="toggle" /><span><strong>{t("Engedélyezett kihagyások")}</strong><small>{draft.skipAllowance} {t("alkalom")} / {t(draft.skipScope === "het" ? "hét" : "kihívás")}</small></span></label>
        </div>
        <div className="form-actions"><button data-testid="start-challenge" type="button" className="primary-button wide" onClick={() => onStart(draft)}>{t("Kihívás indítása")} <ArrowRight size={18} /></button><p>{t("Az adataid csak ezen az eszközön maradnak.")}</p></div>
      </div>
    </div>
  </div>;
}
