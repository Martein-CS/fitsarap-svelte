import type {Evaluation, Ingredient, PantryItem, Recipe, Row, Status} from './types';
import {normUnit} from './match';

const conv: Record<string, [string, number]> = {
  kg: ['mass', 1000], g: ['mass', 1], lbs: ['mass', 453.6], oz: ['mass', 28.35],
  L: ['liquid', 1000], ml: ['liquid', 1], tbsp: ['liquid', 15], tsp: ['liquid', 5], cups: ['liquid', 240]
};
const COUNT = new Set(['pcs', 'cloves', 'thumbs', 'stalks', 'slices', 'heads', 'bunch', 'cans', 'packs']);

export function compareAmount(have: PantryItem, need: Ingredient): Status {
  if (need.amount == null) return 'enough';
  if (have.amount == null) return 'unknown';
  const hu = normUnit(have.unit), nu = normUnit(need.unit);
  if (hu === nu) return have.amount >= need.amount ? 'enough' : 'short';
  const a = conv[hu], b = conv[nu];
  if (a && b && a[0] === b[0]) return have.amount * a[1] >= need.amount * b[1] ? 'enough' : 'short';
  // "5 garlic" and "5 cloves garlic" are the same thing: compare counts when one side is plain pieces.
  if (COUNT.has(hu) && COUNT.has(nu) && (hu === 'pcs' || nu === 'pcs')) return have.amount >= need.amount ? 'enough' : 'short';
  return 'unknown';
}

export type Lookup = (ing: Ingredient) => PantryItem | undefined;

/** Scores a recipe. Optional ingredients and pantry staples (water, salt, oil...) are never required. */
export function evaluate(recipe: Recipe, lookup: Lookup): Evaluation {
  const rows: Row[] = recipe.ingredients.map((ing) => {
    const have = lookup(ing);
    return {...ing, have, status: have ? compareAmount(have, ing) : 'missing'};
  });
  const req = rows.filter((r) => !r.optional && !r.staple);
  const pts = req.reduce((a, x) => a + (x.status === 'enough' ? 1 : x.status === 'short' || x.status === 'unknown' ? 0.5 : 0), 0);
  const pct = req.length ? Math.round((pts / req.length) * 100) : 0;
  const need = req.filter((x) => x.status === 'missing' || x.status === 'short');
  const okN = req.filter((x) => x.status === 'enough');
  const why = need.length
    ? `You already have ${okN.slice(0, 3).map((x) => x.name).join(', ') || 'a few items'}. Still needed: ${need.map((x) => x.name).join(', ')}.`
    : 'You have all main ingredients for this recipe.';
  return {
    recipe, rows, pct, need, okN, why, tot: req.length,
    matched: req.filter((x) => x.status !== 'missing').length,
    ready: req.length > 0 && req.every((x) => x.status === 'enough'),
    lbl: pct >= 90 ? 'Excellent match' : pct >= 75 ? 'Good match' : 'Possible match'
  };
}
