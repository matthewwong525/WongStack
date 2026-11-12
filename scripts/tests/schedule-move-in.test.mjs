// The move at the update: each routine, team routine, timed job and repo record becomes one approved app schedule,
// with its days, time and lateness; a likely pair waits for the person; a second run moves nothing twice.
import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { main } from '../../.agents/skills/daily/skills/schedule/scripts/schedule.mjs';
import { approvedVersion } from '../../.agents/inbox/lib/approvals.mjs';
import { cadenceOf, checkTiming, duplicates, mainWords, settle, sweepTimings } from '../../.agents/inbox/move-in.mjs';
import { COMPUTER, ORIGIN, fakeApp, folder, writeRecord } from './fixtures/scheduled-work.mjs';

const HOUR = 3600e3, DAY = 24 * HOUR, JO = 'jo@example.test';
const check = (id, title, cadence, more = {}) => ({ id, enabled: true, title, place: 'repo', scope: `The ${title.toLowerCase()} inputs`, result: 'A short note',
  procedure: `.agents/skills/${id}/SKILL.md`, cadence, effects: 'Nothing outside the note', activeFrom: '2026-01-01', start: 'run', missed: 'latest', ...more });

test('a routine runs at the morning time on its days; skip lasts to the day end, latest to the next run', () => {
  const at = { morning: '07:30', timezone: 'America/Toronto' };
  assert.deepEqual(checkTiming(check('a', 'A', { kind: 'daily' }, { missed: 'skip' }), at),
    { mode: 'recurring', cron: '30 7 * * *', timezone: 'America/Toronto', allowedLatenessMs: DAY - 7.5 * HOUR });
  assert.equal(checkTiming(check('a', 'A', { kind: 'daily' }), at).allowedLatenessMs, DAY);
  assert.deepEqual(checkTiming(check('a', 'A', { kind: 'weekly', weekdays: [4, 1] }), at).cron, '30 7 * * 1,4');
  assert.equal(checkTiming(check('a', 'A', { kind: 'weekly', weekdays: [4, 1] }), at).allowedLatenessMs, 4 * DAY);
  assert.equal(checkTiming(check('a', 'A', { kind: 'weekly', weekdays: [5] }), at).allowedLatenessMs, 7 * DAY);
  assert.deepEqual(checkTiming(check('a', 'A', { kind: 'monthly' }), at), { mode: 'recurring', cron: '30 7 1 * *', timezone: 'America/Toronto', allowedLatenessMs: 28 * DAY });
});

test('a timed job keeps its days, hours and times; one it can not say in cron is reported', () => {
  const every = sweepTimings({ every: '15m', hours: '9-17', days: [5, 1, 2, 3, 4] }, 'UTC').timings[0];
  assert.deepEqual(every.timing, { mode: 'recurring', cron: '*/15 9-16 * * 1,2,3,4,5', timezone: 'UTC', allowedLatenessMs: 15 * 60e3 });
  assert.equal(sweepTimings({ every: '120m' }, 'UTC').timings[0].timing.cron, '0 */2 * * *');
  assert.match(sweepTimings({ every: '7m' }, 'UTC').reason, /no cron/);
  assert.deepEqual(sweepTimings({ at: ['09:00', '13:00'] }, 'UTC').timings.map(each => [each.suffix, each.timing.cron, each.timing.allowedLatenessMs]),
    [['', '0 9,13 * * *', 15 * 60e3]]);
  assert.deepEqual(sweepTimings({ at: ['09:00', '16:30'], days: [1] }, 'UTC').timings.map(each => [each.suffix, each.timing.cron]),
    [['-0900', '0 9 * * 1'], ['-1630', '30 16 * * 1']]);
});

test('Reconcile the books and Monthly books close are flagged as a pair; other names and cadences are not', () => {
  const item = (id, name, cadence, skill = null) => ({ id, def: { key: id.split(':')[1], name }, cadence, skill, source: id.split(':')[0], origin: id });
  assert.deepEqual([...mainWords('Reconcile the books')], ['reconcile', 'books']);
  assert.deepEqual(duplicates([item('check:reconcile', 'Reconcile the books', 'monthly'), item('record:monthly-books-close', 'Monthly books close', 'monthly'),
    item('check:books-week', 'Weekly books', 'weekly'), item('check:plan-day', 'Plan my day', 'daily', 'plan'), item('team:plan-team', 'Team day', 'daily', 'plan')]),
  [['check:reconcile', 'record:monthly-books-close'], ['check:plan-day', 'team:plan-team']]);
  assert.deepEqual(settle([['a', 'b']], {}).open, [['a', 'b']]);
  const kept = settle([['a', 'b']], { keep: ['b'] });
  assert.deepEqual([kept.open, [...kept.dropped]], [[], ['a']]);
  assert.deepEqual([...settle([['a', 'b']], { drop: ['b'] }).dropped], ['b']);
});

