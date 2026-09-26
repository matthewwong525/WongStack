import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { handleMiniApp, MINI_PREFIX } from '../../mini-apps/router.mjs';
import { pack, REPO as repo } from './fixtures/pack.mjs';

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('mini-app tests need bash on PATH');

// The main app's config, with fixture names.
function mainConfig(staging = {}) {
  const db = name => [{ binding: 'DB', database_name: name, database_id: `${name}-id`, migrations_dir: '../schema/migrations' }];
  return JSON.stringify({
    name: 'demo',
    main: 'worker/index.ts',
    assets: { binding: 'ASSETS', not_found_handling: 'single-page-application', run_worker_first: ['/apps/*'] },
    d1_databases: db('demo-db'),
    env: { staging: { name: 'demo-staging', d1_databases: db('demo-db-staging'), ...staging } },
  }, null, 2);
}

// A fake @cloudflare/vite-plugin build: the client assets, a generated config
// for the environment CLOUDFLARE_ENV selects, and the redirect wrangler reads.
// FAKE_BUILD_NAME forces the generated name, to fake a build that went wrong.
const fakeBuild = `import { mkdirSync, writeFileSync } from 'node:fs';
const name = process.env.FAKE_BUILD_NAME || (process.env.CLOUDFLARE_ENV === 'staging' ? 'demo-staging' : 'demo');
mkdirSync('dist/client', { recursive: true });
writeFileSync('dist/client/index.html', '<div id="root"></div>');
mkdirSync('dist/' + name, { recursive: true });
writeFileSync('dist/' + name + '/wrangler.json', JSON.stringify({ name, assets: { directory: '../client' } }));
mkdirSync('.wrangler/deploy', { recursive: true });
writeFileSync('.wrangler/deploy/config.json', JSON.stringify({ configPath: '../../dist/' + name + '/wrangler.json' }));
`;

// A fake npm and npx log "<cwd relative to the repo>|<tool> <args>". npm runs
// the fake build; `wrangler versions upload` fails like real wrangler until a
// deploy has created the staging Worker.
const fakeNpm = `#!/usr/bin/env bash
echo "\${PWD#"$FAKE_ROOT"/}|npm $*" >> "$FAKE_LOG"
case "$*" in
  ci) mkdir -p node_modules ;;
  "run build:app") node fake-build.mjs ;;
esac
`;
const fakeNpx = `#!/usr/bin/env bash
echo "\${PWD#"$FAKE_ROOT"/}|npx $*" >> "$FAKE_LOG"
case "$*" in
  "wrangler versions upload"*)
    if [ ! -f "$FAKE_STATE/staging-exists" ]; then
      echo "✘ [ERROR] You cannot upload a new version of a Worker that does not yet exist." >&2
      exit 1
    fi
    echo "Uploaded demo-staging"
    echo "Version Preview URL: https://0a1b2c3d-demo-staging.example.workers.dev"
    echo "Version Preview Alias URL: https://mini-tips-demo-staging.example.workers.dev"
    ;;
  "wrangler deploy"*) touch "$FAKE_STATE/staging-exists" ;;
esac
`;

const PACK = ['cf-preview.sh', 'cf-build.sh', 'mini-dashboard.mjs', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];

const app = (title, description, extra = {}) => ({ 'app.json': JSON.stringify({ title, description }), ...extra });

// A throwaway repo on `branch`: the pack scripts, a main app in app/, and
// mini-apps/ with the hello app and `apps` extra folders
// ({ name: { 'app.json': ..., 'api.mjs': ... } }). `config: null` leaves out
// app/wrangler.jsonc.
// Each repo root's pack fixture (fixtures/pack.mjs), which runs its scripts.
const fixtures = new Map();

