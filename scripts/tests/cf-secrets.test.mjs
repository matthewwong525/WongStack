import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Runs `check` in a throwaway repo root with only a wrangler config. Without
// CLOUDFLARE_API_TOKEN the secret half skips, so only the binding half runs.
function check(t, config) {
  const root = mkdtempSync('/tmp/cf-secrets-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'scripts'));
  mkdirSync(join(root, 'app'));
  for (const name of ['cf-secrets.mjs', 'lib-wrangler-config.mjs']) {
    copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));
  }
  writeFileSync(join(root, 'app/wrangler.jsonc'), JSON.stringify({ name: 'app', ...config }, null, 2));
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  const result = spawnSync(process.execPath, [join(root, 'scripts/cf-secrets.mjs'), 'check'], { cwd: root, encoding: 'utf8', env });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

const queues = (producer, consumers) => ({
  producers: [{ binding: 'JOBS', queue: producer }],
  consumers: consumers.map(queue => ({ queue })),
});

test('a correctly twinned queue consumer passes', t => {
  const result = check(t, {
    queues: queues('app-jobs', ['app-jobs']),
    env: { staging: { queues: queues('app-jobs-staging', ['app-jobs-staging']) } },
  });
  assert.equal(result.status, 0, result.output);
});

test('a queue consumer missing from staging fails and names both counts', t => {
  const result = check(t, {
    queues: queues('app-jobs', ['app-jobs']),
    env: { staging: { queues: queues('app-jobs-staging', []) } },
  });
  assert.equal(result.status, 1);
  assert.match(result.output, /declares 0 queue consumer\(s\) but production declares 1/);
});

test('a consumer copied into staging but not repointed warns without failing', t => {
  const result = check(t, {
    queues: queues('app-jobs', ['app-jobs']),
    env: { staging: { queues: queues('app-jobs-staging', ['app-jobs']) } },
  });
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /reads 'app-jobs', which production also consumes/);
});
