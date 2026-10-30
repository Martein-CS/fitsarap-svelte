// Meal types (Breakfast, Lunch, Dinner, Merienda, Dessert). The dataset has no meal field, so FitSarap estimates it
// from the dish name and dish type with the rules below. A dish can have several meal types (pancit: lunch, dinner,
// merienda). The site labels these as estimates.
export const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Merienda', 'Dessert'] as const;
export type Meal = (typeof MEALS)[number];

const BREAKFAST = /\b(\w*silog|tapa|tocino|longg?anisa|daing|tuyo|danggit|tinapa|champorado|arroz caldo|lugaw|goto|congee|porridge|sinangag|garlic rice|fried rice|omelet+e?|torta|tortang|scrambled|pandesal|pan de sal|hotcakes?|pancakes?|corned beef|spam|hot ?dogs?|oatmeal|taho|breakfast)\b/;
const BREAKFAST_ONLY = /\b(champorado|lugaw|goto|arroz caldo|congee|porridge|oatmeal|taho|hotcakes?|pancakes?|pandesal|breakfast)\b/;
const DESSERT = /\b(leche flan|flan|halo-?halo|maja|ube|halaya|haleya|cake|cupcakes?|pie|turon|biko|kutsinta|puto|bibingka|suman|buko|jelly|gulaman|sago|graham|pastillas|polvoron|dessert|minatamis|palitaw|cassava|kamote|camote|banana cue|maruya|ice cream|brownies?|cookies?|custard|tart|yema|sapin|kalamay|espasol|ginataang bilo|bilo-bilo|mais con yelo|sweet)\b/;
const SNACK = /\b(lumpia|shanghai|kwek|fish ?balls?|squid ?balls?|siomai|siopao|empanada|okoy|ukoy|turon|banana cue|camote cue|maruya|pancit|palabok|sandwich|toast|fries|chicharr?on|nachos|wings|tokneneng|isaw|barbecue|bbq|merienda|snacks?|spring rolls?|dumplings?|crackers?|chips)\b/;

export function mealsFor(name: string, category: string): Meal[] {
  const n = name.toLowerCase();
  const out = new Set<Meal>();
  const dessert = category === 'Dessert & Snacks' || DESSERT.test(n);
  if (BREAKFAST.test(n)) out.add('Breakfast');
  if (dessert) { out.add('Dessert'); out.add('Merienda'); }
  if (SNACK.test(n)) out.add('Merienda');
  // Main dishes (soups, stews, adobo, grilled, seafood, vegetables, noodles, rice) are lunch and dinner food.
  if (!dessert && !BREAKFAST_ONLY.test(n)) { out.add('Lunch'); out.add('Dinner'); }
  if (BREAKFAST_ONLY.test(n) && !dessert) out.add('Merienda');
  return MEALS.filter((m) => out.has(m));
}
