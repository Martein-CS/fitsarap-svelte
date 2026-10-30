// Example photos for dish families. The dataset has no images, so for well-known dishes (adobo, sinigang, pancit…)
// FitSarap shows the lead photo of the matching English Wikipedia article. Those photos come from Wikimedia Commons
// and are freely licensed; every photo links to its Commons page, which names the author and license.
// The photo shows the dish in general, not the exact recipe, and the site says so.
// Photos the team adds themselves (src/lib/assets/) always take priority and need no network.
import {dishByKey} from '../../domain/dishes';
import {LRU} from '../infra/cache';

export interface DishPhoto { thumb: string; filePage: string; article: string }

const UA = 'FitSarap/4.1 (CS 406 student recipe recommender, TIP-QC)';
const memo = new LRU<DishPhoto | 'none'>(200);

/** Commons file page for an upload.wikimedia.org image URL (original or thumbnail). */
export function filePageFor(src: string): string | null {
  const m = src.match(/upload\.wikimedia\.org\/wikipedia\/(?:commons|en)\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/]+)/);
  return m ? `https://commons.wikimedia.org/wiki/File:${m[1]}` : null;
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

/** Looks up the example photo for a dish family (cached per instance). null when there is none or the lookup fails. */
export async function dishPhoto(key: string, fetchFn: Fetch = fetch): Promise<DishPhoto | null> {
  const dish = dishByKey.get(key);
  if (!dish) return null;
  const hit = memo.get(key);
  if (hit) return hit === 'none' ? null : hit;
  try {
    const res = await fetchFn(`https://en.wikipedia.org/api/rest_v1/page/summary/${dish.wiki}`, {headers: {'user-agent': UA, accept: 'application/json'}});
    if (!res.ok) { if (res.status === 404) memo.set(key, 'none'); return null; }
    const j = (await res.json()) as {thumbnail?: {source?: string}; originalimage?: {source?: string}; content_urls?: {desktop?: {page?: string}}};
    const thumb = j.thumbnail?.source, file = filePageFor(j.originalimage?.source ?? thumb ?? '');
    if (!thumb || !file || !thumb.startsWith('https://upload.wikimedia.org/')) { memo.set(key, 'none'); return null; }
    const photo = {thumb, filePage: file, article: j.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${dish.wiki}`};
    memo.set(key, photo);
    return photo;
  } catch {
    return null;                    // network trouble: not remembered, so a later request tries again
  }
}
