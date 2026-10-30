import {redirect} from '@sveltejs/kit';
import type {PageServerLoad} from './$types';
import {recommender} from '$lib/server/services/recommendation';

export const load: PageServerLoad = async ({locals, parent, platform}) => {
  if (!locals.user) redirect(303, '/login');
  const {pantry, saved, exclusions} = await parent();
  const rec = recommender(platform);
  // Saved ids that no longer exist in the catalog are skipped by summaries().
  const [savedMatches, top] = await Promise.all([rec.summaries(saved, pantry), rec.query({pantry, exclusions, perPage: 1, filter: 'ready'})]);
  return {savedMatches, readyCount: top.found};
};
