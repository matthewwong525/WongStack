import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { hostname, tmpdir } from 'node:os';
import { join } from 'node:path';
import { readLines } from '../practice/grade.mjs';
import { compare, loadErrands, lockHeld, practiceEnv, previousResults, report, runAll, runErrand, sh } from '../practice/run.mjs';

// A HOME of its own, so the hand-over and cloud browser state, the results, and the namespace folder
// the runner reads and writes are this test's. A Paseo variable proves the runner drops them.
const home = mkdtempSync(join(tmpdir(), 'practice-run-'));
const saved = { HOME: process.env.HOME, PASEO_AGENT_ID: process.env.PASEO_AGENT_ID, TMPDIR: process.env.TMPDIR };
before(() => {
  process.env.HOME = home;
  process.env.PASEO_AGENT_ID = 'maintainer-chat';
  process.env.TMPDIR = join(home, 'tmp');
  mkdirSync(process.env.TMPDIR);
});
after(() => {
  for (const [key, value] of Object.entries(saved)) if (value === undefined) delete process.env[key]; else process.env[key] = value;
  rmSync(home, { recursive: true, force: true });
});

const [mug] = loadErrands();

/** A command runner that records each call and answers like git and agent-browser. */
function fakeRun() {
  const calls = [];
  const run = async (command, args, { env, input } = {}) => {
    calls.push({ command, args, env, input });
    if (command === 'agent-browser' && args.join(' ') === 'session list --json') return { code: 0, stdout: JSON.stringify({ data: { sessions: [env.AGENT_BROWSER_SESSION, 'practice-extra'] } }), stderr: '' };
    return { code: 0, stdout: '', stderr: '' };
  };
  return { run, calls };
}

const say = text => ({ type: 'assistant', message: { content: [{ type: 'text', text }] } });
const result = cost => ({ type: 'result', subtype: 'success', total_cost_usd: cost });

/** A fake Agent SDK query(): `ok` plays two turns, `throw` fails, `hang` waits for the time cap. */
function fakeQuery(mode, seen) {
  return ({ prompt, options }) => (async function* () {
    seen.options = options;
    const turns = prompt[Symbol.asyncIterator]();
    seen.request = (await turns.next()).value.message.content;
    if (mode === 'throw') throw new Error('the model fell over');
    if (mode === 'hang') await new Promise((_, reject) => options.abortController.signal.addEventListener('abort', () => reject(new Error('aborted'))));
    const asked = await options.canUseTool('AskUserQuestion', { questions: [{ question: 'Where should it ship?', options: [{ label: 'Home' }, { label: 'Office' }] }] }, {});
    seen.answers = asked.updatedInput.answers;
    seen.denied = await options.canUseTool('Bash', { command: 'agent-browser close --all' }, {});
    yield say('Which font do you like?');
    yield result(0.5);
    seen.reply = (await turns.next()).value.message.content;
    yield say('Okay, stopping here.');
    yield result(0.8);
    seen.end = await turns.next();
  })();
}

async function runOne(mode) {
  const seen = {};
  const { run, calls } = fakeRun();
  const outDir = mkdtempSync(join(home, 'out-'));
  const ran = await runErrand(mug, { runId: 'r1', outDir, minutes: mode === 'hang' ? 0.002 : 1, deps: { query: fakeQuery(mode, seen), run, launch: async () => { throw new Error('no link in this test'); } } });
  return { seen, calls, ran };
}

