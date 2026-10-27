import {fail, redirect} from '@sveltejs/kit';
import type {Actions, PageServerLoad} from './$types';
import {loginUser} from '$lib/server/auth';

export const load: PageServerLoad = async ({locals}) => {
  if (locals.user) redirect(303, '/dashboard');
};

export const actions: Actions = {
  default: async ({request, platform, cookies}) => {
    const f = await request.formData();
    const db = platform?.env.DB;
    if (!db) return fail(503, {message: 'Database binding is missing. See the README to set up D1.'});
    const r = await loginUser(db, cookies, String(f.get('identifier') ?? ''), String(f.get('password') ?? ''));
    if ('error' in r) return fail(r.status, {message: r.error});
    redirect(303, '/dashboard');
  }
};
