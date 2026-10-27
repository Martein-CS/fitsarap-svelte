import type {Evaluation, PantryItem, Recipe} from './types';
import {canon, same} from './match';
import {evaluate, recipes} from './recipes';

export interface Sub { f: string; use: string; q: string; note: string }
export const SUBS: Record<string, Sub> = {
  tinola: {f: 'Sayote', use: 'Green Papaya', q: '1 cup', note: 'Green papaya appears in similar Filipino recipes and may be used as an alternative for this recipe.'},
  afritada: {f: 'Bell Pepper', use: 'Pimiento', q: '1/2 cup', note: 'Pimiento has a similar mild, slightly sweet pepper flavor, making it a suitable alternative.'}
};

export const fmt = (i: {amount: number | null; unit: string | null; approximate?: boolean}) =>
  i.amount == null ? 'Quantity unknown' : `${i.approximate ? '≈ ' : ''}${i.amount} ${i.unit ?? ''}`;
export const time = (r: Recipe) => r.prep + r.cook;

/** Recipes that do not contain an excluded ingredient name. */
export const visible = (excluded: string[]) =>
  recipes.filter((r) => !excluded.some((x) => r.ingredients.some((i) => canon(i.name).includes(canon(x)))));

export function ev(r: Recipe, pantry: PantryItem[], subbed = false): Evaluation {
  const p = pantry.slice();
  const s = SUBS[r.id];
  if (subbed && s && !p.find((x) => same(x.name, s.f))) {
    const ing = r.ingredients.find((i) => i.name === s.f);
    if (ing) p.push({id: 'sub', name: s.f, amount: ing.amount, unit: ing.unit, approximate: false});
  }
  const base = evaluate(r, p);
  const req = base.rows.filter((x) => !x.optional);
  const pts = req.reduce((a, x) => a + (x.status === 'enough' ? 1 : x.status === 'short' || x.status === 'unknown' ? 0.5 : 0), 0);
  const pct = Math.round((pts / Math.max(req.length, 1)) * 100);
  const need = req.filter((x) => x.status === 'missing' || x.status === 'short');
  const okN = req.filter((x) => x.status === 'enough');
  const why = need.length
    ? `You already have ${okN.slice(0, 3).map((x) => x.name.toLowerCase()).join(', ') || 'a few items'}. Still needed: ${need.map((x) => x.name.toLowerCase()).join(', ')}.`
    : 'You have all main ingredients for this recipe.';
  return {
    ...base, pct, need, okN, tot: req.length, why,
    lbl: pct >= 90 ? 'Excellent match' : pct >= 75 ? 'Good match' : 'Possible match',
    canSub: !!s && !subbed && base.rows.some((x) => x.name === s.f && x.status === 'missing')
  };
}
