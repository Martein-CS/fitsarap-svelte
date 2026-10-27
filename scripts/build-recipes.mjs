// Converts the Hugging Face dataset joackimagno/FILIPINO_RECIPES_2K_V2 into src/lib/server/recipes.json
//   node scripts/build-recipes.mjs                    download all rows from the Hugging Face dataset server
//   node scripts/build-recipes.mjs --file rows.json   use a local JSON array of rows instead
import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';

const OUT = 'src/lib/server/recipes.json';
const API = 'https://datasets-server.huggingface.co/rows?dataset=joackimagno%2FFILIPINO_RECIPES_2K_V2&config=default&split=train';

// Ingredient names the matcher should recognise. Longest match wins ("tomato sauce" beats "tomato").
const VOCAB = `chicken|chicken breast|chicken thigh|chicken liver|pork|pork belly|pork liver|ground pork|beef|ground beef|beef shank|beef broth|chicken broth|pork broth|goat|carabeef|fish|bangus|milkfish|tilapia|tuna|salmon|mackerel|squid|shrimp|prawn|mussel|crab|egg|salted egg|rice|glutinous rice|rice noodles|bihon|sotanghon|miki|canton noodles|noodles|pasta|macaroni|garlic|onion|red onion|green onion|scallion|spring onion|ginger|tomato|tomato sauce|tomato paste|potato|sweet potato|kamote|carrot|cabbage|bok choy|pechay|spinach|kangkong|malunggay|hot pepper leaves|sitaw|string beans|snake beans|long green beans|green beans|eggplant|okra|ampalaya|bitter melon|kalabasa|squash|upo|opo squash|sayote|chayote|green papaya|papaya|banana blossom|saba banana|banana|corn|baby corn|green peas|snow peas|snap peas|bell pepper|chili|chili pepper|thai chili|long green pepper|siling pansigang|jalapeno|celery|cauliflower|mung beans|mung bean sprouts|tofu|taro|gabi|taro leaves|jackfruit|radish|daikon|lemongrass|calamansi|lemon|lime|pineapple|soy sauce|vinegar|fish sauce|oyster sauce|shrimp paste|bagoong|bagoong alamang|coconut milk|coconut cream|peanut butter|peanuts|liver spread|hotdog|hot dog|chorizo|sausage|bacon|ham|cheese|cheddar cheese|butter|margarine|mayonnaise|ketchup|banana ketchup|sugar|brown sugar|salt|ground black pepper|black pepper|peppercorn|pepper corn|bay leaf|annatto|atsuete|flour|all-purpose flour|cornstarch|bread crumbs|milk|evaporated milk|condensed milk|cooking oil|vegetable oil|oil|water|chicharon|dilis|anchovies|olives|raisins|chick pea|miso|tamarind|sinigang mix|lard|pork blood|pork ears|oxtail|tripe|spare ribs|pork ribs|beef ribs|pork hock|pata|kangkong leaves|chickpeas|mushroom|cucumber|lettuce|pandan|vanilla|cocoa|chocolate|sprite|coke|rice wash|garlic powder|onion powder|chili flakes|paprika|turmeric|star anise|lemon juice|calamansi juice|sesame oil|patis|toyo|suka|gata|beef powder|chicken powder|pork powder|bouillon`.split('|');

// Specific cuts/forms map to the base ingredient a home cook would list in a pantry.
const BASE = {'chicken breast': 'chicken', 'chicken thigh': 'chicken', 'pork belly': 'pork', 'ground pork': 'pork', 'pork hock': 'pork', 'pata': 'pork', 'pork ribs': 'pork', 'spare ribs': 'pork', 'pork ears': 'pork', 'beef shank': 'beef', 'ground beef': 'beef', 'beef ribs': 'beef', 'oxtail': 'beef', 'milkfish': 'bangus', 'scallion': 'green onion', 'spring onion': 'green onion', 'thai chili': 'chili', 'chili pepper': 'chili', 'kangkong leaves': 'kangkong', 'hot dog': 'hotdog', 'bagoong alamang': 'bagoong', 'shrimp paste': 'bagoong', 'long green beans': 'sitaw', 'string beans': 'sitaw', 'snake beans': 'sitaw', 'green beans': 'sitaw', 'opo squash': 'upo', 'pepper corn': 'peppercorn', 'chickpeas': 'chick pea', 'lemon juice': 'lemon', 'calamansi juice': 'calamansi'};

