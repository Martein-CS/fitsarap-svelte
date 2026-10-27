export interface User { id: string; username: string; email: string }
export interface PantryItem { id: string; name: string; amount: number | null; unit: string | null; approximate: boolean }
export interface Ingredient {
  name: string;          // cleaned display name, e.g. "pork hocks"
  key: string;           // base ingredient used for matching, e.g. "pork"
  raw: string;           // original line from the dataset
  amount: number | null; // null = "to taste" or no quantity given
  unit: string;
  optional: boolean;
  staple: boolean;       // water, salt, pepper, oil, sugar: never counted against a recipe
}
export interface Recipe {
  id: string; name: string; category: string; prep: number; cook: number; servings: number;
  ingredients: Ingredient[]; steps: string[];
}
export type Status = 'enough' | 'short' | 'unknown' | 'missing';
export interface Row extends Ingredient { have?: PantryItem; status: Status }
export interface Evaluation {
  recipe: Recipe; rows: Row[]; ready: boolean; pct: number; lbl: string;
  need: Row[]; okN: Row[]; tot: number; matched: number; why: string;
}
/** Small version of an evaluation that is cheap to send to the browser. */
export interface MatchSummary {
  id: string; name: string; category: string; total: number; servings: number; pct: number; lbl: string;
  missing: string[]; have: number; tot: number; why: string; ready: boolean; blurb: string;
}
export interface Note { ingredient_name: string; note: string }
