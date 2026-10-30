"use client";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardCheck,
  Clock3,
  Droplets,
  Edit3,
  Flame,
  FolderHeart,
  Heart,
  ImagePlus,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShoppingBasket,
  Sparkles,
  Trash2,
  Utensils,
  X
} from "lucide-react";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import {
  addDays,
  aggregateGroceries,
  challengeEndDate,
  completionForDay,
  createInitialState,
  createRestartState,
  dayNumber,
  formatDate,
  isDayHabitComplete,
  localDateString,
  makeId,
  parseLocalDate,
  progressPictureDays,
  statusForDay,
  weekStart,
  type ChallengeSettings,
  type CookingBatch,
  type DayLog,
  type HabitId,
  type MealSlot,
  type Recipe,
  type SoftState
} from "@/lib/soft-challenge";
import { loadBrowserState, saveBrowserState } from "@/lib/browser-persistence";
import { parseSoftState, serializeSoftState } from "@/lib/soft-state-io";
import OnboardingForm from "./onboarding-form";
import SettingsViewUx from "./settings-view-ux";
import { CustomHabitsCard } from "./custom-habits-card";
import { ProgressPictureCard } from "./progress-picture-card";
import LanguageSwitcher from "./language-switcher";
import { useLanguage } from "./language-provider";
import { formatCount, translate, translateCategory, translateDay } from "@/lib/i18n";
import { localizeIngredientCategory, localizeIngredientName, localizeRecipe } from "@/lib/recipe-localization";

type View = "overview" | "calendar" | "journal" | "recipes" | "planner" | "groceries" | "progress" | "settings";

const navItems: { id: View; labelKey: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", labelKey: "Áttekintés", icon: LayoutDashboard },
  { id: "calendar", labelKey: "Naptár", icon: CalendarDays },
  { id: "journal", labelKey: "Napi napló", icon: ClipboardCheck },
  { id: "recipes", labelKey: "Receptek", icon: BookOpen },
  { id: "planner", labelKey: "Heti menü", icon: Utensils },
  { id: "groceries", labelKey: "Bevásárlólista", icon: ShoppingBasket },
  { id: "progress", labelKey: "Haladás", icon: BarChart3 },
  { id: "settings", labelKey: "Beállítások", icon: Settings }
];

const habitLabels: Record<HabitId, { title: string; detail: string; icon: typeof Activity }> = {
  movement: { title: "Mozgás", detail: "30 perc mozgás", icon: Activity },
  reading: { title: "Olvasás", detail: "10 oldal vagy 30 perc", icon: BookOpen },
  water: { title: "Víz", detail: "Napi cél", icon: Droplets },
  mindful: { title: "Tudatos étkezés", detail: "Figyelmesen, jelenléttel", icon: Heart }
};

const weekdayNames = ["H", "K", "Sze", "Cs", "P", "Szo", "V"];
const fullWeekdayNames = ["Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat", "Vasárnap"];
const isStaticMode = process.env.NEXT_PUBLIC_STATIC_MODE === "true";

function defaultLog(log?: DayLog): DayLog {
  return log ?? { alcohol: "unknown" };
}

function AppIcon({ icon: Icon, size = 18 }: { icon: typeof Activity; size?: number }) {
  return <Icon size={size} strokeWidth={1.8} />;
}

function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return <div className={`progress-track ${className}`}><div className="progress-fill" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} /></div>;
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return <label className={`field ${className}`}><span>{translate(label)}</span>{children}</label>;
}

function RestartChallengeCard({ onRestart }: { onRestart: () => void }) {
  return <section className="card restart-card"><div className="eyebrow">{translate("ÚJ KIHÍVÁS")}</div><h3>{translate("Kezdd újra biztonságosan")}</h3><p className="muted">{translate("A naplók, étkezési tervek, bevásárlási állapotok és progress képek törlődnek. A receptjeid megmaradnak.")}</p><button type="button" className="danger-button" onClick={onRestart}><Trash2 size={16} /> {translate("Újrakezdés")}</button></section>;
}

