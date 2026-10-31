"use client";

import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
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
  Leaf,
  Trash2,
  Utensils,
  Wine,
  X
} from "lucide-react";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  addDays,
  aggregateGroceries,
  canUseSkip,
  canLogDate,
  challengePhase,
  challengeEndDate,
  completionForDay,
  createInitialState,
  createRestartState,
  dayNumber,
  daysUntilStart,
  formatDate,
  isChallengeDate,
  isChallengeLogDate,
  isValidCalendarDate,
  isMealPlanDate,
  isDayHabitComplete,
  localDateString,
  makeId,
  normalizeDayLogPatch,
  parseLocalDate,
  progressPictureDays,
  restDayInWeek,
  statusForDay,
  usedSkipsForDate,
  weekStart,
  type ChallengeSettings,
  type ChallengePhase,
  type CookingBatch,
  type DayLog,
  type HabitId,
  type MealSlot,
  type Recipe,
  type SoftState
} from "@/lib/soft-challenge";
import { loadBrowserState, saveBrowserState } from "@/lib/browser-persistence";
import { parseSoftState } from "@/lib/soft-state-io";
import OnboardingForm from "./onboarding-form";
import SettingsViewUx from "./settings-view-ux";
import { CustomHabitsCard } from "./custom-habits-card";
import { ProgressPictureCard } from "./progress-picture-card";
import LanguageSwitcher from "./language-switcher";
import { useLanguage } from "./language-provider";
import { formatCount, translate, translateCategory } from "@/lib/i18n";
import { builtInRecipeIds, localizeIngredientCategory, localizeIngredientName, localizeRecipe } from "@/lib/recipe-localization";
import { RecipeEditor } from "./recipe-editor";
import { GroceriesView as GroceriesViewScoped } from "./groceries-view";

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
  const { t } = useLanguage();
  return <label className={`field ${className}`}><span>{t(label)}</span>{children}</label>;
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
  const [clockTick, setClockTick] = useState(0);
  const [canPersist, setCanPersist] = useState(isStaticMode);
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveRevision = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const loadState = async () => {
      try {
        if (isStaticMode) {
          const result = await loadBrowserState();
          if (!cancelled && result.state) setState(parseSoftState(result.state) ?? createInitialState());
          if (!cancelled) setCanPersist(true);
          return;
        }

        const response = await fetch("/api/state");
        if (!response.ok) throw new Error("The local state API is unavailable.");
        const incoming = await response.json() as SoftState;
        if (!cancelled) setState(parseSoftState(incoming) ?? createInitialState());
        if (!cancelled) setCanPersist(true);
      } catch {
        try {
          const result = await loadBrowserState();
          if (!cancelled && result.state) setState(parseSoftState(result.state) ?? createInitialState());
          if (!cancelled && result.state) setCanPersist(true);
          if (!cancelled && !isStaticMode) setStorageError(result.state ? "A helyi SQLite mentés nem érhető el; böngészős biztonsági mentésből töltöttem be az adatokat." : "A helyi SQLite mentés nem érhető el; még nincs betölthető adat. A következő módosítás után böngészős mentést használok.");
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
    if (!loaded || !canPersist) return;
    const revision = saveRevision.current + 1;
    saveRevision.current = revision;
    setSaveState("mentés…");
    const timeout = window.setTimeout(() => {
      const save = async () => {
        try {
          if (isStaticMode) {
            await saveBrowserState(state);
            if (revision === saveRevision.current) {
              setStorageError("");
              setSaveState("mentve");
            }
            return;
          }

          const response = await fetch("/api/state", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(state) });
          if (!response.ok) throw new Error("The local state API rejected the save.");
          if (revision === saveRevision.current) {
            setStorageError("");
            setSaveState("mentve");
          }
        } catch {
          try {
            await saveBrowserState(state);
            if (revision === saveRevision.current) {
              setSaveState("helyi mentéssel");
              setStorageError("A helyi SQLite mentés nem sikerült; a böngészős biztonsági mentés elkészült.");
            }
          } catch {
            if (revision === saveRevision.current) {
              setSaveState("mentés sikertelen");
              setStorageError("A mentés nem sikerült. Ellenőrizd a böngésző tárhelybeállításait vagy a helyi szervert.");
            }
          }
        }
      };
      const queuedSave = saveQueue.current.catch(() => undefined).then(save);
      saveQueue.current = queuedSave.then(() => undefined, () => undefined);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [state, loaded, canPersist]);

  const settings = state.settings;
  const today = localDateString();
  const phase = challengePhase(settings, today);
  const activeDate = phase === "active" ? today : selectedDate;
  const currentDay = phase === "active" ? dayNumber(settings.startDate, today) : phase === "completed" ? 75 : 0;
  const elapsed = phase === "active" ? dayNumber(settings.startDate, today) : phase === "completed" ? 75 : 0;
  const timePercent = (elapsed / 75) * 100;
  const log = defaultLog(state.logs[activeDate]);
  const dailyCompletion = phase === "upcoming" || !isChallengeDate(settings, activeDate) ? 0 : completionForDay(log, settings);
  const pictureDays = progressPictureDays(settings);
  const nextPicture = pictureDays.find((date) => date >= today && !state.photos.some((photo) => photo.date === date));
  const countdownDays = phase === "upcoming" ? daysUntilStart(settings.startDate, today) : 0;

  useEffect(() => {
    const refreshDate = () => setClockTick((value) => value + 1);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshDate();
    };
    const now = new Date();
    const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const timeout = window.setTimeout(refreshDate, Math.max(1000, nextMidnight.getTime() - now.getTime()));
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(timeout);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [clockTick]);

  useEffect(() => {
    if (!loaded || !settings.active || phase !== "upcoming") return;
    const start = parseLocalDate(settings.startDate);
    setPlannerWeek(weekStart(settings.startDate));
    setCalendarDate(start);
    setSelectedDate(settings.startDate);
  }, [loaded, settings.active, settings.startDate, phase]);

  const updateState = (updater: (current: SoftState) => SoftState) => {
    setCanPersist(true);
    setState((current) => updater(current));
  };

  const updateLog = (date: string, patch: Partial<DayLog>) => {
    updateState((current) => {
      if (!canLogDate(current.settings, date, localDateString())) return current;
      const normalizedPatch = normalizeDayLogPatch(patch);
      if (patch.restDay === true && !current.logs[date]?.restDay) {
        const existing = restDayInWeek(date, current.logs);
        if (existing && existing !== date) return current;
      }
      return { ...current, logs: { ...current.logs, [date]: { ...defaultLog(current.logs[date]), ...normalizedPatch } } };
    });
  };

  const setRestDay = (date: string, value: boolean) => {
    updateState((current) => {
      if (challengePhase(current.settings, localDateString()) === "upcoming" || !isChallengeDate(current.settings, date)) return current;
      if (value) {
        const existing = restDayInWeek(date, current.logs);
        if (existing && existing !== date) return current;
      }
      return { ...current, logs: { ...current.logs, [date]: { ...defaultLog(current.logs[date]), restDay: value } } };
    });
  };

  const moveRestDay = (from: string, to: string) => {
    updateState((current) => {
      if (weekStart(from) !== weekStart(to)) return current;
      if (challengePhase(current.settings, localDateString()) === "upcoming" || !isChallengeDate(current.settings, from) || !isChallengeDate(current.settings, to)) return current;
      const existing = restDayInWeek(to, current.logs);
      if (existing && existing !== from) return current;
      return { ...current, logs: { ...current.logs, [from]: { ...defaultLog(current.logs[from]), restDay: false }, [to]: { ...defaultLog(current.logs[to]), restDay: true } } };
    });
  };

  const startChallenge = (nextSettings: ChallengeSettings) => {
    if (!isValidCalendarDate(nextSettings.startDate)) return;
    const safeSettings = { ...nextSettings, active: true, waterTarget: Number.isFinite(nextSettings.waterTarget) && nextSettings.waterTarget > 0 ? nextSettings.waterTarget : 3, pictureInterval: Number.isInteger(nextSettings.pictureInterval) && nextSettings.pictureInterval > 0 ? nextSettings.pictureInterval : 5, skipAllowance: Number.isInteger(nextSettings.skipAllowance) && nextSettings.skipAllowance >= 0 ? nextSettings.skipAllowance : 1 };
    updateState((current) => ({ ...current, settings: safeSettings }));
    setSelectedDate(safeSettings.startDate);
    setPlannerWeek(weekStart(safeSettings.startDate));
    setCalendarDate(parseLocalDate(safeSettings.startDate));
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

  if (!loaded) return <div className="app-loading"><div className="brand-mark"><Leaf size={22} /></div><p>{t("Betöltés…")}</p></div>;
  if (!settings.active) return <OnboardingForm settings={settings} onStart={startChallenge} />;

  return (
    <div className="soft-app-shell" data-locale={locale}>
      <aside className={`app-sidebar ${mobileOpen ? "open" : ""}`}>
          <div className="brand-lockup">
          <div className="brand-mark"><Leaf size={20} /></div>
          <div><strong>75 soft</strong><span>{t("wellness planner")}</span></div>
        </div>
        <div className="sidebar-label">{t("MENÜ")}</div>
        <nav className="side-nav">
          {navItems.map(({ id, labelKey, icon }) => {
            const Icon = icon;
            return <button type="button" key={id} className={view === id ? "active" : ""} onClick={() => { setView(id); setMobileOpen(false); }}><AppIcon icon={Icon} /><span>{t(labelKey)}</span>{id === "journal" && phase === "active" && dailyCompletion < 100 ? <i /> : null}</button>;
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="mini-goal"><div className="mini-goal-head"><span>{t("75 napos cél")}</span><strong>{Math.round(timePercent)}%</strong></div><ProgressBar value={timePercent} /><small>{phase === "upcoming" ? t("Még nem indult el") : phase === "completed" ? t("Kihívás teljesítve") : `${currentDay}. ${t("nap a 75-ből")}`}</small></div>
          <div className="profile-chip"><span className="avatar">75</span><span className="profile-copy"><strong>{t("Saját kihívás")}</strong><small>{t("Helyi profil")}</small></span></div>
        </div>
      </aside>
      {mobileOpen ? <button aria-label={t("Menü bezárása")} className="mobile-scrim" type="button" onClick={() => setMobileOpen(false)} /> : null}
      <main className="app-main">
        <header className="topbar">
          <button type="button" className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label={t("Menü megnyitása")}><Menu size={20} /></button>
          <div className="breadcrumb"><span>75 soft</span><ChevronDown size={14} /><strong>{t(navItems.find((item) => item.id === view)?.labelKey ?? "")}</strong></div>
          <div className="topbar-actions"><LanguageSwitcher /><span className="save-status"><span className="save-dot" /> {t(saveState)}</span></div>
        </header>
        <div className="content-wrap">
          {storageError ? <div className="storage-warning" role="alert">{t(storageError)}</div> : null}
          {view === "overview" && <Overview state={state} phase={phase} today={activeDate} currentDay={currentDay} elapsed={elapsed} timePercent={timePercent} dailyCompletion={dailyCompletion} countdownDays={countdownDays} nextPicture={nextPicture} onUpdateLog={updateLog} onGoToDate={goToDate} onNavigate={setView} />}
          {view === "overview" && phase !== "upcoming" && <ProgressPictureCard settings={settings} today={today} nextPicture={nextPicture} photos={state.photos} phase={phase} />}
          {view === "overview" && phase !== "upcoming" && <CustomHabitsCard settings={settings} log={log} onUpdate={(patch) => updateLog(today, patch)} />}
          {view === "journal" && (phase === "upcoming" ? <UpcomingJournal settings={settings} onNavigate={setView} /> : <Journal state={state} date={selectedDate} onDateChange={setSelectedDate} onUpdateLog={updateLog} onSetRestDay={setRestDay} onMoveRestDay={moveRestDay} onBack={() => setView("overview")} />)}
          {view === "journal" && phase !== "upcoming" && <CustomHabitsCard settings={settings} log={state.logs[selectedDate]} onUpdate={(patch) => updateLog(selectedDate, patch)} />}
          {view === "calendar" && <CalendarView state={state} calendarDate={calendarDate} onCalendarDate={setCalendarDate} onGoToDate={goToDate} onSetRestDay={setRestDay} onMoveRestDay={moveRestDay} />}
          {view === "recipes" && <RecipesView state={state} onUpdate={updateState} />}
          {view === "planner" && <PlannerView state={state} week={plannerWeek} onWeekChange={setPlannerWeek} onUpdate={updateState} />}
          {view === "groceries" && <GroceriesViewScoped state={state} onUpdate={updateState} />}
          {view === "progress" && <ProgressView state={state} elapsed={elapsed} phase={phase} onDeletePhoto={(photoId) => updateState((current) => ({ ...current, photos: current.photos.filter((photo) => photo.id !== photoId) }))} />}
          {view === "progress" && phase !== "upcoming" && <ProgressPhotoFab settings={settings} onUpdate={updateState} />}
          {view === "settings" && <SettingsViewUx state={state} onUpdate={updateState} />}
          {view === "settings" && <RestartChallengeCard onRestart={restartChallenge} />}
        </div>
      </main>
    </div>
  );
}


function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  const { t } = useLanguage();
  return <div className="page-heading"><div><div className="eyebrow">{t(eyebrow)}</div><h1>{t(title)}</h1>{description ? <p className="muted">{t(description)}</p> : null}</div>{action}</div>;
}

function UpcomingOverview({ state, startDate, countdownDays, onNavigate }: { state: SoftState; startDate: string; countdownDays: number; onNavigate: (view: View) => void }) {
  const { t } = useLanguage();
  const countdown = countdownDays === 1 ? t("Holnap indul a kihívásod") : `${countdownDays} ${t("nap múlva indul a kihívásod")}`;
  return <div className="page-enter"><PageHeader eyebrow={t("KÖVETKEZŐ KEZDÉS")} title={t("A kihívásod még nem indult el")} description={t("A napi napló a kihívás indulásakor lesz elérhető.")} /><section className="card upcoming-card"><div className="eyebrow">{t("TERVEZETT KIHÍVÁS")}</div><h2>{countdown}</h2><p className="upcoming-start-date">{t("Kezdés")}: {formatDate(startDate, { year: "numeric", month: "long", day: "numeric" })}</p><button type="button" className="primary-button" onClick={() => onNavigate("planner")}><Utensils size={18} /> {t("Heti menü megnyitása")}</button><p className="muted upcoming-plan-summary">{state.assignments.length ? `${state.assignments.length} ${t("étkezés előre megtervezve")}` : t("Tervezd meg előre az első hetedet a heti menüben.")}</p></section></div>;
}

function UpcomingJournal({ settings, onNavigate }: { settings: ChallengeSettings; onNavigate: (view: View) => void }) {
  const { t } = useLanguage();
  return <div className="page-enter"><PageHeader eyebrow={t("NAPI NAPLÓ")} title={t("A kihívásod még nem indult el")} description={formatDate(settings.startDate, { weekday: "long", month: "long", day: "numeric", year: "numeric" })} /><section className="card upcoming-message-card"><h3>{t("A napi napló a kihívás indulásakor lesz elérhető.")}</h3><p className="muted">{t("Addig is megtervezheted az étkezéseidet és a bevásárlólistádat.")}</p><button type="button" className="secondary-button" onClick={() => onNavigate("planner")}><Utensils size={17} /> {t("Heti menü megnyitása")}</button></section></div>;
}

function Overview({ state, phase, today, currentDay, elapsed, timePercent, dailyCompletion, countdownDays, nextPicture, onUpdateLog, onGoToDate, onNavigate }: { state: SoftState; phase: ChallengePhase; today: string; currentDay: number; elapsed: number; timePercent: number; dailyCompletion: number; countdownDays: number; nextPicture?: string; onUpdateLog: (date: string, patch: Partial<DayLog>) => void; onGoToDate: (date: string) => void; onNavigate: (view: View) => void }) {
  const { t, locale } = useLanguage();
  if (phase === "upcoming") return <UpcomingOverview state={state} startDate={state.settings.startDate} countdownDays={countdownDays} onNavigate={onNavigate} />;
  const settings = state.settings;
  const log = defaultLog(state.logs[today]);
  const challengeLogs = Object.fromEntries(Object.entries(state.logs).filter(([date]) => isChallengeDate(settings, date)));
  const weekRestDate = restDayInWeek(today, challengeLogs);
  const selfCareThisWeek = Object.entries(state.logs).some(([date, item]) => weekStart(date) === weekStart(today) && isChallengeLogDate(settings, date) && Boolean(item.selfCare));
  const todayMeals = state.assignments.filter((assignment) => assignment.date === today);
  const firstPictureDue = settings.includeDayOnePicture && nextPicture === settings.startDate && !state.photos.some((photo) => photo.date === settings.startDate);
  const getRecipe = (id: string) => { const recipe = state.recipes.find((item) => item.id === id); return recipe ? localizeRecipe(recipe, locale) : undefined; };
  const skipped = usedSkipsForDate(settings, state.logs, today);
  const water = new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", { maximumFractionDigits: 2 }).format(log.water ?? 0);
  return <div className="page-enter"><PageHeader eyebrow={formatDate(today, { weekday: "long", month: "long", day: "numeric" })} title="Mai áttekintés" action={<button className="secondary-button" type="button" onClick={() => onGoToDate(today)}><ClipboardCheck size={18} /> {t("Mai napló")}</button>} />
    <section className="overview-hero"><div><div className="eyebrow light">{t("75 SOFT CHALLENGE")}</div><h2>{currentDay}. {t("nap")} <span>/ 75</span></h2><p>{formatDate(settings.startDate, { month: "long", day: "numeric" })} – {formatDate(challengeEndDate(settings.startDate), { month: "long", day: "numeric", year: "numeric" })}</p><div className="hero-progress"><div className="hero-progress-head"><span>{t("A kihívás ideje")}</span><strong>{Math.round(timePercent)}%</strong></div><ProgressBar value={timePercent} /><div className="hero-progress-foot"><span>{elapsed} {t("nap eltelt")}</span><span>{Math.max(0, 75 - elapsed)} {t("nap hátra")}</span></div></div></div><div className="hero-ring"><div><strong>{dailyCompletion}%</strong><span>{t("ma teljesítve")}</span></div></div><div className="hero-blobs" /></section>
    <div className="stat-grid"><StatCard icon={Flame} label="Napok" value={`${Math.max(1, elapsed)} ${t("nap")}`} detail="eltelt a kihívásból" tone="forest" /><StatCard icon={Droplets} label="Mai víz" value={`${water} L`} detail={`${t("cél")}: ${settings.waterTarget} L`} tone="sage" /><StatCard icon={BookOpen} label="Olvasás" value={`${log.readingPages ?? 0} ${t("oldal")}`} detail={`${log.readingMinutes ?? 0} ${t("perc fókusz")}`} tone="moss" /><StatCard icon={CheckCircle2} label="Engedélyezett kihagyás" value={`${Math.max(0, settings.skipAllowance - skipped)} ${t("maradt")}`} detail="ezen a kihíváson" tone="stone" /></div>
    <div className="dashboard-grid"><section className="card habits-card"><div className="card-heading"><div><div className="eyebrow">{t("MAI FÓKUSZ")}</div><h3>{t("A mai szokásaid")}</h3></div><span className="completion-pill">{dailyCompletion}% {t("kész")}</span></div><div className="habit-list">{(Object.keys(habitLabels) as HabitId[]).filter((habit) => settings.habits[habit]).map((habit) => <HabitRow key={habit} habit={habit} log={log} settings={settings} onUpdate={(patch) => onUpdateLog(today, patch)} />)}</div><button className="text-button" type="button" onClick={() => onGoToDate(today)}>{t("Részletes napló megnyitása")} <ArrowRight size={15} /></button></section>
      <section className="side-stack"><div className="card next-picture-card"><div className="card-heading"><div><div className="eyebrow">{t(firstPictureDue ? "ELSŐ PROGRESS KÉP" : "KÖVETKEZŐ PROGRESS KÉP")}</div><h3>{t(firstPictureDue ? "Induló kép" : "Következő progress kép")}</h3></div><div className="round-icon"><ImagePlus size={20} /></div></div>{nextPicture ? <><div className="picture-date"><strong>{formatDate(nextPicture, { month: "long", day: "numeric" })}</strong><span>{firstPictureDue ? t("az indulás napja") : `${dayNumber(settings.startDate, nextPicture)}. ${t("nap")}`}</span></div><div className="picture-line"><span /><small>{firstPictureDue ? t("az indulás napja") : `${t("még")} ${Math.max(0, dayNumber(today, nextPicture))} ${t("nap")}`}</small></div></> : <p className="empty-copy">{t("Minden ütemezett kép megvan.")}</p>}</div><div className="card week-card"><div className="card-heading"><div><div className="eyebrow">{t("EZ A HÉT")}</div><h3>{t("Ezen a héten")}</h3></div><button className="more-button" type="button" onClick={() => onNavigate("progress")} aria-label={t("Haladás")}><MoreHorizontal size={20} /></button></div><div className="week-row"><span className="week-icon green"><Heart size={20} /></span><span><strong>{t("Öngondoskodás")}</strong><small>{selfCareThisWeek ? t("1 alkalom rögzítve") : t("Még nincs rögzítve")}</small></span><CheckCircle2 className="week-check" size={20} /></div><div className="week-row"><span className="week-icon sage"><Activity size={20} /></span><span><strong>{t("Pihenőnap")}</strong><small>{weekRestDate ? formatDate(weekRestDate, { month: "short", day: "numeric" }) : t("Ezen a héten még van pihenőnapod.")}</small></span><span className="week-status">{weekRestDate ? t("felhasználva") : t("elérhető")}</span></div></div></section></div>
    <section className="bottom-grid"><div className="card tracker-card"><div className="card-heading"><div><div className="eyebrow">{t("A TELJES ÚT")}</div><h3>{t("75 napos áttekintő")}</h3></div><span className="muted small">{elapsed} / 75 {t("nap")}</span></div><div className="day-grid">{Array.from({ length: 75 }, (_, index) => { const date = addDays(settings.startDate, index); const status = statusForDay(date, settings, state.logs); return <button key={date} type="button" title={formatDate(date, { month: "long", day: "numeric" })} className={`day-tile ${status}`} onClick={() => onGoToDate(date)}><span>{index + 1}</span></button>; })}</div><div className="legend"><span><i className="dot complete" />{t("Kész")}</span><span><i className="dot current" />{t("Ma")}</span><span><i className="dot partial" />{t("Részben")}</span><span><i className="dot skip" />{t("Kihagyva")}</span></div></div><div className="card meals-card"><div className="card-heading"><div><div className="eyebrow">{t("MAI TERV")}</div><h3>{t("Étkezések")}</h3></div><button className="text-button compact" type="button" onClick={() => onNavigate("planner")}>{t("Heti menü")} <ArrowRight size={14} /></button></div>{(["reggeli", "ebed", "vacsora"] as MealSlot[]).map((slot) => { const meal = todayMeals.find((assignment) => assignment.slot === slot); const recipe = meal ? getRecipe(state.batches.find((batch) => batch.id === meal.batchId)?.recipeId ?? "") : undefined; return <div className="meal-line" key={slot}><span className="meal-time">{slot === "reggeli" ? "08:00" : slot === "ebed" ? "12:30" : "19:00"}</span><span className={`meal-thumb ${slot}`}><Utensils size={15} /></span><span><strong>{recipe?.name ?? t("Még nincs betervezve")}</strong><small>{t(slot === "reggeli" ? "Reggeli" : slot === "ebed" ? "Ebéd" : "Vacsora")}</small></span>{meal ? <CheckCircle2 size={17} className="meal-done" /> : <button className="meal-add" type="button" onClick={() => onNavigate("planner")} aria-label={`${t("Étkezések")} ${t("hozzáadása")}`}><Plus size={15} /></button>}</div>; })}</div></section>
  </div>;
}

function StatCard({ icon, label, value, detail, tone }: { icon: typeof Activity; label: string; value: string; detail: string; tone: string }) { const { t } = useLanguage(); const Icon = icon; return <div className="stat-card"><span className={`stat-icon ${tone}`}><Icon size={18} /></span><div><span>{t(label)}</span><strong>{value}</strong><small>{t(detail)}</small></div></div>; }

function HabitRow({ habit, log, settings, onUpdate }: { habit: HabitId; log: DayLog; settings: ChallengeSettings; onUpdate: (patch: Partial<DayLog>) => void }) { const item = habitLabels[habit]; const Icon = item.icon; const complete = isDayHabitComplete(habit, log, settings); return <div className={`habit-row ${complete ? "complete" : ""}`}>{habit === "mindful" ? <button type="button" className={`habit-check ${complete ? "checked" : ""}`} onClick={() => onUpdate({ mindful: !complete })} aria-label={`${translate(item.title)} ${translate("bejelölése")}`}>{complete ? <Check size={15} /> : null}</button> : <span className={`habit-check status-only ${complete ? "checked" : ""}`} aria-label={`${translate(item.title)} ${complete ? translate("Teljesítve") : translate("Folyamatban")}`}>{complete ? <Check size={15} /> : null}</span>}<span className="habit-row-icon"><Icon size={18} /></span><span className="habit-row-copy"><strong>{translate(item.title)}</strong><small>{habit === "water" ? `${(log.water ?? 0).toFixed(2)} / ${settings.waterTarget} L` : habit === "reading" ? `${log.readingPages ?? 0} ${translate("oldal")} · ${log.readingMinutes ?? 0} ${translate("perc")}` : habit === "movement" ? `${log.exerciseMinutes ?? 0} / 30 ${translate("perc")}` : complete ? translate("Ma megvolt") : translate(item.detail)}</small></span>{habit === "water" ? <div className="habit-input-inline"><input type="number" min="0" step="0.25" value={log.water ?? ""} placeholder="0" onChange={(event) => onUpdate({ water: Number(event.target.value) })} /><span>L</span><button type="button" onClick={() => onUpdate({ water: Number(((log.water ?? 0) + 0.25).toFixed(2)) })}>+0,25</button></div> : habit === "reading" ? <div className="habit-inputs"><input aria-label={translate("Oldalak")} type="number" min="0" value={log.readingPages ?? ""} placeholder={translate("oldal")} onChange={(event) => onUpdate({ readingPages: Number(event.target.value) })} /><input aria-label={translate("Percek")} type="number" min="0" value={log.readingMinutes ?? ""} placeholder={translate("perc")} onChange={(event) => onUpdate({ readingMinutes: Number(event.target.value) })} /></div> : habit === "movement" ? <div className="habit-input-inline"><input type="number" min="0" value={log.exerciseMinutes ?? ""} placeholder="0" onChange={(event) => onUpdate({ exerciseMinutes: Number(event.target.value) })} /><span>{translate("perc")}</span></div> : null}</div>; }

function Journal({ state, date, onDateChange, onUpdateLog, onSetRestDay, onMoveRestDay, onBack }: { state: SoftState; date: string; onDateChange: (date: string) => void; onUpdateLog: (date: string, patch: Partial<DayLog>) => void; onSetRestDay: (date: string, value: boolean) => void; onMoveRestDay: (from: string, to: string) => void; onBack: () => void }) {
  const { t } = useLanguage();
  const settings = state.settings;
  const log = defaultLog(state.logs[date]);
  const number = dayNumber(settings.startDate, date);
  const completion = completionForDay(log, settings);
  const selfCare = log.selfCare;
  const restDate = restDayInWeek(date, state.logs);
  const otherRestDate = restDate && restDate !== date ? restDate : undefined;
  const challengeDate = isChallengeDate(settings, date);
  const editable = canLogDate(settings, date);
  const set = (patch: Partial<DayLog>) => onUpdateLog(date, patch);
  const toggleRestDay = () => {
    if (!isChallengeDate) return;
    if (log.restDay) {
      if (window.confirm(t("Megszünteted a pihenőnapot ezen a napon?"))) onSetRestDay(date, false);
      return;
    }
    if (otherRestDate) {
      if (window.confirm(`${t("Áthelyezed a pihenőnapot erre a napra?")} ${formatDate(otherRestDate, { weekday: "long", month: "long", day: "numeric" })}?`)) onMoveRestDay(otherRestDate, date);
      return;
    }
    onSetRestDay(date, true);
  };
  const restDayCopy = log.restDay ? t("Ez a nap pihenőnap.") : otherRestDate ? `${t("Ezen a héten már felhasználtad a pihenőnapot.")} ${formatDate(otherRestDate, { month: "short", day: "numeric" })}.` : t("Ezen a héten még van pihenőnapod.");
  const restDayAction = log.restDay ? t("Pihenőnap törlése") : otherRestDate ? t("Pihenőnap áthelyezése ide") : t("Pihenőnapnak jelölöm");
  const choiceLabels = [{ id: "none", label: "Nem fogyasztottam" }, { id: "yes", label: "Fogyasztottam" }, { id: "unknown", label: "Nincs rögzítve" }];
  return <div className="page-enter"><PageHeader eyebrow="NAPI NAPLÓ" title={challengeDate ? `${number}. ${t("nap")}` : t("Napló csak a kihívás napjain érhető el")} description={formatDate(date, { weekday: "long", month: "long", day: "numeric" })} action={<div className="date-switcher"><button type="button" disabled={date <= settings.startDate} onClick={() => onDateChange(addDays(date, -1))} aria-label={t("Előző nap")}><ArrowLeft size={18} /></button><input type="date" min={settings.startDate} max={challengeEndDate(settings.startDate)} value={date} onChange={(event) => onDateChange(event.target.value)} /><button type="button" disabled={date >= challengeEndDate(settings.startDate)} onClick={() => onDateChange(addDays(date, 1))} aria-label={t("Következő nap")}><ArrowRight size={18} /></button></div>} />
    <div className="journal-layout"><div><div className="journal-summary card"><div className="journal-summary-ring"><strong>{completion}%</strong><span>{t("teljesítve")}</span></div><div><div className="eyebrow">{t("NAPI ÖSSZEFOGLALÓ")}</div><h3>{t(completion === 100 ? "Napló kész" : completion > 0 ? "Folyamatban" : "Még nincs bejegyzés")}</h3></div><button type="button" className="secondary-button" onClick={onBack}>{t("Áttekintés")}</button></div>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("SZOKÁSOK")}</div><h3>{t("Mai alapok")}</h3></div><span className="completion-pill">{completion}%</span></div><div className="journal-habit-grid">{(Object.keys(habitLabels) as HabitId[]).filter((habit) => settings.habits[habit]).map((habit) => <JournalHabit key={habit} habit={habit} log={log} settings={settings} canSkip={canUseSkip(settings, state.logs, date, habit)} editable={editable} onUpdate={set} onUndoSkip={() => set({ skips: (log.skips ?? []).filter((item) => item !== habit) })} />)}</div></section>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("MOZGÁS")}</div><h3>{t("Mozgás")}</h3></div><span className="round-icon"><Activity size={20} /></span></div><div className="form-grid three"><Field label="Időtartam (perc)"><input disabled={!editable} type="number" min="0" value={log.exerciseMinutes ?? ""} placeholder="30" onChange={(event) => set({ exerciseMinutes: Number(event.target.value) })} /></Field><Field label="Típus"><input disabled={!editable} value={log.exerciseType ?? ""} placeholder={t("pl. séta, jóga")} onChange={(event) => set({ exerciseType: event.target.value })} /></Field></div><div className="rest-day-control"><div><strong>{t("Pihenőnap")}</strong><small>{restDayCopy}</small></div><button type="button" className="secondary-button" disabled={!challengeDate} onClick={toggleRestDay}>{restDayAction}</button></div></section>
      <section className="card journal-card"><div className="card-heading"><div><div className="eyebrow">{t("ÖNGONDOSKODÁS")}</div><h3>{t("Öngondoskodás")}</h3></div><span className="round-icon"><Heart size={20} /></span></div><Field label="Milyen tevékenység esett jól?" className="full-field"><input disabled={!editable} value={selfCare ?? ""} placeholder={t("pl. hosszú fürdő, bőrápolás, séta")} onChange={(event) => set({ selfCare: event.target.value })} /></Field></section></div>
      <aside className="journal-side"><section className="card water-detail"><div className="eyebrow">{t("VÍZKÖVETÉS")}</div><div className="water-big"><Droplets size={23} /><strong>{(log.water ?? 0).toFixed(2)}</strong><span>/ {settings.waterTarget} L</span></div><ProgressBar value={((log.water ?? 0) / settings.waterTarget) * 100} /><div className="quick-adds"><button type="button" disabled={!editable} onClick={() => set({ water: Number(((log.water ?? 0) + 0.25).toFixed(2)) })}>+ 0,25 L</button><button type="button" disabled={!editable} onClick={() => set({ water: Number(((log.water ?? 0) + 0.5).toFixed(2)) })}>+ 0,5 L</button></div></section><section className="card alcohol-card"><div className="card-heading"><div><div className="eyebrow">{t("ALKOHOL")}</div><h3>{t("Alkoholfogyasztás")}</h3></div><span className="round-icon muted-icon"><Wine size={20} /></span></div><div className="choice-stack">{choiceLabels.map((choice) => <label key={choice.id} className="radio-row"><input disabled={!editable} type="radio" name={`alcohol-${date}`} checked={(log.alcohol ?? "unknown") === choice.id} onChange={() => set({ alcohol: choice.id as DayLog["alcohol"] })} /><span>{t(choice.label)}</span></label>)}</div>{log.alcohol === "yes" ? <Field label="Alkalom / megjegyzés"><input disabled={!editable} value={log.alcoholOccasion ?? ""} placeholder={t("pl. születésnap")} onChange={(event) => set({ alcoholOccasion: event.target.value })} /></Field> : null}</section><section className="card notes-card"><h3>{t("Napi jegyzet")}</h3><textarea disabled={!editable} value={log.notes ?? ""} placeholder={t("Mi maradt meg ebből a napból?")} onChange={(event) => set({ notes: event.target.value })} /></section></aside>
    </div>
  </div>;
}

function JournalHabit({ habit, log, settings, canSkip, editable, onUpdate, onUndoSkip }: { habit: HabitId; log: DayLog; settings: ChallengeSettings; canSkip: boolean; editable: boolean; onUpdate: (patch: Partial<DayLog>) => void; onUndoSkip: () => void }) { const item = habitLabels[habit]; const skipped = Boolean(log.skips?.includes(habit)); const complete = isDayHabitComplete(habit, log, settings); return <div className="journal-habit"><div className={`journal-habit-icon ${habit}`}><AppIcon icon={item.icon} size={18} /></div><div><strong>{translate(item.title)}</strong><small>{skipped ? translate("Kihagyva – engedélyezett") : complete ? translate("Teljesítve") : translate(item.detail)}</small></div>{habit === "mindful" ? <button className={`habit-check ${complete ? "checked" : ""}`} disabled={!editable || skipped} type="button" onClick={() => onUpdate({ mindful: !complete })} aria-label={`${translate(item.title)} ${translate("bejelölése")}`}>{complete ? <Check size={15} /> : null}</button> : <span className={`habit-check status-only ${complete ? "checked" : ""}`} aria-label={`${translate(item.title)} ${complete ? translate("Teljesítve") : translate("Folyamatban")}`}>{complete ? <Check size={15} /> : null}</span>}{habit === "reading" ? <div className="journal-number-inputs"><input disabled={!editable || skipped} type="number" min="0" value={log.readingPages ?? ""} placeholder={translate("oldal")} onChange={(event) => onUpdate({ readingPages: Number(event.target.value) })} /><input disabled={!editable || skipped} type="number" min="0" value={log.readingMinutes ?? ""} placeholder={translate("perc")} onChange={(event) => onUpdate({ readingMinutes: Number(event.target.value) })} /></div> : null}{canSkip ? <button type="button" className="skip-button" onClick={() => { if (window.confirm(translate("Ezt a szokást engedélyezett kihagyásként jelölöd?"))) onUpdate({ skips: [...(log.skips ?? []), habit] }); }}>{translate("Kihagyom")}</button> : skipped ? <button type="button" className="skip-button undo" onClick={onUndoSkip}>{translate("Kihagyás visszavonása")}</button> : null}</div>; }


function CalendarView({ state, calendarDate, onCalendarDate, onGoToDate, onSetRestDay, onMoveRestDay }: { state: SoftState; calendarDate: Date; onCalendarDate: (date: Date) => void; onGoToDate: (date: string) => void; onSetRestDay: (date: string, value: boolean) => void; onMoveRestDay: (from: string, to: string) => void }) {
  const { locale, t } = useLanguage();
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = Array.from({ length: Math.ceil((offset + days) / 7) * 7 }, (_, index) => index - offset + 1);
  const assignmentsForDate = (date: string) => state.assignments.filter((assignment) => assignment.date === date);
  const isChallengeDate = (date: string) => state.settings.active && dayNumber(state.settings.startDate, date) >= 1 && dayNumber(state.settings.startDate, date) <= 75;
  const toggleRestDay = (date: string) => {
    if (!isChallengeDate(date)) return;
    if (state.logs[date]?.restDay) {
      if (window.confirm(t("Megszünteted a pihenőnapot ezen a napon?"))) onSetRestDay(date, false);
      return;
    }
    const existing = restDayInWeek(date, state.logs);
    if (existing) {
      if (window.confirm(`${t("Áthelyezed a pihenőnapot erre a napra?")} ${formatDate(date, { weekday: "long", month: "long", day: "numeric" })}?`)) onMoveRestDay(existing, date);
      return;
    }
    onSetRestDay(date, true);
  };
  const calendarLocale = locale === "hu" ? "hu-HU" : "en-GB";
  return <div className="page-enter"><PageHeader eyebrow="NAPTÁR" title="Naptár" action={<div className="calendar-controls"><button className="secondary-button" type="button" onClick={() => onCalendarDate(new Date())}>{t("Ma")}</button><button className="icon-button" type="button" onClick={() => onCalendarDate(new Date(year, month - 1, 1))} aria-label={t("Előző hónap")}><ArrowLeft size={18} /></button><button className="icon-button" type="button" onClick={() => onCalendarDate(new Date(year, month + 1, 1))} aria-label={t("Következő hónap")}><ArrowRight size={18} /></button></div>} />
    <div className="calendar-layout"><section className="card calendar-card"><div className="calendar-month"><h3>{new Intl.DateTimeFormat(calendarLocale, { month: "long", year: "numeric" }).format(calendarDate)}</h3><div className="calendar-legend"><span><i className="event-dot challenge" />{t("kihívás")}</span><span><i className="event-dot meal" />{t("étkezés")}</span><span><i className="event-dot photo" />{t("progress kép")}</span></div></div><div className="calendar-weekdays">{fullWeekdayNames.map((day) => <span key={day}>{locale === "hu" ? day : new Intl.DateTimeFormat(calendarLocale, { weekday: "short" }).format(new Date(2024, 0, 1 + fullWeekdayNames.indexOf(day)))}</span>)}</div><div className="calendar-grid">{cells.map((day, index) => { if (day < 1 || day > days) return <div className="calendar-cell blank" key={`blank-${index}`} />; const date = `${year}-${`${month + 1}`.padStart(2, "0")}-${`${day}`.padStart(2, "0")}`; const dayAssignments = assignmentsForDate(date); const isToday = date === localDateString(); const isBeforeStart = state.settings.active && date < state.settings.startDate; const isPicture = progressPictureDays(state.settings).includes(date); const status = state.settings.active ? statusForDay(date, state.settings, state.logs) : "future"; const restDate = restDayInWeek(date, state.logs); const restIsAvailable = isChallengeDate(date) && (!restDate || restDate === date); return <div className={`calendar-cell ${isToday ? "today" : ""} ${isBeforeStart ? "before-start" : ""} ${state.logs[date]?.restDay ? "rest-day" : ""}`} key={date}><button type="button" className="calendar-date-button" onClick={() => onGoToDate(date)}><div className="cell-date"><strong>{day}</strong>{status === "complete" ? <CheckCircle2 size={17} /> : null}</div>{isPicture ? <span className="calendar-event photo-event"><ImagePlus size={13} /> {t("kép")}</span> : null}{dayAssignments.slice(0, 2).map((assignment) => { const batch = state.batches.find((item) => item.id === assignment.batchId); const rawRecipe = state.recipes.find((item) => item.id === batch?.recipeId); const recipe = rawRecipe ? localizeRecipe(rawRecipe, locale) : undefined; return <span key={assignment.id} className="calendar-event meal-event"><Utensils size={13} />{recipe?.name}</span>; })}</button><button type="button" className={`calendar-rest-toggle ${state.logs[date]?.restDay ? "active" : ""}`} disabled={!isChallengeDate(date)} onClick={() => toggleRestDay(date)}>{state.logs[date]?.restDay ? t("Pihenőnap") : restIsAvailable ? t("Pihenőnapnak jelölöm") : t("Pihenőnap áthelyezése ide")}</button></div>; })}</div></section><aside className="calendar-side"><div className="card agenda-card"><div className="eyebrow">{t("KÖVETKEZŐ ESEMÉNYEK")}</div><h3>{t("Ezen a héten")}</h3>{progressPictureDays(state.settings).filter((date) => date >= localDateString()).slice(0, 2).map((date) => <button type="button" className="agenda-item" key={date} onClick={() => onGoToDate(date)}><span className="agenda-date"><strong>{parseLocalDate(date).getDate()}</strong><small>{formatDate(date, { weekday: "short" })}</small></span><span><strong>{t("Progress kép")}</strong><small>{dayNumber(state.settings.startDate, date)}. {t("nap")} · {t("ütemezett")}</small></span><ImagePlus size={18} /></button>)}<button type="button" className="agenda-item" onClick={() => onGoToDate(localDateString())}><span className="agenda-date lavender-date"><CalendarDays size={19} /></span><span><strong>{t("Mai napló")}</strong><small>{t("Napi napló megnyitása")}</small></span><ArrowRight size={18} /></button></div></aside></div>
  </div>;
}

function RecipesView({ state, onUpdate }: { state: SoftState; onUpdate: (updater: (current: SoftState) => SoftState) => void }) {
  const { locale, t } = useLanguage();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Mindegy");
  const [selected, setSelected] = useState<Recipe | undefined>();
  const [editingRecipe, setEditingRecipe] = useState<Recipe | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const entries = state.recipes.map((raw) => ({ raw, recipe: localizeRecipe(raw, locale) }));
  const categories = ["Mindegy", ...Array.from(new Set(state.recipes.map((recipe) => recipe.category)))];
  const filtered = entries.filter(({ raw, recipe }) => {
    const language = locale === "hu" ? "hu-HU" : "en-GB";
    return (category === "Mindegy" || raw.category === category) && recipe.name.toLocaleLowerCase(language).includes(query.toLocaleLowerCase(language));
  });
  const saveRecipe = (recipe: Recipe) => {
    onUpdate((current) => ({ ...current, recipes: current.recipes.some((item) => item.id === recipe.id) ? current.recipes.map((item) => item.id === recipe.id ? recipe : item) : [recipe, ...current.recipes] }));
    setEditorOpen(false);
    setEditingRecipe(undefined);
    setNotice(t("A recept mentve."));
  };
  const deleteRecipe = (recipe: Recipe) => {
    if (builtInRecipeIds().includes(recipe.id)) {
      setNotice(t("Az alapreceptek nem törölhetők."));
      return;
    }
    if (state.batches.some((batch) => batch.recipeId === recipe.id)) {
      setNotice(t("Ez a recept már szerepel a heti tervben, ezért előbb töröld vagy módosítsd a kapcsolódó főzési adagokat."));
      return;
    }
    if (!window.confirm(`${t("Biztosan törlöd ezt a saját receptet?")} ${recipe.name}`)) return;
    onUpdate((current) => ({ ...current, recipes: current.recipes.filter((item) => item.id !== recipe.id) }));
    if (selected?.id === recipe.id) setSelected(undefined);
  };
  return <div className="page-enter">
    <PageHeader eyebrow="RECEPTEK" title="Receptek" description={formatCount(state.recipes.length, "recept", "recipe", locale)} action={<button type="button" className="primary-button" onClick={() => { setEditingRecipe(undefined); setEditorOpen(true); }}><Plus size={18} /> {t("Új recept")}</button>} />
    {notice ? <div className="planner-notice" role="status">{notice}</div> : null}
    {editorOpen ? <RecipeEditor key={editingRecipe?.id ?? "new"} recipe={editingRecipe} onSave={saveRecipe} onCancel={() => { setEditorOpen(false); setEditingRecipe(undefined); }} /> : null}
    <div className="recipe-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("Keress receptet…")} /></div><div className="filter-pills">{categories.map((item) => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{translateCategory(item, locale)}</button>)}</div></div>
    <div className="recipe-grid">{filtered.map(({ raw, recipe }) => <RecipeCard key={raw.id} recipe={recipe} canEdit={!builtInRecipeIds().includes(raw.id)} canDelete={!builtInRecipeIds().includes(raw.id)} onSelect={setSelected} onEdit={() => { if (state.batches.some((batch) => batch.recipeId === raw.id) && !window.confirm(t("Ez a recept már szerepel a heti tervben. A módosítás minden kapcsolódó étkezésben frissülni fog. Folytatod?"))) return; setEditingRecipe(raw); setEditorOpen(true); }} onFavorite={() => onUpdate((current) => ({ ...current, recipes: current.recipes.map((item) => item.id === raw.id ? { ...item, favorite: !item.favorite } : item) }))} onDelete={() => deleteRecipe(raw)} />)}</div>
    {selected ? <RecipeModal recipe={selected} onClose={() => setSelected(undefined)} /> : null}
  </div>;
}

function RecipeCard({ recipe, canEdit, canDelete, onSelect, onEdit, onFavorite, onDelete }: { recipe: Recipe; canEdit: boolean; canDelete: boolean; onSelect: (recipe: Recipe) => void; onEdit: () => void; onFavorite: () => void; onDelete: () => void }) {
  const { locale, t } = useLanguage();
  const palette = recipe.category === "Reggeli" || recipe.category === "Breakfast" ? "breakfast" : recipe.category === "Halas" || recipe.category === "Fish" ? "fish" : recipe.category === "Húsmentes" || recipe.category === "Vegetarian" ? "vegetarian" : recipe.category === "Többadagos ételek" || recipe.category === "Batch cooking" ? "batch" : "chicken";
  return <article className="recipe-card" onClick={() => onSelect(recipe)}>
    <div className={`recipe-art ${palette}`}>
      <span>{translateCategory(recipe.category, locale)}</span>
      <button type="button" aria-label={t("Kedvenc")} onClick={(event) => { event.stopPropagation(); onFavorite(); }} className={recipe.favorite ? "favorite active" : "favorite"}><Heart size={19} fill={recipe.favorite ? "currentColor" : "none"} /></button>
      <div className="recipe-art-symbol"><Utensils size={30} /></div>
    </div>
    <div className="recipe-card-body">
      <div className="recipe-card-top">
        <button type="button" className="recipe-card-open" onClick={(event) => { event.stopPropagation(); onSelect(recipe); }}><span className="recipe-card-title" role="heading" aria-level={3}>{recipe.name}</span></button>
        <div className="recipe-card-actions">
          {canEdit ? <button type="button" className="recipe-more" aria-label={t("Recept szerkesztése")} onClick={(event) => { event.stopPropagation(); onEdit(); }}><Edit3 size={19} /></button> : null}
          {canDelete ? <button type="button" className="recipe-more" aria-label={t("Recept törlése")} onClick={(event) => { event.stopPropagation(); onDelete(); }}><MoreHorizontal size={20} /></button> : null}
        </div>
      </div>
      <div className="recipe-meta"><span><Clock3 size={16} /> {recipe.totalMinutes} {t("perc")}</span><span><Utensils size={16} /> {recipe.servings} {t("adag")}</span>{recipe.mealPrep ? <span className="prep-badge">{t("Főzési adag")}</span> : null}</div>
    </div>
  </article>;
}

function RecipeModal({ recipe, onClose }: { recipe: Recipe; onClose: () => void }) { const { locale, t } = useLanguage(); useEffect(() => { const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); }; document.addEventListener("keydown", handleKeyDown); return () => document.removeEventListener("keydown", handleKeyDown); }, [onClose]); return <div className="modal-backdrop" role="presentation" onClick={onClose}><div className="recipe-modal" role="dialog" aria-modal="true" aria-labelledby="recipe-modal-title" onClick={(event) => event.stopPropagation()}><button type="button" className="modal-close" onClick={onClose} aria-label={t("Bezárás")}><X size={20} /></button><div className="recipe-modal-hero"><span>{translateCategory(recipe.category, locale)}</span><h2 id="recipe-modal-title">{recipe.name}</h2><div className="recipe-modal-meta"><span><Clock3 size={17} /> {recipe.activeMinutes} {t("perc")} {t("aktív")}</span><span><Clock3 size={17} /> {recipe.totalMinutes} {t("perc")} {t("összesen")}</span><span><Utensils size={17} /> {recipe.servings} {t("adag")}</span></div></div><div className="recipe-modal-body"><div><div className="eyebrow">{t("HOZZÁVALÓK")}</div><ul className="ingredient-list">{recipe.ingredients.map((item) => <li key={item.id}><span>{item.name}</span><strong>{item.quantity} {item.unit}</strong></li>)}</ul></div><div><div className="eyebrow">{t("ELKÉSZÍTÉS")}</div><ol className="instruction-list">{recipe.instructions.map((instruction, index) => <li key={`${recipe.id}-instruction-${index}`}>{instruction}</li>)}</ol></div></div></div></div>; }

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
  const phase = challengePhase(state.settings);
  const batches = state.batches.filter((batch) => {
    const used = state.assignments.filter((item) => item.batchId === batch.id).reduce((sum, item) => sum + item.servings, 0);
    return batch.weekStart === week || (batch.weekStart < week && used < batch.servings);
  });
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
    if (existing && !window.confirm(t("Ez a recept már szerepel a kiválasztott hét tervében. Új főzési adagot készítesz belőle?"))) return;
    const batch = { id: makeId("batch"), recipeId: selectedRecipe.id, weekStart: week, servings, mealPrep: mealPrepDraft };
    onUpdate((current) => ({ ...current, batches: [...current.batches, batch] }));
    setActiveBatch(batch.id);
    setPickerOpen(false);
    setSelectedRecipeId("");
    setPlannerNotice(locale === "en" ? `${localizeRecipe(selectedRecipe, locale).name} was added to the weekly cooking plan.` : `${selectedRecipe.name} bekerült a heti főzési tervbe.`);
  };

  const assign = (date: string, slot: MealSlot) => {
    if (!activeBatch) {
      setPlannerNotice(t("Előbb válassz ki egy főzési adagot a heti főzési tervből."));
      return;
    }
    if (!isMealPlanDate(state.settings, date)) {
      setPlannerNotice(t("A kihívás kezdése előtti vagy a 75 nap utáni nap nem tervezhető."));
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
      window.alert(t("Ez a főzési adag már elfogyott. Növeld az adagok számát a tervben."));
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
    if (!window.confirm(`${t("Törlöd a(z)")} „${recipe?.name ?? t("ismeretlen recept")}” ${t("főzési adagot és a hozzá tartozó étkezéseket?")}`)) return;
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
    <PageHeader eyebrow="HETI MENÜ" title="Heti menü" action={<div className="week-switcher"><button type="button" onClick={() => changeWeek(addDays(week, -7))} aria-label={t("Előző hét")}><ArrowLeft size={18} /></button><strong>{formatDate(week, { month: "short", day: "numeric" })} – {formatDate(addDays(week, 6), { month: "short", day: "numeric" })}</strong><button type="button" onClick={() => changeWeek(addDays(week, 7))} aria-label={t("Következő hét")}><ArrowRight size={18} /></button></div>} />
    {phase === "upcoming" ? <div className="planner-notice" role="status">{t("A kezdés előtti napok zárolva vannak; a kezdőnaptól mind a 75 nap tervezhető.")}</div> : null}
    {plannerNotice ? <div className="planner-notice" role="status">{plannerNotice}</div> : null}
    {selectedBatch && selectedBatchRecipe ? <div className="selected-batch-banner" data-testid="active-batch-banner"><div><span className="eyebrow">{t("KIJELÖLT FŐZÉSI ADAG")}</span><strong>{selectedBatchRecipe.name}</strong><small>{selectedBatchUsed} / {selectedBatch.servings} {t("adag felhasználva")} · {t("még")} {Math.max(0, selectedBatch.servings - selectedBatchUsed)} {t("adag")}</small></div><button type="button" className="secondary-button" onClick={() => setActiveBatch("")}>{t("Kijelölés törlése")}</button></div> : <div className="planner-hint">{t("Válassz egy főzési adagot, majd kattints a naptárban a reggeli, ebéd vagy vacsora mezőjére.")}</div>}
    <div className="planner-layout">
        <section className="card meal-board"><div className="card-heading"><div><div className="eyebrow">{t("HETI ÉTKEZÉSI TERV")}</div><h3>{t("Reggeli · ebéd · vacsora")}</h3></div><span className="muted small">{state.assignments.filter((item) => item.date >= week && item.date <= addDays(week, 6)).length} {t("étkezés tervezve")}</span></div><div className="meal-board-grid"><div className="meal-board-labels"><span /><strong>{t("Reggeli")}</strong><strong>{t("Ebéd")}</strong><strong>{t("Vacsora")}</strong></div>{weekDates.map((date) => <div className={`planner-day ${!isMealPlanDate(state.settings, date) ? "before-start" : ""}`} key={date}><div className="planner-day-head"><strong>{formatDate(date, { weekday: "short" })}</strong><span>{parseLocalDate(date).getDate()}</span></div>{(["reggeli", "ebed", "vacsora"] as MealSlot[]).map((slot) => { const assignment = state.assignments.find((item) => item.date === date && item.slot === slot); const batch = assignment ? state.batches.find((item) => item.id === assignment.batchId) : undefined; const recipe = batch ? state.recipes.map((item) => localizeRecipe(item, locale)).find((item) => item.id === batch.recipeId) : undefined; const planAllowed = isMealPlanDate(state.settings, date); return <button type="button" key={slot} data-testid={`planner-slot-${date}-${slot}`} aria-label={`${formatDate(date, { weekday: "long", month: "long", day: "numeric" })} ${slotLabels[slot]}`} aria-disabled={!planAllowed && !assignment} disabled={!planAllowed && !assignment} className={`planner-slot ${assignment ? "filled" : ""} ${activeBatch ? "ready" : ""} ${!planAllowed ? "disabled" : ""}`} title={assignment ? `${recipe?.name ?? t("Étkezések")} · ${t("Kattints a cseréhez vagy eltávolításhoz")}` : planAllowed ? `${slotLabels[slot]} ${t("hozzáadása")}` : t("A kihívás kezdése előtt nem tervezhető.")} onClick={() => assignment && activeBatch && assignment.batchId !== activeBatch ? assign(date, slot) : assignment ? removeAssignment(assignment.id) : assign(date, slot)}>{recipe ? <><span className="slot-dot" /><span>{recipe.name}</span><X size={15} /></> : <Plus size={19} />}</button>; })}</div>)}</div></section>
      <aside className="planner-side"><div className="card batch-card"><div className="card-heading"><div><div className="eyebrow">{t("HETI FŐZÉSI TERV")}</div><h3>{t("Főzési adagok")}</h3></div><button className="icon-button" type="button" data-testid="open-recipe-picker" aria-label={t("Recept hozzáadása")} onClick={openPicker}><Plus size={19} /></button></div>{batches.length ? batches.map((batch) => { const recipe = state.recipes.map((item) => localizeRecipe(item, locale)).find((item) => item.id === batch.recipeId); const used = state.assignments.filter((item) => item.batchId === batch.id).reduce((sum, item) => sum + item.servings, 0); return <div key={batch.id}><div className={`batch-row ${activeBatch === batch.id ? "active" : ""}`}><button type="button" className="batch-select" data-testid={`batch-select-${batch.id}`} onClick={() => setActiveBatch(batch.id)}><span className="batch-thumb"><Utensils size={19} /></span><span><strong>{recipe?.name}</strong><small>{used} / {batch.servings} {t("adag felhasználva")}{batch.mealPrep ? ` · ${t("Főzési adag")}` : ` · ${t("egy étkezés")}`}</small><ProgressBar value={(used / Math.max(1, batch.servings)) * 100} /></span></button><button type="button" className="batch-action" aria-label={`${recipe?.name ?? t("Főzési adag")} ${t("Szerkesztés")}`} onClick={() => startBatchEdit(batch)}><Edit3 size={18} /></button><button type="button" className="batch-action danger" aria-label={`${recipe?.name ?? t("Főzési adag")} ${t("Törlés")}`} onClick={() => deleteBatch(batch)}><Trash2 size={18} /></button></div>{editingBatchId === batch.id ? <div className="batch-edit-form"><Field label="Adagok"><input data-testid="batch-edit-servings" type="number" min={Math.max(1, used)} step="1" value={editingServings} onChange={(event) => setEditingServings(event.target.value)} /></Field><label className="toggle-row"><input type="checkbox" checked={editingMealPrep} onChange={(event) => setEditingMealPrep(event.target.checked)} /><span className="toggle" /><span><strong>{t("Főzési adag")}</strong><small>{t("Több étkezéshez készül.")}</small></span></label><div className="batch-edit-actions"><button type="button" className="secondary-button" onClick={() => setEditingBatchId("")}>{t("Mégsem")}</button><button type="button" className="primary-button" onClick={saveBatchEdit}>{t("Mentés")}</button></div></div> : null}</div>; }) : <div className="empty-state"><Utensils size={28} /><strong>{t("Még nincs főzési terved")}</strong><p>{t("A plusz gombbal válassz receptet és állítsd be az adagokat.")}</p></div>}
        {pickerOpen ? <div className="recipe-picker-panel"><div className="recipe-picker-head"><div><div className="eyebrow">{t("RECEPT HOZZÁADÁSA")}</div><h3>{t("Válassz a receptjeid közül")}</h3></div><button type="button" className="icon-button" aria-label={t("Receptválasztó bezárása")} onClick={() => setPickerOpen(false)}><X size={19} /></button></div><div className="search-field recipe-picker-search"><Search size={18} /><input data-testid="recipe-picker-search" value={recipeQuery} onChange={(event) => setRecipeQuery(event.target.value)} placeholder={t("Keress receptnév alapján…")} /></div><div className="filter-pills recipe-picker-filters">{recipeCategories.map((category) => <button type="button" key={category} className={recipeCategory === category ? "active" : ""} onClick={() => setRecipeCategory(category)}>{translateCategory(category, locale)}</button>)}</div><div className="picker-scroll recipe-picker-results">{filteredRecipes.length ? filteredRecipes.map((rawRecipe) => { const recipe = localizeRecipe(rawRecipe, locale); return <button type="button" key={recipe.id} data-testid={`recipe-picker-option-${recipe.id}`} className={`recipe-picker-option ${selectedRecipeId === recipe.id ? "selected" : ""}`} onClick={() => selectRecipe(rawRecipe)}><span className="batch-thumb"><Utensils size={19} /></span><span><strong>{recipe.name}</strong><small>{translateCategory(recipe.category, locale)} · {recipe.servings} {t("alap adag")}</small></span>{selectedRecipeId === recipe.id ? <Check size={19} /> : <Plus size={18} />}</button>; }) : <div className="empty-state"><Search size={26} /><strong>{t("Nincs találat")}</strong><p>{t("Próbálj másik nevet vagy kategóriát.")}</p></div>}</div>{selectedRecipe ? <div className="batch-create-form"><div><strong>{localizeRecipe(selectedRecipe, locale).name}</strong><small>{translateCategory(localizeRecipe(selectedRecipe, locale).category, locale)}</small></div><Field label="Elkészítendő adagok"><input data-testid="batch-servings-input" type="number" min="1" step="1" value={servingsDraft} onChange={(event) => setServingsDraft(event.target.value)} /></Field><label className="toggle-row"><input type="checkbox" checked={mealPrepDraft} onChange={(event) => setMealPrepDraft(event.target.checked)} /><span className="toggle" /><span><strong>{t("Főzési adag")}</strong><small>{t("Több étkezéshez is felhasználható.")}</small></span></label><button type="button" data-testid="batch-add-button" className="primary-button wide" onClick={addBatch}>{t("Főzési adag hozzáadása")} <Plus size={18} /></button></div> : <p className="picker-help">{t("Kattints egy receptre az adagok beállításához.")}</p>}</div> : <div className="recipe-picker-closed"><p className="muted small">{t("A plusz gomb megnyitja az összes receptet, saját receptekkel együtt.")}</p></div>}
      </div></aside>
    </div>
  </div>;
}


function ProgressView({ state, elapsed, phase, onDeletePhoto }: { state: SoftState; elapsed: number; phase: ChallengePhase; onDeletePhoto: (photoId: string) => void }) {
  const { locale, t } = useLanguage();
  if (phase === "upcoming") return <div className="page-enter"><PageHeader eyebrow={t("HALADÁS")} title={t("A kihívásod még nem indult el")} description={t("A haladásod itt jelenik meg, amikor a napi követés elindul.")} /><section className="card upcoming-message-card"><h3>{t("A kihívás még nem kezdődött el.")}</h3><p className="muted">{t("A tervezett étkezéseid ettől függetlenül megmaradnak és frissülnek.")}</p></section></div>;
  const logs = Object.entries(state.logs).filter(([date]) => isChallengeLogDate(state.settings, date)).map(([, log]) => log);
  const completed = logs.filter((log) => completionForDay(log, state.settings) === 100).length;
  const partial = logs.filter((log) => { const value = completionForDay(log, state.settings); return value > 0 && value < 100; }).length;
  const waterDays = logs.filter((log) => (log.water ?? 0) >= state.settings.waterTarget);
  const avgWater = logs.length ? logs.reduce((sum, log) => sum + (log.water ?? 0), 0) / logs.length : 0;
  const totalReading = logs.reduce((sum, log) => sum + (log.readingPages ?? 0), 0);
  const totalMinutes = logs.reduce((sum, log) => sum + (log.readingMinutes ?? 0), 0);
  const exerciseMinutes = logs.reduce((sum, log) => sum + (log.exerciseMinutes ?? 0), 0);
  const alcoholDays = logs.filter((log) => log.alcohol === "yes").length;
  const number = new Intl.NumberFormat(locale === "hu" ? "hu-HU" : "en-GB", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
  return <div className="page-enter"><PageHeader eyebrow="HALADÁS" title="Haladás" action={<div className="progress-pill"><Leaf size={17} /> {elapsed} {t("nap")}</div>} /><div className="progress-overview-grid"><div className="card progress-overview-card"><div className="eyebrow">{t("KÉP A KIHÍVÁSRÓL")}</div><div className="big-stat"><strong>{Math.round((elapsed / 75) * 100)}%</strong><span>{t("időben eltelt")}</span></div><ProgressBar value={(elapsed / 75) * 100} /><div className="progress-mini-stats"><span><strong>{completed}</strong> {t("teljes nap")}</span><span><strong>{partial}</strong> {t("részleges")}</span><span><strong>{state.settings.skipAllowance}</strong> {t("kihagyás")}</span></div></div><div className="card metric-highlight lavender-highlight"><span className="round-icon"><Droplets size={20} /></span><div><small>{t("Átlagos vízbevitel")}</small><strong>{number.format(avgWater)} L</strong><span>{waterDays.length} {t("napon elérted a célt")}</span></div></div><div className="card metric-highlight peach-highlight"><span className="round-icon"><Activity size={20} /></span><div><small>{t("Összes mozgás")}</small><strong>{exerciseMinutes} {t("perc")}</strong><span>{logs.filter((log) => (log.exerciseMinutes ?? 0) > 0).length} {t("aktív nap")}</span></div></div></div><div className="stats-grid"><section className="card chart-card"><div className="card-heading"><div><div className="eyebrow">{t("VÍZBEVITEL")}</div><h3>{t("Vízbevitel az elmúlt napokban")}</h3></div><span className="chart-value">{waterDays.length} / {logs.length || 0} {t("nap")}</span></div><div className="bar-chart">{Array.from({ length: 14 }, (_, index) => { const date = addDays(localDateString(), index - 13); const value = isChallengeLogDate(state.settings, date) ? state.logs[date]?.water ?? 0 : 0; return <div className="bar-column" key={date}><div className="bar-wrap"><div className="bar" style={{ height: `${Math.max(8, Math.min(100, (value / state.settings.waterTarget) * 100))}%` }} /></div><span>{parseLocalDate(date).getDate()}</span></div>; })}</div></section><section className="card reading-card"><div className="card-heading"><div><div className="eyebrow">{t("OLVASÁS")}</div><h3>{t("Olvasási idő")}</h3></div><BookOpen size={21} className="muted-icon" /></div><div className="reading-stats"><div><strong>{totalReading}</strong><span>{t("oldal összesen")}</span></div><div><strong>{totalMinutes}</strong><span>{t("perc összesen")}</span></div></div></section><section className="card history-card"><div className="card-heading"><div><div className="eyebrow">{t("ALKOHOL")}</div><h3>{t("Alkoholfogyasztás")}</h3></div></div><div className="alcohol-stat"><div className="alcohol-stat-ring"><strong>{alcoholDays}</strong><span>{t("nap")}</span></div><div><strong>{t("Fogyasztással jelölt napok")}</strong></div></div></section><section className="card photos-card"><div className="card-heading"><div><div className="eyebrow">{t("PROGRESS KÉPEK")}</div><h3>{t("Progress képek")}</h3></div><ImagePlus size={21} className="muted-icon" /></div><div className="photo-strip">{state.photos.length ? state.photos.slice(-4).map((photo) => <div className="photo-tile" key={photo.id}>{photo.dataUrl ? <Image src={photo.dataUrl} alt={t("Progress kép")} fill sizes="74px" unoptimized /> : <ImagePlus size={18} />}<small>{formatDate(photo.date)}</small><button type="button" className="photo-delete" onClick={() => { if (window.confirm(t("Törlöd ezt a progress képet?"))) onDeletePhoto(photo.id); }} aria-label={`${t("Progress kép")} ${t("Törlés")} ${formatDate(photo.date)}`}><Trash2 size={14} /></button></div>) : <div className="photo-empty"><ImagePlus size={22} /><span>{t("Az első képed még vár rád.")}</span></div>}</div></section></div></div>;
}

const MAX_PROGRESS_PHOTO_BYTES = 8 * 1024 * 1024;

function readProgressPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("The image could not be read."));
    reader.onload = () => {
      const source = String(reader.result);
      const image = new window.Image();
      image.onerror = () => reject(new Error("The image could not be decoded."));
      image.onload = () => {
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

function ProgressPhotoFab({ settings, onUpdate }: { settings: ChallengeSettings; onUpdate: (updater: (current: SoftState) => SoftState) => void }) { const { t } = useLanguage(); const challengeEnd = challengeEndDate(settings.startDate); const initialDate = localDateString() <= challengeEnd ? localDateString() : challengeEnd; const [date, setDate] = useState(initialDate); const [open, setOpen] = useState(false); const [error, setError] = useState(""); const upload = async (event: ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; if (!["image/png", "image/jpeg", "image/webp"].includes(file.type) || file.size > MAX_PROGRESS_PHOTO_BYTES) { setError(t("A kép PNG, JPG vagy WEBP formátumú és legfeljebb 8 MB lehet.")); event.target.value = ""; return; } if (!isChallengeDate(settings, date) || date > localDateString()) { setError(t("Progress képet csak a kihívás érvényes napjára tölthetsz fel.")); event.target.value = ""; return; } try { const dataUrl = await readProgressPhoto(file); onUpdate((current) => ({ ...current, photos: [...current.photos, { id: makeId("photo"), date, dataUrl }] })); setError(""); setOpen(false); } catch { setError(t("A kép feldolgozása nem sikerült.")); } finally { event.target.value = ""; } }; return <div className="photo-fab-wrap"><button type="button" className="photo-fab" onClick={() => setOpen((value) => !value)}><ImagePlus size={18} /> {t("Progress kép")}</button>{open ? <div className="photo-fab-panel" role="dialog" aria-label={t("Progress kép")}><h4>{t("Progress kép hozzáadása")}</h4><label className="field">{t("Dátum")}<input type="date" min={settings.startDate} max={challengeEnd} value={date} onChange={(event) => setDate(event.target.value)} /></label><label className="upload-drop"><ImagePlus size={22} /><span>{t("Kép feltöltése")}</span><small>{t("JPG, PNG vagy WEBP · legfeljebb 8 MB · csak helyben")}</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} /></label>{error ? <p className="form-error" role="alert">{error}</p> : null}</div> : null}</div>; }


export default SoftChallengeApp;
