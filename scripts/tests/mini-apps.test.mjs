import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { databaseName, parseConfig, workerName } from '../lib-wrangler-config.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const DAY = 24 * 60 * 60 * 1000;

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('mini-app tests need bash on PATH');

// The shape of mini-apps/wrangler.jsonc, with fixture names.
function miniConfig(staging = {}) {
  const db = name => [{ binding: 'DB', database_name: name, database_id: `${name}-id`, migrations_dir: '../schema/migrations' }];
  return JSON.stringify({
    name: 'demo-mini',
    main: 'worker.ts',
    compatibility_date: '2026-07-28',
    assets: { directory: 'apps', binding: 'ASSETS', run_worker_first: true },
    d1_databases: db('demo-db'),
    env: { staging: { name: 'demo-mini-staging', d1_databases: db('demo-db-staging'), ...staging } },
  }, null, 2);
}

const mainConfig = JSON.stringify({
  name: 'demo',
  main: 'worker/index.ts',
  d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'demo-db-id' }],
  env: { staging: { name: 'demo-staging', d1_databases: [{ binding: 'DB', database_name: 'demo-db-staging', database_id: 'demo-db-staging-id' }] } },
});

// A fake `npx` logs "<cwd relative to the repo>|<args>". `versions upload`
// fails like real wrangler until a staging deploy has created the Worker.
const fakeNpx = `#!/usr/bin/env bash
# cf-mini.sh pins wrangler 4 and must not wait on npx's install prompt;
# cf-deploy.sh runs the app's own wrangler. Pinned calls are logged apart.
if [ "$1" = "wrangler@4" ]; then
  [ "\${npm_config_yes:-}" = true ] || { echo "npx would prompt" >&2; exit 8; }
  shift; set -- wrangler "$@"
  echo "$*" >> "$FAKE_NPX_LOG.pinned"
fi
echo "\${PWD#"$FAKE_ROOT"/}|$*" >> "$FAKE_NPX_LOG"
case "$*" in
  "wrangler versions upload"*)
    if [ ! -f "$FAKE_STATE/staging-exists" ]; then
      echo "✘ [ERROR] You cannot upload a new version of a Worker that does not yet exist." >&2
      exit 1
    fi
    echo "Uploaded demo-mini-staging"
    if [ -z "\${FAKE_NO_URLS:-}" ]; then
      echo "Version Preview URL: https://0a1b2c3d-demo-mini-staging.example.workers.dev"
      [ -n "\${FAKE_ALIAS_URL:-}" ] && echo "Version Preview Alias URL: $FAKE_ALIAS_URL"
    fi
    ;;
  "wrangler deploy --env staging"*)
    touch "$FAKE_STATE/staging-exists"
    echo "  https://demo-mini-staging.example.workers.dev"
    ;;
  "wrangler deploy"*)
    echo "  https://demo-mini.example.workers.dev"
    ;;
esac
exit 0
`;

const PACK = ['cf-mini.sh', 'cf-deploy.sh', 'mini-dashboard.mjs', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];

// A throwaway repo on `branch`: the pack scripts, a main app in app/, and
// mini-apps/ with the shipped Worker, the hello app, and `apps` extra folders
// ({ name: { 'app.json': ..., 'api.mjs': ... } }). `config: null` leaves out
// mini-apps/wrangler.jsonc.
function miniRepo(t, { branch = 'mini/tips', apps = {}, config = miniConfig(), stagingExists = false } = {}) {
  const root = mkdtempSync('/tmp/mini-apps-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  for (const name of PACK) copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));

  mkdirSync(join(root, 'app/src'), { recursive: true });
  writeFileSync(join(root, 'app/wrangler.jsonc'), mainConfig);
  writeFileSync(join(root, 'app/src/index.ts'), 'export const main = true;\n');

  const mini = join(root, 'mini-apps');
  mkdirSync(join(mini, 'apps'), { recursive: true });
  copyFileSync(join(repo, 'mini-apps/worker.ts'), join(mini, 'worker.ts'));
  copyFileSync(join(repo, 'mini-apps/apps/.assetsignore'), join(mini, 'apps/.assetsignore'));
  cpSync(join(repo, 'mini-apps/apps/hello'), join(mini, 'apps/hello'), { recursive: true });
  if (config !== null) writeFileSync(join(mini, 'wrangler.jsonc'), config);
  for (const [name, files] of Object.entries(apps)) {
    mkdirSync(join(mini, 'apps', name), { recursive: true });
    for (const [file, text] of Object.entries(files)) writeFileSync(join(mini, 'apps', name, file), text);
  }

  execFileSync('git', ['init', '-q', '-b', branch], { cwd: root, env: { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });

  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), fakeNpx);
  chmodSync(join(bin, 'npx'), 0o755);
  mkdirSync(join(root, 'state'));
  if (stagingExists) writeFileSync(join(root, 'state/staging-exists'), '');
  return root;
}

