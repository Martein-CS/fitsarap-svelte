# FitSarap (SvelteKit + TypeScript + Cloudflare D1)

Filipino recipe recommendations from the ingredients you have. One full-stack SvelteKit app: pages, forms and database access all live in `src/routes`, deployed to Cloudflare Workers with a D1 database.

Matching is **ingredient-coverage scoring, not a trained ML model**. Percentages are not model confidence.

## Using the Filipino recipes dataset (1,914 recipes)

The project ships with 8 sample recipes so it runs immediately. To load the real dataset ([joackimagno/FILIPINO_RECIPES_2K_V2](https://huggingface.co/datasets/joackimagno/FILIPINO_RECIPES_2K_V2)):

```
npm run data        # downloads every row and writes src/lib/server/recipes.json
npm run dev
```

`npm run data` parses each ingredient line ("3 lbs. pork hocks cleaned") into a name, amount and unit, picks a base ingredient used for matching ("pork"), flags optional items (brand seasonings, "optional") and pantry staples (water, salt, pepper, oil, sugar), assigns a rough category, converts times and servings to numbers, and fixes the missing "é" in "Sauté". When it finishes it prints the ingredient lines it could not recognise; add common ones to the `VOCAB` list at the top of `scripts/build-recipes.mjs` and run it again.
If the download is blocked, save the dataset rows as a JSON array and run `node scripts/build-recipes.mjs --file rows.json`. `npm run data:seed` restores the 8 sample recipes.

**Recipes with no matching ingredient never appear.** A recipe is listed only if at least one of its required ingredients (not optional, not a staple) matches something in the person's pantry. Matching handles case, plurals, Filipino names (manok, bawang), extra words ("chicken breast") and small typos.

**License:** the dataset page has no license or source information (its README is empty), and many recipes read like they were copied from a recipe website. Fine for a class project; ask the owner or check the source before publishing the data publicly or commercially.

**Cloudflare limits:** the Worker has to hold the whole catalog and score it per request. On the free plan this may hit the CPU time or bundle size limits; if `npm run deploy` or requests fail for that reason, the paid Workers plan raises both.

## Run locally (Node 20+)

```
npm install
npm run db:local     # once: creates the local D1 tables (answer y)
npm run dev          # http://localhost:5173
```

`npm run preview` builds and runs the real Cloudflare Worker locally on :8787. `npm run check` runs the TypeScript checker.

## Deploy

```
npx wrangler login
npx wrangler d1 create fitsarap-db     # paste the database_id into wrangler.jsonc
npm run db:remote
npm run deploy
```

## Folder map

```
src/
  hooks.server.ts            session cookie -> locals.user (runs on every request)
  app.d.ts                   types for locals and the D1 binding
  lib/
    types.ts  constants.ts  match.ts  evaluate.ts  score.ts   name matching, quantity checks, scoring
    enhance.ts  toast.svelte.ts                   form helper + toast
    components/                                   Header, Footer, Photo, RecipeCard
    server/auth.ts  data.ts                       password hashing, sessions, D1 queries
    server/catalog.ts  server/recipes.json        the recipe catalog and the ranking (server only)
  routes/
    +layout.server.ts        loads user, pantry, saved recipes, exclusions for every page
    +layout.svelte  layout.css
    (site)/                  pages with the header and footer
      +page.svelte           Home
      find/  matches/  recipe/[id]/  dashboard/  how/  about/  logout/
    (auth)/login  (auth)/register     pages without the header
scripts/build-recipes.mjs    dataset -> recipes.json converter (and seed-rows.json)
static/images/recipes/       optional photos named <recipe-id>.jpg
migrations/0001_init.sql     D1 schema
```

## Notes

- Guests keep their pantry in a cookie (max 25 items). Logged-in users keep it in D1.
- Saving recipes and your own ingredient notes need an account.
- Passwords use PBKDF2-SHA256 at 100,000 iterations (the Cloudflare Workers maximum).
- Allergy exclusions only match ingredient names. This is not an allergy-safe filter.
- No email verification, password reset or rate limiting yet.
