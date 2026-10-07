import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pack } from './fixtures/pack.mjs';

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('preview tests need bash on PATH');

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
  "ci --no-audit --no-fund") mkdir -p node_modules ;;
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

const PACK = ['cf-preview.sh', 'cf-build.sh', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];

// A throwaway repo on `branch`: the pack scripts and a main app in app/.
// `config: null` leaves out app/wrangler.jsonc.
// Each repo root's pack fixture (fixtures/pack.mjs), which runs its scripts.
const fixtures = new Map();

function previewRepo(t, { branch = 'mini/tips', config = mainConfig(), installed = true, stagingExists = false } = {}) {
  const fixture = pack(t, { scripts: PACK, config, tools: { npm: fakeNpm, npx: fakeNpx }, prefix: 'cf-preview-' });
  fixture.write('scripts/check-private-access.mjs', '// Preview mechanics fixture: provider coverage has separate integration tests.\n');
  const { root } = fixture;
  fixture.write('app/package.json', '{ "scripts": { "build:app": "node fake-build.mjs" } }\n');
  fixture.write('app/fake-build.mjs', fakeBuild);
  if (installed) mkdirSync(join(root, 'app/node_modules'));

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

// ── The build ───────────────────────────────────────────────────────────────

test('cf-build outside CI only builds the app, with nothing copied in after', t => {
  const root = previewRepo(t);
  const result = run(root, 'cf-build.sh');
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['npm run build:app']);
  assert.equal(existsSync(join(root, 'app/dist/client/apps')), false);
});

test('cf-build --types regenerates the binding types from the config and builds nothing', t => {
  const root = previewRepo(t);
  writeFileSync(join(root, 'app/package.json'), '{ "scripts": { "build:app": "node fake-build.mjs" }, "devDependencies": { "typescript": "~7.0.2" } }\n');
  const result = run(root, 'cf-build.sh', ['--types'], { CF_BRANCH: 'mini/tips' });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['npx wrangler types']);
  assert.deepEqual(result.cwds, ['app'], 'wrangler reads the config from its own folder');
  assert.match(result.out, /cf-build: regenerating binding types/);
  assert.equal(existsSync(join(root, 'app/dist')), false);
  // The deploy build regenerates through the same function, before it builds.
  const built = run(root, 'cf-build.sh', [], { CF_BRANCH: 'mini/tips' });
  assert.equal(built.status, 0, built.out);
  const order = ['npx wrangler types', 'npm run build:app'].map(call => built.calls.indexOf(call));
  assert.ok(order[0] > -1 && order[0] < order[1], built.calls.join('\n'));
});

test('cf-build --types skips a repo with no wrangler config, and an app that is not TypeScript', t => {
  const bare = previewRepo(t, { config: null });
  const none = run(bare, 'cf-build.sh', ['--types']);
  assert.equal(none.status, 0, none.out);
  assert.deepEqual(none.calls, []);
  assert.match(none.out, /no wrangler config, so no binding types to regenerate/);
  const plain = run(previewRepo(t), 'cf-build.sh', ['--types']);
  assert.equal(plain.status, 0, plain.out);
  assert.deepEqual(plain.calls, []);
});

// ── The preview from the agent host ─────────────────────────────────────────

test('preview refuses the default branch and uploads nothing', t => {
  const root = previewRepo(t, { branch: 'main' });
  const result = preview(root, []);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /'main' is the default branch/);
  assert.deepEqual(result.calls, []);
});

test('preview names the default branch by CF_PRODUCTION_BRANCH, else the remote\'s default', t => {
  const root = previewRepo(t, { branch: 'trunk', stagingExists: true });
  const env = { PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  execFileSync('git', ['-C', root, 'symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/trunk'], { env });
  const refused = preview(root, []);
  assert.equal(refused.status, 1, refused.out);
  assert.match(refused.out, /'trunk' is the default branch/);
  assert.deepEqual(refused.calls, []);

  const named = preview(root, [], { CF_PRODUCTION_BRANCH: 'main' });
  assert.equal(named.status, 0, `the variable wins: ${named.out}`);
  assert.equal(named.calls.at(-1), 'npx wrangler versions upload --preview-alias trunk');
});

test('preview with --alias uploads under that alias, even on the default branch', t => {
  const root = previewRepo(t, { branch: 'main', stagingExists: true });
  const result = preview(root, ['--alias', 'Mini/Tips']);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.calls.at(-1), 'npx wrangler versions upload --preview-alias mini-tips');
  assert.equal(preview(root, ['--alias', '///']).status, 2, 'an alias with no usable characters is a usage error');
  assert.equal(preview(root, ['--nope']).status, 2);
});

