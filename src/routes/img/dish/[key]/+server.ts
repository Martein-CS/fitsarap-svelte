import type {RequestHandler} from './$types';
import {edgeCache} from '$lib/server/infra/cache';
import {dishPhoto} from '$lib/server/services/photos';

// <img src="/img/dish/adobo"> → redirect to the example photo on Wikimedia Commons (or 404, and the page shows an
// illustration instead). /img/dish/adobo?credit → the photo's Commons page (author and license).
// Redirects are cached for a week in the browser and in Cloudflare's data-center cache, so Wikipedia is asked
// at most about once a week per dish and location. Set DISH_PHOTOS = "off" in wrangler.jsonc to turn this off.
export const GET: RequestHandler = async (event) => {
  const off = event.platform?.env.DISH_PHOTOS === 'off';
  const credit = event.url.searchParams.has('credit');
  return edgeCache(event.url, 604800, async () => {
    const photo = off ? null : await dishPhoto(event.params.key);
    if (!photo) return new Response('No photo', {status: 404, headers: {'cache-control': 'public, max-age=3600'}});
    return new Response(null, {status: 302, headers: {location: credit ? photo.filePage : photo.thumb}});
  }, event.platform?.caches?.default, (p) => event.platform?.context?.waitUntil(p), [302]);
};
