import {redirect} from '@sveltejs/kit';
import type {PageServerLoad} from './$types';
import type {Recipe} from '$lib/types';
import {getRecipe} from '$lib/server/catalog';
import {ev, summarize} from '$lib/score';

export const load: PageServerLoad = async ({locals, parent}) => {
  if (!locals.user) redirect(303, '/login');
  const {pantry, saved} = await parent();
  const recipes = saved.map(getRecipe).filter((r): r is Recipe => !!r);
  return {savedMatches: recipes.map((r) => summarize(ev(r, pantry)))};
};
