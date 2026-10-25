import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { logger, pack } from './fixtures/pack.mjs';

// A throwaway repo with the secrets script, its libraries, and `app/wrangler.jsonc`.
const SCRIPTS = ['cf-secrets.mjs', 'lib-wrangler-config.mjs', 'lib-cli.mjs', 'lib-staging-secrets.mjs'];
const scaffold = (t, config, options) => pack(t, {
  scripts: SCRIPTS,
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

test('a Durable Object in another Worker needs its staging twin, never the live one', t => {
  const line = script => ({ durable_objects: { bindings: [{ name: 'LIVE_LINE', class_name: 'Line', script_name: script }] } });
  assert.equal(check(t, { ...line('app-line'), env: { staging: line('app-line-staging') } }).status, 0);
  const same = check(t, { ...line('app-line'), env: { staging: line('app-line') } });
  assert.equal(same.status, 1);
  assert.match(same.output, /'LIVE_LINE' points at the Worker 'app-line', and env.staging points at the same Worker/);
  const missing = check(t, { ...line('app-line'), env: { staging: {} } });
  assert.equal(missing.status, 1);
  assert.match(missing.output, /env.staging names no other Worker for it/);
});

// A fake `npx` logging each call: `wrangler secret list` answers PROD or STAGING (comma-separated), or as NO_STAGING
// (no Worker) or UNREADABLE; a plain delete of a name in REFUSE answers 10215.
const secretList = `#!/usr/bin/env bash
echo "$*" >> "$FAKE_LOG"
case "$*" in
  *"secret list"*"--env staging"*) [ -n "$NO_STAGING" ] && { echo "This Worker does not exist on your account. [code: 10007]" >&2; exit 1; }
    [ -n "$UNREADABLE" ] && { echo "fetch failed" >&2; exit 1; } ;;
  *"versions secret delete"*) exit 0 ;;
  *"secret delete"*) for n in \${REFUSE//,/ }; do case "$*" in *" $n "*) echo "Secret edit failed [code: 10215]" >&2; exit 1 ;; esac; done; exit 0 ;;
  *"secret list"*) ;;
  *) exit 0 ;;
esac
case "$*" in *"--env staging"*) names=$STAGING ;; *) names=$PROD ;; esac
printf '['; sep=''
for n in \${names//,/ }; do printf '%s{"name":"%s","type":"secret_text"}' "$sep" "$n"; sep=,; done
echo ']'
`;

// Push: a primary checkout and one linked worktree, with a fake `npx` that logs
// each call so a test can see which file `wrangler secret bulk` received.
function pushFixture(t, config = { env: { staging: {} } }) {
  const fixture = scaffold(t, config, { subdir: 'primary', tools: { npx: secretList }, prefix: 'cf-secrets-push-' });
  const primary = fixture.root;
  writeFileSync(join(primary, '.gitignore'), '.env*\n.dev.vars*\n');
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@example.com', '-c', 'user.name=t', ...args], { cwd: primary, stdio: 'ignore' });
  git('init', '-q', '-b', 'main');
  git('add', '.');
  git('commit', '-qm', 'init');
  const worktree = join(fixture.dir, 'wt');
  git('worktree', 'add', '-q', '-b', 'feature', worktree);
  const push = (env = {}) => {
    const result = fixture.run('cf-secrets.mjs', ['push'], { cwd: worktree, env });
    return { status: result.status, output: result.out, calls: result.calls };
  };
  return { primary, worktree, push };
}

test('push in a linked worktree with no .dev.vars reads the primary copy', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=1\n');
  const result = push();
  assert.equal(result.status, 0, result.output);
  assert.equal(result.calls[0], `wrangler secret bulk ${join(primary, 'app/.dev.vars')}`);
  assert.match(result.output, /reading the primary checkout's/);
});

// Regression: scripts/cf-secrets.mjs:push/staging-worker-holds-production-runtime-secrets
test('push with no .dev.vars.staging loads production alone and removes every key staging holds', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\nWONG_CODE_WRITE=live-write\n');
  const result = push({ STAGING: 'API_KEY,WONG_CODE_READ' });
  assert.equal(result.status, 0, result.output);
  assert.ok(!result.calls.some(call => call.startsWith('wrangler secret bulk') && call.includes('--env staging')), result.calls.join('\n'));
  assert.deepEqual(result.calls.slice(1), [
    'wrangler secret list --env staging --format json',
    'wrangler secret delete API_KEY --env staging',
    'wrangler secret delete WONG_CODE_READ --env staging',
  ]);
  assert.match(result.output, /previews hold none of: API_KEY, WONG_CODE_WRITE/);
  assert.doesNotMatch(result.output, /live-1|live-write/);
});

test('push with no staging Worker yet loads production and passes with a note; an unreadable one still fails', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\n');
  const result = push({ NO_STAGING: '1' });
  assert.equal(result.status, 0, result.output);
  assert.equal(result.calls[0], `wrangler secret bulk ${join(primary, 'app/.dev.vars')}`);
  assert.ok(!result.calls.some(call => call.includes('secret delete')), result.calls.join('\n'));
  assert.match(result.output, /no staging Worker yet, so it holds nothing to remove/);
  const unreadable = push({ UNREADABLE: '1' });
  assert.equal(unreadable.status, 1, unreadable.output);
  assert.match(unreadable.output, /could not read the staging Worker's secret names/);
});

test('push keeps staging to exactly its own file, retrying a refused delete as a new version', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\nMAIL_KEY=live-2\n');
  writeFileSync(join(primary, 'app/.dev.vars.staging'), 'API_KEY=test-1\n');
  const result = push({ STAGING: 'API_KEY,MAIL_KEY,WONG_CLOUDFLARE_READ', REFUSE: 'WONG_CLOUDFLARE_READ' });
  assert.equal(result.status, 0, result.output);
  assert.deepEqual(result.calls.slice(1), [
    `wrangler secret bulk ${join(primary, 'app/.dev.vars.staging')} --env staging`,
    'wrangler secret list --env staging --format json',
    'wrangler secret delete MAIL_KEY --env staging',
    'wrangler secret delete WONG_CLOUDFLARE_READ --env staging',
    'wrangler versions secret delete WONG_CLOUDFLARE_READ --env staging',
  ]);
  assert.match(result.output, /previews lack: MAIL_KEY/);
});

