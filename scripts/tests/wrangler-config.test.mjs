import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  assetsDirectory, databaseName, deployedWorkerName, hasD1, parseConfig, workerName, WranglerConfigError,
} from '../lib-wrangler-config.mjs';
import { logger, pack, REPO as repo } from './fixtures/pack.mjs';

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('wrangler-config tests need bash on PATH');

const LIB = ['lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];

// env.staging lists its database before its name, and a comment above the real
// block mentions "staging": — both fooled the old regex reads.
const tricky = `{
  // "staging": { "name": "from-a-comment", "database_name": "from-a-comment" }
  "name": "demo",
  "d1_databases": [{ "binding": "DB", "database_name": "demo-db", "database_id": "prod-id" }],
  "env": {
    "staging": {
      "d1_databases": [{ "binding": "DB", "database_name": "demo-db-staging", "database_id": "staging-id" }],
      "name": "demo-staging",
    },
  },
}
`;
const noD1 = '{ "name": "demo", "env": { "staging": { "name": "demo-staging" } } }';
const stagingWithoutD1 = '{ "name": "demo", "d1_databases": [{ "database_name": "demo-db" }], "env": { "staging": { "name": "demo-staging" } } }';
// Staging names production's Worker and database, after its own d1 entry.
const pointsAtProduction = `{
  "name": "demo",
  "d1_databases": [{ "binding": "DB", "database_name": "demo-db" }],
  "env": { "staging": { "d1_databases": [{ "binding": "DB", "database_name": "demo-db" }], "name": "demo" } }
}`;

// The same shape as the stack-pack wrangler.jsonc fragment.
const deployConfig = `{
  "name": "demo",
  "main": "worker/index.ts",
  "compatibility_date": "2026-09-25",
  "d1_databases": [
    { "binding": "DB", "database_name": "demo-db", "database_id": "prod-id", "migrations_dir": "../schema/migrations" }
  ],
  "env": {
    "staging": {
      "name": "demo-staging",
      "d1_databases": [
        { "binding": "DB", "database_name": "demo-db-staging", "database_id": "staging-id", "migrations_dir": "../schema/migrations" }
      ]
    }
  }
}
`;

// A fake npx and npm that only log each call.
const loggers = { npx: logger('npx '), npm: logger('npm ') };

// A fake `npx` for cf-deploy logs one line per call. For `wrangler versions
// upload` it prints a version URL first and the alias URL second, like real
// wrangler. DEPLOY_FAIL makes `wrangler deploy` fail.
const deployNpx = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$1 $2 $3" in
  "wrangler versions upload")
    echo "Uploaded demo-staging"
    echo "Version Preview URL: https://0a1b2c3d-demo-staging.example.workers.dev"
    echo "Version Preview Alias URL: https://feature-x-demo-staging.example.workers.dev"
    ;;
  "wrangler deploy"*)
    [ -n "\${DEPLOY_FAIL:-}" ] && { echo "Authentication error" >&2; exit 1; }
    echo "Deployed triggers"
    echo "  https://demo.example.workers.dev"
    ;;
