import type { AppLocale, Ingredient, Recipe } from "@/lib/soft-challenge";

type RecipeCopy = {
  name: string;
  category: string;
  instructions: string[];
};

const ingredientNames: Record<string, string> = {
  "görög joghurt": "Greek yogurt",
  "erdei gyümölcs": "Mixed berries",
  müzli: "Muesli",
  méz: "Honey",
  zabpehely: "Rolled oats",
  tej: "Milk",
  kakaópor: "Cocoa powder",
  banán: "Banana",
  mogyoróvaj: "Peanut butter",
  "fagyasztott eper": "Frozen strawberries",
  eper: "Strawberries",
  granola: "Granola",
  tojás: "Eggs",
  bébispenót: "Baby spinach",
  "reszelt sajt": "Grated cheese",
  "teljes kiőrlésű kenyér": "Wholegrain bread",
  túró: "Cottage cheese",
  tortillalap: "Tortilla wraps",
  sonka: "Ham",
  paradicsom: "Tomatoes",
  csirkemell: "Chicken breast",
  rizs: "Rice",
  brokkoli: "Broccoli",
  főzőtejszín: "Cooking cream",
  mustár: "Mustard",
  fokhagyma: "Garlic",
  parmezán: "Parmesan",
  "kaliforniai paprika": "Bell pepper",
  vöröshagyma: "Red onion",
  tejföl: "Sour cream",
  szójaszósz: "Soy sauce",
  szezámmag: "Sesame seeds",
  zöldbab: "Green beans",
  "darált marhahús": "Minced beef",
  kukorica: "Sweetcorn",
  "fűszerpaprika": "Paprika",
  lazacfilé: "Salmon fillet",
  édesburgonya: "Sweet potato",
  zöldborsó: "Green peas",
  citrom: "Lemon",
  halrudacska: "Fish fingers",
  burgonya: "Potatoes",
  vaj: "Butter",
  "fejes saláta": "Lettuce",
  feta: "Feta",
  "főtt lencse": "Cooked lentils",
  babérlevél: "Bay leaf",
  gnocchi: "Gnocchi",
  ricotta: "Ricotta",
  rizottórizs: "Risotto rice",
  "passzírozott paradicsom": "Passata",
  vörösbab: "Red kidney beans",
  karfiol: "Cauliflower",
  "darált hús": "Minced meat",
  "darált pulykahús": "Minced turkey",
  csirkecombfilé: "Boneless chicken thigh",
  "új hozzávaló": "new ingredient"
};

const ingredientCategories: Record<string, string> = {
  "Hús és hal": "Meat and fish",
  "Tejtermékek és tojás": "Dairy and eggs",
  "Zöldségek és gyümölcsök": "Fruit and vegetables",
  Szárazáruk: "Dry goods",
  "Fűszerek és szószok": "Spices and sauces",
  Konzervek: "Canned goods",
  Egyéb: "Other"
};

