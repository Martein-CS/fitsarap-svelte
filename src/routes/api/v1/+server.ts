import {json} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {CORS} from '$lib/server/infra/http';
import info from '$lib/data/model-info.json';

// Index of the public API, so recipe websites, developers and a future mobile app can find the endpoints.
export const GET: RequestHandler = () => json({
  name: 'FitSarap API', version: 'v1', model: info.model, dataset: info.dataset,
  endpoints: {
    'GET  /api/v1/health': 'Service status, catalog size, recommender mode.',
    'POST /api/v1/recommendations': 'Body {pantry:[{name,amount?,unit?}], exclusions?:string[], q?, category?, sort?: best|fewest|time, filter?: all|ready|missing, page?, perPage? (max 100)}. Ranked recipes with missing items and substitutions.',
    'GET  /api/v1/recipes/{id}': 'One recipe: ingredients (raw and standardized), quantities, steps, substitutions, allergen flags.',
    'GET  /api/v1/ingredients/resolve?name=manok': 'Standard ingredient name and family for any typed name (Filipino names, plurals, typos).',
    'POST /api/v1/related': 'Body {pantry:[{name}], n?}. Ingredients often cooked with the given ones.',
    'GET|POST|DELETE /api/v1/pantry, DELETE /api/v1/pantry/{id}': 'The visitor’s own pantry (session cookie, same site only).'
  },
  notes: ['Match percentages are ingredient coverage, not model confidence.', 'Allergen flags are ingredient-name matching, not a safety guarantee.']
}, {headers: {...CORS, 'cache-control': 'public, max-age=3600'}});
