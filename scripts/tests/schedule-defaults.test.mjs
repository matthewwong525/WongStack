// Default schedules: a missing one is added; an untouched one follows the shipped list, paused while check-ins are off;
// the person's own stays; an install's `off` adds it paused; a retired one ends. A test-only second default is beside.
import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { approvedVersion } from '../../.agents/inbox/lib/approvals.mjs';
import { addDefaults, sweepTimings } from '../../.agents/inbox/lib/defaults.mjs';
import { localDay, validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { DEFAULT_SCHEDULES } from '../../.agents/skills/daily/scripts/worker.mjs';
import { defaultsStamp, offFile } from '../../.agents/skills/daily/scripts/daily.mjs';
import { COMPUTER, ORIGIN, fakeApp, folder } from './fixtures/scheduled-work.mjs';

const JO = 'jo@example.test';
const readJsonOr = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const saves = app => app.calls.filter(([method]) => method !== 'GET').length;

/** The shipped list plus a test-only second default, `tidy-up`, and `change` made to the entry `id`. */
function shipped(t, id, change) {
  const file = path.join(folder(t), 'schedules.json'), list = JSON.parse(readFileSync(DEFAULT_SCHEDULES, 'utf8'));
  list.schedules = [...list.schedules, { id: 'tidy-up', title: 'Tidy up', every: '30m', check: '.agents/skills/daily/scripts/line-up-check.mjs',
    brief: 'line-up.md', place: 'copy', minutes: 90 }].map(entry => (entry.id === id ? { ...entry, ...change } : entry));
  writeFileSync(file, JSON.stringify(list));
  return file;
}

/** A checkout with Jo's settings, a fake app, and `defaults` run as a chat or the worker would, on two defaults. */
function install(t, { sweeps } = {}) {
  const root = folder(t), env = { HOME: folder(t) }, stateDir = folder(t), app = fakeApp(), list = shipped(t);
  if (sweeps) writeFileSync(path.join(root, 'jobs.json'), JSON.stringify({ sweeps }));
  const config = validateConfig({ version: 1, person: 'jo', emails: [JO], timezone: 'America/Toronto', sources: { tasks: false, chats: true },
    places: {}, checks: [], ...(sweeps && { sweeps: 'jobs.json' }) });
  const world = { root, primary: root, env, stateDir, list, company: async () => app, computer: COMPUTER, email: () => JO, settings: () => ({ config }) };
  const call = async (argv, more = {}) => {
    let text = '';
    await main(['defaults', ...argv], { ...world, ...more, out: chunk => { text += chunk; } });
    return JSON.parse(text);
  };
  const lib = (other = list, more = {}) => addDefaults({ root, primary: root, config, stateDir, client: app, computer: COMPUTER, env, email: () => JO, list: other, ...more });
  const kept = () => JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8'));
  return { root, env, stateDir, app, list, call, lib, kept };
}

test('adds the line-up and a second default, approved here as background runs; a second run saves nothing', async t => {
  const { app, env, stateDir, call } = install(t);
  const first = await call(['--unattended']);
  assert.deepEqual(first.results, [{ key: 'line-up', state: 'add' }, { key: 'tidy-up', state: 'add' }]);
  const lineUp = app.schedules.get('line-up'), tidy = app.schedules.get('tidy-up');
  assert.deepEqual([lineUp.name, lineUp.kind, lineUp.state, lineUp.timing.cron, lineUp.run.minutes, lineUp.authority.minIntervalMs],
    ['Keep my chats in line', 'background', 'on', '*/5 * * * *', 15, 150_000]);
  assert.match(lineUp.instructions, /Chats with news: \{\{chats\}\}/);
  assert.deepEqual([tidy.timing.cron, tidy.run.place, tidy.run.minutes, tidy.run.check], ['*/30 * * * *', 'copy', 90, '.agents/skills/daily/scripts/line-up-check.mjs']);
  for (const key of ['line-up', 'tidy-up']) assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key }, env), app.schedules.get(key).version, key);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8')).added), ['line-up', 'tidy-up']);
  const before = saves(app), second = await call(['--unattended']);
  assert.deepEqual(second.results.map(each => each.state), ['same', 'same']);
  assert.equal(saves(app), before);
});

