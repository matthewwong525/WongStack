// WongStack's default schedules: each one the person lacks is added here; an untouched one follows the shipped list
// and waits paused while check-ins are off; the person's own stays theirs; an install's `off` adds it paused.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { approvedVersion } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { addDefaults } from '../../.agents/skills/schedule/scripts/lib/defaults.mjs';
import { localDay, validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { DEFAULT_SCHEDULES } from '../../.agents/skills/daily/scripts/worker.mjs';
import { defaultsStamp, offFile } from '../../.agents/skills/daily/scripts/daily.mjs';
import { COMPUTER, ORIGIN, fakeApp, folder } from './fixtures/scheduled-work.mjs';

const JO = 'jo@example.test';
const readJsonOr = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const saves = app => app.calls.filter(([method]) => method !== 'GET').length;

/** A checkout with Jo's settings, a fake app, and `defaults` run as a chat or the worker would. */
function install(t, { sweeps } = {}) {
  const root = folder(t), env = { HOME: folder(t) }, stateDir = folder(t), app = fakeApp();
  if (sweeps) writeFileSync(path.join(root, 'jobs.json'), JSON.stringify({ sweeps }));
  const config = validateConfig({ version: 1, person: 'jo', emails: [JO], timezone: 'America/Toronto', sources: { tasks: false, chats: true },
    places: {}, checks: [], ...(sweeps && { sweeps: 'jobs.json' }) });
  const world = { root, primary: root, env, stateDir, company: async () => app, computer: COMPUTER, email: () => JO, settings: () => ({ config }) };
  const call = async (argv, more = {}) => {
    let text = '';
    await main(['defaults', ...argv], { ...world, ...more, out: chunk => { text += chunk; } });
    return JSON.parse(text);
  };
  const lib = (list, more = {}) => addDefaults({ root, primary: root, config, stateDir, client: app, computer: COMPUTER, env, email: () => JO, list, ...more });
  const kept = () => JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8'));
  return { root, env, stateDir, app, call, lib, kept };
}

/** The shipped list with `change` made to the entry `id`, as a later WongStack version ships it. */
function shipped(t, id, change) {
  const file = path.join(folder(t), 'schedules.json'), list = JSON.parse(readFileSync(DEFAULT_SCHEDULES, 'utf8'));
  list.schedules = list.schedules.map(entry => (entry.id === id ? { ...entry, ...change } : entry));
  writeFileSync(file, JSON.stringify(list));
  return file;
}

test('adds the line-up and the wiki tidy, approved here as background runs; a second run saves nothing', async t => {
  const { app, env, stateDir, call } = install(t);
  const first = await call(['--unattended']);
  assert.deepEqual(first.results, [{ key: 'line-up', state: 'add' }, { key: 'wiki-tidy', state: 'add' }]);
  const lineUp = app.schedules.get('line-up'), tidy = app.schedules.get('wiki-tidy');
  assert.deepEqual([lineUp.name, lineUp.kind, lineUp.state, lineUp.timing.cron, lineUp.run.minutes, lineUp.authority.minIntervalMs],
    ['Keep my chats in line', 'background', 'on', '*/5 * * * *', 15, 150_000]);
  assert.match(lineUp.instructions, /Chats with news: \{\{chats\}\}/);
  assert.deepEqual([tidy.timing.cron, tidy.run.place, tidy.run.minutes, tidy.run.check], ['*/30 * * * *', 'copy', 90, '.agents/skills/daily/scripts/wiki-tidy-check.mjs']);
  for (const key of ['line-up', 'wiki-tidy']) assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key }, env), app.schedules.get(key).version, key);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8')).added), ['line-up', 'wiki-tidy']);
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
  // The person sets the line-up to every 10 minutes, and pauses the wiki tidy.
  app.schedules.get('line-up').timing.cron = '*/10 * * * *';
  app.schedules.get('wiki-tidy').state = 'paused';
  const again = shipped(t, 'wiki-tidy', { minutes: 60 });
  assert.deepEqual((await lib(again)).results.map(each => each.state), ['yours', 'yours']);
  assert.deepEqual([app.schedules.get('line-up').timing.cron, app.schedules.get('wiki-tidy').run.minutes], ['*/10 * * * *', 90]);
  // An edit of the instructions is the person's too; an ended default is never added back, and is forgotten here.
  app.schedules.get('wiki-tidy').state = 'on';
  app.schedules.get('wiki-tidy').version = 'e'.repeat(64);
  app.schedules.get('line-up').ended = { at: 1, reason: 'Not wanted.' };
  const before = saves(app);
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['ended', 'yours']);
  assert.equal(saves(app), before);
  assert.deepEqual(Object.keys(JSON.parse(readFileSync(path.join(stateDir, 'defaults.json'), 'utf8')).added), ['wiki-tidy']);
});

