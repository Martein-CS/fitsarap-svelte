// Per-account data: pantry, saved recipes, custom ingredient notes, exclusions. Every query is scoped by user_id and
// served by a primary key or index (see migrations/), so cost stays flat as the number of users grows.
import type {Db} from './db';
import type {Note, PantryItem} from '../../domain/types';

type PantryRow = Omit<PantryItem, 'approximate'> & {approximate: number};

export const kitchen = {
  async load(db: Db, userId: string) {
    const [p, s, x] = await db.batch<unknown>([
      db.prepare('SELECT id,name,amount,unit,approximate FROM pantry WHERE user_id=? ORDER BY name').bind(userId),
      db.prepare('SELECT recipe_id FROM saved_recipes WHERE user_id=? ORDER BY created_at DESC LIMIT 500').bind(userId),
      db.prepare('SELECT exclusions FROM preferences WHERE user_id=?').bind(userId)
    ]);
    const pref = (x.results as {exclusions: string}[])[0];
    let exclusions: string[] = [];
    try { exclusions = pref ? JSON.parse(pref.exclusions) : []; } catch { /* keep [] */ }
    return {
      pantry: (p.results as PantryRow[]).map((r) => ({...r, approximate: !!r.approximate})) as PantryItem[],
      saved: (s.results as {recipe_id: string}[]).map((r) => r.recipe_id),
      exclusions
    };
  },

  /** Adds or replaces one pantry item. `sameAs` lists stored names that mean the same ingredient ("manok" = "chicken"). */
  upsertItem: (db: Db, userId: string, item: Omit<PantryItem, 'id'>, sameAs: string[]) => db.batch([
    db.prepare(`DELETE FROM pantry WHERE user_id=? AND lower(name) IN (${sameAs.map(() => '?').join(',') || "''"})`).bind(userId, ...sameAs.map((n) => n.toLowerCase())),
    db.prepare('INSERT INTO pantry(id,user_id,name,amount,unit,approximate) VALUES(?,?,?,?,?,?)')
      .bind(crypto.randomUUID(), userId, item.name, item.amount, item.unit, item.approximate ? 1 : 0)
  ]),

  removeItem: (db: Db, userId: string, id: string) => db.prepare('DELETE FROM pantry WHERE id=? AND user_id=?').bind(id, userId).run(),
  clear: (db: Db, userId: string) => db.prepare('DELETE FROM pantry WHERE user_id=?').bind(userId).run(),
  countItems: async (db: Db, userId: string) =>
    (await db.prepare('SELECT count(*) AS n FROM pantry WHERE user_id=?').bind(userId).first<{n: number}>())?.n ?? 0,

  saveExclusions: (db: Db, userId: string, list: string[]) =>
    db.prepare('INSERT INTO preferences(user_id,exclusions) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET exclusions=excluded.exclusions')
      .bind(userId, JSON.stringify(list)).run(),

  /** Saves or un-saves a recipe in one round trip. */
  async toggleSaved(db: Db, userId: string, recipeId: string) {
    const del = await db.prepare('DELETE FROM saved_recipes WHERE user_id=? AND recipe_id=?').bind(userId, recipeId).run();
    if (!del.meta.changes) await db.prepare('INSERT OR IGNORE INTO saved_recipes(user_id,recipe_id) VALUES(?,?)').bind(userId, recipeId).run();
  },

  notes: async (db: Db, userId: string, recipeId: string) =>
    (await db.prepare('SELECT ingredient_name,note FROM recipe_notes WHERE user_id=? AND recipe_id=? ORDER BY ingredient_name').bind(userId, recipeId).all<Note>()).results,

  setNote: (db: Db, userId: string, recipeId: string, name: string, note: string) =>
    db.prepare('INSERT INTO recipe_notes(user_id,recipe_id,ingredient_name,note) VALUES(?,?,?,?) ON CONFLICT(user_id,recipe_id,ingredient_name) DO UPDATE SET note=excluded.note')
      .bind(userId, recipeId, name, note).run(),

  deleteNote: (db: Db, userId: string, recipeId: string, name: string) =>
    db.prepare('DELETE FROM recipe_notes WHERE user_id=? AND recipe_id=? AND ingredient_name=?').bind(userId, recipeId, name).run()
};
