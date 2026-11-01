import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readOutput, runAddons, runNode } from '../../.agents/skills/daily/scripts/addons.mjs';
import { BoardError, boardCalls, boardClient } from '../../.agents/skills/daily/scripts/board.mjs';
import { SettingsError, loadSettings, mondayOf, occurrence, placePath, settingsFor, slotOf, validateConfig, validateTeam }
  from '../../.agents/skills/daily/scripts/config.mjs';
import { commands, dueTasks, firstMessage, holds, openDaily, picture, readArgs, start, startReport, startTask, startedRecord, stateDirectory, taskMessage, who }
  from '../../.agents/skills/daily/scripts/daily.mjs';

const SKILL = fileURLToPath(new URL('../../.agents/skills/daily/', import.meta.url));
const EXAMPLE = JSON.parse(readFileSync(join(SKILL, 'references/example.json'), 'utf8'));
const ZONE = 'America/New_York';
// 10:00 on Wednesday 2026-10-21 in New York.
const NOW = new Date('2026-10-21T14:00:00Z');
const roots = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
const temp = name => { const dir = mkdtempSync(join(tmpdir(), `daily-${name}-`)); roots.push(dir); return dir; };

const routine = (more = {}) => ({ id: 'review', enabled: true, title: 'Review', place: 'home', scope: 'Last week', result: 'A list', procedure: '.agents/skills/review/SKILL.md',
  cadence: { kind: 'daily' }, effects: 'Reads only', activeFrom: '2026-10-01', start: 'run', missed: 'skip', ...more });
const settings = (more = {}) => ({ version: 1, person: 'alex', emails: ['Alex@Example.com'], timezone: ZONE, sources: { tasks: true, chats: true },
  places: { home: '.' }, checks: [routine()], ...more });

