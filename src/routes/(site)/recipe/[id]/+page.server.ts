import {error, fail} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import {recipes} from '$lib/recipes';
import {clean} from '$lib/server/auth';
import {getNotes, setNote, toggleSaved} from '$lib/server/data';

export const load: PageServerLoad = async (event) => {
  const id = event.params.id;
  if (!recipes.some((r) => r.id === id)) error(404, 'Recipe not found');
  return {recipeId: id, notes: await getNotes(event, id)};
};

export const actions: Actions = {
  save: async (event) => {
    if (!event.locals.user) return fail(401, {message: 'Log in to save recipes to your dashboard.'});
    await toggleSaved(event, event.params.id);
    return {ok: true};
  },
  note: async (event) => {
    if (!event.locals.user) return fail(401, {message: 'Log in to save your own ingredient notes.'});
    const f = await event.request.formData();
    const name = clean(f.get('name')), note = String(f.get('note') ?? '').trim().slice(0, 500);
    if (!name) return fail(400, {message: 'Enter an ingredient name.'});
    await setNote(event, event.params.id, name, note);
    return {ok: true};
  }
};