function SoftChallengeApp() {
  const { locale, t } = useLanguage();
  const [state, setState] = useState<SoftState>(() => createInitialState());
  const [view, setView] = useState<View>("overview");
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [plannerWeek, setPlannerWeek] = useState(weekStart(localDateString()));
  const [loaded, setLoaded] = useState(false);
  const [saveState, setSaveState] = useState<"mentve" | "mentés…" | "mentés sikertelen" | "helyi mentéssel">("mentve");
  const [storageError, setStorageError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadState = async () => {
      try {
        if (isStaticMode) {
          const result = await loadBrowserState();
          if (!cancelled && result.state) setState(parseSoftState(result.state) ?? createInitialState());
          return;
        }

        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("The local state API is unavailable.");
        const incoming = await response.json() as SoftState;
        if (!cancelled) setState(parseSoftState(incoming) ?? createInitialState());
      } catch {
        try {
          const result = await loadBrowserState();
          if (!cancelled && result.state) setState(parseSoftState(result.state) ?? createInitialState());
          if (!cancelled && !isStaticMode) setStorageError("A helyi SQLite mentés nem érhető el; böngészős biztonsági mentésből töltöttem be az adatokat.");
        } catch {
          if (!cancelled) setStorageError(isStaticMode ? "A böngészős mentés nem érhető el. Ellenőrizd a böngésző tárhelybeállításait." : "A helyi és a böngészős mentés sem érhető el.");
        }
      } finally {
        if (!cancelled) setLoaded(true);
      }
    };
    void loadState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    setSaveState("mentés…");
    const timeout = window.setTimeout(() => {
      const save = async () => {
        try {
          if (isStaticMode) {
            await saveBrowserState(state);
            setStorageError("");
            setSaveState("mentve");
            return;
          }

          const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
          if (!response.ok) throw new Error("The local state API rejected the save.");
          setStorageError("");
          setSaveState("mentve");
        } catch {
          try {
            await saveBrowserState(state);
            setSaveState("helyi mentéssel");
            setStorageError("A helyi SQLite mentés nem sikerült; a böngészős biztonsági mentés elkészült.");
          } catch {
            setSaveState("mentés sikertelen");
            setStorageError("A mentés nem sikerült. Ellenőrizd a böngésző tárhelybeállításait vagy a helyi szervert.");
          }
        }
      };
      void save();
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [state, loaded]);

  const settings = state.settings;
  const today = localDateString();
  const inChallenge = settings.active && dayNumber(settings.startDate, today) >= 1 && dayNumber(settings.startDate, today) <= 75;
  const activeDate = inChallenge ? today : settings.active && today < settings.startDate ? settings.startDate : selectedDate;
  const currentDay = settings.active ? Math.max(1, Math.min(75, dayNumber(settings.startDate, activeDate))) : 0;
  const elapsed = settings.active ? Math.max(0, Math.min(75, dayNumber(settings.startDate, today))) : 0;
  const timePercent = settings.active ? (elapsed / 75) * 100 : 0;
  const log = defaultLog(state.logs[activeDate]);
  const dailyCompletion = completionForDay(log, settings);
  const pictureDays = progressPictureDays(settings);
  const nextPicture = pictureDays.find((date) => date >= today && !state.photos.some((photo) => photo.date === date));

  const updateState = (updater: (current: SoftState) => SoftState) => setState((current) => updater(current));

  const updateLog = (date: string, patch: Partial<DayLog>) => {
    updateState((current) => ({ ...current, logs: { ...current.logs, [date]: { ...defaultLog(current.logs[date]), ...patch } } }));
  };

  const startChallenge = (nextSettings: ChallengeSettings) => {
    updateState((current) => ({ ...current, settings: { ...nextSettings, active: true } }));
    setSelectedDate(nextSettings.startDate);
    setView("overview");
  };

  const restartChallenge = () => {
    if (!window.confirm(t("Újrakezdöd a kihívást? Ez törli a naplókat, terveket és progress képeket, de a receptjeid megmaradnak."))) return;
    const nextState = createRestartState(state);
    updateState(() => nextState);
    setSelectedDate(nextState.settings.startDate);
    setView("overview");
  };

  const goToDate = (date: string) => {
    setSelectedDate(date);
    setView("journal");
    setMobileOpen(false);
  };

  if (!loaded) return <div className="app-loading"><div className="brand-mark"><Sparkles size={22} /></div><p>{t("Betöltés…")}</p></div>;
  if (!settings.active) return <OnboardingForm settings={settings} onStart={startChallenge} />;

  return (
    <div className="soft-app-shell" data-locale={locale}>
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><Sparkles size={20} /></div>
          <div><strong>75 soft</strong><span>wellness planner</span></div>
        </div>
        <div className="sidebar-label">{t("MENÜ")}</div>
        <nav className="side-nav">
          {navItems.map(({ id, labelKey, icon }) => {
            const Icon = icon;
            return <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileOpen(false); }}><AppIcon icon={Icon} /><span>{t(labelKey)}</span>{id === "journal" && dailyCompletion < 100 ? <i /> : null}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-goal"><div className="mini-goal-head"><span>{t("75 napos cél")}</span><strong>{Math.round(timePercent)}%</strong></div><ProgressBar value={timePercent} /><small>{currentDay}. {t("nap a 75-ből")}</small></div>
          <button type="button" className="profile-chip"><span className="avatar">75</span><span className="profile-copy"><strong>{t("Saját kihívás")}</strong><small>{t("Helyi profil")}</small></span><MoreHorizontal size={16} /></button>
        </div>
      </aside>
      {mobileOpen ? <button aria-label={t("Menü bezárása")} className="mobile-scrim" type="button" onClick={() => setMobileOpen(false)} /> : null}
      <main className="app-main">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label={t("Menü megnyitása")}><Menu size={20} /></button>
          <div className="breadcrumb"><span>75 soft</span><ChevronDown size={14} /><strong>{t(navItems.find((item) => item.id === view)?.labelKey ?? "")}</strong></div>
          <div className="topbar-actions"><LanguageSwitcher /><span className="save-status"><span className="save-dot" /> {t(saveState)}</span><button className="icon-button" type="button" aria-label={t("Értesítések")}><Bell size={18} /></button><button className="help-button" type="button"><CircleHelp size={16} /> {t("Segítség")}</button></div>
        </header>
        <div className="content-wrap">
          {storageError ? <div className="storage-warning" role="alert">{t(storageError)}</div> : null}
          {view === "overview" && <Overview state={state} today={activeDate} currentDay={currentDay} elapsed={elapsed} timePercent={timePercent} dailyCompletion={dailyCompletion} nextPicture={nextPicture} onUpdateLog={updateLog} onGoToDate={goToDate} onNavigate={setView} />}
          {view === "overview" && <ProgressPictureCard settings={settings} today={today} nextPicture={nextPicture} photos={state.photos} />}
          {view === "overview" && <CustomHabitsCard settings={settings} log={log} onUpdate={(patch) => updateLog(today, patch)} />}
          {view === "journal" && <Journal state={state} date={selectedDate} onDateChange={setSelectedDate} onUpdateLog={updateLog} onBack={() => setView("overview")} />}
          {view === "journal" && <CustomHabitsCard settings={settings} log={state.logs[selectedDate]} onUpdate={(patch) => updateLog(selectedDate, patch)} />}
          {view === "calendar" && <CalendarView state={state} calendarDate={calendarDate} onCalendarDate={setCalendarDate} onGoToDate={goToDate} />}
          {view === "recipes" && <RecipesView state={state} onUpdate={updateState} />}
          {view === "planner" && <PlannerView state={state} week={plannerWeek} onWeekChange={setPlannerWeek} onUpdate={updateState} />}
          {view === "groceries" && <GroceriesView state={state} onUpdate={updateState} />}
          {view === "progress" && <ProgressView state={state} elapsed={elapsed} />}
          {view === "progress" && <ProgressPhotoFab onUpdate={updateState} />}
          {view === "settings" && <SettingsViewUx state={state} onUpdate={updateState} />}
          {view === "settings" && <RestartChallengeCard onRestart={restartChallenge} />}
        </div>
      </main>
    </div>
  );
}

function Onboarding({ settings, onStart }: { settings: ChallengeSettings; onStart: (settings: ChallengeSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  const set = <K extends keyof ChallengeSettings>(key: K, value: ChallengeSettings[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const toggleHabit = (habit: HabitId) => setDraft((current) => ({ ...current, habits: { ...current.habits, [habit]: !current.habits[habit] } }));
  return <div className="onboarding"><div className="onboarding-art"><div className="onboarding-orbit orbit-one" /><div className="onboarding-orbit orbit-two" /><div className="onboarding-spark"><Sparkles size={28} /></div><div className="onboarding-copy"><div className="eyebrow light">SZOKÁSOK, AMIK TÉGED TÁMOGATNAK</div><h1>75 nap, ami<br /><em>rólad szól.</em></h1><p>Egy nyugodtabb, tudatosabb ritmus kialakítása apró, következetes lépésekkel.</p><div className="onboarding-quote">„Nem a tökéletesség a cél. A jelenlét.”</div></div><div className="onboarding-art-foot"><span><CheckCircle2 size={16} /> Saját tempó</span><span><CheckCircle2 size={16} /> Rugalmas szabályok</span><span><CheckCircle2 size={16} /> Privát, helyi adatok</span></div></div><div className="onboarding-panel"><div className="onboarding-panel-head"><div className="brand-lockup"><div className="brand-mark"><Sparkles size={20} /></div><div><strong>75 soft</strong><span>wellness planner</span></div></div><div className="onboarding-panel-actions"><LanguageSwitcher /></div></div><div className="onboarding-form"><div className="eyebrow">KEZDJÜK A SAJÁT RITMUSODDAL</div><h2>Állítsd be a kihívásod</h2><p className="muted">A kihívás csak akkor indul, amikor te kimondod, hogy készen állsz.</p><div className="form-grid"><Field label="Kezdő dátum"><input type="date" value={draft.startDate} onChange={(event) => set("startDate", event.target.value)} /></Field><Field label="Kezdés időpontja"><input type="time" value={draft.startTime} onChange={(event) => set("startTime", event.target.value)} /></Field></div><div className="setup-block"><div className="setup-label">NAPI SZOKÁSOK</div><div className="setup-habits">{(Object.keys(habitLabels) as HabitId[]).map((habit) => { const item = habitLabels[habit]; return <button type="button" key={habit} className={`setup-habit ${draft.habits[habit] ? "selected" : ""}`} onClick={() => toggleHabit(habit)}><span className="habit-icon"><AppIcon icon={item.icon} size={17} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><span className="check-box">{draft.habits[habit] ? <Check size={14} /> : null}</span></button>; })}</div></div><div className="form-grid"><Field label="Víz cél (liter / nap)"><div className="input-with-suffix"><input type="number" min="0.5" step="0.25" value={draft.waterTarget} onChange={(event) => set("waterTarget", Number(event.target.value))} /><span>L</span></div></Field><Field label="Progress kép gyakorisága"><div className="input-with-suffix"><input type="number" min="1" step="1" value={draft.pictureInterval} onChange={(event) => set("pictureInterval", Math.max(1, Number(event.target.value)))} /><span>naponta</span></div></Field></div><div className="setup-row"><label className="toggle-row"><input type="checkbox" checked={draft.includeDayOnePicture} onChange={(event) => set("includeDayOnePicture", event.target.checked)} /><span className="toggle" /><span><strong>Induló kép hozzáadása</strong><small>Segít észrevenni a változást.</small></span></label><label className="toggle-row"><input type="checkbox" checked={draft.skipsEnabled} onChange={(event) => set("skipsEnabled", event.target.checked)} /><span className="toggle" /><span><strong>Engedélyezett kihagyások</strong><small>{draft.skipAllowance} alkalom / {draft.skipScope === "het" ? "hét" : "kihívás"}</small></span></label></div><div className="form-actions"><button type="button" className="primary-button wide" onClick={() => onStart(draft)}>Challenge indítása <ArrowRight size={17} /></button><p>Az adataid csak ezen az eszközön maradnak.</p></div></div></div></div>;
}

function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  const { t } = useLanguage();
  return <div className="page-heading"><div><div className="eyebrow">{t(eyebrow)}</div><h1>{t(title)}</h1>{description ? <p className="muted">{t(description)}</p> : null}</div>{action}</div>;
}

function Overview({ state, today, currentDay, elapsed, timePercent, dailyCompletion, nextPicture, onUpdateLog, onGoToDate, onNavigate }: { state: SoftState; today: string; currentDay: number; elapsed: number; timePercent: number; dailyCompletion: number; nextPicture?: string; onUpdateLog: (date: string, patch: Partial<DayLog>) => void; onGoToDate: (date: string) => void; onNavigate: (view: View) => void }) {
  const { t, locale } = useLanguage();
  const settings = state.settings;
  const log = defaultLog(state.logs[today]);
  const todayMeals = state.assignments.filter((assignment) => assignment.date === today);
  const getRecipe = (id: string) => { const recipe = state.recipes.find((item) => item.id === id); return recipe ? localizeRecipe(recipe, locale) : undefined; };
  const skipped = Object.values(state.logs).reduce((sum, item) => sum + (item.skips?.length ?? 0), 0);
  const water = new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", { maximumFractionDigits: 2 }).format(log.water ?? 0);
  return <div className="page-enter"><PageHeader eyebrow={formatDate(today, { weekday: "long", month: "long", day: "numeric" }).toUpperCase()} title="Jó reggelt!" description="Ma is egy apró lépéssel közelebb vagy a saját egyensúlyodhoz." action={<button className="secondary-button" type="button" onClick={() => onGoToDate(today)}><ClipboardCheck size={16} /> {t("Mai napló")}</button>} />
    <section className="overview-hero"><div><div className="eyebrow light">{t("75 SOFT CHALLENGE")}</div><h2>{currentDay}. {t("nap")} <span>/ 75</span></h2><p>{formatDate(settings.startDate, { month: "long", day: "numeric" })} – {formatDate(challengeEndDate(settings.startDate), { month: "long", day: "numeric", year: "numeric" })}</p><div className="hero-progress"><div className="hero-progress-head"><span>{t("A kihívás ideje")}</span><strong>{Math.round(timePercent)}%</strong></div><ProgressBar value={timePercent} /><div className="hero-progress-foot"><span>{elapsed} {t("nap eltelt")}</span><span>{Math.max(0, 75 - elapsed)} {t("nap hátra")}</span></div></div></div><div className="hero-ring"><div><strong>{dailyCompletion}%</strong><span>{t("ma teljesítve")}</span></div></div><div className="hero-blobs" /></section>
    <div className="stat-grid"><StatCard icon={Flame} label="Szekvencia" value={`${Math.max(1, elapsed)} ${t("nap")}`} detail="A saját ritmusodban" tone="peach" /><StatCard icon={Droplets} label="Mai víz" value={`${water} L`} detail={`${t("cél")}: ${settings.waterTarget} L`} tone="blue" /><StatCard icon={BookOpen} label="Olvasás" value={`${log.readingPages ?? 0} ${t("oldal")}`} detail={`${log.readingMinutes ?? 0} ${t("perc fókusz")}`} tone="lavender" /><StatCard icon={CheckCircle2} label="Engedélyezett kihagyás" value={`${Math.max(0, settings.skipAllowance - skipped)} ${t("maradt")}`} detail="ezen a kihíváson" tone="green" /></div>
    <div className="dashboard-grid"><section className="card habits-card"><div className="card-heading"><div><div className="eyebrow">{t("MAI FÓKUSZ")}</div><h3>{t("A mai szokásaid")}</h3></div><span className="completion-pill">{dailyCompletion}% {t("kész")}</span></div><div className="habit-list">{(Object.keys(habitLabels) as HabitId[]).filter((habit) => settings.habits[habit]).map((habit) => <HabitRow key={habit} habit={habit} log={log} settings={settings} onUpdate={(patch) => onUpdateLog(today, patch)} />)}</div><button className="text-button" type="button" onClick={() => onGoToDate(today)}>{t("Részletes napló megnyitása")} <ArrowRight size={15} /></button></section>
      <section className="side-stack"><div className="card next-picture-card"><div className="card-heading"><div><div className="eyebrow">{t("KÖVETKEZŐ PROGRESS KÉP")}</div><h3>{t("Következő haladásfotó")}</h3></div><div className="round-icon lavender"><ImagePlus size={17} /></div></div>{nextPicture ? <><div className="picture-date"><strong>{formatDate(nextPicture, { month: "long", day: "numeric" })}</strong><span>{dayNumber(settings.startDate, nextPicture)}. {t("nap")}</span></div><div className="picture-line"><span /><small>{t("még")} {Math.max(0, dayNumber(today, nextPicture))} {t("nap")}</small></div></> : <p className="empty-copy">{t("Minden ütemezett kép megvan.")}</p>}</div><div className="card week-card"><div className="card-heading"><div><div className="eyebrow">{t("EZ A HÉT")}</div><h3>{t("Kis egyensúlyok")}</h3></div><button className="more-button" type="button" onClick={() => onNavigate("progress")} aria-label={t("Haladás")}><MoreHorizontal size={17} /></button></div><div className="week-row"><span className="week-icon green"><Heart size={16} /></span><span><strong>{t("Öngondoskodás")}</strong><small>{Object.values(state.logs).some((item) => item.selfCare) ? t("1 alkalom rögzítve") : t("Még nincs rögzítve")}</small></span><CheckCircle2 className="week-check" size={18} /></div><div className="week-row"><span className="week-icon blue"><Activity size={16} /></span><span><strong>{t("Pihenőnap")}</strong><small>{translateDay(settings.restDay, locale)} · {t("heti szabály")}</small></span><span className="week-status">{t("tervezett")}</span></div></div></section></div>
    <section className="bottom-grid"><div className="card tracker-card"><div className="card-heading"><div><div className="eyebrow">{t("A TELJES ÚT")}</div><h3>{t("75 napos áttekintő")}</h3></div><span className="muted small">{elapsed} / 75 {t("nap")}</span></div><div className="day-grid">{Array.from({ length: 75 }, (_, index) => { const date = addDays(settings.startDate, index); const status = statusForDay(date, settings, state.logs); return <button key={date} type="button" title={formatDate(date, { month: "long", day: "numeric" })} className={`day-tile ${status}`} onClick={() => onGoToDate(date)}><span>{index + 1}</span></button>; })}</div><div className="legend"><span><i className="dot complete" />{t("Kész")}</span><span><i className="dot current" />{t("Ma")}</span><span><i className="dot partial" />{t("Részben")}</span><span><i className="dot skip" />{t("Kihagyva")}</span></div></div><div className="card meals-card"><div className="card-heading"><div><div className="eyebrow">{t("MAI TERV")}</div><h3>{t("Étkezések")}</h3></div><button className="text-button compact" type="button" onClick={() => onNavigate("planner")}>{t("Heti menü")} <ArrowRight size={14} /></button></div>{(["reggeli", "ebed", "vacsora"] as MealSlot[]).map((slot) => { const meal = todayMeals.find((assignment) => assignment.slot === slot); const recipe = meal ? getRecipe(state.batches.find((batch) => batch.id === meal.batchId)?.recipeId ?? "") : undefined; return <div className="meal-line" key={slot}><span className="meal-time">{slot === "reggeli" ? "08:00" : slot === "ebed" ? "12:30" : "19:00"}</span><span className={`meal-thumb ${slot}`}><Utensils size={15} /></span><span><strong>{recipe?.name ?? t("Még nincs betervezve")}</strong><small>{t(slot === "reggeli" ? "Reggeli" : slot === "ebed" ? "Ebéd" : "Vacsora")}</small></span>{meal ? <CheckCircle2 size={17} className="meal-done" /> : <button className="meal-add" type="button" onClick={() => onNavigate("planner")} aria-label={`${t("Étkezések")} ${t("hozzáadása")}`}><Plus size={15} /></button>}</div>; })}</div></section>
  </div>;
}

function StatCard({ icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string }) { const Icon = icon; return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div><span>{translate(label)}</span><strong>{value}</strong><small>{translate(detail)}</small></div></div>; }

function HabitRow({ habit, log, settings, onUpdate }: { habit: HabitId; log: DayLog; settings: ChallengeSettings; onUpdate: (patch: Partial<DayLog>) => void }) { const item = habitLabels[habit]; const Icon = item.icon; const complete = isDayHabitComplete(habit, log, settings); return <div className={`habit-row ${complete ? "complete" : ""}`}><button type="button" className={`habit-check ${complete ? "checked" : ""}`} onClick={() => { if (habit === "mindful") onUpdate({ mindful: !complete }); }} aria-label={`${translate(item.title)} ${translate("bejelölése")}`}>{complete ? <Check size={15} /> : null}</button><span className="habit-row-icon"><Icon size={18} /></span><span className="habit-row-copy"><strong>{translate(item.title)}</strong><small>{habit === "water" ? `${(log.water ?? 0).toFixed(2)} / ${settings.waterTarget} L` : habit === "reading" ? `${log.readingPages ?? 0} ${translate("oldal")} · ${log.readingMinutes ?? 0} ${translate("perc")}` : habit === "movement" ? `${log.exerciseMinutes ?? 0} / 30 ${translate("perc")}` : complete ? translate("Ma megvolt") : translate(item.detail)}</small></span>{habit === "water" ? <div className="habit-input-inline"><input type="number" min="0" step="0.25" value={log.water ?? ""} placeholder="0" onChange={(event) => onUpdate({ water: Number(event.target.value) })} /><span>L</span><button type="button" onClick={() => onUpdate({ water: Math.min(settings.waterTarget, Number(((log.water ?? 0) + 0.25).toFixed(2))) })}>+0,25</button></div> : habit === "reading" ? <div className="habit-inputs"><input aria-label={translate("Oldalak")} type="number" min="0" value={log.readingPages ?? ""} placeholder={translate("oldal")} onChange={(event) => onUpdate({ readingPages: Number(event.target.value) })} /><input aria-label={translate("Percek")} type="number" min="0" value={log.readingMinutes ?? ""} placeholder={translate("perc")} onChange={(event) => onUpdate({ readingMinutes: Number(event.target.value) })} /></div> : habit === "movement" ? <div className="habit-input-inline"><input type="number" min="0" value={log.exerciseMinutes ?? ""} placeholder="0" onChange={(event) => onUpdate({ exerciseMinutes: Number(event.target.value) })} /><span>{translate("perc")}</span></div> : null}</div>; }

function Journal({ state, date, onDateChange, onUpdateLog, onBack }: { state: SoftState; date: string; onDateChange: (date: string) => void; onUpdateLog: (date: string, patch: Partial<DayLog>) => void; onBack: () => void }) {
  const { t } = useLanguage();
  const settings = state.settings;
  const log = defaultLog(state.logs[date]);
  const number = dayNumber(settings.startDate, date);
  const completion = completionForDay(log, settings);
  const selfCare = log.selfCare;
  const usedSkips = Object.values(state.logs).reduce((sum, current) => sum + (current.skips?.length ?? 0), 0);
  const set = (patch: Partial<DayLog>) => onUpdateLog(date, patch);
  const choiceLabels = [{ id: "none", label: "Nem fogyasztottam" }, { id: "yes", label: "Fogyasztottam" }, { id: "unknown", label: "Nincs rögzítve" }];
  return <div className="page-enter"><PageHeader eyebrow="NAPI NAPLÓ" title={`${number}. nap`} description={formatDate(date, { weekday: "long", month: "long", day: "numeric" })} action={<div className="date-switcher"><button type="button" onClick={() => onDateChange(addDays(date, -1))} aria-label={t("Előző nap")}><ArrowLeft size={16} /></button><input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /><button type="button" onClick={() => onDateChange(addDays(date, 1))} aria-label={t("Következő nap")}><ArrowRight size={16} /></button></div>} />
    <div className="journal-layout"><div><div className="journal-summary card"><div className="journal-summary-ring"><strong>{completion}%</strong><span>{t("teljesítve")}</span></div><div><div className="eyebrow">{t("A NAPOD EGY MONDATBAN")}</div><h3>{t(completion === 100 ? "Szép munka, ma jelen voltál." : completion > 0 ? "Már elindultál. Ez számít." : "Mi lenne ma az első apró lépés?")}</h3><p className="muted">{t("A napló minden változtatást azonnal ment.")}</p></div><button type="button" className="secondary-button" onClick={onBack}>{t("Áttekintés")}</button></div>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("SZOKÁSOK")}</div><h3>{t("Mai alapok")}</h3></div><span className="completion-pill">{completion}%</span></div><div className="journal-habit-grid">{(Object.keys(habitLabels) as HabitId[]).filter((habit) => settings.habits[habit]).map((habit) => <JournalHabit key={habit} habit={habit} log={log} settings={settings} usedSkips={usedSkips} onUpdate={set} />)}</div></section>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("MOZGÁS")}</div><h3>{t("Test a maga ritmusában")}</h3></div><span className="round-icon peach"><Activity size={17} /></span></div><div className="form-grid three"><Field label="Időtartam (perc)"><input type="number" min="0" value={log.exerciseMinutes ?? ""} placeholder="30" onChange={(event) => set({ exerciseMinutes: Number(event.target.value) })} /></Field><Field label="Típus"><input value={log.exerciseType ?? ""} placeholder={t("pl. séta, jóga")} onChange={(event) => set({ exerciseType: event.target.value })} /></Field><label className="toggle-row compact-toggle"><input type="checkbox" checked={Boolean(log.restDay)} onChange={(event) => set({ restDay: event.target.checked })} /><span className="toggle" /><span><strong>{t("Pihenőnap")}</strong><small>{t("felmentés a mozgás alól")}</small></span></label></div></section>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("ÖNGONDOSKODÁS")}</div><h3>{t("Valami csak neked")}</h3></div><span className="round-icon green"><Heart size={17} /></span></div><Field label="Milyen tevékenység esett jól?" className="full-field"><input value={selfCare ?? ""} placeholder={t("pl. hosszú fürdő, bőrápolás, séta")} onChange={(event) => set({ selfCare: event.target.value })} /></Field></section></div>
      <aside className="journal-side"><section className="card water-detail"><div className="eyebrow">{t("VÍZKÖVETÉS")}</div><div className="water-big"><Droplets size={21} /><strong>{(log.water ?? 0).toFixed(2)}</strong><span>/ {settings.waterTarget} L</span></div><ProgressBar value={((log.water ?? 0) / settings.waterTarget) * 100} /><div className="quick-adds"><button type="button" onClick={() => set({ water: Math.min(settings.waterTarget, Number(((log.water ?? 0) + 0.25).toFixed(2))) })}>+ 0,25 L</button><button type="button" onClick={() => set({ water: Math.min(settings.waterTarget, Number(((log.water ?? 0) + 0.5).toFixed(2))) })}>+ 0,5 L</button></div></section><section className="card alcohol-card"><div className="card-heading"><div><div className="eyebrow">{t("NEUTRÁLIS NAPLÓ")}</div><h3>{t("Alkoholfogyasztás")}</h3></div><span className="round-icon muted-icon"><GlassIcon /></span></div><div className="choice-stack">{choiceLabels.map((choice) => <label key={choice.id} className="radio-row"><input type="radio" name={`alcohol-${date}`} checked={(log.alcohol ?? "unknown") === choice.id} onChange={() => set({ alcohol: choice.id as DayLog["alcohol"] })} /><span>{t(choice.label)}</span></label>)}</div>{log.alcohol === "yes" ? <Field label="Alkalom / megjegyzés"><input value={log.alcoholOccasion ?? ""} placeholder={t("pl. születésnap")} onChange={(event) => set({ alcoholOccasion: event.target.value })} /></Field> : null}</section><section className="card notes-card"><div className="eyebrow">{t("NAP VÉGI JEGYZET")}</div><textarea value={log.notes ?? ""} placeholder={t("Mi maradt meg ebből a napból?")} onChange={(event) => set({ notes: event.target.value })} /></section></aside>
    </div>
  </div>;
}

function JournalHabit({ habit, log, settings, usedSkips, onUpdate }: { habit: HabitId; log: DayLog; settings: ChallengeSettings; usedSkips: number; onUpdate: (patch: Partial<DayLog>) => void }) { const item = habitLabels[habit]; const skipped = Boolean(log.skips?.includes(habit)); const complete = isDayHabitComplete(habit, log, settings); const canSkip = settings.skipsEnabled && !complete && !skipped && usedSkips < settings.skipAllowance; return <div className="journal-habit"><div className={`journal-habit-icon ${habit}`}><AppIcon icon={item.icon} size={18} /></div><div><strong>{translate(item.title)}</strong><small>{skipped ? translate("Kihagyva – engedélyezett") : complete ? translate("Teljesítve") : translate(item.detail)}</small></div><button className={`habit-check ${complete ? "checked" : ""}`} type="button" onClick={() => { if (habit === "mindful") onUpdate({ mindful: !complete }); }}>{complete ? <Check size={15} /> : null}</button>{habit === "reading" ? <div className="journal-number-inputs"><input type="number" value={log.readingPages ?? ""} placeholder={translate("oldal")} onChange={(event) => onUpdate({ readingPages: Number(event.target.value) })} /><input type="number" value={log.readingMinutes ?? ""} placeholder={translate("perc")} onChange={(event) => onUpdate({ readingMinutes: Number(event.target.value) })} /></div> : null}{canSkip ? <button type="button" className="skip-button" onClick={() => { if (window.confirm(translate("Ezt a szokást engedélyezett kihagyásként jelölöd?"))) onUpdate({ skips: [...(log.skips ?? []), habit] }); }}>{translate("Kihagyom")}</button> : null}</div>; }

function GlassIcon() { return <span className="glass-icon">◒</span>; }

function CalendarView({ state, calendarDate, onCalendarDate, onGoToDate }: { state: SoftState; calendarDate: Date; onCalendarDate: (date: Date) => void; onGoToDate: (date: string) => void }) {
  const { locale, t } = useLanguage();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1);
  const assignmentsForDate = (date: string) => state.assignments.filter((assignment) => assignment.date === date);
  const calendarLocale = locale === "hu" ? "hu-HU" : "en-GB";
  return <div className="page-enter"><PageHeader eyebrow="NAPTÁR" title="A te ritmusod, egy helyen" description="Szokások, étkezések és emlékezetes pillanatok." action={<div className="calendar-controls"><button className="secondary-button" type="button" onClick={() => onCalendarDate(new Date())}>{t("Ma")}</button><button className="icon-button" type="button" onClick={() => onCalendarDate(new Date(year, month - 1, 1))} aria-label={t("Előző hónap")}><ArrowLeft size={16} /></button><button className="icon-button" type="button" onClick={() => onCalendarDate(new Date(year, month + 1, 1))} aria-label={t("Következő hónap")}><ArrowRight size={16} /></button></div>} />
    <div className="calendar-layout"><section className="card calendar-card"><div className="calendar-month"><h3>{new Intl.DateTimeFormat(calendarLocale, { month: "long", year: "numeric" }).format(calendarDate)}</h3><div className="calendar-legend"><span><i className="event-dot challenge" />{t("kihívás")}</span><span><i className="event-dot meal" />{t("étkezés")}</span><span><i className="event-dot photo" />{t("progress kép")}</span></div></div><div className="calendar-weekdays">{fullWeekdayNames.map((day) => <span key={day}>{locale === "hu" ? day : new Intl.DateTimeFormat(calendarLocale, { weekday: "short" }).format(new Date(2024, 0, 1 + fullWeekdayNames.indexOf(day)))}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { if (day < 1 || day > days) return <div className="calendar-cell blank" key={`blank-${index}`} />; const date = `${year}-${`${month + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`; const dayAssignments = assignmentsForDate(date); const isToday = date === localDateString(); const isPicture = progressPictureDays(state.settings).includes(date); const status = state.settings.active ? statusForDay(date, state.settings, state.logs) : "future"; return <button type="button" className={`calendar-cell ${isToday ? "today" : ""}`} key={date} onClick={() => onGoToDate(date)}><div className="cell-date"><strong>{day}</strong>{status === "complete" ? <CheckCircle2 size={14} /> : null}</div>{isPicture ? <span className="calendar-event photo-event"><ImagePlus size={11} /> {t("kép")}</span> : null}{dayAssignments.slice(0, 2).map((assignment) => { const batch = state.batches.find((item) => item.id === assignment.batchId); const rawRecipe = state.recipes.find((item) => item.id === batch?.recipeId); const recipe = rawRecipe ? localizeRecipe(rawRecipe, locale) : undefined; return <span key={assignment.id} className="calendar-event meal-event"><Utensils size={11} />{recipe?.name}</span>; })}</button>; })}</div></section><aside className="calendar-side"><div className="card agenda-card"><div className="eyebrow">{t("KÖVETKEZŐ ESEMÉNYEK")}</div><h3>{t("Ezen a héten")}</h3>{progressPictureDays(state.settings).filter((date) => date >= localDateString()).slice(0, 2).map((date) => <button type="button" className="agenda-item" key={date} onClick={() => onGoToDate(date)}><span className="agenda-date"><strong>{parseLocalDate(date).getDate()}</strong><small>{formatDate(date, { weekday: "short" })}</small></span><span><strong>{t("Progress kép")}</strong><small>{dayNumber(state.settings.startDate, date)}. {t("nap")} · {t("ütemezett")}</small></span><ImagePlus size={16} /></button>)}<button type="button" className="agenda-item" onClick={() => onGoToDate(localDateString())}><span className="agenda-date lavender-date"><CalendarDays size={17} /></span><span><strong>{t("Mai napló")}</strong><small>{t("Jegyezd fel, hogy vagy")}</small></span><ArrowRight size={16} /></button></div><div className="card calendar-tip"><Sparkles size={20} /><strong>{t("Az étkezés is lehet öngondoskodás.")}</strong><p>{t("Tervezd meg előre a hetedet, hogy maradjon hely annak, ami igazán fontos.")}</p></div></aside></div>
  </div>;
}

function RecipesView({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Mindegy");
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Recipe | undefined>();
  const entries = state.recipes.map((raw) => ({ raw, recipe: localizeRecipe(raw, locale) }));
  const categories = ["Mindegy", ...Array.from(new Set(state.recipes.map((recipe) => recipe.category)))];
  const filtered = entries.filter(({ raw, recipe }) => {
    const language = locale === "hu" ? "hu-HU" : "en-GB";
    return (category === "Mindegy" || raw.category === category) && recipe.name.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language));
  });
  const [newName, setNewName] = useState("");
  const [newIngredient, setNewIngredient] = useState("");
  const [newQuantity, setNewQuantity] = useState("100");
  const addRecipe = (event: FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) return;
    const newRecipe: Recipe = { id: makeId("recipe"), name: newName.trim(), category: "Saját receptek", description: "Saját, szerkeszthető recept.", servings: 2, activeMinutes: 20, totalMinutes: 30, mealPrep: false, storage: "2 nap hűtőben", freezable: false, favorite: false, instructions: ["Készítsd elő a hozzávalókat.", "Főzd vagy süsd készre a saját ízlésed szerint."], ingredients: [{ id: makeId("ingredient"), name: newIngredient || "új hozzávaló", quantity: Number(newQuantity) || 100, unit: "g", category: "Egyéb" }] };
    onUpdate((current) => ({ ...current, recipes: [newRecipe, ...current.recipes] }));
    setNewName("");
    setNewIngredient("");
    setShowForm(false);
  };
  return <div className="page-enter">
    <PageHeader eyebrow="RECEPTKÖNYVTÁR" title="Ami jól esik, újra és újra" description={`${state.recipes.length} ${t("recept")} · ${t("szerkeszthető, kereshető, saját ízlésre szabható")}`} action={<button type="button" className="primary-button" onClick={() => setShowForm((value) => !value)}><Plus size={16} /> {t("Új recept")}</button>} />
    {showForm ? <form className="card recipe-form" onSubmit={addRecipe}><div><div className="eyebrow">{t("SAJÁT RECEPT")}</div><h3>{t("Adj hozzá egy kedvencet")}</h3></div><div className="form-grid three"><Field label="Recept neve"><input required value={newName} placeholder={t("pl. Vasárnapi tészta")} onChange={(event) => setNewName(event.target.value)} /></Field><Field label="Első hozzávaló"><input value={newIngredient} placeholder={t("pl. paradicsom")} onChange={(event) => setNewIngredient(event.target.value)} /></Field><Field label="Mennyiség"><input type="number" value={newQuantity} onChange={(event) => setNewQuantity(event.target.value)} /></Field></div><button type="submit" className="primary-button">{t("Recept mentése")} <Check size={16} /></button></form> : null}
    <div className="recipe-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Keress receptet…")} /></div><div className="filter-pills">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{translateCategory(item, locale)}</button>)}</div></div>
    <div className="recipe-grid">{filtered.map(({ raw, recipe }) => <RecipeCard key={raw.id} recipe={recipe} onSelect={setSelected} onFavorite={() => onUpdate((current) => ({ ...current, recipes: current.recipes.map((item) => item.id === raw.id ? { ...item, favorite: !item.favorite } : item) }))} onDelete={() => { if (window.confirm(t("Biztosan törlöd ezt a saját receptet?"))) onUpdate((current) => ({ ...current, recipes: current.recipes.filter((item) => item.id !== raw.id) })); }} />)}</div>
    {selected ? <RecipeModal recipe={selected} onClose={() => setSelected(undefined)} /> : null}
  </div>;
}

function RecipeCard({ recipe, onSelect, onFavorite, onDelete }: { recipe: Recipe; onSelect: (recipe: Recipe) => void; onFavorite: () => void; onDelete: () => void }) { const { locale, t } = useLanguage(); const palette = recipe.category === "Reggeli" || recipe.category === "Breakfast" ? "breakfast" : recipe.category === "Halas" || recipe.category === "Fish" ? "fish" : recipe.category === "Húsmentes" || recipe.category === "Vegetarian" ? "vegetarian" : recipe.category === "Többadagos ételek" || recipe.category === "Batch cooking" ? "batch" : "chicken"; return <article className="recipe-card" onClick={() => onSelect(recipe)}><div className={`recipe-art ${palette}`}><span>{translateCategory(recipe.category, locale)}</span><button type="button" aria-label={t("Kedvenc")} onClick={(event) => { event.stopPropagation(); onFavorite(); }} className={recipe.favorite ? "favorite active" : "favorite"}><Heart size={16} fill={recipe.favorite ? "currentColor" : "none"} /></button><div className="recipe-art-symbol"><Utensils size={28} /></div></div><div className="recipe-card-body"><div className="recipe-card-top"><h3>{recipe.name}</h3><button type="button" className="recipe-more" aria-label={t("Recept törlése")} onClick={(event) => { event.stopPropagation(); onDelete(); }}><MoreHorizontal size={17} /></button></div><p>{recipe.description}</p><div className="recipe-meta"><span><Clock3 size={14} /> {recipe.totalMinutes} {t("perc")}</span><span><Utensils size={14} /> {recipe.servings} {t("adag")}</span>{recipe.mealPrep ? <span className="prep-badge">{t("meal prep")}</span> : null}</div></div></article>; }

function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) { const { t } = useLanguage(); return <div className="modal-backdrop" onClick={onClose}><div className="recipe-modal" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose} aria-label={t("Bezárás")}><X size={18} /></button><div className="recipe-modal-hero"><span>{t(recipe.category)}</span><h2>{recipe.name}</h2><p>{recipe.description}</p><div className="recipe-modal-meta"><span><Clock3 size={15} /> {recipe.activeMinutes} {t("perc")} {t("aktív")}</span><span><Clock3 size={15} /> {recipe.totalMinutes} {t("perc")} {t("összesen")}</span><span><Utensils size={15} /> {recipe.servings} {t("adag")}</span></div></div><div className="recipe-modal-body"><div><div className="eyebrow">{t("HOZZÁVALÓK")}</div><ul className="ingredient-list">{recipe.ingredients.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.quantity} {item.unit}</strong></li>)}</ul></div><div><div className="eyebrow">{t("ELKÉSZÍTÉS")}</div><ol className="instruction-list">{recipe.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></div></div></div></div>; }

function PlannerView({ state, week, onWeekChange, onUpdate }: { state: SoftState; week: string; onWeekChange: (value: string) => void; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { locale, t } = useLanguage();
  const [activeBatch, setActiveBatch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recipeQuery, setRecipeQuery] = useState("");
  const [recipeCategory, setRecipeCategory] = useState("Mindegy");
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [servingsDraft, setServingsDraft] = useState("1");
  const [mealPrepDraft, setMealPrepDraft] = useState(true);
  const [editingBatchId, setEditingBatchId] = useState("");
  const [editingServings, setEditingServings] = useState("1");
  const [editingMealPrep, setEditingMealPrep] = useState(true);
  const [plannerNotice, setPlannerNotice] = useState("");
  const weekDates = Array.from({ length: 7 }, (_, index) => addDays(week, index));
  const batches = state.batches.filter((batch) => batch.weekStart === week);
  const recipeCategories = ["Mindegy", ...Array.from(new Set(state.recipes.map((recipe) => recipe.category)))];
  const filteredRecipes = state.recipes.filter((recipe) => {
    const matchesCategory = recipeCategory === "Mindegy" || recipe.category === recipeCategory;
    const matchesQuery = localizeRecipe(recipe, locale).name.toLocaleLowerCase(locale === "hu" ? "hu-HU" : "en-GB").includes(recipeQuery.toLocaleLowerCase(locale === "hu" ? "hu-HU" : "en-GB"));
    return matchesCategory && matchesQuery;
  });
  const selectedRecipe = state.recipes.find((recipe) => recipe.id === selectedRecipeId);
  const selectedBatch = batches.find((batch) => batch.id === activeBatch);
  const selectedBatchRecipe = selectedBatch ? state.recipes.map((recipe) => localizeRecipe(recipe, locale)).find((recipe) => recipe.id === selectedBatch.recipeId) : undefined;
  const selectedBatchUsed = selectedBatch ? state.assignments.filter((item) => item.batchId === selectedBatch.id).reduce((sum, item) => sum + item.servings, 0) : 0;
  const slotLabels: Record<MealSlot, string> = { reggeli: t("Reggeli"), ebed: t("Ebéd"), vacsora: t("Vacsora") };

  const openPicker = () => {
    setPickerOpen(true);
    setSelectedRecipeId("");
    setRecipeQuery("");
    setRecipeCategory("Mindegy");
    setPlannerNotice("");
  };

  const selectRecipe = (recipe: Recipe) => {
    setSelectedRecipeId(recipe.id);
    setServingsDraft(String(Math.max(1, recipe.servings)));
    setMealPrepDraft(Boolean(recipe.mealPrep));
    setPlannerNotice("");
  };

  const addBatch = () => {
    if (!selectedRecipe) return;
    const servings = Math.max(1, Math.floor(Number(servingsDraft) || 0));
    const existing = batches.find((batch) => batch.recipeId === selectedRecipe.id);
    if (existing) {
      setActiveBatch(existing.id);
      setPickerOpen(false);
      setPlannerNotice(locale === "en" ? "This recipe is already in this week's plan; the existing batch is selected." : "Ez a recept már szerepel ezen a héten; kijelöltem a meglévő batch-et.");
      return;
    }
    const batch = { id: makeId("batch"), recipeId: selectedRecipe.id, weekStart: week, servings, mealPrep: mealPrepDraft };
    onUpdate((current) => ({ ...current, batches: [...current.batches, batch] }));
    setActiveBatch(batch.id);
    setPickerOpen(false);
    setSelectedRecipeId("");
    setPlannerNotice(locale === "en" ? `${localizeRecipe(selectedRecipe, locale).name} was added to the weekly cooking plan.` : `${selectedRecipe.name} bekerült a heti főzési tervbe.`);
  };

  const assign = (date: string, slot: MealSlot) => {
    if (!activeBatch) {
      setPlannerNotice("Előbb válassz ki egy batch-et a heti főzési tervből.");
      return;
    }
    const batch = state.batches.find((item) => item.id === activeBatch);
    if (!batch) return;
    const existing = state.assignments.find((item) => item.date === date && item.slot === slot);
    if (existing?.batchId === activeBatch) {
      onUpdate((current) => ({ ...current, assignments: current.assignments.filter((item) => item.id !== existing.id) }));
      return;
    }
    const assigned = state.assignments.filter((item) => item.batchId === activeBatch).reduce((sum, item) => sum + item.servings, 0);
    if (assigned + 1 > batch.servings) {
      window.alert(t("Ez a főzési adag már elfogyott. Növeld a batch mennyiségét a tervben."));
      return;
    }
    onUpdate((current) => ({
      ...current,
      assignments: [...current.assignments.filter((item) => !(item.date === date && item.slot === slot)), { id: makeId("meal"), date, slot, batchId: activeBatch, servings: 1 }]
    }));
  };

  const removeAssignment = (assignmentId: string) => onUpdate((current) => ({ ...current, assignments: current.assignments.filter((item) => item.id !== assignmentId) }));

  const startBatchEdit = (batch: CookingBatch) => {
    setEditingBatchId(batch.id);
    setEditingServings(String(batch.servings));
    setEditingMealPrep(Boolean(batch.mealPrep));
  };

  const saveBatchEdit = () => {
    const batch = batches.find((item) => item.id === editingBatchId);
    if (!batch) return;
    const used = state.assignments.filter((item) => item.batchId === batch.id).reduce((sum, item) => sum + item.servings, 0);
    const servings = Math.max(used, Math.floor(Number(editingServings) || 0), 1);
    onUpdate((current) => ({ ...current, batches: current.batches.map((item) => item.id === batch.id ? { ...item, servings, mealPrep: editingMealPrep } : item) }));
    setEditingBatchId("");
  };

  const deleteBatch = (batch: CookingBatch) => {
    const recipe = state.recipes.find((item) => item.id === batch.recipeId);
    if (!window.confirm(`${t("Törlöd a(z)")} „${recipe?.name ?? t("ismeretlen recept")}” ${t("batch-et és a hozzá tartozó étkezéseket?")}`)) return;
    onUpdate((current) => ({ ...current, batches: current.batches.filter((item) => item.id !== batch.id), assignments: current.assignments.filter((item) => item.batchId !== batch.id) }));
    if (activeBatch === batch.id) setActiveBatch("");
    if (editingBatchId === batch.id) setEditingBatchId("");
  };

  const changeWeek = (value: string) => {
    setActiveBatch("");
    setEditingBatchId("");
    onWeekChange(value);
  };

  return <div className="page-enter">
    <PageHeader eyebrow="HETI MENÜ" title="Tervezd meg, ami táplál" description="Főzz előre, használj fel mindent, és hagyj helyet a spontaneitásnak." action={<div className="week-switcher"><button type="button" onClick={() => changeWeek(addDays(week, -7))} aria-label={t("Előző hét")}><ArrowLeft size={16} /></button><strong>{formatDate(week, { month: "short", day: "numeric" })} – {formatDate(addDays(week, 6), { month: "short", day: "numeric" })}</strong><button type="button" onClick={() => changeWeek(addDays(week, 7))} aria-label={t("Következő hét")}><ArrowRight size={16} /></button></div>} />
    {plannerNotice ? <div className="planner-notice" role="status">{t(plannerNotice)}</div> : null}
    {selectedBatch && selectedBatchRecipe ? <div className="selected-batch-banner" data-testid="active-batch-banner"><div><span className="eyebrow">{t("KIVÁLASZTOTT BATCH")}</span><strong>{selectedBatchRecipe.name}</strong><small>{selectedBatchUsed} / {selectedBatch.servings} {t("adag felhasználva")} · {t("még")} {Math.max(0, selectedBatch.servings - selectedBatchUsed)} {t("adag")}</small></div><button type="button" className="secondary-button" onClick={() => setActiveBatch("")}>{t("Kijelölés törlése")}</button></div> : <div className="planner-hint">{t("Válassz egy batch-et, majd kattints a naptárban a reggeli, ebéd vagy vacsora mezőjére.")}</div>}
    <div className="planner-layout">
      <section className="card meal-board"><div className="card-heading"><div><div className="eyebrow">{t("HETI ÉTKEZÉSI TERV")}</div><h3>{t("Reggeli · ebéd · vacsora")}</h3></div><span className="muted small">{state.assignments.filter((item) => item.date >= week && item.date <= addDays(week, 6)).length} {t("étkezés tervezve")}</span></div><div className="meal-board-grid"><div className="meal-board-labels"><span /><strong>{t("Reggeli")}</strong><strong>{t("Ebéd")}</strong><strong>{t("Vacsora")}</strong></div>{weekDates.map((date) => <div className="planner-day" key={date}><div className="planner-day-head"><strong>{formatDate(date, { weekday: "short" })}</strong><span>{parseLocalDate(date).getDate()}</span></div>{(["reggeli", "ebed", "vacsora"] as MealSlot[]).map((slot) => { const assignment = state.assignments.find((item) => item.date === date && item.slot === slot); const batch = assignment ? state.batches.find((item) => item.id === assignment.batchId) : undefined; const recipe = batch ? state.recipes.map((item) => localizeRecipe(item, locale)).find((item) => item.id === batch.recipeId) : undefined; return <button type="button" key={slot} data-testid={`planner-slot-${date}-${slot}`} aria-label={`${formatDate(date, { weekday: "long", month: "long", day: "numeric" })} ${slotLabels[slot]}`} className={`planner-slot ${assignment ? "filled" : ""} ${activeBatch ? "ready" : ""}`} title={assignment ? `${recipe?.name ?? t("Étkezések")} · ${t("Kattints a cseréhez vagy eltávolításhoz")}` : `${slotLabels[slot]} ${t("hozzáadása")}`} onClick={() => assignment && activeBatch && assignment.batchId !== activeBatch ? assign(date, slot) : assignment ? removeAssignment(assignment.id) : assign(date, slot)}>{recipe ? <><span className="slot-dot" /><span>{recipe.name}</span><X size={13} /></> : <Plus size={16} />}</button>; })}</div>)}</div></section>
      <aside className="planner-side"><div className="card batch-card"><div className="card-heading"><div><div className="eyebrow">{t("HETI FŐZÉSI TERV")}</div><h3>{t("Előkészítendő")}</h3></div><button className="icon-button" type="button" data-testid="open-recipe-picker" aria-label={t("Recept hozzáadása")} onClick={openPicker}><Plus size={16} /></button></div>{batches.length ? batches.map((batch) => { const recipe = state.recipes.map((item) => localizeRecipe(item, locale)).find((item) => item.id === batch.recipeId); const used = state.assignments.filter((item) => item.batchId === batch.id).reduce((sum, item) => sum + item.servings, 0); return <div key={batch.id}><div className={`batch-row ${activeBatch === batch.id ? "active" : ""}`}><button type="button" className="batch-select" data-testid={`batch-select-${batch.id}`} onClick={() => setActiveBatch(batch.id)}><span className="batch-thumb"><Utensils size={15} /></span><span><strong>{recipe?.name}</strong><small>{used} / {batch.servings} {t("adag felhasználva")}{batch.mealPrep ? ` · ${t("meal prep")}` : ` · ${t("egy étkezés")}`}</small><ProgressBar value={(used / Math.max(1, batch.servings)) * 100} /></span></button><button type="button" className="batch-action" aria-label={`${recipe?.name ?? t("Batch")} ${t("Szerkesztés")}`} onClick={() => startBatchEdit(batch)}><Edit3 size={15} /></button><button type="button" className="batch-action danger" aria-label={`${recipe?.name ?? t("Batch")} ${t("Törlés")}`} onClick={() => deleteBatch(batch)}><Trash2 size={15} /></button></div>{editingBatchId === batch.id ? <div className="batch-edit-form"><Field label="Adagok"><input data-testid="batch-edit-servings" type="number" min={Math.max(1, used)} step="1" value={editingServings} onChange={(event) => setEditingServings(event.target.value)} /></Field><label className="toggle-row"><input type="checkbox" checked={editingMealPrep} onChange={(event) => setEditingMealPrep(event.target.checked)} /><span className="toggle" /><span><strong>{t("Meal prep")}</strong><small>{t("Több étkezéshez készül.")}</small></span></label><div className="batch-edit-actions"><button type="button" className="secondary-button" onClick={() => setEditingBatchId("")}>{t("Mégsem")}</button><button type="button" className="primary-button" onClick={saveBatchEdit}>{t("Mentés")}</button></div></div> : null}</div>; }) : <div className="empty-state"><Utensils size={24} /><strong>{t("Még nincs főzési terved")}</strong><p>{t("A jobb felső plusz gombbal válassz receptet és állítsd be az adagokat.")}</p></div>}
        {pickerOpen ? <div className="recipe-picker-panel"><div className="recipe-picker-head"><div><div className="eyebrow">{t("RECEPT HOZZÁADÁSA")}</div><h3>{t("Válassz a receptjeid közül")}</h3></div><button type="button" className="icon-button" aria-label={t("Receptválasztó bezárása")} onClick={() => setPickerOpen(false)}><X size={16} /></button></div><div className="search-field recipe-picker-search"><Search size={16} /><input data-testid="recipe-picker-search" value={recipeQuery} onChange={(event) => setRecipeQuery(event.target.value)} placeholder={t("Keress receptnév alapján…")} /></div><div className="filter-pills recipe-picker-filters">{recipeCategories.map((category) => <button type="button" key={category} className={recipeCategory === category ? "active" : ""} onClick={() => setRecipeCategory(category)}>{translateCategory(category, locale)}</button>)}</div><div className="picker-scroll recipe-picker-results">{filteredRecipes.length ? filteredRecipes.map((rawRecipe) => { const recipe = localizeRecipe(rawRecipe, locale); return <button type="button" key={recipe.id} data-testid={`recipe-picker-option-${recipe.id}`} className={`recipe-picker-option ${selectedRecipeId === recipe.id ? "selected" : ""}`} onClick={() => selectRecipe(rawRecipe)}><span className="batch-thumb"><Utensils size={15} /></span><span><strong>{recipe.name}</strong><small>{translateCategory(recipe.category, locale)} · {recipe.servings} {t("alap adag")}</small></span>{selectedRecipeId === recipe.id ? <Check size={16} /> : <Plus size={15} />}</button>; }) : <div className="empty-state"><Search size={22} /><strong>{t("Nincs találat")}</strong><p>{t("Próbálj másik nevet vagy kategóriát.")}</p></div>}</div>{selectedRecipe ? <div className="batch-create-form"><div><strong>{localizeRecipe(selectedRecipe, locale).name}</strong><small>{translateCategory(localizeRecipe(selectedRecipe, locale).category, locale)}</small></div><Field label="Elkészítendő adagok"><input data-testid="batch-servings-input" type="number" min="1" step="1" value={servingsDraft} onChange={(event) => setServingsDraft(event.target.value)} /></Field><label className="toggle-row"><input type="checkbox" checked={mealPrepDraft} onChange={(event) => setMealPrepDraft(event.target.checked)} /><span className="toggle" /><span><strong>{t("Meal prep")}</strong><small>{t("Több étkezéshez is felhasználható.")}</small></span></label><button type="button" data-testid="batch-add-button" className="primary-button wide" onClick={addBatch}>{t("Batch hozzáadása")} <Plus size={16} /></button></div> : <p className="picker-help">{t("Kattints egy receptre a részletekhez és az adagok beállításához.")}</p>}</div> : <div className="recipe-picker-closed"><p className="muted small">{t("A plusz gomb megnyitja az összes receptet, saját receptekkel együtt.")}</p></div>}
      </div></aside>
    </div>
  </div>;
}

function GroceriesView({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { locale, t } = useLanguage();
  const groceries = aggregateGroceries(state);
  const grouped = groceries.reduce<Record<string, typeof groceries>>((accumulator, item) => { const category = item.key.startsWith("manual-") ? item.category : localizeIngredientCategory(item.category, locale); (accumulator[category] ||= []).push(item); return accumulator; }, {});
  const [newItem, setNewItem] = useState("");
  const [newQty, setNewQty] = useState("1");
  const addItem = (event: FormEvent) => { event.preventDefault(); if (!newItem.trim()) return; onUpdate((current) => ({ ...current, manualGroceries: [...current.manualGroceries, { id: makeId("grocery"), name: newItem.trim(), quantity: Number(newQty) || 1, unit: "db", category: "Egyéb" }] })); setNewItem(""); };
  const toggle = (key: string, type: "purchased" | "pantry") => onUpdate((current) => ({ ...current, groceryStatus: { ...current.groceryStatus, [key]: { ...current.groceryStatus[key], [type]: !current.groceryStatus[key]?.[type] } } }));
  const remaining = groceries.filter((item) => !state.groceryStatus[item.key]?.purchased && !state.groceryStatus[item.key]?.pantry).length;
  const number = new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", { maximumFractionDigits: 2 });
  const displayName = (item: typeof groceries[number]) => item.key.startsWith("manual-") ? item.name : localizeIngredientName(item.name, locale);
  return <div className="page-enter"><PageHeader eyebrow="BEVÁSÁRLÓLISTA" title="Kevesebb fejben tartani" description="A főzési terveidből automatikusan számolt mennyiségek." action={<div className="list-actions"><button className="secondary-button" type="button" onClick={() => navigator.clipboard?.writeText(groceries.map((item) => `${displayName(item)} – ${number.format(item.quantity)} ${item.unit}`).join("\n"))}><ClipboardCheck size={16} /> {t("Másolás")}</button><button className="primary-button" type="button" onClick={() => window.print()}><ShoppingBasket size={16} /> {t("Nyomtatás")}</button></div>} /><div className="grocery-summary"><div><span>{t("Összes tétel")}</span><strong>{groceries.length}</strong></div><div><span>{t("Még szükséges")}</span><strong>{remaining}</strong></div><div><span>{t("Beszerzési kategória")}</span><strong>{Object.keys(grouped).length}</strong></div><div className="grocery-summary-art"><ShoppingBasket size={28} /></div></div><div className="grocery-layout"><section className="card grocery-card"><div className="card-heading"><div><div className="eyebrow">{t("TERVEZETT HOZZÁVALÓK")}</div><h3>{t("Hozzávalók kategóriánként")}</h3></div><span className="completion-pill">{groceries.length - remaining} / {groceries.length} {t("kész")}</span></div>{Object.keys(grouped).length ? Object.entries(grouped).map(([category, items]) => <div className="grocery-group" key={category}><h4>{category}</h4>{items.map((item) => { const status = state.groceryStatus[item.key] ?? {}; return <div className={`grocery-row ${status.purchased || status.pantry ? "done" : ""}`} key={item.key}><button type="button" className={`grocery-check ${status.purchased ? "checked" : ""}`} onClick={() => toggle(item.key, "purchased")} aria-label={t("Megjelölés beszerzettként")}>{status.purchased ? <Check size={14} /> : null}</button><span><strong>{displayName(item)}</strong><small>{status.pantry ? t("Otthon van") : status.purchased ? t("Beszerezve") : t("Még szükséges")}</small></span><strong className="grocery-qty">{number.format(item.quantity)} {item.unit}</strong><button type="button" className={`pantry-button ${status.pantry ? "active" : ""}`} onClick={() => toggle(item.key, "pantry")}>{status.pantry ? t("otthon van") : t("van otthon?")}</button></div>; })}</div>) : <div className="empty-state large"><ShoppingBasket size={30} /><strong>{t("A listád még üres")}</strong><p>{t("Adj hozzá egy főzési batch-et a Heti menüben.")}</p></div>}</section><aside className="card manual-grocery"><div className="eyebrow">{t("SAJÁT TÉTEL")}</div><h3>{t("Valami, ami nincs a receptben?")}</h3><form onSubmit={addItem}><input value={newItem} onChange={(event) => setNewItem(event.target.value)} placeholder={t("pl. mosogatógép tabletta")} /><div><input type="number" min="1" value={newQty} onChange={(event) => setNewQty(event.target.value)} /><span>db</span><button type="submit" aria-label={t("Hozzáadás")}><Plus size={16} /></button></div></form><p className="muted small">{t("A kézzel hozzáadott tételek is megmaradnak a következő alkalomra.")}</p></aside></div></div>;
}

function ProgressView({ state, elapsed }: { state: SoftState; elapsed: number }) {
  const { t } = useLanguage();
  const logs = Object.values(state.logs);
  const completed = logs.filter((log) => completionForDay(log, state.settings) === 100).length;
  const partial = logs.filter((log) => { const value = completionForDay(log, state.settings); return value > 0 && value < 100; }).length;
  const waterDays = logs.filter((log) => (log.water ?? 0) >= state.settings.waterTarget);
  const avgWater = logs.length ? logs.reduce((sum, log) => sum + (log.water ?? 0), 0) / logs.length : 0;
  const totalReading = logs.reduce((sum, log) => sum + (log.readingPages ?? 0), 0);
  const totalMinutes = logs.reduce((sum, log) => sum + (log.readingMinutes ?? 0), 0);
  const exerciseMinutes = logs.reduce((sum, log) => sum + (log.exerciseMinutes ?? 0), 0);
  const alcoholDays = logs.filter((log) => log.alcohol === "yes").length;
  return <div className="page-enter"><PageHeader eyebrow="HALADÁS" title="A nagy kép, apró adatokból" description="Nem minden nap mérhető ugyanúgy. Itt mégis láthatod, mi változik." action={<div className="progress-pill"><Sparkles size={15} /> {elapsed} {t("napja úton")}</div>} /><div className="progress-overview-grid"><div className="card progress-overview-card"><div className="eyebrow">{t("KÉP A KIHÍVÁSRÓL")}</div><div className="big-stat"><strong>{Math.round((elapsed / 75) * 100)}%</strong><span>{t("időben eltelt")}</span></div><ProgressBar value={(elapsed / 75) * 100} /><div className="progress-mini-stats"><span><strong>{completed}</strong> {t("teljes nap")}</span><span><strong>{partial}</strong> {t("részleges")}</span><span><strong>{state.settings.skipAllowance}</strong> {t("skip keret")}</span></div></div><div className="card metric-highlight lavender-highlight"><span className="round-icon lavender"><Droplets size={18} /></span><div><small>{t("Átlagos vízbevitel")}</small><strong>{avgWater.toFixed(2)} L</strong><span>{waterDays.length} {t("napon elérted a célt")}</span></div></div><div className="card metric-highlight peach-highlight"><span className="round-icon peach"><Activity size={18} /></span><div><small>{t("Összes mozgás")}</small><strong>{exerciseMinutes} {t("perc")}</strong><span>{logs.filter((log) => (log.exerciseMinutes ?? 0) > 0).length} {t("aktív nap")}</span></div></div></div><div className="stats-grid"><section className="card chart-card"><div className="card-heading"><div><div className="eyebrow">{t("TUDATOS JELENLÉT")}</div><h3>{t("Vízbevitel az elmúlt napokban")}</h3></div><span className="chart-value">{waterDays.length} / {logs.length || 0} {t("nap")}</span></div><div className="bar-chart">{Array.from({ length: 14 }, (_, index) => { const date = addDays(localDateString(), index - 13); const value = state.logs[date]?.water ?? 0; return <div className="bar-column" key={date}><div className="bar-wrap"><div className="bar" style={{ height: `${Math.max(8, Math.min(100, (value / state.settings.waterTarget) * 100))}%` }} /></div><span>{parseLocalDate(date).getDate()}</span></div>; })}</div></section><section className="card reading-card"><div className="card-heading"><div><div className="eyebrow">{t("ELMÉLYÜLÉS")}</div><h3>{t("Olvasási idő")}</h3></div><BookOpen size={19} className="muted-icon" /></div><div className="reading-stats"><div><strong>{totalReading}</strong><span>{t("oldal összesen")}</span></div><div><strong>{totalMinutes}</strong><span>{t("perc összesen")}</span></div></div><div className="reading-quote">{t("„A figyelmed az egyik legszebb ajándék, amit magadnak adhatsz.”")}</div></section><section className="card history-card"><div className="card-heading"><div><div className="eyebrow">{t("TÖRTÉNET")}</div><h3>{t("Semleges napló")}</h3></div><span className="muted small">{t("alkohol")}</span></div><div className="alcohol-stat"><div className="alcohol-stat-ring"><strong>{alcoholDays}</strong><span>{t("nap")}</span></div><div><strong>{t("Fogyasztással jelölt napok")}</strong><p className="muted">{t("A napló célja a kíváncsiság, nem az ítélkezés.")}</p></div></div></section><section className="card photos-card"><div className="card-heading"><div><div className="eyebrow">{t("PROGRESS KÉPEK")}</div><h3>{t("Emlékek a folyamatból")}</h3></div><ImagePlus size={19} className="muted-icon" /></div><div className="photo-strip">{state.photos.length ? state.photos.slice(-4).map((photo) => <div className="photo-tile" key={photo.id}>{photo.dataUrl ? <Image src={photo.dataUrl} alt={t("Progress kép")} fill sizes="74px" unoptimized /> : <ImagePlus size={18} />}<small>{formatDate(photo.date)}</small></div>) : <div className="photo-empty"><ImagePlus size={20} /><span>{t("Az első képed még vár rád.")}</span></div>}</div></section></div></div>;
}

function ProgressPhotoFab({ onUpdate }: { onUpdate: (updater: (current: SoftState) => SoftState) => void }) { const { t } = useLanguage(); const [date, setDate] = useState(localDateString()); const [open, setOpen] = useState(false); const upload = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => { onUpdate((current) => ({ ...current, photos: [...current.photos, { id: makeId("photo"), date, dataUrl: String(reader.result) }] })); setOpen(false); }; reader.readAsDataURL(file); }; return <div className="photo-fab-wrap"><button type="button" className="photo-fab" onClick={() => setOpen((value) => !value)}><ImagePlus size={17} /> {t("Progress kép")}</button>{open ? <div className="photo-fab-panel"><div className="eyebrow">{t("ÚJ EMLÉK")}</div><h4>{t("Őrizd meg ezt a napot.")}</h4><label className="field">{t("Dátum")}<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="upload-drop"><ImagePlus size={19} /><span>{t("Kép feltöltése")}</span><small>{t("JPG, PNG vagy WEBP · csak helyben")}</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label></div> : null}</div>; }

function SettingsView({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) { const settings = state.settings; const [draft, setDraft] = useState(settings); const [notice, setNotice] = useState(""); const save = () => { onUpdate((current) => ({ ...current, settings: draft })); setNotice("A beállításaid mentve."); window.setTimeout(() => setNotice(""), 2500); }; const exportData = () => { const blob = new Blob([serializeSoftState(state)], { type: "application/json" }); const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "75-soft-mentes.json"; anchor.click(); URL.revokeObjectURL(url); }; const importData = (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { const imported = parseSoftState(String(reader.result)); if (imported) { onUpdate(() => imported); setNotice("A mentés visszaállítva."); } else { setNotice("A fájl nem tartalmaz érvényes mentést."); } }; reader.readAsText(file); }; return <div className="page-enter"><PageHeader eyebrow="BEÁLLÍTÁSOK" title="A kihívásod, a szabályaid" description="Bármikor finomhangolhatod. A korábbi naplóid megmaradnak." action={notice ? <span className="saved-notice"><CheckCircle2 size={16} /> {notice}</span> : <button className="primary-button" type="button" onClick={save}>Változtatások mentése <Check size={16} /></button>} /><div className="settings-layout"><div><section className="card settings-card"><div className="card-heading"><div><div className="eyebrow">ALAPADATOK</div><h3>A kihívás idővonala</h3></div><span className="round-icon lavender"><CalendarDays size={17} /></span></div><div className="form-grid three"><Field label="Kezdő dátum"><input type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></Field><Field label="Kezdés időpontja"><input type="time" value={draft.startTime} onChange={(event) => setDraft({ ...draft, startTime: event.target.value })} /></Field><Field label="Befejezés"><input value={formatDate(challengeEndDate(draft.startDate), { year: "numeric", month: "long", day: "numeric" })} readOnly /></Field></div></section><section className="card settings-card"><div className="card-heading"><div><div className="eyebrow">SZOKÁSOK</div><h3>Mi legyen benne a napjaidban?</h3></div></div><div className="settings-habit-list">{(Object.keys(habitLabels) as HabitId[]).map((habit) => { const item = habitLabels[habit]; return <label key={habit} className="settings-habit-row"><span className={`journal-habit-icon ${habit}`}><AppIcon icon={item.icon} size={17} /></span><span><strong>{item.title}</strong><small>{item.detail}</small></span><input type="checkbox" checked={draft.habits[habit]} onChange={() => setDraft({ ...draft, habits: { ...draft.habits, [habit]: !draft.habits[habit] } })} /><span className="toggle small-toggle" /></label>; })}</div></section></div><aside><section className="card settings-card"><div className="eyebrow">CÉLOK ÉS RUGALMASSÁG</div><Field label="Víz cél (liter / nap)"><input type="number" min="0.5" step="0.25" value={draft.waterTarget} onChange={(event) => setDraft({ ...draft, waterTarget: Number(event.target.value) })} /></Field><Field label="Progress kép minden ennyi napban"><input type="number" min="1" value={draft.pictureInterval} onChange={(event) => setDraft({ ...draft, pictureInterval: Math.max(1, Number(event.target.value)) })} /></Field><Field label="Heti pihenőnap"><select value={draft.restDay} onChange={(event) => setDraft({ ...draft, restDay: event.target.value })}>{fullWeekdayNames.map((day) => <option key={day}>{day.toLocaleLowerCase("hu-HU")}</option>)}</select></Field><label className="toggle-row"><input type="checkbox" checked={draft.includeDayOnePicture} onChange={(event) => setDraft({ ...draft, includeDayOnePicture: event.target.checked })} /><span className="toggle" /><span><strong>Induló kép az 1. napon</strong><small>Opcionális emlék a kezdésről.</small></span></label></section><section className="card settings-card data-card"><div className="eyebrow">ADATBIZTONSÁG</div><h3>Helyi mentés</h3><p className="muted">{isStaticMode ? "A GitHub Pages változat IndexedDB-ben tárolja az adatokat, localStorage tartalékkal. Készíts időnként saját biztonsági mentést." : "A helyi változat SQLite adatbázisban tárolja az adatokat. Készíts időnként saját biztonsági mentést."}</p><div className="data-actions"><button type="button" className="secondary-button" onClick={exportData}>Exportálás</button><label className="secondary-button">Importálás<input type="file" accept="application/json" hidden onChange={importData} /></label></div></section></aside></div></div>; }

export default SoftChallengeApp;
