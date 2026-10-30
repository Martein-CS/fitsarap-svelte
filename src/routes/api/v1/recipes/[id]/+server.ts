import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {apiError, CORS, limit} from '$lib/server/infra/http';
import {edgeCache} from '$lib/server/infra/cache';
import {recommender} from '$lib/server/services/recommendation';
import {validId} from '$lib/server/services/kitchen';

// The same for every visitor, so it is served from Cloudflare's data-center cache after the first request.
export const GET: RequestHandler = async (event) => {
  const id = event.params.id;
  if (!validId(id)) return apiError(404, 'not_found', 'No recipe with that id.', CORS);
  const limited = await limit(event, true);
  if (limited) return limited;
  return edgeCache(event.url, 86400, async () => {
    const detail = await recommender(event.platform).recipe(id);
    return detail ? json(detail, {headers: CORS}) : apiError(404, 'not_found', 'No recipe with that id.', CORS);
  }, event.platform?.caches?.default, (p) => event.platform?.context?.waitUntil(p));
};
