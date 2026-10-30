// Rate limiting at the edge. With the Workers Rate Limiting binding (wrangler.jsonc "ratelimits") the limit is shared
// by every isolate in a Cloudflare location. Without it (local dev), a per-isolate fixed window is used instead.
import type {RequestEvent} from '@sveltejs/kit';
import {LRU} from './cache';

type Bucket = 'auth' | 'api';
const FALLBACK: Record<Bucket, {limit: number; ms: number}> = {auth: {limit: 10, ms: 60_000}, api: {limit: 120, ms: 60_000}};
const windows = new LRU<{start: number; n: number}>(5000);

function localAllow(bucket: Bucket, key: string): boolean {
  const {limit, ms} = FALLBACK[bucket], now = Date.now(), id = bucket + ':' + key;
  const w = windows.get(id);
  if (!w || now - w.start >= ms) { windows.set(id, {start: now, n: 1}); return true; }
  w.n++;
  return w.n <= limit;
}

export function clientKey(event: Pick<RequestEvent, 'request' | 'getClientAddress'>): string {
  try { return event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress(); } catch { return 'unknown'; }
}

/** true when the request may go ahead. */
export async function allow(event: Pick<RequestEvent, 'platform' | 'request' | 'getClientAddress'>, bucket: Bucket, key = clientKey(event)): Promise<boolean> {
  const binding = bucket === 'auth' ? event.platform?.env.AUTH_LIMITER : event.platform?.env.API_LIMITER;
  if (binding) {
    try { return (await binding.limit({key: bucket + ':' + key})).success; } catch { /* fall back below */ }
  }
  return localAllow(bucket, key);
}
