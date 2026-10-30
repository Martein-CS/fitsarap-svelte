import {error, fail} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import {clean} from '$lib/server/infra/crypto';
import {deleteNote, getNotes, setNote, toggleSaved, validId} from '$lib/server/services/kitchen';
import {recommender} from '$lib/server/services/recommendation';

export const load: PageServerLoad = async (event) => {
  const id = event.params.id;
  const detail = validId(id) ? await recommender(event.platform).recipe(id) : null;
  if (!detail) error(404, 'Recipe not found');
  return {...detail, notes: await getNotes(event, id)};
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
  },
  unnote: async (event) => {
    if (!event.locals.user) return fail(401, {message: 'Log in to change your notes.'});
    await deleteNote(event, event.params.id, clean((await event.request.formData()).get('del')));
    return {ok: true};
  }
};