/** What every run must leave behind: nothing. */
async function assertCleanedUp({ seen, calls, ran }) {
  const lines = calls.map(call => [call.command, ...call.args].join(' '));
  const worktree = seen.options.cwd;
  assert.ok(lines.some(line => line.startsWith('git -C') && line.endsWith(`worktree add --detach ${worktree} HEAD`)));
  assert.ok(lines.some(line => line.endsWith(`worktree remove --force ${worktree}`)));
  assert.equal(existsSync(worktree), false, 'the worktree is gone');
  assert.equal(existsSync(seen.options.env.AGENT_BROWSER_PROFILE), false, 'the temp profile is gone');
  const save = calls.find(call => call.args[0] === 'auth' && call.args[1] === 'save');
  assert.equal(save.args[2], 'practice-shop-r1-blue-mug');
  assert.equal(save.input, ran.secrets[0], 'the password goes on stdin, never argv');
  assert.ok(!save.args.includes(ran.secrets[0]));
  assert.ok(lines.includes('agent-browser auth delete practice-shop-r1-blue-mug'));
  assert.ok(lines.indexOf('agent-browser auth delete practice-shop-r1-blue-mug') < lines.indexOf('agent-browser --session practice-r1-blue-mug close'), 'the login goes before the close, because auth starts a browser');
  assert.ok(lines.includes('agent-browser --session practice-r1-blue-mug close'));
  assert.ok(lines.includes('agent-browser --session practice-extra close'));
  assert.ok(!lines.some(line => /--all\b/.test(line)), 'never close --all');
  assert.ok(calls.filter(call => call.command === 'agent-browser').every(call => call.env.AGENT_BROWSER_NAMESPACE === 'practice-r1'), 'every browser command stays in the practice namespace');
  const shopUrl = /http:\/\/127\.0\.0\.1:\d+/.exec(seen.request)[0];
  await assert.rejects(fetch(shopUrl), 'the shop is closed');
}

test('a finished errand runs isolated, keeps the transcript, and cleans up', async () => {
  const one = await runOne('ok');
  const { env } = one.seen.options;
  assert.equal(env.WONG_MEMORY_RUN, '1');
  assert.equal(env.PASEO_AGENT_ID, undefined, 'no Paseo variable reaches the agent');
  assert.equal(env.AGENT_BROWSER_NAMESPACE, 'practice-r1');
  assert.equal(env.AGENT_BROWSER_SESSION, 'practice-r1-blue-mug');
  assert.equal(one.seen.options.persistSession, false);
  assert.deepEqual(one.seen.options.settingSources, ['project']);
  assert.deepEqual(one.seen.answers, { 'Where should it ship?': 'Office' });
  assert.equal(one.seen.denied.behavior, 'deny');
  assert.equal(one.seen.reply, 'Not now. Stop here.');
  assert.equal(one.seen.end.done, true, 'no question in the last turn ends the errand');
  assert.equal(one.ran.stopped, 'done');
  assert.equal(one.ran.costUsd, 0.8);
  const kept = readLines(one.ran.transcript);
  assert.deepEqual(kept.filter(line => line.type === 'person').map(line => line.via), ['request', 'question: Where should it ship?', 'chat']);
  assert.ok(kept.some(line => line.type === 'denied'));
  await assertCleanedUp(one);
});

test('a thrown error still cleans up', async () => {
  const one = await runOne('throw');
  assert.equal(one.ran.stopped, 'error: the model fell over');
  await assertCleanedUp(one);
});

test('the time cap stops the errand and cleans up', async () => {
  const one = await runOne('hang');
  assert.equal(one.ran.stopped, 'timeout');
  await assertCleanedUp(one);
});

