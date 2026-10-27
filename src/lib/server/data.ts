import type {Cookies, RequestEvent} from '@sveltejs/kit';
import type {Note, PantryItem} from '$lib/types';
import {canon} from '$lib/match';
import {clean, rand} from './auth';

type Ctx = Pick<RequestEvent, 'locals' | 'platform' | 'cookies'>;
const GUEST = 'fs_guest';
const MAX_GUEST_ITEMS = 25;
export const validId = (id: string) => /^[a-z0-9-]{1,60}$/.test(id);

interface Guest { pantry: PantryItem[]; exclusions: string[] }
const SAMPLE: PantryItem[] = [
  {id: 's1', name: 'Chicken', amount: 500, unit: 'g', approximate: true},
  {id: 's2', name: 'Garlic', amount: 5, unit: 'cloves', approximate: false},
  {id: 's3', name: 'Soy Sauce', amount: 60, unit: 'ml', approximate: true},
  {id: 's4', name: 'Rice', amount: 2, unit: 'cups', approximate: true}
];

// Guests have no account, so their pantry lives in a cookie instead of D1.
function readGuest(cookies: Cookies): Guest {
  try {
    const g = JSON.parse(cookies.get(GUEST) ?? '');
    if (Array.isArray(g.pantry)) return {pantry: g.pantry, exclusions: Array.isArray(g.exclusions) ? g.exclusions : []};
  } catch { /* fall through to sample data */ }
  return {pantry: structuredClone(SAMPLE), exclusions: []};
}
const writeGuest = (cookies: Cookies, g: Guest) => cookies.set(GUEST, JSON.stringify(g), {path: '/', httpOnly: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 30});

export async function loadState(ctx: Ctx) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (user && db) {
    const [p, s, x] = await Promise.all([
      db.prepare('SELECT id,name,amount,unit,approximate FROM pantry WHERE user_id=? ORDER BY name').bind(user.id).all<Omit<PantryItem, 'approximate'> & {approximate: number}>(),
      db.prepare('SELECT recipe_id FROM saved_recipes WHERE user_id=?').bind(user.id).all<{recipe_id: string}>(),
      db.prepare('SELECT exclusions FROM preferences WHERE user_id=?').bind(user.id).first<{exclusions: string}>()
    ]);
    return {
      pantry: p.results.map((r) => ({...r, approximate: !!r.approximate})) as PantryItem[],
      saved: s.results.map((r) => r.recipe_id),
      exclusions: x ? (JSON.parse(x.exclusions) as string[]) : []
    };
  }
  const g = readGuest(ctx.cookies);
  return {pantry: g.pantry, saved: [] as string[], exclusions: g.exclusions};
}

export async function addItem(ctx: Ctx, item: Omit<PantryItem, 'id'>) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (user && db) {
    await db.batch([
      db.prepare('DELETE FROM pantry WHERE user_id=? AND lower(name)=lower(?)').bind(user.id, item.name),
      db.prepare('INSERT INTO pantry(id,user_id,name,amount,unit,approximate) VALUES(?,?,?,?,?,?)').bind(crypto.randomUUID(), user.id, item.name, item.amount, item.unit, item.approximate ? 1 : 0)
    ]);
    return;
  }
  const g = readGuest(ctx.cookies);
  g.pantry = g.pantry.filter((x) => canon(x.name) !== canon(item.name)).slice(0, MAX_GUEST_ITEMS - 1);
  g.pantry.push({...item, name: clean(item.name, 40), id: rand(4)});
  writeGuest(ctx.cookies, g);
}

export async function removeItem(ctx: Ctx, id: string) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (user && db) { await db.prepare('DELETE FROM pantry WHERE id=? AND user_id=?').bind(id, user.id).run(); return; }
  const g = readGuest(ctx.cookies);
  g.pantry = g.pantry.filter((x) => x.id !== id);
  writeGuest(ctx.cookies, g);
}

export async function clearItems(ctx: Ctx) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (user && db) { await db.prepare('DELETE FROM pantry WHERE user_id=?').bind(user.id).run(); return; }
  const g = readGuest(ctx.cookies);
  g.pantry = [];
  writeGuest(ctx.cookies, g);
}

export async function saveExclusions(ctx: Ctx, list: string[]) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  const clean25 = list.slice(0, 25).map((x) => clean(x, 60));
  if (user && db) {
    await db.prepare('INSERT INTO preferences(user_id,exclusions) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET exclusions=excluded.exclusions').bind(user.id, JSON.stringify(clean25)).run();
    return;
  }
  const g = readGuest(ctx.cookies);
  g.exclusions = clean25;
  writeGuest(ctx.cookies, g);
}

export async function toggleSaved(ctx: Ctx, recipeId: string) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (!user || !db || !validId(recipeId)) return;
  const had = await db.prepare('SELECT 1 AS x FROM saved_recipes WHERE user_id=? AND recipe_id=?').bind(user.id, recipeId).first();
  await db.prepare(had ? 'DELETE FROM saved_recipes WHERE user_id=? AND recipe_id=?' : 'INSERT INTO saved_recipes(user_id,recipe_id) VALUES(?,?)').bind(user.id, recipeId).run();
}

export async function getNotes(ctx: Ctx, recipeId: string): Promise<Note[]> {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (!user || !db || !validId(recipeId)) return [];
  return (await db.prepare('SELECT ingredient_name,note FROM recipe_notes WHERE user_id=? AND recipe_id=?').bind(user.id, recipeId).all<Note>()).results;
}

export async function setNote(ctx: Ctx, recipeId: string, name: string, note: string) {
  const user = ctx.locals.user, db = ctx.platform?.env.DB;
  if (!user || !db || !validId(recipeId)) return;
  await db.prepare('INSERT INTO recipe_notes(user_id,recipe_id,ingredient_name,note) VALUES(?,?,?,?) ON CONFLICT(user_id,recipe_id,ingredient_name) DO UPDATE SET note=excluded.note').bind(user.id, recipeId, name, note).run();
}
