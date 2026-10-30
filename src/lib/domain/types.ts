export interface User { id: string; username: string; email: string }
export interface PantryItem {
  id: string; name: string; amount: number | null; unit: string | null; approximate: boolean;
  key?: string;          // canonical ingredient the name resolves to (added on the server), e.g. "manok" -> "chicken"
  parent?: string;       // ingredient family, e.g. "chicken thigh" -> "chicken"
  known?: boolean;       // false when the name is not in the ingredient lexicon
}
export interface Ingredient {
  name: string;          // canonical ingredient name from the v5.1 dataset, e.g. "pork belly"
  key: string;           // same as name; used for matching
  parent: string;        // ingredient family, e.g. "pork"
  raw: string;           // original line from the recipe
  amount: number | null; // null = "to taste" or no quantity given
  amountMax: number | null; // upper end of a range ("8 to 10 pieces"), same as amount otherwise
  unit: string;
  optional: boolean;     // optional, garnish or serving item
  staple: boolean;       // water, salt, black pepper, neutral oils: assumed available
  toTaste: boolean;
  prep: string;          // preparation, e.g. "minced"
}
export interface Recipe {
  id: string; sourceId: number; name: string; category: string; prep: number; cook: number; servings: number; split?: string;
  ingredients: Ingredient[]; steps: string[];
  meals?: string[];      // estimated meal types: Breakfast, Lunch, Dinner, Merienda, Dessert (domain/meals.ts)
  dish?: string | null;  // dish family for example photos, e.g. "adobo" (domain/dishes.ts)
}
export type Status = 'enough' | 'short' | 'unknown' | 'similar' | 'missing';
export interface Row extends Ingredient { have?: PantryItem; status: Status }
/** How many servings the person's amounts allow, when an ingredient they have runs short. */
export interface Scale { servings: number; of: number; limiting: string }
export interface Evaluation {
  recipe: Recipe; rows: Row[]; ready: boolean; pct: number; lbl: string;
  need: Row[]; okN: Row[]; similar: Row[]; tot: number; matched: number; why: string;
  scale: Scale | null;
}
/** Small version of an evaluation that is cheap to send to the browser. */
export interface MatchSummary {
  id: string; name: string; category: string; total: number; servings: number; pct: number; lbl: string;
  missing: string[]; have: number; tot: number; why: string; ready: boolean; blurb: string;
  missingCount: number;  // all missing or short required ingredients (`missing` lists at most 6)
  canSub: string[];      // missing items you can replace with something in your pantry, e.g. "vinegar → calamansi"
  score: number;         // model score (0-1.1); used for ranking, not a probability
  distinct: string[];    // your ingredients that are most distinctive for this recipe (highest TF-IDF weight)
  meals: string[];       // estimated meal types
  dish: string | null;   // dish family (example photo)
}
/** A missing ingredient that would make the most recipes ready to cook if bought. */
export interface Unlock { name: string; count: number; recipes: string[] }
/** An ingredient that is often cooked together with what is in the pantry (learned from the recipes). */
export interface Related { name: string; with: string[]; score: number }
export interface QueryInput {
  pantry: Pick<PantryItem, 'name' | 'amount' | 'unit'>[]; exclusions: string[];
  q?: string; category?: string; meal?: string; maxTime?: number;
  sort?: 'best' | 'fewest' | 'time'; filter?: 'all' | 'ready' | 'missing'; page?: number; perPage?: number;
}
export interface QueryResult {
  items: MatchSummary[]; found: number; matchedTotal: number; top: MatchSummary | null; pages: number; page: number;
  cats: string[]; unlock: Unlock[];
}
export interface Note { ingredient_name: string; note: string }
export interface Sub { use: string; note: string; source: 'recipes' | 'curated'; count: number }
/** Public data for one recipe page. `flags` lists, per exclusion category, the ingredients that match it. */
export interface RecipeDetail { recipe: Recipe; subs: Record<string, Sub[]>; flags: Record<string, string[]> }
