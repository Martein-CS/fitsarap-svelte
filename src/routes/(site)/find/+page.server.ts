import {fail} from '@sveltejs/kit';
import type {Actions} from './$types';
import {units} from '$lib/constants';
import {clean} from '$lib/server/auth';
import {addItem, clearItems, removeItem, saveExclusions} from '$lib/server/data';

export const actions: Actions = {
  add: async (event) => {
    const f = await event.request.formData();
    const name = clean(f.get('name'));
    const unknown = f.get('unknown') === 'on';
    const amount = unknown ? null : Number(f.get('amount'));
    const unit = unknown ? null : String(f.get('unit') ?? '');
    if (!name) return fail(400, {message: 'Enter an ingredient name.'});
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1e8)) return fail(400, {message: 'Enter an amount or choose unknown quantity.'});
    if (unit !== null && !units.includes(unit)) return fail(400, {message: 'Choose a valid unit.'});
    await addItem(event, {name, amount, unit, approximate: f.get('approximate') === 'on'});
    return {ok: true};
  },
  remove: async (event) => {
    await removeItem(event, String((await event.request.formData()).get('id') ?? ''));
    return {ok: true};
  },
  clear: async (event) => {
    await clearItems(event);
    return {ok: true};
  },
  exclusions: async (event) => {
    await saveExclusions(event, (await event.request.formData()).getAll('ex').map(String));
    return {ok: true};
  }
};