const read = path => (existsSync(path) ? readFileSync(path, 'utf8') : '');

// Runs a script in the repo. `vars` adds to or, with `undefined`, removes from
// the environment; the Cloudflare token is set unless removed.
function run(root, script, args = [], vars = {}) {
  const env = {
    PATH: `${join(root, 'bin')}:${process.env.PATH}`,
    HOME: root,
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    FAKE_ROOT: root,
    FAKE_NPX_LOG: join(root, 'npx.log'),
    FAKE_STATE: join(root, 'state'),
    GITHUB_OUTPUT: join(root, 'github-output'),
    CLOUDFLARE_API_TOKEN: 'test-token',
    ...vars,
  };
  for (const key of Object.keys(env)) if (env[key] === undefined) delete env[key];
  const command = script.endsWith('.mjs') ? process.execPath : 'bash';
  const result = spawnSync(command, [join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8', env });
  assert.equal(result.error, undefined, `${command} failed to start: ${result.error}`);
  const calls = read(join(root, 'npx.log')).split('\n').filter(Boolean);
  rmSync(join(root, 'npx.log'), { force: true });
  return {
    status: result.status,
    out: `${result.stdout}${result.stderr}`,
    stderr: result.stderr,
    cwds: calls.map(call => call.split('|')[0]),
    calls: calls.map(call => call.slice(call.indexOf('|') + 1)),
    github: read(join(root, 'github-output')),
  };
}

const mini = (root, args, vars) => run(root, 'cf-mini.sh', args, vars);
const dashboard = (root, args = []) => run(root, 'mini-dashboard.mjs', args);
const inCi = branch => ({ CF_BRANCH: branch, CF_PRODUCTION_BRANCH: 'main' });
const generated = root => ({
  html: read(join(root, 'mini-apps/apps/index.html')),
  routes: read(join(root, 'mini-apps/apps/routes.gen.ts')),
});

// Every PREVIEW_EXPIRES in the calls, as numbers.
const expiries = calls => calls.flatMap(call => [...call.matchAll(/--var PREVIEW_EXPIRES:(\S+)/g)].map(m => Number(m[1])));

function assertSevenDays(calls) {
  for (const value of expiries(calls)) {
    assert.ok(Math.abs(value - (Date.now() + 7 * DAY)) < 5 * 60 * 1000, `PREVIEW_EXPIRES ${value} is not seven days on`);
  }
}

const app = (title, description, extra = {}) => ({ 'app.json': JSON.stringify({ title, description }), ...extra });

// ── The dashboard ───────────────────────────────────────────────────────────

test('the dashboard lists every app sorted by folder, with its text escaped', t => {
  const root = miniRepo(t, {
    apps: {
      zeta: app('<Zeta> & "Co"', "Zeta's app"),
      alpha: app('Alpha', 'Runs <script>alert(1)</script>'),
      'mid-2': app('Mid', 'In the middle'),
    },
  });
  const result = dashboard(root);
  assert.equal(result.status, 0, result.out);
  const { html } = generated(root);
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, ['./alpha/', './hello/', './mid-2/', './zeta/']);
  assert.match(html, /&lt;Zeta&gt; &amp; &quot;Co&quot;/);
  assert.match(html, /Zeta&#39;s app/);
  assert.match(html, /Runs &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="viewport"/);

  const first = generated(root);
  assert.equal(dashboard(root).status, 0);
  assert.deepEqual(generated(root), first, 'the same folders must write the same bytes');
});

test('the dashboard with no apps says so', t => {
  const root = miniRepo(t);
  rmSync(join(root, 'mini-apps/apps/hello'), { recursive: true });
  const result = dashboard(root);
  assert.equal(result.status, 0, result.out);
  const { html, routes } = generated(root);
  assert.match(html, /No mini apps yet\. Ask the agent to make one\./);
  assert.doesNotMatch(html, /<li>/);
  assert.doesNotMatch(routes, /import/);
  assert.match(routes, /export default \{\n\};/);
});

test('a bad manifest fails, names the folder, and writes nothing', t => {
  const cases = {
    'no-title': { 'app.json': JSON.stringify({ description: 'No title here' }) },
    'blank-description': app('Blank', '   '),
    'no-manifest': { 'index.html': '<p>hi</p>' },
    'bad-json': { 'app.json': '{ title: nope' },
    Bad_Name: app('Bad', 'Upper case and an underscore'),
  };
  for (const [name, files] of Object.entries(cases)) {
    const root = miniRepo(t, { apps: { [name]: files } });
    const result = dashboard(root);
    assert.equal(result.status, 1, `${name}: ${result.out}`);
    assert.match(result.stderr, new RegExp(`mini-apps/apps/${name}:`), result.stderr);
    assert.deepEqual(generated(root), { html: '', routes: '' }, `${name}: nothing may be written`);
  }
  const root = miniRepo(t, { apps: { 'no-title': cases['no-title'] } });
  assert.match(dashboard(root).stderr, /needs a "title"/);
});

test('the route table imports only the apps that have an api.mjs', t => {
  const root = miniRepo(t, {
    apps: {
      beta: app('Beta', 'Pages only'),
      alpha: app('Alpha', 'Has an API', { 'api.mjs': 'export default { fetch() { return new Response("a"); } };\n' }),
    },
  });
  assert.equal(dashboard(root).status, 0);
  const { routes } = generated(root);
  assert.deepEqual([...routes.matchAll(/^import (\w+) from "([^"]+)";$/gm)].map(m => m[2]), ['./alpha/api.mjs', './hello/api.mjs']);
  assert.match(routes, /"alpha": api0,\n\t"hello": api1,/);
  assert.doesNotMatch(routes, /beta/);
});

test('the dashboard script follows the CLI conventions', t => {
  const root = miniRepo(t);
  const help = dashboard(root, ['--help']);
  assert.equal(help.status, 0);
  assert.match(help.out, /usage/);
  assert.equal(dashboard(root, ['--no-such-flag']).status, 2);
});

// ── Preview from the agent host ─────────────────────────────────────────────

test('preview refuses the default branch and uploads nothing', t => {
  const root = miniRepo(t, { branch: 'main' });
  const result = mini(root, ['preview']);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /'main' is the default branch/);
  assert.deepEqual(result.calls, []);
  assert.deepEqual(generated(root), { html: '', routes: '' });
});

test('preview with --alias uploads under that alias, even on the default branch', t => {
  const root = miniRepo(t, { branch: 'main', stagingExists: true });
  const result = mini(root, ['preview', '--alias', 'Mini/Tips']);
  assert.equal(result.status, 0, result.out);
  assert.ok(result.calls.some(call => call.startsWith('wrangler versions upload --env staging --preview-alias mini-tips --var PREVIEW_EXPIRES:')),
    result.calls.join('\n'));
  assert.equal(mini(root, ['preview', '--alias', '///']).status, 2, 'an alias with no usable characters is a usage error');
});

test('preview on a branch migrates staging and uploads once when the staging twin exists', t => {
  const root = miniRepo(t, { stagingExists: true });
  const result = mini(root, ['preview']);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.calls.length, 2, result.calls.join('\n'));
  assert.equal(result.calls[0], 'wrangler d1 migrations apply demo-db-staging --remote --env staging');
  assert.match(result.calls[1], /^wrangler versions upload --env staging --preview-alias mini-tips --var PREVIEW_EXPIRES:\d+$/);
  assertSevenDays(result.calls);
  assert.match(generated(root).html, /\.\/hello\//, 'the dashboard is built before the upload');
});

test('preview creates the staging twin only when it is missing', t => {
  const root = miniRepo(t);
  const first = mini(root, ['preview']);
  assert.equal(first.status, 0, first.out);
  assert.deepEqual(first.calls.map(call => call.split(' --var')[0]), [
    'wrangler d1 migrations apply demo-db-staging --remote --env staging',
    'wrangler versions upload --env staging --preview-alias mini-tips',
    'wrangler deploy --env staging',
    'wrangler versions upload --env staging --preview-alias mini-tips',
  ]);
  assert.equal(expiries(first.calls).length, 3, 'the create deploy and both uploads expire');
  assertSevenDays(first.calls);

  const again = mini(root, ['preview']);
  assert.equal(again.status, 0, again.out);
  assert.ok(!again.calls.some(call => call.startsWith('wrangler deploy')), again.calls.join('\n'));
});

test('preview that can not run here says why in one line and exits 3', t => {
  const noToken = mini(miniRepo(t, { stagingExists: true }), ['preview'], { CLOUDFLARE_API_TOKEN: undefined });
  assert.equal(noToken.status, 3, noToken.out);
  assert.match(noToken.stderr, /no CLOUDFLARE_API_TOKEN/);
  assert.deepEqual(noToken.calls, []);

  const noConfig = mini(miniRepo(t, { config: null }), ['preview']);
  assert.equal(noConfig.status, 3, noConfig.out);
  assert.match(noConfig.stderr, /no mini-apps\/wrangler\.jsonc/);

  const placeholders = miniRepo(t, { config: miniConfig().replaceAll('demo-mini', '<your-worker>-mini') });
  const unprovisioned = mini(placeholders, ['preview']);
  assert.equal(unprovisioned.status, 3, unprovisioned.out);
  assert.match(unprovisioned.stderr, /placeholders/);
  assert.deepEqual(unprovisioned.calls, []);
});

// ── The guards ──────────────────────────────────────────────────────────────

test('a staging config that names production stops before any wrangler call', t => {
  const configs = {
    worker: miniConfig({ name: 'demo-mini' }),
    database: miniConfig({ d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'demo-db-id' }] }),
  };
  for (const [what, config] of Object.entries(configs)) {
    for (const [args, vars] of [[['preview'], {}], [['ci'], inCi('mini/tips')], [['ci'], inCi('main')]]) {
      const root = miniRepo(t, { config, stagingExists: true });
      const result = mini(root, args, vars);
      assert.equal(result.status, 1, `${what} ${args} ${vars.CF_BRANCH ?? ''}: ${result.out}`);
      assert.match(result.out, what === 'worker' ? /production mini Worker 'demo-mini'/ : /production database 'demo-db'/);
      assert.deepEqual(result.calls, [], 'no wrangler call may run');
      assert.equal(result.github, '');
    }
  }
});

