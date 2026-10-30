// Stock ingredients shown as a browsable list on the Find page, grouped like a Filipino kitchen or palengke.
export const STOCK: Record<string, string[]> = {
  'Meat & poultry': ['Chicken', 'Chicken Thigh', 'Chicken Wings', 'Chicken Liver', 'Pork', 'Pork Belly', 'Ground Pork', 'Pork Chop', 'Pork Ribs', 'Beef', 'Ground Beef', 'Corned Beef', 'Longganisa', 'Tocino', 'Hotdog', 'Bacon', 'Luncheon Meat', 'Chorizo'],
  'Fish & seafood': ['Fish', 'Bangus', 'Tilapia', 'Galunggong', 'Shrimp', 'Squid', 'Mussels', 'Crab', 'Clams', 'Canned Tuna', 'Sardines', 'Dried Fish', 'Dilis', 'Fish Balls'],
  'Eggs, tofu & beans': ['Egg', 'Salted Egg', 'Quail Egg', 'Tofu', 'Mung Beans', 'Green Peas', 'Chickpeas', 'Peanuts', 'Red Beans'],
  'Vegetables': ['Garlic', 'Onion', 'Red Onion', 'Tomato', 'Ginger', 'Potato', 'Carrot', 'Cabbage', 'Pechay', 'Bok Choy', 'Kangkong', 'Malunggay', 'Sitaw', 'Okra', 'Eggplant', 'Ampalaya', 'Kalabasa', 'Sayote', 'Radish', 'Bell Pepper', 'Chili', 'Siling Haba', 'Green Papaya', 'Mung Bean Sprouts', 'Corn', 'Gabi', 'Banana Blossom', 'Lemongrass', 'Spring Onion', 'Mushroom', 'Upo', 'Taro Leaves'],
  'Rice, noodles & bread': ['Rice', 'Glutinous Rice', 'Bihon', 'Sotanghon', 'Pancit Canton', 'Miki', 'Misua', 'Spaghetti', 'Macaroni', 'Bread', 'Flour', 'Cornstarch', 'Lumpia Wrapper'],
  'Sauces & seasonings': ['Soy Sauce', 'Vinegar', 'Fish Sauce', 'Oyster Sauce', 'Bagoong', 'Tomato Sauce', 'Tomato Paste', 'Banana Ketchup', 'Liver Spread', 'Sinigang Mix', 'Tamarind', 'Calamansi', 'Lemon', 'Bay Leaf', 'Sugar', 'Brown Sugar', 'MSG', 'Bouillon Cube', 'Annatto', 'Paprika', 'Curry Powder', 'Chili Flakes'],
  'Dairy & coconut': ['Coconut Milk', 'Coconut Cream', 'Butter', 'Evaporated Milk', 'Condensed Milk', 'Fresh Milk', 'Cheese', 'All-Purpose Cream', 'Mayonnaise', 'Peanut Butter'],
  'Fruits': ['Saba Banana', 'Ripe Mango', 'Green Mango', 'Pineapple', 'Jackfruit', 'Young Coconut', 'Ube', 'Raisins']
};
export const stock: string[] = Object.values(STOCK).flat();
export const units: string[] = ['g', 'kg', 'lbs', 'oz', 'ml', 'L', 'pcs', 'cloves', 'cups', 'tbsp', 'tsp', 'bunch', 'pinch', 'slices', 'cans', 'packs', 'thumbs', 'heads', 'stalks'];
export const exclusions: string[] = ['Peanuts', 'Shellfish', 'Fish', 'Egg', 'Soy', 'Dairy', 'Wheat', 'Chicken', 'Pork'];
