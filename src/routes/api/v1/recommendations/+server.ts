import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import type {QueryInput} from '$lib/domain/types';
import {apiError, CORS, limit, preflight, readJson} from '$lib/server/infra/http';
import {recommender} from '$lib/server/services/recommendation';
import {cleanPantry} from '$lib/server/services/validate';

// Stateless: the pantry comes in the request body, so any instance anywhere can answer and nothing is stored.
export const POST: RequestHandler = async (event) => {
  const limited = await limit(event, true);
  if (limited) return limited;
  const body = await readJson<Partial<QueryInput>>(event.request);
  if (!body) return apiError(400, 'bad_request', 'Send a JSON body (content-type: application/json, at most 32 KB).', CORS);
  const pantry = cleanPantry(body.pantry);
  if (!pantry) return apiError(400, 'bad_pantry', 'pantry must be a list of 1–40 items like {"name": "chicken", "amount": 500, "unit": "g"}.', CORS);
  const res = await event.locals.timer.time('rank', () => recommender(event.platform).query({
    pantry, exclusions: Array.isArray(body.exclusions) ? body.exclusions.map(String).slice(0, 25) : [],
    q: typeof body.q === 'string' ? body.q : '', category: typeof body.category === 'string' ? body.category : 'All',
    sort: body.sort, filter: body.filter, page: Number(body.page) || 1, perPage: Number(body.perPage) || 24
  }));
  return json(res, {headers: CORS});
};
export const OPTIONS: RequestHandler = preflight;
