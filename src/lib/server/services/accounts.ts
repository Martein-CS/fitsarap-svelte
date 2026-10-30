// Accounts and sessions. Sessions live in D1 (not in Worker memory), so any Worker instance in any location can
// serve any request: the app servers stay stateless and scale out freely.
import type {Cookies, RequestEvent} from '@sveltejs/kit';
import type {User} from '../../domain/types';
import type {Db} from '../repositories/db';
import {users} from '../repositories/users';
import {sessions} from '../repositories/sessions';
import {clean, equal, pbkdf2, rand, sha256} from '../infra/crypto';
import {background} from '../infra/jobs';

export const SESSION_COOKIE = 'fitsarap_session';
const WEEK = 7 * 86400;
const TOKEN = /^[a-f0-9]{64}$/;

export async function userFromSession(db: Db, token?: string): Promise<User | null> {
  if (!token || !TOKEN.test(token)) return null;
  return sessions.user(db, await sha256(token), Date.now());
}

async function startSession(event: Pick<RequestEvent, 'platform' | 'locals'>, db: Db, user: User, cookies: Cookies) {
  const token = rand();
  await sessions.create(db, await sha256(token), user.id, Date.now() + WEEK * 1000);
  cookies.set(SESSION_COOKIE, token, {path: '/', httpOnly: true, sameSite: 'lax', maxAge: WEEK});
  // Housekeeping off the request path; the jobs Worker's cron does this daily as well.
  if (Math.random() < 0.02) background(event, sessions.purgeExpired(db, Date.now()), 'purge sessions');
}

export async function logout(db: Db, cookies: Cookies) {
  const token = cookies.get(SESSION_COOKIE);
  if (token && TOKEN.test(token)) await sessions.delete(db, await sha256(token));
  cookies.delete(SESSION_COOKIE, {path: '/'});
}

type Result = {user: User} | {error: string; status: number};
type Ev = Pick<RequestEvent, 'platform' | 'locals' | 'cookies'>;

export async function register(event: Ev, db: Db, usernameIn: string, emailIn: string, password: string): Promise<Result> {
  const username = clean(usernameIn, 40), email = emailIn.trim().toLowerCase();
  if (username.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 150 || password.length < 10 || password.length > 128)
    return {error: 'Enter a username, a valid email, and a password of at least 10 characters.', status: 400};
  const salt = rand(16), user = {id: crypto.randomUUID(), username, email};
  try {
    await users.create(db, {...user, password_hash: await pbkdf2(password, salt), password_salt: salt});
  } catch {
    return {error: 'Username or email is already registered.', status: 409};
  }
  await startSession(event, db, user, event.cookies);
  return {user};
}

export async function login(event: Ev, db: Db, identifier: string, password: string): Promise<Result> {
  const rec = await users.byLogin(db, identifier.trim());
  // Hash even when the user does not exist, so response time does not reveal which accounts exist.
  const hash = await pbkdf2(password, rec?.password_salt ?? 'no-such-user-salt');
  if (!rec || !equal(hash, rec.password_hash)) return {error: 'Incorrect email/username or password.', status: 401};
  const user = {id: rec.id, username: rec.username, email: rec.email};
  await startSession(event, db, user, event.cookies);
  return {user};
}
