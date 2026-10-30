// One-command Cloudflare setup:  npm run setup:cloudflare
//
//   1. logs in to Cloudflare (opens your browser) if you are not logged in yet
//   2. creates the D1 database "fitsarap-db" in Asia-Pacific (or reuses it if it already exists)
//   3. writes its id into wrangler.jsonc and workers/jobs/wrangler.jsonc
//   4. creates the tables on Cloudflare (migrations/)
//   5. builds and deploys the site, then checks /api/v1/health
//
// Safe to run again: every step checks what already exists. Works on Windows, macOS and Linux.
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, existsSync} from 'node:fs';
import {createInterface} from 'node:readline/promises';

const DB = 'fitsarap-db';
const CONFIGS = ['wrangler.jsonc', 'workers/jobs/wrangler.jsonc'];

function run(cmd, {capture = false, allowFail = false} = {}) {
  console.log(`\n> ${cmd}`);
  const r = spawnSync(cmd, {shell: true, stdio: capture ? ['inherit', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8'});
  if (r.status !== 0 && !allowFail) {
    if (capture) console.error(r.stdout, r.stderr);
    console.error(`\n✖ Failed: ${cmd}\n  Fix the message above and run "npm run setup:cloudflare" again.`);
    process.exit(1);
  }
  return {ok: r.status === 0, out: r.stdout ?? ''};
}

// JSON printed on stdout (warnings go to stderr, but skip any non-JSON lines before it just in case).
const jsonIn = (text) => { const i = text.search(/^\s*[[{]/m); try { return i < 0 ? null : JSON.parse(text.slice(i)); } catch { return null; } };

console.log('FitSarap → Cloudflare setup\n');

// 1. Login
if (!run('npx wrangler whoami --json', {capture: true, allowFail: true}).ok) {
  console.log('Not logged in. A browser window will open: log in to Cloudflare and click "Allow".');
  run('npx wrangler login');
}
const who = jsonIn(run('npx wrangler whoami --json', {capture: true}).out);
console.log(`✔ Logged in${who?.email ? ' as ' + who.email : ''}`);

// 2. Database
const findDb = () => (jsonIn(run('npx wrangler d1 list --json', {capture: true}).out) ?? []).find((d) => d.name === DB);
let db = findDb();
if (db) console.log(`✔ Database ${DB} already exists`);
else {
  run(`npx wrangler d1 create ${DB} --location apac --update-config=false`);
  db = findDb();
}
const id = db?.uuid ?? db?.id;
if (!id) { console.error(`✖ Could not find the id of ${DB}. Run "npx wrangler d1 list" to see it.`); process.exit(1); }
console.log(`✔ Database id ${id}`);

// 3. Config files
for (const f of CONFIGS) {
  if (!existsSync(f)) continue;
  const before = readFileSync(f, 'utf8');
  const after = before.replace(/("database_name":\s*"fitsarap-db",\s*"database_id":\s*")[^"]*(")/g, `$1${id}$2`);
  if (after !== before) { writeFileSync(f, after); console.log(`✔ Wrote the database id into ${f}`); }
}

// 4. Tables
run(`npx wrangler d1 migrations apply ${DB} --remote`);
console.log('✔ Tables are ready');

// 5. Deploy (output shown live: on the very first deploy Wrangler asks you to pick a workers.dev subdomain)
run('npm run deploy');
const rl = createInterface({input: process.stdin, output: process.stdout});
const answer = (await rl.question('\nPaste the https://…workers.dev address printed above to test it (or press Enter to skip): ')).trim();
rl.close();
const url = /^https:\/\/[\w.-]+$/.test(answer.replace(/\/$/, '')) ? answer.replace(/\/$/, '') : '';
if (url) {
  try {
    const h = await (await fetch(url + '/api/v1/health?deep=1')).json();
    console.log(`\n✔ Health check: ${JSON.stringify(h)}`);
  } catch { console.log('\n(Health check skipped: the site may need a minute to start.)'); }
  console.log(`\n🎉 FitSarap is live at ${url}`);
} else {
  console.log('\n✔ Deployed. Your address is shown above (…workers.dev).');
}
console.log('Next time, deploy changes with: npm run deploy');