test("a month's nth weekday is monthly, and weekly jobs on different days are never a pair", () => {
  const timing = cron => ({ mode: 'recurring', cron, timezone: 'UTC', allowedLatenessMs: 0 });
  assert.equal(cadenceOf(timing('0 9 * * 1#2')), 'monthly');
  const item = (id, name, cron) => ({ id, def: { key: id, name, timing: timing(cron) }, cadence: cadenceOf(timing(cron)), skill: null, source: 'check', origin: id });
  assert.deepEqual(duplicates([item('reconcile', 'Reconcile the books', '0 8 1 * *'), item('close', 'Monthly books close', '0 9 * * 1#2'),
    item('production', "Review production before Bryan's meeting", '0 8 * * 1'), item('recap', 'Recap the week before the Friday meeting', '0 8 * * 5'),
    item('recap-mid', 'Midweek meeting notes', '0 8 * * 3-5')]), [['reconcile', 'close'], ['recap', 'recap-mid']]);
});

/** An install with Jo's routines, a team routine, timed jobs and a Paseo-bound repo record; Jo owns the app, by its
 *  committed owner email, unless `owner` is false. */
function install(t, { owner = true } = {}) {
  const root = folder(t), env = { HOME: folder(t) }, daily = path.join(root, '.agents/daily');
  mkdirSync(path.join(daily, 'briefs'), { recursive: true });
  writeFileSync(path.join(daily, 'briefs', 'inbox.md'), 'Sort the inbox into the board.\n');
  writeFileSync(path.join(daily, 'jobs.json'), JSON.stringify({ sweeps: [
    { id: 'inbox-sweep', title: 'Inbox sweep', every: '15m', hours: '9-17', days: [1, 2, 3, 4, 5], brief: 'inbox.md', check: 'scripts/inbox-check.mjs', place: 'copy', minutes: 20 },
    { id: 'odd', title: 'Odd', every: '7m', brief: 'inbox.md' },
    { id: 'wiki-tidy', off: true }] }));
  const settings = { version: 1, person: 'jo', emails: [JO], timezone: 'America/Toronto', sources: { tasks: false, chats: true }, places: { repo: '.' }, morning: '07:30',
    sweeps: '.agents/daily/jobs.json', checks: [check('plan-day', 'Plan my day', { kind: 'daily' }, { missed: 'skip', thinking: 'high' }),
      check('reconcile-books', 'Reconcile the books', { kind: 'monthly' }), check('weekly-review', 'Weekly review', { kind: 'weekly', weekdays: [1, 4] }, { start: 'offer' })] };
  writeFileSync(path.join(daily, 'jo.json'), JSON.stringify(settings));
  writeFileSync(path.join(daily, 'team.json'), JSON.stringify({ version: 1, checks: [check('team-standup', 'Team standup notes', { kind: 'weekly', weekdays: [1] })] }));
  writeRecord(root, { key: 'monthly-books-close', name: 'Monthly books close', timing: { mode: 'recurring', timezone: 'UTC', cron: '0 9 1 * *', allowedLatenessMs: DAY } });
  writeRecord(root, { key: 'kims-job', owner: 'kim@example.test' });
  mkdirSync(path.join(root, 'app'));
  writeFileSync(path.join(root, 'app', 'wrangler.jsonc'), `{ "vars": { "WONG_OWNER_EMAIL": "${owner ? 'Jo@Example.test' : 'boss@example.test'}" } }\n`);
  const app = fakeApp(), paseo = { calls: [], jobs: new Set(['job-1']) };
  const receipt = (action, id) => ({ version: 1, host: 'paseo', action, nativeId: id, outcome: 'verified', observedAt: 'now', observation: { id } });
  Object.assign(paseo, {
    async inspect(id) { if (!this.jobs.has(id)) throw new Error('gone'); return { id, status: 'paused' }; },
    async pause(id) { this.calls.push(['pause', id, app.schedules.has('monthly-books-close')]); return this.jobs.has(id) ? receipt('pause', id) : { outcome: 'unknown' }; },
    async cancel(id) { this.calls.push(['cancel', id, app.schedules.has('monthly-books-close')]); this.jobs.delete(id); return receipt('cancel', id); },
  });
  const notes = [];
  const call = async (...argv) => {
    let text = '';
    await main(['move-in', ...argv], { root, primary: root, env, company: async () => app, computer: COMPUTER, email: () => JO, hostname: 'jo-laptop', paseo,
      who: () => ({ email: JO, file: path.join(daily, 'jo.json') }), note: line => notes.push(line), out: chunk => { text += chunk; } });
    return JSON.parse(text);
  };
  return { root, env, app, paseo, notes, call, settingsFile: path.join(daily, 'jo.json'), jobsFile: path.join(daily, 'jobs.json'),
    teamFile: path.join(daily, 'team.json') };
}
const puts = app => app.calls.filter(([method, route]) => method === 'PUT' && route === 'schedule').length;

