import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { clauseOf, codexRename, commandStep, copiedName, goodTask, hookTurn, nextState, setStep, verbOf } from '../../.agents/skills/explore/scripts/step-title.mjs';

const cli = new URL('../../.agents/skills/explore/scripts/step-title.mjs', import.meta.url).pathname;
const unix = { skip: process.platform === 'win32' && 'the fake paseo is a shell script' };

// A main checkout and one linked worktree, a fake `paseo` that logs its arguments, and an empty Codex home.
function world(t, { workspaces, fail = false, title = null, labels = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-step-title-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const main = path.join(dir, 'main');
  const tree = path.join(dir, 'tree');
  const git = (...args) => execFileSync('git', ['-C', main, ...args], { stdio: 'ignore' });
  mkdirSync(main);
  git('init', '-q', '-b', 'main');
  git('-c', 'user.email=t@example.invalid', '-c', 'user.name=T', 'commit', '-q', '--allow-empty', '-m', 'start');
  git('worktree', 'add', '-q', '-b', 'fix-invoice', tree);
  for (const skill of ['verify', 'wong-sync']) {
    mkdirSync(path.join(main, '.claude', 'skills', skill), { recursive: true });
    writeFileSync(path.join(main, '.claude', 'skills', skill, 'SKILL.md'), `# ${skill}\n`);
  }
  const log = path.join(dir, 'paseo.log');
  const bin = path.join(dir, 'paseo');
  writeFileSync(bin, `#!/usr/bin/env node
const fs = require('fs'); const args = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(args) + '\\n');
if (${fail}) { console.error('boom'); process.exit(1); }
console.log(args[0] === 'workspace' && args[1] === 'ls' ? ${JSON.stringify(JSON.stringify(workspaces ?? [
    { workspaceId: 'wks_tree', isolation: 'worktree', cwd: tree },
    { workspaceId: 'wks_main', isolation: 'local', cwd: main },
  ]))} : '{}');
`);
  chmodSync(bin, 0o755);
  const home = path.join(dir, 'home');
  const agents = path.join(home, '.paseo', 'agents', 'p1');
  mkdirSync(agents, { recursive: true });
  writeFileSync(path.join(agents, 'agent-1.json'), JSON.stringify({ title, labels, internal: false }));
  const codex = path.join(dir, 'codex');
  mkdirSync(codex);
  const env = {
    PATH: process.env.PATH, HOME: home, STEP_TITLE_PASEO_BIN: bin, CODEX_HOME: codex, PASEO_AGENT_ID: 'agent-1',
  };
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  const names = () => (existsSync(path.join(codex, 'session_index.jsonl'))
    ? readFileSync(path.join(codex, 'session_index.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  return { main, tree, env, home, calls, names };
}

const set = (w, step, opts = {}) => setStep({ step, env: w.env, cwd: opts.cwd ?? w.tree, home: w.home, ...opts });
const renames = w => w.calls().filter(args => args[1] === 'update' || args[1] === 'rename');

test('each loop verb is a loop verb, another skill is other, and Codex\'s $ form the same', () => {
  const loops = ['/explore', '/plan', '/improve-code', '/apply', '/continue', '/ship', '$plan x'].map(p => verbOf(p).loop);
  assert.deepEqual(loops, Array(7).fill(true));
  assert.deepEqual(verbOf('/daily'), { other: true });
  assert.deepEqual(verbOf('fix the invoice total'), {});
});

test('task words: a branch or placeholder is none; the first clause is cut at a word', () => {
  assert.equal(goodTask('fix-invoice-total'), null);
  assert.equal(goodTask('untitled'), null);
  assert.equal(clauseOf('/plan fix the invoice total. It adds tax twice'), 'Fix the invoice total');
  const long = clauseOf('make the sign-up page ask for a phone number and send a code to it');
  assert.ok(long.length <= 50 && !long.endsWith(' '), long);
  assert.equal(clauseOf('/ship'), null);
});

test('the step moves back as well as forward: SHIP then APPLY is APPLY, DONE then PLAN is PLAN', () => {
  const ship = { step: 'SHIP', task: 'Fix the invoice total', taskFrom: 'name' };
  assert.deepEqual(nextState(ship, { step: 'APPLY' }), { ...ship, step: 'APPLY', shown: null });
  assert.equal(nextState({ ...ship, step: 'DONE' }, { step: 'PLAN' }).step, 'PLAN');
});

test('PLAN: X becomes APPLY: X in Paseo, on the chat and its own worktree workspace only', unix, async t => {
  const w = world(t, { title: 'PLAN: Fix the invoice total' });
  assert.equal(await set(w, 'APPLY'), 'STEP_TITLE=APPLY: Fix the invoice total');
  assert.deepEqual(renames(w), [
    ['agent', 'update', 'agent-1', '--name', 'APPLY: Fix the invoice total', '--json'],
    ['workspace', 'rename', 'wks_tree', 'APPLY: Fix the invoice total', '--json'],
  ]);
  assert.equal(await set(w, 'SHIP'), 'STEP_TITLE=SHIP: Fix the invoice total');
  assert.equal(await set(w, 'APPLY'), 'STEP_TITLE=APPLY: Fix the invoice total');
  assert.equal(await set(w, 'DONE'), 'STEP_TITLE=DONE: Fix the invoice total');
  assert.equal(await set(w, 'PLAN'), 'STEP_TITLE=PLAN: Fix the invoice total');
});

test('a branch-like name takes --task; a good name keeps its words', unix, async t => {
  const w = world(t, { title: 'fix-invoice' });
  assert.equal(await set(w, 'PLAN'), 'STEP_TITLE=skipped no task words');
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
  const named = world(t, { title: 'Invoice fixes' });
  assert.equal(await set(named, 'EXPLORE'), 'STEP_TITLE=EXPLORE: Invoice fixes');
  assert.equal(await set(named, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Invoice fixes');
});

test('a task from the first message gives way to the plan\'s heading', unix, async t => {
  const w = world(t);
  const { write } = hookTurn({ input: { prompt: 'fix the invoice total please', session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home });
  assert.equal(write, null);
  assert.deepEqual(renames(w), []);
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
});

test('a Paseo name copied from the first message gives way to the plan\'s title; a name not copied stays', unix, async t => {
  const prompt = 'Also when i start a conversation it immediately goes to plan and the name never changes after that';
  assert.ok(copiedName(prompt.slice(0, 60), prompt));
  assert.ok(copiedName('also when i  start a conversation…', prompt));
  assert.ok(!copiedName('Invoice fixes', prompt));
  const copied = world(t, { title: prompt.slice(0, 60) });
  const hook = (w, text) => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home });
  assert.equal(hook(copied, prompt).write, null);
  assert.equal(await set(copied, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
  const named = world(t, { title: 'Invoice fixes' });
  assert.equal(hook(named, prompt).write, null);
  assert.equal(await set(named, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Invoice fixes');
});

test('a bare /apply first shows no name, and /plan\'s set gives it the heading, which a later --task keeps', unix, async t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home, CLAUDE_CODE_SESSION_ID: 'c3' };
  assert.equal(hookTurn({ input: { prompt: '/apply', session_id: 'c3', cwd: w.main }, agent: 'claude', env, home: w.home }).out, null);
  assert.equal(await setStep({ step: 'PLAN', task: 'X', env, cwd: w.main, home: w.home }), 'STEP_TITLE=PLAN: X');
  assert.equal(await setStep({ step: 'PLAN', task: 'Y', env, cwd: w.main, home: w.home }), 'STEP_TITLE=PLAN: X');
  assert.equal(await setStep({ step: 'APPLY', env, cwd: w.main, home: w.home }), 'STEP_TITLE=APPLY: X');
});

test('a Paseo name that is a bare command never becomes the task: /plan then set PLAN --task X is PLAN: X', unix, async t => {
  const w = world(t, { title: '/plan' });
  const hook = text => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home });
  assert.equal(hook('/plan').write, null);
  assert.equal(await set(w, 'PLAN'), 'STEP_TITLE=skipped no task words');
  assert.equal(await set(w, 'PLAN', { task: 'X' }), 'STEP_TITLE=PLAN: X');
});

test('a Paseo name that starts with a command is weak: /verify, then /plan fix x is PLAN: Fix x, which --task replaces', unix, async t => {
  const w = world(t, { title: '/verify' });
  mkdirSync(path.join(w.tree, '.claude', 'skills', 'verify'), { recursive: true });
  writeFileSync(path.join(w.tree, '.claude', 'skills', 'verify', 'SKILL.md'), '# verify\n');
  const hook = text => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home });
  assert.equal(hook('/verify').write, null);
  assert.equal(hook('/plan fix x').write, 'PLAN: Fix x');
  assert.equal(await set(w, 'PLAN', { task: 'Y' }), 'STEP_TITLE=PLAN: Y');
});

test('Paseo\'s main folder, the Daily chat, and an unattended run keep their names', unix, async t => {
  const w = world(t, { title: 'Daily' });
  assert.equal(await set(w, 'PLAN', { cwd: w.main, task: 'Anything' }), 'STEP_TITLE=skipped main folder');
  const daily = world(t, { title: 'Daily', labels: { 'daily-chat': '1' } });
  assert.equal(await set(daily, 'PLAN', { task: 'Anything' }), 'STEP_TITLE=skipped daily chat');
  assert.equal(await setStep({ step: 'PLAN', task: 'Anything', env: { ...w.env, WONG_DAILY_RUN: '1' }, cwd: w.tree, home: w.home }),
    'STEP_TITLE=skipped run');
  assert.deepEqual(renames(w), []);
  assert.deepEqual(renames(daily), []);
});

test('a workspace that is not this worktree alone is not renamed', unix, async t => {
  const w = world(t, { title: 'Fix the invoice total', workspaces: [{ workspaceId: 'wks_x', isolation: 'local', cwd: '' }] });
  await set(w, 'APPLY');
  assert.deepEqual(renames(w).map(args => args[1]), ['update']);
});

test('a failing paseo still exits 0 and says skipped', unix, t => {
  const w = world(t, { fail: true, title: 'Fix the invoice total' });
  const run = spawnSync(process.execPath, [cli, 'set', 'APPLY'], { cwd: w.tree, env: w.env, encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /^STEP_TITLE=skipped paseo: /);
});

test('Claude Code alone: a typed /ship names nothing; each set shows by the next message', unix, async t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home, CLAUDE_CODE_SESSION_ID: 'c1' };
  const hook = (prompt, extra = {}) => hookTurn({ input: { prompt, session_id: 'c1', cwd: w.main, ...extra }, agent: 'claude', env, home: w.home });
  const typed = hook('/ship fix the invoice total');
  assert.deepEqual([typed.out, typed.write], [null, null]);
  const set = step => setStep({ step, env, cwd: w.main, home: w.home });
  assert.equal(await set('APPLY'), 'STEP_TITLE=APPLY: Fix the invoice total');
  assert.deepEqual(hook('looks good').out, { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', sessionTitle: 'APPLY: Fix the invoice total' } });
  assert.equal(hook('go on').out, null);
  assert.equal(await set('SHIP'), 'STEP_TITLE=SHIP: Fix the invoice total');
  assert.equal(await set('DONE'), 'STEP_TITLE=DONE: Fix the invoice total');
  assert.equal(hook('thanks').out.hookSpecificOutput.sessionTitle, 'DONE: Fix the invoice total');
  const resumed = hookTurn({ input: { session_id: 'c1', cwd: w.main, hook_event_name: 'SessionStart' }, agent: 'claude', env, home: w.home });
  assert.deepEqual(resumed.out, { hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: 'DONE: Fix the invoice total' } });
});

test('a typed command names the chat at once: a repo skill in capitals, /explore EXPLORE; /ship and /compact change nothing', unix, t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home };
  const hook = (prompt, id) => hookTurn({ input: { prompt, session_id: id, cwd: w.main }, agent: 'claude', env, home: w.home });
  const title = turn => turn.out?.hookSpecificOutput.sessionTitle ?? null;
  const verify = hook('/verify the invoice page', 'c5');
  assert.equal(title(verify), 'VERIFY: The invoice page');
  assert.equal(verify.write, 'VERIFY: The invoice page');
  assert.equal(title(hook('/explore fix it', 'c6')), 'EXPLORE: Fix it');
  assert.equal(title(hook('/ship', 'c5')), null);
  assert.equal(hook('/ship', 'c5').write, null);
  assert.equal(title(hook('/explore', 'c5')), 'EXPLORE: The invoice page');
  assert.equal(hook('/compact', 'c5').write, null);
  const compact = hook('/compact', 'c7');
  assert.deepEqual([compact.out, compact.write], [null, null]);
  assert.equal(title(hook('fix the invoice total', 'c7')), null);
  assert.equal(commandStep('/wong-sync', w.main), 'SYNC');
  assert.equal(commandStep('/improve-code', w.main), 'PLAN');
  assert.equal(commandStep('$verify x', w.main), 'VERIFY');
  assert.equal(commandStep('/a:verify', w.main), null);
  assert.equal(commandStep('/daily', w.main), null);
});

test('a first plain message shows and writes nothing; a set then names it, shown at the next message', unix, async t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home, CLAUDE_CODE_SESSION_ID: 'c4' };
  const hook = prompt => hookTurn({ input: { prompt, session_id: 'c4', cwd: w.main }, agent: 'claude', env, home: w.home });
  const first = hook('fix the invoice total');
  assert.deepEqual([first.out, first.write], [null, null]);
  assert.equal(hook('what is going on').out, null);
  assert.equal(await setStep({ step: 'PLAN', env, cwd: w.main, home: w.home }), 'STEP_TITLE=PLAN: Fix the invoice total');
  assert.equal(hook('looks good').out.hookSpecificOutput.sessionTitle, 'PLAN: Fix the invoice total');
  const typed = hook('/ship');
  assert.deepEqual([typed.out, typed.write], [null, null]);
});

