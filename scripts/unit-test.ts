// Unit tests for the parts the proposal depends on: unit conversion, name standardization, allergy exclusions,
// quantity checks, the recommendation API contract and input validation.
//   npm test
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toBase, sufficiency, ratio} from '../src/lib/domain/units';
import {resolve} from '../src/lib/server/recommender/lexicon';
import {excluder, flagsFor} from '../src/lib/server/recommender/exclusions';
import {query, summaries, recipeDetail, related, getRecipe} from '../src/lib/server/recommender/engine';
import {evaluate, pantryLookup} from '../src/lib/domain/evaluate';
import {cleanItem, cleanPantry} from '../src/lib/server/services/validate';
import {LRU} from '../src/lib/server/infra/cache';
import {mealsFor} from '../src/lib/domain/meals';
import {dishFor} from '../src/lib/domain/dishes';
import {dishPhoto, filePageFor} from '../src/lib/server/services/photos';

const P = (name: string, amount: number | null = null, unit: string | null = null) => ({name, amount, unit});

test('units convert within mass and within volume, never across', () => {
  assert.deepEqual(toBase(1, 'kg'), [1000, 'mass']);
  assert.equal(Math.round(toBase(2, 'tbsp')![0]), 30);
  assert.equal(sufficiency(500, 'g', 1, 'kg'), 0.5);
  assert.equal(sufficiency(2, 'cups', 250, 'ml'), 1);
  assert.equal(ratio(1, 'cups', 100, 'g'), null);             // volume vs mass: not comparable
  assert.equal(ratio(3, 'cloves', 2, 'cloves'), 1.5);
});

test('names are standardized: Filipino names, plurals, typos, descriptors', () => {
  for (const [typed, key] of [['manok', 'chicken'], ['bawang', 'garlic'], ['Chicken thighs', 'chicken thigh'], ['galic', 'garlic'],
    ['gata', 'coconut milk'], ['kakang gata', 'coconut cream'], ['toyo', 'soy sauce'], ['pepper', 'black pepper'], ['bok choy', 'pechay']]) {
    assert.equal(resolve(typed).key, key, typed);
  }
  assert.equal(resolve('liempo').parent, 'pork');
  assert.equal(resolve('qwertyuiop').known, false);
});

test('allergy exclusions match whole words and hidden sources', () => {
  const egg = excluder(['Egg'])!, dairy = excluder(['Dairy'])!, wheat = excluder(['Wheat'])!, fish = excluder(['Fish'])!;
  assert.equal(egg('2 eggplants eggplant'), false);
  assert.equal(egg('3 eggs egg'), true);
  assert.equal(dairy('1 milkfish milkfish'), false);
  assert.equal(dairy('2 cups coconut milk coconut milk'), false);
  assert.equal(dairy('2 tbsp peanut butter peanut butter'), false);
  assert.equal(dairy('1/2 cup evaporated milk evaporated milk'), true);
  assert.equal(wheat('1 cup rice flour rice flour'), false);
  assert.equal(wheat('1/4 cup soy sauce soy sauce'), true);
  assert.equal(fish('2 tbsp patis fish sauce'), true);
  assert.deepEqual(flagsFor([{name: 'shrimp paste', raw: '1 tbsp bagoong alamang'}]).Shellfish, ['shrimp paste']);
});

test('quantity check finds how many servings the amounts allow', () => {
  const r = getRecipe('chicken-adobo-recipe')!;
  const pantry = [{id: '1', name: 'soy sauce', key: 'soy sauce', parent: 'soy sauce', amount: 30, unit: 'ml', approximate: false}];
  const e = evaluate(r, pantryLookup(pantry));
  assert.equal(e.rows.find((x) => x.key === 'soy sauce')!.status, 'short');
  assert.ok(e.scale && e.scale.servings < r.servings && e.scale.limiting === 'soy sauce');
});

test('recommendations: partial matches, filters, paging and exclusions', () => {
  const pantry = [P('chicken', 1, 'kg'), P('garlic', 6, 'cloves'), P('soy sauce', 120, 'ml'), P('vinegar', 120, 'ml'), P('bay leaf', 3, 'pcs')];
  const all = query({pantry, exclusions: [], perPage: 10});
  assert.ok(all.found > 100 && all.items.length === 10);
  assert.ok(all.items[0].score >= all.items[9].score, 'sorted by model score');
  assert.ok(all.items.some((m) => !m.ready), 'partial matches are included');
  const ready = query({pantry, exclusions: [], filter: 'ready', perPage: 100});
  assert.ok(ready.items.every((m) => m.ready));
  const capped = query({pantry, exclusions: [], perPage: 9999, page: 9999, sort: 'nonsense' as never});
  assert.equal(capped.items.length <= 100, true);
  assert.equal(capped.page, capped.pages);
  const noChicken = query({pantry, exclusions: ['Chicken'], perPage: 100});
  assert.ok(noChicken.items.every((m) => !/chicken/i.test(m.name)));
  assert.equal(query({pantry: [], exclusions: []}).found, 0);
});

