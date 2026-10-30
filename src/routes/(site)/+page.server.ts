import type {PageServerLoad} from './$types';
import {recommender} from '$lib/server/services/recommendation';

export const load: PageServerLoad = async ({parent, platform}) => {
  const {pantry, exclusions} = await parent();
  const {top} = await recommender(platform).query({pantry, exclusions, perPage: 1});
  return {best: top};
};
