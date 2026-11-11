import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { dailyBlocker, readDaily, startDaily, today } from '../../.agents/plugins/memory/scripts/lib/daily.mjs';
import { dailyCounts } from '../../.agents/plugins/memory/scripts/memory.mjs';
import { diffCounts } from '../../.agents/plugins/memory/scripts/run.mjs';
import { memory, node, PROFILE, rows, setup, tempDir } from './fixtures/memory/harness.mjs';

const DAY = today();
const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
const wait = async (check, ms = 15000) => {
  for (const end = Date.now() + ms; Date.now() < end; await new Promise(done => setTimeout(done, 100))) if (check()) return true;
  return false;
};

test('a chat starts the day\'s tidy only when nothing blocks it, and marks the try before it starts', t => {
  const ctx = { stateDir: tempDir(t, 'daily-state-') };
  const digest = { text: '', daily: null, older: false };
  const blocker = change => dailyBlocker({ env: {}, state: {}, digest, day: DAY, ...change });
  assert.equal(blocker({}), null);
  assert.equal(blocker({ env: { WONG_MEMORY_RUN: '1' } }), 'a background run');
  assert.equal(blocker({ env: { WONG_MEMORY_NO_HEADLESS: '1' } }), 'no headless runs');
  assert.equal(blocker({ state: { off: true } }), 'off on this computer');
  assert.equal(blocker({ state: { tried: DAY } }), 'tried today');
  assert.equal(blocker({ state: { tried: '2000-01-01' } }), null, 'a try on another day blocks nothing');
  assert.equal(blocker({ digest: { ...digest, older: true } }), 'the store can not claim a day');
  assert.equal(blocker({ digest: { error: { kind: 'network' } } }), 'the store can not claim a day');
  assert.equal(blocker({ digest: { ...digest, daily: { day: DAY, status: 'ok' } } }), 'done today');
  let seen;
  assert.equal(startDaily(ctx, digest, { env: {}, start: () => { seen = readDaily(ctx).tried; return true; } }), true);
  assert.equal(seen, DAY, 'tried is written before the start');
  assert.equal(startDaily(ctx, digest, { env: {}, start: () => assert.fail('a second chat the same day starts none') }), false);
});

test('the counts come from code: the tally and the diff, never the agent\'s own report', () => {
  assert.deepEqual(dailyCounts({ captured: 2, added: 3, dropped: 4, superseded: 1, consolidationSuperseded: 2 }, { pages: '2', links: '0' }),
    { captured: 2, added: 3, superseded: 3, pages: 2 });
  assert.deepEqual(dailyCounts({}, {}), {});
  const diff = [
    'diff --git a/wiki/a.md b/wiki/a.md', '--- a/wiki/a.md', '+++ b/wiki/a.md', '@@ -1 +1,2 @@',
    '-See [b](b.md).', '+See [b](b.md) and [c](c.md).', '+Also [d](d.md).',
    'diff --git a/app/x.ts b/app/x.ts', '--- a/app/x.ts', '+++ b/app/x.ts', '+// [e](e.md)',
    'diff --git a/wiki/new.md b/wiki/new.md', '--- /dev/null', '+++ b/wiki/new.md', '+# New', '+Up: [hub](README.md).',
  ].join('\n');
  assert.deepEqual(diffCounts(diff), { pages: 2, links: 3 });
});

// A fake `claude` on PATH: it logs which part called it, then does what STUB_TIDY says in part 2. The publish part
// logs each tool it refuses; the record names `current` and a source the store refuses.
function stubAgent(env) {
  const bin = join(env.repo.home, 'stub-bin');
  const log = join(env.repo.home, 'agent.log');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'claude'), `#!/bin/sh
case "$*" in
  *"publish step"*)
    echo publish >> "${log}"
    found=
    for arg; do
      if [ -n "$found" ]; then echo "$arg" >> "${log}.deny"; fi
      if [ "$arg" = --disallowedTools ]; then found=1; fi
    done ;;
  *"memory daily tidy for this repository"*)
    echo tidy >> "${log}"
    record="$(dirname "$PWD")/record.json"
    echo '{"session":"current","source":"dream","slug":"memory-daily","facts":[{"action":"add","type":"project","body":"Daily tidy ${DAY}: read facts up to #1."}]}' > "$record"
    case "$STUB_TIDY" in
      edit) echo 'See [hub](README.md).' >> README.md ;;
      hang) echo 'See [hub](README.md).' >> README.md; exec sleep 20 ;;
    esac ;;
  *) echo capture >> "${log}" ;;
esac
`);
  chmodSync(join(bin, 'claude'), 0o755);
  writeFileSync(join(bin, 'codex'), `#!/bin/sh\necho codex >> "${log}"\n`, { mode: 0o755 });
  const lines = file => existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
  return { bin, calls: () => lines(log), denied: () => lines(`${log}.deny`) };
}

