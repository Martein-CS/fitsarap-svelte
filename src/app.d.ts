import type {CacheStorage, D1Database, ExecutionContext, Fetcher, Queue, RateLimit} from '@cloudflare/workers-types';
import type {User} from '$lib/domain/types';
import type {Db} from '$lib/server/repositories/db';
import type {Timer} from '$lib/server/infra/log';
import type {TelemetryEvent} from '$lib/server/infra/jobs';

declare global {
  namespace App {
    interface Error { message: string; id?: string }
    interface Locals {
      user: User | null;
      reqId: string;
      timer: Timer;
      db: Db | null;            // D1 session for this request (read replicas + read-your-writes bookmark)
    }
    interface Platform {
      env: {
        DB: D1Database;
        ASSETS: Fetcher;
        // Optional bindings: the app works without them and uses them when wrangler.jsonc declares them.
        RECOMMENDER?: Fetcher;            // service binding to workers/recommender (split-out recommendation service)
        AUTH_LIMITER?: RateLimit;         // rate limit for login / register
        API_LIMITER?: RateLimit;          // rate limit for the public JSON API
        EVENTS?: Queue<TelemetryEvent>;   // queue consumed by workers/jobs
        APP_VERSION?: string;
        DISH_PHOTOS?: string;             // "off" turns off example photos from Wikimedia Commons
      };
      context: ExecutionContext;
      caches: CacheStorage & {default: import('@cloudflare/workers-types').Cache};
    }
  }
}

export {};
