import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {apiError, CORS, limit, preflight, readJson} from '$lib/server/infra/http';
import {recommender} from '$lib/server/services/recommendation';
import {cleanPantry} from '$lib/server/services/validate';

export const POST: RequestHandler = async (event) => {
  const limited = await limit(event, true);
  if (limited) return limited;
  const body = await readJson<{pantry?: unknown; n?: number}>(event.request);
  const pantry = cleanPantry(body?.pantry);
  if (!pantry) return apiError(400, 'bad_pantry', 'pantry must be a list of 1–40 items like {"name": "kangkong"}.', CORS);
  const n = Math.min(20, Math.max(1, Number(body?.n) || 8));
  return json({items: await recommender(event.platform).related(pantry, n)}, {headers: CORS});
};
export const OPTIONS: RequestHandler = preflight;