const STAPLE_KEYS = new Set(['rice wash', 'water', 'salt', 'pepper', 'black pepper', 'ground black pepper', 'peppercorn', 'pepper corn', 'cooking oil', 'vegetable oil', 'oil', 'sugar', 'brown sugar']);
const LIQUID = /\b(sauce|milk|broth|water|juice|vinegar|oil|cream|stock|soda|wash)\b/i;
const UNITS = [
  [/^(lbs?\.?|pounds?)$/i, 'lbs'], [/^(oz\.?|ounces?)$/i, 'oz'], [/^(g|grams?|gm)$/i, 'g'], [/^(kg|kilos?|kilograms?)$/i, 'kg'],
  [/^(ml|milliliters?)$/i, 'ml'], [/^(l|liters?|litres?)$/i, 'L'], [/^(quarts?|qt)$/i, 'quarts'], [/^cups?$/i, 'cups'],
  [/^(tbsps?\.?|tbs|tablespoons?|tablespons?|tablepespoons?)$/i, 'tbsp'], [/^(tsps?\.?|teaspoons?|teaspons?)$/i, 'tsp'],
  [/^cloves?$/i, 'cloves'], [/^(pieces?|pcs?\.?)$/i, 'pcs'], [/^thumbs?$/i, 'thumbs'], [/^heads?$/i, 'heads'],
  [/^(bunch(es)?|bundles?)$/i, 'bunch'], [/^cans?$/i, 'cans'], [/^(packs?|packets?|pouches?|sachets?)$/i, 'packs'],
  [/^(stalks?|staks?|stems?)$/i, 'stalks'], [/^slices?$/i, 'slices'], [/^pinch(es)?$/i, 'pinch']
];
const CUT = /\b(cut|cubed|chopped|minced|sliced|diced|crushed|cleaned|washed|peeled|deveined|julienne|julienned|wedged|quartered|halved|thinly|finely|boiled|cooked|fried|shredded|grated|drained|soaked|divided|separated|removed|preferably|optional|preferrably)\b/i;
const LEAD = /^(large|medium|small|ripe|fresh|whole|boneless|skinless|dried|baby|raw|big|extra)\s+/i;
const NUM = '(?:\\d+/\\d+|\\d+(?:\\.\\d+)?(?:\\s+\\d+/\\d+)?)';
const QTY = new RegExp(`^(${NUM})(?:\\s*(?:to|-|–)\\s*(${NUM}))?\\s*`, 'i');
const SIZE = /^\d+(?:\.\d+)?\s?(?:g|oz\.?|ounces?|grams?)\s+(?=packs?|cans?|pouch|pouches|sachet)/i;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function num(s) {
  const p = s.trim().split(/\s+/);
  return p.reduce((a, t) => a + (t.includes('/') ? t.split('/')[0] / t.split('/')[1] : Number(t)), 0);
}
function minutes(s) {
  if (!s) return 0;
  const m = (re) => Number((String(s).match(re) || [])[1] || 0);
  return m(/(\d+)\s*day/i) * 1440 + m(/(\d+)\s*hour/i) * 60 + m(/(\d+)\s*min/i);
}
function category(name) {
  const n = name.toLowerCase();
  const rules = [['Noodles', /pancit|palabok|sotanghon|miki|bihon|canton|spaghetti|lomi/], ['Soup', /sinigang|tinola|nilaga|bulalo|soup|sopas|lugaw|arroz caldo|goto|batchoy|molo|laswa/],
    ['Stew', /kaldereta|caldereta|mechado|afritada|menudo|pochero|kare|estofado|dinuguan|bistek|hamonado/], ['Adobo & Paksiw', /adobo|paksiw/],
    ['Coconut milk (ginataan)', /ginataang|gata|bicol express|laing|gising|binakol/], ['Grilled & Fried', /inihaw|grill|fried|fry|crispy|lechon|tapa|barbecue|bbq|inasal|sisig|tocino|longganisa|torta|chop|empanada|lumpia|crispy|kawali/],
    ['Vegetables', /ginisang|pinakbet|chop suey|gulay|ampalaya|talong|togue|repolyo|upo/], ['Rice', /rice|sinangag|champorado|bibingka/], ['Seafood', /shrimp|hipon|pusit|squid|bangus|tilapia|salmon|tuna|fish|sugpo|tahong|talangka/]];
  for (const [c, re] of rules) if (re.test(n)) return c;
  return 'Other';
}
const slug = (s) => s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 52) || 'recipe';

function makeVocab(extra) {
  const set = new Set([...VOCAB, ...extra].map((t) => t.toLowerCase().trim()).filter((t) => t.length > 1));
  return [...set].sort((a, b) => b.length - a.length).map((t) => [t, new RegExp(`\\b${esc(t)}(?:s|es)?\\b`, 'i')]);
}
let fallbackCount = 0; const fallbacks = new Map();

