# FitSarap: A Web-Based Filipino Recipe Recommendation System Using Machine Learning for Limited Ingredients

CS 406 project (TIP-QC). The site takes the ingredients you have, with their amounts, and ranks Filipino dishes even when nothing matches exactly. Each recipe shows what is missing or short, substitutes you already own, how many servings your amounts allow, allergy warnings, and the cooking steps.

It is built with SvelteKit 2, Svelte 5 and TypeScript, and runs on Cloudflare Workers with a D1 database. This version replaces the earlier `FitSarap-Cloudflare` site (vanilla JS views plus a separate Worker API). Every page and feature from that site is here, along with the trained model, the cleaned dataset and a public JSON API.

## Features at a glance

- **Ingredient input:** a browsable stock list of 126 common ingredients in 8 groups (meat, seafood, vegetables, sauces…), autocomplete for about 1,000 names, or free text for anything else (MSG, seasoning mixes). Each item can have an exact, approximate or unknown amount.
- **Recommendations:** ranked by the model, with a photo, estimated cooking time, meal type (Breakfast, Lunch, Dinner, Merienda, Dessert), dish type, match %, missing items and swaps you already own. You can filter by meal, cooking time (15–90 min), dish type, "can make now" and "missing 2 or fewer".
- **Recipe page:** ingredients compared with your pantry, substitutions, servings your amounts allow, allergy warning, steps, and **your own additions**. Extra ingredients you plan to use (MSG, more chili…) are saved per recipe: in your account, or in the browser for guests. Pantry items the recipe doesn't use are offered with one tap.
- **Photos.** The dataset has no images, so the site picks one in this order:
  1. your own photo of the recipe, in `src/lib/assets/recipes/<recipe-id>.jpg`
  2. your own photo of the dish type, in `src/lib/assets/dishes/<dish>.jpg` (e.g. `adobo.jpg`; the 59 dish keys are in `src/lib/domain/dishes.ts`)
  3. an example photo of the dish (about two-thirds of recipes) from Wikimedia Commons, credited, through `/img/dish/<dish>` (set `DISH_PHOTOS` to `"off"` in `wrangler.jsonc` vars to turn this off)
  4. an illustration

## The model and the dataset

