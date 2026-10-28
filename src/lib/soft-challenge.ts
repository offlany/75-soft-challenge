export type HabitId = "movement" | "reading" | "water" | "mindful";
export type MealSlot = "reggeli" | "ebed" | "vacsora";

export type Ingredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  note?: string;
  category: string;
};

export type Recipe = {
  id: string;
  name: string;
  category: string;
  description: string;
  ingredients: Ingredient[];
  servings: number;
  activeMinutes: number;
  totalMinutes: number;
  mealPrep: boolean;
  storage: string;
  freezable: boolean;
  favorite: boolean;
  instructions: string[];
};

export type ChallengeSettings = {
  active: boolean;
  startDate: string;
  startTime: string;
  waterTarget: number;
  pictureInterval: number;
  includeDayOnePicture: boolean;
  skipsEnabled: boolean;
  skipAllowance: number;
  skipScope: "het" | "kihivas";
  restDay: string;
  habits: Record<HabitId, boolean>;
};

export type DayLog = {
  water?: number;
  readingPages?: number;
  readingMinutes?: number;
  exerciseMinutes?: number;
  exerciseType?: string;
  mindful?: boolean;
  restDay?: boolean;
  selfCare?: string;
  alcohol?: "none" | "yes" | "unknown";
  alcoholOccasion?: string;
  notes?: string;
  skips?: HabitId[];
};

export type CookingBatch = {
  id: string;
  recipeId: string;
  weekStart: string;
  servings: number;
  mealPrep?: boolean;
};

export type MealAssignment = {
  id: string;
  date: string;
  slot: MealSlot;
  batchId: string;
  servings: number;
};

export type ProgressPhoto = {
  id: string;
  date: string;
  dataUrl?: string;
  note?: string;
};

export type GroceryStatus = {
  purchased?: boolean;
  pantry?: boolean;
};

export type SoftState = {
  settings: ChallengeSettings;
  logs: Record<string, DayLog>;
  recipes: Recipe[];
  batches: CookingBatch[];
  assignments: MealAssignment[];
  photos: ProgressPhoto[];
  groceryStatus: Record<string, GroceryStatus>;
  manualGroceries: { id: string; name: string; quantity: number; unit: string; category: string }[];
};

const ingredient = (
  id: string,
  name: string,
  quantity: number,
  unit: string,
  category: string,
  note?: string
): Ingredient => ({ id, name, quantity, unit, category, note });

const recipe = (
  id: string,
  name: string,
  category: string,
  servings: number,
  activeMinutes: number,
  totalMinutes: number,
  ingredients: Ingredient[],
  instructions: string[],
  mealPrep = false,
  storage = "2–3 nap hűtőben",
  freezable = false
): Recipe => ({
  id,
  name,
  category,
  description: `${name} egyszerű, jól előkészíthető hétköznapi fogás.`,
  servings,
  activeMinutes,
  totalMinutes,
  ingredients,
  instructions,
  mealPrep,
  storage,
  freezable,
  favorite: false
});

