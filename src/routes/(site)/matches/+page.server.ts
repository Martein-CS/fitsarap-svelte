import type {PageServerLoad} from './$types';
import {rank} from '$lib/server/catalog';

const PER_PAGE = 24;

export const load: PageServerLoad = async ({url, parent}) => {
  const {pantry, exclusions} = await parent();
  const q = (url.searchParams.get('q') ?? '').trim().toLowerCase().slice(0, 60);
  const category = url.searchParams.get('category') ?? 'All';
  const sort = ['best', 'fewest', 'time'].includes(url.searchParams.get('sort') ?? '') ? url.searchParams.get('sort')! : 'best';
  const filter = ['all', 'ready', 'missing'].includes(url.searchParams.get('filter') ?? '') ? url.searchParams.get('filter')! : 'all';

  // rank() only returns recipes that match at least one of the person's ingredients.
  const all = rank(pantry, exclusions);
  let list = all;
  if (filter === 'ready') list = list.filter((m) => m.ready);
  else if (filter === 'missing') list = list.filter((m) => m.missing.length <= 2);
  if (category !== 'All') list = list.filter((m) => m.category === category);
  if (q) list = list.filter((m) => m.name.toLowerCase().includes(q) || m.blurb.toLowerCase().includes(q));
  if (sort === 'fewest') list = [...list].sort((a, b) => a.missing.length - b.missing.length || b.pct - a.pct);
  else if (sort === 'time') list = [...list].sort((a, b) => (a.total || 9999) - (b.total || 9999) || b.pct - a.pct);

  const pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const page = Math.min(pages, Math.max(1, Number(url.searchParams.get('page')) || 1));
  return {
    items: list.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    found: list.length, matchedTotal: all.length, top: list[0] ?? null, pages,
    cats: [...new Set(all.map((m) => m.category))].sort(),
    params: {q, category, sort, filter, page}
  };
};
