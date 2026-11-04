import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readOutput, runAddons, runNode } from '../../.agents/skills/daily/scripts/addons.mjs';
import { BoardError, boardCalls, boardClient } from '../../.agents/skills/daily/scripts/board.mjs';
import { SettingsError, defaultSettings, loadSettings, mondayOf, morningOf, occurrence, placePath, settingsFor, slotOf, validateConfig, validateTeam }
  from '../../.agents/skills/daily/scripts/config.mjs';
import { beat } from '../../.agents/skills/daily/scripts/chief.mjs';
import { checkinsOff, commandSettings, commands, dueTasks, ensure, firstMessage, holds, offFile, personSettings, readArgs, start,
  startReport, startServe, startTask, startedRecord, stateDirectory, stateOf, taskMessage, who, workerHome } from '../../.agents/skills/daily/scripts/daily.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { codeStamp } from '../../.agents/skills/daily/scripts/worker.mjs';

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

test('the morning time is 8:00 unless the settings name another "HH:MM"; another shape is refused', () => {
  assert.equal(morningOf(validateConfig(settings())), '08:00');
  assert.equal(morningOf(validateConfig(settings({ morning: '10:30' }))), '10:30');
  assert.equal(morningOf(defaultSettings({ email: 'alex@example.com', timezone: ZONE })), '08:00');
  for (const bad of ['8:00', '24:00', '07:60', '07:30 ', 800, ['08:00'], null]) {
    assert.throws(() => validateConfig(settings({ morning: bad })), error => error instanceof SettingsError && error.message.includes('morning'), String(bad));
  }
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

test('a job list beside the one settings file is no settings file: who still finds the person by email', () => {
  const root = repo({ config: settings({ sweeps: '.agents/daily/sweeps.json' }) });
  writeFileSync(join(root, '.agents/daily/sweeps.json'), JSON.stringify({ events: {}, sweeps: [] }));
  const me = who({ repo: root, ctx: { author: 'alex@example.com' }, origin: null });
  assert.equal(me.file, join(root, '.agents/daily/alex.json'));
  assert.equal(me.person, 'alex');
});

test("a teammate with no file is never the only file's person: check-ins, the off switch and the worker use their own defaults", () => {
  const root = repo();
  const mate = personSettings({ repo: root, ctx: { author: 'jo@example.com' }, origin: null });
  assert.deepEqual([mate.me.file, mate.me.person, mate.config.person], [null, null, 'jo']);
  const signed = personSettings({ repo: root, ctx: { author: 'jo@example.com' }, origin: 'https://app.example.com',
    signedIn: () => ({ state: 'valid', email: 'ALEX@example.com' }) });
  assert.equal(signed.me.file, join(root, '.agents/daily/alex.json'), 'the sign-in email finds the file');
  assert.throws(() => commandSettings('start', mate), /No daily settings for jo@example\.com/);
});

test('a settings file with a misspelled person still fails on its bad field, not as no settings', () => {
  const root = repo({ config: { version: 1, Person: 'alex', emails: ['x@example.com'] } });
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
  const first = await start({ config, project: root, stateDir, now: NOW, launch });
  assert.deepEqual(first.tasks, [{ title: 'Review', state: 'started', workspace: 'Review' }]);
  assert.deepEqual(opened, [{ destination: root, title: 'Review', message: '/review' }]);
  const again = await start({ config, project: root, stateDir, now: NOW, launch });
  assert.deepEqual(again.tasks, [{ title: 'Review', state: 'already', workspace: 'Review' }]);
  assert.equal(startedRecord(stateDir).read()['review:2026-10-21'].cwd, '/w/calm-cat', 'the record keeps the folder to find the chat by');
  assert.equal(opened.length, 1);
  const report = startReport({ config, stateDir, now: NOW });
  assert.equal(report.morning, 'done');
  assert.deepEqual(report.tasks.map(row => [row.key, row.state]), [['review:2026-10-21', 'started']]);
  const failing = { ...config, checks: [routine({ id: 'gone', procedure: '.agents/skills/none/SKILL.md' })] };
  assert.equal((await start({ config: failing, project: root, stateDir, now: NOW, launch })).tasks[0].state, 'failed');
  const refused = await start({ config: { ...config, checks: [routine({ id: 'late' })] }, project: root, stateDir, now: NOW,
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

test('readArgs takes each command with its flags, chief-service as serve, and refuses the rest', () => {
  assert.deepEqual(readArgs(['todo', 'link', '--agent', 'a', '--url', 'https://x']).command, 'todo link');
  assert.equal(readArgs(['chief-service']).command, 'serve');
  assert.deepEqual(readArgs(['serve', '--seconds', '30']).values.seconds, 30);
  assert.equal(readArgs(['serve', '--dry-run']).values['dry-run'], true);
  assert.equal(readArgs(['serve', '--agent', 'codex']).values.agent, 'codex');
  assert.equal(readArgs(['ensure']).command, 'ensure');
  assert.deepEqual(['off', 'on'].map(word => readArgs(['checkins', word]).command), ['checkins off', 'checkins on']);
  assert.equal(readArgs(['journal', '--new']).values.new, true);
  assert.deepEqual([readArgs(['journal', '--line', 'x', '--run', 'y']).values.line, readArgs(['journal', '--line', 'x', '--run', 'y']).values.run], ['x', 'y']);
  for (const bad of [['nope'], ['start', '--agent', 'a'], ['hand'], ['watch'], ['serve', '--hours', '3'], ['ensure', '--agent', 'gpt'], ['checkins'],
    ['checkins', 'maybe'], ['allow', '--agent', 'a', '--request', 'r', '--bucket', 'pick', '--label', 'x'],
    ['hand', '--agent', 'a', '--source', 'asked'], ['open-daily'], ['picture'], ['close', '--agent', 'a'], ['journal', '--hook'], ['journal', '--agent', 'a'], ['reply', '--agent', 'a', '--file', 'f', '--bucket', 'maybe', '--label', 'x']]) {
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

// ---------------------------------------------------------------------------
// Check-ins for everyone

test('default settings take the email before the @ as the person, check-ins only, in the given time zone', () => {
  const made = defaultSettings({ email: 'Jo.Lee+work@Example.com', timezone: ZONE });
  assert.deepEqual(made, { version: 1, person: 'jo-lee-work', emails: ['Jo.Lee+work@Example.com'], timezone: ZONE, sources: { tasks: false, chats: true },
    places: {}, checks: [], teamFile: null });
  assert.equal(defaultSettings({ email: 'team@example.com' }).person, 'team-member');
  assert.equal(defaultSettings({ email: '...@example.com' }).person, 'me');
  assert.equal(typeof defaultSettings({ email: 'a@b.co' }).timezone, 'string');
});

test("person settings: the file wins; else the sign-in email while it is good, else the git email; the routines' commands keep the error", () => {
  const root = repo();
  const found = personSettings({ repo: root, ctx: { author: 'alex@example.com' }, origin: null });
  assert.equal(found.config.person, 'alex');
  const empty = temp('empty');
  const signed = personSettings({ repo: empty, ctx: { author: 'git@example.com' }, origin: 'https://app.example.com',
    signedIn: () => ({ state: 'near', email: 'Sam.Lee@example.com', days: 3 }) });
  assert.deepEqual([signed.me.file, signed.config.person, signed.config.emails], [null, 'sam-lee', ['Sam.Lee@example.com']]);
  const expired = personSettings({ repo: empty, ctx: { author: 'git@example.com' }, origin: 'https://app.example.com',
    signedIn: () => ({ state: 'expired', email: 'sam@example.com' }) });
  assert.equal(expired.config.person, 'git');
  const nobody = personSettings({ repo: empty, ctx: { author: '' }, origin: null });
  assert.equal(nobody.config, null);
  for (const command of ['start', 'start-task', 'remind']) assert.throws(() => commandSettings(command, signed), /No daily settings for Sam\.Lee@example\.com/);
  assert.equal(commandSettings('journal', signed).person, 'sam-lee');
  assert.equal(commandSettings('start', found).person, 'alex');
  assert.throws(() => commandSettings('journal', nobody), SettingsError);
});

/** A git checkout and a private state root for `ensure` and the off switch. */
function checkout() {
  const root = realpathSync(temp('checkout')), states = temp('states');
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  return { root, states };
}

test('ensure starts the worker only when the person has a job, none runs, check-ins are on, and this is no background run', () => {
  const { root, states } = checkout();
  const spawned = [];
  const go = (config, more = {}) => ensure({ repo: root, root: states, env: {}, agent: 'codex', resolve: () => ({ config }), isAlive: () => false,
    spawnServe: args => spawned.push(args), ...more }).state;
  const jobs = validateConfig(settings());
  const plain = defaultSettings({ email: 'alex@example.com', timezone: ZONE });
  assert.equal(go(jobs, { env: { WONG_STOP_CHECK: '1' } }), 'run');
  assert.equal(go(jobs, { env: { WONG_MEMORY_RUN: '1' } }), 'run');
  assert.equal(go(null), 'no-person');
  // The default list's wiki tidy is a job, so the defaults start it until the person turns it off.
  const own = sweeps => { writeFileSync(join(root, 'jobs.json'), JSON.stringify({ sweeps })); return { ...plain, sweeps: 'jobs.json' }; };
  assert.equal(go(own([{ id: 'wiki-tidy', off: true }])), 'no-jobs');
  // A routine is a job: the worker starts the morning.
  assert.equal(go({ ...own([{ id: 'wiki-tidy', off: true }]), checks: [routine()] }), 'started');
  assert.equal(go(own([{ id: 'wrap-up', off: true }])), 'started');
  assert.equal(go(plain), 'started');
  assert.equal(go(jobs), 'started');
  assert.deepEqual(spawned.map(each => [each.repo, each.agent]), [[root, 'codex'], [root, 'codex'], [root, 'codex'], [root, 'codex']]);
  const stateDir = stateOf(jobs, root, states);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'serve.lock'), '4242\n');
  assert.equal(go(jobs, { isAlive: pid => pid === 4242 }), 'running');
  assert.equal(go(jobs), 'started', 'a dead pid holds nothing');
  beat({ stateDir, seconds: 60, code: codeStamp() });
  assert.equal(go(jobs), 'running');
  writeFileSync(offFile(stateDir), 'x');
  assert.equal(go(jobs), 'off');
  assert.equal(spawned.length, 5);
});

test("ensure restarts a worker whose beat holds older code or none, and leaves a current one alone", () => {
  const { root, states } = checkout();
  const config = validateConfig(settings());
  const stateDir = stateOf(config, root, states);
  mkdirSync(stateDir, { recursive: true });
  const live = new Set(), killed = [], spawned = [];
  const worker = (pid, beatPid, code) => {
    live.add(pid);
    writeFileSync(join(stateDir, 'serve.lock'), `${pid}\n`);
    writeFileSync(join(stateDir, 'serve.json'), JSON.stringify({ pid: beatPid, at: new Date().toISOString(), seconds: 60, ...(code && { code }) }));
  };
  const go = () => ensure({ repo: root, root: states, env: {}, resolve: () => ({ config }), isAlive: pid => live.has(pid),
    kill: pid => { killed.push(pid); live.delete(pid); }, spawnServe: args => spawned.push(args) }).state;
  worker(4242, 4242);
  assert.equal(go(), 'restarted', 'a beat from before the stamp');
  worker(4343, 4343, codeStamp());
  assert.equal(go(), 'running');
  worker(4444, 4444, 'older-code');
  assert.equal(go(), 'restarted');
  // A new worker that has not beaten yet runs the current code.
  worker(4545, 4444, 'older-code');
  assert.equal(go(), 'running');
  assert.deepEqual([killed, spawned.length], [[4242, 4444], 2]);
  assert.deepEqual(readLines({ stateDir }).map(entry => entry.line), ['Restarted the worker: its code changed.', 'Restarted the worker: its code changed.']);
});

/** A main checkout with its own daily scripts, and a linked copy of it whose scripts differ, as on a branch. */
function twoCopies() {
  const primary = realpathSync(temp('primary')), states = temp('states');
  const git = (...args) => assert.equal(spawnSync('git', args, { cwd: primary }).status, 0, args.join(' '));
  git('init', '-q');
  git('-c', 'user.email=a@example.com', '-c', 'user.name=A', 'commit', '-q', '--allow-empty', '-m', 'start');
  const copy = join(realpathSync(temp('copies')), 'copy');
  git('worktree', 'add', '-q', copy);
  const scripts = root => { const dir = join(root, '.agents/skills/daily/scripts'); mkdirSync(dir, { recursive: true }); return dir; };
  const main = scripts(primary);
  writeFileSync(join(main, 'daily.mjs'), '// main\n');
  writeFileSync(join(main, 'worker.mjs'), 'export function codeStamp() {}\n');
  writeFileSync(join(scripts(copy), 'daily.mjs'), '// a branch edit\n');
  return { primary, copy, main, states };
}

test("the worker belongs to the main checkout: a copy's own scripts restart nothing, and a change on main restarts it there", () => {
  const { primary, copy, main, states } = twoCopies();
  assert.deepEqual(workerHome(copy), { repo: primary, script: join(main, 'daily.mjs'), dir: main });
  assert.notEqual(codeStamp(join(copy, '.agents/skills/daily/scripts')), codeStamp(main));
  const config = validateConfig(settings());
  const stateDir = stateOf(config, copy, states);
  mkdirSync(stateDir, { recursive: true });
  const live = new Set([4242]), killed = [], spawned = [];
  writeFileSync(join(stateDir, 'serve.lock'), '4242\n');
  writeFileSync(join(stateDir, 'serve.json'), JSON.stringify({ pid: 4242, at: new Date().toISOString(), seconds: 60, code: codeStamp(main) }));
  const go = () => ensure({ repo: copy, root: states, env: {}, resolve: () => ({ config }), isAlive: pid => live.has(pid),
    kill: pid => { killed.push(pid); live.delete(pid); }, spawnServe: args => spawned.push(args) }).state;
  assert.equal(go(), 'running');
  writeFileSync(join(main, 'daily.mjs'), '// main, after an update\n');
  writeFileSync(join(stateDir, 'serve.json'), JSON.stringify({ pid: 4242, at: new Date().toISOString(), seconds: 60 }));
  writeFileSync(join(main, 'worker.mjs'), '// a worker from before the stamp\n');
  assert.equal(go(), 'running', "a main checkout whose worker writes no stamp is never restarted onto the same old code");
  writeFileSync(join(main, 'worker.mjs'), 'export function codeStamp() {}\n');
  assert.equal(go(), 'restarted');
  assert.deepEqual([killed, spawned.map(each => [each.repo, each.script])], [[4242], [[primary, join(main, 'daily.mjs')]]]);
});

test("the worker starts from the main checkout's script and folder; a main checkout with no daily scripts falls back to this copy's", () => {
  const { primary, main } = twoCopies();
  const runs = [];
  const run = (...args) => { runs.push(args); return { on: () => {}, unref: () => {} }; };
  startServe({ repo: primary, script: join(main, 'daily.mjs'), env: { PASEO_AGENT_ID: 'chat-1', PATH: '/bin' }, agent: 'codex', run });
  const [[node, args, options]] = runs;
  assert.deepEqual([node, args, options.cwd, options.detached, options.env], [process.execPath, [join(main, 'daily.mjs'), 'serve', '--agent', 'codex'],
    primary, true, { PATH: '/bin' }]);
  const { root } = checkout();
  assert.deepEqual(workerHome(root, '/elsewhere/daily.mjs'), { repo: root, script: '/elsewhere/daily.mjs', dir: '/elsewhere' });
});

test("each pass re-reads the settings from the main checkout, not from the copy that started the worker", async () => {
  const root = realpathSync(repo({ config: settings({ morning: '00:00' }) }));
  assert.equal(spawnSync('git', ['init', '-q', root]).status, 0);
  assert.equal(spawnSync('git', ['config', 'user.email', 'alex@example.com'], { cwd: root }).status, 0);
  const printed = [];
  // The worker's start-time settings are the defaults: only the main checkout's file names the routine.
  await commands({ config: defaultSettings({ email: 'alex@example.com', timezone: ZONE }), project: root, stateDir: temp('state'),
    values: { 'dry-run': true, seconds: 60 }, call: async args => (args[0] === 'ls' || args[0] === 'permit' ? [] : { ok: true }),
    board: fakeBoard().board, env: {}, print: text => printed.push(JSON.parse(text)) }).serve();
  assert.deepEqual(printed.filter(item => item.wouldStart), [{ wouldStart: 'routine', title: 'Review' }]);
});

test('checkins off writes the off file, stops the running worker and journals it; on removes it and runs ensure', async () => {
  const { root, states } = checkout();
  const config = validateConfig(settings());
  const stateDir = stateOf(config, root, states);
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'serve.lock'), '4242\n');
  const killed = [];
  assert.deepEqual(checkinsOff({ stateDir, timezone: ZONE, isAlive: () => true, kill: pid => killed.push(pid) }), { state: 'off', stopped: 4242 });
  assert.deepEqual(killed, [4242]);
  rmSync(join(stateDir, 'serve.lock'));
  assert.ok(existsSync(offFile(stateDir)));
  assert.equal(ensure({ repo: root, root: states, env: {}, resolve: () => ({ config }), spawnServe: () => assert.fail('started while off') }).state, 'off');
  const run = command => commands({ config, project: root, stateDir, values: {}, call: async () => [], board: fakeBoard().board, env: {},
    keep: () => ({ state: 'started' }) })[command]();
  assert.deepEqual(await run('checkins on'), { state: 'on', worker: 'started' });
  assert.ok(!existsSync(offFile(stateDir)));
  assert.equal((await run('checkins off')).state, 'off');
  assert.deepEqual(readLines({ stateDir }).map(entry => entry.kind), ['checkins', 'checkins', 'checkins']);
});