test("an install's off entry adds that default paused, and its own entry with the id replaces it", async t => {
  const { root, app, call } = install(t, { sweeps: [{ id: 'wiki-tidy', off: true }, { id: 'line-up', title: 'Our line-up', every: '15m',
    check: '.agents/skills/daily/scripts/line-up-check.mjs', brief: 'line-up.md' }] });
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'add' }, { key: 'wiki-tidy', state: 'add', paused: true }]);
  assert.deepEqual([app.schedules.get('line-up').name, app.schedules.get('line-up').timing.cron], ['Our line-up', '*/15 * * * *']);
  assert.equal(app.schedules.get('wiki-tidy').state, 'paused');
  assert.equal(app.schedules.get('line-up').run.cwd, root);
});

test('a dry run calls no app; unattended with no sign-in it adds nothing and writes one journal line', async t => {
  const { app, stateDir, call, kept } = install(t);
  const dry = await call(['--dry-run']);
  assert.deepEqual([dry.schedules.map(each => each.key), app.calls], [['line-up', 'wiki-tidy'], []]);
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
  const { stateDir, call, kept } = install(t);
  writeFileSync(path.join(stateDir, 'defaults.json'), JSON.stringify({ tried: 1, failed: { day: '2026-01-01', stamp: 'x', reason: 'old', at: 1 } }));
  await call(['--unattended']);
  assert.deepEqual([kept().day, kept().stamp, kept().tried, kept().failed], [localDay(new Date(), 'America/Toronto'), defaultsStamp(stateDir), undefined, undefined]);
  assert.deepEqual(readLines({ stateDir }), []);
});

test('a run marks done the stamp it started with, not one check-ins changed during it', async t => {
  const { stateDir, app, call, kept } = install(t);
  const http = app.http;
  app.http = async (address, init = {}) => {
    if (address.endsWith('/schedule') && init.method === 'PUT') writeFileSync(offFile(stateDir), 'now\n');
    return http(address, init);
  };
  await call(['--unattended']);
  assert.equal(kept().stamp, defaultsStamp(stateDir, undefined, false), 'the on stamp, so the next chat start applies the off');
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
  refuseSave(app, 'wiki-tidy');
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['add', 'failed']);
  assert.deepEqual([kept().day, kept().failed.reason], [undefined, 'wiki-tidy: invalid']);
  await call(['--unattended']);
  assert.deepEqual(readLines({ stateDir }).map(entry => [entry.kind, entry.line]),
    [['defaults', 'Default schedules not set up: wiki-tidy: invalid. Trying again in an hour.']]);
});

