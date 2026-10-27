import type {D1Database, Fetcher} from '@cloudflare/workers-types';
import type {User} from '$lib/types';

declare global {
  namespace App {
    interface Locals { user: User | null }
    interface Platform { env: { DB: D1Database; ASSETS: Fetcher } }
  }
}

export {};