test('an untouched default takes the new shipped version; one the person changed, paused or ended stays theirs', async t => {
  const { app, env, stateDir, call, lib } = install(t);
  await call([]);
  const later = shipped(t, 'line-up', { minutes: 20 });
  assert.deepEqual((await lib(later)).results.map(each => each.state), ['update', 'same']);
  assert.equal(app.schedules.get('line-up').run.minutes, 20);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'line-up' }, env), app.schedules.get('line-up').version);
  // The person sets the line-up to every 10 minutes, and pauses the tidy-up.
  app.schedules.get('line-up').timing.cron = '*/10 * * * *';
  app.schedules.get('tidy-up').state = 'paused';
  const again = shipped(t, 'tidy-up', { minutes: 60 });
  assert.deepEqual((await lib(again)).results.map(each => each.state), ['yours', 'yours']);
  assert.deepEqual([app.schedules.get('line-up').timing.cron, app.schedules.get('tidy-up').run.minutes], ['*/10 * * * *', 90]);
  // An edit of the instructions is the person's too; an ended default is never added back, and is forgotten here.
  app.schedules.get('tidy-up').state = 'on';
  app.schedules.get('tidy-up').version = 'e'.repeat(64);
  app.schedules.get('line-up').ended = { at: 1, reason: 'Not wanted.' };
  const before = saves(app);
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['ended', 'yours']);
  assert.equal(saves(app), before);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8')).added), ['tidy-up']);
});

test("an install's off entry adds that default paused, and its own entry with the id replaces it", async t => {
  const { root, app, call } = install(t, { sweeps: [{ id: 'tidy-up', off: true }, { id: 'line-up', title: 'Our line-up', every: '15m',
    check: '.agents/skills/daily/scripts/line-up-check.mjs', brief: 'line-up.md' }] });
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'add' }, { key: 'tidy-up', state: 'add', paused: true }]);
  assert.deepEqual([app.schedules.get('line-up').name, app.schedules.get('line-up').timing.cron], ['Our line-up', '*/15 * * * *']);
  assert.equal(app.schedules.get('tidy-up').state, 'paused');
  assert.equal(app.schedules.get('line-up').run.cwd, root);
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

test("an install's own brief is read; an entry with no cron or no brief is reported, not added", async t => {
  const { root, call } = install(t, { sweeps: [{ id: 'line-up', title: 'Our line-up', every: '15m', hours: '9-17', days: [1, 2, 3, 4, 5], brief: 'ours.md' },
    { id: 'tidy-up', every: '7m', brief: 'line-up.md' }] });
  const brief = path.join(root, '.agents/daily/briefs/ours.md');
  mkdirSync(path.dirname(brief), { recursive: true });
  writeFileSync(brief, 'Sort the inbox into the board.\n');
  const [ours, odd] = (await call(['--dry-run'])).schedules;
  assert.deepEqual([ours.instructions, ours.timing.cron, ours.kind], ['Sort the inbox into the board.', '*/15 9-16 * * 1,2,3,4,5', 'background']);
  assert.deepEqual(odd, { id: 'sweep:tidy-up', reason: 'every 7m has no cron' });
  rmSync(brief);
  assert.deepEqual((await call(['--dry-run'])).schedules[0], { id: 'sweep:line-up', reason: 'no brief ours.md' });
});

test('a dry run calls no app; unattended with no sign-in it adds nothing and writes one journal line', async t => {
  const { app, stateDir, call, kept } = install(t);
  const dry = await call(['--dry-run']);
  assert.deepEqual([dry.schedules.map(each => each.key), app.calls], [['line-up', 'tidy-up'], []]);
  assert.deepEqual(await call(['--unattended'], { email: () => null }), { ok: true, skipped: 'no_sign_in' });
  assert.deepEqual(app.calls, []);
  assert.deepEqual(await call(['--unattended'], { email: () => null }), { ok: true, skipped: 'no_sign_in' });
  assert.deepEqual(readLines({ stateDir }).map(entry => entry.line), ['Default schedules wait: sign in to the company app (`D who` gives the link).'],
    'one line a day for the same reason');
  assert.equal(kept().failed.reason, 'no_sign_in');
  assert.equal(kept().day, undefined);
  assert.equal((await call([], { email: () => null })).ok, false, 'asked in a chat, the missing sign-in is an error');
});

