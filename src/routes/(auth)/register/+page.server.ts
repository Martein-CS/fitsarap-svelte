import {fail, redirect} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import {registerUser} from '$lib/server/auth';

export const load: PageServerLoad = async ({locals}) => {
  if (locals.user) redirect(303, '/dashboard');
};

export const actions: Actions = {
  default: async ({request, platform, cookies}) => {
    const f = await request.formData();
    const password = String(f.get('password') ?? '');
    if (password !== String(f.get('confirm') ?? '')) return fail(400, {message: 'Passwords do not match.'});
    const db = platform?.env.DB;
    if (!db) return fail(503, {message: 'Database binding is missing. See the README to set up D1.'});
    const r = await registerUser(db, cookies, String(f.get('username') ?? ''), String(f.get('email') ?? ''), password);
    if ('error' in r) return fail(r.status, {message: r.error});
    redirect(303, '/dashboard');
  }
};
