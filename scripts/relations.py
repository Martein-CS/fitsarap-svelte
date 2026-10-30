"""Learns which ingredients are cooked together in Filipino recipes (ingredient co-occurrence model).

    python3 scripts/relations.py            # reads src/lib/server/recommender/data/recipes.json

For every pair of required ingredients (not optional, not a pantry staple) it computes normalised pointwise mutual
information over the 1,911 recipes:

    NPMI(a, b) = ln( P(a,b) / (P(a) P(b)) ) / -ln P(a,b)        range -1 .. 1, 0 = independent

High NPMI means the two appear together far more often than chance (e.g. tamarind with kangkong in sinigang).
Pairs seen in fewer than MIN_CO recipes, and ingredients in fewer than MIN_DF recipes, are dropped so rare noise does
not dominate. The website uses the result for "often cooked with your ingredients" suggestions on the Find page.
It does not change the ranking model.
"""
import json
import math
import sys
from collections import Counter
from itertools import combinations
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'src/lib/server/recommender/data/recipes.json'
OUT = ROOT / 'src/lib/server/recommender/data/relations.json'
MIN_DF, MIN_CO, TOP = 5, 3, 12


def main() -> None:
    recipes = json.loads(SRC.read_text(encoding='utf-8'))
    docs = []
    for r in recipes:
        keys = {i['name'] for i in r['ingredients'] if not i.get('optional') and not i.get('staple')}
        if keys:
            docs.append(keys)
    n = len(docs)
    df = Counter(k for d in docs for k in d)
    keep = {k for k, c in df.items() if c >= MIN_DF}
    co = Counter()
    for d in docs:
        for a, b in combinations(sorted(d & keep), 2):
            co[(a, b)] += 1

    partners: dict[str, list[tuple[str, float, int]]] = {}
    for (a, b), c in co.items():
        if c < MIN_CO:
            continue
        pab = c / n
        npmi = math.log(pab / ((df[a] / n) * (df[b] / n))) / -math.log(pab)
        if npmi <= 0:
            continue
        partners.setdefault(a, []).append((b, npmi, c))
        partners.setdefault(b, []).append((a, npmi, c))

    out = {k: [[p, round(s, 3), c] for p, s, c in sorted(v, key=lambda x: (-x[1], -x[2]))[:TOP]]
           for k, v in sorted(partners.items())}
    OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'recipes {n} | ingredients kept {len(keep)} | with partners {len(out)} | {OUT.stat().st_size / 1024:.0f} KB')
    for k in ['tamarind', 'kangkong', 'coconut milk', 'chicken', 'bagoong', 'calamansi']:
        if k in out:
            print(f'  {k}: ' + ', '.join(f'{p} ({s})' for p, s, _ in out[k][:6]))


if __name__ == '__main__':
    sys.exit(main())
