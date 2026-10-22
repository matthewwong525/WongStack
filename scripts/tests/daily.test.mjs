// /daily's script: who the person is, which steps file is theirs, one workspace per step and day, the chief's watch
// and hands, and reminders.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  answer, done, emailsOf, hand, inboxAdd, inboxClose, launchWorkspace, localDay, open, opened, personFile, reminders, remind, reply, status, watch, who,
} from '../../.agents/skills/daily/scripts/daily.mjs';
import { EXIT, PaseoError } from '../../.agents/skills/schedule/scripts/lib/paseo.mjs';

const cli = new URL('../../.agents/skills/daily/scripts/daily.mjs', import.meta.url).pathname;
const ORIGIN = 'https://app.example.com';

function tmp(t) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-daily-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// A skill folder with a team file and two people files, one listing two emails.
function skill(t) {
  const dir = tmp(t);
  mkdirSync(join(dir, 'people'));
  writeFileSync(join(dir, 'team.md'), '- Mondays: plan the week with /team-plan\n');
  writeFileSync(join(dir, 'people', 'jo-lee.md'), '---\nemails: [jo@example.com, "Jo.Lee@Gmail.com"]\n---\n- Weekdays: /email (own workspace)\n');
  writeFileSync(join(dir, 'people', 'sam.md'), '---\nname: Sam\nemails:\n  - sam@example.com\n  - \'sam@home.example\'\ntitle: x\n---\n- Check orders.\n');
  return dir;
}

const signedInAs = (state, email = 'jo@example.com') => origin => ({ state, origin, email, days: state === 'near' ? 2 : 20 });

test('who names the person from the sign-in and finds their file by any listed email', t => {
  const dir = skill(t);
  const ctx = { author: 'git@example.com' };
  const valid = who({ ctx, origin: ORIGIN, signedIn: signedInAs('valid'), skillDir: dir });
  assert.deepEqual(valid, {
    source: 'sign-in', state: 'valid', email: 'jo@example.com', origin: ORIGIN, days: 20, login: null,
    team: join(dir, 'team.md'), file: join(dir, 'people', 'jo-lee.md'),
  });
  const second = who({ ctx, origin: ORIGIN, signedIn: signedInAs('near', 'JO.LEE@gmail.com'), skillDir: dir });
  assert.equal(second.file, join(dir, 'people', 'jo-lee.md'));
  assert.equal(second.login, null);
  assert.equal(second.days, 2);
  assert.equal(who({ ctx, origin: ORIGIN, signedIn: signedInAs('valid', 'sam@home.example'), skillDir: dir }).file, join(dir, 'people', 'sam.md'));
});

test('an ended or missing sign-in gives the login command and names no one by guess', t => {
  const dir = skill(t);
  for (const state of ['expired', 'missing']) {
    const found = who({ ctx: { author: 'jo@example.com' }, origin: ORIGIN, signedIn: o => ({ state, origin: o }), skillDir: dir });
    assert.equal(found.state, state);
    assert.equal(found.email, null);
    assert.equal(found.file, null);
    assert.match(found.login, new RegExp(`cloudflared access login ${ORIGIN}`));
  }
});

test('with no company app, who uses the git email and says so', t => {
  const dir = skill(t);
  const found = who({ ctx: { author: 'Sam@Example.com' }, origin: null, skillDir: dir });
  assert.equal(found.source, 'git');
  assert.equal(found.state, 'valid');
  assert.equal(found.file, join(dir, 'people', 'sam.md'));
  const none = who({ ctx: { author: '' }, origin: null, skillDir: dir });
  assert.equal(none.state, 'missing');
  assert.equal(none.file, null);
});

test('a person with no file, and a skill with no team or people files, get null', t => {
  const dir = skill(t);
  assert.equal(who({ ctx: {}, origin: ORIGIN, signedIn: signedInAs('valid', 'new@example.com'), skillDir: dir }).file, null);
  const empty = tmp(t);
  const found = who({ ctx: {}, origin: ORIGIN, signedIn: signedInAs('valid'), skillDir: empty });
  assert.equal(found.team, null);
  assert.equal(found.file, null);
  assert.equal(personFile(join(empty, 'people'), null), null);
});

