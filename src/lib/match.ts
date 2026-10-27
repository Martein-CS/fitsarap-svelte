// Flexible ingredient-name matching: case, plurals, Filipino names, descriptors, small typos.
const ALIASES: Record<string, string> = {
  manok: 'chicken', baboy: 'pork', baka: 'beef', isda: 'fish', hipon: 'shrimp', prawn: 'shrimp', sugpo: 'shrimp', itlog: 'egg', bigas: 'rice', kanin: 'rice',
  bawang: 'garlic', sibuyas: 'onion', luya: 'ginger', toyo: 'soy sauce', suka: 'vinegar', patis: 'fish sauce', asin: 'salt',
  asukal: 'sugar', kamatis: 'tomato', patatas: 'potato', karot: 'carrot', talong: 'eggplant', 'egg plant': 'eggplant', langis: 'cooking oil',
  sili: 'chili', 'chili pepper': 'chili', chilli: 'chili', labuyo: 'chili', 'siling labuyo': 'chili', 'thai chili': 'chili', 'hot pepper': 'chili',
  laurel: 'bay leaf', 'dahon ng laurel': 'bay leaf', kalamansi: 'calamansi', gata: 'coconut milk', toge: 'mung bean sprout', togue: 'mung bean sprout', 'bean sprout': 'mung bean sprout',
  monggo: 'mung bean', munggo: 'mung bean', mongo: 'mung bean',
  'string bean': 'sitaw', 'snake bean': 'sitaw', 'long green bean': 'sitaw', 'green bean': 'sitaw', 'baguio bean': 'sitaw',
  pechay: 'bok choy', 'pak choi': 'bok choy', 'baby bok choy': 'bok choy', 'bitter melon': 'ampalaya', 'bitter gourd': 'ampalaya',
  squash: 'kalabasa', 'butternut squash': 'kalabasa', 'green onion': 'green onion', scallion: 'green onion', 'spring onion': 'green onion',
  milkfish: 'bangus', 'shrimp paste': 'bagoong', 'bagoong alamang': 'bagoong', 'hot dog': 'hotdog', kamote: 'sweet potato', gabi: 'taro', chayote: 'sayote'
};
const NOISE = new Set(['fresh', 'chopped', 'minced', 'sliced', 'diced', 'crushed', 'ground', 'boneless', 'skinless', 'raw', 'cooked', 'whole', 'large', 'small', 'medium', 'of', 'some', 'dried', 'ripe']);

function stem(w: string): string {
  if (w === 'leaves') return 'leaf';
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y';
  if (w.endsWith('oes')) return w.slice(0, -2);
  if (w.length > 3 && w.endsWith('s') && !/(ss|us|is)$/.test(w)) return w.slice(0, -1);
  return w;
}

const cache = new Map<string, string>();
export function canon(s: unknown): string {
  const input = String(s ?? '');
  const hit = cache.get(input);
  if (hit !== undefined) return hit;
  let n = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z\s]/g, ' ');
  n = n.split(/\s+/).filter((w) => w && !NOISE.has(w)).join(' ');
  let out = ALIASES[n];
  if (out === undefined) {
    n = n.split(' ').map(stem).join(' ');
    out = ALIASES[n] ?? n;
  }
  if (cache.size > 20000) cache.clear();
  cache.set(input, out);
  return out;
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
  if (max === 0 || Math.abs(a.length - b.length) > max || a[0] !== b[0]) return false;
  return dist(a, b) <= max;
}

const UNIT_ALIAS: Record<string, string> = {
  pc: 'pcs', piece: 'pcs', pieces: 'pcs', clove: 'cloves', cup: 'cups', gram: 'g', grams: 'g', kilo: 'kg', liter: 'L', l: 'L', litre: 'L',
  tablespoon: 'tbsp', teaspoon: 'tsp', lb: 'lbs', pound: 'lbs', pounds: 'lbs', ounce: 'oz', ounces: 'oz', thumb: 'thumbs', head: 'heads', stalk: 'stalks', can: 'cans', pack: 'packs', slice: 'slices'
};
export const normUnit = (u: string | null): string => (u ? (UNIT_ALIAS[u.toLowerCase()] ?? u) : '');