test('a run that sets up every default marks today and the current stamp done, and forgets the try and the last failure', async t => {
  const { stateDir, list, call, kept } = install(t);
  writeFileSync(path.join(stateDir, 'defaults.json'), JSON.stringify({ tried: 1, failed: { day: '2026-01-01', stamp: 'x', reason: 'old', at: 1 } }));
  await call(['--unattended']);
  assert.deepEqual([kept().day, kept().stamp, kept().tried, kept().failed], [localDay(new Date(), 'America/Toronto'), defaultsStamp(stateDir, list), undefined, undefined]);
  assert.deepEqual(readLines({ stateDir }), []);
});

test('a run marks done the stamp it started with, not one check-ins changed during it', async t => {
  const { stateDir, app, list, call, kept } = install(t);
  const http = app.http;
  app.http = async (address, init = {}) => {
    if (address.endsWith('/schedule') && init.method === 'PUT') writeFileSync(offFile(stateDir), 'now\n');
    return http(address, init);
  };
  await call(['--unattended']);
  assert.equal(kept().stamp, defaultsStamp(stateDir, list, false), 'the on stamp, so the next chat start applies the off');
});

/** Makes the app refuse the save of `key`. */
function refuseSave(app, key) {
  const http = app.http;
  app.http = async (address, init = {}) => {
    if (address.endsWith('/schedule') && init.method === 'PUT' && JSON.parse(init.body).key === key) return { value: { error: { code: 'invalid' } }, status: 400 };
    return http(address, init);
  };
}

test('an unattended run with a default the app refuses marks no day, and journals the key and reason once a day', async t => {
  const { app, stateDir, call, kept } = install(t);
  refuseSave(app, 'tidy-up');
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['add', 'failed']);
  assert.deepEqual([kept().day, kept().failed.reason], [undefined, 'tidy-up: invalid']);
  await call(['--unattended']);
  assert.deepEqual(readLines({ stateDir }).map(entry => [entry.kind, entry.line]),
    [['defaults', 'Default schedules not set up: tidy-up: invalid. Trying again in an hour.']]);
});

test('a chat run with a default the app refuses marks no day either, so the daily tries again', async t => {
  const { app, stateDir, call, kept } = install(t);
  refuseSave(app, 'tidy-up');
  assert.deepEqual((await call([])).results.map(each => each.state), ['add', 'failed']);
  assert.deepEqual([kept().day, kept().stamp, kept().failed], [undefined, undefined, undefined]);
  assert.deepEqual(readLines({ stateDir }), [], 'a chat shows the failure; it journals nothing');
});

test('a throw while reading the defaults is journaled unattended; asked in a chat it is an error and marks nothing', async t => {
  const { stateDir, call, kept } = install(t);
  const list = path.join(folder(t), 'schedules.json');
  writeFileSync(list, '{broken');
  const unattended = await call(['--unattended'], { list });
  assert.equal(unattended.ok, true);
  assert.match(unattended.failed, /JSON/);
  assert.deepEqual([kept().day, kept().failed.reason], [undefined, unattended.failed]);
  assert.equal(readLines({ stateDir }).length, 1);
  rmSync(path.join(stateDir, 'defaults.json'));
  assert.equal((await call([], { list })).ok, false);
  assert.equal(readJsonOr(path.join(stateDir, 'defaults.json')), null, 'a chat sees the error; no failure is kept');
});

const states = app => ['line-up', 'tidy-up'].map(key => app.schedules.get(key).state);
const marks = kept => Object.values(kept().added).map(entry => entry.checkins ?? false);