test('Codex renames through its own app-server call', unix, async t => {
  const w = world(t);
  const fake = path.join(w.home, 'codex');
  const log = path.join(w.home, 'codex.log');
  writeFileSync(fake, `#!/usr/bin/env node
const fs = require('fs');
require('readline').createInterface({ input: process.stdin }).on('line', line => {
  const m = JSON.parse(line); fs.appendFileSync(${JSON.stringify(log)}, line + '\\n');
  if (m.id) console.log(JSON.stringify({ id: m.id, result: {} }));
});
`);
  chmodSync(fake, 0o755);
  await codexRename({ env: { PATH: process.env.PATH, STEP_TITLE_CODEX_BIN: fake }, id: 'th-9', title: 'SHIP: Fix the invoice total' });
  const sent = readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual(sent.map(m => m.method), ['initialize', 'initialized', 'thread/name/set']);
  assert.deepEqual(sent[2].params, { threadId: 'th-9', name: 'SHIP: Fix the invoice total' });
  await assert.rejects(codexRename({ env: { PATH: process.env.PATH, STEP_TITLE_CODEX_BIN: path.join(w.home, 'none') }, id: 'x', title: 'y' }));
});

test('with no Codex rename, the Codex hook appends one line to the chat-name list, in Codex\'s shape', unix, async t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home, CODEX_HOME: w.env.CODEX_HOME, STEP_TITLE_CODEX_BIN: path.join(w.home, 'no-codex') };
  // A set with no Codex id stores the task; the hook's typed /explore then writes the new name.
  assert.equal(await setStep({ step: 'PLAN', task: 'Fix the invoice total', env: { ...env, CLAUDE_CODE_SESSION_ID: 'th-1' }, cwd: w.main, home: w.home }),
    'STEP_TITLE=PLAN: Fix the invoice total');
  const run = spawnSync(process.execPath, [cli, 'hook', '--agent', 'codex'], {
    cwd: w.main, env, encoding: 'utf8', input: JSON.stringify({ prompt: '/explore', session_id: 'th-1', cwd: w.main }),
  });
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, '');
  for (let i = 0; i < 100 && !w.names().length; i++) await new Promise(done => setTimeout(done, 50));
  const lines = w.names();
  assert.equal(lines.length, 1);
  assert.deepEqual(Object.keys(lines[0]), ['id', 'thread_name', 'updated_at']);
  assert.equal(lines[0].id, 'th-1');
  assert.equal(lines[0].thread_name, 'EXPLORE: Fix the invoice total');
  assert.ok(!Number.isNaN(Date.parse(lines[0].updated_at)));
});

