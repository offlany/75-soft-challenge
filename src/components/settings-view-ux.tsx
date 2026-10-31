"use client";

import { CalendarDays, Check, CheckCircle2, Edit3, ImagePlus, Plus, Trash2 } from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { challengeEndDate, formatDate, isMealPlanDate, makeId, mealAssignmentsOutsideChallenge, type ChallengeSettings, type CustomHabit, type SoftState } from "@/lib/soft-challenge";
import { parseSoftState, serializeSoftState } from "@/lib/soft-state-io";
import { useLanguage } from "./language-provider";

const baseHabitLabels = [["movement", "Mozgás", "30 perc mozgás"], ["reading", "Olvasás", "10 oldal vagy 30 perc"], ["water", "Víz", "Napi cél"], ["mindful", "Tudatos étkezés", "Figyelmesen, jelenléttel"]] as const;
const habitCategories = ["Mozgás", "Táplálkozás", "Mentális jóllét", "Saját fókusz"];
const isStaticMode = process.env.NEXT_PUBLIC_STATIC_MODE === "true";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  const { t } = useLanguage();
  return <label className="field"><span>{t(label)}</span>{children}</label>;
}

export default function SettingsViewUx({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { t } = useLanguage();
  const settings = state.settings;
  const [draft, setDraft] = useState<ChallengeSettings>({ ...settings, customHabits: settings.customHabits ?? [] });
  const [notice, setNotice] = useState("");
  const [newHabitName, setNewHabitName] = useState("");
  const [newHabitCategory, setNewHabitCategory] = useState(habitCategories[3]);
  const [editingHabitId, setEditingHabitId] = useState("");
  const [editingHabitName, setEditingHabitName] = useState("");
  const [editingHabitCategory, setEditingHabitCategory] = useState(habitCategories[3]);

  useEffect(() => setDraft({ ...settings, customHabits: settings.customHabits ?? [] }), [settings]);

  const save = () => {
    const movedOutsideRange = draft.startDate !== settings.startDate && mealAssignmentsOutsideChallenge(draft, state.assignments).length;
    if (movedOutsideRange && !window.confirm(`${movedOutsideRange} ${t("étkezési terv a kihívás új időszakán kívülre kerül. Törlöd ezeket az étkezéseket?")}`)) {
      setNotice(t("A kezdődátum nem változott."));
      return;
    }
    onUpdate((current) => ({ ...current, settings: draft, assignments: movedOutsideRange ? current.assignments.filter((assignment) => isMealPlanDate(draft, assignment.date)) : current.assignments }));
    setNotice("A beállításaid mentve.");
    window.setTimeout(() => setNotice(""), 2500);
  };

  const addHabit = (event: FormEvent) => {
    event.preventDefault();
    const name = newHabitName.trim();
    if (!name) return;
    setDraft((current) => ({ ...current, customHabits: [...(current.customHabits ?? []), { id: makeId("habit"), name, category: newHabitCategory }] }));
    setNewHabitName("");
  };

  const startEditHabit = (habit: CustomHabit) => {
    setEditingHabitId(habit.id);
    setEditingHabitName(habit.name);
    setEditingHabitCategory(habit.category);
  };

  const saveHabit = () => {
    const name = editingHabitName.trim();
    if (!editingHabitId || !name) return;
    setDraft((current) => ({ ...current, customHabits: (current.customHabits ?? []).map((habit) => habit.id === editingHabitId ? { ...habit, name, category: editingHabitCategory } : habit) }));
    setEditingHabitId("");
  };

  const removeHabit = (habit: CustomHabit) => {
    if (!window.confirm(`${t("Eltávolítod a(z)")} „${habit.name}” ${t("saját szokást?")}`)) return;
    setDraft((current) => ({ ...current, customHabits: (current.customHabits ?? []).filter((item) => item.id !== habit.id) }));
    if (editingHabitId === habit.id) setEditingHabitId("");
  };

  const exportData = () => {
    const blob = new Blob([serializeSoftState(state)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "75-soft-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const importData = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const imported = parseSoftState(String(reader.result));
      setNotice(imported ? "A mentés visszaállítva." : "A fájl nem tartalmaz érvényes mentést.");
      if (imported) onUpdate(() => imported);
    };
    reader.readAsText(file);
  };

  return <div className="page-enter">
    <div className="page-heading"><div><div className="eyebrow">{t("BEÁLLÍTÁSOK")}</div><h1>{t("Beállítások")}</h1></div>{notice ? <span className="saved-notice"><CheckCircle2 size={18} /> {t(notice)}</span> : <button className="primary-button" type="button" onClick={save}>{t("Változtatások mentése")} <Check size={18} /></button>}</div>
    <div className="settings-layout"><div>
      <section className="card settings-card"><div className="card-heading"><div><div className="eyebrow">{t("ALAPADATOK")}</div><h3>{t("A kihívás idővonala")}</h3></div><span className="round-icon lavender"><CalendarDays size={19} /></span></div><div className="form-grid three"><Field label="Kezdő dátum"><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field><Field label="Kezdés időpontja"><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field><Field label="Befejezés"><input value={formatDate(challengeEndDate(draft.startDate), { year: "numeric", month: "long", day: "numeric" })} readOnly /></Field></div></section>
      <section className="card settings-card custom-settings-card"><div className="card-heading"><div><div className="eyebrow">{t("SAJÁT SZOKÁSOK")}</div><h3>{t("Saját szokások")}</h3></div><span className="round-icon"><Plus size={20} /></span></div><form className="custom-habit-form settings-custom-form" onSubmit={addHabit}><input value={newHabitName} onChange={(event) => setNewHabitName(event.target.value)} placeholder={t("pl. 10 perc nyújtás")} aria-label={t("Saját szokás neve")} /><select value={newHabitCategory} onChange={(event) => setNewHabitCategory(event.target.value)} aria-label={t("Saját szokás kategóriája")}>{habitCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select><button type="submit" className="secondary-button" disabled={!newHabitName.trim()}><Plus size={18} /> {t("Hozzáadás")}</button></form><div className="settings-custom-list">{(draft.customHabits ?? []).length ? (draft.customHabits ?? []).map((habit) => editingHabitId === habit.id ? <div className="custom-habit-edit-row" key={habit.id}><input value={editingHabitName} onChange={(event) => setEditingHabitName(event.target.value)} aria-label={t("Saját szokás neve szerkesztéshez")} /><select value={editingHabitCategory} onChange={(event) => setEditingHabitCategory(event.target.value)} aria-label={t("Saját szokás kategóriája szerkesztéshez")}>{habitCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select><button type="button" className="primary-button" onClick={saveHabit}>{t("Mentés")}</button><button type="button" className="icon-button" onClick={() => setEditingHabitId("")} aria-label={t("Szerkesztés megszakítása")}>×</button></div> : <div className="settings-custom-row" key={habit.id}><span><strong>{habit.name}</strong><small>{t(habit.category)}</small></span><button type="button" className="icon-button" onClick={() => startEditHabit(habit)} aria-label={`${habit.name} ${t("szerkesztése")}`}><Edit3 size={18} /></button><button type="button" className="icon-button danger-icon" onClick={() => removeHabit(habit)} aria-label={`${habit.name} ${t("eltávolítása")}`}><Trash2 size={18} /></button></div>) : <p className="custom-habit-empty">{t("Még nincs saját szokásod. Adj hozzá egyet a napi naplóhoz.")}</p>}</div></section>
    </div><aside>
      <section className="card settings-card settings-goals-card"><div className="eyebrow">{t("CÉLOK ÉS RUGALMASSÁG")}</div><Field label="Víz cél (liter / nap)"><input type="number" min="0.5" step="0.25" value={draft.waterTarget} onChange={(event) => setDraft({ ...draft, waterTarget: Number(event.target.value) })} /></Field><Field label="Progress kép minden ennyi napban"><input type="number" min="1" value={draft.pictureInterval} onChange={(event) => setDraft({ ...draft, pictureInterval: Math.max(1, Number(event.target.value)) })} /></Field><label className="toggle-row progress-picture-setting"><input type="checkbox" checked={draft.includeDayOnePicture} onChange={(event) => setDraft({ ...draft, includeDayOnePicture: event.target.checked })} /><span className="toggle" /><span><strong>{t("Induló kép az 1. napon")}</strong><small>{draft.includeDayOnePicture ? t("Első progress kép: az indulás napján esedékes.") : t("Az első kép a beállított időköz szerint lesz esedékes.")}</small></span></label><p className="setting-help"><ImagePlus size={16} /> {t("A progress kép emlékeztető a kihívás haladásáról. Ha az induló kép be van kapcsolva, az első kép nem későbbi emlékeztető, hanem az indulás napjának képe.")}</p></section>
      <section className="card settings-card data-card"><div className="eyebrow">{t("ADATBIZTONSÁG")}</div><h3>{t("Helyi mentés")}</h3><p className="muted">{t(isStaticMode ? "A GitHub Pages változat IndexedDB-ben tárolja az adatokat, localStorage tartalékkal. Készíts időnként saját biztonsági mentést." : "A helyi változat SQLite adatbázisban tárolja az adatokat. Készíts időnként saját biztonsági mentést.")}</p><div className="data-actions"><button type="button" className="secondary-button" onClick={exportData}>{t("Exportálás")}</button><label className="secondary-button">{t("Importálás")}<input type="file" accept="application/json" hidden onChange={importData} /></label></div></section>
    </aside></div>
  </div>;
}