esac
exit 0
`;

// Runs `script` in a throwaway repo with `config` on `branch`.
function runIn(t, config, script, branch) {
  const scripts = ['cf-build.sh', 'reset-staging-d1.mjs', ...LIB];
  return pack(t, { scripts, config, tools: loggers, prefix: 'wrangler-config-' })
    .run(script, [], { env: { CF_BRANCH: branch, CF_PRODUCTION_BRANCH: 'main' } });
}

// Runs cf-deploy on `branch` and returns the exit status, output, recorded npx
// calls, and GITHUB_OUTPUT. `generated` fakes a plugin build that named that
// Worker. `env` adds to the script's environment.
function deploy(t, { branch, generated, config = deployConfig, env = {} } = {}) {
  const fixture = pack(t, { scripts: ['cf-deploy.sh', ...LIB], config, tools: { npx: deployNpx }, prefix: 'cf-deploy-' });
  if (generated) {
    // What @cloudflare/vite-plugin leaves behind: a redirect to a flattened config.
    fixture.write('app/.wrangler/deploy/config.json', '{ "configPath": "../../dist/demo/wrangler.json" }');
    fixture.write('app/dist/demo/wrangler.json', JSON.stringify({ name: generated, main: 'index.js' }));
  }
  const output = join(fixture.dir, 'github-output');
  const result = fixture.run('cf-deploy.sh', [], { env: { GITHUB_OUTPUT: output, CF_BRANCH: branch, CF_PRODUCTION_BRANCH: 'main', ...env } });
  return { ...result, github: existsSync(output) ? readFileSync(output, 'utf8') : '' };
}

function configFile(t, text, name = 'wrangler.jsonc') {
  const dir = mkdtempSync('/tmp/wrangler-config-');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, name), text);
  return join(dir, name);
}

test('a database listed before the name and a commented "staging": do not fool the reads', t => {
  const config = parseConfig(configFile(t, tricky));
  assert.equal(workerName(config), 'demo');
  assert.equal(workerName(config, 'staging'), 'demo-staging');
  assert.equal(databaseName(config), 'demo-db');
  assert.equal(databaseName(config, 'staging'), 'demo-db-staging');
});

test('the memory database is never read as the app database, in any order', t => {
  const config = parseConfig(configFile(t, '{ "name": "demo", "d1_databases": [{ "binding": "MEMORY_DB", "database_name": "demo-memory" }, { "binding": "DB", "database_name": "demo-db" }] }'));
  assert.equal(databaseName(config), 'demo-db');
  const memoryOnly = parseConfig(configFile(t, '{ "name": "demo", "d1_databases": [{ "binding": "MEMORY_DB", "database_name": "demo-memory" }] }'));
  assert.equal(hasD1(memoryOnly), false);
  assert.throws(() => databaseName(memoryOnly), WranglerConfigError);
});

test('an environment without a name gets wrangler\'s default', () => {
  assert.equal(workerName({ name: 'demo', env: { staging: {} } }, 'staging'), 'demo-staging');
});

test('a config with no D1 reports none and names no database', () => {
  const config = JSON.parse(noD1);
  assert.equal(hasD1(config), false);
  assert.equal(hasD1(config, 'staging'), false);
  assert.throws(() => databaseName(config, 'staging'), WranglerConfigError);
});

test('a TOML config is refused with the supported names', t => {
  assert.throws(() => parseConfig(configFile(t, 'name = "demo"\n', 'wrangler.toml')), /wrangler\.jsonc or wrangler\.json/);
});

test('the staging name comes from the redirected build config; production never does', t => {
  const path = configFile(t, tricky);
  const app = dirname(path);
  mkdirSync(join(app, '.wrangler/deploy'), { recursive: true });
  writeFileSync(join(app, '.wrangler/deploy/config.json'), '{ "configPath": "../../dist/demo/wrangler.json" }');
  mkdirSync(join(app, 'dist/demo'), { recursive: true });
  writeFileSync(join(app, 'dist/demo/wrangler.json'), JSON.stringify({ name: 'from-the-build' }));
  assert.equal(deployedWorkerName(path, 'staging'), 'from-the-build');
  assert.equal(deployedWorkerName(path), 'demo');
});

test('the default branch deploys the production Worker and uploads no alias', t => {
  const run = deploy(t, { branch: 'main', env: { GITHUB_REPOSITORY: 'ana/demo' } });
  assert.equal(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy --var GITHUB_REPOSITORY:ana/demo']);
  assert.ok(!run.calls.some(call => call.includes('versions upload')), 'production uploads no preview alias');
  assert.equal(run.github, '');
});

test('production with no repository to name deploys with no var, and staging never gets one', t => {
  const run = deploy(t, { branch: 'main', env: { GITHUB_REPOSITORY: '' } });
  assert.equal(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy']);
  const staging = deploy(t, { branch: 'feature/x', env: { GITHUB_REPOSITORY: 'ana/demo' } });
  assert.ok(!staging.calls.some(call => call.includes('GITHUB_REPOSITORY')), staging.calls.join('\n'));
});

test('a feature branch deploys only to staging and publishes the alias URL', t => {
  const run = deploy(t, { branch: 'feature/x' });
  assert.equal(run.status, 0, run.out);
  assert.ok(run.calls.length > 0, 'no wrangler call was recorded');
  for (const call of run.calls) assert.match(call, /--env staging/, `not aimed at staging: ${call}`);
  assert.ok(run.calls.includes('wrangler deploy --env staging'), run.calls.join('\n'));
  assert.ok(run.calls.includes('wrangler versions upload --env staging --preview-alias feature-x'), run.calls.join('\n'));
  assert.ok(run.calls.indexOf('wrangler deploy --env staging') < run.calls.findIndex(call => call.includes('versions upload')),
    'the staging Worker must be deployed before a version is uploaded');
  assert.equal(run.github, 'preview-url=https://feature-x-demo-staging.example.workers.dev\n');
  assert.match(run.out, /preview URL https:\/\/feature-x-demo-staging\.example\.workers\.dev/);
});

const alias = (...args) => spawnSync('bash', ['-c', 'source "$0"; wong_preview_alias "$@"', join(repo, 'scripts/lib-wrangler-config.sh'), ...args], { encoding: 'utf8' }).stdout.trim();

test('a preview alias starts with a letter and leaves room for the Worker name', () => {
  assert.equal(alias('feat/Add_Thing'), 'feat-add-thing');
  assert.equal(alias('123-fix'), 'b-123-fix');
  assert.equal(alias('x'.repeat(80)).length, 63);
  const fitted = alias(`explore/${'long-'.repeat(15)}end`, 'demo-staging');
  assert.equal(`${fitted}-demo-staging`.length <= 63, true, fitted);
  assert.doesNotMatch(fitted, /-$/);
  assert.equal(alias('feature', 'w'.repeat(62)), '');
});

test('a long branch uploads an alias that fits beside the staging Worker name', t => {
  const run = deploy(t, { branch: `explore/${'long-'.repeat(15)}end` });
  assert.equal(run.status, 0, run.out);
  const upload = run.calls.find(call => call.includes('versions upload'));
  const used = upload.match(/--preview-alias (\S+)/)[1];
  assert.ok(`${used}-demo-staging`.length <= 63, used);
});

test('a plugin build that already chose staging drops --env and still deploys staging', t => {
  const run = deploy(t, { branch: 'feature/x', generated: 'demo-staging' });
  assert.equal(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy', 'wrangler versions upload --preview-alias feature-x']);
  assert.equal(run.github, 'preview-url=https://feature-x-demo-staging.example.workers.dev\n');
});

test('a failed staging deploy stops before any alias upload or published URL', t => {
  const run = deploy(t, { branch: 'feature/x', env: { DEPLOY_FAIL: '1' } });
  assert.notEqual(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy --env staging']);
  assert.equal(run.github, '');
  assert.doesNotMatch(run.out, /preview URL/);
});

// Both ways staging can land on production: the source config names it, or the
// build's generated config does.
test('cf-deploy refuses a staging environment that names the production Worker', t => {
  for (const [name, options] of [['source config', { config: pointsAtProduction }], ['build', { generated: 'demo' }]]) {
    const result = deploy(t, { branch: 'feature/x', ...options });
    assert.equal(result.status, 1, `${name}: ${result.out}`);
    assert.match(result.out, /resolves to the[\s\S]*production Worker 'demo'/, name);
    assert.deepEqual(result.calls, [], `${name}: nothing may be deployed or uploaded`);
    assert.equal(result.github, '', name);
  }
});

test('cf-build migrates the staging database read from the real staging block', t => {
  const result = runIn(t, tricky, 'cf-build.sh', 'feature/x');
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['npx wrangler d1 migrations apply demo-db-staging --remote --env staging', 'npm run build:app']);
});

test('cf-build builds a Worker with no D1 without a migration', t => {
  for (const branch of ['main', 'feature/x']) {
    const result = runIn(t, noD1, 'cf-build.sh', branch);
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(result.calls, ['npm run build:app'], branch);
  }
});

test('cf-build stops when production binds D1 and staging does not', t => {
  const result = runIn(t, stagingWithoutD1, 'cf-build.sh', 'feature/x');
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /needs its own d1_databases entry/);
  assert.deepEqual(result.calls, []);
});

test('the staging reset refuses the production database and drops nothing', t => {
  const result = runIn(t, pointsAtProduction, 'reset-staging-d1.mjs');
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /names the production database 'demo-db'/);
  assert.deepEqual(result.calls, [], 'no wrangler call may run');
});

test('the assets folder comes from the redirected build config, else the source config', t => {
  const path = configFile(t, tricky);
  const app = dirname(path);
  assert.throws(() => assetsDirectory(path), WranglerConfigError, 'no build and no assets.directory');

  writeFileSync(path, '{ "name": "demo", "assets": { "directory": "./public" } }');
  assert.equal(assetsDirectory(path), join(app, 'public'));

  mkdirSync(join(app, '.wrangler/deploy'), { recursive: true });
  writeFileSync(join(app, '.wrangler/deploy/config.json'), '{ "configPath": "../../dist/demo/wrangler.json" }');
  mkdirSync(join(app, 'dist/demo'), { recursive: true });
  writeFileSync(join(app, 'dist/demo/wrangler.json'), JSON.stringify({ name: 'demo', assets: { directory: '../client' } }));
  assert.equal(assetsDirectory(path), join(app, 'dist/client'));
});

// Once `run_worker_first` is a list, a path left out of it gets the single-page
// fallback, and a POST there answers 405 without reaching the Worker. 24.0.0
// listed only /apps/* and broke /_memory/ and /api/ in production.
test('the Worker runs first for every route it serves, in the app config and its fragment', () => {
  const routes = ['/api/*', '/_memory/*', '/apps/*'];
  const app = parseConfig(join(repo, 'app/wrangler.jsonc'));
  assert.deepEqual([...app.assets.run_worker_first].sort(), [...routes].sort());

  const fragments = readFileSync(join(repo, '.agents/skills/wong-sync/references/stack-pack-fragments.md'), 'utf8');
  const listed = /"run_worker_first":\s*(\[[^\]]*\])/.exec(fragments)?.[1];
  assert.ok(listed, 'the wrangler.jsonc fragment sets run_worker_first');
  assert.deepEqual(JSON.parse(listed).sort(), [...routes].sort());
});

// Without this flag, `import { env } from "cloudflare:workers"` hands a mini app every binding, memory's too.
test('the app config and its fragment turn off importable bindings', () => {
  assert.ok(parseConfig(join(repo, 'app/wrangler.jsonc')).compatibility_flags.includes('disallow_importable_env'));
  const fragments = readFileSync(join(repo, '.agents/skills/wong-sync/references/stack-pack-fragments.md'), 'utf8');
  const flags = /"compatibility_flags":\s*(\[[^\]]*\])/.exec(fragments)?.[1];
  assert.ok(flags, 'the wrangler.jsonc fragment sets compatibility_flags');
  assert.ok(JSON.parse(flags).includes('disallow_importable_env'));
});
