export interface User { id: string; username: string; email: string }
export interface PantryItem { id: string; name: string; amount: number | null; unit: string | null; approximate: boolean }
export interface Ingredient { name: string; amount: number; unit: string; optional: boolean }
export interface Recipe {
  id: string; name: string; category: string; prep: number; cook: number; servings: number;
  description: string; ingredients: Ingredient[]; steps: string[]; image: string;
}
export type Status = 'enough' | 'short' | 'unknown' | 'missing';
export interface Row extends Ingredient { have?: PantryItem; status: Status }
export interface Evaluation {
  recipe: Recipe; rows: Row[]; ready: boolean; pct: number; lbl: string;
  need: Row[]; okN: Row[]; tot: number; canSub: boolean; why: string;
}
export interface Note { ingredient_name: string; note: string }
