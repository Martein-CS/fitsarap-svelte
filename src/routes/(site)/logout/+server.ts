import {redirect} from '@sveltejs/kit';
import type {RequestHandler} from './$types';
import {getDb} from '$lib/server/repositories/db';
import {logout} from '$lib/server/services/accounts';

export const POST: RequestHandler = async (event) => {
  const db = getDb(event);
  if (db) await logout(db, event.cookies);
  redirect(303, '/');
};
