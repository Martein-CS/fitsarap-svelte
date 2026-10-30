// The recommendation engine: catalog + model + explanations, behind a small API (query, summaries, recipe, related).
//
// Only plain relative imports and no SvelteKit APIs, so the same file runs inside the SvelteKit app (in-process) and in
// the standalone recommender Worker (workers/recommender), which the app can call through a service binding when the
// recommendation load needs to scale separately from the website.
import raw from './data/recipes.json';
import subsRaw from './data/subs.json';
import relationsRaw from './data/relations.json';
import type {MatchSummary, PantryItem, QueryInput, QueryResult, Recipe, RecipeDetail, Related, Sub, Unlock} from '../../domain/types';
import {evaluate, pantryLookup} from '../../domain/evaluate';
import {pantrySubs, summarize} from '../../domain/score';
import {expandRecipes} from './expand';
import {HybridModel} from './model';
import {resolve, STAPLES} from './lexicon';
import {excluder, flagsFor} from './exclusions';
import {LRU} from '../infra/cache';
import {mealsFor, MEALS} from '../../domain/meals';
import {dishFor} from '../../domain/dishes';

// The recipe catalog (FitSarap dataset v5.1, 1,911 recipes) is loaded once per isolate and shared by all requests.
const catalog: Recipe[] = expandRecipes(raw).map((r) => ({...r, meals: mealsFor(r.name, r.category), dish: dishFor(r.name)}));
const byId = new Map(catalog.map((r, i) => [r.id, i]));
export const catalogSize = catalog.length;
export const getRecipe = (id: string): Recipe | undefined => { const i = byId.get(id); return i === undefined ? undefined : catalog[i]; };

// The benchmarked model. In production the IDF weights are learned from the whole catalog.
const model = new HybridModel(catalog);
const SUBS = subsRaw as Record<string, Sub[]>;
const RELATIONS = relationsRaw as unknown as Record<string, [string, number, number][]>;

type PantryLike = Pick<PantryItem, 'name' | 'amount' | 'unit'> & Partial<PantryItem>;

/** Adds the canonical ingredient and family to each pantry item ("manok" -> chicken). */
export const withKeys = (pantry: PantryLike[]): PantryItem[] =>
  pantry.map((p, i) => ({id: p.id ?? String(i), approximate: !!p.approximate, ...p, ...resolve(p.name)}));

const modelInput = (items: PantryItem[]) =>
  items.filter((p) => !STAPLES.has(p.key!)).map((p) => ({key: p.key!, parent: p.parent!, amount: p.amount, unit: p.unit}));

/** Substitution options for the ingredients of one recipe. */
export function subsFor(r: Recipe): Record<string, Sub[]> {
  const out: Record<string, Sub[]> = {};
  for (const i of r.ingredients) if (SUBS[i.key]) out[i.key] = SUBS[i.key];
  return out;
}

/** Everything public about one recipe. The same for every visitor, so it can be cached at the edge. */
export function recipeDetail(id: string): RecipeDetail | null {
  const recipe = getRecipe(id);
  return recipe ? {recipe, subs: subsFor(recipe), flags: flagsFor(recipe.ingredients)} : null;
}

// ---- Exclusions: ingredient lines are searched once per exclusion set, then remembered. ----
const lines = catalog.map((r) => r.ingredients.map((g) => (g.raw + ' ' + g.name).toLowerCase()));
const excludedCache = new LRU<Uint8Array>(64);
function excludedFor(exclusions: string[]): Uint8Array | null {
  const id = [...new Set(exclusions)].sort().join('|');
  if (!id) return null;
  return excludedCache.remember(id, () => {
    const test = excluder(exclusions), out = new Uint8Array(catalog.length);
    if (test) lines.forEach((ls, i) => { if (ls.some(test)) out[i] = 1; });
    return out;
  });
}

// ---- Ranking ----
interface Ranked { list: MatchSummary[]; unlock: Unlock[] }
const rankCache = new LRU<Ranked>(24);   // one entry ≈ 0.5–1 MB; isolates have 128 MB

const signature = (items: PantryItem[], exclusions: string[]) =>
  items.map((p) => `${p.key}|${p.amount ?? ''}|${p.unit ?? ''}`).sort().join(';') + '#' + [...new Set(exclusions)].sort().join('|');

