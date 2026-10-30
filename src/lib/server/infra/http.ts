// API gateway helpers shared by every /api/v1 endpoint: JSON errors, size-capped body parsing, rate limiting,
// CORS for the public read-only endpoints, and an origin check for endpoints that use the session cookie.
import {json, type RequestEvent} from '@sveltejs/kit';
import {allow} from './ratelimit';

/** JSON error body used by every /api endpoint: {error: {code, message}}. */
export const apiError = (status: number, code: string, message: string, headers: Record<string, string> = {}) =>
  json({error: {code, message}}, {status, headers});

/** Parses a JSON body of at most `maxBytes`. Returns null for a wrong content type, an oversized or invalid body. */
export async function readJson<T>(request: Request, maxBytes = 32_000): Promise<T | null> {
  if (!(request.headers.get('content-type') ?? '').toLowerCase().startsWith('application/json')) return null;
  const len = Number(request.headers.get('content-length') ?? 0);
  if (len > maxBytes) return null;
  const text = await request.text();
  if (text.length > maxBytes) return null;
  try { return JSON.parse(text) as T; } catch { return null; }
}

/** Public endpoints (no cookies used) may be called from any site, e.g. a mobile app or a recipe website. */
export const CORS: Record<string, string> = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
};
export const preflight = () => new Response(null, {status: 204, headers: CORS});

type Ev = Pick<RequestEvent, 'platform' | 'request' | 'getClientAddress' | 'url'>;

/** Rate limit for API calls. Returns an error response to send back, or null to continue. */
export async function limit(event: Ev, cors = false): Promise<Response | null> {
  if (await allow(event, 'api')) return null;
  return apiError(429, 'rate_limited', 'Too many requests. Try again in a minute.', {'retry-after': '60', ...(cors ? CORS : {})});
}

/** Endpoints that act on the visitor's own pantry use the session cookie, so they only accept same-site requests. */
export function sameOrigin(event: Ev): Response | null {
  const origin = event.request.headers.get('origin');
  if (event.request.method === 'GET' || !origin || origin === event.url.origin) return null;
  return apiError(403, 'cross_origin', 'This endpoint only accepts requests from the FitSarap site.');
}