test('the checkout hides the practice files, the agent gets its own temp folder, and the profile waits for Chrome', async () => {
  const seen = {};
  const calls = [];
  let heldWhenReleased = null;
  // git: `worktree add` lays down tracked files, two of them practice files; `ls-files` names untracked
  // ones (real files here, copied in); `diff --cached` names one file the agent changed.
  const run = async (command, args, { env } = {}) => {
    calls.push([command, ...args].join(' '));
    if (args.includes('worktree') && args.includes('add')) {
      const dir = args.at(-2);
      for (const file of ['scripts/practice/shop.mjs', 'scripts/tests/practice-grade.test.mjs', 'scripts/tests/hand-over.test.mjs', 'openspec/changes/practice-errands/proposal.md', 'AGENTS.md']) {
        mkdirSync(join(dir, file, '..'), { recursive: true });
        writeFileSync(join(dir, file), 'x');
      }
      mkdirSync(join(dir, 'wiki/maintaining'), { recursive: true });
      writeFileSync(join(dir, 'wiki/maintaining/README.md'), '- [Repo layout](repo-layout.md)\n- [Practice errands](practice-errands.md) — the shop\n');
    }
    if (args.includes('ls-files')) return { code: 0, stdout: ['wiki/maintaining/practice-errands.md', 'scripts/practice/errands.json', 'wiki/voice.md', ''].join('\0'), stderr: '' };
    if (args.includes('write-tree')) return { code: 0, stdout: 'tree1\n', stderr: '' };
    if (args.includes('--cached')) return { code: 0, stdout: 'wiki/people/sam.md\n', stderr: '' };
    if (command === 'agent-browser' && args.at(-1) === 'close' && args[1] === env.AGENT_BROWSER_SESSION) {
      const profile = env.AGENT_BROWSER_PROFILE;
      setTimeout(() => { heldWhenReleased = existsSync(profile); rmSync(join(profile, 'SingletonLock')); }, 400);
    }
    return { code: 0, stdout: '', stderr: '' };
  };
  const query = ({ prompt, options }) => (async function* () {
    await prompt[Symbol.asyncIterator]().next();
    const files = dir => readdirSync(dir, { recursive: true }).map(String);
    seen.files = files(options.cwd);
    seen.hub = readFileSync(join(options.cwd, 'wiki/maintaining/README.md'), 'utf8');
    seen.tmp = options.env.TMPDIR;
    seen.claudeTmp = options.env.CLAUDE_CODE_TMPDIR;
    seen.profile = options.env.AGENT_BROWSER_PROFILE;
    symlinkSync(`${hostname()}-${process.pid}`, join(seen.profile, 'SingletonLock'));
    writeFileSync(join(seen.tmp, 'cookies.txt'), 'x');
    yield result(0.1);
  })();
  const ran = await runErrand(mug, { runId: 'r2', outDir: mkdtempSync(join(home, 'out-')), deps: { query, run, launch: async () => null } });
  assert.equal(ran.stopped, 'done');
  for (const gone of ['scripts/practice', 'scripts/tests/practice-grade.test.mjs', 'openspec/changes/practice-errands', 'wiki/maintaining/practice-errands.md']) {
    assert.ok(!seen.files.some(file => file === gone || file.startsWith(`${gone}/`)), `${gone} is hidden`);
  }
  assert.equal(seen.hub, '- [Repo layout](repo-layout.md)\n', 'the hub no longer points at the hidden page');
  for (const kept of ['AGENTS.md', 'scripts/tests/hand-over.test.mjs', 'wiki/voice.md']) assert.ok(seen.files.includes(kept), `${kept} stays`);
  assert.equal(seen.claudeTmp, seen.tmp);
  assert.equal(existsSync(seen.tmp), false, 'the agent\'s temp folder is gone');
  assert.equal(heldWhenReleased, true, 'the profile stayed until Chrome let go of it');
  assert.throws(() => lstatSync(seen.profile), 'then it is gone');
  assert.deepEqual(ran.cleanup, []);
  assert.ok(calls.indexOf(`git -C ${calls.find(line => line.includes('write-tree')).split(' ')[2]} add -A`) >= 0);
  assert.deepEqual(readLines(ran.transcript).at(-1), { type: 'checkout', changed: ['wiki/people/sam.md'] });
});

