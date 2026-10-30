// Caching layer.
//
// 1. LRU: a small in-memory cache inside one Worker isolate. Isolates are reused across many requests, so repeated
//    work (the same pantry ranked again on the next page, the same exclusion set) is served from memory. It is only a
//    cache: losing it (a new isolate, another region) costs time, never correctness, so the app stays stateless.
// 2. edgeCache: Cloudflare's Cache API, shared by every isolate in a data center, for public GET responses
//    (recipe details, ingredient lookups). Personal data is never put there.
// Framework-free so the standalone recommender Worker can use it too.

export class LRU<V> {
  private map = new Map<string, V>();
  hits = 0;
  misses = 0;
  constructor(private max = 200) {}

  get(key: string): V | undefined {
    const v = this.map.get(key);
    if (v === undefined) { this.misses++; return undefined; }
    this.hits++;
    this.map.delete(key);           // move to the newest position
    this.map.set(key, v);
    return v;
  }

  set(key: string, v: V): void {
    this.map.delete(key);
    this.map.set(key, v);
    if (this.map.size > this.max) this.map.delete(this.map.keys().next().value!);
  }

  get size() { return this.map.size; }

  /** Returns the cached value or computes, stores and returns it. */
  remember(key: string, make: () => V): V {
    const hit = this.get(key);
    if (hit !== undefined) return hit;
    const v = make();
    this.set(key, v);
    return v;
  }
}

interface EdgeCache { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> }
type WaitUntil = (p: Promise<unknown>) => void;

/** Serves a public GET response from the data-center cache, or builds it and stores it there for `ttl` seconds. */
// `cacheIn` is Cloudflare's caches.default (typed loosely: the Workers and DOM Request types differ only nominally).
export async function edgeCache(url: URL, ttl: number, build: () => Promise<Response>, cacheIn?: unknown, waitUntil?: WaitUntil,
  statuses: number[] = [200]): Promise<Response> {
  const cache = cacheIn as EdgeCache | undefined;
  const key = new Request(url.toString(), {method: 'GET'});
  if (cache) {
    const hit = await cache.match(key).catch(() => undefined);
    if (hit) { const r = new Response(hit.body, hit); r.headers.set('x-cache', 'HIT'); return r; }
  }
  const res = await build();
  if (!statuses.includes(res.status)) return res;
  res.headers.set('cache-control', `public, max-age=${ttl}`);
  res.headers.set('x-cache', 'MISS');
  if (cache) {
    const put = cache.put(key, res.clone()).catch(() => undefined);
    if (waitUntil) waitUntil(put); else await put;
  }
  return res;
}
