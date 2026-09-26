import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const bash = spawnSync('bash', ['--version']);
if (bash.error || bash.status !== 0) throw new Error('cf-deploy tests need bash on PATH');

// The same shape as the stack-pack wrangler.jsonc fragment.
const config = `{
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

// A fake `npx` logs one line per call. For `wrangler versions upload` it
// prints a version URL first and the alias URL second, like real wrangler.
const fakeNpx = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_NPX_LOG"
case "$1 $2 $3" in
  "wrangler versions upload")
    echo "Uploaded demo-staging"
    echo "Version Preview URL: https://0a1b2c3d-demo-staging.example.workers.dev"
    echo "Version Preview Alias URL: https://feature-x-demo-staging.example.workers.dev"
    ;;
  "wrangler deploy"*)
    echo "Deployed triggers"
    echo "  https://demo.example.workers.dev"
    ;;
esac
exit 0
`;

// Builds a throwaway repo with the deploy script, runs it on `branch`, and
// returns the exit status, output, recorded npx calls, and GITHUB_OUTPUT.
function deploy(t, { branch, generated } = {}) {
  const root = mkdtempSync('/tmp/cf-deploy-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  for (const name of ['cf-deploy.sh', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs']) {
    copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));
  }
  mkdirSync(join(root, 'app'));
  writeFileSync(join(root, 'app/wrangler.jsonc'), config);
  if (generated) {
    // What @cloudflare/vite-plugin leaves behind: a redirect to a flattened config.
    mkdirSync(join(root, 'app/.wrangler/deploy'), { recursive: true });
    writeFileSync(join(root, 'app/.wrangler/deploy/config.json'), '{ "configPath": "../../dist/demo/wrangler.json" }');
    mkdirSync(join(root, 'app/dist/demo'), { recursive: true });
    writeFileSync(join(root, 'app/dist/demo/wrangler.json'), JSON.stringify({ name: generated, main: 'index.js' }));
  }
  const bin = join(root, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), fakeNpx);
  chmodSync(join(bin, 'npx'), 0o755);
  const log = join(root, 'npx.log');
  const output = join(root, 'github-output');
  const env = {
    PATH: `${bin}:${process.env.PATH}`,
    HOME: root,
    FAKE_NPX_LOG: log,
    GITHUB_OUTPUT: output,
    CF_BRANCH: branch,
    CF_PRODUCTION_BRANCH: 'main',
  };
  const result = spawnSync('bash', [join(root, 'scripts/cf-deploy.sh')], { cwd: root, encoding: 'utf8', env });
  assert.equal(result.error, undefined, `bash failed to start: ${result.error}`);
  const read = path => (existsSync(path) ? readFileSync(path, 'utf8') : '');
  return {
    status: result.status,
    out: `${result.stdout}${result.stderr}`,
    calls: read(log).split('\n').filter(Boolean),
    github: read(output),
  };
}

test('the default branch deploys the production Worker and uploads no alias', t => {
  const run = deploy(t, { branch: 'main' });
  assert.equal(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy']);
  assert.ok(!run.calls.some(call => call.includes('versions upload')), 'production uploads no preview alias');
  assert.equal(run.github, '');
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

test('a plugin build that already chose staging drops --env and still deploys staging', t => {
  const run = deploy(t, { branch: 'feature/x', generated: 'demo-staging' });
  assert.equal(run.status, 0, run.out);
  assert.deepEqual(run.calls, ['wrangler deploy', 'wrangler versions upload --preview-alias feature-x']);
  assert.equal(run.github, 'preview-url=https://feature-x-demo-staging.example.workers.dev\n');
});

test('a feature branch whose build resolves to the production Worker is refused', t => {
  const run = deploy(t, { branch: 'feature/x', generated: 'demo' });
  assert.notEqual(run.status, 0, run.out);
  assert.match(run.out, /resolves to the[\s\S]*production Worker 'demo'/);
  assert.deepEqual(run.calls, [], 'nothing may be deployed or uploaded');
  assert.equal(run.github, '');
});
