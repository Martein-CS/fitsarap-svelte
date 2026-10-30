import {fail, redirect} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import {getDb} from '$lib/server/repositories/db';
import {register} from '$lib/server/services/accounts';
import {allow} from '$lib/server/infra/ratelimit';

export const load: PageServerLoad = async ({locals}) => {
  if (locals.user) redirect(303, '/dashboard');
};

export const actions: Actions = {
  default: async (event) => {
    if (!(await allow(event, 'auth'))) return fail(429, {message: 'Too many attempts. Wait a minute and try again.'});
    const f = await event.request.formData();
    const password = String(f.get('password') ?? '');
    if (password !== String(f.get('confirm') ?? '')) return fail(400, {message: 'Passwords do not match.'});
    const db = getDb(event);
    if (!db) return fail(503, {message: 'Database binding is missing. See the README to set up D1.'});
    const r = await register(event, db, String(f.get('username') ?? ''), String(f.get('email') ?? ''), password);
    if ('error' in r) return fail(r.status, {message: r.error});
    redirect(303, '/dashboard');
  }
};
