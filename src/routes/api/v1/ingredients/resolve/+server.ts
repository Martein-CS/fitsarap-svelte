import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {apiError, CORS, limit} from '$lib/server/infra/http';
import {edgeCache} from '$lib/server/infra/cache';
import {resolve} from '$lib/server/recommender/lexicon';

export const GET: RequestHandler = async (event) => {
  const name = (event.url.searchParams.get('name') ?? '').trim().slice(0, 90);
  if (!name) return apiError(400, 'bad_request', 'Add ?name=, for example ?name=manok.', CORS);
  const limited = await limit(event, true);
  if (limited) return limited;
  return edgeCache(event.url, 86400, async () => json({name, ...resolve(name)}, {headers: CORS}),
    event.platform?.caches?.default, (p) => event.platform?.context?.waitUntil(p));
};
