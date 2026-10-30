import type {RequestHandler} from './$types';
import {limit, sameOrigin} from '$lib/server/infra/http';
import {removeItem} from '$lib/server/services/kitchen';

export const DELETE: RequestHandler = async (event) => {
  const blocked = sameOrigin(event) ?? (await limit(event));
  if (blocked) return blocked;
  await removeItem(event, event.params.id.slice(0, 80));
  return new Response(null, {status: 204});
};
