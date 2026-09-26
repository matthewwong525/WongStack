import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  databaseName, deployedWorkerName, hasD1, parseConfig, workerName, WranglerConfigError,
} from '../lib-wrangler-config.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

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

// A throwaway repo: the pack scripts, `app/wrangler.jsonc`, and a fake npx and
// npm that log each call.
function repoWith(t, config) {
  const root = mkdtempSync('/tmp/wrangler-config-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  for (const name of ['cf-build.sh', 'cf-deploy.sh', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'reset-staging-d1.mjs', 'lib-cli.mjs']) {
    copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));
  }
  mkdirSync(join(root, 'app'));
  writeFileSync(join(root, 'app/wrangler.jsonc'), config);
  const bin = join(root, 'bin');
  mkdirSync(bin);
  for (const tool of ['npx', 'npm']) {
    writeFileSync(join(bin, tool), `#!/usr/bin/env bash\necho "${tool} $*" >> "$FAKE_LOG"\n`);
    chmodSync(join(bin, tool), 0o755);
  }
  return root;
}

function run(root, command, args, branch) {
  const log = join(root, 'calls.log');
  const env = { PATH: `${join(root, 'bin')}:${process.env.PATH}`, HOME: root, FAKE_LOG: log, CF_BRANCH: branch, CF_PRODUCTION_BRANCH: 'main' };
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', env });
  return {
    status: result.status,
    out: `${result.stdout}${result.stderr}`,
    calls: existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean) : [],
  };
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

test('cf-deploy refuses a staging environment that names the production Worker', t => {
  const result = run(repoWith(t, pointsAtProduction), 'bash', ['scripts/cf-deploy.sh'], 'feature/x');
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /production Worker 'demo'/);
  assert.deepEqual(result.calls, [], 'nothing may be deployed');
});

test('cf-build migrates the staging database read from the real staging block', t => {
  const result = run(repoWith(t, tricky), 'bash', ['scripts/cf-build.sh'], 'feature/x');
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, ['npx wrangler d1 migrations apply demo-db-staging --remote --env staging', 'npm run build:app']);
});

test('cf-build builds a Worker with no D1 without a migration', t => {
  for (const branch of ['main', 'feature/x']) {
    const result = run(repoWith(t, noD1), 'bash', ['scripts/cf-build.sh'], branch);
    assert.equal(result.status, 0, result.out);
    assert.deepEqual(result.calls, ['npm run build:app'], branch);
  }
});

test('cf-build stops when production binds D1 and staging does not', t => {
  const result = run(repoWith(t, stagingWithoutD1), 'bash', ['scripts/cf-build.sh'], 'feature/x');
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /needs its own d1_databases entry/);
  assert.deepEqual(result.calls, []);
});

test('the staging reset refuses the production database and drops nothing', t => {
  const result = run(repoWith(t, pointsAtProduction), process.execPath, ['scripts/reset-staging-d1.mjs']);
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /names the production database 'demo-db'/);
  assert.deepEqual(result.calls, [], 'no wrangler call may run');
});

test('the shell resolver never takes the mini-app Worker config for the main app', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-resolve-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['mini-apps', 'web']) {
    mkdirSync(join(root, dir));
    writeFileSync(join(root, dir, 'wrangler.jsonc'), '{ "name": "x" }\n');
  }
  const lib = fileURLToPath(new URL('../lib-wrangler-config.sh', import.meta.url));
  const result = spawnSync('bash', ['-c', `source "${lib}" && wong_resolve_wrangler_config "$1" && echo "$WRANGLER_CONFIG"`, 'resolve', root], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), join(root, 'web', 'wrangler.jsonc'));
});