function miniRepo(t, { branch = 'mini/tips', apps = {}, config = mainConfig(), installed = true, stagingExists = false } = {}) {
  const fixture = pack(t, { scripts: PACK, config, tools: { npm: fakeNpm, npx: fakeNpx }, prefix: 'mini-apps-' });
  const { root } = fixture;
  fixture.write('app/package.json', '{ "scripts": { "build:app": "node fake-build.mjs" } }\n');
  fixture.write('app/fake-build.mjs', fakeBuild);
  if (installed) mkdirSync(join(root, 'app/node_modules'));

  const mini = join(root, 'mini-apps');
  mkdirSync(join(mini, 'apps'), { recursive: true });
  cpSync(join(repo, 'mini-apps/apps/hello'), join(mini, 'apps/hello'), { recursive: true });
  for (const [name, files] of Object.entries(apps)) {
    mkdirSync(join(mini, 'apps', name), { recursive: true });
    for (const [file, text] of Object.entries(files)) writeFileSync(join(mini, 'apps', name, file), text);
  }

  execFileSync('git', ['init', '-q', '-b', branch], { cwd: root, env: { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' } });

  mkdirSync(join(root, 'state'));
  if (stagingExists) writeFileSync(join(root, 'state/staging-exists'), '');
  fixtures.set(root, fixture);
  return root;
}

const read = path => (existsSync(path) ? readFileSync(path, 'utf8') : '');

// Runs a script in the repo. `vars` adds to or, with `undefined`, removes from
// the environment; the Cloudflare token is set unless removed.
function run(root, script, args = [], vars = {}) {
  const env = { FAKE_STATE: join(root, 'state'), CLOUDFLARE_API_TOKEN: 'test-token', ...vars };
  const result = fixtures.get(root).run(script, args, { env });
  return {
    ...result,
    cwds: result.calls.map(call => call.split('|')[0]),
    calls: result.calls.map(call => call.slice(call.indexOf('|') + 1)),
  };
}

const preview = (root, args, vars) => run(root, 'cf-preview.sh', args, vars);
const copyInto = (root, into = join(root, 'out')) => run(root, 'mini-dashboard.mjs', ['--into', into]);

// Every file under `dir`, relative to it, sorted.
const files = dir => (existsSync(dir)
  ? readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile())
    .map(entry => relative(dir, join(entry.parentPath, entry.name)))
    .sort()
  : []);

// ── The route ───────────────────────────────────────────────────────────────

const assets = { fetch: async request => new Response(`asset ${new URL(request.url).pathname}`) };
const call = (path, routes = {}, env = {}) =>
  handleMiniApp(new Request(`https://app.example${path}`), { ASSETS: assets, ...env }, { tag: 'ctx' }, routes);

test('the route prefix is /apps/', () => {
  assert.equal(MINI_PREFIX, '/apps/');
});

test('an API path goes to its app, with the app database and no other binding', async () => {
  const seen = [];
  const routes = { tips: { fetch: (request, env, ctx) => { seen.push({ path: new URL(request.url).pathname, env, ctx }); return new Response('tips api'); } } };
  const env = { DB: 'the-db', MEMORY_DB: 'memory', MEMORY_BUCKET: 'transcripts' };

  for (const path of ['/apps/tips/api/split', '/apps/tips/api']) {
    assert.equal(await (await call(path, routes, env)).text(), 'tips api', path);
  }
  assert.deepEqual(seen.map(s => s.path), ['/apps/tips/api/split', '/apps/tips/api']);
  assert.deepEqual(seen[0].env, { DB: 'the-db' });
  assert.deepEqual(seen[0].ctx, { tag: 'ctx' });
});

test('every other /apps/ path is a static asset', async () => {
  const routes = { tips: { fetch: () => new Response('tips api') } };
  for (const path of ['/apps/', '/apps/tips/', '/apps/tips/apiary', '/apps/nothing/api/x', '/apps/constructor/api/x']) {
    assert.equal(await (await call(path, routes)).text(), `asset ${path}`, path);
  }
});

test('source files and a bad path are never served', async () => {
  for (const path of ['/apps/tips/api.mjs', '/apps/tips/tip.test.mjs', '/apps/tips/worker.ts', '/apps/%E0%A4%A']) {
    const response = await call(path);
    assert.equal(response.status, 404, path);
    assert.equal(await response.text(), 'Not found', path);
  }
});

// ── The copy into the build ─────────────────────────────────────────────────

test('the copy lists every app sorted by folder, with its text escaped, as a page and as data', t => {
  const root = miniRepo(t, {
    apps: {
      zeta: app('<Zeta> & "Co"', "Zeta's app"),
      alpha: app('Alpha', 'Runs <script>alert(1)</script>'),
      'mid-2': app('Mid', 'In the middle'),
    },
  });
  const result = copyInto(root);
  assert.equal(result.status, 0, result.out);
  const html = read(join(root, 'out/apps/index.html'));
  const links = [...html.matchAll(/href="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(links, ['./alpha/', './hello/', './mid-2/', './zeta/']);
  assert.match(html, /&lt;Zeta&gt; &amp; &quot;Co&quot;/);
  assert.match(html, /Zeta&#39;s app/);
  assert.match(html, /Runs &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /name="viewport"/);

  const data = JSON.parse(read(join(root, 'out/apps/apps.json')));
  assert.deepEqual(data.map(entry => entry.href), ['/apps/alpha/', '/apps/hello/', '/apps/mid-2/', '/apps/zeta/']);
  assert.deepEqual(data[3], { name: 'zeta', title: '<Zeta> & "Co"', description: "Zeta's app", href: '/apps/zeta/' });

  const first = { html, json: read(join(root, 'out/apps/apps.json')) };
  assert.equal(copyInto(root, join(root, 'again')).status, 0);
  assert.deepEqual({ html: read(join(root, 'again/apps/index.html')), json: read(join(root, 'again/apps/apps.json')) }, first,
    'the same folders must write the same bytes');
});

test('the copy takes the pages and leaves every handler, test, and source file out', t => {
  const root = miniRepo(t, {
    apps: {
      tips: app('Tips', 'Split a bill', {
        'index.html': '<p>tips</p>',
        'tip.mjs': 'export const tip = 1;\n',
        'tip.test.mjs': 'test();\n',
        'api.mjs': 'export default {};\n',
        'types.ts': 'export type T = 1;\n',
        '.env': 'SECRET=1\n',
      }),
    },
  });
  assert.equal(copyInto(root).status, 0);
  assert.deepEqual(files(join(root, 'out/apps')), [
    'apps.json', 'hello/app.json', 'hello/index.html', 'index.html', 'tips/app.json', 'tips/index.html', 'tips/tip.mjs',
  ]);
});

test('with no apps the list says so', t => {
  const root = miniRepo(t);
  rmSync(join(root, 'mini-apps/apps/hello'), { recursive: true });
  const result = copyInto(root);
  assert.equal(result.status, 0, result.out);
  assert.match(read(join(root, 'out/apps/index.html')), /No mini apps yet\. Ask the agent to make one\./);
  assert.equal(read(join(root, 'out/apps/apps.json')), '[]\n');
});

test('a bad manifest fails, names the folder, and writes nothing', t => {
  const cases = {
    'no-title': { 'app.json': JSON.stringify({ description: 'No title here' }) },
    'blank-description': app('Blank', '   '),
    'no-manifest': { 'index.html': '<p>hi</p>' },
    'bad-json': { 'app.json': '{ title: nope' },
    Bad_Name: app('Bad', 'Upper case and an underscore'),
  };
  for (const [name, appFiles] of Object.entries(cases)) {
    const root = miniRepo(t, { apps: { [name]: appFiles } });
    const result = copyInto(root);
    assert.equal(result.status, 1, `${name}: ${result.out}`);
    assert.match(result.stderr, new RegExp(`mini-apps/apps/${name}:`), result.stderr);
    assert.deepEqual(files(join(root, 'out')), [], `${name}: nothing may be written`);
  }
  const root = miniRepo(t, { apps: { 'no-title': cases['no-title'] } });
  assert.match(copyInto(root).stderr, /needs a "title"/);
});

test('a second copy replaces the first, so a removed app is gone', t => {
  const root = miniRepo(t, { apps: { tips: app('Tips', 'Split a bill') } });
  assert.equal(copyInto(root).status, 0);
  rmSync(join(root, 'mini-apps/apps/tips'), { recursive: true });
  assert.equal(copyInto(root).status, 0);
  assert.deepEqual(files(join(root, 'out/apps')), ['apps.json', 'hello/app.json', 'hello/index.html', 'index.html']);
});

test('the copy script follows the CLI conventions', t => {
  const root = miniRepo(t);
  const help = run(root, 'mini-dashboard.mjs', ['--help']);
  assert.equal(help.status, 0);
  assert.match(help.out, /usage/);
  assert.equal(run(root, 'mini-dashboard.mjs', ['--no-such-flag']).status, 2);
  assert.equal(run(root, 'mini-dashboard.mjs', []).status, 2, '--into is required');
});

// ── The build ───────────────────────────────────────────────────────────────

test('cf-build copies the mini apps into the assets folder the build wrote', t => {
  const root = miniRepo(t);
  const result = run(root, 'cf-build.sh');
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['npm run build:app']);
  assert.deepEqual(files(join(root, 'app/dist/client/apps')), ['apps.json', 'hello/app.json', 'hello/index.html', 'index.html']);

  rmSync(join(root, 'mini-apps'), { recursive: true });
  rmSync(join(root, 'app/dist'), { recursive: true });
  assert.equal(run(root, 'cf-build.sh').status, 0, 'a repo with no mini apps builds as before');
  assert.equal(existsSync(join(root, 'app/dist/client/apps')), false);
});

// ── The preview from the agent host ─────────────────────────────────────────

test('preview refuses the default branch and uploads nothing', t => {
  const root = miniRepo(t, { branch: 'main' });
  const result = preview(root, []);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /'main' is the default branch/);
  assert.deepEqual(result.calls, []);
});

test('preview with --alias uploads under that alias, even on the default branch', t => {
  const root = miniRepo(t, { branch: 'main', stagingExists: true });
  const result = preview(root, ['--alias', 'Mini/Tips']);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.calls.at(-1), 'npx wrangler versions upload --preview-alias mini-tips');
  assert.equal(preview(root, ['--alias', '///']).status, 2, 'an alias with no usable characters is a usage error');
  assert.equal(preview(root, ['--nope']).status, 2);
});

test('preview migrates staging, builds for staging with the mini apps, and uploads once', t => {
  const root = miniRepo(t, { stagingExists: true });
  const result = preview(root, []);
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, [
    'npx wrangler d1 migrations apply demo-db-staging --remote --env staging',
    'npm run build:app',
    'npx wrangler versions upload --preview-alias mini-tips',
  ]);
  assert.ok(result.cwds.every(cwd => cwd === 'app'), result.cwds.join(' '));
  assert.match(read(join(root, 'app/dist/demo-staging/wrangler.json')), /"demo-staging"/, 'the build selected staging');
  assert.ok(existsSync(join(root, 'app/dist/client/apps/hello/index.html')), 'the mini apps are in the build');
  assert.match(result.out, /preview URL https:\/\/mini-tips-demo-staging\.example\.workers\.dev/);
  assert.doesNotMatch(result.calls.join('\n'), /wrangler deploy/);
});

test('preview installs the app first when it has no node_modules', t => {
  const root = miniRepo(t, { installed: false, stagingExists: true });
  const result = preview(root, []);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.calls[0], 'npm ci');
  assert.equal(preview(root, []).calls.includes('npm ci'), false, 'installed once');
});

