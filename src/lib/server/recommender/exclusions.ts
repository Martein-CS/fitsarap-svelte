// Allergy and diet exclusions. A recipe is hidden when ANY of its ingredient lines matches (garnishes included).
// This is name matching, not an allergy-safe guarantee; the site says so wherever exclusions appear.

// Patterns searched for in every ingredient line of a recipe (raw text + canonical name), optional garnishes included,
// when an exclusion is chosen. Each pattern starts at a word boundary, so "egg" does not hit "eggplant".
// The lists err on the side of excluding: e.g. regular soy sauce is brewed with wheat, and bagoong can be fish or shrimp.
export const EXCLUDE_TERMS: Record<string, string[]> = {
  Peanuts: ['peanut', 'mani\\b', 'kare-kare'],
  Shellfish: ['shrimp', 'prawn', 'crab', 'lobster', 'mussel', 'oyster(?! mushroom)', 'scallop', 'clam', 'squid', 'calamari', 'octopus', 'cuttlefish',
    'tahong', 'talaba', 'halaan', 'tulya', 'pusit', 'hipon', 'sugpo', 'alimango', 'alimasag', 'alamang', 'bagoong', 'kuhol'],
  Fish: ['fish', 'bangus', 'milkfish', 'tilapia', 'tuna', 'salmon', 'mackerel', 'galunggong', 'sardin', 'anchov', 'dilis', 'tuyo\\b',
    'daing', 'tinapa', 'lapu', 'maya-maya', 'bonito', 'dashi', 'patis', 'bagoong'],
  Egg: ['eggs?\\b', 'egg noodle', 'itlog', 'balut', 'mayo', 'leche flan'],
  Soy: ['soy', 'toyo', 'tofu', 'tokwa', 'taho\\b', 'tausi', 'salted black bean', 'miso', 'edamame', 'tempeh'],
  Dairy: ['milk(?!fish)', 'cheese', 'keso', 'queso', '(?<!peanut )butter\\b', 'cream(?! dory)', 'yogh?urt', 'ghee', 'evaporada', 'condensada'],
  Wheat: ['(?<!rice |tapioca |corn |coconut |cassava |potato |almond )flour', 'wheat', '(?<!rice |glass )noodle', 'bread(?!fruit)', 'panko', 'pasta', 'spaghetti', 'macaroni', 'canton', 'miki', 'mi(?:s|ss)ua', 'miswa', 'udon',
    'ramen', 'wrapper', 'pandesal', 'soy sauce', 'toyo', 'oyster sauce'],
  Chicken: ['chicken', 'manok'],
  Pork: ['pork', 'baboy', 'bacon', 'ham\\b', 'chicharon', 'lechon', 'pata\\b', 'liempo', 'longganisa', 'tocino', 'chorizo', 'lard\\b',
    'bagnet', 'pancetta', 'prosciutto', 'spam\\b', 'giniling']
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds a test for one set of exclusions. "milk"/"cream" do not count when the line is about coconut milk or cream. */
export function excluder(exclusions: string[]): ((text: string) => boolean) | null {
  const pats = exclusions.flatMap((x) => EXCLUDE_TERMS[x] ?? [esc(x.toLowerCase().trim())]).filter(Boolean);
  if (!pats.length) return null;
  const re = new RegExp('\\b(?:' + pats.join('|') + ')', 'g');
  return (text) => [...text.matchAll(re)].some((m) => !(/^(milk|cream)/.test(m[0]) && /coconut|gata/.test(text)));
}

/** For one recipe: which ingredients match each exclusion category ({Dairy: ['butter'], ...}). Shown as a warning on the
 *  recipe page when the person's own exclusions are involved (a recipe opened from a link is not filtered). */
export function flagsFor(ingredients: {name: string; raw: string}[]): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const cat of Object.keys(EXCLUDE_TERMS)) {
    const test = excluder([cat])!;
    const hit = [...new Set(ingredients.filter((g) => test((g.raw + ' ' + g.name).toLowerCase())).map((g) => g.name))];
    if (hit.length) out[cat] = hit;
  }
  return out;
}