// A bare origin with main on it, so the tidy can make its copy of the default branch.
function withOrigin(t, env) {
  const origin = join(tempDir(t, 'daily-origin-'), 'origin.git');
  git(env.repo.root, 'init', '-q', '--bare', origin);
  git(env.repo.root, 'remote', 'add', 'origin', origin);
  git(env.repo.root, 'push', '-q', 'origin', 'main');
  return origin;
}

async function dailyRepo(t, extra = {}) {
  const env = await setup(t);
  const origin = withOrigin(t, env);
  const agent = stubAgent(env);
  const temp = tempDir(t, 'daily-tmp-');
  const run = (args = [], more = {}) => node(env.repo, env.fake, 'run.mjs', ['--daily', ...args],
    { env: { PATH: `${agent.bin}:${process.env.PATH}`, TMPDIR: temp, ...extra, ...more } });
  const left = () => ({ temp: readdirSync(temp), worktrees: git(env.repo.root, 'worktree', 'list').split('\n').length });
  return { env, origin, agent, run, left };
}

// A profile that changes WongStack's tidy settings, for one run's WONG_MEMORY_PROFILE.
function profileWith(env, tidy) {
  const file = join(env.repo.home, 'tidy-profile.mjs');
  writeFileSync(file, `import base from ${JSON.stringify(pathToFileURL(PROFILE).href)};
export default { ...base, tidy: { ...base.tidy, ...${JSON.stringify(tidy)} } };\n`);
  return file;
}

const dailyRows = env => rows(env, "SELECT day, status, reason, counts FROM runs WHERE kind = 'daily'");
const recorded = env => rows(env, "SELECT body FROM facts WHERE body LIKE 'Daily tidy%'").length;