test('a dry run shows every schedule it would make, and each record it can not read, with no app call', async t => {
  const { root, app, call } = install(t);
  writeRecord(root, { key: 'broken', timing: { mode: 'recurring', timezone: 'UTC', cron: '0 9 1 * 1#2', allowedLatenessMs: DAY } });
  const shown = await call('--dry-run');
  assert.equal(shown.ok, true);
  assert.deepEqual(app.calls, []);
  const byId = Object.fromEntries(shown.schedules.map(each => [each.id, each]));
  assert.deepEqual(Object.keys(byId).sort(), ['check:plan-day', 'check:reconcile-books', 'check:weekly-review', 'record:monthly-books-close', 'sweep:inbox-sweep', 'team:team-standup']);
  assert.equal(byId['check:plan-day'].instructions, '/plan-day\nScope: The plan my day inputs\nResult: A short note\nMay change: Nothing outside the note');
  assert.equal(byId['check:plan-day'].run.thinking, 'high', "a kept routine's thinking carries over");
  assert.equal(byId['check:weekly-review'].paused, true);
  assert.deepEqual(byId['sweep:inbox-sweep'].run, { cwd: byId['sweep:inbox-sweep'].run.cwd, check: 'scripts/inbox-check.mjs', minutes: 20, place: 'copy' });
  assert.equal(byId['sweep:inbox-sweep'].kind, 'background');
  assert.equal(byId['sweep:inbox-sweep'].instructions, 'Sort the inbox into the board.');
  assert.deepEqual(shown.refused, [{ id: 'record:schedules/broken.json', reason: 'Leave day-of-month * with an nth-weekday (#) day-of-week.' },
    { id: 'sweep:odd', reason: 'every 7m has no cron' }]);
  assert.deepEqual(shown.duplicates.map(pair => pair.map(each => each.id)), [['check:reconcile-books', 'record:monthly-books-close']]);
});

test('unattended, it moves and approves all but the pair, notes the pair, and a second run moves nothing twice', async t => {
  const { app, env, paseo, notes, call, settingsFile } = install(t);
  const first = await call('--unattended');
  assert.equal(first.ok, true);
  assert.deepEqual(first.results.filter(each => each.state === 'held').map(each => each.id), ['check:reconcile-books', 'record:monthly-books-close']);
  assert.equal(puts(app), 4);
  assert.equal(app.schedules.get('weekly-review').state, 'paused');
  assert.equal(app.schedules.get('plan-day').timing.cron, '30 7 * * *');
  for (const key of ['plan-day', 'weekly-review', 'team-standup', 'inbox-sweep']) {
    assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key }, env), app.schedules.get(key).version, key);
  }
  assert.match(notes[0], /Reconcile the books \/ Monthly books close/);
  assert.ok(JSON.parse(readFileSync(settingsFile, 'utf8')).checks.length === 3, 'unattended leaves the files alone');
  assert.ok(!app.schedules.has('kims-job'), "another person's record never moves");

  const calls = app.calls.length, second = await call('--unattended');
  assert.equal(puts(app), 4);
  assert.ok(second.results.filter(each => each.state !== 'held').every(each => each.state === 'same'));
  assert.ok(app.calls.slice(calls).every(([method]) => method === 'GET'), 'nothing is saved or approved twice');
  assert.deepEqual(paseo.calls, []);
});

test('interactive, a kept pair half moves, Paseo is paused before and deleted after, and moved entries leave the checkout', async t => {
  const { root, app, paseo, call, settingsFile, jobsFile, teamFile } = install(t);
  const first = await call();
  assert.match(first.next, /--keep <id> or --drop <id>/);
  assert.deepEqual(JSON.parse(readFileSync(settingsFile, 'utf8')).checks.map(each => each.id), ['reconcile-books']);
  assert.deepEqual(JSON.parse(readFileSync(jobsFile, 'utf8')).sweeps.map(each => each.id), ['odd', 'wiki-tidy']);
  // The owner's move clears the team file, so no teammate's computer tries the move each day.
  assert.deepEqual([first.removed.team, JSON.parse(readFileSync(teamFile, 'utf8')).checks, first.teamFileLeft], [['team-standup'], [], undefined]);

  const second = await call('--keep', 'record:monthly-books-close');
  const mine = second.results;
  assert.deepEqual(mine.map(each => [each.id, each.state]), [['check:reconcile-books', 'dropped'], ['record:monthly-books-close', 'moved']]);
  assert.deepEqual(paseo.calls, [['pause', 'job-1', false], ['cancel', 'job-1', true]]);
  assert.equal(mine[1].paseo, 'deleted');
  assert.equal(existsSync(path.join(root, 'schedules/monthly-books-close.json')), false);
  assert.deepEqual(JSON.parse(readFileSync(settingsFile, 'utf8')).checks, []);
  assert.equal(app.schedules.get('monthly-books-close').timing.cron, '0 9 1 * *');
  assert.deepEqual((await call()).results, [], 'a third run moves nothing again');
});

