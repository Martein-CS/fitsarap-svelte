// Turns whatever a person types ("manok", "Chicken thighs", "bawang", "fresh kangkong") into the canonical ingredient
// names used by the dataset, with the same lexicon that cleaned the dataset (v5.1, 3,000+ English and Filipino phrases).
import lex from './data/lexicon.json';

const phrases = lex.phrases as Record<string, string>;
const families = lex.families as Record<string, string>;
const DESCRIPTORS = new Set(lex.descriptors as string[]);
export const STAPLES = new Set(lex.staples as string[]);
const MAXLEN = Math.max(...Object.keys(phrases).map((k) => k.split(' ').length));

const SPECIAL: Record<string, string> = {chilies: 'chili', chillies: 'chili', chilis: 'chili', leaves: 'leaf', potatoes: 'potato', tomatoes: 'tomato',
  mangoes: 'mango', anchovies: 'anchovy', radishes: 'radish', bunches: 'bunch', peas: 'peas', greens: 'greens', cloves: 'clove', eggs: 'egg', noodles: 'noodle'};
const KEEP = new Set(['patis', 'kamias', 'gisantes', 'molasses', 'asparagus', 'lemongrass', 'swiss', 'hummus', 'chives', 'oats', 'tausi', 'sardinas', 'mais', 'pasas']);
export function singular(w: string): string {
  if (SPECIAL[w]) return SPECIAL[w];
  if (KEEP.has(w) || w.length <= 3) return w;
  if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
  if (w.endsWith('oes')) return w.slice(0, -2);
  if (/(ches|shes|xes|sses|zes)$/.test(w)) return w.slice(0, -2);
  if (w.endsWith('s') && !/(ss|us|is|as|os|ys)$/.test(w)) return w.slice(0, -1);
  return w;
}
const tokens = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/'s\b/g, 's')
  .replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).map(singular);

function lev(a: string, b: string): number {
  const d = Array.from({length: a.length + 1}, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

export interface Resolved { key: string; parent: string; known: boolean }
const cache = new Map<string, Resolved>();

export function resolve(input: string): Resolved {
  const hit = cache.get(input);
  if (hit) return hit;
  const all = tokens(input);
  const kept = all.filter((t) => !DESCRIPTORS.has(t));
  let key: string | undefined;
  // 1. whole phrase, with and without descriptor words ("fresh garlic" -> garlic, "ground pork" stays ground pork)
  key = phrases[all.join(' ')] ?? phrases[kept.join(' ')];
  // 2. longest known phrase inside the input ("pork belly liempo cut" -> pork belly)
  if (!key) {
    outer: for (const src of [all, kept]) for (let L = Math.min(MAXLEN, src.length); L > 0; L--)
      for (let i = 0; i + L <= src.length; i++) { const k = phrases[src.slice(i, i + L).join(' ')]; if (k) { key = k; break outer; } }
  }
  // 3. small typo ("galic" -> garlic, "kangkung" -> kangkong)
  if (!key && kept.length) {
    const q = kept.join(' '), max = q.length >= 8 ? 2 : q.length >= 5 ? 1 : 0;
    if (max) {
      let best: [number, string] | null = null;
      for (const p in phrases) {
        if (p[0] !== q[0] || Math.abs(p.length - q.length) > max) continue;
        const dd = lev(p, q);
        if (dd <= max && (!best || dd < best[0])) best = [dd, phrases[p]];
      }
      if (best) key = best[1];
    }
  }
  const out: Resolved = key ? {key, parent: families[key] ?? key, known: true} : {key: kept.join(' ') || input.toLowerCase().trim(), parent: kept.join(' '), known: false};
  if (cache.size > 5000) cache.clear();
  cache.set(input, out);
  return out;
}
