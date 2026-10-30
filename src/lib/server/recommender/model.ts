// FitSarap recommendation model: Hybrid (TF-IDF).
//
// Selected by the v5.1 benchmark (fitsarap_benchmark_results_v5_1.md): test NDCG@5 0.938 ± 0.006, better than
// Hybrid (SBERT-MiniLM) 0.905, Coverage 0.865, TF-IDF 0.845, Word2Vec 0.713, SBERT-MiniLM 0.698, SBERT-MPNet 0.635.
//
//   score = 0.4 × TF-IDF similarity (min–max scaled over the catalog)
//         + 0.6 × ingredient coverage (exact ingredient = 1, same family only = 0.5)
//         + 0.1 × quantity feasibility (have ÷ need, comparable units only)
//
// This file mirrors the benchmark notebook exactly (scripts/parity-test verifies it). It has no SvelteKit imports
// so it can also run in Node for that test.
import {sufficiency} from '../../domain/units';

export interface ModelIngredient { key: string; parent: string; amount: number | null; unit: string; optional: boolean; staple: boolean }
export interface ModelRecipe { ingredients: ModelIngredient[] }
export interface PantryInput { key: string; parent: string; amount: number | null; unit: string | null }
export const WEIGHTS = {tfidf: 0.4, coverage: 0.6, quantity: 0.1, family: 0.5};

export interface ScoreParts { score: number; tfidf: number; coverage: number; exact: number; family: number; quantity: number; required: number; distinct: string[] }

export class HybridModel {
  private n: number;
  private idf = new Map<string, number>();
  private postings = new Map<string, number[]>();   // token -> recipes containing it (for the TF-IDF dot product)
  private norm: Float64Array;
  private reqKeys: Set<string>[] = [];
  private reqParents: Set<string>[] = [];
  private reqQty: {key: string; amount: number | null; unit: string}[][] = [];
  private byReqKey = new Map<string, number[]>();
  private byReqParent = new Map<string, number[]>();

  /** @param fitIdf which recipes the IDF weights are learned from (the benchmark used the training split; the website uses all). */
  constructor(private recipes: ModelRecipe[], fitIdf: (i: number) => boolean = () => true) {
    this.n = recipes.length;
    this.norm = new Float64Array(this.n);
    const docs = recipes.map((r) => {
      const nonStaple = r.ingredients.filter((x) => !x.staple).map((x) => x.key);
      return [...new Set(nonStaple.length ? nonStaple : r.ingredients.map((x) => x.key))];
    });
    // Smooth IDF exactly as scikit-learn: ln((1 + n) / (1 + df)) + 1, fitted on the chosen recipes.
    const df = new Map<string, number>();
    let nFit = 0;
    docs.forEach((d, i) => { if (fitIdf(i)) { nFit++; for (const t of d) df.set(t, (df.get(t) ?? 0) + 1); } });
    for (const [t, c] of df) this.idf.set(t, Math.log((1 + nFit) / (1 + c)) + 1);
    docs.forEach((d, i) => {
      let s = 0;
      for (const t of d) {
        const w = this.idf.get(t);
        if (w === undefined) continue;            // unseen in the IDF fit -> ignored, as in scikit-learn
        s += w * w;
        const p = this.postings.get(t); if (p) p.push(i); else this.postings.set(t, [i]);
      }
      this.norm[i] = Math.sqrt(s) || 1;
    });
    recipes.forEach((r, i) => {
      const req = r.ingredients.filter((x) => !x.optional && !x.staple);
      this.reqKeys.push(new Set(req.map((x) => x.key)));
      this.reqParents.push(new Set(req.map((x) => x.parent)));
      this.reqQty.push(req.filter((x) => x.amount != null).map((x) => ({key: x.key, amount: x.amount, unit: x.unit})));
      for (const k of this.reqKeys[i]) { const l = this.byReqKey.get(k); if (l) l.push(i); else this.byReqKey.set(k, [i]); }
      for (const p of this.reqParents[i]) { const l = this.byReqParent.get(p); if (l) l.push(i); else this.byReqParent.set(p, [i]); }
    });
  }

  idfOf(token: string) { return this.idf.get(token) ?? 0; }

  /** Scores every recipe. Pantry items should already exclude staples (they are always assumed available). */
  scoreAll(pantry: PantryInput[]): {scores: Float64Array; candidates: number[]; parts: (i: number) => ScoreParts} {
    const keys = new Set(pantry.map((p) => p.key));
    const parents = new Set(pantry.map((p) => p.parent));
    // TF-IDF query vector (binary term frequency, l2-normalised)
    const qTokens = [...keys].filter((t) => this.idf.has(t));
    const qNorm = Math.sqrt(qTokens.reduce((a, t) => a + this.idf.get(t)! ** 2, 0)) || 1;
    const sim = new Float64Array(this.n);
    for (const t of qTokens) {
      const w = this.idf.get(t)! ** 2 / qNorm;
      for (const i of this.postings.get(t)!) sim[i] += w / this.norm[i];
    }
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < this.n; i++) { if (sim[i] < lo) lo = sim[i]; if (sim[i] > hi) hi = sim[i]; }
    const scale = (v: number) => (v - lo) / (hi - lo + 1e-12);

    // Only recipes sharing at least one required ingredient (exact or family) are candidates.
    const cand = new Set<number>();
    for (const k of keys) for (const i of this.byReqKey.get(k) ?? []) cand.add(i);
    for (const p of parents) for (const i of this.byReqParent.get(p) ?? []) cand.add(i);
    const have = new Map(pantry.map((p) => [p.key, p]));

    const parts = (i: number): ScoreParts => {
      const req = this.reqKeys[i], nreq = Math.max(1, req.size);
      let exact = 0; for (const k of req) if (keys.has(k)) exact++;
      let fam = 0; for (const p of this.reqParents[i]) if (parents.has(p)) fam++;
      fam = Math.min(Math.max(exact, fam), nreq);
      const cs = exact / nreq, cp = fam / nreq;
      const coverage = cs + WEIGHTS.family * (cp - cs);
      const vals: number[] = [];
      for (const q of this.reqQty[i]) {
        const h = have.get(q.key);
        if (!h) continue;
        const v = sufficiency(h.amount, h.unit, q.amount, q.unit);
        if (v !== null) vals.push(v);
      }
      const quantity = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 1;
      const tfidf = scale(sim[i]);
      const distinct = [...req].filter((k) => keys.has(k)).sort((a, b) => this.idfOf(b) - this.idfOf(a)).slice(0, 3);
      return {score: WEIGHTS.tfidf * tfidf + WEIGHTS.coverage * coverage + WEIGHTS.quantity * quantity, tfidf, coverage,
              exact, family: fam - exact, quantity, required: req.size, distinct};
    };
    // Score every recipe once and keep the parts, so callers asking for parts(i) again pay nothing.
    const memo: ScoreParts[] = new Array(this.n);
    const scores = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) scores[i] = (memo[i] = parts(i)).score;
    return {scores, candidates: [...cand], parts: (i) => memo[i]};
  }
}