// ── CI ──────────────────────────────────────────────────────────────────────

test('ci on a feature branch deploys staging and uploads the alias, both expiring in seven days', t => {
  const root = miniRepo(t);
  const url = 'https://mini-tips-demo-mini-staging.acct-9.workers.dev';
  const result = mini(root, ['ci'], { ...inCi('mini/tips'), FAKE_ALIAS_URL: url });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls.map(call => call.split(' --var')[0]), [
    'wrangler deploy --env staging',
    'wrangler versions upload --env staging --preview-alias mini-tips',
  ]);
  assert.equal(expiries(result.calls).length, 2);
  assertSevenDays(result.calls);
  assert.equal(result.github, `preview-url=${url}\n`);
});

test('ci on the default branch deploys production with no expiry', t => {
  const root = miniRepo(t);
  const result = mini(root, ['ci'], inCi('main'));
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['wrangler deploy']);
  assert.equal(result.github, '');
  assert.match(generated(root).html, /\.\/hello\//, 'production rebuilds the dashboard');
});

test('the preview URL is the one wrangler printed, never a constructed one', t => {
  const odd = 'https://x7-mini-tips.unusual-subdomain.workers.dev/';
  const printed = mini(miniRepo(t), ['ci'], { ...inCi('mini/tips'), FAKE_ALIAS_URL: odd });
  assert.equal(printed.github, `preview-url=${odd}\n`);
  assert.match(printed.out, new RegExp(`preview URL ${odd.replaceAll('.', '\\.')}`));

  const silent = mini(miniRepo(t), ['ci'], { ...inCi('mini/tips'), FAKE_NO_URLS: '1' });
  assert.equal(silent.status, 0, silent.out);
  assert.equal(silent.github, '', 'no URL printed means no URL published');
  assert.match(silent.stderr, /printed no preview URL/);
  assert.doesNotMatch(silent.out, /preview URL https/);
});

