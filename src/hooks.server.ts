import type {Handle} from '@sveltejs/kit';
import {userFromSession} from '$lib/server/auth';

// Runs on every request: turns the session cookie into `locals.user`.
export const handle: Handle = async ({event, resolve}) => {
  const db = event.platform?.env.DB;
  event.locals.user = db ? await userFromSession(db, event.cookies.get('fitsarap_session')) : null;
  return resolve(event);
};
