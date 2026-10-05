import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { symlinkSync, writeFileSync } from 'node:fs';
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

test('push refuses local authentication substitutions as deployed secrets', t => {
  const { primary, push } = pushFixture(t);
  for (const name of ['SKIP_AUTH', 'WONG_ENVIRONMENT']) {
    writeFileSync(join(primary, 'app/.dev.vars'), `${name}=local\n`);
    const result = push();
    assert.equal(result.status, 1);
    assert.deepEqual(result.calls, []);
    assert.match(result.output, new RegExp(name));
  }
});

test('an account credential in the primary copy is still refused', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'CLOUDFLARE_API_TOKEN=x\n');
  const result = push();
  assert.equal(result.status, 1);
  assert.deepEqual(result.calls, []);
  assert.match(result.output, /CLOUDFLARE_API_TOKEN/);
});

// The account-credential file is refused by name, even behind a symlink, and
// before `npx` runs at all. Its keys look harmless, so only the file guard stops it.
test('push refuses a .dev.vars that links to .env, and a file named .env', t => {
  for (const [name, args, link] of [['symlink', ['push'], true], ['file argument', ['push', 'app/.env'], false]]) {
    const fixture = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() }, prefix: 'cf-secrets-refuse-' });
    fixture.write('app/.env', 'API_KEY=1\n');
    if (link) symlinkSync('.env', join(fixture.root, 'app/.dev.vars'));
    const result = fixture.run('cf-secrets.mjs', args);
    assert.equal(result.status, 1, `${name}: ${result.out}`);
    assert.match(result.out, /refusing to load '\.(dev\.vars|env)' into a Worker/, name);
    assert.deepEqual(result.calls, [], `${name}: no npx call`);
  }
});