export function parseIngredient(line, vocab) {
  const raw = line.trim();
  let s = raw.replace(/\([^)]*\)/g, ' ').replace(/\bsee notes?\s*\d*/gi, ' ').replace(/\s+/g, ' ').trim();
  const optional0 = /optional|garnish|for serving|\bknorr\b|\bmaggi\b|magic sarap|lady'?s choice|ladys choice/i.test(raw);
  let amount = null, unit = '';
  const q = s.match(QTY);
  if (q) {
    amount = num(q[1]);
    s = s.slice(q[0].length).replace(SIZE, '');
    const tok = s.split(' ')[0].replace(/[.,]$/, '');
    const hit = UNITS.find(([re]) => re.test(tok));
    if (hit) { unit = hit[1]; s = s.slice(s.split(' ')[0].length).trim(); }
    else if (/^\d/.test(tok) && /^(\d+(\.\d+)?)(g|oz)$/i.test(tok)) { s = s.slice(tok.length).trim(); }
    if (!unit) unit = 'pcs';
    if (unit === 'quarts') { amount = Math.round(amount * 946); unit = 'ml'; }
    if (unit === 'oz' && LIQUID.test(s)) { amount = Math.round(amount * 29.57); unit = 'ml'; }
  }
  let name = s.split(/,| – | - /)[0].trim();
  let cut = name.search(CUT); if (cut > 0) name = name.slice(0, cut).trim();
  name = name.replace(/\s+or\s+.*$/i, '').replace(/\s+(and|with)\s+.*$/i, '').replace(/^of\s+/i, '');
  while (LEAD.test(name)) name = name.replace(LEAD, '');
  name = name.replace(/\s+/g, ' ').trim() || s.trim() || raw;
  const find = (text) => { for (const [t, re] of vocab) if (re.test(text)) return t; return null; };
  let key = find(name) ?? find(s);
  if (key && BASE[key]) key = BASE[key];
  if (!key) { key = name.toLowerCase().replace(/[^a-z\s]/g, '').trim() || 'unknown'; fallbackCount++; fallbacks.set(key, (fallbacks.get(key) || 0) + 1); }
  const optional = optional0 || /powder|cube|bouillon|seasoning|\bmix\b/i.test(key + ' ' + name);
  const staple = STAPLE_KEYS.has(key) || /to taste/i.test(raw);
  return {name: name.toLowerCase(), key, raw, amount: staple ? null : amount, unit: staple ? '' : unit, optional, staple};
}

const fixText = (t) => t.replace(/\bSaut\b/g, 'Sauté').replace(/\bsaut\b/g, 'sauté').replace(/\bSauting\b/g, 'Sautéing').replace(/\bsauting\b/g, 'sautéing').trim();

export function buildRecipes(rows) {
  const extra = rows.flatMap((r) => String(r.ingredient_names || '').split('|'));
  const vocab = makeVocab(extra);
  const seen = new Map(); const out = [];
  for (const r of rows) {
    if (!r.recipe_name || !r.ingredients) continue;
    const ingredients = String(r.ingredients).split('|').map((l) => l.trim()).filter(Boolean).map((l) => parseIngredient(l, vocab));
    const steps = String(r.instructions || '').split('|').map(fixText).filter(Boolean);
    if (!ingredients.length || !steps.length) continue;
    let id = slug(r.recipe_name); const n = (seen.get(id) || 0) + 1; seen.set(id, n); if (n > 1) id += '-' + n;
    out.push({id, name: String(r.recipe_name).trim(), category: category(r.recipe_name), prep: minutes(r.prep_time), cook: minutes(r.cook_time),
      servings: Math.max(1, Math.round(parseFloat(r.servings) || 4)), ingredients, steps});
  }
  return out;
}

async function fetchAll() {
  const rows = []; let total = Infinity;
  for (let o = 0; o < total; o += 100) {
    const res = await fetch(`${API}&offset=${o}&length=100`);
    if (!res.ok) throw new Error(`Hugging Face returned ${res.status}. Download the dataset rows and run again with --file rows.json`);
    const j = await res.json();
    if (!Array.isArray(j.rows)) throw new Error('Unexpected response from Hugging Face (no "rows"). Use --file rows.json instead.');
    total = j.num_rows_total ?? j.rows.length; rows.push(...j.rows.map((x) => x.row));
    process.stdout.write(`\rDownloaded ${rows.length}/${total}`);
  }
  console.log(); return rows;
}

if (process.argv[1] && process.argv[1].endsWith('build-recipes.mjs')) {
  const fi = process.argv.indexOf('--file');
  const rows = fi > 0 ? JSON.parse(readFileSync(process.argv[fi + 1], 'utf8')) : await fetchAll();
  const recipes = buildRecipes(rows);
  mkdirSync(dirname(OUT), {recursive: true});
  writeFileSync(OUT, JSON.stringify(recipes));
  const lines = recipes.reduce((a, r) => a + r.ingredients.length, 0);
  console.log(`Wrote ${recipes.length} recipes (${lines} ingredient lines) to ${OUT}`);
  console.log(`${fallbackCount} lines had no known ingredient name. Most common (add them to VOCAB in this script if useful):`);
  console.log([...fallbacks].sort((a, b) => b[1] - a[1]).slice(0, 30).map(([k, c]) => `${k} (${c})`).join(', '));
}
