import type {Evaluation, MatchSummary, PantryItem, Recipe} from './types';
import {canon, same} from './match';
import {evaluate} from './evaluate';

export interface Sub { use: string; note: string }
// Substitutions are keyed by the (canonical) ingredient that is missing.
export const SUBS: Record<string, Sub> = {
  sayote: {use: 'Green Papaya', note: 'Green papaya appears in similar Filipino soups and can stand in for sayote.'},
  'green papaya': {use: 'Sayote', note: 'Sayote is a mild, similar-textured vegetable that can replace green papaya.'},
  'bell pepper': {use: 'Pimiento', note: 'Pimiento has a similar mild, slightly sweet flavor.'},
  calamansi: {use: 'Lemon', note: 'Lemon or lime juice can replace calamansi, though it is slightly less sweet.'},
  lemon: {use: 'Calamansi', note: 'Calamansi is more floral and a little sweeter; use a bit more.'},
  kangkong: {use: 'Spinach', note: 'Spinach cooks the same way and is a common swap in sinigang and tinola.'},
  spinach: {use: 'Kangkong', note: 'Kangkong leaves are a close, traditional substitute for spinach.'},
  'bok choy': {use: 'Cabbage', note: 'Cabbage is sturdier, so cook it a little longer.'},
  'coconut cream': {use: 'Coconut Milk', note: 'Coconut milk is thinner; simmer a few minutes longer to thicken.'},
  'green onion': {use: 'Onion', note: 'Onion is stronger; use less and cook it a little longer.'}
};

export const fmt = (i: {amount: number | null; unit: string | null; approximate?: boolean}) =>
  i.amount == null ? 'Quantity unknown' : `${i.approximate ? '≈ ' : ''}${i.amount} ${i.unit ?? ''}`;
export const time = (r: Recipe) => r.prep + r.cook;

export function blurb(r: Recipe): string {
  const names = [...new Set(r.ingredients.filter((i) => !i.optional && !i.staple).map((i) => i.name))].slice(0, 4);
  if (!names.length) return 'A Filipino recipe.';
  return 'Made with ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) + '.';
}

/** Evaluates one recipe against a pantry. `applied` lists ingredient keys the person chose to substitute. */
export function ev(r: Recipe, pantry: PantryItem[], applied: string[] = []): Evaluation {
  const set = new Set(applied);
  return evaluate(r, (ing) => set.has(ing.key)
    ? {id: 'sub', name: ing.key, amount: ing.amount, unit: ing.unit, approximate: false}
    : pantry.find((p) => same(p.name, ing.key)));
}

export interface Suggestion { key: string; name: string; use: string; note: string; done: boolean }
export function suggestions(e: Evaluation, applied: string[]): Suggestion[] {
  const out: Suggestion[] = [];
  for (const row of e.rows) {
    const sub = SUBS[canon(row.key)];
    const done = applied.includes(row.key);
    if (sub && !row.optional && !row.staple && (row.status === 'missing' || done)) out.push({key: row.key, name: row.name, use: sub.use, note: sub.note, done});
  }
  return out.slice(0, 3);
}

export const summarize = (e: Evaluation): MatchSummary => ({
  id: e.recipe.id, name: e.recipe.name, category: e.recipe.category, total: time(e.recipe), servings: e.recipe.servings,
  pct: e.pct, lbl: e.lbl, missing: e.need.map((x) => x.name).slice(0, 6), have: e.okN.length, tot: e.tot, why: e.why, ready: e.ready, blurb: blurb(e.recipe)
});
