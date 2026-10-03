// server/install-wongstack.mjs installs this checkout into a practice repo with a bare `origin`, against
// a fake Cloudflare and a fake `gh`. The expected file list comes from payload-files.json here, apart
// from the installer's own reading, so a payload file the installer misses fails and is named.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import * as installer from '../../server/install-wongstack.mjs';
import { CLOUDFLARE_CALL, jobFolder, main, payloadFiles, repoFolder, run, setEnv, upstreamUrl } from '../../server/install-wongstack.mjs';
import { readEnv } from '../../.agents/skills/wong-setup/scripts/provision.mjs';
import { databaseName, parseConfig, workerName } from '../lib-wrangler-config.mjs';
import { ACCOUNT, TOKEN, fakeCloudflare, fakeGh } from './fixtures/cloudflare.mjs';
import { checkedOutSource } from '../../server/access-result.mjs';
import { privateDeployment } from '../lib-access-config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INSTALLER = join(repoRoot, 'server/install-wongstack.mjs');
const REPO = 'ada/recipe-box';
const JOB = { token: TOKEN, accountId: ACCOUNT, repo: REPO, ownerEmail: 'ada@example.com' };
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const tryGit = (...args) => {
  try {
    return git(...args);
  } catch {
    return null;
  }
};

// ── the expected payload, read here on its own ──────────────────────────────

const manifest = JSON.parse(readFileSync(join(repoRoot, '.agents/skills/wong-sync/references/payload-files.json'), 'utf8'));
const sourceFiles = git('-C', repoRoot, 'ls-files', '--cached', '--others', '--exclude-standard').split('\n').filter((path) => path && existsSync(join(repoRoot, path)));