test('a staging file naming a live-app-only key, or repeating production\'s value, is refused before any call', t => {
  const { primary, push } = pushFixture(t);
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\nMAIL_KEY=live-2\n');
  for (const [text, problem] of [
    ['API_KEY=test-1\nWONG_CODE_WRITE=test-write\n', /must not declare WONG_CODE_WRITE: only the live app may hold it/],
    ['API_KEY=test-1\nMAIL_KEY="live-2"\n', /repeats production's value for MAIL_KEY/],
  ]) {
    writeFileSync(join(primary, 'app/.dev.vars.staging'), text);
    const result = push();
    assert.equal(result.status, 1, result.output);
    assert.deepEqual(result.calls, []);
    assert.match(result.output, problem);
    assert.doesNotMatch(result.output, /live-1|live-2|test-1|test-write/);
  }
});

test('an explicit file loads production alone and leaves staging as it is', t => {
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList } });
  f.write('app/other.vars', 'API_KEY=synthetic\n');
  f.write('app/.dev.vars.staging', 'API_KEY=test\n');
  const result = f.run('cf-secrets.mjs', ['push', 'app/other.vars'], { env: { STAGING: 'API_KEY' } });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual(result.calls, [`wrangler secret bulk ${join(f.root, 'app/other.vars')}`]);
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

