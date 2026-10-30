// The person's kitchen: pantry, saved recipes, notes and exclusions.
// Accounts keep it in D1. Guests keep it in a size-capped cookie, so even guests need no server memory.
import type {Cookies, RequestEvent} from '@sveltejs/kit';
import type {Note, PantryItem} from '../../domain/types';
import {getDb} from '../repositories/db';
import {kitchen as repo} from '../repositories/kitchen';
import {resolve} from '../recommender/lexicon';
import {clean, rand} from '../infra/crypto';
import {emit} from '../infra/jobs';

type Ctx = Pick<RequestEvent, 'locals' | 'platform' | 'cookies'>;
const GUEST = 'fs_guest';
export const MAX_PANTRY = 40;
const MAX_GUEST_ITEMS = 25;                  // keeps the guest cookie well under the 4 KB browser limit
export const validId = (id: string) => /^[a-z0-9-]{1,80}$/.test(id);

interface Guest { pantry: PantryItem[]; exclusions: string[] }
const SAMPLE: PantryItem[] = [
  {id: 's1', name: 'Chicken', amount: 500, unit: 'g', approximate: true},
  {id: 's2', name: 'Garlic', amount: 5, unit: 'cloves', approximate: false},
  {id: 's3', name: 'Soy Sauce', amount: 60, unit: 'ml', approximate: true},
  {id: 's4', name: 'Rice', amount: 2, unit: 'cups', approximate: true}
];

function readGuest(cookies: Cookies): Guest {
  try {
    const g = JSON.parse(cookies.get(GUEST) ?? '');
    if (Array.isArray(g.pantry)) {
      const pantry = g.pantry.filter((p: PantryItem) => p && typeof p.name === 'string').slice(0, MAX_GUEST_ITEMS);
      return {pantry, exclusions: Array.isArray(g.exclusions) ? g.exclusions.map(String).slice(0, 25) : []};
    }
  } catch { /* fall through to sample data */ }
  return {pantry: structuredClone(SAMPLE), exclusions: []};
}
const writeGuest = (cookies: Cookies, g: Guest) =>
  cookies.set(GUEST, JSON.stringify(g), {path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30});

const account = (ctx: Ctx) => {
  const user = ctx.locals.user, db = user ? getDb(ctx) : null;
  return user && db ? {user, db} : null;
};

/** Pantry (with each name resolved to its standard ingredient), saved recipe ids and exclusions. */
export async function loadState(ctx: Ctx) {
  const a = account(ctx);
  const s = a ? await repo.load(a.db, a.user.id) : {...readGuest(ctx.cookies), saved: [] as string[]};
  return {...s, pantry: s.pantry.map((p) => ({...p, ...resolve(p.name)}))};
}

/** Adds an item, replacing any item that means the same ingredient ("manok" replaces "chicken"). */
export async function addItem(ctx: Ctx, item: Omit<PantryItem, 'id'>): Promise<{error?: string}> {
  const r = resolve(item.name);
  if (!r.known) emit(ctx, {type: 'ingredient_miss', names: [item.name]});
  const a = account(ctx);
  if (a) {
    const current = (await repo.load(a.db, a.user.id)).pantry;
    const same = current.filter((x) => resolve(x.name).key === r.key).map((x) => x.name);
    if (!same.length && current.length >= MAX_PANTRY) return {error: `Your pantry can hold up to ${MAX_PANTRY} ingredients.`};
    await repo.upsertItem(a.db, a.user.id, item, [item.name, ...same]);
    return {};
  }
  const g = readGuest(ctx.cookies);
  g.pantry = g.pantry.filter((x) => resolve(x.name).key !== r.key);
  if (g.pantry.length >= MAX_GUEST_ITEMS) return {error: `Guests can keep up to ${MAX_GUEST_ITEMS} ingredients. Create an account for more.`};
  g.pantry.push({...item, name: clean(item.name, 40), id: rand(4)});
  writeGuest(ctx.cookies, g);
  return {};
}

export async function removeItem(ctx: Ctx, id: string) {
  const a = account(ctx);
  if (a) return void (await repo.removeItem(a.db, a.user.id, id));
  const g = readGuest(ctx.cookies);
  g.pantry = g.pantry.filter((x) => x.id !== id);
  writeGuest(ctx.cookies, g);
}

export async function clearItems(ctx: Ctx) {
  const a = account(ctx);
  if (a) return void (await repo.clear(a.db, a.user.id));
  writeGuest(ctx.cookies, {...readGuest(ctx.cookies), pantry: []});
}

export async function saveExclusions(ctx: Ctx, list: string[]) {
  const clean25 = [...new Set(list.map((x) => clean(x, 60)).filter(Boolean))].slice(0, 25);
  const a = account(ctx);
  if (a) return void (await repo.saveExclusions(a.db, a.user.id, clean25));
  writeGuest(ctx.cookies, {...readGuest(ctx.cookies), exclusions: clean25});
}

export async function toggleSaved(ctx: Ctx, recipeId: string) {
  const a = account(ctx);
  if (a && validId(recipeId)) await repo.toggleSaved(a.db, a.user.id, recipeId);
}

export async function getNotes(ctx: Ctx, recipeId: string): Promise<Note[]> {
  const a = account(ctx);
  return a && validId(recipeId) ? repo.notes(a.db, a.user.id, recipeId) : [];
}

export async function setNote(ctx: Ctx, recipeId: string, name: string, note: string) {
  const a = account(ctx);
  if (a && validId(recipeId)) await repo.setNote(a.db, a.user.id, recipeId, name, note);
}

export async function deleteNote(ctx: Ctx, recipeId: string, name: string) {
  const a = account(ctx);
  if (a && validId(recipeId)) await repo.deleteNote(a.db, a.user.id, recipeId, name);
}
