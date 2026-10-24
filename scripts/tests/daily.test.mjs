// /daily's script: who the person is, which steps file is theirs, one workspace per step and day, the chief's watch
// and hands, and reminders.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  agentEvents, answer, close, done, doneAgent, emailsOf, hand, inboxAdd, inboxClose, launchWorkspace, localDay, main, mark, open, opened, personFile,
  planOf, reminders, remind, reply, start, status, watch, watchStops, who,
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
    if (args[0] === 'logs') return now.last ?? last;
    return { ok: true };
  };
  return { calls, call };
}

const agent = (id, status, extra = {}) => ({ id, name: id, status, cwd: `/w/${id}`, ...extra });
const CARD = { id: 'permission-77', agentId: 'a-1', name: 'AskUserQuestion', description: 'Build it now (Recommended) / Stop' };

async function events(at, rounds, options = {}) {
  const lines = [];
  const { calls, call } = fakePaseo(rounds, options);
  await watch({ ...at, call, print: line => lines.push(JSON.parse(line)), seconds: 1, sleep: async () => {}, inbox: fakeInbox(false).inbox, ...options.watch });
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

test('close archives a watched workspace or agent, and the watch prints nothing more for it', async t => {
  const at = chief(t, [{ ...ROWS[0], workspaceId: 'ws-1' }, ...ROWS.slice(1)]);
  const { calls, call } = fakePaseo([{ ls: [agent('a-1', 'running'), agent('b-2', 'running')] }]);
  const closed = await close({ ...at, agent: 'Email', call });
  assert.equal(closed.status, 'closed');
  assert.equal(closed.agent, 'a-1');
  assert.deepEqual(calls.at(-1), ['workspace', 'archive', 'ws-1']);
  assert.equal((await close({ ...at, agent: 'research', call })).status, 'closed');
  assert.deepEqual(calls.at(-1), ['archive', 'b-2', '--force'], 'no workspace id: the agent itself, interrupted');
  assert.ok(opened(at).every(row => row.closed));
  const later = await events(at, [{ ls: [agent('a-1', 'idle'), agent('b-2', 'closed')] }]);
  assert.deepEqual(later.lines.map(line => `${line.event} ${line.reason ?? ''}`.trim()), ['end empty']);
  assert.equal((await reply({ ...at, call, agent: 'a-1', file: 'x', bucket: 'keep-going', label: 'x' })).reason, 'unwatched');
  const now = await status({ ...at, call: fakePaseo([{ ls: [agent('a-1', 'idle')] }]).call });
  assert.deepEqual(now.agents, [], 'a closed agent gets no status line');
});

test('a step closed today opens again fresh, and its close marks only the old row', async t => {
  const at = chief(t, [{ ...ROWS[0], workspaceId: 'ws-1' }]);
  const { call } = fakePaseo([{ ls: [] }]);
  assert.equal((await close({ ...at, agent: 'a-1', call })).status, 'closed');
  const { launch } = fakeLaunch({ ...OPENED, agentId: 'a-2', workspaceId: 'ws-2' });
  const again = open({ ...at, step: ROWS[0].step, title: 'Email', brief: 'brief.md', launch });
  assert.deepEqual([again.status, again.agentId], ['opened', 'a-2']);
  assert.equal(open({ ...at, step: ROWS[0].step, title: 'Email', brief: 'brief.md', launch }).status, 'already');
  assert.deepEqual(opened(at).map(row => [row.agentId, Boolean(row.closed)]), [['a-1', true], ['a-2', false]]);
});

test('close refuses a chat the person handed over, and never archives it', async t => {
  const at = chief(t, []);
  const { calls, call } = fakePaseo([{ ls: [agent('h-1234567', 'running', { name: 'Packaging', cwd: '/w/flashy-crab' })] }]);
  assert.equal((await hand({ ...at, agent: 'flashy-crab', call })).status, 'handed');
  const refused = await close({ ...at, agent: 'Packaging', call });
  assert.deepEqual([refused.status, refused.agent], ['refused', 'h-1234567']);
  assert.match(refused.error, /handed over/);
  assert.ok(!calls.some(args => args.includes('archive')));
  assert.ok(!opened(at).some(row => row.closed));
});

test('close refuses an unknown or closed agent, and a failed archive keeps it watched', async t => {
  const at = chief(t);
  const { calls, call } = fakePaseo([{ ls: [] }]);
  for (const name of ['c-3', 'Books']) assert.equal((await close({ ...at, agent: name, call })).status, 'unknown');
  assert.equal(calls.length, 0);
  const failed = await close({ ...at, agent: 'a-1', call: fakePaseo([{ fail: true }]).call });
  assert.deepEqual([failed.status, failed.error], ['failed', 'daemon busy']);
  const missing = await close({ ...at, agent: 'a-1', call: fakePaseo([{ fail: new PaseoError(EXIT.noPaseo, 'no paseo') }]).call });
  assert.equal(missing.status, 'unsupported');
  assert.equal((await close({ ...at, env: {}, agent: 'a-1', call })).status, 'unsupported');
  assert.ok(!opened(at).some(row => row.closed));
  assert.equal((await close({ ...at, agent: 'a-1', call })).status, 'closed');
  assert.equal((await close({ ...at, agent: 'a-1', call })).status, 'unknown');
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
  assert.equal(run(cwd, ['close']).status, 2);
  const watching = run(cwd, ['watch']);
  assert.equal(watching.status, 0, watching.stderr);
  assert.deepEqual(JSON.parse(watching.stdout), { event: 'unsupported', reason: 'This chat is not in Paseo, so it cannot watch other chats.' });
  const now = run(cwd, ['status']);
  assert.equal(now.status, 0);
  assert.equal(JSON.parse(now.stdout).status, 'unsupported');
});

// A stand-in for the live app's inbox: records what opened and closed, or answers null when it is off. An item given
// no id gets `i<n>`, counting only those.
function fakeInbox(on = true) {
  const opened = [];
  const closed = [];
  let made = 0;
  return { opened, closed, inbox: {
    open: async spec => {
      if (!on) { opened.push(null); return null; }
      opened.push(spec);
      const id = spec.id ?? `i${++made}`;
      return { id, link: `${ORIGIN}/apps/inbox/?item=${id}` };
    },
    close: async id => { closed.push(id); return true; },
  } };
}
// The ids of items the chief added by hand, leaving out the watch's own status items.
const added = ids => ids.filter(id => /^i\d+$/.test(id));

test('close takes a closed agent card and its questions out of the inbox, and leaves the others', async t => {
  const at = chief(t);
  const { closed, inbox } = fakeInbox();
  const words = join(at.stateDir, 'ask.json');
  writeFileSync(words, JSON.stringify({ text: 'Publish the returns page?' }));
  await inboxAdd({ ...at, kind: 'approval', agent: 'a-1', title: 'Email', file: words, cwd: '/w/chief', inbox });
  await inboxAdd({ ...at, kind: 'question', agent: 'b-2', title: 'Research', file: words, cwd: '/w/chief', inbox });
  await events(at, [{ ls: [agent('a-1', 'idle'), agent('b-2', 'idle')] }], { watch: { inbox, once: true } });
  assert.deepEqual(closed, [], 'both still wait on the person');
  const cards = closed.length;
  assert.equal((await close({ ...at, agent: 'a-1', call: fakePaseo([{ ls: [] }]).call, inbox })).status, 'closed');
  const gone = closed.slice(cards);
  assert.equal(gone.length, 2, 'its status card and its approval');
  assert.ok(gone.includes('i1') && !gone.includes('i2'));
  assert.deepEqual(JSON.parse(readFileSync(join(at.stateDir, `${DAY}.inbox.json`), 'utf8')).map(item => item.id), ['i2']);
});

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
  writeFileSync(words, JSON.stringify({ text: 'Which days?', options: ['Monday', 'Friday'], multi: true }));
  await inboxAdd({ ...at, kind: 'question', agent: 'Research', title: 't'.repeat(300), file: words, request: 'permission-5', inbox, now: new Date(NOON) });
  assert.deepEqual(opened[1].actions, {});
  assert.equal(opened[1].title.length, 200);
  assert.equal(JSON.parse(opened[1].body).multi, true);
  const [first, second] = JSON.parse(readFileSync(join(at.stateDir, `${DAY}.inbox.json`), 'utf8'));
  assert.deepEqual(Object.keys(first), ['id', 'agent', 'at', 'title']);
  assert.deepEqual(second, { id: 'i2', agent: 'b-2', at: NOON, request: 'permission-5', title: 't'.repeat(200) });
  assert.deepEqual(await inboxClose({ ...at, id: 'i1', inbox }), { status: 'closed', id: 'i1' });
  assert.equal((await inboxClose({ ...at, id: 'i1', inbox })).status, 'refused');
  assert.deepEqual(closed, ['i1']);
});

