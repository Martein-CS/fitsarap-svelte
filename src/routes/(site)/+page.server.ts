import type {PageServerLoad} from './$types';
import {rank} from '$lib/server/catalog';

export const load: PageServerLoad = async ({parent}) => {
  const {pantry, exclusions} = await parent();
  return {best: rank(pantry, exclusions)[0] ?? null};
};
