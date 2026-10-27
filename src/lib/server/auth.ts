import type {Cookies} from '@sveltejs/kit';
import type {D1Database} from '@cloudflare/workers-types';
import type {User} from '$lib/types';

const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const rand = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
const sha = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));
// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
async function pbkdf2(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256'}, key, 256));
}
const equal = (a: string, b: string) => { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0; };
export const clean = (s: unknown, max = 90) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, max);

const COOKIE = 'fitsarap_session';
const WEEK = 7 * 86400;

export async function userFromSession(db: D1Database, token?: string): Promise<User | null> {
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  return db.prepare('SELECT users.id, users.username, users.email FROM sessions JOIN users ON sessions.user_id=users.id WHERE sessions.token_hash=? AND sessions.expires_at>?')
    .bind(await sha(token), Date.now()).first<User>();
}

async function startSession(db: D1Database, user: User, cookies: Cookies) {
  const token = rand();
  await db.prepare('INSERT INTO sessions(token_hash,user_id,expires_at) VALUES(?,?,?)').bind(await sha(token), user.id, Date.now() + WEEK * 1000).run();
  cookies.set(COOKIE, token, {path: '/', httpOnly: true, sameSite: 'lax', maxAge: WEEK});
}

export async function destroySession(db: D1Database, cookies: Cookies) {
  const token = cookies.get(COOKIE);
  if (token && /^[a-f0-9]{64}$/.test(token)) await db.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await sha(token)).run();
  cookies.delete(COOKIE, {path: '/'});
}

type Result = {user: User} | {error: string; status: number};

export async function registerUser(db: D1Database, cookies: Cookies, usernameIn: string, emailIn: string, password: string): Promise<Result> {
  const username = clean(usernameIn, 40), email = emailIn.trim().toLowerCase();
  if (username.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 150 || password.length < 10 || password.length > 128)
    return {error: 'Enter a username, a valid email, and a password of at least 10 characters.', status: 400};
  const salt = rand(16), id = crypto.randomUUID();
  try {
    await db.prepare('INSERT INTO users(id,username,email,password_hash,password_salt) VALUES(?,?,?,?,?)').bind(id, username, email, await pbkdf2(password, salt), salt).run();
  } catch {
    return {error: 'Username or email is already registered.', status: 409};
  }
  const user = {id, username, email};
  await startSession(db, user, cookies);
  return {user};
}

export async function loginUser(db: D1Database, cookies: Cookies, identifier: string, password: string): Promise<Result> {
  const rec = await db.prepare('SELECT * FROM users WHERE email=? OR username=?').bind(identifier.trim(), identifier.trim())
    .first<{id: string; username: string; email: string; password_hash: string; password_salt: string}>();
  if (!rec || !equal(await pbkdf2(password, rec.password_salt), rec.password_hash)) return {error: 'Incorrect email/username or password.', status: 401};
  const user = {id: rec.id, username: rec.username, email: rec.email};
  await startSession(db, user, cookies);
  return {user};
}