test('inbox add refuses words past the limits, says unavailable when the inbox is off, and needs Paseo', async t => {
  const at = chief(t);
  const words = join(at.stateDir, 'ask.json');
  const { opened, inbox } = fakeInbox();
  for (const bad of [{}, { text: '' }, { text: 'x'.repeat(2001) }, { text: 'Go?', options: Array(7).fill('a') }, { text: 'Go?', options: ['o'.repeat(301)] },
    { text: 'Go?', extra: 1 }, { text: 'Go?', multi: false }, { text: 'Go?', multi: 'yes' }, [], 'Go?']) {
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

const NOON = '2026-10-21T12:00:00.000Z';

test('the watch closes an item answered in its own chat, keeps one the chief replied to, and reads old ids', async t => {
  const at = chief(t, [...ROWS.slice(0, 2), { email: 'jo@example.com', step: 'hand: c-3', title: 'Books', agentId: 'c-3' }]);
  const words = join(at.stateDir, 'ask.json');
  writeFileSync(words, JSON.stringify({ text: 'Go?', options: ['Yes', 'No'] }));
  writeFileSync(join(at.stateDir, `${DAY}.inbox.json`), JSON.stringify(['i0']));
  const { closed, inbox } = fakeInbox();
  const add = (agentName, title, request) => inboxAdd({ ...at, kind: 'question', agent: agentName, title, file: words, request, inbox, now: new Date(NOON) });
  await add('a-1', 'Card', CARD.id);
  await add('b-2', 'Stop');
  await add('c-3', 'Replied');
  writeFileSync(join(at.stateDir, `${DAY}.actions.jsonl`), `${JSON.stringify({ at: '2026-10-21T12:05:00.000Z', agent: 'c-3', kind: 'reply', bucket: 'pick' })}\n`);
  const { lines } = await events(at, [
    { ls: [agent('a-1', 'running'), agent('b-2', 'idle'), agent('c-3', 'idle')], permits: [CARD] },
    { ls: [agent('a-1', 'running'), agent('b-2', 'running'), agent('c-3', 'running')] },
    { ls: [agent('a-1', 'closed'), agent('b-2', 'closed'), agent('c-3', 'closed')] },
  ], { watch: { inbox } });
  assert.deepEqual(lines.filter(line => line.event === 'answered-elsewhere'), [
    { event: 'answered-elsewhere', title: 'Card', agent: 'a-1', item: 'i1' },
    { event: 'answered-elsewhere', title: 'Stop', agent: 'b-2', item: 'i2' },
  ]);
  assert.deepEqual(added(closed), ['i1', 'i2', 'i0', 'i3']);
  assert.deepEqual(lines.at(-1), { event: 'end', reason: 'empty' });
});

test('the watch closes a stop item when the agent answers between two rounds and is idle again', async t => {
  const at = chief(t, ROWS.slice(1, 2));
  const words = join(at.stateDir, 'ask.json');
  writeFileSync(words, JSON.stringify({ text: 'Acme or Boxco?', options: ['Acme', 'Boxco'] }));
  const { closed, inbox } = fakeInbox();
  await inboxAdd({ ...at, kind: 'question', agent: 'b-2', title: 'Quick', file: words, inbox, now: new Date(NOON) });
  const { lines } = await events(at, [
    { ls: [agent('b-2', 'idle')], last: 'Acme or Boxco?' },
    { ls: [agent('b-2', 'idle')], last: 'Acme or Boxco?' },
    { ls: [agent('b-2', 'idle')], last: 'Going with Acme.' },
    { ls: [agent('b-2', 'closed')] },
  ], { watch: { inbox } });
  assert.deepEqual(lines.filter(line => line.event === 'answered-elsewhere'), [{ event: 'answered-elsewhere', title: 'Quick', agent: 'b-2', item: 'i1' }]);
  assert.deepEqual(added(closed), ['i1']);
});

test('the inbox commands take add or close and check their flags', t => {
  const cwd = repo(t);
  assert.equal(run(cwd, ['inbox']).status, 2);
  assert.equal(run(cwd, ['inbox', 'open']).status, 2);
  assert.equal(run(cwd, ['inbox', 'add', '--kind', 'approval', '--agent', 'a', '--title', 'T']).status, 2);
  assert.equal(run(cwd, ['inbox', 'add', '--kind', 'poll', '--agent', 'a', '--title', 'T', '--file', 'f']).status, 2);
  assert.equal(run(cwd, ['inbox', 'close']).status, 2);
  const outside = run(cwd, ['inbox', 'add', '--kind', 'question', '--agent', 'a', '--title', 'T', '--file', 'f', '--request', 'permission-1']);
  assert.equal(outside.status, 0, outside.stderr);
  assert.equal(JSON.parse(outside.stdout).status, 'unsupported');
});

// Plan the day first: two morning agents opened to plan, each with its plan file in the day's state folder.
const PLAN = { willDo: ['Draft three ad angles'], needs: ['The BFCM offer'], askFirst: ['Before it posts anything'],
  questions: [{ text: 'Which offer leads the ads?', options: ['Free shipping', 'Gift card'] }] };

function planning(t) {
  const at = chief(t, []);
  const rows = [
    { email: 'jo@example.com', step: 'Weekdays: /ads (own workspace)', title: 'Ads', workspace: 'Ads', folder: 'bfcm-brief', workspaceId: 'ws-ads', agentId: 'p-1' },
    { email: 'jo@example.com', step: 'task: TikTok Shop', title: 'TikTok Shop', workspace: 'TikTok', folder: 'tiktok', workspaceId: 'ws-tt', agentId: 'p-2' },
  ].map((row, n) => ({ ...row, phase: 'planning', plan: join(at.stateDir, `${DAY}.plans`, `${n + 1}.json`), at: `2026-10-21T08:0${n}:00.000Z` }));
  writeFileSync(join(at.stateDir, `${DAY}.json`), JSON.stringify(rows));
  mkdirSync(join(at.stateDir, `${DAY}.plans`));
  return { at, rows };
}

const eventsOf = lines => lines.map(line => `${line.event} ${line.agent ?? ''}`.trim());

test('open --plan-first launches with the plan-first brief and marks the row planning', t => {
  const dir = tmp(t);
  const stateDir = join(dir, 'wong-daily');
  const brief = join(dir, 'brief.md');
  writeFileSync(brief, '## Goal\nDraft the BFCM ads.\n');
  const { calls, launch } = fakeLaunch({ ...OPENED, cwd: '/w/bfcm-brief' });
  const at = { stateDir, day: DAY, email: 'jo@example.com', env: PASEO, launch };
  const row = open({ ...at, step: 'Weekdays: /ads (own workspace)', title: 'Ads', brief, plan: true });
  assert.equal(row.status, 'opened');
  assert.equal(row.phase, 'planning');
  assert.equal(row.folder, 'bfcm-brief');
  assert.equal(row.plan, join(stateDir, `${DAY}.plans`, '1.json'));
  assert.equal(calls[0].brief, join(stateDir, `${DAY}.plans`, '1.md'));
  const text = readFileSync(calls[0].brief, 'utf8');
  assert.match(text, /^## Goal\nDraft the BFCM ads\.\n\n## Plan first\n/);
  assert.ok(text.includes(row.plan));
  const plain = open({ ...at, step: 'task: packaging', title: 'Packaging', brief });
  assert.equal(plain.phase, undefined);
  assert.equal(calls[1].brief, brief);
  assert.equal(open({ ...at, step: 'task: x', title: 'X', brief: join(dir, 'none.md'), plan: true }).status, 'failed');
  assert.equal(calls.length, 2);
});

test('planOf takes only a plan within the inbox limits', t => {
  const file = join(tmp(t), 'plan.json');
  const check = value => { writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value)); return planOf(file); };
  assert.deepEqual(check(PLAN), PLAN);
  assert.equal(check({ ...PLAN, questions: [{ text: 'Days?', options: ['Mon'], several: true }] }).questions[0].several, true);
  for (const bad of ['{"willDo": ["half', [], { ...PLAN, extra: 1 }, { ...PLAN, needs: undefined }, { ...PLAN, willDo: Array(7).fill('a') },
    { ...PLAN, willDo: ['x'.repeat(301)] }, { ...PLAN, askFirst: [''] }, { ...PLAN, questions: [{ text: '' }] },
    { ...PLAN, questions: [{ text: 'Q', several: 'yes' }] }, { ...PLAN, questions: Array(7).fill({ text: 'Q' }) }]) {
    assert.equal(check(bad), null, JSON.stringify(bad));
  }
  assert.equal(planOf(`${file}.missing`), null);
  assert.equal(planOf(undefined), null);
});

test('the watch prints planned once, a planning stop once, then no-plan, then plans-ready once', async t => {
  const { at, rows } = planning(t);
  writeFileSync(rows[0].plan, JSON.stringify(PLAN));
  const round = [{ ls: [agent('p-1', 'idle'), agent('p-2', 'idle')] }];
  const at8 = minute => ({ watch: { once: true, now: () => Date.parse(`2026-10-21T08:0${minute}:00Z`) } });
  const first = await events(at, round, at8(5));
  assert.deepEqual(eventsOf(first.lines), ['planned p-1', 'stopped p-2']);
  assert.equal(first.lines[0].plan, rows[0].plan);
  assert.equal(first.lines[1].phase, 'planning');
  assert.equal(first.lines[1].plan, rows[1].plan);
  writeFileSync(join(at.stateDir, `${DAY}.actions.jsonl`), `${JSON.stringify({ at: '2026-10-21T08:06:00.000Z', agent: 'p-2', bucket: 'keep-going' })}\n`);
  const second = await events(at, round, at8(7));
  assert.deepEqual(eventsOf(second.lines), ['no-plan p-2', 'plans-ready']);
  assert.deepEqual(second.lines[1].agents.map(entry => [entry.agent, entry.plan]), [['p-1', 'planned'], ['p-2', 'no-plan']]);
  assert.deepEqual((await events(at, round, at8(8))).lines, []);
});

test('plans-ready comes 15 minutes after the first planning agent opened, and a malformed plan counts as none', async t => {
  const { at, rows } = planning(t);
  writeFileSync(rows[0].plan, '{"willDo": ["half');
  const round = [{ ls: [agent('p-1', 'idle'), agent('p-2', 'running')] }];
  const early = await events(at, round, { watch: { once: true, now: () => Date.parse('2026-10-21T08:14:59Z') } });
  assert.deepEqual(eventsOf(early.lines), ['stopped p-1']);
  const late = await events(at, round, { watch: { once: true, now: () => Date.parse('2026-10-21T08:15:00Z') } });
  assert.deepEqual(eventsOf(late.lines), ['plans-ready']);
  assert.deepEqual(late.lines[0].agents.map(entry => [entry.agent, entry.plan]), [['p-1', 'planning'], ['p-2', 'planning']]);
});

test('inbox add --kind start puts a planning agent on its card with Go and Not today, one item per agent', async t => {
  const { at, rows } = planning(t);
  writeFileSync(rows[0].plan, JSON.stringify(PLAN));
  const { opened: sent, inbox } = fakeInbox();
  const first = await inboxAdd({ ...at, kind: 'start', agent: 'p-1', cwd: '/w/chief', inbox, now: new Date(NOON) });
  assert.equal(first.status, 'added');
  assert.match(first.id, /^[0-9a-f]{32}$/);
  assert.deepEqual([sent[0].id, sent[0].kind, sent[0].title, sent[0].workspace], [first.id, 'start', 'Ads', 'bfcm-brief']);
  assert.deepEqual(Object.entries(sent[0].actions), [['go', 'Inbox answer for Ads (p-1): Go'], ['skip', 'Inbox answer for Ads (p-1): Not today']]);
  assert.deepEqual(JSON.parse(sent[0].body), { state: 'ready', plan: PLAN });
  assert.equal((await inboxAdd({ ...at, kind: 'start', agent: 'Ads', inbox })).id, first.id, 'a second add replaces it');
  await inboxAdd({ ...at, kind: 'start', agent: 'TikTok Shop', inbox });
  assert.deepEqual(JSON.parse(sent[2].body), { state: 'planning' });
  assert.equal(sent[2].header, 'Inbox answer for TikTok Shop (p-2):');
  writeFileSync(join(at.stateDir, `${DAY}.watch.json`), JSON.stringify({ agents: { 'p-2': { plan: 'no-plan' } }, gone: [] }));
  await inboxAdd({ ...at, kind: 'start', agent: 'p-2', inbox });
  assert.deepEqual(JSON.parse(sent[3].body), { state: 'no-plan' });
  const items = JSON.parse(readFileSync(join(at.stateDir, `${DAY}.inbox.json`), 'utf8'));
  assert.deepEqual(items.map(item => [item.agent, item.kind, item.title]), [['p-1', 'start', 'Ads'], ['p-2', 'start', 'TikTok Shop']]);
  assert.equal((await inboxAdd({ ...at, kind: 'start', agent: 'nobody', inbox })).reason, 'planning');
  assert.equal((await inboxAdd({ ...at, kind: 'start', agent: 'p-1', inbox: fakeInbox(false).inbox })).status, 'unavailable');
});

test('start relays Go with the note and answers, or Not today with a closed workspace and a reminder', async t => {
  const { at, rows } = planning(t);
  writeFileSync(rows[0].plan, JSON.stringify(PLAN));
  const { closed, inbox } = fakeInbox();
  const goItem = await inboxAdd({ ...at, kind: 'start', agent: 'p-1', inbox });
  const skipItem = await inboxAdd({ ...at, kind: 'start', agent: 'p-2', inbox });
  const words = join(at.stateDir, 'answer.txt');
  writeFileSync(words, 'Note: Keep it short\n\nWhich offer leads the ads?\nGift card\n');
  const { calls, call } = fakePaseo([{ ls: [agent('p-1', 'idle'), agent('p-2', 'idle')] }]);
  const { calls: saved, memory } = fakeMemory([]);
  const sends = () => calls.filter(args => args[0] === 'send');
  const go = await start({ ...at, agent: 'Ads', choice: 'go', file: words, call, inbox, memory, now: new Date(NOON) });
  assert.equal(go.status, 'started');
  assert.deepEqual(sends()[0].slice(0, 2), ['send', 'p-1']);
  assert.equal(readFileSync(sends()[0][3], 'utf8'), 'Go. Work from your plan.\n\nNote: Keep it short\n\nWhich offer leads the ads?\nGift card');
  const log = readFileSync(join(at.stateDir, `${DAY}.actions.jsonl`), 'utf8').trim().split('\n').map(line => JSON.parse(line));
  assert.deepEqual([log[0].bucket, log[0].label], ['person', 'Started: Ads']);
  assert.equal(opened(at).find(row => row.agentId === 'p-1').phase, 'working');
  assert.equal((await start({ ...at, agent: 'p-1', choice: 'go', call, inbox, memory })).reason, 'planning', 'a started agent starts once');
  const skip = await start({ ...at, agent: 'p-2', choice: 'skip', call, inbox, memory });
  assert.equal(skip.status, 'skipped');
  assert.equal(readFileSync(sends()[1][3], 'utf8'), 'Not today; stop here.');
  assert.deepEqual(calls.at(-1), ['workspace', 'archive', 'ws-tt']);
  assert.equal(skip.reminder.state, 'saved');
  assert.equal(saved[0].input.facts[0].body, 'Reminder for 2026-10-22: TikTok Shop');
  assert.equal(opened(at).find(row => row.agentId === 'p-2').phase, 'skipped');
  assert.deepEqual(closed, [goItem.id, skipItem.id]);
  assert.deepEqual(JSON.parse(readFileSync(join(at.stateDir, `${DAY}.inbox.json`), 'utf8')), []);
  assert.equal((await start({ ...at, env: {}, agent: 'p-1', choice: 'go', call, inbox, memory })).status, 'unsupported');
});

test('a choice for a running agent is held, the watch prints held at its next stop, and start then delivers it', async t => {
  const { at, rows } = planning(t);
  writeFileSync(rows[0].plan, JSON.stringify(PLAN));
  const { closed, inbox } = fakeInbox();
  const card = await inboxAdd({ ...at, kind: 'start', agent: 'p-1', inbox });
  const words = join(at.stateDir, 'answer.txt');
  writeFileSync(words, 'Note: Keep it short');
  const { memory } = fakeMemory([]);
  const busy = fakePaseo([{ ls: [agent('p-1', 'running'), agent('p-2', 'running')] }]);
  const held = await start({ ...at, agent: 'p-1', choice: 'go', file: words, call: busy.call, inbox, memory });
  assert.deepEqual([held.status, held.choice], ['held', 'go']);
  assert.ok(!busy.calls.some(args => args[0] === 'send'));
  assert.deepEqual(closed, [card.id], 'the answered card leaves the inbox');
  assert.deepEqual([opened(at)[0].phase, opened(at)[0].held], ['planning', 'go']);
  assert.equal((await inboxAdd({ ...at, kind: 'start', agent: 'p-1', inbox })).reason, 'chosen', 'a card with a choice is never added again');
  const round = { ls: [agent('p-1', 'idle'), agent('p-2', 'running')] };
  const early = { watch: { once: true, now: () => Date.parse('2026-10-21T08:05:00Z') } };
  const stop = await events(at, [round], early);
  assert.deepEqual(stop.lines.map(line => `${line.event} ${line.agent} ${line.choice}`), ['held p-1 go'], 'a held row is never planned or plans-ready');
  assert.deepEqual((await events(at, [round], early)).lines, []);
  const idle = fakePaseo([round]);
  assert.equal((await start({ ...at, agent: 'p-1', call: idle.call, inbox, memory })).status, 'started');
  assert.equal(readFileSync(idle.calls.find(args => args[0] === 'send')[3], 'utf8'), 'Go. Work from your plan.\n\nNote: Keep it short');
  assert.deepEqual([opened(at)[0].phase, opened(at)[0].held], ['working', undefined]);
  assert.equal((await start({ ...at, agent: 'p-2', call: idle.call, inbox, memory })).reason, 'choice', 'no choice held, none given');
});

test("the watch writes each agent's status only when it changes, cut to one line, and keeps a done card a day", async t => {
  const at = chief(t, [{ ...ROWS[0], folder: 'email-folder' }, ROWS[1]]);
  const { opened: sent, closed, inbox } = fakeInbox();
  const once = { watch: { once: true, inbox } };
  const long = `\nChecked the landing page${'!'.repeat(300)}\nNext I will fix the button.`;
  const round = [{ ls: [agent('a-1', 'running'), agent('b-2', 'running')], last: long }];
  await events(at, round, once);
  assert.deepEqual(sent.map(spec => [spec.kind, spec.title, spec.workspace]), [['agent', 'Email', 'email-folder'], ['agent', 'Research', 'research']]);
  assert.deepEqual(sent[0].actions, {});
  const step = `Checked the landing page${'!'.repeat(176)}`;
  assert.deepEqual(JSON.parse(sent[0].body), { state: 'working', step });
  const file = join(at.stateDir, `${DAY}.status.json`);
  const before = readFileSync(file, 'utf8');
  await events(at, round, once);
  assert.equal(sent.length, 2, 'an unchanged pass writes nothing');
  assert.equal(readFileSync(file, 'utf8'), before);
  writeFileSync(join(at.stateDir, `${DAY}.actions.jsonl`), `${JSON.stringify({ at: NOON, agent: 'a-1', bucket: 'keep-going', label: 'Kept going: Email' })}\n`);
  await events(at, round, once);
  assert.equal(sent.length, 3);
  assert.equal(sent[2].id, sent[0].id);
  assert.deepEqual(JSON.parse(sent[2].body), { state: 'working', step, action: 'Kept going: Email' });
  assert.equal(doneAgent({ ...at, agent: 'Research', proof: ' https://example.com/report ' }).status, 'marked');
  await events(at, [{ ls: [agent('a-1', 'closed'), agent('b-2', 'idle')], last: long }], once);
  assert.deepEqual(JSON.parse(sent.at(-1).body), { state: 'done', proof: 'https://example.com/report' });
  assert.deepEqual(closed, [sent[0].id], 'a gone agent leaves the inbox');
  await events(at, [{ ls: [agent('b-2', 'closed')] }], { watch: { inbox } });
  assert.deepEqual(closed, [sent[0].id], 'a done card outlasts the watch');
  await events({ ...at, day: '2026-10-22' }, [{ ls: [] }], { watch: { inbox } });
  assert.deepEqual(closed, [sent[0].id, sent[1].id], "the next day's watch clears it");
  assert.equal(existsSync(file), false);
  assert.equal(doneAgent({ ...at, agent: 'nobody', proof: 'x' }).reason, 'unwatched');
});

test('a status the inbox missed is tried again next pass, and only an inbox with no sign-in stops the reports', async t => {
  const at = chief(t, ROWS.slice(0, 2));
  const running = { ls: [agent('a-1', 'running'), agent('b-2', 'running')] };
  const rounds = [running, running, running, { ls: [agent('a-1', 'closed'), agent('b-2', 'closed')] }];
  const flaky = fakeInbox();
  let misses = 1;
  const once = flaky.inbox.open;
  const inbox = { ...flaky.inbox, open: async spec => (misses-- > 0 ? null : once(spec)), off: async () => false };
  await events(at, rounds, { watch: { inbox } });
  assert.deepEqual(flaky.opened.map(spec => spec.title), ['Email', 'Research'], 'one miss, then both written on the next pass');
  const signedOut = chief(t, ROWS.slice(0, 2));
  const { opened: tried, inbox: off } = fakeInbox(false);
  await events(signedOut, rounds, { watch: { inbox: { ...off, off: async () => true } } });
  assert.equal(tried.length, 1);
  assert.equal(existsSync(join(signedOut.stateDir, `${DAY}.status.json`)), false);
});

test('start, done-agent and inbox add --kind start check their flags', t => {
  const cwd = repo(t);
  assert.equal(run(cwd, ['start', '--agent', 'a', '--choice', 'later']).status, 2);
  assert.equal(run(cwd, ['done-agent', '--agent', 'a']).status, 2);
  for (const args of [['start', '--agent', 'a'], ['start', '--agent', 'a', '--choice', 'go'], ['done-agent', '--agent', 'a', '--proof', 'p'], ['inbox', 'add', '--kind', 'start', '--agent', 'a'],
    ['open', '--step', 's', '--title', 't', '--brief', 'b', '--plan-first']]) {
    const outside = run(cwd, args);
    assert.equal(outside.status, 0, outside.stderr);
    assert.equal(JSON.parse(outside.stdout).status, 'unsupported');
  }
});

test('mark touches this chat\'s stop report, and without a usable agent id does nothing', async t => {
  const home = tmp(t);
  assert.equal(agentEvents({ HOME: home }), join(home, '.wong-stack', 'agent-events'));
  assert.deepEqual(mark({ env: { HOME: home } }), { status: 'skipped' });
  for (const id of ['../escape', '..', 'a/b', '']) assert.deepEqual(mark({ env: { HOME: home, PASEO_AGENT_ID: id } }), { status: 'skipped' });
  assert.equal(existsSync(agentEvents({ HOME: home })), false);
  const printed = [];
  assert.equal(await main(['mark'], { env: { HOME: home }, print: line => printed.push(line) }), 0);
  assert.equal(existsSync(agentEvents({ HOME: home })), false);
  assert.equal(await main(['mark'], { env: { HOME: home, PASEO_AGENT_ID: 'agent-7' }, print: line => printed.push(line) }), 0);
  assert.deepEqual(printed, []);
  assert.match(readFileSync(join(agentEvents({ HOME: home }), 'agent-7'), 'utf8'), /^\d{4}-\d{2}-\d{2}T/);
});

test('watchStops makes the folder and names the agent behind each report', t => {
  const home = tmp(t), heard = [];
  let handler, closed = false;
  const watcher = (dir, listen) => { assert.equal(dir, agentEvents({ HOME: home })); handler = listen; return { close() { closed = true; } }; };
  const handle = watchStops({ HOME: home }, name => heard.push(name), watcher);
  assert.equal(existsSync(agentEvents({ HOME: home })), true);
  handler('change', 'a-1'); handler('rename', null);
  assert.deepEqual(heard, ['a-1', null]);
  handle.close(); assert.equal(closed, true);
  assert.equal(watchStops({ HOME: home }, () => {}, () => { throw new Error('no watching here'); }), null);
});

// Runs watch over two minutes, firing `report` on the first wait; returns the clock time of each `ls`.
async function stopTimes(t, report) {
  const at = chief(t, ROWS.slice(0, 1));
  let clock = Date.parse('2026-10-21T10:00:00Z'), notice, closed = false, fired = false;
  const start = clock, times = [];
  const { call } = fakePaseo([{ ls: [agent('a-1', 'running')] }, { ls: [agent('a-1', 'idle')] }]);
  const timed = async args => { if (args[0] === 'ls') times.push(clock - start); return call(args); };
  const sleep = async ms => { if (!fired) { fired = true; notice(report); } clock += ms; };
  const stops = listen => { notice = listen; return { close() { closed = true; } }; };
  await watch({ ...at, call: timed, print: () => {}, seconds: 60, hours: 2 / 60, now: () => clock, sleep, stops, inbox: fakeInbox(false).inbox });
  assert.equal(closed, true);
  return times;
}

test('a marked stop is seen within a second, before the next minute; another chat\'s stop waits for the minute', async t => {
  const watched = await stopTimes(t, 'a-1');
  assert.ok(watched[1] - watched[0] <= 1000, `second pass after ${watched[1] - watched[0]} ms`);
  assert.equal(watched[2] - watched[1], 60_000);
  const other = await stopTimes(t, 'z-unwatched');
  assert.equal(other[1] - other[0], 60_000);
});