function rankFull(pantry: PantryLike[], exclusions: string[]): Ranked {
  const items = withKeys(pantry);
  const input = modelInput(items);
  if (!input.length) return {list: [], unlock: []};
  return rankCache.remember(signature(items, exclusions), () => {
    const {candidates, parts} = model.scoreAll(input);
    const excluded = excludedFor(exclusions);
    const look = pantryLookup(items);
    const keys = new Set(items.map((p) => p.key!));
    const list: MatchSummary[] = [];
    // "One ingredient away": recipes missing exactly one ingredient that nothing in the pantry can replace.
    const away = new Map<string, {name: string; recipes: [number, string][]}>();
    for (const i of candidates) {
      if (excluded?.[i]) continue;
      const e = evaluate(catalog[i], look), p = parts(i), canSub = pantrySubs(e, SUBS, keys);
      list.push(summarize(e, p.score, p.distinct, canSub));
      if (e.need.length === 1 && e.need[0].status === 'missing' && !canSub.length) {
        const x = e.need[0], a = away.get(x.key) ?? {name: x.name, recipes: []};
        a.recipes.push([p.score, catalog[i].name]);
        away.set(x.key, a);
      }
    }
    list.sort((a, b) => b.score - a.score || a.missingCount - b.missingCount || a.name.localeCompare(b.name));
    const unlock = [...away.values()].filter((a) => a.recipes.length >= 2)
      .sort((a, b) => b.recipes.length - a.recipes.length || a.name.localeCompare(b.name)).slice(0, 3)
      .map((a) => ({name: a.name, count: a.recipes.length, recipes: a.recipes.sort((x, y) => y[0] - x[0]).slice(0, 3).map((r) => r[1])}));
    return {list, unlock};
  });
}

/** Recipes sharing at least one required ingredient (exact or same family) with the pantry, ranked by the model. */
export const rank = (pantry: PantryLike[], exclusions: string[]): MatchSummary[] => rankFull(pantry, exclusions).list;

const SORTS = ['best', 'fewest', 'time'] as const, FILTERS = ['all', 'ready', 'missing'] as const;

/** Ranked, filtered, sorted and paginated matches: everything the Matches page and the public API need. */
export function query(input: QueryInput): QueryResult {
  const {list: all, unlock} = rankFull(input.pantry ?? [], input.exclusions ?? []);
  const q = (input.q ?? '').trim().toLowerCase().slice(0, 60);
  const category = input.category || 'All';
  const sort = SORTS.includes(input.sort as never) ? input.sort! : 'best';
  const filter = FILTERS.includes(input.filter as never) ? input.filter! : 'all';
  const perPage = Math.min(100, Math.max(1, Math.floor(input.perPage ?? 24)));

  let list = all;
  if (filter === 'ready') list = list.filter((m) => m.ready);
  else if (filter === 'missing') list = list.filter((m) => m.missingCount - m.canSub.length <= 2);
  if (category !== 'All') list = list.filter((m) => m.category === category);
  const meal = MEALS.includes(input.meal as never) ? input.meal! : 'All';
  if (meal !== 'All') list = list.filter((m) => m.meals.includes(meal));
  const maxTime = Math.max(0, Math.floor(Number(input.maxTime) || 0));
  if (maxTime) list = list.filter((m) => m.total > 0 && m.total <= maxTime);
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || m.blurb.toLowerCase().includes(q));
  // "Fewest missing" counts a missing item as covered when something in the pantry can replace it.
  if (sort === 'fewest') list = [...list].sort((a, b) => (a.missingCount - a.canSub.length) - (b.missingCount - b.canSub.length) || b.pct - a.pct || b.score - a.score);
  else if (sort === 'time') list = [...list].sort((a, b) => (a.total || 9999) - (b.total || 9999) || b.pct - a.pct);

  const pages = Math.max(1, Math.ceil(list.length / perPage));
  const page = Math.min(pages, Math.max(1, Math.floor(input.page ?? 1)));
  return {
    items: list.slice((page - 1) * perPage, page * perPage), found: list.length, matchedTotal: all.length,
    top: list[0] ?? null, pages, page, cats: [...new Set(all.map((m) => m.category))].sort(), unlock
  };
}

/** Match summaries for specific recipes (e.g. the saved ones on the dashboard), in the given order. */
export function summaries(ids: string[], pantry: PantryLike[]): MatchSummary[] {
  const items = withKeys(pantry), input = modelInput(items);
  const parts = input.length ? model.scoreAll(input).parts : null;
  const look = pantryLookup(items), keys = new Set(items.map((p) => p.key!));
  return ids.flatMap((id) => {
    const i = byId.get(id);
    if (i === undefined) return [];
    const e = evaluate(catalog[i], look), p = parts ? parts(i) : {score: 0, distinct: []};
    return [summarize(e, p.score, p.distinct, pantrySubs(e, SUBS, keys))];
  });
}

/** Ingredients often cooked together with the pantry (co-occurrence model, scripts/relations.py). */
export function related(pantry: PantryLike[], n = 8): Related[] {
  const keys = new Set(withKeys(pantry).map((p) => p.key!));
  const acc = new Map<string, Related>();
  for (const k of keys) for (const [partner, npmi] of RELATIONS[k] ?? []) {
    if (keys.has(partner) || STAPLES.has(partner)) continue;
    const r = acc.get(partner) ?? {name: partner, with: [], score: 0};
    r.score += npmi;
    r.with.push(k);
    acc.set(partner, r);
  }
  return [...acc.values()].map((r) => ({...r, score: Math.round(r.score * 1000) / 1000}))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)).slice(0, n);
}

export const stats = () => ({catalog: catalogSize, rankCache: {size: rankCache.size, hits: rankCache.hits, misses: rankCache.misses}});
