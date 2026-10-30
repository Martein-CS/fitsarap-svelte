// Input validation shared by form actions and the JSON API.
import type {PantryItem} from '../../domain/types';
import {units} from '../../domain/constants';
import {clean} from '../infra/crypto';
import {MAX_PANTRY} from './kitchen';

type In = Pick<PantryItem, 'name' | 'amount' | 'unit'>;

/** One pantry item, or null when it is not valid. Unknown units are dropped (the amount is then not compared). */
export function cleanItem(x: unknown): Omit<PantryItem, 'id'> | null {
  if (!x || typeof x !== 'object') return null;
  const o = x as Record<string, unknown>;
  const name = clean(o.name);
  if (!name) return null;
  const amount = o.amount == null || o.amount === '' ? null : Number(o.amount);
  if (amount !== null && (!Number.isFinite(amount) || amount <= 0 || amount > 1e8)) return null;
  const unit = amount === null ? null : typeof o.unit === 'string' && units.includes(o.unit) ? o.unit : null;
  return {name, amount: unit ? amount : null, unit, approximate: o.approximate === true};
}

/** A pantry sent to the public API: 1–40 valid items. */
export function cleanPantry(x: unknown): In[] | null {
  if (!Array.isArray(x) || !x.length || x.length > MAX_PANTRY) return null;
  const items = x.map(cleanItem);
  return items.every(Boolean) ? (items as In[]) : null;
}
