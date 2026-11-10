import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  clauseOf, codexRename, commandStep, copiedName, cutWords, folderOf, goodTask, hookTurn, nextState, removeChat, setStep, verbOf, writeState,
} from '../../.agents/skills/explore/scripts/step-title.mjs';

const cli = new URL('../../.agents/skills/explore/scripts/step-title.mjs', import.meta.url).pathname;
const unix = { skip: process.platform === 'win32' && 'the fake paseo is a shell script' };

// A main checkout and one linked worktree, a fake `paseo` that logs its arguments, and an empty Codex home.
function world(t, { workspaces, fail = false, title = null, labels = {}, record = {} } = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wong-test-step-title-'));
  t.after(() => rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));
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
  // Stands in for a Paseo name change, by Paseo saving a write or by the person.
  const retitle = name => writeFileSync(path.join(agents, 'agent-1.json'), JSON.stringify({ title: name, labels, internal: false, ...record }));
  retitle(title);
  const codex = path.join(dir, 'codex');
  mkdirSync(codex);
  const env = {
    PATH: process.env.PATH, HOME: home, STEP_TITLE_PASEO_BIN: bin, CODEX_HOME: codex, PASEO_AGENT_ID: 'agent-1',
  };
  const calls = () => (existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  const names = () => (existsSync(path.join(codex, 'session_index.jsonl'))
    ? readFileSync(path.join(codex, 'session_index.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line)) : []);
  // The app's chat list: each row put, and each agent id removed.
  const chats = { puts: [], removed: [], put: async row => { chats.puts.push(row); return { agentId: row.agentId }; },
    remove: async body => { chats.removed.push(body.agentId); return { ...body, removed: true }; } };
  return { main, tree, env, home, calls, names, retitle, chats };
}

const set = (w, step, opts = {}) => setStep({ step, env: w.env, cwd: opts.cwd ?? w.tree, home: w.home, chats: w.chats, ...opts });
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
  const long = clauseOf('make the sign-up page ask for a phone number and send a code to it right away');
  assert.ok(long.length <= 60 && !long.endsWith(' '), long);
  assert.equal(clauseOf('/ship'), null);
});

test('words over 60 characters are cut at a word, with no trailing comma, dash, or and', () => {
  const words = 'Make the sign-up page ask for a phone number and a name, and then send it a code';
  assert.equal(words.length, 80);
  assert.equal(cutWords(words), 'Make the sign-up page ask for a phone number and a name');
  assert.equal(cutWords('Fix the invoice total, and'), 'Fix the invoice total');
  assert.equal(cutWords('Fix the invoice total -'), 'Fix the invoice total');
  assert.equal(cutWords('x'.repeat(70)).length, 60);
});

test('the step moves back as well as forward: SHIP then APPLY is APPLY, DONE then PLAN is PLAN', () => {
  const ship = { step: 'SHIP', task: 'Fix the invoice total', taskFrom: 'name' };
  assert.deepEqual(nextState(ship, { step: 'APPLY' }), { ...ship, step: 'APPLY', shown: null, seen: null });
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

test('a branch-like name takes --task; a Paseo name with no --task is the task until a step gives words', unix, async t => {
  const w = world(t, { title: 'fix-invoice' });
  assert.equal(await set(w, 'PLAN'), 'STEP_TITLE=skipped no task words');
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
  const named = world(t, { title: 'Invoice fixes' });
  assert.equal(await set(named, 'EXPLORE'), 'STEP_TITLE=EXPLORE: Invoice fixes');
  assert.equal(await set(named, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
});

test('a task from the first message gives way to the plan\'s heading', unix, async t => {
  const w = world(t);
  const { write } = hookTurn({ input: { prompt: 'fix the invoice total please', session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home, chats: w.chats });
  assert.equal(write, null);
  assert.deepEqual(renames(w), []);
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
});

test('a Paseo name, copied from the first message or not, gives way to the plan\'s title', unix, async t => {
  const prompt = 'Also when i start a conversation it immediately goes to plan and the name never changes after that';
  assert.ok(copiedName(prompt.slice(0, 60), prompt));
  assert.ok(copiedName('also when i  start a conversation…', prompt));
  assert.ok(!copiedName('Invoice fixes', prompt));
  const copied = world(t, { title: prompt.slice(0, 60) });
  const hook = (w, text) => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home, chats: w.chats });
  assert.equal(hook(copied, prompt).write, null);
  assert.equal(await set(copied, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
  const named = world(t, { title: 'why is it only hidden on mac?' });
  assert.equal(hook(named, prompt).write, null);
  assert.equal(await set(named, 'PLAN', { task: 'Add an add-on, then open its sign-in' }),
    'STEP_TITLE=PLAN: Add an add-on, then open its sign-in');
});

test('a name the person gives in Paseo after a step name stays; only the step word changes', unix, async t => {
  const w = world(t, { title: 'fix the invoice total please' });
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice total' }), 'STEP_TITLE=PLAN: Fix the invoice total');
  w.retitle('PLAN: Fix the invoice total');
  assert.equal(await set(w, 'PLAN', { task: 'Fix the invoice sum' }), 'STEP_TITLE=PLAN: Fix the invoice sum');
  w.retitle('Invoice fixes');
  assert.equal(await set(w, 'APPLY'), 'STEP_TITLE=APPLY: Invoice fixes');
  assert.equal(await set(w, 'SHIP', { task: 'Other words' }), 'STEP_TITLE=SHIP: Invoice fixes');
  const hook = text => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home, chats: w.chats });
  assert.equal(hook('/explore').write, 'EXPLORE: Invoice fixes');
});

test('a plain message after the person renames the chat writes and shows nothing', unix, async t => {
  const w = world(t, { title: 'fix the invoice total please' });
  assert.equal(await set(w, 'APPLY', { task: 'Fix the invoice total' }), 'STEP_TITLE=APPLY: Fix the invoice total');
  w.retitle('Invoice fixes');
  const hook = agent => hookTurn({ input: { prompt: 'thanks', session_id: 's', cwd: w.tree }, agent, env: w.env, home: w.home, chats: w.chats });
  assert.deepEqual([hook('claude').write, hook('claude').out], [null, null]);
  assert.equal(hook('codex').write, null);
  assert.equal(hookTurn({ input: { prompt: '/explore', session_id: 's', cwd: w.tree }, agent: 'claude', env: w.env, home: w.home, chats: w.chats })
    .out?.hookSpecificOutput.sessionTitle, 'EXPLORE: Invoice fixes');
});

test('a resumed chat the person renamed shows no step title over their name', unix, async t => {
  const w = world(t, { title: 'fix the invoice total please' });
  assert.equal(await set(w, 'APPLY', { task: 'Fix the invoice total' }), 'STEP_TITLE=APPLY: Fix the invoice total');
  w.retitle('Invoice fixes');
  const start = hookTurn({ input: { session_id: 's', cwd: w.tree }, agent: 'claude', event: 'session-start', env: w.env, home: w.home, chats: w.chats });
  assert.deepEqual([start.write, start.out], [null, null]);
  assert.equal(await set(w, 'SHIP', { task: 'Other words' }), 'STEP_TITLE=SHIP: Invoice fixes');
});

test('a Paseo name that still shows an earlier written name is not a rename', unix, async t => {
  const w = world(t, { title: 'fix the invoice total please' });
  assert.equal(await set(w, 'PLAN', { task: 'A' }), 'STEP_TITLE=PLAN: A');
  assert.equal(await set(w, 'APPLY', { task: 'B' }), 'STEP_TITLE=APPLY: B');
  w.retitle('PLAN: A');
  assert.equal(await set(w, 'SHIP', { task: 'C' }), 'STEP_TITLE=SHIP: C');
});

test('an old state with words from a Paseo name and no seen names takes a given --task', unix, async t => {
  const w = world(t, { title: 'PLAN: why is it only hidden on mac?' });
  writeState(folderOf(w.tree), 'agent-1', { step: 'PLAN', task: 'why is it only hidden on mac?', taskFrom: 'name', shown: null });
  assert.equal(await set(w, 'APPLY', { task: 'Add an add-on' }), 'STEP_TITLE=APPLY: Add an add-on');
  assert.equal(await set(w, 'SHIP', { task: 'Add an add-on' }), 'STEP_TITLE=SHIP: Add an add-on');
});

test('a bare /apply first shows no name; each --task replaces the words, and DONE with none keeps them', unix, async t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home, CLAUDE_CODE_SESSION_ID: 'c3' };
  assert.equal(hookTurn({ input: { prompt: '/apply', session_id: 'c3', cwd: w.main }, agent: 'claude', env, home: w.home, chats: w.chats }).out, null);
  assert.equal(await setStep({ step: 'PLAN', task: 'X', env, cwd: w.main, home: w.home, chats: w.chats }), 'STEP_TITLE=PLAN: X');
  assert.equal(await setStep({ step: 'PLAN', task: 'Y', env, cwd: w.main, home: w.home, chats: w.chats }), 'STEP_TITLE=PLAN: Y');
  assert.equal(await setStep({ step: 'APPLY', env, cwd: w.main, home: w.home, chats: w.chats }), 'STEP_TITLE=APPLY: Y');
  assert.equal(await setStep({ step: 'DONE', env, cwd: w.main, home: w.home, chats: w.chats }), 'STEP_TITLE=DONE: Y');
});

test('a Paseo name that is a bare command never becomes the task: /plan then set PLAN --task X is PLAN: X', unix, async t => {
  const w = world(t, { title: '/plan' });
  const hook = text => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home, chats: w.chats });
  assert.equal(hook('/plan').write, null);
  assert.equal(await set(w, 'PLAN'), 'STEP_TITLE=skipped no task words');
  assert.equal(await set(w, 'PLAN', { task: 'X' }), 'STEP_TITLE=PLAN: X');
});