test('check-ins off pause the untouched defaults once, and check-ins on resume them', async t => {
  const { app, stateDir, call, kept } = install(t);
  await call(['--unattended']);
  writeFileSync(offFile(stateDir), 'now\n');
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'same', checkins: 'paused' }, { key: 'tidy-up', state: 'same', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['paused', 'paused'], [true, true], true]);
  const before = saves(app);
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['same', 'same'], 'paused by check-ins is still untouched');
  assert.equal(saves(app), before);
  rmSync(offFile(stateDir));
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'same', checkins: 'on' }, { key: 'tidy-up', state: 'same', checkins: 'on' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['on', 'on'], [false, false], false]);
});

test("check-ins never pause or resume the person's own default, and a resume while off stays on", async t => {
  const { app, call, lib, kept } = install(t);
  await call([]);
  app.schedules.get('tidy-up').state = 'paused';
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'same', checkins: 'paused' }, { key: 'tidy-up', state: 'yours' }]);
  // Jo resumes the line-up while check-ins are still off.
  app.schedules.get('line-up').state = 'on';
  const before = saves(app);
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'yours']);
  assert.deepEqual([saves(app), states(app), marks(kept)], [before, ['on', 'paused'], [false, false]]);
  assert.deepEqual((await lib(undefined, { off: false })).results.map(each => each.state), ['same', 'yours']);
  assert.deepEqual([saves(app), states(app)], [before, ['on', 'paused']]);
  // An edited or ended default is the person's too.
  app.schedules.get('tidy-up').state = 'on';
  app.schedules.get('tidy-up').timing.cron = '*/45 * * * *';
  app.schedules.get('line-up').ended = { at: 1, reason: 'Not wanted.' };
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['ended', 'yours']);
  assert.deepEqual([saves(app), app.schedules.get('tidy-up').state], [before, 'on']);
  assert.deepEqual((await lib(undefined, { off: false })).results.map(each => each.state), ['ended', 'yours']);
  assert.deepEqual([saves(app), app.schedules.get('tidy-up').state, app.schedules.get('tidy-up').timing.cron], [before, 'on', '*/45 * * * *']);
});

test('a default added while check-ins are off is added paused, and an update while off keeps it paused', async t => {
  const { app, env, lib, kept } = install(t);
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'add', checkins: 'paused' }, { key: 'tidy-up', state: 'add', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept)], [['paused', 'paused'], [true, true]]);
  for (const key of ['line-up', 'tidy-up']) assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key }, env), app.schedules.get(key).version, key);
  const later = shipped(t, 'line-up', { minutes: 20 });
  assert.deepEqual((await lib(later, { off: true })).results.map(each => each.state), ['update', 'same']);
  assert.deepEqual([app.schedules.get('line-up').run.minutes, states(app), marks(kept)], [20, ['paused', 'paused'], [true, true]]);
  assert.deepEqual((await lib(later)).results.map(each => each.checkins), ['on', 'on']);
  assert.deepEqual(states(app), ['on', 'on']);
});

test("an install's off entry stays paused when check-ins go on", async t => {
  const { app, lib, kept } = install(t, { sweeps: [{ id: 'tidy-up', off: true }] });
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'add', checkins: 'paused' }, { key: 'tidy-up', state: 'add', paused: true }]);
  assert.deepEqual(marks(kept), [true, false]);
  await lib();
  assert.deepEqual(states(app), ['on', 'paused']);
});

/** Makes the app's pause fail for `key` until the returned function is called. */
function failPause(app, key) {
  const http = app.http;
  app.http = async (address, init = {}) => {
    if (address.endsWith('/pause') && JSON.parse(init.body).key === key) throw new Error('network');
    return http(address, init);
  };
  return () => { app.http = http; };
}

test('a pause that fails at the off flip keeps check-ins on in defaults.json, and the next pass pauses it', async t => {
  const { app, call, lib, kept } = install(t);
  await call([]);
  const mend = failPause(app, 'tidy-up');
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'failed']);
  assert.deepEqual([states(app), kept().off], [['paused', 'on'], false]);
  mend();
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'same' }, { key: 'tidy-up', state: 'same', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['paused', 'paused'], [true, true], true]);
});