test('the stand-in works each new link the agent sends in a turn, in order', async () => {
  const opened = [];
  const query = ({ prompt }) => (async function* () {
    const turns = prompt[Symbol.asyncIterator]();
    await turns.next();
    yield say('Here is your link: http://127.0.0.1:4100/#key=aaa');
    yield say('That one closed early. Here is a new one: http://127.0.0.1:4101/#key=bbb');
    yield say('Same link again: http://127.0.0.1:4101/#key=bbb');
    yield result(0.2);
    opened.reply = (await turns.next()).value?.message.content;
  })();
  const launch = async () => { opened.push(Date.now()); throw new Error('no browser in this test'); };
  const ran = await runErrand(mug, { runId: 'r3', outDir: mkdtempSync(join(home, 'out-')), deps: { query, run: fakeRun().run, launch } });
  assert.equal(opened.length, 2, 'two distinct links, two hand-overs');
  const worked = readLines(ran.transcript).filter(line => line.type === 'person' && line.via === 'hand-over' && line.text.startsWith('opened'));
  assert.deepEqual(worked.map(line => line.text), ['opened http://127.0.0.1:4100/#key=…', 'opened http://127.0.0.1:4101/#key=…']);
  assert.match(opened.reply, /couldn't finish on the link/);
});

test('a lock Chrome left behind is not waited on', () => {
  const profile = mkdtempSync(join(home, 'profile-'));
  assert.equal(lockHeld(profile), false, 'no lock');
  symlinkSync(`${hostname()}-${process.pid}`, join(profile, 'SingletonLock'));
  assert.equal(lockHeld(profile), true, 'a live process on this computer');
  rmSync(join(profile, 'SingletonLock'));
  symlinkSync(`${hostname()}-999999999`, join(profile, 'SingletonLock'));
  assert.equal(lockHeld(profile), false, 'a dead process');
  rmSync(join(profile, 'SingletonLock'));
  symlinkSync(`another-host-${process.pid}`, join(profile, 'SingletonLock'));
  assert.equal(lockHeld(profile), false, 'another computer');
});

test('at the time cap the turn is interrupted, so its cost is still recorded', async () => {
  let interrupted = false;
  const query = ({ prompt }) => {
    let wake;
    const generator = (async function* () {
      await prompt[Symbol.asyncIterator]().next();
      await new Promise(done => { wake = done; });
      yield { type: 'result', subtype: 'error_during_execution', total_cost_usd: 0.7 };
    })();
    generator.interrupt = async () => { interrupted = true; wake?.(); };
    return generator;
  };
  const ran = await runErrand(mug, { runId: 'r4', outDir: mkdtempSync(join(home, 'out-')), minutes: 0.002, graceMs: 2000, deps: { query, run: fakeRun().run, launch: async () => null } });
  assert.equal(interrupted, true);
  assert.equal(ran.stopped, 'timeout');
  assert.equal(ran.costUsd, 0.7);
});

test('files the agent leaves in the temp folder by name are swept and reported; others are left alone', async () => {
  const other = join(tmpdir(), 'someone-elses.sh');
  const query = ({ prompt }) => (async function* () {
    await prompt[Symbol.asyncIterator]().next();
    writeFileSync(join(tmpdir(), 'shopjar.txt'), 'cookies');
    writeFileSync(other, 'x');
    yield { type: 'assistant', message: { content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: `curl -c ${tmpdir()}/shopjar.txt http://127.0.0.1:4000/` } }] } };
    yield result(0.1);
  })();
  const ran = await runErrand(mug, { runId: 'r5', outDir: mkdtempSync(join(home, 'out-')), deps: { query, run: fakeRun().run, launch: async () => null } });
  assert.deepEqual(ran.cleanup, [`left ${join(tmpdir(), 'shopjar.txt')} (removed)`]);
  assert.equal(existsSync(join(tmpdir(), 'shopjar.txt')), false);
  assert.equal(existsSync(other), true, 'a file the agent never named stays');
  const text = report([{ ...line('mug', [true]), cleanup: ran.cleanup }], new Map());
  assert.match(text, /· left .*shopjar\.txt \(removed\)\n {4}transcript:/);
});

test('practiceEnv drops Paseo, inherited agent-browser settings, and the calling Claude Code session', () => {
  const env = practiceEnv({ PATH: '/bin', PASEO_HOST: 'x', AGENT_BROWSER_SESSION: 'mine', CLAUDECODE: '1', CLAUDE_CODE_MESSAGING_SOCKET: '/s' }, { namespace: 'n', session: 's', profile: '/p' });
  assert.deepEqual(env, { PATH: '/bin', AGENT_BROWSER_NAMESPACE: 'n', AGENT_BROWSER_SESSION: 's', AGENT_BROWSER_PROFILE: '/p', WONG_MEMORY_RUN: '1' });
});

// Results and the report, from fixture lines.
const line = (errand, passes, extra = {}) => ({ run: 'b', errand, title: errand, passed: passes.filter(Boolean).length, total: passes.length, checks: passes.map((pass, i) => ({ name: `c${i}`, pass, evidence: `evidence ${i}` })), costUsd: 1, ms: 120_000, stopped: 'done', transcript: `/t/${errand}.transcript.jsonl`, ...extra });