/** Every file a target receives, in its real `.agents/` form. */
function expectedPayload() {
  const real = (path) => path.replace(/^\.claude\//, '.agents/');
  const { core, ui, pack, scaffold } = manifest;
  const under = (folder) => sourceFiles.filter((path) => path.startsWith(`${folder}/`));
  const paths = new Set([
    ...core.skillDirs.flatMap((skill) => under(`.agents/skills/${skill}`)),
    ...[core, ui, pack, scaffold].flatMap((category) => category.files ?? []).map(real),
    ...[...pack.dirs, ...scaffold.dirs].flatMap((dir) => under(real(dir))),
  ]);
  // An excluded folder takes everything under it, such as a source-only mini app.
  const out = scaffold.exclude.map(real);
  return [...paths].filter((path) => !out.some((gone) => path === gone || path.startsWith(`${gone}/`))).sort();
}

// ── a practice repo on a pretend server ─────────────────────────────────────

async function setup(t, { email = 'ada@example.com' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-server-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, 'home');
  const origin = join(root, 'origin.git');
  const dir = join(home, 'recipe-box');
  mkdirSync(home);
  git('init', '-q', '--bare', '-b', 'main', origin);
  git('clone', '-q', origin, dir);
  if (email) git('-C', dir, 'config', 'user.email', email);
  git('-C', dir, 'config', 'user.name', 'Ada');
  const fake = await fakeCloudflare();
  t.after(fake.close);
  const gh = fakeGh(join(root, 'gh'));
  const env = { ...process.env, HOME: home, XDG_CONFIG_HOME: join(root, 'config'), GIT_CONFIG_NOSYSTEM: '1', PATH: `${gh.bin}:${process.env.PATH}`, WONG_CLOUDFLARE_API: fake.api, CLOUDFLARE_MEMORY_TOKEN: '', NODE_NO_WARNINGS: '1' };
  for (const name of ['WONG_MEMORY_API', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID', 'WONG_MEMORY_STATE_DIR', 'PASEO_HOME', 'PRESETS_PASEO_BIN']) delete env[name];
  const calls = [];
  const exec = (file, args, options) => {
    calls.push([file, ...args].join(' '));
    return run(file, args, options);
  };
  /** One run of the installer in this process; returns its exit code and printed lines. */
  const install = async (job = JOB, { fetch } = {}) => {
    const out = [];
    const err = [];
    const code = await main({ stdin: typeof job === 'string' ? job : JSON.stringify(job), env, exec, fetch, sleep: async () => {}, now: () => new Date('2026-09-27T12:00:00Z'), out: (line) => out.push(line), err: (line) => err.push(line) });
    return { code, out, err, last: out.at(-1) };
  };
  const pushed = () => tryGit('--git-dir', origin, 'rev-parse', '-q', '--verify', 'refs/heads/main');
  return { root, home, origin, dir, fake, gh, env, calls, install, pushed };
}

/** Every secret the run knows: the user token, each deploy token value, and the admin memory key. */
const secretsOf = (s) => [TOKEN, ...s.fake.state.minted, ...s.fake.state.serviceTokens.map(item => item.client_secret), readEnv(join(s.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN].filter(Boolean);

const managedJob = (s, { generation = 1, jobId = `job-${generation}`, cleanupTokenIds = [] } = {}) => ({
  ...JOB,
  managementResult: {
    version: 1,
    recipient: { ownerId: 'owner-1', vmId: 'vm-1', jobId, connectionId: 'connection-1', generation },
    path: join(s.home, '.local/state/wongstack/access-results', `${jobId}.json`),
    cleanupTokenIds,
  },
});

test('old jobs missing a reachable verified owner email stop before provider calls', async (t) => {
  const s = await setup(t);
  for (const ownerEmail of [undefined, '', 'bad', 'extra@workspace.invalid', '123+ada@users.noreply.github.com']) {
    const result = await s.install({ ...JOB, ownerEmail });
    assert.equal(result.last, 'repo');
    assert.match(result.err[0], /reachable verified ownerEmail.*updated host/);
    assert.equal(s.fake.calls.length, 0);
  }
});

test('managed jobs keep verified login email separate from git authorship', async (t) => {
  const s = await setup(t, { email: '123+ada@users.noreply.github.com' });
  const result = await s.install();
  assert.equal(result.last, 'done', result.err.join('\n'));
  assert.deepEqual(s.fake.state.accessApps[0].policies.find(policy => policy.decision === 'allow').include, [{ email: { email: JOB.ownerEmail } }]);
  assert.equal(git('-C', s.dir, 'log', '-1', '--format=%ae'), '123+ada@users.noreply.github.com');
});

test('management handoff is private, restricted, bound to the actual source, and idempotent', async (t) => {
  const s = await setup(t);
  const job = managedJob(s);
  const first = await s.install(job);
  assert.equal(first.last, 'done', first.err.join('\n'));
  const file = job.managementResult.path;
  const value = JSON.parse(readFileSync(file, 'utf8'));
  assert.equal(statSync(file).mode & 0o777, 0o600);
  assert.equal(statSync(dirname(file)).mode & 0o777, 0o700);
  assert.deepEqual(value.recipient, job.managementResult.recipient);
  assert.equal(value.ownerEmail, JOB.ownerEmail);
  assert.equal(value.repo, REPO);
  assert.equal(value.accountId, ACCOUNT);
  assert.deepEqual(value.source, await checkedOutSource(repoRoot, run));
  assert.equal(value.source.commit, git('-C', repoRoot, 'rev-parse', 'HEAD'));
  assert.equal(value.anchorHostname, 'recipe-box.ada.workers.dev');
  assert.equal(value.sessionDuration, '720h');
  assert.deepEqual(value.workers.production, JSON.parse(readFileSync(join(s.dir, '.claude/.wong-stack.json'), 'utf8')).components.access.workers[0]);
  const management = s.fake.state.accountTokens.find(token => token.id === value.tokenId);
  assert.deepEqual(management.policies, [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: [{ id: '1e13c5124ca64b72b1969a67e8829049' }] }]);
  for (const forbidden of [TOKEN, readEnv(join(s.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, ...s.fake.state.serviceTokens.map(token => token.client_secret)]) {
    assert.ok(!readFileSync(file, 'utf8').includes(forbidden));
  }
  for (const text of [...first.out, ...first.err, ...s.calls, s.gh.calls(), readFileSync(join(s.dir, '.git/wong-stack-management.json'), 'utf8')]) assert.ok(!text.includes(value.token));
  assert.equal(tryGit('--git-dir', s.origin, 'grep', '-q', '-F', '-e', value.token, 'main'), null);
  assert.equal((await s.install(job)).last, 'done');
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), value);
  assert.equal(s.fake.state.accountTokens.length, 2, 'CI and one management token only');
});

test('unsafe or mismatched management recipients and paths fail before provisioning', async (t) => {
  const s = await setup(t);
  const valid = managedJob(s);
  for (const change of [
    { version: 2 },
    { recipient: { ...valid.managementResult.recipient, generation: '1' } },
    { recipient: { ...valid.managementResult.recipient, ownerId: '' } },
    { path: join(s.dir, 'private.json') },
    { cleanupTokenIds: ['not-an-account-token'] },
  ]) {
    const result = await s.install({ ...valid, managementResult: { ...valid.managementResult, ...change } });
    assert.equal(result.last, 'repo', JSON.stringify(change));
    assert.equal(s.fake.calls.length, 0);
  }
  const directory = dirname(valid.managementResult.path);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const elsewhere = join(s.root, 'elsewhere');
  writeFileSync(elsewhere, 'private');
  symlinkSync(elsewhere, valid.managementResult.path);
  assert.equal((await s.install(valid)).last, 'repo');
  assert.equal(s.fake.calls.length, 0);
  rmSync(valid.managementResult.path);
  writeFileSync(valid.managementResult.path, JSON.stringify({ recipient: { ...valid.managementResult.recipient, vmId: 'another-vm' } }), { mode: 0o600 });
  assert.equal((await s.install(valid)).last, 'repo');
  assert.equal(s.fake.calls.length, 0);
  rmSync(valid.managementResult.path);
  symlinkSync(join(s.root, 'missing-private-target'), valid.managementResult.path);
  assert.equal((await s.install(valid)).last, 'repo');
  assert.equal(s.fake.calls.length, 0);

});

test('management reconnect cleans up recorded account tokens and persists failed cleanup for retry', async (t) => {
  const s = await setup(t);
  const first = managedJob(s);
  assert.equal((await s.install(first)).last, 'done');
  const old = JSON.parse(readFileSync(first.managementResult.path, 'utf8'));
  const second = managedJob(s, { generation: 2, cleanupTokenIds: [old.tokenId] });
  s.fake.state.refuse = [`DELETE /accounts/${ACCOUNT}/tokens/${old.tokenId}`];
  assert.equal((await s.install(second)).last, 'done');
  const pending = JSON.parse(readFileSync(second.managementResult.path, 'utf8'));
  assert.deepEqual(pending.cleanup, { revokedTokenIds: [], pendingTokenIds: [old.tokenId] });
  assert.ok(s.fake.state.accountTokens.some(token => token.id === old.tokenId));
  s.fake.state.refuse = [];
  assert.equal((await s.install(second)).last, 'done');
  const cleaned = JSON.parse(readFileSync(second.managementResult.path, 'utf8'));
  assert.deepEqual(cleaned.cleanup, { revokedTokenIds: [old.tokenId], pendingTokenIds: [] });
  assert.equal(cleaned.token, pending.token);
  assert.ok(!s.fake.state.accountTokens.some(token => token.id === old.tokenId));
  assert.equal(s.fake.state.accessApps.length, 1, 'cleanup retains the login wall');
  assert.ok(!s.fake.calls.some(call => call.method === 'DELETE' && !call.path.startsWith(`/accounts/${ACCOUNT}/tokens/`)));
});

test('the managed result reports the actual GitHub source for SSH and HTTPS origins', async () => {
  for (const remote of ['https://github.com/Business/Template.git', 'git@github.com:Business/Template.git', 'ssh://git@github.com/Business/Template.git']) {
    const exec = async (_file, args) => ({ stdout: args.includes('HEAD') ? 'a'.repeat(40) : remote });
    assert.deepEqual(await checkedOutSource('/source', exec), { repo: 'Business/Template', commit: 'a'.repeat(40) });
  }
  await assert.rejects(checkedOutSource('/source', async () => ({ stdout: 'file:///arbitrary' })), /actual pinned GitHub source/);
});

// ── a fresh repo ────────────────────────────────────────────────────────────

test('a fresh repo gets the whole payload, the record, hosting, memory, and one pushed commit on main', async (t) => {
  const s = await setup(t);
  const result = await s.install();
  assert.equal(result.last, 'done', result.err.join('\n'));
  assert.equal(result.code, 0);

  // Every payload file, from payload-files.json, is in the pushed commit.
  const tree = new Set(git('--git-dir', s.origin, 'ls-tree', '-r', '--name-only', 'main').split('\n'));
  const missing = expectedPayload().filter((path) => !tree.has(path));
  assert.deepEqual(missing, [], `the installer missed payload files: ${missing.join(', ')}`);
  for (const path of manifest.seededBySetup.files) assert.ok(tree.has(path), `setup seeds ${path}`);
  for (const path of ['AGENTS.md', 'CLAUDE.md', '.claude', '.codex', '.nvmrc', '.env.example', 'paseo.json', 'openspec/config.yaml', 'app/wrangler.jsonc', '.agents/.wong-stack.json']) assert.ok(tree.has(path), path);
  for (const path of ['.env', 'VERSION', 'CHANGELOG.md', 'server/setup.sh', 'server/preserve.sh', 'server/preservation.json', 'server/project-github.mjs', 'server/prepare-project.mjs', 'server/agent/project.mjs', 'server/agent/workspace.mjs', 'server/agent/github.mjs', '.agents/skills/wong-setup/SKILL.md', '.agents/rules/payload.md', 'app/src/apps/tips/App.tsx']) assert.ok(!tree.has(path), `${path} is not payload`);
  assert.ok(tree.has('app/src/apps/hello/App.tsx') && tree.has('app/worker/apps/hello/api.ts'), 'the example mini app ships');
  assert.equal(readlinkSync(join(s.dir, '.claude')), '.agents');
  assert.equal(readlinkSync(join(s.dir, '.codex')), '.agents');
  assert.equal(readlinkSync(join(s.dir, 'CLAUDE.md')), 'AGENTS.md');
  assert.match(readFileSync(join(s.dir, 'AGENTS.md'), 'utf8'), /^# AGENTS\.md\n\n<!-- WONG-STACK:BEGIN[\s\S]*<!-- WONG-STACK:END -->\n$/);
  assert.equal(readFileSync(join(s.dir, '.env.example'), 'utf8'), readFileSync(join(repoRoot, '.env.example'), 'utf8'));
  assert.match(readFileSync(join(s.dir, 'wiki/README.md'), 'utf8'), /^# Wiki\n[\s\S]*- \[.+\]\(development\/README\.md\)/);
  assert.match(readFileSync(join(s.dir, 'wiki/development/README.md'), 'utf8'), /\[the wiki\]\(\.\.\/README\.md\)[\s\S]*\(memory\.md\)/);

  // The record names this checkout, and the memory store the production Worker serves.
  const record = JSON.parse(readFileSync(join(s.dir, '.claude/.wong-stack.json'), 'utf8'));
  assert.equal(record.version, readFileSync(join(repoRoot, 'VERSION'), 'utf8').trim());
  assert.equal(record.commit, git('-C', repoRoot, 'rev-parse', 'HEAD'));
  assert.deepEqual(record.upstream, { repo: upstreamUrl(tryGit('-C', repoRoot, 'remote', 'get-url', 'origin') ?? ''), fork: null, clone: '~/.cache/wong-stack/WongStack' });
  assert.deepEqual(record.components.skills, manifest.core.skillDirs);
  assert.equal(record.components.memory.worker, 'https://recipe-box.ada.workers.dev/_memory');
  assert.equal(record.installedAt, '2026-09-27');

  // Hosting: the config the pipeline reads, the deploy token in GitHub; memory: the admin key in .env.
  const config = parseConfig(join(s.dir, 'app/wrangler.jsonc'));
  assert.equal(workerName(config, 'staging'), 'recipe-box-staging');
  assert.equal(databaseName(config), 'recipe-box-db');
  assert.deepEqual(Object.keys(s.gh.secrets()).sort(), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN']);
  const env = readEnv(join(s.dir, '.env'));
  assert.equal(env.CLOUDFLARE_API_TOKEN, TOKEN);
  assert.equal(env.CLOUDFLARE_ACCOUNT_ID, ACCOUNT);
  assert.match(env.CLOUDFLARE_MEMORY_TOKEN, /^wongm_/);
  assert.equal(statSync(join(s.dir, '.env')).mode & 0o777, 0o600);
  assert.equal(readFileSync(join(s.dir, '.git/info/exclude'), 'utf8').split('\n').filter((line) => line && !line.startsWith('#')).join(' '), '.env* !.env.example .dev.vars* !.dev.vars.example');

  // Git: one commit on main, pushed, nothing left over.
  assert.equal(git('--git-dir', s.origin, 'log', '--format=%s', 'main'), `feat: install WongStack ${record.version}`);
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');

  // No secret in an argument, a printed line, or the commit.
  const secrets = secretsOf(s);
  assert.equal(secrets.length, 4);
  for (const secret of secrets) {
    for (const text of [...s.calls, s.gh.calls(), ...result.out, ...result.err]) assert.ok(!text.includes(secret), `a secret leaked into: ${text.slice(0, 100)}`);
    assert.equal(tryGit('--git-dir', s.origin, 'grep', '-q', '-F', '-e', secret, 'main'), null, 'a secret was committed');
  }
});

test('a pushed repo on a rebuilt server gets its .env and secrets again, and nothing is committed or pushed', async (t) => {
  const s = await setup(t);
  assert.equal((await s.install()).last, 'done');
  const head = s.pushed();
  const key = readEnv(join(s.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN;
  rmSync(join(s.dir, '.env'));
  s.calls.length = 0;
  // As a process, the way a host runs it.
  const result = await new Promise((done) => {
    const child = execFile(process.execPath, [INSTALLER], { env: s.env, encoding: 'utf8' }, (error, stdout, stderr) => done({ code: error ? error.code : 0, stdout, stderr }));
    child.stdin.end(JSON.stringify(JOB));
  });
  assert.equal(result.stdout.trim().split('\n').at(-1), 'done', result.stderr);
  assert.equal(result.code, 0);
  assert.equal(s.pushed(), head);
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');
  assert.equal(s.fake.state.databases.length, 3);
  const env = readEnv(join(s.dir, '.env'));
  assert.equal(env.CLOUDFLARE_API_TOKEN, TOKEN);
  assert.match(env.CLOUDFLARE_MEMORY_TOKEN, /^wongm_/);
  assert.notEqual(env.CLOUDFLARE_MEMORY_TOKEN, key, 'the lost key is replaced with a new one');
  for (const secret of secretsOf(s)) assert.ok(!`${result.stdout}${result.stderr}`.includes(secret));
});

test('a second run on a pushed repo prints done and changes nothing', async (t) => {
  const s = await setup(t);
  assert.equal((await s.install()).last, 'done');
  const head = s.pushed();
  const secrets = s.gh.calls();
  s.calls.length = 0;
  assert.equal((await s.install()).last, 'done');
  assert.equal(s.pushed(), head);
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');
  assert.ok(!s.calls.some((call) => / (commit|push|add) /.test(call) || call.startsWith('openspec')), s.calls.join('\n'));
  assert.equal(s.gh.calls().slice(secrets.length), `secret list -R ${REPO}\n`);
});

test('a run stopped by Cloudflare finishes on the next run with no duplicate', async (t) => {
  const s = await setup(t);
  s.fake.state.refuse = [`POST /accounts/${ACCOUNT}/tokens`];
  const stopped = await s.install();
  assert.equal(stopped.last, 'cloudflare');
  assert.equal(stopped.code, 1);
  assert.equal(stopped.err[0], `install-wongstack: Cloudflare POST /accounts/${ACCOUNT}/tokens: HTTP 500 1000`);
  assert.deepEqual(stopped.out, [`Cloudflare POST /accounts/${ACCOUNT}/tokens: HTTP 500 1000`, 'cloudflare']);
  assert.equal(s.pushed(), null);
  s.fake.state.refuse = [];
  assert.equal((await s.install()).last, 'done');
  assert.equal(s.fake.state.databases.length, 3);
  assert.equal(s.fake.state.accountTokens.length, 1);
  assert.equal(s.fake.rows('recipe-box-memory', 'SELECT count(*) AS n FROM memory_keys')[0].n, 1);
  assert.ok(s.pushed());
});

test('the server installer stops when Zero Trust needs onboarding, and never opens the site', async (t) => {
  const s = await setup(t);
  s.fake.state.organization = null;
  s.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/organizations`];
  const stopped = await s.install();
  assert.equal(stopped.code, 1);
  assert.match(stopped.err.join('\n'), /finish Zero Trust onboarding/);
  assert.equal(s.pushed(), null);
  assert.equal(existsSync(join(s.dir, 'app/wrangler.jsonc')), false);
  assert.deepEqual(s.fake.state.databases, []);
});

// ── the open finish: no card ────────────────────────────────────────────────

const OPEN_KEYS = ['accountId', 'anchorHostname', 'mode', 'ownerEmail', 'recipient', 'repo', 'source', 'version'];

/** A no-card account: Cloudflare refuses a new Zero Trust organization and, here, the widen's Access probes. */
const noCard = (s) => {
  s.fake.state.organization = null;
  s.fake.state.needsOnboarding = true;
  s.fake.state.refusedAccessPolls = 99;
};
const withCard = (s) => {
  s.fake.state.needsOnboarding = false;
  s.fake.state.refusedAccessPolls = 0;
};
const openJob = (s, options) => ({ ...managedJob(s, options), openWithoutLogin: true });
const readResult = (job) => JSON.parse(readFileSync(job.managementResult.path, 'utf8'));
const managementTokens = (s) => s.fake.state.accountTokens.filter(token => token.name.includes('-access-'));

test('a job that asks finishes open on a no-card account, with the switch committed and no management token', async (t) => {
  const s = await setup(t);
  noCard(s);
  const job = openJob(s);
  const result = await s.install(job);
  assert.equal(result.last, 'done', result.err.join('\n'));
  assert.match(git('--git-dir', s.origin, 'show', 'main:app/wrangler.jsonc'), /"WORKSPACE_LOGIN": "off"/);
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');
  const value = readResult(job);
  assert.deepEqual(Object.keys(value).sort(), OPEN_KEYS);
  assert.deepEqual(value, {
    version: 1, mode: 'open', recipient: job.managementResult.recipient, source: await checkedOutSource(repoRoot, run),
    accountId: ACCOUNT, repo: REPO, ownerEmail: JOB.ownerEmail, anchorHostname: 'recipe-box.ada.workers.dev',
  });
  assert.equal(statSync(job.managementResult.path).mode & 0o777, 0o600);
  assert.deepEqual(managementTokens(s), []);
  assert.deepEqual(s.fake.state.accessApps, []);
  assert.equal((await s.install(job)).last, 'done', 'a retry of the same job reuses the open result');
  assert.deepEqual(readResult(job), value);
});

test('a job that does not ask stops on a no-card account, and a later Access error stops either way', async (t) => {
  const s = await setup(t);
  noCard(s);
  const stopped = await s.install(managedJob(s));
  assert.equal(stopped.last, 'cloudflare');
  assert.equal(s.pushed(), null);
  assert.equal(existsSync(join(s.dir, 'app/wrangler.jsonc')), false);
  withCard(s);
  s.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/apps`];
  for (const job of [JOB, { ...JOB, openWithoutLogin: true }]) {
    const later = await s.install(job);
    assert.equal(later.last, 'cloudflare', JSON.stringify(job));
    assert.equal(s.pushed(), null);
  }
});

test('a rerun after the card turns the install private and leaves the edit uncommitted', async (t) => {
  const s = await setup(t);
  noCard(s);
  assert.equal((await s.install(openJob(s))).last, 'done');
  const head = s.pushed();
  withCard(s);
  const reconnect = openJob(s, { generation: 2 });
  const result = await s.install(reconnect);
  assert.equal(result.last, 'done', result.err.join('\n'));
  assert.equal(s.pushed(), head);
  assert.equal(git('-C', s.dir, 'rev-parse', 'HEAD'), head);
  assert.match(git('-C', s.dir, 'status', '--porcelain'), /^ M app\/wrangler\.jsonc$/m);
  const config = parseConfig(join(s.dir, 'app/wrangler.jsonc'));
  assert.equal(config.vars.WORKSPACE_LOGIN, undefined);
  assert.equal(privateDeployment(config).appId, s.fake.state.accessApps[0].id);
  const value = readResult(reconnect);
  assert.equal(value.mode, undefined);
  assert.equal(value.appId, s.fake.state.accessApps[0].id);
  assert.deepEqual(managementTokens(s).map(token => token.id), [value.tokenId]);
});

test('a rerun still without the card finishes open again and changes no file', async (t) => {
  const s = await setup(t);
  noCard(s);
  assert.equal((await s.install(openJob(s))).last, 'done');
  const head = s.pushed();
  const reconnect = openJob(s, { generation: 2 });
  assert.equal((await s.install(reconnect)).last, 'done');
  assert.equal(readResult(reconnect).mode, 'open');
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');
  assert.equal(s.pushed(), head);
  assert.deepEqual(managementTokens(s), []);
});

test('a retry of an open job after the card replaces its open result with the restricted one', async (t) => {
  const s = await setup(t);
  noCard(s);
  const job = openJob(s);
  assert.equal((await s.install(job)).last, 'done');
  assert.equal(readResult(job).mode, 'open');
  withCard(s);
  assert.equal((await s.install(job)).last, 'done');
  const value = readResult(job);
  assert.equal(value.mode, undefined);
  assert.match(value.token, /^deploy-secret-/);
  assert.deepEqual(managementTokens(s).map(token => token.id), [value.tokenId]);
});

test('a refused push stops with push and keeps the commit; the next run pushes it', async (t) => {
  const s = await setup(t);
  git('-C', s.dir, 'remote', 'set-url', 'origin', join(s.root, 'missing.git'));
  assert.equal((await s.install()).last, 'push');
  const commit = git('-C', s.dir, 'rev-parse', 'HEAD');
  git('-C', s.dir, 'remote', 'set-url', 'origin', s.origin);
  assert.equal((await s.install()).last, 'done');
  assert.equal(s.pushed(), commit);
});

test('a name another project holds moves every name to the next free suffix', async (t) => {
  const s = await setup(t);
  s.fake.state.workers.push('recipe-box');
  assert.equal((await s.install()).last, 'done');
  const config = parseConfig(join(s.dir, 'app/wrangler.jsonc'));
  assert.equal(workerName(config), 'recipe-box-2');
  assert.equal(JSON.parse(readFileSync(join(s.dir, '.claude/.wong-stack.json'), 'utf8')).components.memory.database, 'recipe-box-2-memory');
  assert.deepEqual(s.fake.state.workers, ['recipe-box', 'recipe-box-2', 'recipe-box-2-staging']);
});

test('no Paseo never stops the install; once Paseo is set up, a rerun adds the presets', async (t) => {
  const s = await setup(t);
  s.env.PRESETS_PASEO_BIN = join(s.root, 'no-paseo');
  const without = await s.install();
  assert.equal(without.last, 'done', without.err.join('\n'));
  assert.match(without.err.at(-1), /^install-wongstack: Paseo presets skipped: Paseo is not installed/);

  const home = join(s.root, 'paseo-home');
  const bin = join(s.root, 'agents');
  mkdirSync(home);
  mkdirSync(bin);
  writeFileSync(join(home, 'config.json'), '{\n  "version": 1\n}\n');
  for (const name of ['paseo', 'claude']) {
    writeFileSync(join(bin, name), '#!/bin/sh\nexit 0\n');
    chmodSync(join(bin, name), 0o755);
  }
  Object.assign(s.env, { PASEO_HOME: home, PRESETS_PASEO_BIN: join(bin, 'paseo'), PATH: `${bin}:${s.env.PATH}` });
  const withPaseo = await s.install();
  assert.equal(withPaseo.last, 'done', withPaseo.err.join('\n'));
  assert.match(withPaseo.err.at(-1), /^install-wongstack: Paseo presets added: .*\[CLAUDE\] Explore \/ Plan, \[CLAUDE\] Apply \/ Ship/);
  const names = JSON.parse(readFileSync(join(home, 'config.json'), 'utf8')).daemon.agentProfiles.map((profile) => profile.name);
  assert.ok(names.includes('[CLAUDE] Explore / Plan') && names.includes('[CLAUDE] Apply / Ship'), names.join(', '));
  assert.equal(git('-C', s.dir, 'status', '--porcelain'), '');
});

// ── the reasons ─────────────────────────────────────────────────────────────

test('a repo with other work stops with repo and changes nothing', async (t) => {
  const s = await setup(t);
  git('-C', s.dir, 'commit', '-q', '--allow-empty', '-m', 'mine');
  const result = await s.install();
  assert.equal(result.last, 'repo');
  assert.deepEqual(result.err, ['install-wongstack: the repo already has work in it']);
  assert.deepEqual(result.out, ['repo'], 'a stop that is not a refused call prints the reason alone');
  assert.ok(!existsSync(join(s.dir, '.env')));
  assert.equal(s.fake.calls.length, 0);
});

test('a missing clone, a bad job, or no git email stops with repo', async (t) => {
  const s = await setup(t, { email: null });
  const noEmail = await s.install();
  assert.equal(noEmail.last, 'repo');
  assert.match(noEmail.err[0], /git has no user\.email/);
  assert.equal(s.pushed(), null);
  for (const job of ['not json', 'null', { ...JOB, token: '' }, { ...JOB, accountId: 'nope' }, { ...JOB, repo: 'ada' }, { ...JOB, repo: 'ada/..' }, { ...JOB, repo: 'ada/.' }]) {
    const bad = await s.install(job);
    assert.deepEqual([bad.code, bad.last], [1, 'repo'], JSON.stringify(job));
  }
  const elsewhere = await s.install({ ...JOB, repo: 'ada/other' });
  assert.equal(elsewhere.last, 'repo');
  assert.match(elsewhere.err[0], /other is not a clone/);
});

test('a refused call prints the call, without its query or the token, on the line before cloudflare', async (t) => {
  const s = await setup(t);
  s.fake.state.refusedPolls = 99;
  const result = await s.install();
  assert.equal(result.code, 1);
  assert.deepEqual(result.out, [`Cloudflare GET /accounts/${ACCOUNT}/d1/database: HTTP 403 10000`, 'cloudflare']);
  assert.match(result.out[0], CLOUDFLARE_CALL);
  assert.ok(!result.out[0].includes('?') && !result.out[0].includes(TOKEN));
});

test('an unreachable Cloudflare prints the reason alone', async (t) => {
  const s = await setup(t);
  const offline = async (url, init) => {
    if (url.includes('/d1/database')) throw new TypeError('fetch failed');
    return fetch(url, init);
  };
  const result = await s.install(JOB, { fetch: offline });
  assert.deepEqual(result.out, ['cloudflare']);
  assert.equal(result.err[0], `install-wongstack: Cloudflare GET /accounts/${ACCOUNT}/d1/database: unreachable`);
});

test('a refused token stops with token before anything is copied', async (t) => {
  const s = await setup(t);
  s.fake.state.refuse = ['GET /user/tokens/verify'];
  const result = await s.install();
  assert.equal(result.last, 'token');
  assert.ok(!existsSync(join(s.dir, '.agents')));
});

// ── the helpers ─────────────────────────────────────────────────────────────

test('the payload list names a listed file or folder the source lacks', () => {
  const files = ['.nvmrc', '.gitignore', 'a/one.md', 'dir/x.md', 'dir/skip/y.md', '.agents/skills/s/SKILL.md'];
  const list = { core: { skillDirs: ['s'], files: ['a/one.md'] }, pack: { dirs: ['dir'] }, scaffold: { exclude: ['dir/skip'] } };
  assert.deepEqual(payloadFiles(list, files), ['.agents/skills/s/SKILL.md', '.gitignore', '.nvmrc', 'a/one.md', 'dir/x.md']);
  assert.throws(() => payloadFiles({ ...list, ui: { files: ['a/two.md'] } }, files), { reason: 'repo', message: 'the source lacks payload files: a/two.md' });
  assert.throws(() => payloadFiles({ ...list, scaffold: { dirs: ['gone'] } }, files), { reason: 'repo', message: 'the source lacks payload folders: gone/' });
});

test('upstreamUrl turns a remote into the source page', () => {
  assert.equal(upstreamUrl('https://github.com/ada/WongStack.git\n'), 'https://github.com/ada/WongStack');
  assert.equal(upstreamUrl('git@github.com:ada/WongStack.git'), 'https://github.com/ada/WongStack');
  assert.equal(upstreamUrl('ssh://git@github.com/ada/WongStack'), 'https://github.com/ada/WongStack');
  assert.equal(upstreamUrl(''), 'https://github.com/matthewwong525/WongStack');
});

test('the installer exports every name a host imports, and CLOUDFLARE_CALL takes only a refused call', () => {
  for (const name of ['run', 'jobFolder', 'repoFolder', 'CLOUDFLARE_CALL']) assert.ok(name in installer, name);
  assert.match('Cloudflare PUT /user/tokens/abc: HTTP 403 9109', CLOUDFLARE_CALL);
  assert.match('Cloudflare GET /accounts/x/d1/database: HTTP 500', CLOUDFLARE_CALL);
  for (const line of ['Cloudflare GET /x?name=a: HTTP 403', 'Cloudflare GET /x: unreachable', 'Cloudflare GET /x: HTTP 403 not-a-code', 'git push: rejected']) {
    assert.doesNotMatch(line, CLOUDFLARE_CALL, line);
  }
});

test('jobFolder takes only a whole job with a safe repo name', () => {
  assert.equal(jobFolder(JOB), 'recipe-box');
  assert.equal(jobFolder({ ...JOB, token: undefined }), null);
  assert.equal(jobFolder(null), null);
  assert.equal(repoFolder('ada/my.repo_1'), 'my.repo_1');
  assert.equal(repoFolder('a/b/c'), null);
});

test('setEnv replaces only its own lines and keeps the rest', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-set-env-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, '.env');
  setEnv(file, { A: '1' });
  setEnv(file, { A: '2', B: 'x' });
  assert.equal(readFileSync(file, 'utf8'), 'A=2\nB=x\n');
  assert.equal(statSync(file).mode & 0o777, 0o600);
});