test('a bad hook input prints nothing and exits 0', () => {
  const run = spawnSync(process.execPath, [cli, 'hook', '--agent', 'claude'], { input: 'not json', encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(run.status, 0);
  assert.equal(run.stdout, '');
});

test('Claude Code runs the hook on each message and at start; Codex on each message', () => {
  const read = file => JSON.parse(readFileSync(new URL(`../../.agents/${file}`, import.meta.url), 'utf8')).hooks;
  const commands = entries => (entries ?? []).flatMap(entry => entry.hooks.map(hook => hook.command));
  const claude = read('settings.json');
  const startup = claude.SessionStart.filter(entry => entry.matcher === 'startup|resume');
  assert.ok(commands(claude.UserPromptSubmit).some(c => c.endsWith('/explore/scripts/step-title.mjs" hook --agent claude')));
  assert.ok(commands(startup).some(c => c.endsWith('/explore/scripts/step-title.mjs" hook --agent claude --event session-start')));
  assert.ok(commands(read('hooks.json').UserPromptSubmit).some(c => c.endsWith('/explore/scripts/step-title.mjs" hook --agent codex')));
});

test('each loop skill still sets its own step', () => {
  const skill = name => readFileSync(new URL(`../../.agents/skills/${name}/SKILL.md`, import.meta.url), 'utf8');
  // Ship names the script once, then `set DONE` in the same sentence.
  const calls = { explore: ['EXPLORE'], plan: ['PLAN'], apply: ['APPLY', 'DONE'], ship: ['SHIP'] };
  for (const [name, steps] of Object.entries(calls)) {
    for (const step of steps) assert.match(skill(name), new RegExp(`step-title\\.mjs set ${step}\\b`), `${name} sets ${step}`);
  }
  assert.match(skill('ship'), /`set DONE`/, 'ship sets DONE');
});
