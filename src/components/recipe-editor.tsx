"use client";

import { ArrowDown, ArrowUp, Check, Plus, Trash2, X } from "lucide-react";
import { FormEvent, useState } from "react";
import { makeId, type Ingredient, type Recipe } from "@/lib/soft-challenge";
import { useLanguage } from "./language-provider";

const categories = ["Reggeli", "Csirkés és húsos", "Halas", "Húsmentes", "Többadagos ételek", "Saját receptek"];
const ingredientCategories = ["Hús és hal", "Tejtermékek és tojás", "Zöldségek és gyümölcsök", "Szárazáruk", "Fűszerek és szószok", "Konzervek", "Egyéb"];

function createDraft(recipe?: Recipe): Recipe {
  return recipe ? { ...recipe, ingredients: recipe.ingredients.map((item) => ({ ...item })), instructions: [...recipe.instructions] } : {
    id: makeId("recipe"),
    name: "",
    category: "Saját receptek",
    description: "",
    ingredients: [],
    servings: 2,
    activeMinutes: 20,
    totalMinutes: 30,
    mealPrep: false,
    storage: "",
    freezable: false,
    favorite: false,
    instructions: []
  };
}

export function RecipeEditor({ recipe, onSave, onCancel }: { recipe?: Recipe; onSave: (recipe: Recipe) => void; onCancel: () => void }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState<Recipe>(() => createDraft(recipe));
  const [error, setError] = useState("");

  const update = <K extends keyof Recipe>(key: K, value: Recipe[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateIngredient = <K extends keyof Ingredient>(id: string, key: K, value: Ingredient[K]) => setDraft((current) => ({ ...current, ingredients: current.ingredients.map((item) => item.id === id ? { ...item, [key]: value } : item) }));
  const addIngredient = () => setDraft((current) => ({ ...current, ingredients: [...current.ingredients, { id: makeId("ingredient"), name: "", quantity: 1, unit: "g", category: "Egyéb" }] }));
  const removeIngredient = (id: string) => setDraft((current) => ({ ...current, ingredients: current.ingredients.filter((item) => item.id !== id) }));
  const addInstruction = () => setDraft((current) => ({ ...current, instructions: [...current.instructions, ""] }));
  const updateInstruction = (index: number, value: string) => setDraft((current) => ({ ...current, instructions: current.instructions.map((item, itemIndex) => itemIndex === index ? value : item) }));
  const removeInstruction = (index: number) => setDraft((current) => ({ ...current, instructions: current.instructions.filter((_, itemIndex) => itemIndex !== index) }));
  const moveInstruction = (index: number, offset: number) => setDraft((current) => {
    const nextIndex = index + offset;
    if (nextIndex < 0 || nextIndex >= current.instructions.length) return current;
    const instructions = [...current.instructions];
    [instructions[index], instructions[nextIndex]] = [instructions[nextIndex], instructions[index]];
    return { ...current, instructions };
  });

  const save = (event: FormEvent) => {
    event.preventDefault();
    const name = draft.name.trim();
    const ingredients = draft.ingredients.map((item) => ({ ...item, name: item.name.trim(), unit: item.unit.trim(), category: item.category.trim() }));
    const instructions = draft.instructions.map((item) => item.trim());
    const invalidIngredient = ingredients.some((item) => !item.name || !item.unit || !item.category || !Number.isFinite(item.quantity) || item.quantity <= 0);
    if (!name || invalidIngredient || !ingredients.length || !instructions.length || instructions.some((item) => !item)) {
      setError(t("Adj meg nevet, legalább egy pozitív hozzávalót és egy elkészítési lépést."));
      return;
    }
    setError("");
    onSave({ ...draft, name, ingredients, instructions, servings: Math.max(1, Math.floor(draft.servings)), activeMinutes: Math.max(0, Math.floor(draft.activeMinutes)), totalMinutes: Math.max(0, Math.floor(draft.totalMinutes)) });
  };

  return <form className="card recipe-editor" onSubmit={save}>
    <div className="recipe-editor-header"><div><div className="eyebrow">{t(recipe ? "SAJÁT RECEPT SZERKESZTÉSE" : "SAJÁT RECEPT")}</div><h3>{t(recipe ? "Recept szerkesztése" : "Új recept")}</h3></div><button type="button" className="icon-button" onClick={onCancel} aria-label={t("Bezárás")}><X size={19} /></button></div>
    <div className="form-grid two"><label className="field"><span>{t("Recept neve")}</span><input required value={draft.name} onChange={(event) => update("name", event.target.value)} /></label><label className="field"><span>{t("Kategória")}</span><select value={draft.category} onChange={(event) => update("category", event.target.value)}>{categories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select></label></div>
    <label className="field"><span>{t("Leírás")}</span><textarea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder={t("Rövid leírás a receptről")} /></label>
    <div className="form-grid three"><label className="field"><span>{t("Adagok")}</span><input type="number" min="1" step="1" value={draft.servings} onChange={(event) => update("servings", Number(event.target.value))} /></label><label className="field"><span>{t("Aktív idő (perc)")}</span><input type="number" min="0" step="1" value={draft.activeMinutes} onChange={(event) => update("activeMinutes", Number(event.target.value))} /></label><label className="field"><span>{t("Teljes idő (perc)")}</span><input type="number" min="0" step="1" value={draft.totalMinutes} onChange={(event) => update("totalMinutes", Number(event.target.value))} /></label></div>
    <section className="recipe-editor-section"><div className="recipe-editor-section-head"><div><div className="eyebrow">{t("HOZZÁVALÓK")}</div><h4>{t("Hozzávalók")}</h4></div><button type="button" className="secondary-button" onClick={addIngredient}><Plus size={17} /> {t("Hozzávaló hozzáadása")}</button></div>{draft.ingredients.length ? <div className="recipe-ingredient-editor">{draft.ingredients.map((item) => <div className="recipe-ingredient-row" key={item.id}><input aria-label={t("Hozzávaló neve")} value={item.name} placeholder={t("pl. paradicsom")} onChange={(event) => updateIngredient(item.id, "name", event.target.value)} /><input aria-label={t("Mennyiség")} type="number" min="0.01" step="0.01" value={item.quantity} onChange={(event) => updateIngredient(item.id, "quantity", Number(event.target.value))} /><input aria-label={t("Mértékegység")} value={item.unit} placeholder="g" onChange={(event) => updateIngredient(item.id, "unit", event.target.value)} /><select aria-label={t("Bevásárlási kategória")} value={item.category} onChange={(event) => updateIngredient(item.id, "category", event.target.value)}>{ingredientCategories.map((category) => <option key={category} value={category}>{t(category)}</option>)}</select><button type="button" className="icon-button danger-icon" onClick={() => removeIngredient(item.id)} aria-label={t("Hozzávaló törlése")}><Trash2 size={17} /></button></div>)}</div> : <p className="muted">{t("Adj hozzá legalább egy hozzávalót.")}</p>}</section>
    <section className="recipe-editor-section"><div className="recipe-editor-section-head"><div><div className="eyebrow">{t("ELKÉSZÍTÉS")}</div><h4>{t("Elkészítési lépések")}</h4></div><button type="button" className="secondary-button" onClick={addInstruction}><Plus size={17} /> {t("Lépés hozzáadása")}</button></div>{draft.instructions.length ? <div className="recipe-instruction-editor">{draft.instructions.map((instruction, index) => <div className="recipe-instruction-row" key={`instruction-${index}`}><span>{index + 1}.</span><textarea aria-label={`${t("Elkészítési lépés")} ${index + 1}`} value={instruction} onChange={(event) => updateInstruction(index, event.target.value)} /><button type="button" className="icon-button" disabled={index === 0} onClick={() => moveInstruction(index, -1)} aria-label={t("Lépés feljebb")}><ArrowUp size={16} /></button><button type="button" className="icon-button" disabled={index === draft.instructions.length - 1} onClick={() => moveInstruction(index, 1)} aria-label={t("Lépés lejjebb")}><ArrowDown size={16} /></button><button type="button" className="icon-button danger-icon" onClick={() => removeInstruction(index)} aria-label={t("Lépés törlése")}><Trash2 size={16} /></button></div>)}</div> : <p className="muted">{t("Adj hozzá legalább egy elkészítési lépést.")}</p>}</section>
    <div className="form-grid two"><label className="field"><span>{t("Tárolás")}</span><input value={draft.storage} onChange={(event) => update("storage", event.target.value)} placeholder={t("pl. 3 nap hűtőben")} /></label><label className="toggle-row recipe-editor-toggle"><input type="checkbox" checked={draft.mealPrep} onChange={(event) => update("mealPrep", event.target.checked)} /><span className="toggle" /><span><strong>{t("Főzési adag")}</strong><small>{t("Több étkezéshez is felhasználható.")}</small></span></label></div><label className="toggle-row recipe-editor-toggle"><input type="checkbox" checked={draft.freezable} onChange={(event) => update("freezable", event.target.checked)} /><span className="toggle" /><span><strong>{t("Fagyasztható")}</strong><small>{t("A recept lefagyasztható.")}</small></span></label>
    {error ? <p className="form-error" role="alert">{error}</p> : null}<div className="recipe-editor-actions"><button type="button" className="secondary-button" onClick={onCancel}>{t("Mégsem")}</button><button type="submit" className="primary-button"><Check size={17} /> {t("Recept mentése")}</button></div>
  </form>;
}