// A fake `npx` answering `wrangler secret list` with the names in PROD or
// STAGING (comma-separated), picked by `--env staging`.
const secretList = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$*" in *"--env staging"*) names=$STAGING ;; *) names=$PROD ;; esac
printf '['; sep=''
for n in \${names//,/ }; do printf '%s{"name":"%s","type":"secret_text"}' "$sep" "$n"; sep=,; done
echo ']'
`;

function checkSecrets(t, env) {
  const fixture = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
  return fixture.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', ...env } });
}

test('check passes when both Workers hold the same secret names', t => {
  const result = checkSecrets(t, { PROD: 'API_KEY,DB_URL', STAGING: 'DB_URL,API_KEY' });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /secret names match across both Workers \(2 secret\(s\)\)/);
  assert.deepEqual(result.calls, ['wrangler secret list --format json', 'wrangler secret list --env staging --format json']);
});

test('check fails and names a secret only one Worker holds', t => {
  const result = checkSecrets(t, { PROD: 'API_KEY,DB_URL', STAGING: 'API_KEY' });
  assert.equal(result.status, 1, result.out);
  assert.match(result.out, /secret 'DB_URL' is set on production but missing from staging/);
});

// Shared: which keys staging holds with production's value. Names only, no network.
function sharedFixture(t, files) {
  const fixture = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() }, prefix: 'cf-secrets-shared-' });
  for (const [name, text] of Object.entries(files)) fixture.write(`app/${name}`, text);
  const result = fixture.run('cf-secrets.mjs', ['shared']);
  const list = label => result.out.match(new RegExp(`^${label}: (.*)$`, 'm'))[1].split(' ').filter(Boolean);
  return { result, own: list('own'), shared: list('shared') };
}

test('shared names every key as shared when staging has no file of its own', t => {
  const { result, own, shared } = sharedFixture(t, { '.dev.vars': 'PAYMENT_KEY=live-pay-123\nEMAIL_KEY=live-mail-456\n' });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(own, []);
  assert.deepEqual(shared, ['EMAIL_KEY', 'PAYMENT_KEY']);
  assert.match(result.out, /read app\/\.dev\.vars; no \.dev\.vars\.staging/);
});

test('shared names one differing key as own, prints no value, and calls nothing', t => {
  const { result, own, shared } = sharedFixture(t, {
    '.dev.vars': 'PAYMENT_KEY=live-pay-123\nEMAIL_KEY="live-mail-456"\nONLY_LIVE=live-only-789\n',
    '.dev.vars.staging': 'PAYMENT_KEY=test-pay-abc\nEMAIL_KEY=live-mail-456\n',
  });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(own, ['PAYMENT_KEY']);
  assert.deepEqual(shared, ['EMAIL_KEY'], 'the same value in different quotes is still shared');
  assert.match(result.out, /leaves out ONLY_LIVE/);
  assert.doesNotMatch(result.out, /live-pay-123|test-pay-abc|live-mail-456|live-only-789/);
  assert.deepEqual(result.calls, [], 'shared made a wrangler call');
});

test('shared with no .dev.vars or no wrangler config lists nothing and passes', t => {
  const bare = sharedFixture(t, {});
  assert.equal(bare.result.status, 0, bare.result.out);
  assert.deepEqual([bare.own, bare.shared], [[], []]);
  const result = pack(t, { scripts: ['cf-secrets.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs'], prefix: 'cf-secrets-shared-' }).run('cf-secrets.mjs', ['shared']);
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /^own: $/m);
});

test('private production login bindings cannot reach staging through fallback, override, blank declarations or config', t => {
  for (const name of ['WONG_ACCESS_LOGIN_MANAGEMENT']) {
    const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() } });
    f.write('app/.dev.vars', `API_KEY=synthetic\n${name}=private-synthetic\n`);
    for (const args of [['push'], ['push', 'app/.dev.vars']]) {
      const result = f.run('cf-secrets.mjs', args); assert.equal(result.status, 1); assert.deepEqual(result.calls, []); assert.doesNotMatch(result.out, /private-synthetic/);
    }
    f.write('app/.dev.vars.staging', `API_KEY=test\n${name}=\n`);
    const invalid = f.run('cf-secrets.mjs', ['push']); assert.equal(invalid.status, 1); assert.deepEqual(invalid.calls, []);
    f.write('app/.dev.vars.staging', 'API_KEY=test\n');
    const valid = f.run('cf-secrets.mjs', ['push']); assert.equal(valid.status, 0, valid.out); assert.equal(valid.calls.length, 2);
  }
  const configured = scaffold(t, { env: { staging: { vars: { WONG_ACCESS_LOGIN_MANAGEMENT: 'synthetic' } } } }, { tools: { npx: logger() } });
  configured.write('app/.dev.vars', 'API_KEY=synthetic\n');
  const result = configured.run('cf-secrets.mjs', ['push']); assert.equal(result.status, 1); assert.deepEqual(result.calls, []);
});
test('the second invalid push source prevents any first production write', t => {
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() } });
  f.write('app/.dev.vars', 'API_KEY=synthetic\n'); f.write('app/.dev.vars.staging', 'CF_ACCESS_CLIENT_SECRET=synthetic\n');
  const result = f.run('cf-secrets.mjs', ['push']); assert.equal(result.status, 1); assert.deepEqual(result.calls, []);
});
test('secret parity accepts private production authority only on production and preserves ordinary parity', t => {
  const valid = checkSecrets(t, { PROD: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT', STAGING: 'API_KEY' }); assert.equal(valid.status, 0, valid.out);
  for (const env of [{ PROD: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT', STAGING: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT' }, { PROD: 'API_KEY', STAGING: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT' }]) {
    const result = checkSecrets(t, env); assert.equal(result.status, 1); assert.match(result.out, /must never be set on staging/);
  }
  // Setup stores the key itself, so its absence from the example file is no drift to warn about.
  const listed = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
  listed.write('app/.dev.vars.example', 'API_KEY=\n');
  const warned = listed.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', PROD: 'API_KEY,OTHER_KEY,WONG_ACCESS_LOGIN_MANAGEMENT', STAGING: 'API_KEY,OTHER_KEY' } });
  assert.equal(warned.status, 0, warned.out); assert.match(warned.out, /'OTHER_KEY' is set but not declared/);
  assert.doesNotMatch(warned.out, /'WONG_ACCESS_LOGIN_MANAGEMENT' is set but not declared/);
  const binding = check(t, { vars: { WONG_ACCESS_LOGIN_MANAGEMENT: 'synthetic' }, env: { staging: {} } }); assert.equal(binding.status, 0, binding.output);
  const denied = check(t, { env: { staging: { vars: { WONG_ACCESS_LOGIN_MANAGEMENT: 'synthetic' } } } }); assert.equal(denied.status, 1); assert.match(denied.output, /private Access management authority/);
  // The owner email is ordinary committed config: both Workers carry it, and a missing twin is drift.
  const owner = check(t, { vars: { WONG_OWNER_EMAIL: 'owner@example.com' }, env: { staging: { vars: { WONG_OWNER_EMAIL: 'owner@example.com' } } } }); assert.equal(owner.status, 0, owner.output);
  const untwinned = check(t, { vars: { WONG_OWNER_EMAIL: 'owner@example.com' }, env: { staging: {} } }); assert.equal(untwinned.status, 1); assert.match(untwinned.output, /WONG_OWNER_EMAIL/);
});

// Setup makes the read-only Cloudflare key and stores it on both Workers; no secrets file may carry it.
test('the setup-made Cloudflare read key is refused in every push source, and the sign-in key stays out of staging', t => {
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() } });
  const refused = (args, file) => {
    const result = f.run('cf-secrets.mjs', args);
    assert.equal(result.status, 1, result.out); assert.deepEqual(result.calls, []);
    assert.ok(result.out.includes(`${file} must not declare WONG_CLOUDFLARE_READ: setup stores it on both Workers.`), result.out);
    assert.doesNotMatch(result.out, /read-synthetic/);
  };
  f.write('app/.dev.vars', 'API_KEY=synthetic\nWONG_CLOUDFLARE_READ=read-synthetic\n');
  refused(['push'], '.dev.vars');
  refused(['push', 'app/.dev.vars'], '.dev.vars');
  // A staging file of its own does not make production's copy acceptable, and may not name the key either.
  f.write('app/.dev.vars.staging', 'API_KEY=test\n');
  refused(['push'], '.dev.vars');
  f.write('app/.dev.vars', 'API_KEY=synthetic\n'); f.write('app/.dev.vars.staging', 'API_KEY=test\nWONG_CLOUDFLARE_READ=read-synthetic\n');
  refused(['push'], '.dev.vars.staging');
  f.write('app/.dev.vars.staging', 'API_KEY=test\nWONG_ACCESS_LOGIN_MANAGEMENT=\n');
  const signIn = f.run('cf-secrets.mjs', ['push']); assert.equal(signIn.status, 1); assert.deepEqual(signIn.calls, []);
  assert.match(signIn.out, /staging secret source must omit private Access management bindings/);
  f.write('app/.dev.vars.staging', 'API_KEY=test\n');
  const valid = f.run('cf-secrets.mjs', ['push']); assert.equal(valid.status, 0, valid.out); assert.equal(valid.calls.length, 2);
});
test('secret parity expects the setup-made Cloudflare read key on both Workers, and never asks the example file for it', t => {
  const both = checkSecrets(t, { PROD: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY,WONG_CLOUDFLARE_READ' });
  assert.equal(both.status, 0, both.out);
  for (const [env, problem] of [
    [{ PROD: 'API_KEY,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY' }, /secret 'WONG_CLOUDFLARE_READ' is set on production but missing from staging/],
    [{ PROD: 'API_KEY', STAGING: 'API_KEY,WONG_CLOUDFLARE_READ' }, /secret 'WONG_CLOUDFLARE_READ' is set on staging but missing from production/],
  ]) {
    const result = checkSecrets(t, env); assert.equal(result.status, 1, result.out); assert.match(result.out, problem);
  }
  const listed = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
  listed.write('app/.dev.vars.example', 'API_KEY=\n');
  const warned = listed.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', PROD: 'API_KEY,OTHER_KEY,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY,OTHER_KEY,WONG_CLOUDFLARE_READ' } });
  assert.equal(warned.status, 0, warned.out); assert.match(warned.out, /'OTHER_KEY' is set but not declared/);
  assert.doesNotMatch(warned.out, /'WONG_CLOUDFLARE_READ' is set but not declared/);
});
