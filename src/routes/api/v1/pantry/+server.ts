import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import type {PantryItem} from '$lib/domain/types';
import {apiError, limit, readJson, sameOrigin} from '$lib/server/infra/http';
import {addItem, clearItems, loadState} from '$lib/server/services/kitchen';
import {cleanItem} from '$lib/server/services/validate';

// The visitor's own pantry: D1 for accounts, the guest cookie otherwise. Same-site only (it uses cookies).
export const GET: RequestHandler = async (event) => {
  const {pantry, exclusions} = await loadState(event);
  return json({pantry, exclusions, account: !!event.locals.user}, {headers: {'cache-control': 'private, no-store'}});
};

export const POST: RequestHandler = async (event) => {
  const blocked = sameOrigin(event) ?? (await limit(event));
  if (blocked) return blocked;
  const item = cleanItem(await readJson<Partial<PantryItem>>(event.request));
  if (!item) return apiError(400, 'bad_item', 'Send {"name": "...", "amount": number|null, "unit": "g"|"ml"|..., "approximate": boolean}.');
  const r = await addItem(event, item);
  if (r.error) return apiError(400, 'pantry_full', r.error);
  return json({pantry: (await loadState(event)).pantry}, {status: 201});
};

export const DELETE: RequestHandler = async (event) => {
  const blocked = sameOrigin(event) ?? (await limit(event));
  if (blocked) return blocked;
  await clearItems(event);
  return new Response(null, {status: 204});
};