test('ci deploys nothing when mini-apps/ did not change, or when there is no mini-app Worker', t => {
  const unchanged = miniRepo(t);
  const result = mini(unchanged, ['ci'], { ...inCi('main'), MINI_CHANGED: 'false' });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /did not change/);
  assert.deepEqual(result.calls, []);
  assert.deepEqual(generated(unchanged), { html: '', routes: '' });

  for (const config of [null, miniConfig().replaceAll('demo-mini', '<your-worker>-mini')]) {
    const absent = mini(miniRepo(t, { config }), ['ci'], inCi('mini/tips'));
    assert.equal(absent.status, 0, absent.out);
    assert.match(absent.out, /nothing deployed/);
    assert.deepEqual(absent.calls, []);
  }
});

test('no mode, an unknown mode, or ci outside CI prints usage and deploys nothing', t => {
  const root = miniRepo(t, { stagingExists: true });
  for (const [args, vars] of [[[], {}], [['deploy'], {}], [['ci'], {}], [['ci', '--alias', 'x'], inCi('mini/tips')], [['preview', '--force'], {}]]) {
    const result = mini(root, args, vars);
    assert.equal(result.status, 2, `${args}: ${result.out}`);
    assert.match(result.stderr, /usage: bash scripts\/cf-mini\.sh/);
    assert.deepEqual(result.calls, []);
  }
  const help = mini(root, ['--help']);
  assert.equal(help.status, 0);
  assert.match(help.out, /usage/);
});