test('preview creates the staging Worker only when it is missing', t => {
  const root = miniRepo(t);
  const first = preview(root, []);
  assert.equal(first.status, 0, first.out);
  assert.deepEqual(first.calls.slice(2), [
    'npx wrangler versions upload --preview-alias mini-tips',
    'npx wrangler deploy',
    'npx wrangler versions upload --preview-alias mini-tips',
  ]);
  const again = preview(root, []);
  assert.equal(again.status, 0, again.out);
  assert.ok(!again.calls.some(entry => entry.startsWith('npx wrangler deploy')), again.calls.join('\n'));
});

test('preview that can not run here says why in one line and exits 3', t => {
  const noToken = preview(miniRepo(t), [], { CLOUDFLARE_API_TOKEN: undefined });
  assert.equal(noToken.status, 3, noToken.out);
  assert.match(noToken.stderr, /no CLOUDFLARE_API_TOKEN/);
  assert.deepEqual(noToken.calls, []);

  const noConfig = preview(miniRepo(t, { config: null }), []);
  assert.equal(noConfig.status, 3, noConfig.out);
  assert.match(noConfig.stderr, /not set up for Cloudflare yet/);

  const placeholders = preview(miniRepo(t, { config: mainConfig().replaceAll('"demo', '"<your-worker>') }), []);
  assert.equal(placeholders.status, 3, placeholders.out);
  assert.match(placeholders.stderr, /<placeholders>/);
  assert.deepEqual(placeholders.calls, []);
});

test('preview fails closed when staging points at production', t => {
  const sameWorker = preview(miniRepo(t, { config: mainConfig({ name: 'demo' }) }), []);
  assert.equal(sameWorker.status, 1, sameWorker.out);
  assert.match(sameWorker.out, /resolves to the production Worker 'demo'/);
  assert.deepEqual(sameWorker.calls, []);

  const sameDb = mainConfig({ d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'x' }] });
  const sharedDb = preview(miniRepo(t, { config: sameDb }), []);
  assert.equal(sharedDb.status, 1, sharedDb.out);
  assert.match(sharedDb.out, /binds the production database 'demo-db'/);
  assert.deepEqual(sharedDb.calls, []);

  const built = preview(miniRepo(t, { stagingExists: true }), [], { FAKE_BUILD_NAME: 'demo' });
  assert.equal(built.status, 1, built.out);
  assert.match(built.out, /the build produced the production Worker's config/);
  assert.ok(!built.calls.some(entry => entry.includes('versions upload')), built.calls.join('\n'));
});
