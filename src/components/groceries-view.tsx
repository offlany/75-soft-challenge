"use client";

import { ArrowLeft, ArrowRight, Check, ClipboardCheck, Edit3, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";
import { addDays, aggregateGroceries, challengePhase, formatDate, localDateString, makeId, weekStart, type SoftState } from "@/lib/soft-challenge";
import { localizeIngredientCategory, localizeIngredientName } from "@/lib/recipe-localization";
import { useLanguage } from "./language-provider";

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  const { t } = useLanguage();
  return <div className="page-heading"><div><div className="eyebrow">{t(eyebrow)}</div><h1>{t(title)}</h1></div>{action}</div>;
}

export function GroceriesView({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { locale, t } = useLanguage();
  const [selectedWeek, setSelectedWeek] = useState(() => challengePhase(state.settings) === "upcoming" ? weekStart(state.settings.startDate) : weekStart(localDateString()));
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [editingId, setEditingId] = useState("");
  const [editingName, setEditingName] = useState("");
  const [editingQuantity, setEditingQuantity] = useState("1");
  const groceries = aggregateGroceries(state, selectedWeek);
  const grouped = groceries.reduce<Record<string, typeof groceries>>((accumulator, item) => { const category = item.key.startsWith("manual-") ? item.category : localizeIngredientCategory(item.category, locale); (accumulator[category] ||= []).push(item); return accumulator; }, {});
  const displayName = (item: typeof groceries[number]) => item.key.startsWith("manual-") ? item.name : localizeIngredientName(item.name, locale);
  const number = new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", { maximumFractionDigits: 2 });
  const remaining = groceries.filter((item) => !state.groceryStatus[item.key]?.purchased && !state.groceryStatus[item.key]?.pantry).length;

  const addItem = (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number(newQty);
    if (!newItem.trim() || !Number.isFinite(quantity) || quantity <= 0) return;
    onUpdate((current) => ({ ...current, manualGroceries: [...current.manualGroceries, { id: makeId("grocery"), name: newItem.trim(), quantity, unit: "db", category: "Egyéb" }] }));
    setNewItem("");
    setNewQty("1");
  };
  const startEdit = (item: SoftState["manualGroceries"][number]) => { setEditingId(item.id); setEditingName(item.name); setEditingQuantity(String(item.quantity)); };
  const saveEdit = (event: FormEvent) => {
    event.preventDefault();
    const quantity = Number(editingQuantity);
    if (!editingId || !editingName.trim() || !Number.isFinite(quantity) || quantity <= 0) return;
    onUpdate((current) => ({ ...current, manualGroceries: current.manualGroceries.map((item) => item.id === editingId ? { ...item, name: editingName.trim(), quantity } : item) }));
    setEditingId("");
  };
  const removeItem = (id: string) => {
    if (!window.confirm(t("Törlöd ezt a kézzel hozzáadott tételt?"))) return;
    onUpdate((current) => ({ ...current, manualGroceries: current.manualGroceries.filter((item) => item.id !== id), groceryStatus: Object.fromEntries(Object.entries(current.groceryStatus).filter(([key]) => key !== `manual-${id}`)) }));
    if (editingId === id) setEditingId("");
  };
  const toggle = (key: string, type: "purchased" | "pantry") => onUpdate((current) => ({ ...current, groceryStatus: { ...current.groceryStatus, [key]: { ...current.groceryStatus[key], [type]: !current.groceryStatus[key]?.[type] } } }));
  const displayWeek = `${formatDate(selectedWeek, { month: "short", day: "numeric" })} – ${formatDate(addDays(selectedWeek, 6), { month: "short", day: "numeric" })}`;

  return <div className="page-enter"><PageHeader eyebrow="BEVÁSÁRLÓLISTA" title="Bevásárlólista" action={<div className="grocery-actions"><div className="week-switcher"><button type="button" onClick={() => setSelectedWeek(addWeek(selectedWeek, -1))} aria-label={t("Előző hét")}><ArrowLeft size={18} /></button><strong>{displayWeek}</strong><button type="button" onClick={() => setSelectedWeek(addWeek(selectedWeek, 1))} aria-label={t("Következő hét")}><ArrowRight size={18} /></button></div><div className="list-actions"><button className="secondary-button" type="button" onClick={() => { void navigator.clipboard?.writeText(groceries.map((item) => `${displayName(item)} – ${number.format(item.quantity)} ${item.unit === "db" && locale === "en" ? "pcs" : item.unit}`).join("\n")); }}><ClipboardCheck size={18} /> {t("Másolás")}</button><button className="primary-button" type="button" onClick={() => window.print()}><ShoppingBasket size={18} /> {t("Nyomtatás")}</button></div></div>} /><div className="grocery-scope-note" role="status">{t("A lista a kiválasztott hét főzési terveiből és az oda beosztott maradék adagokból készül.")}</div><div className="grocery-summary"><div><span>{t("Összes tétel")}</span><strong>{groceries.length}</strong></div><div><span>{t("Még szükséges")}</span><strong>{remaining}</strong></div><div><span>{t("Beszerzési kategória")}</span><strong>{Object.keys(grouped).length}</strong></div><div className="grocery-summary-art"><ShoppingBasket size={28} /></div></div><div className="grocery-layout"><section className="card grocery-card"><div className="card-heading"><div><div className="eyebrow">{t("TERVEZETT HOZZÁVALÓK")}</div><h3>{t("Hozzávalók kategóriánként")}</h3></div><span className="completion-pill">{groceries.length - remaining} / {groceries.length} {t("kész")}</span></div>{Object.keys(grouped).length ? Object.entries(grouped).map(([category, items]) => <div className="grocery-group" key={category}><h4>{category}</h4>{items.map((item) => { const status = state.groceryStatus[item.key] ?? {}; return <div className={`grocery-row ${status.purchased || status.pantry ? "done" : ""}`} key={item.key}><button type="button" className={`grocery-check ${status.purchased ? "checked" : ""}`} onClick={() => toggle(item.key, "purchased")} aria-label={`${displayName(item)} ${t("Megjelölés beszerzettként")}`}>{status.purchased ? <Check size={14} /> : null}</button><span><strong>{displayName(item)}</strong><small>{status.pantry ? t("Otthon van") : status.purchased ? t("Beszerezve") : t("Még szükséges")}</small></span><strong className="grocery-qty">{number.format(item.quantity)} {item.unit === "db" && locale === "en" ? "pcs" : item.unit}</strong><button type="button" className={`pantry-button ${status.pantry ? "active" : ""}`} onClick={() => toggle(item.key, "pantry")}>{status.pantry ? t("otthon van") : t("van otthon?")}</button></div>; })}</div>) : <div className="empty-state large"><ShoppingBasket size={30} /><strong>{t("A listád még üres")}</strong><p>{t("Adj hozzá egy főzési adagot a Heti menüben.")}</p></div>}</section><aside className="card manual-grocery"><div className="eyebrow">{t("SAJÁT TÉTEL")}</div><h3>{t("Egyéb tétel")}</h3><form onSubmit={addItem}><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder={t("pl. mosogatógép tabletta")} /><div><input type="number" min="0.01" step="0.01" value={newQty} onChange={(event) => setNewQty(event.target.value)} aria-label={t("Mennyiség")} /><span>{locale === "hu" ? "db" : "pcs"}</span><button type="submit" aria-label={t("Hozzáadás")}><Plus size={18} /></button></div></form><div className="manual-grocery-list">{state.manualGroceries.map((item) => editingId === item.id ? <form className="manual-grocery-edit" key={item.id} onSubmit={saveEdit}><input value={editingName} onChange={(event) => setEditingName(event.target.value)} aria-label={t("Tétel neve")} /><input type="number" min="0.01" step="0.01" value={editingQuantity} onChange={(event) => setEditingQuantity(event.target.value)} aria-label={t("Mennyiség")} /><button type="submit" className="icon-button" aria-label={t("Mentés")}><Check size={17} /></button><button type="button" className="icon-button" onClick={() => setEditingId("")} aria-label={t("Mégsem")}><XIcon /></button></form> : <div className="manual-grocery-item" key={item.id}><span>{item.name}<small>{number.format(item.quantity)} db</small></span><button type="button" className="icon-button" onClick={() => startEdit(item)} aria-label={`${item.name} ${t("szerkesztése")}`}><Edit3 size={16} /></button><button type="button" className="icon-button danger-icon" onClick={() => removeItem(item.id)} aria-label={`${item.name} ${t("eltávolítása")}`}><Trash2 size={16} /></button></div>)}</div><p className="muted small">{t("A kézzel hozzáadott tételek is megmaradnak a következő alkalomra.")}</p></aside></div></div>;
}

function addWeek(value: string, amount: number): string {
  const date = new Date(`${value}T00:00:00`);
  date.setDate(date.getDate() + amount * 7);
  return weekStart(`${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}-${`${date.getDate()}`.padStart(2, "0")}`);
}

function XIcon() {
  return <span aria-hidden="true">×</span>;
}