test('no mode touches app/', t => {
  const snapshot = root => {
    const files = {};
    const walk = dir => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name);
        if (entry.isDirectory()) walk(path);
        else files[relative(root, path)] = readFileSync(path, 'utf8');
      }
    };
    walk(join(root, 'app'));
    return files;
  };
  for (const [args, vars] of [[['preview'], {}], [['ci'], inCi('mini/tips')], [['ci'], inCi('main')]]) {
    const root = miniRepo(t);
    const before = snapshot(root);
    const result = mini(root, args, vars);
    assert.equal(result.status, 0, result.out);
    assert.ok(result.calls.length > 0);
    assert.deepEqual([...new Set(result.cwds)], ['mini-apps'], `every wrangler call must run in mini-apps/: ${result.cwds}`);
    assert.deepEqual(snapshot(root), before);
  }
});

test('without an installed wrangler, the mini script pins wrangler 4 through npx', t => {
  const root = miniRepo(t, { stagingExists: true });
  const result = mini(root, ['preview', '--alias', 'mini-tips'], { CLOUDFLARE_API_TOKEN: 'fake-token' });
  assert.equal(result.status, 0, result.stderr);
  const pinned = read(join(root, 'npx.log.pinned')).split('\n').filter(Boolean);
  assert.equal(pinned.length, result.calls.length, 'every wrangler call is pinned');
});

test('the preview alias follows the same rule as cf-deploy.sh', t => {
  const root = miniRepo(t, { stagingExists: true });
  const branch = 'Feat/Add_Thing--Now';
  const aliasOf = result => result.calls.map(call => /--preview-alias (\S+)/.exec(call)?.[1]).find(Boolean);
  const fromMini = aliasOf(mini(root, ['ci'], inCi(branch)));
  const fromDeploy = aliasOf(run(root, 'cf-deploy.sh', [], inCi(branch)));
  assert.equal(fromMini, 'feat-add-thing-now');
  assert.equal(fromMini, fromDeploy);
});

// ── The shipped scaffold ────────────────────────────────────────────────────

test('the mini-app config has its own staging Worker and database, bound like the main app', () => {
  const config = parseConfig(join(repo, 'mini-apps/wrangler.jsonc'));
  const app = parseConfig(join(repo, 'app/wrangler.jsonc'));
  assert.notEqual(workerName(config, 'staging'), workerName(config));
  assert.notEqual(databaseName(config, 'staging'), databaseName(config));
  assert.equal(config.main, 'worker.ts');
  assert.deepEqual(config.assets, { directory: 'apps', binding: 'ASSETS', run_worker_first: true });
  assert.equal(config.d1_databases[0].binding, app.d1_databases[0].binding);
  assert.equal(config.env.staging.d1_databases[0].binding, app.env.staging.d1_databases[0].binding);
});

