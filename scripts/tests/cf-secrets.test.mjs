import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// A repo root with the secrets script, its library, and `app/wrangler.jsonc`.
function scaffold(root, config) {
  mkdirSync(join(root, 'scripts'), { recursive: true });
  mkdirSync(join(root, 'app'));
  for (const name of ['cf-secrets.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs']) {
    copyFileSync(join(repo, 'scripts', name), join(root, 'scripts', name));
  }
  writeFileSync(join(root, 'app/wrangler.jsonc'), JSON.stringify({ name: 'app', ...config }, null, 2));
}

// Runs `check` in a throwaway repo root with only a wrangler config. Without
// CLOUDFLARE_API_TOKEN the secret half skips, so only the binding half runs.
function check(t, config) {
  const root = mkdtempSync('/tmp/cf-secrets-');
  t.after(() => rmSync(root, { recursive: true, force: true }));
  scaffold(root, config);
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

// Push: a primary checkout and one linked worktree, with a fake `npx` that logs
// each call so a test can see which file `wrangler secret bulk` received.
function pushFixture(t) {
  const dir = mkdtempSync('/tmp/cf-secrets-push-');
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const primary = join(dir, 'primary');
  scaffold(primary, { env: { staging: {} } });
  writeFileSync(join(primary, '.gitignore'), '.env*\n.dev.vars*\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: primary, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-qm', 'init');
  const worktree = join(dir, 'wt');
  git('worktree', 'add', '-q', '-b', 'feature', worktree);
  const bin = join(dir, 'bin');
  mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), '#!/usr/bin/env bash\necho "$*" >> "$FAKE_NPX_LOG"\n');
  chmodSync(join(bin, 'npx'), 0o755);
  const log = join(dir, 'npx.log');
  const push = () => {
    const result = spawnSync(process.execPath, [join(worktree, 'scripts/cf-secrets.mjs'), 'push'], {
      cwd: worktree,
      encoding: 'utf8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_NPX_LOG: log },
    });
    const calls = existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n') : [];
    return { status: result.status, output: `${result.stdout}${result.stderr}`, calls };
  };
  return { primary, worktree, push };
}

test('push in a linked worktree with no .dev.vars reads the primary copy', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=1\n');
  const result = push();
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.calls, [
    `wrangler secret bulk ${join(primary, 'app/.dev.vars')}`,
    `wrangler secret bulk ${join(primary, 'app/.dev.vars')} --env staging`,
  ]);
  assert.match(result.output, /reading the primary checkout's/);
});

test('push prefers the worktree copy over the primary copy', t => {
  const { primary, worktree, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=1\n');
  writeFileSync(join(worktree, 'app/.dev.vars'), 'API_KEY=2\n');
  const result = push();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.calls[0], `wrangler secret bulk ${join(worktree, 'app/.dev.vars')}`);
});

test('the staging push reads the primary .dev.vars.staging', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=1\n');
  writeFileSync(join(primary, 'app/.dev.vars.staging'), 'API_KEY=test\n');
  const result = push();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.calls[1], `wrangler secret bulk ${join(primary, 'app/.dev.vars.staging')} --env staging`);
});

test('push with no .dev.vars anywhere stops before any wrangler call', t => {
  const { push } = pushFixture(t);
  const result = push();
  assert.equal(result.status, 1);
  assert.deepEqual(result.calls, []);
  assert.match(result.output, /app\/\.dev\.vars/);
});

test('an account credential in the primary copy is still refused', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'CLOUDFLARE_API_TOKEN=x\n');
  const result = push();
  assert.equal(result.status, 1);
  assert.deepEqual(result.calls, []);
  assert.match(result.output, /CLOUDFLARE_API_TOKEN/);
});