test('emails are read from either list form, and a file without them matches nothing', () => {
  assert.deepEqual(emailsOf('---\nemails: [A@x.com, b@x.com]\n---\n'), ['a@x.com', 'b@x.com']);
  assert.deepEqual(emailsOf('---\nemails:\n- a@x.com\n---\n'), ['a@x.com']);
  assert.deepEqual(emailsOf('---\nname: Jo\n---\n'), []);
  assert.deepEqual(emailsOf('- a step with no frontmatter\n'), []);
});

test('localDay is the local calendar date', () => {
  assert.equal(localDay(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
});

function fakeLaunch(result) {
  const calls = [];
  const launch = args => { calls.push(args); return result; };
  return { calls, launch };
}

const PASEO = { PASEO_AGENT_ID: 'agent-1' };
const OPENED = { ok: true, code: 0, agentId: 'a-1', workspaceId: 'ws-1', workspaceName: 'Email' };

test('a step opens once a day: the second open says already, and the next day opens again', t => {
  const stateDir = join(tmp(t), 'wong-daily');
  const { calls, launch } = fakeLaunch(OPENED);
  const at = { stateDir, email: 'Jo@example.com', step: ' Weekdays:  /email ', title: 'Email', brief: 'brief.md', env: PASEO, launch };
  const first = open({ ...at, day: '2026-10-15', now: new Date('2026-10-15T08:00:00Z') });
  assert.equal(first.status, 'opened');
  assert.equal(first.workspace, 'Email');
  assert.deepEqual(calls, [{ title: 'Email', brief: 'brief.md', env: PASEO }]);
  const again = open({ ...at, step: 'Weekdays: /email', day: '2026-10-15' });
  assert.equal(again.status, 'already');
  assert.equal(again.workspaceId, 'ws-1');
  assert.equal(calls.length, 1);
  assert.deepEqual(opened({ stateDir, day: '2026-10-15', email: 'JO@example.com' }).map(e => e.step), ['Weekdays: /email']);
  assert.deepEqual(opened({ stateDir, day: '2026-10-15', email: 'sam@example.com' }), []);
  assert.equal(open({ ...at, day: '2026-10-16' }).status, 'opened');
  assert.equal(calls.length, 2);
  assert.equal(open({ ...at, email: 'sam@example.com', day: '2026-10-15' }).status, 'opened', 'another person opens their own');
});

test('outside Paseo nothing opens and nothing is recorded', t => {
  const stateDir = join(tmp(t), 'wong-daily');
  const { calls, launch } = fakeLaunch(OPENED);
  const at = { stateDir, day: '2026-10-15', email: 'jo@example.com', step: '/email', title: 'Email', brief: 'b.md', launch };
  assert.equal(open({ ...at, env: {} }).status, 'unsupported');
  assert.equal(calls.length, 0);
  for (const code of [3, 4]) {
    const result = open({ ...at, env: PASEO, launch: fakeLaunch({ ok: false, code, error: 'no paseo' }).launch });
    assert.equal(result.status, 'unsupported');
    assert.equal(result.reason, 'no paseo');
  }
  const failed = open({ ...at, env: PASEO, launch: fakeLaunch({ ok: false, code: 5 }).launch });
  assert.equal(failed.status, 'failed');
  assert.equal(failed.error, 'The workspace did not open.');
  assert.equal(existsSync(stateDir), false);
  const named = open({ ...at, env: PASEO, launch: fakeLaunch({ ok: true, code: 0 }).launch });
  assert.equal(named.workspace, 'Email');
  assert.equal(named.workspaceId, null);
});

test('the launcher report is read as JSON, and a crash keeps its message', t => {
  const dir = tmp(t);
  const brief = join(dir, 'brief.md');
  writeFileSync(brief, 'Work through email.\n');
  const refused = launchWorkspace({ title: 'Email', brief: join(dir, 'none.md'), env: process.env });
  assert.equal(refused.ok, false);
  assert.equal(refused.code, 2);
  assert.match(refused.error, /Cannot read the brief/);
  const crashed = launchWorkspace({ title: 'Email', brief, env: { ...process.env, NODE_OPTIONS: `--require ${join(dir, 'missing.cjs')}` } });
  assert.equal(crashed.ok, false);
  assert.notEqual(crashed.code, 0);
  assert.match(crashed.error, /missing\.cjs/);
});

// A git repository with no company app, so the command falls back to the git email.
function repo(t, email = 'jo@example.com') {
  const dir = tmp(t);
  execFileSync('git', ['init', '-q', dir]);
  if (email) execFileSync('git', ['-C', dir, 'config', 'user.email', email]);
  return dir;
}

const run = (cwd, args, env = {}) => {
  const base = { ...process.env, ...env };
  if (!('PASEO_AGENT_ID' in env)) delete base.PASEO_AGENT_ID;
  return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', env: base });
};

test('the command prints who, records nothing outside Paseo, and lists what opened', t => {
  const cwd = repo(t);
  const me = run(cwd, ['who']);
  assert.equal(me.status, 0, me.stderr);
  assert.equal(JSON.parse(me.stdout).source, 'git');
  assert.equal(JSON.parse(me.stdout).email, 'jo@example.com');
  const brief = join(cwd, 'brief.md');
  writeFileSync(brief, 'Work through email.\n');
  const step = run(cwd, ['open', '--step', '/email', '--title', 'Email', '--brief', brief, '--day', '2026-10-15']);
  assert.equal(step.status, 0, step.stderr);
  assert.equal(JSON.parse(step.stdout).status, 'unsupported');
  const list = run(cwd, ['opened', '--email', 'jo@example.com']);
  assert.equal(list.status, 0);
  assert.deepEqual(JSON.parse(list.stdout), []);
  assert.equal(existsSync(join(cwd, '.git', 'wong-daily')), false);
});

test('a failed open exits 1, and the record lives under the git folder', t => {
  const cwd = repo(t);
  const brief = join(cwd, 'brief.md');
  writeFileSync(brief, 'Work through email.\n');
  const failed = run(cwd, ['open', '--step', '/email', '--title', 'Email', '--brief', join(cwd, 'none.md')], { PASEO_AGENT_ID: 'x' });
  assert.equal(failed.status, 1);
  assert.equal(JSON.parse(failed.stdout).status, 'failed');
  const day = localDay();
  mkdirSync(join(cwd, '.git', 'wong-daily'));
  writeFileSync(join(cwd, '.git', 'wong-daily', `${day}.json`), JSON.stringify([{ email: 'jo@example.com', step: '/email', workspace: 'Email' }]));
  const again = run(cwd, ['open', '--step', '/email', '--title', 'Email', '--brief', brief]);
  assert.equal(JSON.parse(again.stdout).status, 'already');
  assert.equal(JSON.parse(readFileSync(join(cwd, '.git', 'wong-daily', `${day}.json`), 'utf8')).length, 1);
  assert.equal(JSON.parse(run(cwd, ['opened']).stdout).length, 1);
});

test('usage errors exit 2, help exits 0, and no email refuses to open', t => {
  const cwd = repo(t, null);
  assert.equal(run(cwd, ['--help']).status, 0);
  assert.equal(run(cwd, []).status, 2);
  assert.equal(run(cwd, ['later']).status, 2);
  assert.equal(run(cwd, ['opened', '--day', 'today', '--email', 'a@b.c']).status, 2);
  assert.equal(run(cwd, ['open', '--step', 'x', '--email', 'a@b.c']).status, 2);
  const refused = run(cwd, ['opened'], { GIT_CONFIG_GLOBAL: '/dev/null', GIT_CONFIG_NOSYSTEM: '1' });
  assert.equal(refused.status, 1);
  assert.match(JSON.parse(refused.stdout).error, /Not signed in/);
});

// The chief of staff, with fake Paseo calls. Each `ls` call starts the next scripted round; the last one repeats.
const DAY = '2026-10-21';
const ROWS = [
  { email: 'jo@example.com', step: 'Weekdays: /email', title: 'Email', workspace: 'email', agentId: 'a-1' },
  { email: 'jo@example.com', step: 'task: research', title: 'Research', workspace: 'research', agentId: 'b-2' },
  { email: 'sam@example.com', step: '/books', title: 'Books', workspace: 'books', agentId: 's-9' },
];

function chief(t, rows = ROWS) {
  const stateDir = join(tmp(t), 'wong-daily');
  mkdirSync(stateDir);
  writeFileSync(join(stateDir, `${DAY}.json`), JSON.stringify(rows));
  return { stateDir, day: DAY, email: 'jo@example.com', env: PASEO };
}

function fakePaseo(rounds, { last = 'Tests pass; next I will update the wiki page.' } = {}) {
  const calls = [];
  let round = -1;
  const call = async args => {
    calls.push(args);
    if (args[0] === 'ls') round = Math.min(round + 1, rounds.length - 1);
    const now = rounds[Math.max(round, 0)];
    if (now.fail) throw now.fail === true ? new Error('daemon busy') : now.fail;
    if (args[0] === 'ls') return now.ls;
    if (args.join(' ') === 'permit ls') return now.permits ?? [];
    if (args[0] === 'logs') return last;
    return { ok: true };
  };
  return { calls, call };
}

const agent = (id, status, extra = {}) => ({ id, name: id, status, cwd: `/w/${id}`, ...extra });
const CARD = { id: 'permission-77', agentId: 'a-1', name: 'AskUserQuestion', description: 'Build it now (Recommended) / Stop' };

async function events(at, rounds, options = {}) {
  const lines = [];
  const { calls, call } = fakePaseo(rounds, options);
  await watch({ ...at, call, print: line => lines.push(JSON.parse(line)), seconds: 1, sleep: async () => {}, ...options.watch });
  return { lines, calls };
}

test('watch prints each stop once per spell, each request once, not-read once, gone, then end', async t => {
  const at = chief(t);
  const unwatched = agent('c-3', 'idle');
  const { lines, calls } = await events(at, [
    { ls: [agent('a-1', 'running'), agent('b-2', 'idle'), unwatched, agent('s-9', 'idle')] },
    { ls: [agent('a-1', 'idle'), agent('b-2', 'idle'), unwatched] },
    { ls: [agent('a-1', 'running'), agent('b-2', 'idle'), unwatched], permits: [CARD, { ...CARD, id: 'permission-c', agentId: 'c-3' }] },
    { fail: true },
    { fail: true },
    { ls: [agent('a-1', 'running'), unwatched], permits: [CARD] },
    { ls: [agent('a-1', 'closed'), unwatched] },
  ], { last: `old ${'x'.repeat(5000)}` });
  assert.deepEqual(lines.map(line => `${line.event} ${line.agent ?? line.reason ?? ''}`.trim()), [
    'stopped b-2', 'stopped a-1', 'asking a-1', 'not-read', 'gone b-2', 'gone a-1', 'end empty',
  ]);
  const [stopped] = lines;
  assert.equal(stopped.title, 'Research');
  assert.equal(stopped.workspace, 'research');
  assert.equal(stopped.last.length, 4000);
  assert.deepEqual(lines[2].request, { id: 'permission-77', name: 'AskUserQuestion', description: 'Build it now (Recommended) / Stop' });
  assert.equal(lines[3].error, 'daemon busy');
  assert.ok(!calls.some(args => args.includes('c-3') || args.includes('s-9')), 'an unwatched chat is never read');
});

test('a stop the chief acted on starts a new spell, and watch ends at its time limit', async t => {
  const at = chief(t, ROWS.slice(0, 1));
  let clock = Date.parse('2026-10-21T10:00:00Z');
  const timed = { now: () => clock, sleep: async ms => { clock += ms; }, seconds: 1800, hours: 1 };
  const first = await events(at, [{ ls: [agent('a-1', 'idle')] }], { watch: { ...timed, once: true } });
  assert.deepEqual(first.lines.map(line => line.event), ['stopped']);
  writeFileSync(join(at.stateDir, `${DAY}.actions.jsonl`), `${JSON.stringify({ at: '2026-10-21T10:10:00.000Z', agent: 'a-1', bucket: 'keep-going' })}\n`);
  clock = Date.parse('2026-10-21T11:00:00Z');
  const later = await events(at, [{ ls: [agent('a-1', 'idle')] }], { watch: timed });
  assert.deepEqual(later.lines.map(line => `${line.event} ${line.reason ?? ''}`.trim()), ['stopped', 'end time']);
  assert.equal(later.calls.filter(args => args[0] === 'ls').length, 3);
});

test('--once reads one round and remembers what it printed', async t => {
  const at = chief(t, ROWS.slice(0, 1));
  const once = { watch: { once: true } };
  assert.deepEqual((await events(at, [{ ls: [agent('a-1', 'idle')] }], once)).lines.map(line => line.event), ['stopped']);
  const again = await events(at, [{ ls: [agent('a-1', 'idle')] }], once);
  assert.deepEqual(again.lines, []);
  assert.equal(again.calls.filter(args => args[0] === 'ls').length, 1);
});

test('outside Paseo watch prints unsupported and reads nothing', async t => {
  const at = chief(t);
  const outside = await events({ ...at, env: {} }, [{ ls: [] }]);
  assert.deepEqual(outside.lines.map(line => line.event), ['unsupported']);
  assert.equal(outside.calls.length, 0);
  const missing = await events(at, [{ fail: new PaseoError(EXIT.noPaseo, 'no paseo') }]);
  assert.deepEqual(missing.lines.map(line => line.event), ['unsupported']);
  const empty = await events(chief(t, []), [{ ls: [] }]);
  assert.deepEqual(empty.lines.map(line => `${line.event} ${line.reason}`), ['end empty']);
});

test('hand watches a chat by id, title or workspace, and refuses an unknown, doubled or own one', async t => {
  const at = chief(t, []);
  const list = [agent('h-1234567', 'idle', { name: 'Packaging', cwd: '/w/flashy-crab' }), agent('d-1', 'idle', { name: 'Dup' }), agent('d-2', 'idle', { name: 'dup' }), agent('agent-1', 'running')];
  const { call } = fakePaseo([{ ls: list }]);
  const handed = await hand({ ...at, agent: 'flashy-crab', call });
  assert.equal(handed.status, 'handed');
  assert.equal(handed.source, 'handed');
  assert.equal(handed.workspace, 'flashy-crab');
  assert.deepEqual(opened(at).map(row => row.agentId), ['h-1234567']);
  assert.equal((await hand({ ...at, agent: 'packaging', call })).status, 'already');
  assert.equal((await hand({ ...at, agent: 'h-12', call })).status, 'already');
  assert.equal((await hand({ ...at, agent: 'nobody', call })).status, 'unknown');
  assert.equal((await hand({ ...at, agent: 'DUP', call })).status, 'ambiguous');
  assert.equal((await hand({ ...at, agent: 'agent-1', call })).status, 'refused');
  assert.equal((await hand({ ...at, env: {}, agent: 'flashy-crab', call })).status, 'unsupported');
  assert.equal(opened(at).length, 1);
});

test('reply and answer touch only a watched, stopped agent, log each action, and stop a loop at five', async t => {
  const at = chief(t);
  const file = join(at.stateDir, 'reply.txt');
  writeFileSync(file, 'Keep going.\n');
  const { calls, call } = fakePaseo([{ ls: [agent('a-1', 'idle'), agent('b-2', 'running'), agent('c-3', 'idle')], permits: [{ ...CARD, agentId: 'b-2' }] }]);
  const act = (command, extra) => command({ ...at, call, file, bucket: 'keep-going', label: 'Kept going: Email', agent: 'a-1', ...extra });
  assert.equal((await act(reply, { agent: 'c-3' })).reason, 'unwatched');
  assert.equal((await act(reply, { agent: 'Research' })).reason, 'running');
  assert.equal((await act(reply, { agent: 'Books' })).reason, 'unwatched', "another person's agent is not this chief's");
  assert.ok(!calls.some(args => args[0] === 'send'));
  for (let n = 0; n < 5; n++) assert.equal((await act(reply)).status, 'sent');
  assert.deepEqual(calls.find(args => args[0] === 'send'), ['send', 'a-1', '--prompt-file', file, '--no-wait']);
  const sixth = await act(reply);
  assert.equal(sixth.reason, 'streak');
  assert.match(sixth.error, /tell the person/);
  assert.equal((await act(reply, { bucket: 'person', label: 'Relayed: Email' })).status, 'sent');
  assert.equal((await act(reply)).status, 'sent', "the person's word resets the count");
  assert.equal(calls.filter(args => args[0] === 'send').length, 7);
  writeFileSync(file, 'Build it now');
  assert.equal((await act(answer, { agent: 'c-3', request: 'permission-77' })).reason, 'unwatched');
  assert.equal((await act(answer, { agent: 'a-1', request: 'permission-77' })).reason, 'request');
  const answered = await act(answer, { agent: 'b-2', request: 'permission-7', bucket: 'pick', label: 'Picked "Build it now": Research' });
  assert.equal(answered.status, 'answered');
  assert.deepEqual(calls.at(-1), ['permit', 'deny', 'b-2', 'permission-77', '--message', 'Answer: Build it now']);
  assert.equal((await act(reply, { file: join(at.stateDir, 'none.txt') })).reason, 'message');
  const now = await status({ ...at, call });
  assert.equal(now.state, 'read');
  assert.deepEqual(now.agents.map(row => [row.agent, row.status, row.asking, row.last?.label ?? null]), [
    ['a-1', 'idle', 0, 'Kept going: Email'], ['b-2', 'running', 1, 'Picked "Build it now": Research'],
  ]);
  assert.equal(now.agents[1].last.request, 'permission-77');
  assert.equal((await status({ ...at, call: fakePaseo([{ fail: true }]).call })).state, 'not-read');
  assert.equal((await status({ ...at, env: {}, call })).status, 'unsupported');
  assert.equal((await act(reply, { env: {} })).status, 'unsupported');
});

// Reminders, with a fake memory.mjs that keeps its facts and applies supersedes.
function fakeMemory(facts, { fail = false, spool = false, threads = [] } = {}) {
  const calls = [];
  const live = [...facts];
  const memory = (args, input) => {
    calls.push({ args, input: input ? JSON.parse(input) : null });
    if (fail) return { code: 1, stdout: '', stderr: 'memory store unavailable' };
    if (args[0] === 'search') {
      const thread = args.includes('thread');
      return { code: 0, stdout: `${JSON.stringify({ version: 1, facts: thread ? threads : live })}\n`, stderr: '' };
    }
    if (spool) return { code: 0, stdout: 'spooled: 1 facts wait in /tmp/x.json', stderr: '' };
    for (const fact of JSON.parse(input).facts) {
      for (const id of fact.supersedes ?? []) live.splice(live.findIndex(old => old.id === id), 1);
      live.push({ id: 100 + live.length, author: 'jo@example.com', ...fact });
    }
    return { code: 0, stdout: 'stored: added 1, superseded 0, dropped 0\nupkeep: closed 0', stderr: '' };
  };
  return { calls, memory };
}

const fact = (id, body, author = 'jo@example.com') => ({ id, body, author, type: 'user', slug: 'daily-routine' });
const FACTS = [
  fact(1, 'Reminder for 2026-10-24: call Kim back about the kits'),
  fact(2, 'Reminder for 2026-10-21: send the invoice'),
  fact(3, 'Reminder for 2026-10-17: book the van'),
  fact(4, 'Reminder for 2026-10-20: Sam’s own thing', 'sam@example.com'),
  fact(5, 'Done 2026-10-20: water the plants'),
];
const ME = ['jo@example.com'];

test('reminders lists today and overdue ones oldest first, only the person’s own, plus 5 open threads', () => {
  const threads = Array.from({ length: 7 }, (_, n) => ({ id: 50 + n, slug: 'x', body: `thread ${n}`, author: 'jo@example.com', created_at: '2026-10-20' }));
  const { calls, memory } = fakeMemory(FACTS, { threads });
  const list = reminders({ day: DAY, authors: ME, memory });
  assert.equal(list.state, 'read');
  assert.deepEqual(list.due.map(r => [r.id, r.day, r.overdue]), [[3, '2026-10-17', true], [2, '2026-10-21', false]]);
  assert.equal(list.due[1].text, 'send the invoice');
  assert.equal(list.open.length, 5);
  assert.deepEqual(calls[0].args, ['search', '--tag', 'reminder', '--type', 'user', '--limit', '200', '--json']);
  assert.deepEqual(calls[1].args, ['search', '--type', 'thread', '--author', 'jo@example.com', '--limit', '5', '--json']);
  assert.deepEqual(reminders({ day: '2026-10-24', authors: ['sam@example.com'], memory }).due.map(r => r.id), [4]);
});

test('remind saves a private dated fact, refuses a bad day, and says when it was spooled', () => {
  const { calls, memory } = fakeMemory([]);
  assert.equal(remind({ day: 'Friday', text: 'call Kim', memory }).state, 'refused');
  assert.equal(remind({ day: DAY, text: '  ', memory }).state, 'refused');
  assert.equal(calls.length, 0);
  const saved = remind({ day: '2026-10-24', text: ' call Kim back ', memory });
  assert.deepEqual(saved, { state: 'saved', day: '2026-10-24', text: 'call Kim back' });
  const { input } = calls[0];
  assert.deepEqual(calls[0].args, ['put-facts', '--file', '-']);
  assert.equal(input.slug, 'daily-routine');
  assert.deepEqual(input.facts, [{ type: 'user', body: 'Reminder for 2026-10-24: call Kim back', tags: ['reminder'] }]);
  assert.equal(input.newTags[0].name, 'reminder');
  assert.ok(input.newTags[0].definition);
  assert.equal(remind({ day: DAY, text: 'x', memory: fakeMemory([], { spool: true }).memory }).state, 'spooled');
});

test('done supersedes the person’s own reminder, and the next list omits it', () => {
  const { calls, memory } = fakeMemory(FACTS);
  assert.equal(done({ id: '4', day: DAY, authors: ME, memory }).state, 'refused', "another person's reminder");
  assert.equal(done({ id: '5', day: DAY, authors: ME, memory }).state, 'refused', 'not a reminder');
  const marked = done({ id: '2', day: DAY, authors: ME, memory });
  assert.equal(marked.state, 'saved');
  const put = calls.find(call => call.args[0] === 'put-facts').input.facts[0];
  assert.deepEqual(put, { type: 'user', action: 'supersede', supersedes: [2], body: 'Done 2026-10-21: send the invoice', tags: ['reminder'] });
  assert.deepEqual(reminders({ day: DAY, authors: ME, memory }).due.map(r => r.id), [3]);
  assert.equal(done({ id: '2', day: DAY, authors: ME, memory }).state, 'refused', 'already done');
});

test('a store that does not answer gives not-read, and a failed save says so', () => {
  const { memory } = fakeMemory(FACTS, { fail: true });
  assert.deepEqual(reminders({ day: DAY, authors: ME, memory }), { state: 'not-read', error: 'memory store unavailable' });
  assert.equal(done({ id: '2', day: DAY, authors: ME, memory }).state, 'not-read');
  assert.equal(remind({ day: DAY, text: 'x', memory }).state, 'failed');
});

test('the chief commands refuse bad flags, and outside Paseo say unsupported', t => {
  const cwd = repo(t);
  assert.equal(run(cwd, ['remind', '--day', 'Friday', '--text', 'call Kim']).status, 2);
  assert.equal(run(cwd, ['remind', '--text', 'call Kim']).status, 2);
  assert.equal(run(cwd, ['reply', '--agent', 'a', '--file', 'f', '--bucket', 'maybe', '--label', 'x']).status, 2);
  assert.equal(run(cwd, ['answer', '--agent', 'a', '--file', 'f', '--bucket', 'pick', '--label', 'x']).status, 2);
  assert.equal(run(cwd, ['watch', '--seconds', '0']).status, 2);
  assert.equal(run(cwd, ['hand']).status, 2);
  const watching = run(cwd, ['watch']);
  assert.equal(watching.status, 0, watching.stderr);
  assert.deepEqual(JSON.parse(watching.stdout), { event: 'unsupported', reason: 'This chat is not in Paseo, so it cannot watch other chats.' });
  const now = run(cwd, ['status']);
  assert.equal(now.status, 0);
  assert.equal(JSON.parse(now.stdout).status, 'unsupported');
});

// A stand-in for the live app's inbox: records what opened and closed, or answers null when it is off.
function fakeInbox(on = true) {
  const opened = [];
  const closed = [];
  return { opened, closed, inbox: {
    open: async spec => { if (!on) return null; opened.push(spec); return { id: `i${opened.length}`, link: `${ORIGIN}/apps/inbox/?item=i${opened.length}` }; },
    close: async id => { closed.push(id); return true; },
  } };
}

test('inbox add puts an approval or a question in the inbox, aimed at this chat, and close ends it', async t => {
  const at = chief(t);
  const words = join(at.stateDir, 'ask.json');
  writeFileSync(words, JSON.stringify({ text: 'Send the March invoice?' }));
  const { opened, closed, inbox } = fakeInbox();
  const added = await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title: 'Invoices', file: words, cwd: '/w/chief', inbox });
  assert.deepEqual(added, { status: 'added', id: 'i1', link: `${ORIGIN}/apps/inbox/?item=i1` });
  assert.deepEqual(opened[0].actions, { approve: 'Inbox answer for Invoices (a-1): Approve', decline: 'Inbox answer for Invoices (a-1): Decline' });
  assert.equal(opened[0].header, 'Inbox answer for Invoices (a-1):');
  assert.equal(opened[0].target.agentId, 'agent-1');
  assert.deepEqual(JSON.parse(opened[0].body), { text: 'Send the March invoice?' });
  writeFileSync(words, JSON.stringify({ text: 'Which day?', options: ['Monday', 'Friday'] }));
  await inboxAdd({ ...at, kind: 'question', agent: 'b-2', title: 't'.repeat(300), file: words, inbox });
  assert.deepEqual(opened[1].actions, {});
  assert.equal(opened[1].title.length, 200);
  assert.deepEqual(await inboxClose({ ...at, id: 'i1', inbox }), { status: 'closed', id: 'i1' });
  assert.equal((await inboxClose({ ...at, id: 'i1', inbox })).status, 'refused');
  assert.deepEqual(closed, ['i1']);
});