test('better, worse, same, and new compare check by check', () => {
  assert.equal(compare(line('a', [true, false]), undefined), 'new');
  assert.equal(compare(line('a', [true, true]), line('a', [true, false])), 'better');
  assert.equal(compare(line('a', [true, false]), line('a', [true, true])), 'worse');
  assert.equal(compare(line('a', [false, true]), line('a', [true, false])), 'worse', 'a lost check is worse even when another was gained');
  assert.equal(compare(line('a', [true, false]), line('a', [true, false])), 'same');
  assert.equal(compare(line('a', [true, false, true]), line('a', [true, false])), 'same', 'a check added since counts for neither');
  const previous = previousResults([{ ...line('a', [true]), run: 'old' }, { ...line('a', [false]), run: 'older' }, { ...line('a', [true]), run: 'b' }], 'b');
  assert.equal(previous.get('a').run, 'older', 'the last line from an earlier run');
});

test('the report names each failed check and its transcript, and totals the run', () => {
  const text = report([line('mug', [true, false], { notes: ['read 2 pages outside the browser, first: curl -s http://x'] }), line('teapot', [true], { stopped: 'timeout' })], new Map([['mug', line('mug', [true, true])]]), { at: new Date('2026-10-02T14:10:00Z') });
  assert.match(text, /^PRACTICE RUN {2}2026-10-02 14:10/);
  assert.match(text, /mug\s+1\/2 {2}worse/);
  assert.match(text, / {2}✗ c1: evidence 1\n {2}· read 2 pages outside the browser, first: curl -s http:\/\/x\n {4}transcript: \/t\/mug\.transcript\.jsonl/);
  assert.match(text, /teapot\s+1\/1 {2}new {2}\(stopped: timeout\)\n {4}transcript:/);
  assert.match(text, /2\/3 · cost \$2\.00 · 4 min$/);
});

test('runAll keeps one line per errand and a dated folder, and compares with the last run', async () => {
  const errand = { ...loadErrands().find(item => item.name === 'price-check') };
  const results = join(home, 'results');
  const deps = () => { const { run } = fakeRun(); return { query: fakeQuery('ok', {}), run, launch: async () => null }; };
  const first = await runAll({ errands: [errand], home: results, deps: deps(), now: new Date('2026-10-02T14:10:00Z') });
  assert.match(first.text, /price-check|price check only/);
  assert.match(first.text, /new/);
  const second = await runAll({ errands: [errand], home: results, deps: deps(), now: new Date('2026-10-02T15:10:00Z') });
  assert.match(second.text, /same/);
  const kept = readLines(join(results, 'results.jsonl'));
  assert.equal(kept.length, 2);
  assert.notEqual(kept[0].run, kept[1].run);
  const folders = readdirSync(results).filter(name => name.startsWith('2026-10-02'));
  assert.equal(folders.length, 2);
  assert.ok(readdirSync(join(results, folders[0])).includes('price-check.transcript.jsonl'));
  assert.ok(existsSync(kept[0].transcript));
  assert.equal(existsSync(join(home, '.agent-browser', 'namespaces', `practice-${kept[0].run}`)), false);
});

test('runAll refuses an unknown errand and an open hand-over link', async () => {
  const deps = { query: fakeQuery('ok', {}), run: fakeRun().run, launch: async () => null };
  await assert.rejects(runAll({ only: ['nope'], home: join(home, 'r2'), deps }), /no such errand: nope/);
  mkdirSync(join(home, '.wong-stack', 'hand-over'), { recursive: true });
  writeFileSync(join(home, '.wong-stack', 'hand-over', 'state.json'), '{"cwd":"/elsewhere"}');
  try {
    await assert.rejects(runAll({ home: join(home, 'r2'), deps }), /hand-over link is open/);
  } finally {
    rmSync(join(home, '.wong-stack', 'hand-over', 'state.json'));
  }
});

test('a command that exits before reading its input does not crash the run', async () => {
  const done = await sh(process.execPath, ['-e', 'process.exit(3)'], { input: 'x'.repeat(4 * 1024 * 1024) });
  assert.equal(done.code, 3);
});
