// Password hashing and random tokens (Web Crypto, available in Workers).
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
export const rand = (n = 32) => hex(crypto.getRandomValues(new Uint8Array(n)));
export const sha256 = async (s: string) => hex(await crypto.subtle.digest('SHA-256', enc.encode(s)));

// Cloudflare Workers caps PBKDF2 at 100,000 iterations.
export async function pbkdf2(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return hex(await crypto.subtle.deriveBits({name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256'}, key, 256));
}

/** Constant-time string comparison. */
export function equal(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const clean = (s: unknown, max = 90) => String(s ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