test('inbox add refuses words past the limits, says unavailable when the inbox is off, and needs Paseo', async t => {
  const at = chief(t);
  const words = join(at.stateDir, 'ask.json');
  const { opened, inbox } = fakeInbox();
  for (const bad of [{}, { text: '' }, { text: 'x'.repeat(2001) }, { text: 'Go?', options: Array(7).fill('a') }, { text: 'Go?', options: ['o'.repeat(301)] },
    { text: 'Go?', extra: 1 }, [], 'Go?']) {
    writeFileSync(words, JSON.stringify(bad));
    assert.equal((await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title: 'T', file: words, inbox })).status, 'refused');
  }
  assert.equal((await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title: 'T', file: join(at.stateDir, 'missing.json'), inbox })).status, 'refused');
  assert.equal(opened.length, 0);
  writeFileSync(words, JSON.stringify({ text: 'Go?' }));
  assert.equal((await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title: 'T', file: words, inbox: fakeInbox(false).inbox })).status, 'unavailable');
  assert.equal((await inboxAdd({ ...at, env: {}, kind: 'approval', agent: 'a-1', title: 'T', file: words, inbox })).status, 'unsupported');
});

test("the watch's end closes every item the chief added that day", async t => {
  const at = chief(t, ROWS.slice(0, 1));
  const words = join(at.stateDir, 'ask.json');
  writeFileSync(words, JSON.stringify({ text: 'Go?' }));
  const { closed, inbox } = fakeInbox();
  for (const title of ['One', 'Two']) await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title, file: words, inbox });
  const { lines } = await events(at, [{ ls: [agent('a-1', 'closed')] }], { watch: { inbox } });
  assert.deepEqual(lines.at(-1), { event: 'end', reason: 'empty' });
  assert.deepEqual(closed, ['i1', 'i2']);
  assert.deepEqual(JSON.parse(readFileSync(join(at.stateDir, `${DAY}.inbox.json`), 'utf8')), []);
});

test('the inbox commands take add or close and check their flags', t => {
  const cwd = repo(t);
  assert.equal(run(cwd, ['inbox']).status, 2);
  assert.equal(run(cwd, ['inbox', 'open']).status, 2);
  assert.equal(run(cwd, ['inbox', 'add', '--kind', 'approval', '--agent', 'a', '--title', 'T']).status, 2);
  assert.equal(run(cwd, ['inbox', 'add', '--kind', 'poll', '--agent', 'a', '--title', 'T', '--file', 'f']).status, 2);
  assert.equal(run(cwd, ['inbox', 'close']).status, 2);
  const outside = run(cwd, ['inbox', 'add', '--kind', 'question', '--agent', 'a', '--title', 'T', '--file', 'f']);
  assert.equal(outside.status, 0, outside.stderr);
  assert.equal(JSON.parse(outside.stdout).status, 'unsupported');
});
