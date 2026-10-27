import type {Evaluation, Ingredient, PantryItem, Recipe, Row, Status} from './types';
import {normUnit, same} from './match';

type IngredientInput = [name: string, amount: number, unit: string, optional?: boolean];
const make = (id: string, name: string, category: string, prep: number, cook: number, servings: number, description: string, ingredients: IngredientInput[], steps: string[]): Recipe => ({
  id, name, category, prep, cook, servings, description,
  ingredients: ingredients.map(([n, amount, unit, optional = false]) => ({name: n, amount, unit, optional})),
  steps, image: `/images/recipes/${id}.jpg`
});

// Demonstration catalog. Replace with normalized recipe data later.
export const recipes: Recipe[] = [
make('adobo','Chicken Adobo','Lunch',10,35,4,'Savory chicken simmered in soy sauce, vinegar, and garlic.',[['Chicken',500,'g'],['Soy Sauce',45,'ml'],['Vinegar',45,'ml'],['Garlic',4,'cloves'],['Bay Leaf',2,'pcs',true]],['Prepare chicken and aromatics.','Combine soy sauce, vinegar, garlic and chicken.','Simmer until cooked through and tender.','Reduce sauce to preferred consistency.','Serve warm.']),
make('tinola','Chicken Tinola','Dinner',15,35,4,'Comforting chicken soup with ginger and vegetables.',[['Chicken',500,'g'],['Ginger',30,'g'],['Garlic',3,'cloves'],['Onion',1,'pcs'],['Sayote',1,'pcs'],['Malunggay',1,'cups'],['Fish Sauce',20,'ml',true]],['Prepare ingredients.','Sauté ginger, garlic, and onion.','Add chicken and cook briefly.','Add water and simmer until chicken is cooked.','Add sayote and malunggay; season to taste.']),
make('afritada','Chicken Afritada','Lunch',15,40,4,'Filipino tomato-braised chicken with vegetables.',[['Chicken',500,'g'],['Garlic',3,'cloves'],['Onion',1,'pcs'],['Tomato Sauce',200,'ml'],['Potato',2,'pcs'],['Carrot',1,'pcs'],['Bell Pepper',1,'pcs',true]],['Prepare and chop vegetables.','Sauté garlic and onion.','Brown chicken lightly.','Add tomato sauce, potatoes, and carrots.','Simmer until chicken and vegetables are cooked.']),
make('torta','Tortang Talong','Breakfast',10,15,2,'Grilled eggplant omelet, simple and filling.',[['Eggplant',2,'pcs'],['Egg',2,'pcs'],['Salt',1,'tsp',true],['Cooking Oil',2,'tbsp',true]],['Roast eggplants until soft.','Peel and flatten carefully.','Beat eggs.','Dip eggplants in beaten eggs.','Pan-fry until fully cooked.']),
make('caldo','Arroz Caldo','Breakfast',15,40,4,'Warm rice porridge with chicken and ginger.',[['Rice',250,'g'],['Chicken',350,'g'],['Ginger',25,'g'],['Garlic',5,'cloves'],['Onion',1,'pcs'],['Egg',2,'pcs',true]],['Wash rice.','Sauté aromatics.','Add chicken and rice.','Add water and simmer until tender.','Season and serve.']),
make('togue','Ginisang Togue','Lunch',10,15,3,'Quick sauté of mung bean sprouts and vegetables.',[['Mung Bean Sprouts',300,'g'],['Garlic',3,'cloves'],['Onion',1,'pcs'],['Carrot',1,'pcs'],['Tofu',150,'g',true],['Soy Sauce',20,'ml',true]],['Wash vegetables.','Sauté garlic and onion.','Add carrots.','Add sprouts and optional tofu.','Season and serve.']),
make('sinangag','Sinangag','Breakfast',5,10,2,'Classic Filipino garlic fried rice.',[['Rice',2,'cups'],['Garlic',5,'cloves'],['Cooking Oil',2,'tbsp'],['Salt',1,'tsp',true]],['Use cooked, cooled rice.','Heat oil and fry minced garlic.','Add rice and toss until hot.','Season lightly and serve.']),
make('sinigang','Pork Sinigang','Dinner',20,60,5,'Tangy Filipino soup with pork and vegetables.',[['Pork',600,'g'],['Tomato',2,'pcs'],['Onion',1,'pcs'],['Kangkong',1,'bunch'],['Radish',1,'pcs'],['Tamarind Mix',1,'packs']],['Simmer pork until tender.','Add onions and tomatoes.','Add tamarind souring agent.','Add vegetables in order of cooking time.','Season and serve hot.'])
];
export const stock: string[] = ['Chicken','Pork','Beef','Fish','Shrimp','Tofu','Egg','Rice','Garlic','Onion','Ginger','Tomato','Tomato Sauce','Potato','Carrot','Bell Pepper','Eggplant','Sayote','Malunggay','Kangkong','Radish','Ampalaya','Mung Bean Sprouts','Soy Sauce','Vinegar','Fish Sauce','Cooking Oil','Salt','Black Pepper','Sugar','Bay Leaf','Tamarind Mix','MSG','Calamansi','Lemon','Coconut Milk','Green Beans','Chili','Cornstarch'];
export const units: string[] = ['g','kg','ml','L','pcs','cloves','cups','tbsp','tsp','bunch','pinch','slices','cans','packs'];
export const exclusions: string[] = ['Peanuts','Shellfish','Fish','Egg','Soy','Dairy','Wheat','Chicken','Pork'];

const conv: Record<string, [string, number]> = { kg: ['mass', 1000], g: ['mass', 1], L: ['liquid', 1000], ml: ['liquid', 1], tbsp: ['liquid', 15], tsp: ['liquid', 5], cups: ['liquid', 240] };

export function compareAmount(have: PantryItem, need: Ingredient): Status {
  if (have.amount == null) return 'unknown';
  const hu = normUnit(have.unit), nu = normUnit(need.unit);
  if (hu === nu) return have.amount >= need.amount ? 'enough' : 'short';
  const a = conv[hu], b = conv[nu];
  if (a && b && a[0] === b[0]) return have.amount * a[1] >= need.amount * b[1] ? 'enough' : 'short';
  return 'unknown';
}

export function evaluate(recipe: Recipe, pantry: PantryItem[]): {recipe: Recipe; rows: Row[]; ready: boolean} {
  const rows: Row[] = recipe.ingredients.map((ing) => {
    const have = pantry.find((p) => same(p.name, ing.name));
    return {...ing, have, status: have ? compareAmount(have, ing) : 'missing'};
  });
  const ready = rows.filter((r) => !r.optional).every((r) => r.status === 'enough');
  return {recipe, rows, ready};
}
