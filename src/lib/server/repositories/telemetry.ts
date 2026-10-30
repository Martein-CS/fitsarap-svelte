import type {Db} from './db';

export const telemetry = {
  /** Counts ingredient names the lexicon did not recognise, so the team knows which names to add next. */
  recordMisses: (db: Db, names: string[]) => db.batch(names.map((n) =>
    db.prepare("INSERT INTO ingredient_misses(name,count,last_seen) VALUES(?,1,datetime('now')) ON CONFLICT(name) DO UPDATE SET count=count+1, last_seen=excluded.last_seen").bind(n))),

  topMisses: async (db: Db, limit = 50) =>
    (await db.prepare('SELECT name,count,last_seen FROM ingredient_misses ORDER BY count DESC LIMIT ?').bind(limit).all<{name: string; count: number; last_seen: string}>()).results
};
