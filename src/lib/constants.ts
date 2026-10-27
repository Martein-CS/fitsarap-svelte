export const stock: string[] = ['Chicken', 'Pork', 'Beef', 'Fish', 'Shrimp', 'Squid', 'Tofu', 'Egg', 'Rice', 'Garlic', 'Onion', 'Ginger', 'Tomato', 'Tomato Sauce', 'Potato', 'Carrot', 'Cabbage', 'Bell Pepper', 'Eggplant', 'Sayote', 'Kalabasa', 'Sitaw', 'Okra', 'Ampalaya', 'Malunggay', 'Kangkong', 'Pechay', 'Radish', 'Mung Beans', 'Mung Bean Sprouts', 'Soy Sauce', 'Vinegar', 'Fish Sauce', 'Oyster Sauce', 'Bagoong', 'Coconut Milk', 'Peanut Butter', 'Liver Spread', 'Hotdog', 'Bay Leaf', 'Calamansi', 'Lemon', 'Chili', 'Green Peas', 'Cornstarch', 'Flour', 'Butter'];
export const units: string[] = ['g', 'kg', 'lbs', 'oz', 'ml', 'L', 'pcs', 'cloves', 'cups', 'tbsp', 'tsp', 'bunch', 'pinch', 'slices', 'cans', 'packs', 'thumbs', 'heads', 'stalks'];
export const exclusions: string[] = ['Peanuts', 'Shellfish', 'Fish', 'Egg', 'Soy', 'Dairy', 'Wheat', 'Chicken', 'Pork'];
// Words searched for in each recipe's ingredient lines when an exclusion is chosen.
export const EXCLUDE_TERMS: Record<string, string[]> = {
  Peanuts: ['peanut'], Shellfish: ['shrimp', 'prawn', 'crab', 'mussel', 'squid', 'clam', 'tahong', 'pusit', 'hipon', 'alamang', 'bagoong'],
  Fish: ['fish', 'bangus', 'milkfish', 'tilapia', 'tuna', 'salmon', 'mackerel', 'anchov', 'dilis', 'patis'], Egg: ['egg'],
  Soy: ['soy', 'tofu', 'toyo'], Dairy: ['milk', 'cheese', 'butter', 'cream'], Wheat: ['flour', 'noodle', 'bread', 'pasta', 'bihon', 'sotanghon', 'miki', 'macaroni'],
  Chicken: ['chicken'], Pork: ['pork', 'bacon', 'ham ', 'chicharon', 'lechon', 'pata ', 'liempo']
};