test('a Paseo name that starts with a command is weak: /verify, then /plan fix x is PLAN: Fix x, which --task replaces', unix, async t => {
  const w = world(t, { title: '/verify' });
  mkdirSync(path.join(w.tree, '.claude', 'skills', 'verify'), { recursive: true });
  writeFileSync(path.join(w.tree, '.claude', 'skills', 'verify', 'SKILL.md'), '# verify\n');
  const hook = text => hookTurn({ input: { prompt: text, session_id: 's', cwd: w.tree }, agent: 'codex', env: w.env, home: w.home, chats: w.chats });
  assert.equal(hook('/verify').write, null);
  assert.equal(hook('/plan fix x').write, 'PLAN: Fix x');
  assert.equal(await set(w, 'PLAN', { task: 'Y' }), 'STEP_TITLE=PLAN: Y');
});

test('Paseo\'s main folder, the Daily chat, and an unattended run keep their names', unix, async t => {
  const w = world(t, { title: 'Daily' });
  assert.equal(await set(w, 'PLAN', { cwd: w.main, task: 'Anything' }), 'STEP_TITLE=skipped main folder');
  const daily = world(t, { title: 'Daily', labels: { 'daily-chat': '1' } });
  assert.equal(await set(daily, 'PLAN', { task: 'Anything' }), 'STEP_TITLE=skipped daily chat');
  assert.equal(await setStep({ step: 'PLAN', task: 'Anything', env: { ...w.env, WONG_DAILY_RUN: '1' }, cwd: w.tree, home: w.home, chats: w.chats }),
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
  const hook = (prompt, extra = {}) => hookTurn({ input: { prompt, session_id: 'c1', cwd: w.main, ...extra }, agent: 'claude', env, home: w.home, chats: w.chats });
  const typed = hook('/ship fix the invoice total');
  assert.deepEqual([typed.out, typed.write], [null, null]);
  const set = step => setStep({ step, env, cwd: w.main, home: w.home, chats: w.chats });
  assert.equal(await set('APPLY'), 'STEP_TITLE=APPLY: Fix the invoice total');
  assert.deepEqual(hook('looks good').out, { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', sessionTitle: 'APPLY: Fix the invoice total' } });
  assert.equal(hook('go on').out, null);
  assert.equal(await set('SHIP'), 'STEP_TITLE=SHIP: Fix the invoice total');
  assert.equal(await set('DONE'), 'STEP_TITLE=DONE: Fix the invoice total');
  assert.equal(hook('thanks').out.hookSpecificOutput.sessionTitle, 'DONE: Fix the invoice total');
  const resumed = hookTurn({ input: { session_id: 'c1', cwd: w.main, hook_event_name: 'SessionStart' }, agent: 'claude', env, home: w.home, chats: w.chats });
  assert.deepEqual(resumed.out, { hookSpecificOutput: { hookEventName: 'SessionStart', sessionTitle: 'DONE: Fix the invoice total' } });
});

test('a typed command names the chat at once: a repo skill in capitals, /explore EXPLORE; /ship and /compact change nothing', unix, t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home };
  const hook = (prompt, id) => hookTurn({ input: { prompt, session_id: id, cwd: w.main }, agent: 'claude', env, home: w.home, chats: w.chats });
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
  const hook = prompt => hookTurn({ input: { prompt, session_id: 'c4', cwd: w.main }, agent: 'claude', env, home: w.home, chats: w.chats });
  const first = hook('fix the invoice total');
  assert.deepEqual([first.out, first.write], [null, null]);
  assert.equal(hook('what is going on').out, null);
  assert.equal(await setStep({ step: 'PLAN', env, cwd: w.main, home: w.home, chats: w.chats }), 'STEP_TITLE=PLAN: Fix the invoice total');
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
  assert.equal(await setStep({ step: 'PLAN', task: 'Fix the invoice total', env: { ...env, CLAUDE_CODE_SESSION_ID: 'th-1' }, cwd: w.main, home: w.home, chats: w.chats }),
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

test('each loop skill still sets its own step, and each step it starts gives its words', () => {
  const skill = name => readFileSync(new URL(`../../.agents/skills/${name}/SKILL.md`, import.meta.url), 'utf8');
  // Ship names the script once, then `set DONE` in the same sentence.
  const calls = { explore: ['EXPLORE'], plan: ['PLAN'], apply: ['APPLY', 'DONE'], ship: ['SHIP'] };
  for (const [name, steps] of Object.entries(calls)) {
    for (const step of steps) assert.match(skill(name), new RegExp(`step-title\\.mjs set ${step}\\b`), `${name} sets ${step}`);
  }
  assert.match(skill('ship'), /`set DONE`/, 'ship sets DONE');
  for (const name of Object.keys(calls)) {
    for (const [line, step] of skill(name).matchAll(/step-title\.mjs set (EXPLORE|PLAN|APPLY|SHIP)\b.{0,9}/g)) {
      assert.match(line, new RegExp(`set ${step} --task "`), `${name}: ${line}`);
    }
  }
});

test('each set puts the chat\'s row with its new step; the folder names a chat with no task words', unix, async t => {
  const w = world(t, { title: 'PLAN: Fix the invoice total' });
  await set(w, 'APPLY');
  const [row] = w.chats.puts;
  assert.deepEqual({ ...row, computer: undefined }, { agentId: 'agent-1', sessionId: null, computer: undefined, name: 'Fix the invoice total',
    step: 'APPLY', folder: 'tree', source: null });
  assert.match(row.computer, /^[0-9a-f]{32}$/);
  await set(w, 'SHIP');
  assert.deepEqual(w.chats.puts.map(each => each.step), ['APPLY', 'SHIP']);
  const bare = world(t, { title: 'fix-invoice' });
  assert.equal(await set(bare, 'APPLY'), 'STEP_TITLE=skipped no task words');
  assert.deepEqual([bare.chats.puts[0].name, bare.chats.puts[0].step], ['tree', 'APPLY']);
  const claude = { PATH: w.env.PATH, HOME: w.home, CLAUDE_CODE_SESSION_ID: 'c9' };
  await setStep({ step: 'PLAN', task: 'Fix the total', env: claude, cwd: w.main, home: w.home, chats: w.chats });
  assert.deepEqual([w.chats.puts.at(-1).agentId, w.chats.puts.at(-1).sessionId, w.chats.puts.at(-1).folder], ['c9', 'claude:c9', 'main']);
});

test('a chat a schedule\'s run opened puts no row at its start or a set; a plain chat still puts', unix, async t => {
  const w = world(t, { title: 'PLAN: Late invoices', labels: { 'wong-schedule': 'invoice-check' } });
  const start = hookTurn({ input: { session_id: 's', cwd: w.tree }, agent: 'claude', event: 'session-start', env: w.env, home: w.home });
  assert.equal(start.put, null);
  assert.equal(await set(w, 'APPLY'), 'STEP_TITLE=APPLY: Late invoices');
  assert.deepEqual(w.chats.puts, []);
  const plain = world(t, { title: 'PLAN: Late invoices' });
  const plainStart = hookTurn({ input: { session_id: 's', cwd: plain.tree }, agent: 'claude', event: 'session-start', env: plain.env, home: plain.home });
  assert.deepEqual(plainStart.put, { id: 'agent-1', session: 'claude:s' });
  await set(plain, 'APPLY');
  assert.equal(plain.chats.puts.length, 1);
});

test('a schedule\'s chat the person wrote in puts its row at a set, keeping the schedule as its source', unix, async t => {
  const w = world(t, { title: 'PLAN: Late invoices', labels: { 'wong-schedule': 'invoice-check' },
    record: { createdAt: '2026-11-08T12:00:00Z', lastUserMessageAt: '2026-11-08T12:05:00Z' } });
  await set(w, 'APPLY');
  assert.deepEqual([w.chats.puts[0].name, w.chats.puts[0].step, w.chats.puts[0].source], ['Late invoices', 'APPLY', 'schedule:invoice-check']);
});

test('a failed put says so in one line, and the step goes on', unix, async t => {
  const w = world(t, { title: 'PLAN: Fix the invoice total' });
  const warned = [];
  const chats = { put: async () => { throw new Error('401: authentication_required\nmore'); } };
  assert.equal(await set(w, 'APPLY', { chats, warn: line => warned.push(line) }), 'STEP_TITLE=APPLY: Fix the invoice total');
  assert.deepEqual(warned, ['STEP_TITLE_CHAT=not put: 401: authentication_required']);
  assert.equal(renames(w).length, 2, 'Paseo still gets the new name');
  assert.equal(await set(w, 'SHIP', { chats: { put: () => Promise.reject(new Error('down')) }, warn: () => {} }), 'STEP_TITLE=SHIP: Fix the invoice total');
});

test('a session start and a typed command put the row from a detached process; a plain message puts none', unix, t => {
  const w = world(t);
  const env = { PATH: w.env.PATH, HOME: w.home };
  const turn = input => hookTurn({ input: { session_id: 'c7', cwd: w.main, ...input }, agent: 'claude', env, home: w.home });
  assert.deepEqual(turn({ hook_event_name: 'SessionStart' }).put, { id: 'c7', session: 'claude:c7' });
  assert.deepEqual(turn({ prompt: '/plan fix the invoice total' }).put, { id: 'c7', session: 'claude:c7' });
  assert.equal(turn({ prompt: 'looks good' }).put, null);
});

test('/close takes the chat off the list; a failed remove is one line', async () => {
  const removed = [], warned = [];
  await removeChat({ id: 'agent-1', calls: { remove: async body => { removed.push(body); } }, warn: line => warned.push(line) });
  assert.deepEqual([removed, warned], [[{ agentId: 'agent-1' }], []]);
  await removeChat({ id: 'agent-1', calls: { remove: async () => { throw new Error('unavailable: no app'); } }, warn: line => warned.push(line) });
  assert.deepEqual(warned, ['STEP_TITLE_CHAT=not removed: unavailable: no app']);
  const close = readFileSync(new URL('../../.agents/skills/close/SKILL.md', import.meta.url), 'utf8');
  assert.ok(close.indexOf('step-title.mjs" remove') < close.indexOf('tidy.mjs" close'), '/close removes the row before the workspace closes');
});
