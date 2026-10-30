import type {PageServerLoad} from './$types';
import type {QueryInput} from '$lib/domain/types';
import {recommender} from '$lib/server/services/recommendation';
import {MEALS} from '$lib/domain/meals';

const TIMES = [15, 30, 45, 60, 90];

export const load: PageServerLoad = async ({url, parent, platform}) => {
  const {pantry, exclusions} = await parent();
  const s = url.searchParams;
  const input: QueryInput = {
    pantry, exclusions, q: s.get('q') ?? '', category: s.get('category') ?? 'All', meal: s.get('meal') ?? 'All',
    maxTime: TIMES.includes(Number(s.get('time'))) ? Number(s.get('time')) : 0,
    sort: (s.get('sort') ?? 'best') as QueryInput['sort'], filter: (s.get('filter') ?? 'all') as QueryInput['filter'],
    page: Number(s.get('page')) || 1, perPage: 24
  };
  const res = await recommender(platform).query(input);
  // The engine validates every parameter; echo back what it actually used.
  const params = {
    q: (input.q ?? '').trim().slice(0, 60), category: res.cats.includes(input.category!) ? input.category! : 'All',
    meal: (MEALS as readonly string[]).includes(input.meal!) ? input.meal! : 'All', time: input.maxTime || '',
    sort: ['best', 'fewest', 'time'].includes(input.sort!) ? input.sort! : 'best',
    filter: ['all', 'ready', 'missing'].includes(input.filter!) ? input.filter! : 'all', page: res.page
  };
  return {...res, params, meals: MEALS, times: TIMES};
};
