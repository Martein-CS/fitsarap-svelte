// Recommendation microservice (optional). Runs the same engine as the website, as its own Worker.
// The website reaches it through a service binding (RECOMMENDER in the root wrangler.jsonc): a Worker-to-Worker call
// inside Cloudflare, with no public URL and no extra network hop. Deploy it when recommendation traffic should scale,
// deploy and be monitored separately from the pages. Without the binding the website runs the engine in-process.
//
//   npx wrangler deploy -c workers/recommender/wrangler.jsonc
import {query, summaries, recipeDetail, related, stats} from '../../src/lib/server/recommender/engine';
import {log, errorInfo} from '../../src/lib/server/infra/log';
import type {QueryInput} from '../../src/lib/domain/types';

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {status, headers: {'content-type': 'application/json'}});

async function body<T>(req: Request): Promise<T> {
  const text = await req.text();
  if (text.length > 64_000) throw new Error('body too large');
  return JSON.parse(text) as T;
}

export default {
  async fetch(req: Request): Promise<Response> {
    const t = performance.now();
    const {pathname} = new URL(req.url);
    let res: Response;
    try {
      if (req.method === 'GET' && pathname === '/health') res = json({ok: true, ...stats()});
      else if (req.method === 'POST' && pathname === '/v1/query') res = json(query(await body<QueryInput>(req)));
      else if (req.method === 'POST' && pathname === '/v1/summaries') {
        const b = await body<{ids: string[]; pantry: QueryInput['pantry']}>(req);
        res = json(summaries((b.ids ?? []).slice(0, 500), b.pantry ?? []));
      } else if (req.method === 'POST' && pathname === '/v1/related') {
        const b = await body<{pantry: QueryInput['pantry']; n?: number}>(req);
        res = json(related(b.pantry ?? [], b.n));
      } else if (req.method === 'GET' && pathname.startsWith('/v1/recipes/')) {
        const d = recipeDetail(decodeURIComponent(pathname.slice('/v1/recipes/'.length)));
        res = d ? json(d) : json({error: 'not found'}, 404);
      } else res = json({error: 'not found'}, 404);
    } catch (e) {
      log('error', 'recommender error', {path: pathname, ...errorInfo(e)});
      res = json({error: 'bad request'}, 400);
    }
    log('info', 'recommender request', {path: pathname, status: res.status, ms: +(performance.now() - t).toFixed(1)});
    return res;
  }
};
