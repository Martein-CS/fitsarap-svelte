import type {Handle, HandleServerError} from '@sveltejs/kit';
import {getDb, bookmarkOf, BOOKMARK_COOKIE} from '$lib/server/repositories/db';
import {SESSION_COOKIE, userFromSession} from '$lib/server/services/accounts';
import {errorInfo, log, Timer} from '$lib/server/infra/log';

const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'x-frame-options': 'DENY',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()'
};

// Runs on every request. It keeps nothing between requests (stateless): the user comes from the session cookie + D1,
// so any Worker instance anywhere can serve any request.
export const handle: Handle = async ({event, resolve}) => {
  event.locals.reqId = event.request.headers.get('cf-ray') ?? crypto.randomUUID();
  event.locals.timer = new Timer();
  event.locals.db = undefined as never;          // created lazily by getDb()
  const db = getDb(event);
  const token = event.cookies.get(SESSION_COOKIE);
  event.locals.user = db && token ? await event.locals.timer.time('auth', () => userFromSession(db, token)) : null;

  const response = await resolve(event);

  const t = event.locals.timer;
  response.headers.set('x-request-id', event.locals.reqId);
  response.headers.set('server-timing', t.serverTiming());
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) if (!response.headers.has(k)) response.headers.set(k, v);
  // Read-your-writes across requests when D1 read replication is on.
  const bookmark = bookmarkOf(event.locals.db);
  if (bookmark && bookmark !== event.cookies.get(BOOKMARK_COOKIE)) {
    response.headers.append('set-cookie', `${BOOKMARK_COOKIE}=${bookmark}; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`);
  }
  log(response.status >= 500 ? 'error' : 'info', 'request', {
    reqId: event.locals.reqId, method: event.request.method, path: event.url.pathname, route: event.route.id,
    status: response.status, user: event.locals.user?.id ?? null, colo: (event.platform as {cf?: {colo?: string}} | undefined)?.cf?.colo,
    ...t.fields()
  });
  return response;
};

// Unexpected errors: full details go to the logs, the person sees a short message and a reference id.
export const handleError: HandleServerError = ({error, event, status, message}) => {
  const id = event.locals.reqId ?? crypto.randomUUID();
  if (status !== 404) log('error', 'unhandled error', {reqId: id, path: event.url.pathname, status, ...errorInfo(error)});
  return {message: status === 404 ? 'Page not found' : message || 'Something went wrong', id};
};