test('preview migrates staging, builds for staging, and uploads once', t => {
  const root = previewRepo(t, { stagingExists: true });
  const result = preview(root, []);
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, [
    'npx wrangler d1 migrations apply demo-db-staging --remote --env staging',
    'npm run build:app',
    'npx wrangler versions upload --preview-alias mini-tips',
  ]);
  assert.ok(result.cwds.every(cwd => cwd === 'app'), result.cwds.join(' '));
  assert.match(read(join(root, 'app/dist/demo-staging/wrangler.json')), /"demo-staging"/, 'the build selected staging');
  assert.match(result.out, /preview URL https:\/\/mini-tips-demo-staging\.example\.workers\.dev/);
  assert.doesNotMatch(result.calls.join('\n'), /wrangler deploy/);
});

test('preview installs the app first when it has no node_modules', t => {
  const root = previewRepo(t, { installed: false, stagingExists: true });
  const result = preview(root, []);
  assert.equal(result.status, 0, result.out);
  assert.equal(result.calls[0], 'npm ci --no-audit --no-fund');
  assert.equal(preview(root, []).calls.some(call => call.startsWith('npm ci')), false, 'installed once');
});

test('preview creates the staging Worker only when it is missing', t => {
  const root = previewRepo(t);
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
  const noToken = preview(previewRepo(t), [], { CLOUDFLARE_API_TOKEN: undefined });
  assert.equal(noToken.status, 3, noToken.out);
  assert.match(noToken.stderr, /no CLOUDFLARE_API_TOKEN/);
  assert.deepEqual(noToken.calls, []);

  const noConfig = preview(previewRepo(t, { config: null }), []);
  assert.equal(noConfig.status, 3, noConfig.out);
  assert.match(noConfig.stderr, /not set up for Cloudflare yet/);

  const placeholders = preview(previewRepo(t, { config: mainConfig().replaceAll('"demo', '"<your-worker>') }), []);
  assert.equal(placeholders.status, 3, placeholders.out);
  assert.match(placeholders.stderr, /<placeholders>/);
  assert.deepEqual(placeholders.calls, []);
});

test('preview fails closed when staging points at production', t => {
  const sameWorker = preview(previewRepo(t, { config: mainConfig({ name: 'demo' }) }), []);
  assert.equal(sameWorker.status, 1, sameWorker.out);
  assert.match(sameWorker.out, /resolves to the production Worker 'demo'/);
  assert.match(sameWorker.out, /env\.staging needs its own "name"[\s\S]*CLOUDFLARE_ENV=staging/, 'both fixes');
  assert.deepEqual(sameWorker.calls, []);

  const sameDb = mainConfig({ d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'x' }] });
  const sharedDb = preview(previewRepo(t, { config: sameDb }), []);
  assert.equal(sharedDb.status, 1, sharedDb.out);
  assert.match(sharedDb.out, /binds the production database 'demo-db'/);
  assert.deepEqual(sharedDb.calls, []);

  const sameId = mainConfig({ d1_databases: [{ binding: 'DB', database_name: 'renamed', database_id: 'demo-db-id' }] });
  const sharedId = preview(previewRepo(t, { config: sameId, stagingExists: true }), []);
  assert.equal(sharedId.status, 1, sharedId.out);
  assert.match(sharedId.out, /binds the production database 'demo-db' \(same database_id\)/);
  assert.deepEqual(sharedId.calls, [], 'a renamed entry with production\'s id migrates, builds, and uploads nothing');

  const built = preview(previewRepo(t, { stagingExists: true }), [], { FAKE_BUILD_NAME: 'demo' });
  assert.equal(built.status, 1, built.out);
  assert.match(built.out, /the build produced the production Worker's config/);
  assert.ok(!built.calls.some(entry => entry.includes('versions upload')), built.calls.join('\n'));
});