test('a pause that fails right after a default is added or updated is tried again at the next pass', async t => {
  const { app, env, list: two, lib, kept } = install(t);
  const only = path.join(folder(t), 'schedules.json'), list = JSON.parse(readFileSync(two, 'utf8'));
  writeFileSync(only, JSON.stringify({ ...list, schedules: list.schedules.filter(entry => entry.id === 'line-up') }));
  await lib(only, { off: true });
  // The tidy-up ships while check-ins are already off, and its pause fails.
  let mend = failPause(app, 'tidy-up');
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'failed']);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'tidy-up' }, env), app.schedules.get('tidy-up').version);
  mend();
  assert.deepEqual((await lib(undefined, { off: true })).results[1], { key: 'tidy-up', state: 'same', checkins: 'paused' });
  assert.deepEqual([states(app), marks(kept)], [['paused', 'paused'], [true, true]]);
  // Check-ins go on; then an update arrives at the next off flip, and its pause fails.
  await lib();
  const later = shipped(t, 'line-up', { minutes: 20 });
  mend = failPause(app, 'line-up');
  assert.deepEqual((await lib(later, { off: true })).results.map(each => each.state), ['failed', 'same']);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'line-up' }, env), app.schedules.get('line-up').version);
  assert.deepEqual([app.schedules.get('line-up').run.minutes, states(app), kept().off], [20, ['on', 'paused'], false]);
  mend();
  assert.deepEqual((await lib(later, { off: true })).results[0], { key: 'line-up', state: 'same', checkins: 'paused' });
  assert.deepEqual([states(app), marks(kept), kept().off], [['paused', 'paused'], [true, true], true]);
});

test('the shipped list retires the wiki tidy: it is no default, and a chat start never adds it', async t => {
  const list = JSON.parse(readFileSync(DEFAULT_SCHEDULES, 'utf8'));
  assert.deepEqual(list.schedules.map(entry => entry.id), ['line-up']);
  assert.deepEqual(list.retired.map(entry => entry.id), ['wiki-tidy']);
  const { app, call } = install(t);
  await call(['--unattended'], { list: DEFAULT_SCHEDULES });
  assert.deepEqual([...app.schedules.keys()], ['line-up']);
});

test('a retired default ends at the update, paused and changed or not, with one journal line, and never comes back', async t => {
  const { app, stateDir, list, call, kept } = install(t);
  const old = path.join(folder(t), 'schedules.json'), shippedList = JSON.parse(readFileSync(list, 'utf8'));
  writeFileSync(old, JSON.stringify({ ...shippedList, retired: [], schedules: [...shippedList.schedules,
    { id: 'wiki-tidy', title: 'Wiki tidy', every: '30m', brief: 'line-up.md', place: 'copy', minutes: 90 }] }));
  await call(['--unattended'], { list: old });
  // Jo pauses the wiki tidy and gives it her own text.
  Object.assign(app.schedules.get('wiki-tidy'), { state: 'paused', instructions: 'My own tidy.', version: 'e'.repeat(64) });
  const first = await call(['--unattended']);
  assert.deepEqual(first.results.at(-1), { key: 'wiki-tidy', state: 'retired' });
  const tidy = app.schedules.get('wiki-tidy');
  assert.match(tidy.ended.reason, /retired this default: Memory now tidies itself/);
  assert.equal(Object.hasOwn(kept().added, 'wiki-tidy'), false);
  const ended = () => readLines({ stateDir }).filter(entry => entry.line.startsWith('Default schedule ended'));
  assert.deepEqual(ended().map(entry => [entry.kind, entry.line]),
    [['defaults', 'Default schedule ended: Wiki tidy. Memory now tidies itself at your first chat of each day.']]);
  const before = saves(app), second = await call(['--unattended']);
  assert.ok(second.results.every(each => each.key !== 'wiki-tidy'), 'an ended one is only forgotten');
  assert.equal(saves(app), before, 'a second run adds and ends nothing');
  assert.equal(ended().length, 1);
  assert.ok(app.schedules.get('wiki-tidy').ended);
});