export const seedRecipes: Recipe[] = [
  recipe("r1", "Erdei gyümölcsös joghurtos müzlitál", "Reggeli", 1, 5, 5, [ingredient("r1i1", "görög joghurt", 180, "g", "Tejtermékek és tojás"), ingredient("r1i2", "erdei gyümölcs", 100, "g", "Zöldségek és gyümölcsök"), ingredient("r1i3", "müzli", 45, "g", "Szárazáruk"), ingredient("r1i4", "méz", 10, "g", "Fűszerek és szószok")], ["Kanalazd a joghurtot egy tálba.", "Rétegezd rá a gyümölcsöt és a müzlit, végül csorgasd meg mézzel."] ),
  recipe("r2", "Csokis-banános overnight oats", "Reggeli", 1, 5, 480, [ingredient("r2i1", "zabpehely", 55, "g", "Szárazáruk"), ingredient("r2i2", "tej", 140, "ml", "Tejtermékek és tojás"), ingredient("r2i3", "kakaópor", 8, "g", "Szárazáruk"), ingredient("r2i4", "banán", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r2i5", "mogyoróvaj", 15, "g", "Szárazáruk")], ["Keverd össze a zabot, tejet és kakaót.", "Tedd hűtőbe egy éjszakára, reggel banánnal és mogyoróvajjal tálald."] ),
  recipe("r3", "Epres-banános smoothie bowl", "Reggeli", 1, 5, 5, [ingredient("r3i1", "fagyasztott eper", 150, "g", "Zöldségek és gyümölcsök"), ingredient("r3i2", "banán", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r3i3", "görög joghurt", 100, "g", "Tejtermékek és tojás"), ingredient("r3i4", "tej", 50, "ml", "Tejtermékek és tojás"), ingredient("r3i5", "granola", 30, "g", "Szárazáruk")], ["Turmixold krémesre a gyümölcsöt, joghurtot és tejet.", "Öntsd tálba, szórd meg granolával."] ),
  recipe("r4", "Sajtos-spenótos rántotta", "Reggeli", 1, 10, 10, [ingredient("r4i1", "tojás", 2, "db", "Tejtermékek és tojás"), ingredient("r4i2", "bébispenót", 60, "g", "Zöldségek és gyümölcsök"), ingredient("r4i3", "reszelt sajt", 30, "g", "Tejtermékek és tojás"), ingredient("r4i4", "teljes kiőrlésű kenyér", 1, "szelet", "Szárazáruk")], ["Pirítsd meg a spenótot egy kevés olajon.", "Öntsd rá a felvert tojást, szórd meg sajttal, és süsd készre."] ),
  recipe("r5", "Mézes túrókrém eperrel", "Reggeli", 1, 5, 5, [ingredient("r5i1", "túró", 150, "g", "Tejtermékek és tojás"), ingredient("r5i2", "görög joghurt", 60, "g", "Tejtermékek és tojás"), ingredient("r5i3", "méz", 12, "g", "Fűszerek és szószok"), ingredient("r5i4", "eper", 100, "g", "Zöldségek és gyümölcsök"), ingredient("r5i5", "granola", 20, "g", "Szárazáruk")], ["Keverd krémesre a túrót, joghurtot és mézet.", "Tálald eperrel és granolával."] ),
  recipe("r6", "Sonkás-sajtos tojásos tortilla", "Reggeli", 1, 10, 10, [ingredient("r6i1", "tortillalap", 1, "db", "Szárazáruk"), ingredient("r6i2", "tojás", 2, "db", "Tejtermékek és tojás"), ingredient("r6i3", "sonka", 50, "g", "Hús és hal"), ingredient("r6i4", "reszelt sajt", 30, "g", "Tejtermékek és tojás"), ingredient("r6i5", "paradicsom", 80, "g", "Zöldségek és gyümölcsök")], ["Süsd meg a tojást és a sonkát.", "Töltsd tortillába sajttal és paradicsommal, majd hajtsd félbe."] ),
  recipe("r7", "Mézes-mustáros csirke", "Csirkés és húsos", 2, 20, 25, [ingredient("r7i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r7i2", "rizs", 150, "g", "Szárazáruk"), ingredient("r7i3", "brokkoli", 200, "g", "Zöldségek és gyümölcsök"), ingredient("r7i4", "főzőtejszín", 100, "ml", "Tejtermékek és tojás"), ingredient("r7i5", "mustár", 20, "g", "Fűszerek és szószok"), ingredient("r7i6", "méz", 15, "g", "Fűszerek és szószok")], ["Főzd meg a rizst és párold roppanósra a brokkolit.", "Pirítsd meg a csirkét, add hozzá a mustárt, mézet és tejszínt, majd főzd össze."] ),
  recipe("r8", "Fokhagymás-parmezános csirke", "Csirkés és húsos", 2, 20, 20, [ingredient("r8i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r8i2", "fokhagyma", 2, "gerezd", "Zöldségek és gyümölcsök"), ingredient("r8i3", "parmezán", 35, "g", "Tejtermékek és tojás"), ingredient("r8i4", "főzőtejszín", 120, "ml", "Tejtermékek és tojás"), ingredient("r8i5", "bébispenót", 80, "g", "Zöldségek és gyümölcsök"), ingredient("r8i6", "rizs", 150, "g", "Szárazáruk")], ["Pirítsd körbe a csirkét.", "Add hozzá a fokhagymát, tejszínt, spenótot és parmezánt, majd tálald rizzsel."] ),
  recipe("r9", "Mexikói csirkés fajita tortilla", "Csirkés és húsos", 2, 20, 20, [ingredient("r9i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r9i2", "kaliforniai paprika", 2, "db", "Zöldségek és gyümölcsök"), ingredient("r9i3", "vöröshagyma", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r9i4", "tortillalap", 4, "db", "Szárazáruk"), ingredient("r9i5", "reszelt sajt", 60, "g", "Tejtermékek és tojás"), ingredient("r9i6", "tejföl", 80, "g", "Tejtermékek és tojás")], ["Csíkozd fel és fűszerezd a csirkét.", "Süsd össze a paprikával és hagymával, majd töltsd tortillába sajttal és tejföllel."] ),
  recipe("r10", "Teriyaki csirkés rizstál", "Csirkés és húsos", 2, 20, 25, [ingredient("r10i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r10i2", "szójaszósz", 45, "ml", "Fűszerek és szószok"), ingredient("r10i3", "méz", 20, "g", "Fűszerek és szószok"), ingredient("r10i4", "rizs", 150, "g", "Szárazáruk"), ingredient("r10i5", "brokkoli", 200, "g", "Zöldségek és gyümölcsök"), ingredient("r10i6", "szezámmag", 10, "g", "Szárazáruk")], ["Főzd meg a rizst és párold meg a brokkolit.", "Süsd ki a csirkét, öntsd rá a szójaszószt és mézet, majd sűrítsd be."] ),
  recipe("r11", "Tejszínes-zöldbabos csirke", "Csirkés és húsos", 2, 20, 25, [ingredient("r11i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r11i2", "zöldbab", 250, "g", "Zöldségek és gyümölcsök"), ingredient("r11i3", "fokhagyma", 2, "gerezd", "Zöldségek és gyümölcsök"), ingredient("r11i4", "főzőtejszín", 120, "ml", "Tejtermékek és tojás"), ingredient("r11i5", "rizs", 150, "g", "Szárazáruk")], ["Pirítsd meg a csirkét fokhagymával.", "Add hozzá a zöldbabot és tejszínt, majd főzd puhára, rizzsel tálald."] ),
  recipe("r12", "Sajtos-darált húsos quesadilla", "Csirkés és húsos", 2, 20, 20, [ingredient("r12i1", "darált marhahús", 250, "g", "Hús és hal"), ingredient("r12i2", "tortillalap", 4, "db", "Szárazáruk"), ingredient("r12i3", "kaliforniai paprika", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r12i4", "kukorica", 120, "g", "Konzervek"), ingredient("r12i5", "reszelt sajt", 100, "g", "Tejtermékek és tojás"), ingredient("r12i6", "tejföl", 80, "g", "Tejtermékek és tojás")], ["Pirítsd meg a húst a paprikával.", "Töltsd tortillába kukoricával és sajttal, majd serpenyőben pirítsd ropogósra."] ),
  recipe("r13", "Gyors csirkepaprikás rizzsel", "Csirkés és húsos", 2, 20, 25, [ingredient("r13i1", "csirkemell", 300, "g", "Hús és hal"), ingredient("r13i2", "vöröshagyma", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r13i3", "fűszerpaprika", 8, "g", "Fűszerek és szószok"), ingredient("r13i4", "tejföl", 120, "g", "Tejtermékek és tojás"), ingredient("r13i5", "rizs", 150, "g", "Szárazáruk")], ["Párold meg a hagymát, húzd le a tűzről és keverd bele a paprikát.", "Add hozzá a csirkét, kevés vizet és főzd puhára, tejföllel selymesítsd."] ),
  recipe("r14", "Fokhagymás-tejszínes lazac", "Halas", 2, 15, 20, [ingredient("r14i1", "lazacfilé", 300, "g", "Hús és hal"), ingredient("r14i2", "fokhagyma", 2, "gerezd", "Zöldségek és gyümölcsök"), ingredient("r14i3", "főzőtejszín", 120, "ml", "Tejtermékek és tojás"), ingredient("r14i4", "bébispenót", 80, "g", "Zöldségek és gyümölcsök"), ingredient("r14i5", "parmezán", 25, "g", "Tejtermékek és tojás"), ingredient("r14i6", "rizs", 150, "g", "Szárazáruk")], ["Süsd meg a lazacot bőrös oldalával lefelé.", "A serpenyőben készíts fokhagymás-tejszínes spenótszószt, és tálald rizzsel."] ),
  recipe("r15", "Mézes-szójás lazac", "Halas", 2, 15, 25, [ingredient("r15i1", "lazacfilé", 300, "g", "Hús és hal"), ingredient("r15i2", "méz", 20, "g", "Fűszerek és szószok"), ingredient("r15i3", "szójaszósz", 40, "ml", "Fűszerek és szószok"), ingredient("r15i4", "rizs", 150, "g", "Szárazáruk"), ingredient("r15i5", "brokkoli", 200, "g", "Zöldségek és gyümölcsök"), ingredient("r15i6", "szezámmag", 10, "g", "Szárazáruk")], ["Keverd össze a mézet és szójaszószt.", "Kend a lazacra, süsd készre, és tálald rizzsel, brokkolival."] ),
  recipe("r16", "Sült lazac édesburgonyával", "Halas", 2, 15, 35, [ingredient("r16i1", "lazacfilé", 300, "g", "Hús és hal"), ingredient("r16i2", "édesburgonya", 400, "g", "Zöldségek és gyümölcsök"), ingredient("r16i3", "zöldborsó", 150, "g", "Zöldségek és gyümölcsök"), ingredient("r16i4", "citrom", 1, "db", "Zöldségek és gyümölcsök")], ["Kockázd fel az édesburgonyát és süsd 200 fokon 20 percig.", "Tedd mellé a lazacot, locsold citrommal, és süsd további 12–15 percig."] ),
  recipe("r17", "Halrudacska krumplipürével", "Halas", 2, 15, 25, [ingredient("r17i1", "halrudacska", 300, "g", "Hús és hal"), ingredient("r17i2", "burgonya", 450, "g", "Zöldségek és gyümölcsök"), ingredient("r17i3", "zöldborsó", 150, "g", "Zöldségek és gyümölcsök"), ingredient("r17i4", "tej", 80, "ml", "Tejtermékek és tojás"), ingredient("r17i5", "vaj", 20, "g", "Tejtermékek és tojás")], ["Főzd puhára a burgonyát, majd törd össze tejjel és vajjal.", "Süsd meg a halrudacskát, a borsót párold meg, és tálald együtt."] ),
  recipe("r18", "Halrudacskás tortilla", "Halas", 2, 15, 20, [ingredient("r18i1", "halrudacska", 250, "g", "Hús és hal"), ingredient("r18i2", "tortillalap", 4, "db", "Szárazáruk"), ingredient("r18i3", "fejes saláta", 100, "g", "Zöldségek és gyümölcsök"), ingredient("r18i4", "paradicsom", 120, "g", "Zöldségek és gyümölcsök"), ingredient("r18i5", "görög joghurt", 100, "g", "Tejtermékek és tojás"), ingredient("r18i6", "fokhagyma", 1, "gerezd", "Zöldségek és gyümölcsök")], ["Süsd ropogósra a halrudacskát.", "Keverj fokhagymás joghurtot, majd töltsd a tortillába salátával és paradicsommal."] ),
  recipe("r19", "Fetás shakshuka", "Húsmentes", 2, 15, 20, [ingredient("r19i1", "tojás", 4, "db", "Tejtermékek és tojás"), ingredient("r19i2", "paradicsom", 400, "g", "Zöldségek és gyümölcsök"), ingredient("r19i3", "kaliforniai paprika", 1, "db", "Zöldségek és gyümölcsök"), ingredient("r19i4", "feta", 80, "g", "Tejtermékek és tojás"), ingredient("r19i5", "teljes kiőrlésű kenyér", 4, "szelet", "Szárazáruk")], ["Pirítsd meg a paprikát, add hozzá a paradicsomot és főzd sűrűre.", "Üsd bele a tojásokat, morzsold rá a fetát, és fedő alatt süsd készre."] ),
  recipe("r20", "Tejfölös zöldbabfőzelék tükörtojással", "Húsmentes", 2, 15, 25, [ingredient("r20i1", "zöldbab", 450, "g", "Zöldségek és gyümölcsök"), ingredient("r20i2", "tejföl", 150, "g", "Tejtermékek és tojás"), ingredient("r20i3", "fokhagyma", 1, "gerezd", "Zöldségek és gyümölcsök"), ingredient("r20i4", "tojás", 4, "db", "Tejtermékek és tojás")], ["Főzd puhára a zöldbabot sós vízben.", "Tejföllel sűrítsd be, és tükörtojással tálald."] ),
  recipe("r21", "Lencsefőzelék tojással", "Húsmentes", 2, 15, 20, [ingredient("r21i1", "főtt lencse", 400, "g", "Konzervek"), ingredient("r21i2", "tejföl", 100, "g", "Tejtermékek és tojás"), ingredient("r21i3", "mustár", 15, "g", "Fűszerek és szószok"), ingredient("r21i4", "babérlevél", 1, "db", "Fűszerek és szószok"), ingredient("r21i5", "tojás", 4, "db", "Tejtermékek és tojás")], ["Melegítsd át a lencsét babérlevéllel.", "Keverd bele a mustáros tejfölt, majd főtt tojással tálald."] ),
  recipe("r22", "Spenótos-ricottás gnocchi", "Húsmentes", 2, 10, 15, [ingredient("r22i1", "gnocchi", 400, "g", "Szárazáruk"), ingredient("r22i2", "bébispenót", 120, "g", "Zöldségek és gyümölcsök"), ingredient("r22i3", "ricotta", 150, "g", "Tejtermékek és tojás"), ingredient("r22i4", "fokhagyma", 1, "gerezd", "Zöldségek és gyümölcsök"), ingredient("r22i5", "parmezán", 25, "g", "Tejtermékek és tojás")], ["Főzd ki a gnocchit.", "Pirítsd meg a fokhagymát és spenótot, keverd hozzá a ricottát és a gnocchit, parmezánnal tálald."] ),
  recipe("r23", "Sajtos-brokkolis krumpliserpenyő", "Húsmentes", 2, 15, 25, [ingredient("r23i1", "burgonya", 450, "g", "Zöldségek és gyümölcsök"), ingredient("r23i2", "brokkoli", 200, "g", "Zöldségek és gyümölcsök"), ingredient("r23i3", "reszelt sajt", 100, "g", "Tejtermékek és tojás"), ingredient("r23i4", "tejföl", 80, "g", "Tejtermékek és tojás"), ingredient("r23i5", "tojás", 2, "db", "Tejtermékek és tojás")], ["Főzd elő a burgonyát és brokkolit.", "Pirítsd serpenyőben, öntsd le tojással, majd olvaszd rá a sajtot."] ),
  recipe("r24", "Kukoricás-spenótos rizottó", "Húsmentes", 2, 20, 30, [ingredient("r24i1", "rizottórizs", 160, "g", "Szárazáruk"), ingredient("r24i2", "kukorica", 150, "g", "Konzervek"), ingredient("r24i3", "bébispenót", 100, "g", "Zöldségek és gyümölcsök"), ingredient("r24i4", "parmezán", 40, "g", "Tejtermékek és tojás"), ingredient("r24i5", "vaj", 20, "g", "Tejtermékek és tojás")], ["Pirítsd meg a rizst, majd merőkanalanként add hozzá az alaplevet.", "A végén keverd bele a kukoricát, spenótot, vajat és parmezánt."] ),
  recipe("r25", "Chili con carne", "Többadagos ételek", 4, 25, 40, [ingredient("r25i1", "darált marhahús", 500, "g", "Hús és hal"), ingredient("r25i2", "passzírozott paradicsom", 500, "ml", "Konzervek"), ingredient("r25i3", "kukorica", 200, "g", "Konzervek"), ingredient("r25i4", "vörösbab", 240, "g", "Konzervek"), ingredient("r25i5", "rizs", 300, "g", "Szárazáruk"), ingredient("r25i6", "vöröshagyma", 1, "db", "Zöldségek és gyümölcsök")], ["Pirítsd meg a hagymát és a darált húst.", "Add hozzá a paradicsomot, babot, kukoricát és fűszereket, majd rotyogtasd 25 percig.", "Rizzsel tálald."], true, "4 nap hűtőben", true),
  recipe("r26", "Rakott karfiol", "Többadagos ételek", 4, 25, 55, [ingredient("r26i1", "karfiol", 800, "g", "Zöldségek és gyümölcsök"), ingredient("r26i2", "darált hús", 500, "g", "Hús és hal"), ingredient("r26i3", "rizs", 250, "g", "Szárazáruk"), ingredient("r26i4", "tejföl", 250, "g", "Tejtermékek és tojás"), ingredient("r26i5", "reszelt sajt", 120, "g", "Tejtermékek és tojás")], ["Főzd elő a karfiolt és rizst.", "Pirítsd meg a húst, rétegezd a hozzávalókat tejföllel, majd süsd sajttal aranybarnára."], true, "3 nap hűtőben", true),
  recipe("r27", "Sajtos-brokkolis rakott csirke", "Többadagos ételek", 4, 25, 50, [ingredient("r27i1", "csirkemell", 600, "g", "Hús és hal"), ingredient("r27i2", "brokkoli", 500, "g", "Zöldségek és gyümölcsök"), ingredient("r27i3", "rizs", 250, "g", "Szárazáruk"), ingredient("r27i4", "tejföl", 250, "g", "Tejtermékek és tojás"), ingredient("r27i5", "reszelt sajt", 150, "g", "Tejtermékek és tojás")], ["Főzd meg a rizst és párold a brokkolit.", "Keverd össze a csirkével és tejföllel, szórd meg sajttal, majd süsd 25 percig."], true, "3 nap hűtőben", true),
  recipe("r28", "Paradicsomos pulykahúsgombóc", "Többadagos ételek", 4, 25, 40, [ingredient("r28i1", "darált pulykahús", 600, "g", "Hús és hal"), ingredient("r28i2", "tojás", 1, "db", "Tejtermékek és tojás"), ingredient("r28i3", "passzírozott paradicsom", 600, "ml", "Konzervek"), ingredient("r28i4", "rizs", 300, "g", "Szárazáruk"), ingredient("r28i5", "parmezán", 40, "g", "Tejtermékek és tojás")], ["Keverd össze a pulykát tojással és fűszerekkel, formázz gombócokat.", "Süsd körbe, majd főzd készre a paradicsomszószban, rizzsel tálald."], true, "3 nap hűtőben", true),
  recipe("r29", "Tepsis csirke édesburgonyával", "Többadagos ételek", 3, 20, 45, [ingredient("r29i1", "csirkecombfilé", 600, "g", "Hús és hal"), ingredient("r29i2", "édesburgonya", 600, "g", "Zöldségek és gyümölcsök"), ingredient("r29i3", "brokkoli", 300, "g", "Zöldségek és gyümölcsök"), ingredient("r29i4", "kaliforniai paprika", 2, "db", "Zöldségek és gyümölcsök"), ingredient("r29i5", "fokhagyma", 3, "gerezd", "Zöldségek és gyümölcsök")], ["Kockázd fel az édesburgonyát és paprikát.", "Tedd tepsibe a csirkével és fokhagymával, majd süsd 200 fokon 35–40 percig."], true, "3 nap hűtőben", true),
  recipe("r30", "Tejszínes-spenótos csirkés krumplis rakottas", "Többadagos ételek", 4, 25, 55, [ingredient("r30i1", "csirkemell", 600, "g", "Hús és hal"), ingredient("r30i2", "burgonya", 800, "g", "Zöldségek és gyümölcsök"), ingredient("r30i3", "bébispenót", 200, "g", "Zöldségek és gyümölcsök"), ingredient("r30i4", "főzőtejszín", 250, "ml", "Tejtermékek és tojás"), ingredient("r30i5", "reszelt sajt", 150, "g", "Tejtermékek és tojás"), ingredient("r30i6", "fokhagyma", 2, "gerezd", "Zöldségek és gyümölcsök")], ["Szeleteld fel a burgonyát és pirítsd elő a csirkét.", "Rétegezd spenóttal és tejszínnel, szórd meg sajttal, majd süsd puhára."], true, "3 nap hűtőben", true)
];

export const createInitialState = (): SoftState => ({
  settings: {
    active: false,
    startDate: localDateString(),
    startTime: "07:00",
    waterTarget: 3,
    pictureInterval: 5,
    includeDayOnePicture: true,
    skipsEnabled: true,
    skipAllowance: 1,
    skipScope: "het",
    restDay: "vasárnap",
    habits: { movement: true, reading: true, water: true, mindful: true }
  },
  logs: {},
  recipes: seedRecipes,
  batches: [],
  assignments: [],
  photos: [],
  groceryStatus: {},
  manualGroceries: []
});

export function createRestartState(current: SoftState): SoftState {
  return { ...createInitialState(), recipes: current.recipes };
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseLocalDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(value: string, amount: number): string {
  const date = parseLocalDate(value);
  date.setDate(date.getDate() + amount);
  return localDateString(date);
}

export function dayNumber(startDate: string, date: string): number {
  const start = parseLocalDate(startDate).getTime();
  const current = parseLocalDate(date).getTime();
  return Math.floor((current - start) / 86400000) + 1;
}

export function challengeEndDate(startDate: string): string {
  return addDays(startDate, 74);
}

export function formatDate(value: string, options?: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("hu-HU", options ?? { month: "short", day: "numeric" }).format(parseLocalDate(value));
}

export function progressPictureDays(settings: ChallengeSettings): string[] {
  if (!settings.startDate) return [];
  const dates: string[] = [];
  for (let day = 1; day <= 75; day += 1) {
    if ((settings.includeDayOnePicture && day === 1) || day % settings.pictureInterval === 0) dates.push(addDays(settings.startDate, day - 1));
  }
  return dates;
}

export function isReadingComplete(log: DayLog | undefined): boolean {
  return (log?.readingPages ?? 0) >= 10 || (log?.readingMinutes ?? 0) >= 30;
}

export function isDayHabitComplete(habit: HabitId, log: DayLog | undefined, settings: ChallengeSettings): boolean {
  if (!settings.habits[habit]) return true;
  if (log?.skips?.includes(habit)) return false;
  if (habit === "movement") return (log?.exerciseMinutes ?? 0) >= 30 || Boolean(log?.restDay);
  if (habit === "reading") return isReadingComplete(log);
  if (habit === "water") return (log?.water ?? 0) >= settings.waterTarget;
  return Boolean(log?.mindful);
}

export function completionForDay(log: DayLog | undefined, settings: ChallengeSettings): number {
  const habits = (Object.keys(settings.habits) as HabitId[]).filter((habit) => settings.habits[habit]);
  if (!habits.length) return 0;
  return Math.round((habits.filter((habit) => isDayHabitComplete(habit, log, settings) || log?.skips?.includes(habit)).length / habits.length) * 100);
}

export function statusForDay(date: string, settings: ChallengeSettings, logs: Record<string, DayLog>): "future" | "current" | "complete" | "partial" | "incomplete" | "skip" {
  if (!settings.active) return "future";
  const number = dayNumber(settings.startDate, date);
  const today = localDateString();
  if (number < 1 || number > 75 || date > today) return "future";
  if (date === today) return "current";
  const log = logs[date];
  if (log?.skips?.length) return "skip";
  const completion = completionForDay(log, settings);
  if (completion === 100) return "complete";
  if (completion > 0) return "partial";
  return "incomplete";
}

export function weekStart(value: string): string {
  const date = parseLocalDate(value);
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return localDateString(date);
}

function normalizeGroceryUnit(unit: string): { key: string; label: string; factor: number } {
  const normalized = unit.toLocaleLowerCase("hu-HU").trim();
  if (["kg", "kilogramm", "kilogram"].includes(normalized)) return { key: "g", label: "g", factor: 1000 };
  if (["g", "gramm"].includes(normalized)) return { key: "g", label: "g", factor: 1 };
  if (["l", "liter", "litre"].includes(normalized)) return { key: "ml", label: "ml", factor: 1000 };
  if (["ml", "milliliter", "millilitre"].includes(normalized)) return { key: "ml", label: "ml", factor: 1 };
  if (["db", "darab"].includes(normalized)) return { key: "db", label: "db", factor: 1 };
  return { key: normalized, label: unit, factor: 1 };
}

export function aggregateGroceries(state: SoftState): { key: string; name: string; quantity: number; unit: string; category: string }[] {
  const totals = new Map<string, { key: string; name: string; quantity: number; unit: string; category: string }>();
  state.batches.forEach((batch) => {
    const currentRecipe = state.recipes.find((item) => item.id === batch.recipeId);
    if (!currentRecipe) return;
    currentRecipe.ingredients.forEach((item) => {
      const ratio = batch.servings / currentRecipe.servings;
      const normalizedName = item.name.toLocaleLowerCase("hu-HU").trim();
      const normalizedUnit = normalizeGroceryUnit(item.unit);
      const key = `${normalizedName}|${normalizedUnit.key}`;
      const existing = totals.get(key);
      if (existing) existing.quantity += item.quantity * ratio * normalizedUnit.factor;
      else totals.set(key, { key, name: item.name, quantity: item.quantity * ratio * normalizedUnit.factor, unit: normalizedUnit.label, category: item.category });
    });
  });
  return [...totals.values(), ...state.manualGroceries.map((item) => ({ ...item, key: `manual-${item.id}` }))];
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
