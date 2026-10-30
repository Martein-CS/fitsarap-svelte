import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getDb} from '$lib/server/repositories/db';
import {recommender} from '$lib/server/services/recommendation';
import info from '$lib/data/model-info.json';

// For uptime checks and dashboards. ?deep=1 also pings D1 and loads the recommender.
export const GET: RequestHandler = async (event) => {
  const deep = event.url.searchParams.get('deep') === '1';
  const rec = recommender(event.platform);
  const out: Record<string, unknown> = {ok: true, version: event.platform?.env.APP_VERSION ?? 'dev', model: info.model, recommender: rec.mode};
  if (deep) {
    const db = getDb(event);
    try { out.db = db ? !!(await db.prepare('SELECT 1 AS x').first()) : 'not bound'; } catch { out.db = false; out.ok = false; }
    try { out.catalog = (await rec.query({pantry: [{name: 'garlic', amount: null, unit: null}], exclusions: [], perPage: 1})).matchedTotal > 0; } catch { out.catalog = false; out.ok = false; }
  }
  return json(out, {status: out.ok ? 200 : 503, headers: {'cache-control': 'no-store'}});
};