test("a teammate's move leaves the team file for the owner", async t => {
  const { call, teamFile } = install(t, { owner: false });
  const moved = await call('--keep', 'record:monthly-books-close');
  assert.equal(moved.teamFileLeft, teamFile);
  assert.deepEqual([moved.removed.team, JSON.parse(readFileSync(teamFile, 'utf8')).checks.map(each => each.id)], [[], ['team-standup']]);
});

test('a routine whose pause failed on the first move is paused on the next, before its OK', async t => {
  const { app, env, call } = install(t);
  const inner = app.http;
  let lose = true;
  app.http = async (address, init) => {
    if (lose && address.endsWith('/pause')) { lose = false; throw new Error('lost'); }
    return inner(address, init);
  };
  const first = await call('--unattended');
  assert.equal(first.results.find(each => each.id === 'check:weekly-review').state, 'failed');
  assert.deepEqual([app.schedules.get('weekly-review').state, approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-review' }, env)], ['on', null]);
  await call('--unattended');
  assert.equal(app.schedules.get('weekly-review').state, 'paused');
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-review' }, env), app.schedules.get('weekly-review').version);
});

test("run from a worktree, a routine's place is the main checkout's", async t => {
  const { root, app, env } = install(t);
  const worktree = path.join(folder(t), 'worktrees', 'frosty');
  cpSync(path.join(root, '.agents'), path.join(worktree, '.agents'), { recursive: true });
  let text = '';
  await main(['move-in', '--dry-run'], { root: worktree, primary: root, env, company: async () => app, computer: COMPUTER, email: () => JO,
    who: () => ({ email: JO, file: path.join(worktree, '.agents/daily/jo.json') }), out: chunk => { text += chunk; } });
  const shown = JSON.parse(text);
  assert.equal(shown.schedules.find(each => each.id === 'check:plan-day').run.cwd, root);
  assert.ok(!shown.refused.some(each => each.id.startsWith('check:')), shown.refused);
});

test('a routine that starts on a later date moves paused, and the move says to resume it then', async t => {
  const { app, notes, call, settingsFile } = install(t);
  const settings = JSON.parse(readFileSync(settingsFile, 'utf8'));
  settings.checks[0].activeFrom = '2099-03-02';
  writeFileSync(settingsFile, JSON.stringify(settings));
  assert.deepEqual((await call('--dry-run')).schedules.filter(each => each.resumeOn).map(each => [each.id, each.paused, each.resumeOn]),
    [['check:plan-day', true, '2099-03-02']]);
  const moved = (await call('--unattended')).results.find(each => each.id === 'check:plan-day');
  assert.deepEqual([moved.state, moved.resumeOn, app.schedules.get('plan-day').state], ['moved', '2099-03-02', 'paused']);
  assert.ok(notes.includes('Plan my day moved paused: resume it on 2099-03-02, when it starts.'), notes);
});

test("a record's local progress goes to the app with it, as a first copy", async t => {
  const { root, env, app, call } = install(t);
  const kept = path.join(env.HOME, 'books-progress.json');
  writeFileSync(kept, JSON.stringify({ closed: ['2026-10'] }));
  writeRecord(root, { key: 'monthly-books-close', name: 'Monthly books close', timing: { mode: 'recurring', timezone: 'UTC', cron: '0 9 1 * *', allowedLatenessMs: DAY } },
    { progress: { type: 'local', reference: kept } });
  const moved = (await call('--keep', 'record:monthly-books-close')).results.find(each => each.id === 'record:monthly-books-close');
  assert.equal(moved.progress, 'copied');
  const held = await app.http('/apps/inbox/api/schedule-progress?key=monthly-books-close', { method: 'GET' });
  assert.deepEqual(held.value.progress, { closed: ['2026-10'] });
});

test("a record owned by another email in the person's settings file is theirs to move; another person's is not", async t => {
  const { root, call, settingsFile } = install(t);
  writeFileSync(settingsFile, JSON.stringify({ ...JSON.parse(readFileSync(settingsFile, 'utf8')), emails: [JO, 'jo@work.test'] }));
  writeRecord(root, { key: 'work-digest', owner: 'Jo@Work.test' });
  const ids = (await call('--dry-run')).schedules.map(each => each.id);
  assert.ok(ids.includes('record:work-digest'));
  assert.ok(!ids.includes('record:kims-job'));
});