test('source files never reach the assets upload', () => {
  const ignore = read(join(repo, 'mini-apps/apps/.assetsignore')).split('\n');
  for (const pattern of ['*.ts', 'api.mjs']) assert.ok(ignore.includes(pattern), `apps/.assetsignore must list ${pattern}`);
  const gitignore = read(join(repo, 'mini-apps/.gitignore')).split('\n');
  for (const path of ['apps/index.html', 'apps/routes.gen.ts', '.wrangler/']) assert.ok(gitignore.includes(path), path);
});

// ── The Worker ──────────────────────────────────────────────────────────────

// Load worker.ts the way each runtime can: Node's own type stripping when this
// Node has it, else a bundle from esbuild (what wrangler uses) in app/node_modules.
function workerLoader() {
  if (process.features.typescript) return { flags: ['--experimental-strip-types'], entry: 'worker.ts' };
  try {
    const esbuild = createRequire(join(repo, 'app/package.json'))('esbuild');
    return { esbuild, flags: [], entry: 'worker.bundle.mjs' };
  } catch {
    return null;
  }
}
const loader = workerLoader();
const needsLoader = { skip: loader ? false : 'this Node has no TypeScript support and esbuild is not in app/node_modules — run `npm ci` in app/' };

const probe = `
const { default: worker, handle } = await import(process.env.WORKER_URL);
let served = 0;
const env = expires => ({
  ASSETS: { fetch: async () => { served += 1; return new Response('asset'); } },
  ...(expires === undefined ? {} : { PREVIEW_EXPIRES: String(expires) }),
});
const ask = async (path, expires, table) => {
  const before = served;
  const request = new Request('https://mini.example' + path);
  const response = table ? await handle(request, env(expires), {}, table) : await worker.fetch(request, env(expires), {});
  return { status: response.status, body: await response.text(), assets: served > before };
};
const now = Date.now();
console.log(JSON.stringify({
  expired: await ask('/hello/', now - 1000),
  expiredApi: await ask('/hello/api/greeting', now - 1000),
  live: await ask('/hello/', now + 60000),
  none: await ask('/hello/'),
  malformed: await ask('/hello/', 'soon'),
  source: await ask('/hello/api.mjs'),
  encoded: await ask('/hello/api%2Emjs'),
  tsSource: await ask('/worker.ts'),
  table: await ask('/routes.gen.ts'),
  tests: await ask('/hello/api.test.mjs'),
  api: await ask('/hello/api/greeting?name=Ada'),
  noHandler: await ask('/nothing/api/x'),
  proto: await ask('/__proto__/api/x'),
  custom: await ask('/tips/api/x', undefined, { tips: { fetch: () => new Response('tips') } }),
}));
`;

test('the Worker expires previews, hides source, and routes each API', needsLoader, t => {
  const root = miniRepo(t);
  assert.equal(dashboard(root).status, 0);
  const dir = join(root, 'mini-apps');
  if (loader.esbuild) {
    loader.esbuild.buildSync({ entryPoints: [join(dir, 'worker.ts')], bundle: true, format: 'esm', platform: 'neutral', outfile: join(dir, loader.entry), logLevel: 'silent' });
  }
  const result = spawnSync(process.execPath, [...loader.flags, '--input-type=module', '-e', probe], {
    encoding: 'utf8',
    env: { ...process.env, WORKER_URL: pathToFileURL(join(dir, loader.entry)).href, NODE_NO_WARNINGS: '1' },
  });
  assert.equal(result.status, 0, result.stderr);
  const r = JSON.parse(result.stdout);

  for (const key of ['expired', 'expiredApi', 'malformed']) {
    assert.equal(r[key].status, 410, key);
    assert.match(r[key].body, /This preview expired\. Ask the agent to rebuild it\./, key);
    assert.equal(r[key].assets, false, `${key}: an expired preview serves nothing`);
  }
  for (const key of ['live', 'none', 'noHandler', 'proto']) assert.deepEqual([r[key].status, r[key].assets], [200, true], key);
  for (const key of ['source', 'encoded', 'tsSource', 'table', 'tests']) {
    assert.equal(r[key].status, 404, key);
    assert.equal(r[key].assets, false, `${key}: source is never served`);
  }
  assert.deepEqual([r.api.status, JSON.parse(r.api.body)], [200, { message: 'Hello, Ada!' }]);
  assert.equal(r.custom.body, 'tips');
});
