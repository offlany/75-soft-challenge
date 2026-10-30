"use client";

import { Check, Circle, Edit3, Heart } from "lucide-react";
import { isCustomHabitComplete, type ChallengeSettings, type DayLog } from "@/lib/soft-challenge";
import { useLanguage } from "./language-provider";

export function CustomHabitsCard({ settings, log, onUpdate }: { settings: ChallengeSettings; log?: DayLog; onUpdate: (patch: Partial<DayLog>) => void }) {
  const { t } = useLanguage();
  const habits = settings.customHabits ?? [];
  if (!habits.length) return null;

  const toggle = (habitId: string) => onUpdate({ customHabits: { ...(log?.customHabits ?? {}), [habitId]: !isCustomHabitComplete(habitId, log) } });

  return <section className="card custom-habits-card" data-testid="custom-habits-card">
    <div className="card-heading"><div><div className="eyebrow">{t("SAJÁT SZOKÁSOK")}</div><h3>{t("Amit te választottál")}</h3><p className="muted">{t("Ezek a szokások minden nap megjelennek a naplódban.")}</p></div><span className="round-icon lavender"><Heart size={18} /></span></div>
    <div className="custom-habit-daily-list">{habits.map((habit) => { const complete = isCustomHabitComplete(habit.id, log); return <button type="button" className={`custom-habit-daily-row ${complete ? "complete" : ""}`} key={habit.id} onClick={() => toggle(habit.id)}><span className="custom-habit-check">{complete ? <Check size={15} /> : <Circle size={15} />}</span><span><strong>{habit.name}</strong><small>{t(habit.category)}</small></span><Edit3 size={15} className="custom-habit-edit-hint" /></button>; })}</div>
  </section>;
}