const recipeCopies: Record<string, RecipeCopy> = {
  r1: { name: "Mixed berry yogurt muesli bowl", category: "Breakfast", instructions: ["Spoon the yogurt into a bowl.", "Layer the berries and muesli on top, then drizzle with honey."] },
  r2: { name: "Chocolate banana overnight oats", category: "Breakfast", instructions: ["Mix the oats, milk, and cocoa.", "Refrigerate overnight and serve with banana and peanut butter in the morning."] },
  r3: { name: "Strawberry banana smoothie bowl", category: "Breakfast", instructions: ["Blend the fruit, yogurt, and milk until smooth.", "Pour into a bowl and top with granola."] },
  r4: { name: "Cheesy spinach scrambled eggs", category: "Breakfast", instructions: ["Sauté the spinach in a little oil.", "Pour over the beaten eggs, add the cheese, and cook until set."] },
  r5: { name: "Honey cottage cheese with strawberries", category: "Breakfast", instructions: ["Stir the cottage cheese, yogurt, and honey until creamy.", "Serve with strawberries and granola."] },
  r6: { name: "Ham, cheese, and egg tortilla", category: "Breakfast", instructions: ["Cook the egg and ham.", "Fill a tortilla with the cheese and tomatoes, then fold it in half."] },
  r7: { name: "Honey mustard chicken", category: "Chicken and meat", instructions: ["Cook the rice and steam the broccoli until crisp-tender.", "Brown the chicken, add the mustard, honey, and cream, then simmer together."] },
  r8: { name: "Garlic parmesan chicken", category: "Chicken and meat", instructions: ["Brown the chicken on all sides.", "Add the garlic, cream, spinach, and parmesan, then serve with rice."] },
  r9: { name: "Mexican chicken fajita tortilla", category: "Chicken and meat", instructions: ["Slice and season the chicken.", "Cook it with the peppers and onion, then fill tortillas with cheese and sour cream."] },
  r10: { name: "Teriyaki chicken rice bowl", category: "Chicken and meat", instructions: ["Cook the rice and steam the broccoli.", "Cook the chicken, pour over the soy sauce and honey, then reduce until thickened."] },
  r11: { name: "Creamy green bean chicken", category: "Chicken and meat", instructions: ["Brown the chicken with garlic.", "Add the green beans and cream, cook until tender, and serve with rice."] },
  r12: { name: "Cheesy minced beef quesadilla", category: "Chicken and meat", instructions: ["Brown the meat with the pepper.", "Fill tortillas with sweetcorn and cheese, then toast until crisp in a pan."] },
  r13: { name: "Quick chicken paprikash with rice", category: "Chicken and meat", instructions: ["Soften the onion, remove from the heat, and stir in the paprika.", "Add the chicken and a little water, cook until tender, then finish with sour cream."] },
  r14: { name: "Garlic cream salmon", category: "Fish", instructions: ["Cook the salmon skin-side down.", "Make a garlic cream spinach sauce in the pan and serve with rice."] },
  r15: { name: "Honey soy salmon", category: "Fish", instructions: ["Mix the honey and soy sauce.", "Brush it over the salmon, cook through, and serve with rice and broccoli."] },
  r16: { name: "Roasted salmon with sweet potato", category: "Fish", instructions: ["Cube the sweet potato and roast at 200°C for 20 minutes.", "Add the salmon, squeeze over lemon, and roast for another 12–15 minutes."] },
  r17: { name: "Fish fingers with mashed potatoes", category: "Fish", instructions: ["Boil the potatoes until tender, then mash with milk and butter.", "Cook the fish fingers, steam the peas, and serve together."] },
  r18: { name: "Fish finger tortilla", category: "Fish", instructions: ["Cook the fish fingers until crisp.", "Mix a garlic yogurt sauce and fill the tortillas with lettuce and tomatoes."] },
  r19: { name: "Feta shakshuka", category: "Vegetarian", instructions: ["Sauté the pepper, add the tomatoes, and cook until thick.", "Crack in the eggs, crumble over the feta, cover, and cook until set."] },
  r20: { name: "Creamy green bean stew with fried eggs", category: "Vegetarian", instructions: ["Boil the green beans until tender in salted water.", "Thicken with sour cream and serve with fried eggs."] },
  r21: { name: "Lentil stew with eggs", category: "Vegetarian", instructions: ["Warm the lentils with the bay leaf.", "Stir in the mustard sour cream and serve with boiled eggs."] },
  r22: { name: "Spinach ricotta gnocchi", category: "Vegetarian", instructions: ["Cook the gnocchi.", "Sauté the garlic and spinach, stir in the ricotta and gnocchi, and finish with parmesan."] },
  r23: { name: "Cheesy broccoli potato skillet", category: "Vegetarian", instructions: ["Parboil the potatoes and broccoli.", "Pan-fry them, pour over the eggs, and melt the cheese on top."] },
  r24: { name: "Sweetcorn spinach risotto", category: "Vegetarian", instructions: ["Toast the rice, then add the stock one ladle at a time.", "Stir in the sweetcorn, spinach, butter, and parmesan at the end."] },
  r25: { name: "Chili con carne", category: "Batch cooking", instructions: ["Brown the onion and minced meat.", "Add the passata, beans, sweetcorn, and spices, then simmer for 25 minutes.", "Serve with rice."] },
  r26: { name: "Layered cauliflower bake", category: "Batch cooking", instructions: ["Parboil the cauliflower and rice.", "Brown the meat, layer the ingredients with sour cream, and bake until golden with cheese."] },
  r27: { name: "Cheesy broccoli chicken bake", category: "Batch cooking", instructions: ["Cook the rice and steam the broccoli.", "Mix with the chicken and sour cream, top with cheese, and bake for 25 minutes."] },
  r28: { name: "Turkey meatballs in tomato sauce", category: "Batch cooking", instructions: ["Mix the turkey with the egg and spices, then shape into meatballs.", "Brown them, finish cooking in the tomato sauce, and serve with rice."] },
  r29: { name: "Tray-baked chicken with sweet potato", category: "Batch cooking", instructions: ["Cube the sweet potato and peppers.", "Place in a tray with the chicken and garlic, then bake at 200°C for 35–40 minutes."] },
  r30: { name: "Creamy spinach chicken and potato bake", category: "Batch cooking", instructions: ["Slice the potatoes and pre-brown the chicken.", "Layer with spinach and cream, top with cheese, and bake until tender."] }
};

function localizeIngredient(item: Ingredient): Ingredient {
  return { ...item, name: ingredientNames[item.name] ?? item.name, category: ingredientCategories[item.category] ?? item.category };
}

export function localizeRecipe(recipe: Recipe, locale: AppLocale): Recipe {
  if (locale === "hu" || !recipeCopies[recipe.id]) return recipe;
  const copy = recipeCopies[recipe.id];
  return {
    ...recipe,
    name: copy.name,
    category: copy.category,
    description: `${copy.name} — a simple, make-ahead-friendly everyday meal.`,
    storage: recipe.storage.replace("nap hűtőben", "days in the fridge"),
    instructions: copy.instructions,
    ingredients: recipe.ingredients.map(localizeIngredient)
  };
}

export function localizeIngredientName(value: string, locale: AppLocale): string {
  return locale === "en" ? ingredientNames[value] ?? value : value;
}

export function localizeIngredientCategory(value: string, locale: AppLocale): string {
  return locale === "en" ? ingredientCategories[value] ?? value : value;
}

export function builtInRecipeIds(): string[] {
  return Object.keys(recipeCopies);
}
