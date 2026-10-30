import type {Evaluation, Ingredient, PantryItem, Recipe, Row, Status} from './types';
import {normUnit, ratio, sufficiency} from './units';

const COUNT = new Set(['pcs', 'cloves', 'thumbs', 'stalks', 'slices', 'heads', 'bunch', 'cans', 'packs']);

export function compareAmount(have: PantryItem, need: Ingredient): Status {
  if (need.amount == null) return 'enough';
  if (have.amount == null) return 'unknown';
  const r = sufficiency(have.amount, have.unit, need.amount, need.unit);
  if (r !== null) return r >= 0.999 ? 'enough' : 'short';
  // "5 garlic" and "5 cloves garlic" are the same thing: compare counts when one side is plain pieces.
  const hu = normUnit(have.unit), nu = normUnit(need.unit);
  if (COUNT.has(hu) && COUNT.has(nu) && (hu === 'pcs' || nu === 'pcs')) return have.amount >= need.amount ? 'enough' : 'short';
  return 'unknown';
}

/** Finds the pantry item for a recipe ingredient: same ingredient first, otherwise the same family ("similar"). */
export type Lookup = (ing: Ingredient) => {item: PantryItem; exact: boolean} | undefined;

export function pantryLookup(pantry: PantryItem[]): Lookup {
  const byKey = new Map<string, PantryItem>(), byParent = new Map<string, PantryItem>();
  for (const p of pantry) {
    const k = p.key ?? p.name.toLowerCase();
    if (!byKey.has(k)) byKey.set(k, p);
    if (p.parent && !byParent.has(p.parent)) byParent.set(p.parent, p);
  }
  return (ing) => {
    const e = byKey.get(ing.key);
    if (e) return {item: e, exact: true};
    const f = byParent.get(ing.parent);
    return f ? {item: f, exact: false} : undefined;
  };
}

/** Explains one recipe against a pantry. Optional ingredients and pantry staples are never required.
 *  Exact ingredient counts 1 (½ if the amount is short or unknown); same family only ("similar") counts ½,
 *  the same credit the ranking model gives. */
export function evaluate(recipe: Recipe, lookup: Lookup): Evaluation {
  const rows: Row[] = recipe.ingredients.map((ing) => {
    const hit = lookup(ing);
    if (!hit) return {...ing, status: 'missing'};
    return {...ing, have: hit.item, status: hit.exact ? compareAmount(hit.item, ing) : 'similar'};
  });
  const req = rows.filter((r) => !r.optional && !r.staple);
  const pts = req.reduce((a, x) => a + (x.status === 'enough' ? 1 : x.status === 'missing' ? 0 : 0.5), 0);
  const pct = req.length ? Math.round((pts / req.length) * 100) : 0;
  const need = req.filter((x) => x.status === 'missing' || x.status === 'short');
  const okN = req.filter((x) => x.status === 'enough' || x.status === 'unknown');
  const similar = req.filter((x) => x.status === 'similar');
  // Servings the amounts allow: the scarcest exact ingredient with comparable units decides.
  let scale: Evaluation['scale'] = null;
  for (const x of req) {
    if (x.status !== 'short' || !x.have) continue;
    const f = ratio(x.have.amount, x.have.unit, x.amount, x.unit);
    if (f === null) continue;
    const servings = Math.floor(f * recipe.servings * 2) / 2;          // to the nearest half serving below
    if (!scale || servings < scale.servings) scale = {servings, of: recipe.servings, limiting: x.name};
  }
  const parts: string[] = [];
  parts.push(okN.length ? `You have ${okN.slice(0, 4).map((x) => x.name).join(', ')}${okN.length > 4 ? ` and ${okN.length - 4} more` : ''}.` : 'You have only related ingredients for this recipe.');
  if (similar.length) parts.push(`Similar items you could use: ${similar.map((x) => `${x.have!.name} for ${x.name}`).join(', ')}.`);
  parts.push(need.length ? `Still needed: ${need.map((x) => x.name + (x.status === 'short' ? ' (more)' : '')).join(', ')}.` : 'Nothing essential is missing.');
  return {
    recipe, rows, pct, need, okN, similar, scale, why: parts.join(' '), tot: req.length,
    matched: req.filter((x) => x.status !== 'missing').length,
    ready: req.length > 0 && req.every((x) => x.status === 'enough' || x.status === 'unknown'),
    lbl: pct >= 90 ? 'Excellent match' : pct >= 75 ? 'Good match' : 'Possible match'
  };
}
