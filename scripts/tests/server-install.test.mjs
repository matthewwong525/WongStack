// server/install-wongstack.mjs installs this checkout into a practice repo with a bare `origin`, against
// a fake Cloudflare and a fake `gh`. The expected file list comes from payload-files.json here, apart
// from the installer's own reading, so a payload file the installer misses fails and is named.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import * as installer from '../../server/install-wongstack.mjs';
import { CLOUDFLARE_CALL, jobFolder, main, payloadFiles, repoFolder, run, setEnv, upstreamUrl } from '../../server/install-wongstack.mjs';
import { readEnv } from '../../.agents/skills/wong-setup/scripts/provision.mjs';
import { databaseName, parseConfig, workerName } from '../lib-wrangler-config.mjs';
import { ACCOUNT, TOKEN, fakeCloudflare, fakeGh } from './fixtures/cloudflare.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const INSTALLER = join(repoRoot, 'server/install-wongstack.mjs');
const REPO = 'ada/recipe-box';
const JOB = { token: TOKEN, accountId: ACCOUNT, repo: REPO };
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
    ...[...core.files, ...ui.files, ...pack.files, ...scaffold.files].map(real),
    ...[...pack.dirs, ...scaffold.dirs].flatMap((dir) => under(real(dir))),
  ]);
  for (const gone of scaffold.exclude) paths.delete(real(gone));
  return [...paths].sort();
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
const secretsOf = (s) => [TOKEN, ...s.fake.state.minted, readEnv(join(s.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN].filter(Boolean);

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
  for (const path of ['.env', 'VERSION', 'CHANGELOG.md', 'server/setup.sh', '.agents/skills/wong-setup/SKILL.md', '.agents/rules/payload.md']) assert.ok(!tree.has(path), `${path} is not payload`);
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
  assert.equal(secrets.length, 3);
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
  assert.deepEqual(s.fake.state.workers, ['recipe-box']);
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
