// Unit handling shared by the model (server) and the recipe page (browser).
// Conversions stay inside one dimension: mass with mass, volume with volume. Mass and volume are never converted
// into each other (that would need an ingredient-specific density, which the dataset does not have).

const ALIAS: Record<string, string> = {
  pc: 'pcs', piece: 'pcs', pieces: 'pcs', clove: 'cloves', cup: 'cups', gram: 'g', grams: 'g', kilo: 'kg', kilos: 'kg',
  liter: 'L', l: 'L', litre: 'L', tablespoon: 'tbsp', teaspoon: 'tsp', lb: 'lbs', pound: 'lbs', pounds: 'lbs', ounce: 'oz',
  ounces: 'oz', thumb: 'thumbs', head: 'heads', stalk: 'stalks', can: 'cans', pack: 'packs', slice: 'slices'
};
export const normUnit = (u: string | null | undefined): string => (u ? (ALIAS[u.toLowerCase()] ?? u) : '');

const MASS: Record<string, number> = {g: 1, kg: 1000, mg: 0.001, lbs: 453.592, oz: 28.3495};
const VOL: Record<string, number> = {ml: 1, L: 1000, tsp: 4.929, tbsp: 14.787, cups: 240, 'fl oz': 29.574, qt: 946.353, pt: 473.176, gal: 3785.41};

/** Amount in a base unit plus its dimension ("mass", "vol", or "count:<unit>"), or null when it cannot be compared. */
export function toBase(amount: number | null | undefined, unit: string | null | undefined): [number, string] | null {
  if (amount == null || !Number.isFinite(amount) || !unit) return null;
  const u = normUnit(unit);
  if (u in MASS) return [amount * MASS[u], 'mass'];
  if (u in VOL) return [amount * VOL[u], 'vol'];
  return [amount, 'count:' + u];
}

type Amt = number | null | undefined;
type Unit = string | null | undefined;

/** have / need (not capped) when both amounts are comparable, otherwise null. */
export function ratio(haveAmt: Amt, haveUnit: Unit, needAmt: Amt, needUnit: Unit): number | null {
  const h = toBase(haveAmt, haveUnit), n = toBase(needAmt, needUnit);
  if (!h || !n || !n[0] || h[1] !== n[1]) return null;
  return h[0] / n[0];
}

/** have / need (capped at 1) when both amounts are comparable, otherwise null. Used by the ranking model. */
export function sufficiency(haveAmt: Amt, haveUnit: Unit, needAmt: Amt, needUnit: Unit): number | null {
  const r = ratio(haveAmt, haveUnit, needAmt, needUnit);
  return r === null ? null : Math.min(1, r);
}