test('a day with no page edits records the tidy and publishes nothing; a second run the same day loses the claim and writes nothing', async t => {
  const { env, agent, run, left } = await dailyRepo(t);
  const first = await run();
  assert.equal(first.code, 0, first.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy'], 'no publish call with no edits');
  assert.deepEqual(dailyRows(env), [{ day: DAY, status: 'ok', reason: null, counts: '{}' }]);
  assert.equal(recorded(env), 1, 'the record is sent when there is nothing to publish');
  assert.equal(rows(env, 'SELECT count(*) AS n FROM sessions')[0].n, 0, 'the record names no session, so no live chat is marked captured');
  assert.deepEqual(left(), { temp: [], worktrees: 1 });
  const facts = rows(env, 'SELECT count(*) AS n FROM facts')[0].n;
  const second = await run();
  assert.equal(second.code, 0, second.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy'], 'a lost claim starts no agent');
  assert.equal(dailyRows(env).length, 1);
  assert.equal(rows(env, 'SELECT count(*) AS n FROM facts')[0].n, facts);
  assert.equal(existsSync(join(env.repo.stateDir, 'run-tally.json')), false);
});

test('page edits publish through the profile\'s line, then the record is sent, with the counts made by code', async t => {
  const { env, agent, run } = await dailyRepo(t, { STUB_TIDY: 'edit' });
  const result = await run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy', 'publish']);
  assert.deepEqual(dailyRows(env).map(row => ({ ...row, counts: JSON.parse(row.counts) })), [{ day: DAY, status: 'ok', reason: null, counts: { pages: 1, links: 1 } }]);
  assert.equal(recorded(env), 1);
});

test('the publish step refuses the deny list the tidy refuses, and Codex with a deny list runs neither', async t => {
  const { env, agent, run } = await dailyRepo(t, { STUB_TIDY: 'edit' });
  const profile = profileWith(env, { deny: ['Bash(rm:*)', 'Bash(curl:*)'] });
  const result = await run([], { WONG_MEMORY_PROFILE: profile });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy', 'publish']);
  assert.deepEqual(agent.denied(), ['Bash(rm:*)', 'Bash(curl:*)']);
  const codex = await run(['--agent', 'codex', '--force'], { WONG_MEMORY_PROFILE: profile });
  assert.equal(codex.code, 0, codex.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy', 'publish', 'codex'], 'Codex runs only the capture part');
  assert.deepEqual(dailyRows(env).map(row => [row.status, row.reason]), [['failed', 'the deny list works only with Claude Code']]);
});

test('a tidy killed at its time limit throws its edits away and sends no record; the copy is gone', async t => {
  const { env, agent, run, left } = await dailyRepo(t, { STUB_TIDY: 'hang', WONG_MEMORY_DAILY_WORK_MS: '2000' });
  // With no publish line, edits that got past the kill would wait on a local daily-tidy branch.
  const result = await run([], { WONG_MEMORY_PROFILE: profileWith(env, { publish: null }) });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy']);
  assert.deepEqual(dailyRows(env), [{ day: DAY, status: 'failed', reason: 'the tidy reached its 30 minutes; its page edits were thrown away', counts: '{}' }]);
  assert.equal(recorded(env), 0, 'no read record');
  assert.equal(git(env.repo.root, 'branch', '--list', 'daily-tidy-*'), '', 'no edits were kept');
  assert.deepEqual(left(), { temp: [], worktrees: 1 });
});

test('a failed copy still records the day and leaves nothing behind', async t => {
  const { env, agent, run, left } = await dailyRepo(t);
  git(env.repo.root, 'remote', 'remove', 'origin');
  const result = await run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture']);
  assert.deepEqual(dailyRows(env), [{ day: DAY, status: 'failed', reason: 'could not make a copy of the default branch', counts: '{}' }]);
  assert.deepEqual(left(), { temp: [], worktrees: 1 });
});

test('the first chat of the day starts the tidy within 5 seconds, the second chat none, and off or a background run none', async t => {
  const { env, agent } = await dailyRepo(t);
  const temp = tempDir(t, 'daily-hook-tmp-');
  const hook = (extra = {}) => node(env.repo, env.fake, 'session-start.mjs', ['--agent', 'claude'],
    { input: JSON.stringify({ session_id: 'live-1', cwd: env.repo.root }), env: { PATH: `${agent.bin}:${process.env.PATH}`, TMPDIR: temp, ...extra } });
  const state = () => readDaily({ stateDir: env.repo.stateDir });
  const background = await hook({ WONG_MEMORY_RUN: '1' });
  assert.equal(background.code, 0, background.stderr);
  assert.equal(state().tried, undefined, 'a background run starts none');
  writeFileSync(join(env.repo.stateDir, 'daily.json'), '{"off":true}\n');
  await hook();
  assert.equal(state().tried, undefined, 'off starts none');
  writeFileSync(join(env.repo.stateDir, 'daily.json'), '{}\n');
  const started = Date.now();
  const first = await hook();
  assert.equal(first.code, 0, first.stderr);
  assert.ok(Date.now() - started < 5000, 'the hook ends within 5 seconds');
  assert.equal(state().tried, DAY);
  assert.ok(await wait(() => dailyRows(env)[0]?.status === 'ok'), 'the detached tidy finished');
  await wait(() => readdirSync(temp).length === 0);
  await hook();
  await new Promise(done => setTimeout(done, 500));
  assert.deepEqual(agent.calls(), ['capture', 'tidy'], 'the second chat starts none');
});

test('memory.mjs daily shows the last tidy, turns it off and on here, and starts one now', async t => {
  const { env, agent, left } = await dailyRepo(t);
  const temp = tempDir(t, 'daily-now-tmp-');
  const daily = (...args) => memory(env.repo, env.fake, ['daily', ...args], { env: { PATH: `${agent.bin}:${process.env.PATH}`, TMPDIR: temp } });
  assert.equal((await daily()).stdout, 'No daily memory tidy has run yet.\n');
  assert.match((await daily('off')).stdout, /off/i);
  assert.equal(readDaily({ stateDir: env.repo.stateDir }).off, true);
  assert.match((await daily('on')).stdout, /on/i);
  assert.equal(readDaily({ stateDir: env.repo.stateDir }).off, false);
  assert.equal((await daily('now')).stdout, 'Started a daily memory tidy in the background.\n');
  assert.ok(await wait(() => dailyRows(env)[0]?.status === 'ok'), 'daily now ran the tidy');
  await wait(() => readdirSync(temp).length === 0);
  assert.deepEqual(readdirSync(temp), []);
  assert.equal(left().worktrees, 1);
  assert.match((await daily()).stdout, new RegExp(`^Last daily tidy: ${DAY} on .+, ok`));
  await daily('off');
  assert.match((await daily()).stdout, /It is off on this computer\.\n$/);
  const wrong = await daily('later');
  assert.notEqual(wrong.code, 0);
});
