import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger, pack } from './fixtures/pack.mjs';

// A throwaway repo with the secrets script, its library, and `app/wrangler.jsonc`.
const scaffold = (t, config, options) => pack(t, {
  scripts: ['cf-secrets.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs'],
  config: JSON.stringify({ name: 'app', ...config }, null, 2),
  ...options,
});

// Runs `check` in a throwaway repo root with only a wrangler config. Without
// CLOUDFLARE_API_TOKEN the secret half skips, so only the binding half runs.
function check(t, config) {
  const result = scaffold(t, config, { prefix: 'cf-secrets-' }).run('cf-secrets.mjs', ['check']);
  return { status: result.status, output: result.out };
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

test('the memory bindings are production-only; any other untwinned binding still fails', t => {
  const memoryOnly = check(t, {
    d1_databases: [{ binding: 'DB', database_name: 'app-db' }, { binding: 'MEMORY_DB', database_name: 'app-memory' }],
    r2_buckets: [{ binding: 'MEMORY_BUCKET', bucket_name: 'app-memory' }],
    env: { staging: { d1_databases: [{ binding: 'DB', database_name: 'app-db-staging' }] } },
  });
  assert.equal(memoryOnly.status, 0, memoryOnly.output);
  const untwinned = check(t, {
    r2_buckets: [{ binding: 'MEMORY_BUCKET', bucket_name: 'app-memory' }, { binding: 'UPLOADS', bucket_name: 'app-uploads' }],
    env: { staging: {} },
  });
  assert.equal(untwinned.status, 1);
  assert.match(untwinned.output, /binding 'UPLOADS' is declared at the top level/);
  assert.doesNotMatch(untwinned.output, /MEMORY_BUCKET/);
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
  const fixture = scaffold(t, { env: { staging: {} } }, { subdir: 'primary', tools: { npx: logger() }, prefix: 'cf-secrets-push-' });
  const primary = fixture.root;
  writeFileSync(join(primary, '.gitignore'), '.env*\n.dev.vars*\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: primary, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-qm', 'init');
  const worktree = join(fixture.dir, 'wt');
  git('worktree', 'add', '-q', '-b', 'feature', worktree);
  const push = () => {
    const result = fixture.run('cf-secrets.mjs', ['push'], { cwd: worktree });
    return { status: result.status, output: result.out, calls: result.calls };
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