test('a chat run with a default the app refuses marks no day either, so the daily tries again', async t => {
  const { app, stateDir, call, kept } = install(t);
  refuseSave(app, 'wiki-tidy');
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

const states = app => ['line-up', 'wiki-tidy'].map(key => app.schedules.get(key).state);
const marks = kept => Object.values(kept().added).map(entry => entry.checkins ?? false);

test('check-ins off pause the untouched defaults once, and check-ins on resume them', async t => {
  const { app, stateDir, call, kept } = install(t);
  await call(['--unattended']);
  writeFileSync(offFile(stateDir), 'now\n');
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'same', checkins: 'paused' }, { key: 'wiki-tidy', state: 'same', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['paused', 'paused'], [true, true], true]);
  const before = saves(app);
  assert.deepEqual((await call(['--unattended'])).results.map(each => each.state), ['same', 'same'], 'paused by check-ins is still untouched');
  assert.equal(saves(app), before);
  rmSync(offFile(stateDir));
  assert.deepEqual((await call(['--unattended'])).results, [{ key: 'line-up', state: 'same', checkins: 'on' }, { key: 'wiki-tidy', state: 'same', checkins: 'on' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['on', 'on'], [false, false], false]);
});

test("check-ins never pause or resume the person's own default, and a resume while off stays on", async t => {
  const { app, call, lib, kept } = install(t);
  await call([]);
  app.schedules.get('wiki-tidy').state = 'paused';
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'same', checkins: 'paused' }, { key: 'wiki-tidy', state: 'yours' }]);
  // Jo resumes the line-up while check-ins are still off.
  app.schedules.get('line-up').state = 'on';
  const before = saves(app);
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'yours']);
  assert.deepEqual([saves(app), states(app), marks(kept)], [before, ['on', 'paused'], [false, false]]);
  assert.deepEqual((await lib(undefined, { off: false })).results.map(each => each.state), ['same', 'yours']);
  assert.deepEqual([saves(app), states(app)], [before, ['on', 'paused']]);
  // An edited or ended default is the person's too.
  app.schedules.get('wiki-tidy').state = 'on';
  app.schedules.get('wiki-tidy').timing.cron = '*/45 * * * *';
  app.schedules.get('line-up').ended = { at: 1, reason: 'Not wanted.' };
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['ended', 'yours']);
  assert.deepEqual([saves(app), app.schedules.get('wiki-tidy').state], [before, 'on']);
  assert.deepEqual((await lib(undefined, { off: false })).results.map(each => each.state), ['ended', 'yours']);
  assert.deepEqual([saves(app), app.schedules.get('wiki-tidy').state, app.schedules.get('wiki-tidy').timing.cron], [before, 'on', '*/45 * * * *']);
});

test('a default added while check-ins are off is added paused, and an update while off keeps it paused', async t => {
  const { app, env, lib, kept } = install(t);
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'add', checkins: 'paused' }, { key: 'wiki-tidy', state: 'add', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept)], [['paused', 'paused'], [true, true]]);
  for (const key of ['line-up', 'wiki-tidy']) assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key }, env), app.schedules.get(key).version, key);
  const later = shipped(t, 'line-up', { minutes: 20 });
  assert.deepEqual((await lib(later, { off: true })).results.map(each => each.state), ['update', 'same']);
  assert.deepEqual([app.schedules.get('line-up').run.minutes, states(app), marks(kept)], [20, ['paused', 'paused'], [true, true]]);
  assert.deepEqual((await lib(later)).results.map(each => each.checkins), ['on', 'on']);
  assert.deepEqual(states(app), ['on', 'on']);
});

test("an install's off entry stays paused when check-ins go on", async t => {
  const { app, lib, kept } = install(t, { sweeps: [{ id: 'wiki-tidy', off: true }] });
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'add', checkins: 'paused' }, { key: 'wiki-tidy', state: 'add', paused: true }]);
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
  const mend = failPause(app, 'wiki-tidy');
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'failed']);
  assert.deepEqual([states(app), kept().off], [['paused', 'on'], false]);
  mend();
  assert.deepEqual((await lib(undefined, { off: true })).results, [{ key: 'line-up', state: 'same' }, { key: 'wiki-tidy', state: 'same', checkins: 'paused' }]);
  assert.deepEqual([states(app), marks(kept), kept().off], [['paused', 'paused'], [true, true], true]);
});

test('a pause that fails right after a default is added or updated is tried again at the next pass', async t => {
  const { app, env, lib, kept } = install(t);
  const only = path.join(folder(t), 'schedules.json'), list = JSON.parse(readFileSync(DEFAULT_SCHEDULES, 'utf8'));
  writeFileSync(only, JSON.stringify({ ...list, schedules: list.schedules.filter(entry => entry.id === 'line-up') }));
  await lib(only, { off: true });
  // The wiki tidy ships while check-ins are already off, and its pause fails.
  let mend = failPause(app, 'wiki-tidy');
  assert.deepEqual((await lib(undefined, { off: true })).results.map(each => each.state), ['same', 'failed']);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'wiki-tidy' }, env), app.schedules.get('wiki-tidy').version);
  mend();
  assert.deepEqual((await lib(undefined, { off: true })).results[1], { key: 'wiki-tidy', state: 'same', checkins: 'paused' });
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
