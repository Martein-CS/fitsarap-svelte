// Database layer entry point.
//
// D1 can keep read replicas close to users. A D1 *session* sends reads to a nearby replica while guaranteeing the
// person still sees their own writes: after each request we store the session "bookmark" in a cookie and start the
// next request from it. Writes always go to the primary. Without replication enabled this behaves like plain D1.
import type {RequestEvent} from '@sveltejs/kit';
import type {D1Database, D1PreparedStatement, D1Result} from '@cloudflare/workers-types';

/** The part of D1 the repositories use; both D1Database and a D1 session satisfy it. */
export interface Db {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
interface Session extends Db { getBookmark(): string | null }
type WithSession = D1Database & {withSession?: (constraint?: string) => Session};

export const BOOKMARK_COOKIE = 'fs_d1';

/** The D1 handle for this request (created once per request), or null when no database is bound. */
export function getDb(event: Pick<RequestEvent, 'locals' | 'platform' | 'cookies'>): Db | null {
  if (event.locals.db !== undefined) return event.locals.db;
  const raw = event.platform?.env.DB as WithSession | undefined;
  let db: Db | null = null;
  if (raw) {
    const bookmark = event.cookies.get(BOOKMARK_COOKIE);
    try {
      db = typeof raw.withSession === 'function' ? raw.withSession(bookmark && /^[\w-]{1,200}$/.test(bookmark) ? bookmark : 'first-unconstrained') : raw;
    } catch {
      db = raw;
    }
  }
  event.locals.db = db;
  return db;
}

/** The bookmark to send back with the response, if the request used a D1 session. */
export function bookmarkOf(db: Db | null): string | null {
  const s = db as Partial<Session> | null;
  try { return typeof s?.getBookmark === 'function' ? s.getBookmark() : null; } catch { return null; }
}
