"use client";

import { Activity, ArrowRight, BookOpen, Check, CheckCircle2, Droplets, Heart, Plus, Sparkles, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { makeId, type ChallengeSettings, type CustomHabit, type HabitId } from "@/lib/soft-challenge";

const habitLabels: Record<HabitId, { title: string; detail: string; icon: typeof Activity }> = {
  movement: { title: "Mozgás", detail: "30 perc mozgás", icon: Activity },
  reading: { title: "Olvasás", detail: "10 oldal vagy 30 perc", icon: BookOpen },
  water: { title: "Víz", detail: "Napi cél", icon: Droplets },
  mindful: { title: "Tudatos étkezés", detail: "Figyelmesen, jelenléttel", icon: Heart }
};

const habitCategories = ["Mozgás", "Táplálkozás", "Mentális jóllét", "Saját fókusz"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="field"><span>{label}</span>{children}</label>;
}

function HabitIcon({ icon: Icon }: { icon: typeof Activity }) {
  return <span className="habit-icon"><Icon size={19} strokeWidth={1.8} /></span>;
}

export default function OnboardingForm({ settings, onStart }: { settings: ChallengeSettings; onStart: (settings: ChallengeSettings) => void }) {
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
      <div className="onboarding-orbit orbit-one" />
      <div className="onboarding-orbit orbit-two" />
      <div className="onboarding-spark"><Sparkles size={30} /></div>
      <div className="onboarding-copy">
        <div className="eyebrow light">SZOKÁSOK, AMIK TÉGED TÁMOGATNAK</div>
        <h1>75 nap, ami<br /><em>rólad szól.</em></h1>
        <p>Egy nyugodtabb, tudatosabb ritmus kialakítása apró, következetes lépésekkel.</p>
        <div className="onboarding-quote">„Nem a tökéletesség a cél. A jelenlét.”</div>
      </div>
      <div className="onboarding-art-foot"><span><CheckCircle2 size={17} /> Saját tempó</span><span><CheckCircle2 size={17} /> Rugalmas szabályok</span><span><CheckCircle2 size={17} /> Privát, helyi adatok</span></div>
    </div>
    <div className="onboarding-panel">
      <div className="onboarding-panel-head">
        <div className="brand-lockup"><div className="brand-mark"><Sparkles size={21} /></div><div><strong>75 soft</strong><span>wellness planner</span></div></div>
        <div className="onboarding-stepper" aria-label="Onboarding, 1. lépés a 2-ből">
          <div className="stepper-track"><span className="active" /><span /></div>
          <div><strong>1. lépés / 2</strong><small>Alapok és szokások</small></div>
        </div>
      </div>
      <div className="onboarding-form">
        <div className="eyebrow">KEZDJÜK A SAJÁT RITMUSODDAL</div>
        <h2>Állítsd be a kihívásod</h2>
        <p className="muted onboarding-intro">Válaszd ki, mi segítsen a mindennapokban. Később bármikor finomhangolhatod.</p>
        <div className="form-grid"><Field label="Kezdő dátum"><input data-testid="onboarding-start-date" type="date" value={draft.startDate} onChange={(event) => update("startDate", event.target.value)} /></Field><Field label="Kezdés időpontja"><input type="time" value={draft.startTime} onChange={(event) => update("startTime", event.target.value)} /></Field></div>
        <section className="setup-block onboarding-section">
          <div className="setup-section-heading"><div><div className="setup-label">NAPI SZOKÁSOK</div><p>Kapcsold be az alapokat, amelyek tényleg támogatnak.</p></div><span className="section-count">{Object.values(draft.habits).filter(Boolean).length} kiválasztva</span></div>
          <div className="setup-habits">{(Object.keys(habitLabels) as HabitId[]).map((habit) => { const item = habitLabels[habit]; return <button type="button" key={habit} className={`setup-habit ${draft.habits[habit] ? "selected" : ""}`} onClick={() => toggleHabit(habit)}><HabitIcon icon={item.icon} /><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="check-box">{draft.habits[habit] ? <Check size={15} /> : null}</span></button>; })}</div>
        </section>
        <section className="setup-block custom-habit-builder onboarding-section">
          <div className="setup-section-heading"><div><div className="setup-label">SAJÁT SZOKÁSOK</div><p>Add hozzá azt, ami neked fontos.</p></div><span className="section-count">{(draft.customHabits ?? []).length} saját</span></div>
          <form className="custom-habit-form" onSubmit={addCustomHabit}><input data-testid="custom-habit-name" value={newHabitName} onChange={(event) => setNewHabitName(event.target.value)} placeholder="pl. 10 perc nyújtás" aria-label="Saját szokás neve" /><select value={newHabitCategory} onChange={(event) => setNewHabitCategory(event.target.value)} aria-label="Saját szokás kategóriája">{habitCategories.map((category) => <option key={category}>{category}</option>)}</select><button type="submit" className="secondary-button" disabled={!newHabitName.trim()}><Plus size={16} /> Hozzáadás</button></form>
          {(draft.customHabits ?? []).length ? <div className="custom-habit-chips">{(draft.customHabits ?? []).map((habit) => <div className="custom-habit-chip" key={habit.id}><span><strong>{habit.name}</strong><small>{habit.category}</small></span><button type="button" aria-label={`${habit.name} eltávolítása`} onClick={() => removeCustomHabit(habit.id)}><Trash2 size={15} /></button></div>)}</div> : <p className="custom-habit-empty">A saját szokásaid itt jelennek meg, és a napi naplóban is követhetők lesznek.</p>}
        </section>
        <div className="form-grid"><Field label="Víz cél (liter / nap)"><div className="input-with-suffix"><input type="number" min="0.5" step="0.25" value={draft.waterTarget} onChange={(event) => update("waterTarget", Number(event.target.value))} /><span>L</span></div></Field><Field label="Progress kép gyakorisága"><div className="input-with-suffix"><input type="number" min="1" step="1" value={draft.pictureInterval} onChange={(event) => update("pictureInterval", Math.max(1, Number(event.target.value)))} /><span>naponta</span></div></Field></div>
        <div className="onboarding-options-grid">
          <Field label="Heti pihenőnap"><select value={draft.restDay} onChange={(event) => update("restDay", event.target.value)}>{["hétfő", "kedd", "szerda", "csütörtök", "péntek", "szombat", "vasárnap"].map((day) => <option key={day}>{day}</option>)}</select></Field>
          <label className="toggle-row picture-toggle"><input type="checkbox" checked={draft.includeDayOnePicture} onChange={(event) => update("includeDayOnePicture", event.target.checked)} /><span className="toggle" /><span><strong>Induló kép az 1. napon</strong><small>{draft.includeDayOnePicture ? "Első progress kép: az indulás napján." : "Az első kép a beállított időköz szerint esedékes."}</small></span></label>
          <label className="toggle-row"><input type="checkbox" checked={draft.skipsEnabled} onChange={(event) => update("skipsEnabled", event.target.checked)} /><span className="toggle" /><span><strong>Engedélyezett kihagyások</strong><small>{draft.skipAllowance} alkalom / {draft.skipScope === "het" ? "hét" : "kihívás"}</small></span></label>
        </div>
        <div className="form-actions"><button data-testid="start-challenge" type="button" className="primary-button wide" onClick={() => onStart(draft)}>Challenge indítása <ArrowRight size={18} /></button><p>Az adataid csak ezen az eszközön maradnak.</p></div>
      </div>
    </div>
  </div>;
}
