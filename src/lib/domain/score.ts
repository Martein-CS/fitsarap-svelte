import type {Evaluation, MatchSummary, PantryItem, Recipe, Sub} from './types';
import {evaluate, pantryLookup} from './evaluate';

const SINGULAR: Record<string, string> = {cloves: 'clove', cups: 'cup', slices: 'slice', cans: 'can', packs: 'pack', thumbs: 'thumb', heads: 'head', stalks: 'stalk', lbs: 'lb'};
/** "1 clove", "2 cloves". */
export const unitFor = (n: number, unit: string | null) => (unit && n <= 1 && SINGULAR[unit] ? SINGULAR[unit] : unit ?? '');
export const fmt = (i: {amount: number | null; unit: string | null; approximate?: boolean}) =>
  i.amount == null ? 'Quantity unknown' : `${i.approximate ? '≈ ' : ''}${+i.amount.toFixed(2)} ${unitFor(i.amount, i.unit)}`;
export const need = (x: {amount: number | null; amountMax: number | null; unit: string; toTaste: boolean}) =>
  x.amount == null ? (x.toTaste ? 'to taste' : 'as needed')
    : `${+x.amount.toFixed(2)}${x.amountMax != null && x.amountMax !== x.amount ? '–' + +x.amountMax.toFixed(2) : ''} ${unitFor(x.amountMax ?? x.amount, x.unit)}`;
export const time = (r: Recipe) => r.prep + r.cook;

export function blurb(r: Recipe): string {
  const names = [...new Set(r.ingredients.filter((i) => !i.optional && !i.staple).map((i) => i.name))].slice(0, 4);
  if (!names.length) return 'A Filipino recipe.';
  return 'Made with ' + (names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]) + '.';
}

/** Evaluates one recipe against a pantry. `applied` lists ingredient keys the person chose to substitute. */
export function ev(r: Recipe, pantry: PantryItem[], applied: string[] = []): Evaluation {
  const set = new Set(applied);
  const look = pantryLookup(pantry);
  return evaluate(r, (ing) => set.has(ing.key)
    ? {item: {id: 'sub', name: ing.name, key: ing.key, amount: ing.amount, unit: ing.unit, approximate: false}, exact: true}
    : look(ing));
}

export interface Suggestion { key: string; name: string; use: string; note: string; source: Sub['source']; count: number; inPantry: boolean; done: boolean }
/** Substitutions for missing ingredients. Ones the person already has in the pantry come first. */
export function suggestions(e: Evaluation, applied: string[], subs: Record<string, Sub[]>, pantry: PantryItem[]): Suggestion[] {
  const have = new Set(pantry.map((p) => p.key ?? p.name.toLowerCase()));
  const out: Suggestion[] = [];
  for (const row of e.rows) {
    if (row.optional || row.staple) continue;
    const done = applied.includes(row.key);
    if (row.status !== 'missing' && !done) continue;
    const opts = (subs[row.key] ?? []).map((s) => ({...s, inPantry: have.has(s.use)}))
      .sort((a, b) => Number(b.inPantry) - Number(a.inPantry) || b.count - a.count);
    if (opts.length) out.push({key: row.key, name: row.name, ...opts[0], done});
  }
  return out.sort((a, b) => Number(b.inPantry) - Number(a.inPantry)).slice(0, 4);
}

/** Missing ingredients that something already in the pantry can replace (recipe-author or curated substitutes). */
export function pantrySubs(e: Evaluation, subs: Record<string, Sub[]>, pantryKeys: Set<string>): string[] {
  const out: string[] = [];
  for (const x of e.need) {
    if (x.status !== 'missing') continue;
    const s = subs[x.key]?.find((o) => pantryKeys.has(o.use));
    if (s) out.push(`${x.name} → ${s.use}`);
  }
  return out;
}

export const summarize = (e: Evaluation, score: number, distinct: string[], canSub: string[] = []): MatchSummary => ({
  id: e.recipe.id, name: e.recipe.name, category: e.recipe.category, total: time(e.recipe), servings: e.recipe.servings,
  pct: e.pct, lbl: e.lbl, missing: e.need.map((x) => x.name + (x.status === 'short' ? ' (more)' : '')).slice(0, 6),
  missingCount: e.need.length, canSub, have: e.okN.length, tot: e.tot, why: e.why,
  ready: e.ready, blurb: blurb(e.recipe), score: Math.round(score * 1000) / 1000, distinct,
  meals: e.recipe.meals ?? [], dish: e.recipe.dish ?? null
});
