// Checks that the website's TypeScript model (src/lib/server/recommender/model.ts) reproduces the benchmarked Python model.
//   npm run parity
// Reference scores come from the benchmark code (Hybrid TF-IDF, IDF fitted on the training split) for 80 test pantries.
import {readFileSync} from 'node:fs';
import {HybridModel} from '../src/lib/server/recommender/model';
import {expandRecipes} from '../src/lib/server/recommender/expand';

const recipes = expandRecipes(JSON.parse(readFileSync('src/lib/server/recommender/data/recipes.json', 'utf8')));
const ref = JSON.parse(readFileSync('scripts/parity-cases.json', 'utf8'));
const pos = new Map<number, number>(recipes.map((r, i) => [r.sourceId, i]));
const order: number[] = ref.ids.map((sid: number) => pos.get(sid)!);         // benchmark index -> website index
const trainSet = new Set(order.filter((_, j) => ref.train[j]));
const model = new HybridModel(recipes, (i) => trainSet.has(i));

let worst = 0, top5Same = 0, top1Same = 0;
for (const c of ref.cases) {
  const {scores} = model.scoreAll(c.items);
  const exp: number[] = c.scores, got = order.map((i) => scores[i]);
  for (let j = 0; j < exp.length; j++) worst = Math.max(worst, Math.abs(exp[j] - got[j]));
  const top = (v: number[]) => v.map((x, j) => [x, j]).sort((a, b) => b[0] - a[0] || a[1] - b[1]).slice(0, 5).map((x) => x[1]).join(',');
  if (top(exp) === top(got)) top5Same++;
  if (top(exp).split(',')[0] === top(got).split(',')[0]) top1Same++;
}
console.log(`cases ${ref.cases.length} | max |score difference| ${worst.toExponential(2)} | identical top-5 ${top5Same}/${ref.cases.length} | identical top-1 ${top1Same}/${ref.cases.length}`);
if (worst > 1e-6) { console.error('PARITY FAILED'); process.exit(1); }
console.log('PARITY OK: website model = benchmarked model');
