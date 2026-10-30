"""Export the FitSarap v5.1 dataset + ingredient lexicon into the JSON files the website uses.

    python scripts/export_v51.py <v5.1 folder> <fitsarap_preprocessing_v5.py>

<v5.1 folder> must contain fitsarap_cleaned_ingredients_v5_1.csv and fitsarap_cleaned_recipes_v5_1.csv.
The preprocessing script is imported only for its ingredient lexicon (synonyms, Filipino names, families).

Writes:
  src/lib/server/recommender/data/recipes.json      recipe catalog (server only)
  src/lib/server/recommender/data/lexicon.json      phrase -> canonical ingredient, canonical -> family (server only)
  src/lib/server/recommender/data/subs.json         substitution suggestions with their source (server only)
  src/lib/data/ingredient-names.json    names for the ingredient autocomplete (browser)
  src/lib/data/model-info.json          model weights + version info (browser and server)
"""
import importlib.util, json, math, re, sys
from collections import Counter, defaultdict
from pathlib import Path
import pandas as pd

V51, PRE = Path(sys.argv[1]), sys.argv[2]
ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('pre', PRE); pre = importlib.util.module_from_spec(spec); spec.loader.exec_module(pre)
LEX, singular, tokenize = pre.LEX, pre.singular, pre.tokenize

# Must match the benchmark (fitsarap_v5_1_notes.md section 3)
STAPLES = ["water", "ice", "salt", "sea salt", "rock salt", "kosher salt", "black pepper", "black peppercorn", "cooking oil",
           "vegetable oil", "canola oil", "corn oil", "palm oil", "peanut oil", "safflower oil", "cooking spray"]
UNIT_UI = {'lb': 'lbs', 'l': 'L', 'piece': 'pcs', 'clove': 'cloves', 'cup': 'cups', 'slice': 'slices', 'can': 'cans', 'pack': 'packs',
           'thumb': 'thumbs', 'head': 'heads', 'stalk': 'stalks'}

def category(name):
    n = name.lower()
    rules = [('Dessert & Snacks', r'leche flan|turon|bibingka|puto|kutsinta|biko|suman|maja|halo-halo|halo halo|cassava cake|buko pie|ube|polvoron|yema|cake|pastillas|taho|champorado|sapin|palitaw|minatamis|ginataang bilo|bilo-bilo|kakanin|banana cue|camote cue|maruya|turrones|dessert|pudding|jelly|salad'),
             ('Noodles', r'pancit|palabok|sotanghon|miki|bihon|canton|spaghetti|lomi|mami|misua|miswa|noodle|pasta|macaroni|sopas'),
             ('Soup', r'sinigang|tinola|nilaga|bulalo|soup|lugaw|arroz caldo|goto|batchoy|molo|laswa|binakol|pesa|sinampalukan'),
             ('Stew', r'kaldereta|caldereta|mechado|afritada|menudo|pochero|puchero|kare|estofado|dinuguan|bistek|hamonado|stew|igado|kilawin'),
             ('Adobo & Paksiw', r'adobo|paksiw'),
             ('Coconut milk (ginataan)', r'ginataang|ginataan|gata|bicol express|laing|gising|coconut milk'),
             ('Grilled & Fried', r'inihaw|grill|fried|fry|crispy|lechon|tapa|barbecue|bbq|inasal|sisig|tocino|longganisa|torta|chop|empanada|lumpia|kawali|prito|chicharon|nuggets'),
             ('Vegetables', r'ginisang|pinakbet|chop suey|gulay|ampalaya|talong|togue|repolyo|upo|vegetable|kangkong|pechay|monggo|munggo|sitaw|sayote'),
             ('Rice', r'rice|sinangag|kanin|bringhe|paella'),
             ('Seafood', r'shrimp|hipon|pusit|squid|bangus|tilapia|salmon|tuna|fish|sugpo|tahong|talangka|crab|alimango|mussel|clam|halaan|daing|tinapa|galunggong')]
    for c, rx in rules:
        if re.search(rx, n):
            return c
    return 'Other'

def slug(s):
    s = s.lower().replace('&', ' and ')
    s = re.sub(r'[^a-z0-9]+', '-', s).strip('-')
    return s[:52].rstrip('-') or 'recipe'

