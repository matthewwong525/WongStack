import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { test } from 'node:test';
import { dailyBlocker, readDaily, startDaily, today } from '../../.agents/plugins/memory/scripts/lib/daily.mjs';
import { dailyCounts } from '../../.agents/plugins/memory/scripts/memory.mjs';
import { diffCounts, mapChanges, runNote } from '../../.agents/plugins/memory/scripts/run.mjs';
import { memory, node, PROFILE, rows, setup, tempDir, writeJsonFile } from './fixtures/memory/harness.mjs';

const DAY = today();
const TIDY = fileURLToPath(new URL('../../.agents/plugins/memory/scripts/daily-tidy.mjs', import.meta.url));
const CUT_SHORT = "stopped at its time limit; the rest is on tomorrow's map";
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

// A fake `claude` on PATH: it logs which part called it, then does what STUB_TIDY says in part 2, marking a finished
// part with `keep` as the tidy does. The publish part logs each tool it refuses; STUB_PUBLISH=fail makes it fail.
function stubAgent(env) {
  const bin = join(env.repo.home, 'stub-bin');
  const log = join(env.repo.home, 'agent.log');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'claude'), `#!/bin/sh
keep() { "${process.execPath}" "${TIDY}" keep "$@" > /dev/null; }
case "$*" in
  *"publish step"*)
    echo publish >> "${log}"
    found=
    for arg; do
      if [ -n "$found" ]; then echo "$arg" >> "${log}.deny"; fi
      if [ "$arg" = --disallowedTools ]; then found=1; fi
    done
    if [ "$STUB_PUBLISH" = fail ]; then exit 3; fi ;;
  *"memory daily tidy for this repository"*)
    echo tidy >> "${log}"
    printf '%s' "$*" > "${log}.prompt"
    case "$STUB_TIDY" in
      edit) echo 'See [hub](README.md).' >> README.md ;;
      hang) echo 'See [hub](README.md).' >> README.md; exec sleep 20 ;;
      keep) mkdir -p wiki; echo '# One' > wiki/one.md; keep --read 5 --sorted 3 --checked wiki/old.md --linked 'one and old' ;;
      killed)
        mkdir -p wiki; echo '# One' > wiki/one.md; keep --read 5 --checked wiki/one.md
        echo '# Two' > wiki/two.md; keep --sorted 3 --checked tag:loose
        echo '# Three' > wiki/three.md; echo 'Not finished.' >> wiki/one.md; kill -KILL $$ ;;
      answer) mkdir -p wiki; echo "$STUB_PAGE" > wiki/answers.md; keep --checked wiki/answers.md ;;
    esac ;;
  *) echo capture >> "${log}" ;;
esac
`);
  chmodSync(join(bin, 'claude'), 0o755);
  writeFileSync(join(bin, 'codex'), `#!/bin/sh\necho codex >> "${log}"\n`, { mode: 0o755 });
  const lines = file => existsSync(file) ? readFileSync(file, 'utf8').trim().split('\n') : [];
  return { bin, calls: () => lines(log), denied: () => lines(`${log}.deny`), prompt: () => readFileSync(`${log}.prompt`, 'utf8') };
}

// A bare origin with main on it, so the tidy can make its copy of the default branch.
function withOrigin(t, env) {
  const origin = join(tempDir(t, 'daily-origin-'), 'origin.git');
  git(env.repo.root, 'init', '-q', '--bare', origin);
  git(env.repo.root, 'remote', 'add', 'origin', origin);
  git(env.repo.root, 'push', '-q', 'origin', 'main');
  return origin;
}

