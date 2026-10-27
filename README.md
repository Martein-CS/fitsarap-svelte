# FitSarap (SvelteKit + TypeScript + Cloudflare D1)

Filipino recipe recommendations from the ingredients you have. One full-stack SvelteKit app: pages, forms and database access all live in `src/routes`, deployed to Cloudflare Workers with a D1 database.

Matching is **ingredient-coverage scoring, not a trained ML model**. Percentages are not model confidence.

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
    types.ts  recipes.ts  match.ts  score.ts     recipe data, name matching, scoring
    enhance.ts  toast.svelte.ts                   form helper + toast
    components/                                   Header, Footer, Photo, RecipeCard
    server/auth.ts  data.ts                       password hashing, sessions, D1 queries
  routes/
    +layout.server.ts        loads user, pantry, saved recipes, exclusions for every page
    +layout.svelte  layout.css
    (site)/                  pages with the header and footer
      +page.svelte           Home
      find/  matches/  recipe/[id]/  dashboard/  how/  about/  logout/
    (auth)/login  (auth)/register     pages without the header
static/images/recipes/       drop <recipe-id>.jpg photos here (adobo.jpg, tinola.jpg, ...)
migrations/0001_init.sql     D1 schema
```

## Notes

- Guests keep their pantry in a cookie (max 25 items). Logged-in users keep it in D1.
- Saving recipes and your own ingredient notes need an account.
- Passwords use PBKDF2-SHA256 at 100,000 iterations (the Cloudflare Workers maximum).
- Allergy exclusions only match ingredient names. This is not an allergy-safe filter.
- No email verification, password reset or rate limiting yet.
