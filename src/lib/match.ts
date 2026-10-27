// Flexible ingredient-name matching: case, plurals, Filipino names, descriptors, small typos.
const ALIASES: Record<string, string> = {
  manok: 'chicken', baboy: 'pork', baka: 'beef', isda: 'fish', hipon: 'shrimp', itlog: 'egg', bigas: 'rice', kanin: 'rice',
  bawang: 'garlic', sibuyas: 'onion', luya: 'ginger', toyo: 'soy sauce', suka: 'vinegar', patis: 'fish sauce', asin: 'salt',
  asukal: 'sugar', kamatis: 'tomato', patatas: 'potato', karot: 'carrot', talong: 'eggplant', langis: 'cooking oil',
  sili: 'chili', laurel: 'bay leaf', 'dahon ng laurel': 'bay leaf', kalamansi: 'calamansi', gata: 'coconut milk', toge: 'mung bean sprouts'
};
const NOISE = new Set(['fresh', 'chopped', 'minced', 'sliced', 'diced', 'crushed', 'ground', 'boneless', 'skinless', 'raw', 'cooked', 'whole', 'large', 'small', 'medium', 'of', 'some']);

export function canon(s: unknown): string {
  let n = String(s ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ');
  n = n.split(/\s+/).filter((w) => w && !NOISE.has(w)).join(' ');
  if (ALIASES[n]) return ALIASES[n];
  n = n.split(' ').map((w) => (w.endsWith('oes') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w)).join(' ');
  return ALIASES[n] ?? n;
}

function dist(a: string, b: string): number {
  const d: number[][] = Array.from({length: a.length + 1}, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Does a pantry item called `have` satisfy a recipe ingredient called `need`? */
export function same(have: string, need: string): boolean {
  const a = canon(have), b = canon(need);
  if (!a || !b) return false;
  if (a === b) return true;
  const at = a.split(' ');
  if (b.split(' ').every((w) => at.includes(w))) return true;
  const max = b.length >= 8 ? 2 : b.length >= 5 ? 1 : 0;
  return max > 0 && dist(a, b) <= max;
}

const UNIT_ALIAS: Record<string, string> = { pc: 'pcs', piece: 'pcs', pieces: 'pcs', clove: 'cloves', cup: 'cups', gram: 'g', grams: 'g', kilo: 'kg', liter: 'L', l: 'L', litre: 'L', tablespoon: 'tbsp', teaspoon: 'tsp' };
export const normUnit = (u: string | null): string => (u ? (UNIT_ALIAS[u.toLowerCase()] ?? u) : '');