test('summaries skip unknown ids; recipe detail and related work', () => {
  const s = summaries(['chicken-adobo-recipe', 'no-such-recipe'], [P('chicken')]);
  assert.equal(s.length, 1);
  assert.equal(recipeDetail('no-such-recipe'), null);
  assert.ok(recipeDetail('chicken-adobo-recipe')!.recipe.steps.length > 0);
  const rel = related([P('sampalok'), P('kangkong')], 5).map((r) => r.name);
  assert.ok(rel.includes('labanos') || rel.includes('gabi'), rel.join(','));
});

test('input validation rejects bad pantry items', () => {
  assert.deepEqual(cleanItem({name: ' Manok ', amount: '500', unit: 'g'}), {name: 'Manok', amount: 500, unit: 'g', approximate: false});
  assert.equal(cleanItem({name: '', amount: 1}), null);
  assert.equal(cleanItem({name: 'x', amount: -3, unit: 'g'}), null);
  assert.equal(cleanItem({name: 'x', amount: 2, unit: 'bogus'})!.amount, null);   // unknown unit: amount not compared
  assert.equal(cleanPantry([]), null);
  assert.equal(cleanPantry(Array.from({length: 41}, () => ({name: 'egg'}))), null);
});

test('LRU cache evicts the oldest entry', () => {
  const c = new LRU<number>(2);
  c.set('a', 1); c.set('b', 2); c.get('a'); c.set('c', 3);
  assert.equal(c.get('b'), undefined);
  assert.equal(c.get('a'), 1);
});

test('meal types are estimated from the dish', () => {
  assert.deepEqual(mealsFor('Tapsilog', 'Grilled & Fried'), ['Breakfast', 'Lunch', 'Dinner']);
  assert.deepEqual(mealsFor('Champorado', 'Other'), ['Breakfast', 'Merienda']);
  assert.deepEqual(mealsFor('Leche Flan', 'Dessert & Snacks'), ['Merienda', 'Dessert']);
  assert.deepEqual(mealsFor('Sinigang na Baboy', 'Soup'), ['Lunch', 'Dinner']);
  assert.ok(mealsFor('Pancit Canton', 'Noodles').includes('Merienda'));
});

test('dish families for example photos', () => {
  assert.equal(dishFor('Adobong Manok sa Gata'), 'adobo');
  assert.equal(dishFor('Lechon Kawali Recipe'), 'lechon-kawali');
  assert.equal(dishFor('Pancit Bihon Guisado'), 'pancit');
  assert.equal(dishFor('Paprika Chicken Drumsticks Recipe'), null);
});

test('example photo lookup reads the Wikipedia summary and links the Commons page', async () => {
  assert.equal(filePageFor('https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Chicken_adobo.jpg/320px-Chicken_adobo.jpg'),
    'https://commons.wikimedia.org/wiki/File:Chicken_adobo.jpg');
  const fake = async (url: string) => {
    assert.ok(url.endsWith('/page/summary/Sinigang'));
    return new Response(JSON.stringify({thumbnail: {source: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/12/Sinigang.jpg/320px-Sinigang.jpg'},
      originalimage: {source: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Sinigang.jpg'}}), {status: 200});
  };
  const p = await dishPhoto('sinigang', fake);
  assert.equal(p?.filePage, 'https://commons.wikimedia.org/wiki/File:Sinigang.jpg');
  assert.equal(await dishPhoto('no-such-dish', fake), null);
  assert.equal(await dishPhoto('tinola', async () => { throw new Error('offline'); }), null);   // falls back quietly
});

test('meal and cooking-time filters', () => {
  const pantry = [P('egg', 4, 'pcs'), P('rice', 2, 'cups'), P('garlic'), P('longganisa')];
  const bf = query({pantry, exclusions: [], meal: 'Breakfast', perPage: 100});
  assert.ok(bf.found > 0 && bf.items.every((m) => m.meals.includes('Breakfast')));
  const quick = query({pantry, exclusions: [], maxTime: 30, perPage: 100});
  assert.ok(quick.found > 0 && quick.items.every((m) => m.total > 0 && m.total <= 30));
});
