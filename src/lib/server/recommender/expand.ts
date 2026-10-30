import type {Ingredient, Recipe} from '../../domain/types';

interface RawIngredient { name: string; raw: string; parent?: string; amount?: number; amountMax?: number; unit?: string; optional?: 1; staple?: 1; toTaste?: 1; prep?: string }
type RawRecipe = Omit<Recipe, 'ingredients'> & {ingredients: RawIngredient[]};

/** recipes.json is stored compactly (default fields omitted); this restores the full Recipe shape. */
export function expandRecipes(raw: unknown): Recipe[] {
  return (raw as RawRecipe[]).map((r) => ({
    ...r,
    ingredients: r.ingredients.map((x): Ingredient => ({
      name: x.name, key: x.name, parent: x.parent ?? x.name, raw: x.raw,
      amount: x.amount ?? null, amountMax: x.amountMax ?? x.amount ?? null, unit: x.unit ?? '',
      optional: !!x.optional, staple: !!x.staple, toTaste: !!x.toTaste, prep: x.prep ?? ''
    }))
  }));
}