// `prepare(env)` commits what the default branch holds before the first tidy.
async function dailyRepo(t, extra = {}, prepare = () => {}) {
  const env = await setup(t);
  prepare(env);
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
// Live records only: upkeep states a record that names a page again, to add the page's topic.
const records = env => rows(env, "SELECT body FROM facts WHERE body LIKE 'Daily tidy%' AND superseded_by IS NULL ORDER BY id").map(row => row.body);
const recorded = env => records(env).length;
// The store has written 400 facts before the tidy, so a record that names fact #5 comes after it.
const manyFacts = env => env.fake.db.exec("DELETE FROM sqlite_sequence WHERE name = 'facts'; INSERT INTO sqlite_sequence (name, seq) VALUES ('facts', 400)");
// The default branch holds one page last changed in January, so it is due.
function oldPage(env) {
  mkdirSync(join(env.repo.root, 'wiki'), { recursive: true });
  writeFileSync(join(env.repo.root, 'wiki/old.md'), '# Old\n\nAn old page.\n');
  const dated = { ...process.env, GIT_AUTHOR_DATE: '2026-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2026-01-01T00:00:00Z' };
  execFileSync('git', ['-C', env.repo.root, 'add', 'wiki/old.md'], { env: dated });
  execFileSync('git', ['-C', env.repo.root, 'commit', '-q', '-m', 'old page'], { env: dated });
}

test('a day with no page edits records the tidy and publishes nothing; a second run the same day loses the claim and writes nothing', async t => {
  const { env, agent, run, left } = await dailyRepo(t);
  const first = await run();
  assert.equal(first.code, 0, first.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy'], 'no publish call with no edits');
  assert.deepEqual(dailyRows(env), [{ day: DAY, status: 'ok', reason: null, counts: '{}' }]);
  assert.deepEqual(records(env), [`Daily tidy ${DAY}: read facts up to #0. Sorted facts up to #0. Checked: none. Linked: none. Map: no change.`],
    'the record is sent when there is nothing to publish');
  assert.match(agent.prompt(), /references\/tidy\.md[\s\S]*The map now:\nnew facts: 0\n[\s\S]*used together: 0 --/, 'the tidy starts with its brief and the map');
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

test('a tidy killed at its time limit with no part kept fails and keeps nothing; the copy is gone', async t => {
  const { env, agent, run, left } = await dailyRepo(t, { STUB_TIDY: 'hang', WONG_MEMORY_DAILY_WORK_MS: '2000' });
  // With no publish line, edits that got past the kill would wait on a local daily-tidy branch.
  const result = await run([], { WONG_MEMORY_PROFILE: profileWith(env, { publish: null }) });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy']);
  assert.deepEqual(dailyRows(env), [{ day: DAY, status: 'failed', reason: 'the tidy reached its time limit with no part finished; nothing was kept', counts: '{}' }]);
  assert.equal(recorded(env), 0, 'no read record');
  assert.equal(git(env.repo.root, 'branch', '--list', 'daily-tidy-*'), '', 'no edits were kept');
  assert.deepEqual(left(), { temp: [], worktrees: 1 });
});

test('a tidy killed after two kept parts publishes what it staged, drops the rest, and says it stopped', async t => {
  const { env, agent, run, left } = await dailyRepo(t, { STUB_TIDY: 'killed' });
  manyFacts(env);
  const result = await run([], { WONG_MEMORY_PROFILE: profileWith(env, { publish: null }) });
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy']);
  assert.deepEqual(dailyRows(env).map(row => ({ ...row, counts: JSON.parse(row.counts) })), [{ day: DAY, status: 'ok', reason: CUT_SHORT, counts: { pages: 2 } }]);
  const branch = `daily-tidy-${DAY}`;
  assert.deepEqual(git(env.repo.root, 'show', '--name-only', '--format=', branch).split('\n'), ['wiki/one.md', 'wiki/two.md'], 'the page no keep staged is dropped');
  assert.equal(git(env.repo.root, 'show', `${branch}:wiki/one.md`), '# One', 'so is an edit made after the keep');
  assert.deepEqual(records(env), [`Daily tidy ${DAY}: read facts up to #5. Sorted facts up to #3. Checked: wiki/one.md, tag:loose. Linked: none. Map: no change.`]);
  assert.deepEqual(left(), { temp: [], worktrees: 1 });
});

test("the record holds the highest ids the tidy kept and the changed map numbers; a tidy that keeps none repeats the last record's ids", async t => {
  const { env, agent, run } = await dailyRepo(t, {}, oldPage);
  manyFacts(env);
  const temp = { PATH: `${agent.bin}:${process.env.PATH}` };
  const first = await run([], { STUB_TIDY: 'keep' });
  assert.equal(first.code, 0, first.stderr);
  assert.match(agent.prompt(), /^due pages: 1; wiki\/old\.md$/m);
  assert.deepEqual(records(env), [`Daily tidy ${DAY}: read facts up to #5. Sorted facts up to #3. Checked: wiki/old.md. Linked: one and old. Map: due pages 1 to 0.`]);
  assert.deepEqual(dailyRows(env).map(row => ({ ...row, counts: JSON.parse(row.counts) })), [{ day: DAY, status: 'ok', reason: 'pages to check 1 -> 0', counts: { pages: 1 } }]);
  const shown = await memory(env.repo, env.fake, ['daily'], { env: temp });
  assert.match(shown.stdout, new RegExp(`^Last daily tidy: ${DAY} on .+, ok: .+\\n  pages to check 1 -> 0\\n$`));
  const chat = await node(env.repo, env.fake, 'session-start.mjs', ['--agent', 'claude'], { input: JSON.stringify({ session_id: 'live-2', cwd: env.repo.root }), env: temp });
  assert.match(chat.stdout, /Last tidy \([^)\n]+\):\n  [^\n]+\n  pages to check 1 -> 0\n/, 'the next chat starts with what the tidy changed');
  assert.doesNotMatch(chat.stdout, /needs you|for you to|please/i, 'no line asks the person for anything');

  const second = await run(['--force']);
  assert.equal(second.code, 0, second.stderr);
  assert.equal(records(env)[1], `Daily tidy ${DAY}: read facts up to #5. Sorted facts up to #3. Checked: none. Linked: none. Map: no change.`);
});

test('missed questions are asked again: six of which five now find a page read 6 to 1', async t => {
  const page = '# Answers\n\nThe courier pickup is on Friday. A refund approval needs the owner. The invoice numbering scheme starts at 1000. The warehouse opening hours are 9 to 5. The supplier contact sheet is in the office.';
  const { env, run } = await dailyRepo(t, { STUB_TIDY: 'answer', STUB_PAGE: page });
  const questions = ['courier pickup friday', 'refund approval owner', 'invoice numbering scheme', 'warehouse opening hours', 'supplier contact sheet', 'zebra migration quota'];
  writeFileSync(join(env.repo.stateDir, 'usage.jsonl'), questions.map(words => `${JSON.stringify({ at: new Date().toISOString(), command: 'recall', node: null, topics: [], facts: [], workspace: 'w', miss: true, words })}\n`).join(''));
  const result = await run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(dailyRows(env).map(row => [row.status, row.reason]), [['ok', 'questions with no answer 6 -> 1']]);
  assert.deepEqual(records(env), [`Daily tidy ${DAY}: read facts up to #0. Sorted facts up to #0. Checked: wiki/answers.md. Linked: none. Map: missed questions 6 to 1.`]);
  assert.doesNotMatch(records(env)[0], /courier|zebra/, "a missed question's words stay on this computer");
  assert.equal(readFileSync(join(env.repo.stateDir, 'usage.jsonl'), 'utf8').trim().split('\n').length, 6, 'asking again counts no use');
});

test('a second ask that gets only unrelated facts and passages is still missed', async t => {
  const page = '# Answers\n\nThe courier pickup is on Friday. The washing machine is in the yard.';
  const { env, run } = await dailyRepo(t, { STUB_TIDY: 'answer', STUB_PAGE: page });
  const stored = await memory(env.repo, env.fake, ['put-facts', '--file', writeJsonFile(env.repo.home, 'in.json', { source: 'save', slug: 'office',
    facts: [{ action: 'add', type: 'project', body: 'The office opens at 9.', tags: ['memory'] }] })]);
  assert.equal(stored.code, 0, stored.stderr);
  const questions = ['courier pickup friday', 'espresso machine office'];
  writeFileSync(join(env.repo.stateDir, 'usage.jsonl'), questions.map(words => `${JSON.stringify({ at: new Date().toISOString(), command: 'recall', node: null, topics: [], facts: [], workspace: 'w', miss: true, words })}\n`).join(''));
  const asked = JSON.parse((await memory(env.repo, env.fake, ['recall', 'espresso machine office', '--mode', 'keyword', '--json'], { env: { WONG_MEMORY_RUN: '1' } })).stdout);
  assert.deepEqual(asked.facts.map(fact => fact.body), ['The office opens at 9.'], 'the question does get a fact');
  const result = await run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(dailyRows(env).map(row => [row.status, row.reason.split('\n')[0]]), [['ok', 'questions with no answer 2 -> 1']]);
});

test('a failed publish sends no record, so the next tidy reads the same facts again', async t => {
  const { env, agent, run } = await dailyRepo(t, { STUB_TIDY: 'keep', STUB_PUBLISH: 'fail' });
  const result = await run();
  assert.equal(result.code, 0, result.stderr);
  assert.deepEqual(agent.calls(), ['capture', 'tidy', 'publish']);
  assert.deepEqual(dailyRows(env).map(row => [row.status, row.reason]), [['failed', 'the publish exited with code 3']]);
  assert.equal(recorded(env), 0);
});

test('the note names each changed map number in plain words, the stop at the limit, and facts left unread', () => {
  const map = counts => ({ lines: Object.entries(counts).map(([name, count]) => ({ name, count, names: [] })) });
  const before = map({ 'new facts': 9, 'no topic': 40, 'tags with no page': 3, 'large topics': 2, 'gone files': 1, 'due pages': 12, 'missed questions': 6, 'most used': 4 });
  const after = map({ 'new facts': 0, 'no topic': 12, 'tags with no page': 3, 'large topics': 1, 'gone files': 0, 'due pages': 5, 'missed questions': 6, 'most used': 9 });
  const changes = mapChanges(before, after, 1);
  assert.deepEqual(changes, [['no topic', 40, 12], ['large topics', 2, 1], ['gone files', 1, 0], ['due pages', 12, 5], ['missed questions', 6, 1]]);
  assert.deepEqual(mapChanges(before, before, 6), []);
  assert.equal(runNote({ changes, cut: true, unread: 4 }), ['facts with no topic 40 -> 12', 'topics too big to read 2 -> 1', 'facts that name a gone file 1 -> 0',
    'pages to check 12 -> 5', 'questions with no answer 6 -> 1', CUT_SHORT, 'new facts left unread 4'].join('\n'));
  assert.equal(runNote({}), '');
  assert.ok(runNote({ changes: Array.from({ length: 30 }, () => ['no topic', 1234567, 7654321]), cut: true }).length <= 300, 'inside what the store keeps of a reason');
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