def fix_text(t):
    return re.sub(r'\bSaut\b', 'Sauté', re.sub(r'\bsaut\b', 'sauté', re.sub(r'\bSauting\b', 'Sautéing', re.sub(r'\bsauting\b', 'sautéing', t)))).strip()

num = lambda x: None if x is None or (isinstance(x, float) and math.isnan(x)) else float(x)

I = pd.read_csv(V51 / 'fitsarap_cleaned_ingredients_v5_1.csv', low_memory=False)
R = pd.read_csv(V51 / 'fitsarap_cleaned_recipes_v5_1.csv', low_memory=False)
ing = I[(I.record_type == 'ingredient') & I.ingredient_name.notna()]

recipes, seen_ids = [], Counter()
for r in R.itertuples():
    rows = ing[ing.source_id == r.source_id]
    items, names = [], set()
    for x in rows.itertuples():
        nm = x.ingredient_name
        if nm in names:      # repeated line in the same recipe (e.g. salt for marinade and sauce): keep the first
            continue
        names.add(nm)
        optional = bool(x.optional) or ('garnish' in str(x.usage_role)) or ('serving' in str(x.usage_role))
        unit = x.unit if isinstance(x.unit, str) else ''
        items.append(dict(name=nm, key=nm, parent=x.parent_ingredient if isinstance(x.parent_ingredient, str) else nm,
                          raw=x.raw_segment, amount=num(x.quantity_min), amountMax=num(x.quantity_max), unit=UNIT_UI.get(unit, unit),
                          optional=optional, staple=nm in STAPLES, toTaste=bool(x.to_taste),
                          prep=x.preparation if isinstance(x.preparation, str) else ''))
    steps = [fix_text(s) for s in str(r.instructions_raw).split(' | ') if s.strip()]
    rid = slug(r.recipe_name); seen_ids[rid] += 1
    if seen_ids[rid] > 1: rid = f'{rid}-{seen_ids[rid]}'
    servings = r.servings_min if isinstance(r.servings_min, float) and not math.isnan(r.servings_min) else 4
    recipes.append(dict(id=rid, sourceId=int(r.source_id), name=r.recipe_name.strip(), category=category(r.recipe_name),
                        prep=int(r.prep_time_min) if r.prep_time_min == r.prep_time_min else 0,
                        cook=int(r.cook_time_min) if r.cook_time_min == r.cook_time_min else 0,
                        servings=max(1, int(round(servings))), split=r.split_v5_1, ingredients=items, steps=steps))

# ---- lexicon for resolving what users type -------------------------------------------------------------
phrases = {}
for toks, (canon, _isfil) in LEX.phrase.items():
    phrases[' '.join(toks)] = canon
families = dict(LEX.parent)
for rc in recipes:                       # dataset names that are not lexicon entries resolve to themselves
    for d in rc['ingredients']:
        key = ' '.join(singular(t) for t in tokenize(d['key']))
        phrases.setdefault(key, d['key'])
        families.setdefault(d['key'], d['parent'])
for p in set(families.values()):         # family names on their own ("noodles", "bouillon") resolve to the family
    key = ' '.join(singular(t) for t in tokenize(p))
    phrases.setdefault(key, p)
    families.setdefault(p, p)
phrases['pepper'] = 'black pepper'       # team-approved rule: bare "pepper" = black pepper
lexicon = dict(version='v5.1', phrases=dict(sorted(phrases.items())), families=dict(sorted(families.items())),
               descriptors=sorted(pre.DESCRIPTORS | {w for w in pre.PREP_WORDS if len(w) > 3}), staples=STAPLES)

# ---- substitutions: alternatives written by recipe authors in the dataset, plus the team's curated list ----
def resolve_text(t):
    toks = [singular(x) for x in tokenize(str(t))]
    m = LEX.match(toks)
    if m: return m[-1][2]
    k = ' '.join(toks)
    return phrases.get(k)
pairs = Counter()
for x in I[(I.record_type == 'ingredient') & I.alternatives.notna()].itertuples():
    for alt in str(x.alternatives).split('|'):
        a = resolve_text(alt)
        if a and a != x.ingredient_name and a not in STAPLES:
            pairs[(x.ingredient_name, a)] += 1