/** A repo with the review skill, the person's settings and, when given, a team file. */
function repo({ config = settings(), team } = {}) {
  const root = temp('repo');
  mkdirSync(join(root, '.agents/skills/review'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/review/SKILL.md'), '# Review\n');
  mkdirSync(join(root, '.agents/daily'), { recursive: true });
  writeFileSync(join(root, '.agents/daily/alex.json'), JSON.stringify(config));
  if (team) writeFileSync(join(root, '.agents/daily/team.json'), JSON.stringify(team));
  return root;
}

/** A fake board: tasks by week; `down` makes each call throw; `calls` keeps each call. */
function fakeBoard(tasks = []) {
  const box = { tasks, calls: [], down: false };
  const go = (name, act) => async body => { box.calls.push([name, body]); if (box.down) throw new BoardError('unavailable: no app'); return act(body); };
  box.board = {
    tasks: go('tasks', week => ({ week, tasks: box.tasks.filter(task => task.week === week || (task.slot === 'backlog' && week === '2026-10-19')) })),
    add: go('add', body => ({ id: 'new', ...body, created: true })),
    status: go('status', body => body), link: go('link', body => body), place: go('place', body => body), remove: go('remove', body => body),
    origin: async () => 'https://app.example.com',
  };
  return box;
}

test('the example settings are valid, and each bad field is refused by name', () => {
  assert.equal(validateConfig(structuredClone(EXAMPLE)).person, 'alex');
  assert.equal(validateConfig(settings({ sweeps: '.agents/daily/jobs.json', runs: { agent: 'codex' } })).runs.agent, 'codex');
  for (const [bad, field] of [[{ version: 2 }, 'version'], [{ person: 'team' }, 'person'], [{ emails: [] }, 'emails'], [{ timezone: 'Mars/Base' }, 'timezone'],
    [{ guide: '../out.md' }, 'guide'], [{ sources: { tasks: 'yes' } }, 'sources'], [{ places: { home: '/etc' } }, 'places'],
    [{ addons: { morning: ['/bin/x'] } }, 'addons'], [{ checks: [routine({ place: 'work' })] }, "place"], [{ extra: 1 }, 'known fields'],
    [{ sweeps: '../jobs.json' }, 'sweeps'], [{ sweeps: '.agents/daily/jobs.md' }, 'sweeps'], [{ runs: { agent: 'gemini' } }, 'runs'], [{ runs: { model: 'x' } }, 'runs']]) {
    assert.throws(() => validateConfig(settings(bad)), error => error instanceof SettingsError && error.message.includes(field), field);
  }
  for (const bad of [routine({ id: 'Bad Id' }), routine({ cadence: { kind: 'weekly' } }), routine({ start: 'maybe' }), routine({ inputs: { token: 'x' } }),
    routine({ prompt: '-x' }), routine({ title: '' })]) {
    assert.throws(() => validateConfig(settings({ checks: [bad] })), SettingsError);
  }
  assert.throws(() => validateConfig(settings({ checks: [routine(), routine()] })), SettingsError);
  assert.throws(() => validateTeam({ version: 1, checks: [], person: 'x' }), SettingsError);
});

test('the settings file is found by any email in any case; the team routines join, and a person routine with their id wins', () => {
  const root = repo({ team: { version: 1, checks: [routine({ title: 'Team review' }), routine({ id: 'standup', title: 'Standup' })] } });
  assert.equal(settingsFor(root, 'alex@example.com'), join(root, '.agents/daily/alex.json'));
  assert.equal(settingsFor(root, 'nobody@example.com'), null);
  assert.equal(settingsFor(root, null), null);
  const loaded = loadSettings(join(root, '.agents/daily/alex.json'), root);
  assert.deepEqual(loaded.checks.map(check => [check.id, check.title, check.team ?? false]), [['standup', 'Standup', true], ['review', 'Review', false]]);
  assert.equal(loaded.teamFile, join(root, '.agents/daily/team.json'));
  writeFileSync(join(root, '.agents/daily/team.json'), '{');
  assert.throws(() => loadSettings(join(root, '.agents/daily/alex.json'), root), /not JSON/);
  assert.match(placePath({ places: { home: '.', notes: '~/notes' } }, 'notes', root), /\/notes$/);
  assert.throws(() => placePath({ places: {} }, 'x', root), /No place x/);
});

test('a routine is due by its cadence; a missed weekly or monthly one runs late only with latest', () => {
  const weekly = routine({ cadence: { kind: 'weekly', weekdays: [1] } });
  assert.equal(occurrence(weekly, '2026-10-19'), '2026-10-19');
  assert.equal(occurrence(weekly, '2026-10-21'), null);
  assert.equal(occurrence({ ...weekly, missed: 'latest' }, '2026-10-21'), '2026-10-19');
  const monthly = routine({ cadence: { kind: 'monthly' } });
  assert.equal(occurrence(monthly, '2026-11-01'), '2026-11-01');
  assert.equal(occurrence(monthly, '2026-11-03'), null);
  assert.equal(occurrence({ ...monthly, missed: 'latest' }, '2026-11-03'), '2026-11-01');
  assert.equal(occurrence(routine({ cadence: { kind: 'manual' } }), '2026-10-21'), null);
  assert.equal(occurrence(routine(), '2026-09-01'), null, 'before activeFrom');
  assert.deepEqual([mondayOf('2026-10-25'), slotOf('2026-10-25'), slotOf('2026-10-21')], ['2026-10-19', 'sun', 'wed']);
});

test('who names the settings, the team file and the guide; with no app it uses the git email', () => {
  const root = repo({ config: settings({ guide: '.agents/daily/alex.md' }) });
  const me = who({ repo: root, ctx: { author: 'alex@example.com' }, origin: null });
  assert.deepEqual(me, { source: 'git', state: 'valid', email: 'alex@example.com', origin: null, days: null, login: null,
    file: join(root, '.agents/daily/alex.json'), person: 'alex', team: null, guide: '.agents/daily/alex.md' });
  writeFileSync(join(root, '.agents/daily/sam.json'), JSON.stringify(settings({ person: 'sam', emails: ['sam@example.com'] })));
  const signed = who({ repo: root, ctx: { author: '' }, origin: 'https://app.example.com', signedIn: () => ({ state: 'expired', email: 'sam@example.com' }) });
  assert.equal(signed.person, 'sam');
  assert.match(signed.login, /login|sign/i);
  assert.equal(who({ repo: root, ctx: { author: 'x@example.com' }, origin: null }).file, null);
  writeFileSync(join(root, '.agents/daily/sam.json'), '{"version":1}');
  assert.match(who({ repo: root, ctx: {}, origin: null, config: join(root, '.agents/daily/sam.json') }).error, /Invalid daily settings/);
});

test('a job list beside the one settings file is no settings file: who still takes the only one', () => {
  const root = repo({ config: settings({ sweeps: '.agents/daily/sweeps.json' }) });
  writeFileSync(join(root, '.agents/daily/sweeps.json'), JSON.stringify({ events: {}, sweeps: [] }));
  const me = who({ repo: root, ctx: { author: 'x@example.com' }, origin: null });
  assert.equal(me.file, join(root, '.agents/daily/alex.json'));
  assert.equal(me.person, 'alex');
});

test('a settings file with a misspelled person still fails on its bad field, not as no settings', () => {
  const root = repo({ config: { version: 1, Person: 'alex' } });
  assert.match(who({ repo: root, ctx: { author: 'x@example.com' }, origin: null }).error, /Invalid daily settings/);
});

test('start opens each due routine once per day, with its first message; a missing skill fails and a dry run opens nothing', async () => {
  const root = repo();
  const stateDir = temp('state');
  const config = loadSettings(join(root, '.agents/daily/alex.json'), root);
  const opened = [];
  const launch = async args => { opened.push(args); return { ok: true, cwd: '/w/calm-cat', workspaceName: 'Review', agentId: 'agent-review' }; };
  assert.deepEqual(dueTasks(config, root, '2026-10-21').map(task => task.key), ['review:2026-10-21']);
  assert.equal(firstMessage({ procedure: '.agents/skills/review/SKILL.md' }), '/review');
  const dry = await start({ config, project: root, stateDir, now: NOW, launch, dryRun: true });
  assert.deepEqual(dry.tasks, [{ title: 'Review', state: 'due', workspace: null, message: '/review' }]);
  const first = await start({ config, project: root, stateDir, now: NOW, launch, env: { PASEO_AGENT_ID: 'agent-daily' } });
  assert.deepEqual(first.tasks, [{ title: 'Review', state: 'started', workspace: 'Review' }]);
  assert.deepEqual(opened, [{ destination: root, title: 'Review', message: '/review' }]);
  const again = await start({ config, project: root, stateDir, now: NOW, launch, env: {} });
  assert.deepEqual(again.tasks, [{ title: 'Review', state: 'already', workspace: 'Review' }]);
  assert.equal(startedRecord(stateDir).read()['review:2026-10-21'].cwd, '/w/calm-cat', 'the record keeps the folder to find the chat by');
  assert.equal(opened.length, 1);
  const report = startReport({ config, stateDir, now: NOW });
  assert.equal(report.morning, 'done');
  assert.deepEqual(report.tasks.map(row => [row.key, row.state]), [['review:2026-10-21', 'started']]);
  assert.equal(JSON.parse(readFileSync(join(stateDir, 'daily-workspace.json'), 'utf8')).agentId, 'agent-daily');
  const failing = { ...config, checks: [routine({ id: 'gone', procedure: '.agents/skills/none/SKILL.md' })] };
  assert.equal((await start({ config: failing, project: root, stateDir, now: NOW, launch, env: {} })).tasks[0].state, 'failed');
  const refused = await start({ config: { ...config, checks: [routine({ id: 'late' })] }, project: root, stateDir, now: NOW, env: {},
    launch: async () => ({ ok: false, error: 'no Paseo' }) });
  assert.deepEqual(refused.tasks, [{ title: 'Review', state: 'failed', workspace: null, reason: 'no Paseo' }]);
  assert.equal(startedRecord(stateDir).read()['late:2026-10-21'], undefined, 'a failed launch keeps no claim');
});

test('the morning add-ons run once per day; their lines and events reach the report with the guide, and a failed one is not-read', async () => {
  const root = repo();
  const stateDir = temp('state');
  const config = { ...loadSettings(join(root, '.agents/daily/alex.json'), root), checks: [], guide: 'g.md', addons: { morning: ['a.mjs', 'b.mjs'] } };
  let runs = 0;
  const addons = async ({ list, context }) => {
    runs++;
    assert.deepEqual([list, context.kind, context.person, context.day], [['a.mjs', 'b.mjs'], 'morning', 'alex', '2026-10-21']);
    return { lines: ['3 orders wait'], events: [{ event: 'email-round', addon: 'a.mjs' }], skip: [], failed: [{ addon: 'b.mjs', error: 'boom' }] };
  };
  const first = await start({ config, project: root, stateDir, now: NOW, addons, env: {} });
  assert.deepEqual([first.lines, first.events, first.notRead, first.guide], [['3 orders wait'], [{ event: 'email-round', addon: 'a.mjs' }],
    [{ source: 'add-on b.mjs', error: 'boom' }], 'g.md']);
  await start({ config, project: root, stateDir, now: NOW, addons, env: {} });
  assert.equal(runs, 1);
  const report = startReport({ config, stateDir, now: NOW });
  assert.deepEqual([report.lines, report.guide, report.tasks], [['3 orders wait'], 'g.md', []]);
  assert.equal(startReport({ config, stateDir, now: new Date('2026-10-22T14:00:00Z') }).morning, 'not run');
});

test('add-ons run as scripts with the context on stdin; bad output or a missing file is one failure', async () => {
  const root = temp('addons');
  writeFileSync(join(root, 'good.mjs'), `let input = ''; process.stdin.on('data', d => { input += d; }).on('end', () => {
    const context = JSON.parse(input);
    console.log(JSON.stringify({ line: 'Hello ' + context.person }));
    console.log(JSON.stringify({ event: { event: 'custom', n: 1 } }));
    console.log(JSON.stringify({ skip: ['agent-1'] }));
  });`);
  writeFileSync(join(root, 'bad.mjs'), "console.log('not json');");
  writeFileSync(join(root, 'crash.mjs'), "console.error('it broke'); process.exit(2);");
  const out = await runAddons({ list: ['good.mjs', 'bad.mjs', 'crash.mjs', 'none.mjs'], repo: root, context: { person: 'alex' } });
  assert.deepEqual([out.lines, out.events, out.skip], [['Hello alex'], [{ event: 'custom', n: 1, addon: 'good.mjs' }], ['agent-1']]);
  assert.deepEqual(out.failed.map(each => [each.addon, each.error.slice(0, 20)]),
    [['bad.mjs', 'printed a line that '], ['crash.mjs', 'it broke'], ['none.mjs', 'no such file']]);
  assert.throws(() => readOutput('{"skip":["../x"]}'), /no line, event or skip/);
  assert.throws(() => readOutput('{"event":{"kind":"x"}}'), /no line, event or skip/);
  await assert.rejects(runNode({ file: join(root, 'crash.mjs'), cwd: root, input: {} }), /it broke/);
});

test('the board calls go to the Inbox routes as the person; with no app each call is unavailable, never an empty week', async () => {
  const seen = [];
  const client = { http: async (path, init) => { seen.push([path, init.method, init.body ?? null]); return path.includes('remove') ? { value: { error: { code: 'not_found' } }, status: 404 } : { value: { tasks: [] }, status: 200 }; },
    target: () => 'https://app.example.com' };
  const board = boardCalls(Promise.resolve(client));
  assert.deepEqual(await board.tasks('2026-10-19'), { tasks: [] });
  await board.add({ importKey: 'daily:x', title: 'X' });
  await assert.rejects(board.remove({ importKey: 'chat:a' }), /404: not_found/);
  for (const name of ['place', 'status', 'link']) await board[name]({ id: 't' });
  assert.deepEqual(seen.map(([path, method]) => [path, method]), [['/apps/inbox/api/daily-tasks?week=2026-10-19', 'GET'], ['/apps/inbox/api/daily-task-add', 'POST'],
    ['/apps/inbox/api/daily-task-remove', 'POST'], ['/apps/inbox/api/daily-task-place', 'POST'], ['/apps/inbox/api/daily-task-status', 'POST'],
    ['/apps/inbox/api/daily-task-link', 'POST']]);
  assert.equal(await board.origin(), 'https://app.example.com');
  const none = boardCalls(Promise.resolve(null));
  await assert.rejects(none.tasks('2026-10-19'), error => error instanceof BoardError && error.message.startsWith('unavailable'));
  assert.equal(await none.origin(), null);
  assert.equal(await boardClient(temp('noapp'), async () => ({ companyClient: () => { throw new Error('no app'); } })), null);
  assert.equal(await boardClient(fileURLToPath(new URL('../../', import.meta.url)), async () => ({ companyClient: () => client })), client);
});

test('picture gives this week, the backlog and late tasks oldest first, and the chats; a source that fails is unavailable, one off is off', async () => {
  const box = fakeBoard([
    { id: 'a', title: 'Today', week: '2026-10-19', slot: 'wed', status: 'open' },
    { id: 'b', title: 'Done one', week: '2026-10-19', slot: 'mon', status: 'done' },
    { id: 'c', title: 'Someday', week: null, slot: 'backlog', status: 'open' },
    { id: 'd', title: 'Late', week: '2026-10-12', slot: 'fri', status: 'in_progress' },
    { id: 'e', title: 'Older', week: '2026-09-28', slot: 'mon', status: 'open' }]);
  const agents = [{ id: 'agent-1', name: 'Fix it', status: 'idle', cwd: '/w/fox' }, { id: 'agent-sub', name: 'Helper', status: 'running', cwd: '/w/fox' },
    { id: 'agent-x', name: 'Elsewhere', status: 'idle', cwd: '/other/x' }, { id: 'agent-d', name: 'Daily', status: 'idle', cwd: '/w/fox' }];
  const workspaces = [{ workspaceId: 'ws-fox', name: 'Fix the login bug', cwd: '/w/fox/' }];
  const call = async ([name, id]) => (name === 'ls' ? agents : name === 'workspace' ? workspaces : { ParentAgentId: id === 'agent-sub' ? 'agent-1' : null });
  const config = validateConfig(settings());
  const read = await picture({ config, project: '/w/main', now: NOW, board: box.board, call, env: { PASEO_AGENT_ID: 'agent-d' }, trees: async () => ['/w/main', '/w/fox'] });
  assert.deepEqual(read.sources, { tasks: 'ok', chats: 'ok' });
  assert.deepEqual(read.dated.map(task => task.id), ['a']);
  assert.deepEqual(read.backlog.map(task => task.id), ['c']);
  assert.deepEqual(read.late.map(task => [task.id, task.day, task.lateDays]), [['e', '2026-09-28', 23], ['d', '2026-10-16', 5]]);
  assert.deepEqual(read.chats, [{ agent: 'agent-1', title: 'Fix it', status: 'idle', workspace: 'Fix the login bug' }]);
  workspaces.length = 0;
  const unnamed = await picture({ config, project: '/w/main', now: NOW, board: box.board, call, env: { PASEO_AGENT_ID: 'agent-d' }, trees: async () => ['/w/main', '/w/fox'] });
  assert.equal(unnamed.chats[0].workspace, 'fox', 'a workspace Paseo does not list keeps its folder name');
  box.down = true;
  const off = await picture({ config: { ...config, sources: { tasks: true, chats: false } }, project: '/w/main', now: NOW, board: box.board, call });
  assert.deepEqual(off.sources, { tasks: 'unavailable', chats: 'off' });
  assert.equal(off.dated, undefined);
});

test('start-task opens a task of today once ever, names its chat and marks it in progress; any other task is refused', async () => {
  const stateDir = temp('state');
  const config = validateConfig(settings());
  const box = fakeBoard([{ id: 'a', title: '-Call the bank', week: '2026-10-19', slot: 'wed', status: 'open' },
    { id: 'b', title: 'Tomorrow', week: '2026-10-19', slot: 'thu', status: 'open' },
    { id: 'c', title: 'Has a chat', week: '2026-10-19', slot: 'wed', status: 'open', chat: 'old-elk' }]);
  const opened = [];
  const launch = async args => { opened.push(args); return { ok: true, cwd: '/w/kind-owl', workspaceName: args.title, agentId: 'agent-t' }; };
  const go = (id, more = {}) => startTask({ config, project: '/w/main', stateDir, id, now: NOW, board: box.board, launch, ...more });
  assert.deepEqual(await go('a', { note: 'use the app' }), { day: '2026-10-21', title: '-Call the bank', state: 'started', workspace: 'Task: -Call the bank' });
  assert.equal(opened[0].title, 'Task: -Call the bank');
  assert.equal(opened[0].message, taskMessage({ title: '-Call the bank', note: 'use the app' }));
  assert.match(opened[0].message, /^Call the bank\nNote: use the app\n/);
  assert.deepEqual(box.calls.filter(([name]) => name !== 'tasks'), [['link', { id: 'a', chat: 'Task: -Call the bank' }], ['status', { id: 'a', status: 'in_progress' }]]);
  assert.equal((await go('a')).state, 'already');
  assert.equal(opened.length, 1);
  assert.equal((await go('b')).state, 'refused');
  assert.deepEqual(await go('c'), { state: 'already', title: 'Has a chat', workspace: 'old-elk' });
  assert.equal(holds({ pending: true, at: new Date(Date.now() - 11 * 60e3).toISOString() }), false, 'an old claim is a failed launch');
});

test('open-daily finds or makes the Daily workspace, archives idle Daily chats and sends /daily one time per day', async () => {
  const stateDir = temp('state');
  const config = validateConfig(settings());
  const calls = [];
  const paseo = { workspaces: [], models: [{ id: 'claude-opus-5-5', defaultThinkingOptionId: 'low' }],
    daily: [{ id: 'old-idle', status: 'idle' }, { id: 'old-busy', status: 'running' }, { id: 'old-asks', status: 'idle' }] };
  const call = async args => {
    calls.push(args.join(' '));
    if (args[0] === 'workspace' && args[1] === 'ls') return paseo.workspaces;
    if (args[0] === 'workspace' && args[1] === 'create') return { workspaceId: 'wks_new' };
    if (args[0] === 'ls') return paseo.daily;
    if (args[0] === 'provider') return paseo.models;
    if (args[0] === 'inspect') return { PendingPermissions: args[1] === 'old-asks' ? [{ id: 'r' }] : [] };
    if (args[0] === 'run') return { agentId: 'agent-daily' };
    return { ok: true };
  };
  assert.deepEqual(await openDaily({ config, project: '/w/main', stateDir, now: NOW, call, dryRun: true }), { dryRun: true, workspace: null, create: true });
  const opened = await openDaily({ config, project: '/w/main', stateDir, now: NOW, call });
  assert.deepEqual(opened, { state: 'opened', day: '2026-10-21', workspace: 'wks_new', created: true, agent: 'agent-daily', archived: ['old-idle'],
    kept: ['old-busy', 'old-asks'] });
  assert.ok(calls.includes('run --workspace wks_new --label daily-chat=1 --title Daily --provider claude --thinking medium --mode bypassPermissions --no-wait /daily'),
    'a model whose default is low gets medium');
  assert.equal((await openDaily({ config, project: '/w/main', stateDir, now: NOW, call })).state, 'already');
  paseo.workspaces = [{ workspaceId: 'wks_found', name: 'Daily', cwd: '/w/main/' }];
  paseo.models = [{ id: 'claude-fable-5-1', defaultThinkingOptionId: 'high' }];
  const next = await openDaily({ config, project: '/w/main', stateDir: temp('state2'), now: NOW, call });
  assert.deepEqual([next.workspace, next.created], ['wks_found', false]);
  assert.equal(calls.at(-1), 'run --workspace wks_found --label daily-chat=1 --title Daily --provider claude --mode bypassPermissions --no-wait /daily',
    'a model whose default is high keeps it');
});

test('readArgs takes each command with its flags, chief-service as serve, and refuses the rest', () => {
  assert.deepEqual(readArgs(['todo', 'link', '--agent', 'a', '--url', 'https://x']).command, 'todo link');
  assert.equal(readArgs(['chief-service']).command, 'serve');
  assert.deepEqual(readArgs(['watch', '--seconds', '30']).values.seconds, 30);
  assert.equal(readArgs(['serve', '--dry-run']).values['dry-run'], true);
  assert.equal(readArgs(['journal', '--new']).values.new, true);
  assert.deepEqual([readArgs(['journal', '--line', 'x', '--run', 'y']).values.line, readArgs(['journal', '--line', 'x', '--run', 'y']).values.run], ['x', 'y']);
  for (const bad of [['nope'], ['start', '--agent', 'a'], ['hand'], ['watch', '--hours', '30'], ['allow', '--agent', 'a', '--request', 'r', '--bucket', 'pick', '--label', 'x'],
    ['hand', '--agent', 'a', '--source', 'stranger'], ['journal', '--agent', 'a'], ['reply', '--agent', 'a', '--file', 'f', '--bucket', 'maybe', '--label', 'x']]) {
    const run = spawnSync(process.execPath, ['-e', `import(${JSON.stringify(join(SKILL, 'scripts/daily.mjs'))}).then(m => m.readArgs(${JSON.stringify(bad)}))`],
      { encoding: 'utf8' });
    assert.notEqual(run.status, 0, bad.join(' '));
  }
});

test('commands wire the settings to the board: remind adds a task on its day, and a past day is refused', async () => {
  const stateDir = temp('state');
  const config = validateConfig(settings());
  const box = fakeBoard();
  const run = (command, values) => commands({ config, project: '/w/main', stateDir, values, call: async () => [], board: box.board, env: {} })[command]();
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: ZONE }).format(new Date());
  const added = await run('remind', { day: today, text: 'Call  the bank' });
  assert.deepEqual([added.state, added.title], ['added', 'Call the bank']);
  assert.match(box.calls[0][1].importKey, /^daily:remind:\d{4}-\d{2}-\d{2}:[0-9a-f]{16}$/);
  assert.equal((await run('remind', { day: '2020-01-01', text: 'x' })).state, 'refused');
  assert.equal((await run('status', {})).status, 'unsupported');
  assert.equal((await run('todo link', { agent: 'a', url: 'https://evil.test/' })).status, 'unsupported');
  assert.equal(stateDirectory('/w/main', 'alex', '/s'), stateDirectory('/w/main/', 'alex', '/s'));
});
