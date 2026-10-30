// Application layer → recommendation service.
//
// The website talks to recommendations only through this interface. Two implementations:
//   • local  – the engine runs inside this Worker (default; simplest, no network hop). It is imported lazily, so
//              requests that never rank (login, static pages) do not pay for loading the 4 MB catalog.
//   • remote – the engine runs as its own Worker (workers/recommender) reached through the RECOMMENDER service binding.
//              Use it when recommendation traffic should scale, deploy and be monitored separately from the website.
// Both return exactly the same data, so pages do not know which one is used.
import type {MatchSummary, PantryItem, QueryInput, QueryResult, RecipeDetail, Related} from '../../domain/types';
import type {Fetcher} from '@cloudflare/workers-types';

export type PantryLike = Pick<PantryItem, 'name' | 'amount' | 'unit'>;
export type {RecipeDetail};

export interface Recommender {
  readonly mode: 'local' | 'remote';
  query(input: QueryInput): Promise<QueryResult>;
  summaries(ids: string[], pantry: PantryLike[]): Promise<MatchSummary[]>;
  recipe(id: string): Promise<RecipeDetail | null>;
  related(pantry: PantryLike[], n?: number): Promise<Related[]>;
}

const engine = () => import('../recommender/engine');

const local: Recommender = {
  mode: 'local',
  query: async (input) => (await engine()).query(input),
  summaries: async (ids, pantry) => (await engine()).summaries(ids, pantry),
  recipe: async (id) => (await engine()).recipeDetail(id),
  related: async (pantry, n) => (await engine()).related(pantry, n)
};

const slim = (pantry: PantryLike[]) => pantry.map(({name, amount, unit}) => ({name, amount, unit}));

function remote(binding: Fetcher): Recommender {
  async function call<T>(path: string, body?: unknown): Promise<T> {
    const init = body === undefined ? {method: 'GET'} : {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)};
    const res = await binding.fetch('https://recommender' + path, init as never);
    if (res.status === 404) return null as T;
    if (!res.ok) throw new Error(`recommender ${path} → ${res.status}`);
    return (await res.json()) as T;
  }
  return {
    mode: 'remote',
    query: (input) => call('/v1/query', {...input, pantry: slim(input.pantry)}),
    summaries: (ids, pantry) => call('/v1/summaries', {ids, pantry: slim(pantry)}),
    recipe: (id) => call('/v1/recipes/' + encodeURIComponent(id)),
    related: (pantry, n) => call('/v1/related', {pantry: slim(pantry), n})
  };
}

/** The recommender for this request: remote when the service binding exists, otherwise in-process. */
export const recommender = (platform: App.Platform | undefined): Recommender =>
  platform?.env.RECOMMENDER ? remote(platform.env.RECOMMENDER) : local;