subs = defaultdict(list)
for (k, a), c in pairs.most_common():
    subs[k].append(dict(use=a, source='recipes', count=c,
                        note=f'Recipe authors list {a} as an alternative to {k} in {c} recipe{"s" if c > 1 else ""} of the dataset.'))
CURATED = [('sayote', 'green papaya', 'Green papaya appears in similar Filipino soups and can stand in for sayote.'),
           ('green papaya', 'sayote', 'Sayote is a mild, similar-textured vegetable that can replace green papaya.'),
           ('bell pepper', 'pimiento', 'Pimiento has a similar mild, slightly sweet flavor.'),
           ('calamansi', 'lemon', 'Lemon or lime juice can replace calamansi, though it is slightly less sweet.'),
           ('calamansi juice', 'lemon juice', 'Lemon juice can replace calamansi juice, though it is slightly less sweet.'),
           ('lemon', 'calamansi', 'Calamansi is more floral and a little sweeter; use a bit more.'),
           ('kangkong', 'spinach', 'Spinach cooks the same way and is a common swap in sinigang and tinola.'),
           ('spinach', 'kangkong', 'Kangkong leaves are a close, traditional substitute for spinach.'),
           ('pechay', 'cabbage', 'Cabbage is sturdier, so cook it a little longer.'),
           ('coconut cream', 'coconut milk', 'Coconut milk is thinner; simmer a few minutes longer to thicken.'),
           ('green onion', 'onion', 'Onion is stronger; use less and cook it a little longer.')]
for k, a, note in CURATED:
    if not any(s['use'] == a for s in subs[k]):
        subs[k].append(dict(use=a, source='curated', count=0, note=note))
subs = {k: v[:4] for k, v in sorted(subs.items())}

# ---- autocomplete names (most frequent first) ---------------------------------------------------------------
freq = Counter(d['key'] for rc in recipes for d in rc['ingredients'] if not d['staple'])
names = [n for n, _ in freq.most_common()]

info = dict(dataset='FitSarap v5.1 (1,911 recipes)', model='Hybrid (TF-IDF)',
            weights=dict(tfidf=0.4, coverage=0.6, quantity=0.1, family_credit=0.5),
            benchmark=dict(test_ndcg5='0.938 ± 0.006', runner_up='Hybrid (SBERT-MiniLM) 0.905', report='fitsarap_benchmark_results_v5_1.md'),
            staples=STAPLES)

def dump(obj, rel, indent=None):
    p = ROOT / rel; p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(obj, ensure_ascii=False, indent=indent, separators=None if indent else (',', ':')), encoding='utf-8')
    print(f'{rel}: {p.stat().st_size / 1024:.0f} KB')
def compact(rc):
    # Smaller bundle for the Cloudflare Worker: drop default/duplicate fields (catalog.ts restores them).
    out = dict(rc); out['ingredients'] = []
    for d in rc['ingredients']:
        c = {'name': d['name'], 'raw': d['raw']}
        if d['parent'] != d['name']: c['parent'] = d['parent']
        if d['amount'] is not None: c['amount'] = d['amount']
        if d['amountMax'] is not None and d['amountMax'] != d['amount']: c['amountMax'] = d['amountMax']
        if d['unit']: c['unit'] = d['unit']
        for f in ('optional', 'staple', 'toTaste'):
            if d[f]: c[f] = 1
        if d['prep']: c['prep'] = d['prep']
        out['ingredients'].append(c)
    return out
dump([compact(r) for r in recipes], 'src/lib/server/recommender/data/recipes.json')
dump(lexicon, 'src/lib/server/recommender/data/lexicon.json')
dump(subs, 'src/lib/server/recommender/data/subs.json', 1)
dump(names, 'src/lib/data/ingredient-names.json')
dump(info, 'src/lib/data/model-info.json', 1)
print('recipes', len(recipes), 'phrases', len(phrases), 'subs keys', len(subs), 'recipe-sourced pairs', len(pairs))
print('categories', Counter(r['category'] for r in recipes).most_common())
