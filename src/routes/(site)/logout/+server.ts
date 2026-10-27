import {redirect} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {destroySession} from '$lib/server/auth';

export const POST: RequestHandler = async ({platform, cookies}) => {
  const db = platform?.env.DB;
  if (db) await destroySession(db, cookies);
  redirect(303, '/');
};