// Pruning before the Access step would leave that step nothing to name for rotation, and no read-only key to roll.
test('push leaves staging as it is while previews share the live app\'s sign-in, naming the Access step', t => {
  const access = { CF_ACCESS_AUD: 'aud-live', CF_ACCESS_APP_ID: 'app-live' };
  for (const staging of [access, { ...access, CF_ACCESS_APP_ID: 'app-previews' }, { ...access, CF_ACCESS_AUD: 'aud-previews' }]) {
    const { primary, push } = pushFixture(t, { vars: access, env: { staging: { vars: staging } } });
    writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\n');
    writeFileSync(join(primary, 'app/.dev.vars.staging'), 'API_KEY=test-1\n');
    const result = push({ STAGING: 'API_KEY,WONG_CODE_WRITE,WONG_CLOUDFLARE_READ' });
    assert.equal(result.status, 0, result.output);
    assert.deepEqual(result.calls, [`wrangler secret bulk ${join(primary, 'app/.dev.vars')}`]);
    assert.match(result.output, /staging left as it was, as previews still share the live app's sign-in: run setup's Access step \(wiki\/stack\/employee-access\.md#finish-access-setup\)/);
  }
  const { primary, push } = pushFixture(t, { vars: access, env: { staging: { vars: { CF_ACCESS_AUD: 'aud-previews', CF_ACCESS_APP_ID: 'app-previews' } } } });
  writeFileSync(join(primary, 'app/.dev.vars'), 'API_KEY=live-1\n');
  const split = push({ STAGING: 'WONG_CODE_WRITE' });
  assert.equal(split.status, 0, split.output);
  assert.ok(split.calls.includes('wrangler secret delete WONG_CODE_WRITE --env staging'), split.calls.join('\n'));
});

function checkSecrets(t, env) {
  const fixture = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
  return fixture.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', ...env } });
}

test('check passes when both Workers hold the same secret names', t => {
  const result = checkSecrets(t, { PROD: 'API_KEY,DB_URL', STAGING: 'DB_URL,API_KEY' });
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /staging holds only its own keys \(2 of production's 2 name\(s\)\)/);
  assert.deepEqual(result.calls, ['wrangler secret list --format json', 'wrangler secret list --env staging --format json']);
});

test('check passes and names the keys previews lack; it fails on a key staging alone holds or the project write key', t => {
  const lacking = checkSecrets(t, { PROD: 'API_KEY,STRIPE_SECRET_KEY,WONG_CODE_WRITE', STAGING: 'API_KEY' });
  assert.equal(lacking.status, 0, lacking.out);
  assert.match(lacking.out, /previews lack STRIPE_SECRET_KEY$/m);
  for (const [env, problem] of [
    [{ PROD: 'API_KEY', STAGING: 'API_KEY,DB_URL' }, /secret 'DB_URL' is set on staging but missing from production/],
    [{ PROD: 'API_KEY,WONG_CODE_WRITE', STAGING: 'API_KEY,WONG_CODE_WRITE' }, /secret 'WONG_CODE_WRITE' must never be set on staging/],
  ]) {
    const result = checkSecrets(t, env); assert.equal(result.status, 1, result.out); assert.match(result.out, problem);
  }
});

// An updated install keeps publishing the live app until its Access step splits the sign-in and clears staging.
test('a live-app-only key on staging warns, naming the Access step, while both environments share one sign-in', t => {
  const access = (aud, app) => ({ CF_ACCESS_AUD: aud, CF_ACCESS_APP_ID: app });
  const run = staging => {
    const fixture = scaffold(t, { vars: access('aud-live', 'app-live'), env: { staging: { vars: staging } } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
    return fixture.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', PROD: 'API_KEY,WONG_CODE_WRITE,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY,WONG_CODE_WRITE,WONG_CLOUDFLARE_READ' } });
  };
  for (const staging of [access('aud-live', 'app-live'), access('aud-live', 'app-previews'), access('aud-previews', 'app-live')]) {
    const shared = run(staging);
    assert.equal(shared.status, 0, shared.out);
    assert.match(shared.out, /'WONG_CODE_WRITE' is still on staging.*run setup's Access step \(wiki\/stack\/employee-access\.md#finish-access-setup\)/);
    assert.match(shared.out, /'WONG_CLOUDFLARE_READ' is still on staging/);
    assert.doesNotMatch(shared.out, /staging holds only its own keys/);
  }
  const split = run(access('aud-previews', 'app-previews'));
  assert.equal(split.status, 1, split.out);
  assert.match(split.out, /secret 'WONG_CODE_WRITE' must never be set on staging/);
});

// Shared: which keys staging holds with production's value. Names only, no network.
function sharedFixture(t, files) {
  const fixture = scaffold(t, { env: { staging: {} } }, { tools: { npx: logger() }, prefix: 'cf-secrets-shared-' });
  for (const [name, text] of Object.entries(files)) fixture.write(`app/${name}`, text);
  const result = fixture.run('cf-secrets.mjs', ['shared']);
  const list = label => result.out.match(new RegExp(`^${label}: (.*)$`, 'm'))[1].split(' ').filter(Boolean);
  return { result, own: list('own'), shared: list('shared') };
}

test('shared names no key when staging has no file of its own: previews hold none', t => {
  const { result, own, shared } = sharedFixture(t, { '.dev.vars': 'PAYMENT_KEY=live-pay-123\nEMAIL_KEY=live-mail-456\n' });
  assert.equal(result.status, 0, result.out);
  assert.deepEqual([own, shared], [[], []]);
  assert.match(result.out, /no \.dev\.vars\.staging, so previews hold no keys/);
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
  const result = pack(t, { scripts: SCRIPTS, prefix: 'cf-secrets-shared-' }).run('cf-secrets.mjs', ['shared']);
  assert.equal(result.status, 0, result.out);
  assert.match(result.out, /^own: $/m);
});

// Replaces the long notes in cf-secrets.mjs: `check` skips, never fails, with no config or no staging section.
test('check with no wrangler config, or a config with no staging section, skips and passes', t => {
  const bare = pack(t, { scripts: SCRIPTS, prefix: 'cf-secrets-bare-' }).run('cf-secrets.mjs', ['check']);
  assert.equal(bare.status, 0, bare.out);
  assert.match(bare.out, /no wrangler config yet — skipping the parity check/);
  const oneWorker = check(t, { name: 'demo', d1_databases: [{ binding: 'DB', database_name: 'demo' }] });
  assert.equal(oneWorker.status, 0, oneWorker.output);
  assert.match(oneWorker.output, /no `env\.staging` in the wrangler config — skipping the binding comparison/);
});

test('live-app-only keys cannot reach staging through a staging file, blank declarations or config', t => {
  for (const name of ['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CODE_WRITE', 'WONG_CLOUDFLARE_READ']) {
    const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList } });
    f.write('app/.dev.vars', 'API_KEY=synthetic\n');
    f.write('app/.dev.vars.staging', `API_KEY=test\n${name}=\n`);
    const invalid = f.run('cf-secrets.mjs', ['push']); assert.equal(invalid.status, 1, invalid.out); assert.deepEqual(invalid.calls, []);
    assert.match(invalid.out, new RegExp(`${name}`));
    const configured = scaffold(t, { env: { staging: { vars: { [name]: 'synthetic' } } } }, { tools: { npx: secretList } });
    configured.write('app/.dev.vars', 'API_KEY=synthetic\n');
    const result = configured.run('cf-secrets.mjs', ['push']); assert.equal(result.status, 1); assert.deepEqual(result.calls, []);
  }
  // Production's own file may carry the sign-in list key and the project write key: no staging file, no copy.
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList } });
  f.write('app/.dev.vars', 'API_KEY=synthetic\nWONG_ACCESS_LOGIN_MANAGEMENT=private-synthetic\nWONG_CODE_WRITE=write-synthetic\n');
  const valid = f.run('cf-secrets.mjs', ['push']); assert.equal(valid.status, 0, valid.out);
  assert.equal(valid.calls.filter(call => call.includes('bulk')).length, 1);
  assert.doesNotMatch(valid.out, /private-synthetic|write-synthetic/);
});
test('the second invalid push source prevents any first production write', t => {
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList } });
  f.write('app/.dev.vars', 'API_KEY=synthetic\n'); f.write('app/.dev.vars.staging', 'CF_ACCESS_CLIENT_SECRET=synthetic\n');
  const result = f.run('cf-secrets.mjs', ['push']); assert.equal(result.status, 1); assert.deepEqual(result.calls, []);
});
test('secret check accepts live-app-only keys on production alone, and the example file never asks for them', t => {
  const valid = checkSecrets(t, { PROD: 'API_KEY,WONG_ACCESS_LOGIN_MANAGEMENT,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY' });
  assert.equal(valid.status, 0, valid.out); assert.doesNotMatch(valid.out, /previews lack/);
  for (const name of ['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CLOUDFLARE_READ']) {
    for (const env of [{ PROD: `API_KEY,${name}`, STAGING: `API_KEY,${name}` }, { PROD: 'API_KEY', STAGING: `API_KEY,${name}` }]) {
      const result = checkSecrets(t, env); assert.equal(result.status, 1); assert.match(result.out, new RegExp(`'${name}' must never be set on staging`));
    }
  }
  const listed = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList }, prefix: 'cf-secrets-check-' });
  listed.write('app/.dev.vars.example', 'API_KEY=\n');
  const warned = listed.run('cf-secrets.mjs', ['check'], { env: { CLOUDFLARE_API_TOKEN: 'test', PROD: 'API_KEY,OTHER_KEY,WONG_ACCESS_LOGIN_MANAGEMENT,WONG_CLOUDFLARE_READ', STAGING: 'API_KEY,OTHER_KEY' } });
  assert.equal(warned.status, 0, warned.out); assert.match(warned.out, /'OTHER_KEY' is set but not declared/);
  assert.doesNotMatch(warned.out, /'WONG_ACCESS_LOGIN_MANAGEMENT' is set but not declared|'WONG_CLOUDFLARE_READ' is set but not declared/);
  const binding = check(t, { vars: { WONG_ACCESS_LOGIN_MANAGEMENT: 'synthetic' }, env: { staging: {} } }); assert.equal(binding.status, 0, binding.output);
  const denied = check(t, { env: { staging: { vars: { WONG_ACCESS_LOGIN_MANAGEMENT: 'synthetic' } } } }); assert.equal(denied.status, 1); assert.match(denied.output, /live-app-only authority/);
  // The owner email is ordinary committed config: both Workers carry it, and a missing twin is drift.
  const owner = check(t, { vars: { WONG_OWNER_EMAIL: 'owner@example.com' }, env: { staging: { vars: { WONG_OWNER_EMAIL: 'owner@example.com' } } } }); assert.equal(owner.status, 0, owner.output);
  const untwinned = check(t, { vars: { WONG_OWNER_EMAIL: 'owner@example.com' }, env: { staging: {} } }); assert.equal(untwinned.status, 1); assert.match(untwinned.output, /WONG_OWNER_EMAIL/);
});

// Setup makes the read-only Cloudflare key and stores it itself; production's file may not carry it either.
test('the setup-made Cloudflare read key is refused in the production file too', t => {
  const f = scaffold(t, { env: { staging: {} } }, { tools: { npx: secretList } });
  f.write('app/.dev.vars', 'API_KEY=synthetic\nWONG_CLOUDFLARE_READ=read-synthetic\n');
  for (const args of [['push'], ['push', 'app/.dev.vars']]) {
    const result = f.run('cf-secrets.mjs', args);
    assert.equal(result.status, 1, result.out); assert.deepEqual(result.calls, []);
    assert.ok(result.out.includes('.dev.vars must not declare WONG_CLOUDFLARE_READ: setup stores it itself.'), result.out);
    assert.doesNotMatch(result.out, /read-synthetic/);
  }
});