| | |
|---|---|
| **Dataset** | FitSarap dataset **v5.1**: 1,911 cleaned recipes from [joackimagno/FILIPINO_RECIPES_2K](https://huggingface.co/datasets/joackimagno/FILIPINO_RECIPES_2K). Each ingredient line keeps its original text and gets a standard name, a family, and an amount and unit (only when the line states one; nothing is guessed). It is also flagged as optional, a pantry staple or "to taste". Every recipe has servings, prep and cook times, and steps. |
| **Ranking model** | **Hybrid (TF-IDF)**: `score = 0.4 × TF-IDF cosine (min-max scaled) + 0.6 × coverage + 0.1 × quantity feasibility`. TF-IDF learns from the recipes how distinctive each ingredient is (tamarind or bagoong count for more than garlic). Coverage gives full credit for the exact ingredient and half credit for the same family. Quantity feasibility compares amounts when the units convert (mass with mass, volume with volume). |
| **Why this model** | Best of 7 models in the v5.1 benchmark: test **NDCG@5 0.938 ± 0.006** over 1,420 test pantries. The runner-up was Hybrid (SBERT-MiniLM) at 0.905; the others were Coverage 0.865, TF-IDF 0.845, Word2Vec 0.713, and the SBERT models at 0.698 or lower. Paired Wilcoxon tests (p < 10⁻⁴⁰) confirm the lead. Relevance labels are rule-based, not chef judgments. |
| **Ingredient relationships** | `scripts/relations.py` learns which ingredients are cooked together, using normalised pointwise mutual information over the 1,911 recipes (sinigang: tamarind, kangkong, labanos, gabi; tinola: chicken, ginger, green papaya). The site uses it for "often cooked with your ingredients". It does not change the ranking. |
| **Same model on the site** | `npm run parity` re-scores 80 benchmark pantries with the website code: max difference 5e-13, identical top-5 in 80/80. In production, IDF is learned from the whole catalog; in the benchmark, from the training split only. |

Match percentages on the site show how many of a recipe's main ingredients you have. They are **not** model confidence.

### How the proposal's objectives are met

| Proposal | Where it is in the system |
|---|---|
| 1. Structured recipe database (ingredients, quantities, servings, instructions) | Dataset v5.1 → `src/lib/server/recommender/data/recipes.json` (built by `scripts/export_v51.py`), also served by `GET /api/v1/recipes/{id}` |
| 2. ML model that learns relationships and patterns among ingredients | TF-IDF weights learned from the recipes (ranking) + ingredient co-occurrence model (`relations.json`) |
| 3. Recommend dishes even when ingredients don't fully match | Any recipe sharing an ingredient or ingredient family is ranked, and partial matches are listed with what is missing |
| 4. Standardize spelling, units, names, forms | 3,200-phrase lexicon (English + Filipino, plurals, typos, descriptors such as "minced"), plus unit conversion in `src/lib/domain/units.ts` |
| 5. Enter amounts and find recipes those quantities can make | Quantity feasibility in the score; per-ingredient Enough / Short / Check amount; "Can make now" filter; servings your amounts allow |
| Missing ingredients, substitutions, additional items | Missing list on every card; substitutes written by recipe authors (in-pantry ones first); "One ingredient away" (the item that completes the most recipes); related ingredients |
| Allergies and dietary needs | Exclusions hide recipes. Recipe pages warn when a recipe matches your exclusions. Patterns include Filipino names and hidden sources (bagoong, patis, toyo, oyster sauce). This is name matching, not a guarantee. |
| Accessible to all users, especially PWDs | Skip link, landmarks, labelled controls, `aria-current` / `aria-pressed`, a table caption, visible focus, 32 px tap targets, reduced-motion support, dark mode, no horizontal scrolling at phone width, and pages that work without JavaScript (forms post normally) |
| Recipe websites and developers | Versioned public JSON API (below) |

**Not in the ranking score:** substitutions and the "additional items" suggestions are shown to the person, and the "Fewest missing" sort counts in-pantry substitutes, but the benchmarked score itself does not use them. Adding them to the score would need a new benchmark run.

## Architecture

The design follows the usual layers of a scalable system, mapped to what fits a Cloudflare-hosted student project. Microservices, Kafka and Kubernetes would add cost and failure points with no benefit at this size. The scalable choice here is a **stateless modular app on a serverless edge platform**, with clear seams where pieces can be split out.

```
 Browser / mobile app / other sites
        │  HTTPS
        ▼
 Cloudflare edge (CDN + load balancing across 300+ locations, automatic)
        │  static assets: hashed file names, cached forever
        ▼
 SvelteKit Worker ── hooks.server.ts: request id, session, timing, security headers, JSON logs
   │  routes/ (pages + form actions)      routes/api/v1 (JSON API, rate-limited, CORS, edge-cached GETs)
   ▼
 services/   accounts · kitchen (pantry, saved, notes) · recommendation (local or remote) · validate
   │                     │                                   │
   ▼                     ▼                                   ▼
 repositories/ ──► D1 (SQLite)          recommender/ engine + model + lexicon + exclusions
 (SQL only here)   read replicas +      (framework-free; in-process, or its own Worker via
                   session bookmarks     service binding: workers/recommender)
        ▲
        │  Queue (EVENTS) ──► workers/jobs: batch telemetry, daily cron cleanup
```

| Layer | In FitSarap |
|---|---|
| **Client** | Server-rendered Svelte pages (fast first load, work without JS) that hydrate for instant updates. Static assets use content-hashed names, so Cloudflare's CDN caches them indefinitely. Recipe photos are bundled only if they exist (`src/lib/assets/recipes/<recipe-id>.jpg`), so there are no 404 requests. |
| **API gateway / load balancer** | Cloudflare routes each request to the nearest location and spreads load across Worker instances automatically. `src/lib/server/infra/http.ts` and `ratelimit.ts` provide the gateway concerns: versioned routes (`/api/v1`), per-IP rate limits (Workers Rate Limiting binding: 10 auth tries and 120 API calls per minute), size-capped JSON bodies, CORS for public endpoints, and an origin check for cookie endpoints. |
| **Application / services** | Modular monolith with strict layers: `routes → services → repositories / recommender → domain`. The recommender has no SvelteKit imports, so the same code runs in-process or as the separate `workers/recommender` microservice. `services/recommendation.ts` picks one or the other; pages don't know which. |
| **Caching** | (1) Per-instance LRU caches: ranked results by pantry signature and exclusion sets (`infra/cache.ts`). (2) Cloudflare Cache API for public GETs (`/api/v1/recipes/{id}`, `/api/v1/ingredients/resolve`), shared by all instances in a location, 24 h. (3) The 4 MB catalog loads lazily, only for requests that rank. Personal data is never cached at the edge. |
| **Database** | D1. Every query is per-user and served by a primary key or index (`migrations/`), so cost stays flat as users grow. Reads can go to D1 read replicas near the user; a session bookmark cookie guarantees people see their own writes (`repositories/db.ts`). SQL lives only in `repositories/`. |
| **Asynchronous processing** | `infra/jobs.ts` runs work after the response is sent (`waitUntil`), or sends it to a Cloudflare Queue consumed in batches by `workers/jobs`. Today that work is recording unrecognised ingredient names (so the team knows what to add to the lexicon) and the daily expired-session cleanup. |
| **Infrastructure & orchestration** | Infrastructure as code: `wrangler.jsonc` files declare the Workers, D1, rate limits, queue and cron. `migrations/` version the schema. `.github/workflows/ci.yml` type-checks, tests, runs the parity check and builds on every push, and deploys on demand. Cloudflare runs and scales the instances, so no servers or containers need managing. |

**Core principles**

- **Stateless.** No instance keeps user data between requests. Sessions are in D1 (hashed tokens). Guest pantries are in a size-capped cookie; guest recipe notes are in the browser. Any instance anywhere can serve any request; caches only save time.
- **Horizontal scaling.** Cloudflare adds Worker instances as traffic grows. The recommendation service can be split into its own Worker and scaled, deployed and monitored separately (uncomment `services` in `wrangler.jsonc`).
- **Observability.** One JSON log line per request (request id, route, status, user, location, per-step timings), indexed by Workers Logs. A `Server-Timing` header shows timings in browser dev tools. `x-request-id` appears on every response and on error pages. `GET /api/v1/health?deep=1` checks D1 and the model, for uptime monitors.

**Measured.** Ranking an 8-ingredient pantry takes about 14 ms of CPU, warm (Node). The catalog and model load once per instance in about 0.15 s. The upload is 978 KB gzipped, within the free plan's 3 MB. Free Workers allow 10 ms CPU per request with short bursts tolerated; if a busy site hits that limit, the paid plan or the split-out recommender fixes it.

## Public API (v1)

`GET /api/v1` lists the endpoints. All errors look like `{"error": {"code", "message"}}`.

| Endpoint | |
|---|---|
| `POST /api/v1/recommendations` | `{"pantry": [{"name": "manok", "amount": 1, "unit": "kg"}], "exclusions": ["Shellfish"], "sort": "best", "filter": "all", "page": 1, "perPage": 24}` → ranked matches, missing items, substitutes, "one ingredient away" |
| `GET /api/v1/recipes/{id}` | Full recipe, substitutions, allergen flags (edge-cached) |
| `GET /api/v1/ingredients/resolve?name=bawang` | `{"key": "garlic", "parent": "garlic", "known": true}` |
| `POST /api/v1/related` | Ingredients often cooked with the ones given |
| `GET/POST/DELETE /api/v1/pantry`, `DELETE /api/v1/pantry/{id}` | The visitor's own pantry (session cookie, same site only) |
| `GET /api/v1/health` | Status; `?deep=1` also checks D1 and the model |

```
curl -X POST https://<your-worker>/api/v1/recommendations -H 'content-type: application/json' \
  -d '{"pantry":[{"name":"sampalok"},{"name":"kangkong"},{"name":"baboy","amount":500,"unit":"g"}],"perPage":3}'
```

## Install and run (Windows, macOS or Linux)

1. Install **Node.js 22 LTS** from https://nodejs.org (it includes npm). Check with `node -v` (must be 20 or newer).
   Install with `npm install` (or `npm ci`) only. Don't run `npm update` or `npm audit fix --force`: they upgrade SvelteKit and Vite to versions this project was not built for (error: `vite does not provide an export named 'parseSync'`).
2. Unzip into a **new, empty folder**. Don't unzip over an older copy: leftover files such as `scripts/build-recipes.mjs` cause TypeScript errors.
3. In that folder (VS Code: Terminal > New Terminal):

```
npm install          # installs everything and generates .svelte-kit/ (fixes "Cannot read file .svelte-kit/tsconfig.json")
npm run db:local     # once: creates the local database tables (answer y)
npm run dev          # open http://localhost:5173
```

4. In VS Code, install the **Svelte for VS Code** extension. If old errors stay visible, run "TypeScript: Restart TS Server" from the command palette (Ctrl+Shift+P).

Python is only needed for `npm run data` / `npm run relations`, which rebuild the dataset files. The site does not need it.

## Run locally (Node 20+)

```
npm install
npm run db:local     # once: creates the local D1 tables (answer y)
npm run dev          # http://localhost:5173
```

| Command | |
|---|---|
| `npm run verify` | Everything CI runs: `check`, `check:workers`, `test` (unit tests), `parity` (website model = benchmark), `build` |
| `npm run preview` | Builds and runs the real Worker locally on :8787 |
| `npm run data` | Rebuilds the catalog and lexicon from the v5.1 files (see below) |
| `npm run relations` | Re-learns the ingredient relationships from the catalog |

## Deploy to Cloudflare

You need a free Cloudflare account (https://dash.cloudflare.com/sign-up). Then, in the project folder:

```
npm run setup:cloudflare
```

This one command logs you in (a browser window opens; click "Allow"), creates the `fitsarap-db` database in Asia-Pacific, writes its id into `wrangler.jsonc`, creates the tables, builds and deploys. On the very first deploy, Wrangler asks you to choose a `workers.dev` subdomain. Your site is then at `https://fitsarap.<subdomain>.workers.dev`. It is safe to run the command again.

After that, deploy changes with `npm run deploy`. If you change the database schema (a new file in `migrations/`), run `npm run db:remote` first.

Manual equivalent: `npx wrangler login`, `npx wrangler d1 create fitsarap-db --location apac` (paste the `database_id` into `wrangler.jsonc` and `workers/jobs/wrangler.jsonc`), `npm run db:remote`, `npm run deploy`.

Optional, for more scale:

```
npm run deploy:recommender             # then uncomment "services" in wrangler.jsonc and deploy again
npx wrangler queues create fitsarap-events
npm run deploy:jobs                    # then uncomment "queues" in wrangler.jsonc and deploy again
```

In the Cloudflare dashboard you can also turn on D1 read replication for `fitsarap-db` and watch logs under Workers & Pages > fitsarap > Logs. To deploy from GitHub, add the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets and run the CI workflow with "deploy" ticked.

## Rebuilding the data (only when the dataset changes)

The generated files are committed. `npm run data` runs `scripts/export_v51.py` on `../fitsarap-v5.1`, which writes `recipes.json`, `lexicon.json` and `subs.json` to `src/lib/server/recommender/data/`, and `ingredient-names.json` and `model-info.json` to `src/lib/data/`. Then run `npm run relations` and `npm run parity`.

**License:** the dataset page has no license or source information, and many recipes read like they were copied from recipe websites. Fine for a class project; check the source before publishing the data publicly or commercially.

## Folder map

```
src/
  hooks.server.ts                 request id, session lookup, timing, security headers, JSON request log
  app.d.ts                        types for locals and the Cloudflare bindings
  lib/
    domain/                       pure logic shared by browser and server: types, units, evaluate (enough/short/
                                  similar/missing, servings), score (summaries, substitutions), constants
    client/                       browser helpers: toast, form enhance
    components/                   Header, Footer, Photo, RecipeCard
    data/                         ingredient-names.json (autocomplete), model-info.json
    assets/recipes/               optional recipe photos named <recipe-id>.jpg
    server/
      infra/                      cache (LRU + edge cache), http (API gateway helpers), ratelimit, log (JSON logs,
                                  timers), jobs (background + queue), crypto (PBKDF2, tokens)
      repositories/               all SQL: db (D1 sessions/replicas), users, sessions, kitchen, telemetry
      services/                   accounts, kitchen, recommendation (local | remote), validate
      recommender/                engine, model (Hybrid TF-IDF), lexicon, exclusions, expand, data/*.json
  routes/
    (site)/                       Home, find, matches, recipe/[id], dashboard, how, about, logout
    (auth)/                       login, register
    api/v1/                       JSON API
    +error.svelte                 friendly 404 / error page with a reference id
workers/
  recommender/                    optional recommendation microservice (service binding)
  jobs/                           optional queue consumer + daily cron
scripts/
  export_v51.py  relations.py     data builders
  parity-test.ts  unit-test.ts    model parity with the benchmark, unit tests
migrations/                       D1 schema (0001 tables, 0002 indexes + telemetry)
.github/workflows/ci.yml          CI and on-demand deploy
```

## Notes and limits

- Guests can keep 25 pantry items (cookie size); accounts can keep 40.
- Passwords use PBKDF2-SHA256 at 100,000 iterations (the Cloudflare Workers maximum). Session tokens are stored hashed. Login takes the same time whether or not the account exists. Login and registration are rate-limited.
- Not done yet: email verification, password reset, account deletion.
- Allergy exclusions and warnings are ingredient-name matching. They err on the side of excluding (for example, regular soy sauce counts as wheat), but they are not an allergy-safe guarantee.
- Recipe ids are slugs of the recipe name. Saved recipes whose id no longer exists are skipped.
