// WongStack's default schedules: each one the person lacks is added and approved here; an untouched one follows the
// shipped list; one the person changed, paused or ended stays theirs; an install's `off` adds it paused.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { approvedVersion } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { addDefaults } from '../../.agents/skills/schedule/scripts/lib/defaults.mjs';
import { validateConfig } from '../../.agents/skills/daily/scripts/config.mjs';
import { readLines } from '../../.agents/skills/daily/scripts/journal.mjs';
import { DEFAULT_SCHEDULES } from '../../.agents/skills/daily/scripts/worker.mjs';
import { COMPUTER, ORIGIN, fakeApp, folder } from './fixtures/scheduled-work.mjs';

const JO = 'jo@example.test';
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
  const lib = list => addDefaults({ root, primary: root, config, stateDir, client: app, computer: COMPUTER, env, email: () => JO, list });
  return { root, env, stateDir, app, call, lib };
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
  const { app, stateDir, call } = install(t);
  const dry = await call(['--dry-run']);
  assert.deepEqual([dry.schedules.map(each => each.key), app.calls], [['line-up', 'wiki-tidy'], []]);
  assert.deepEqual(await call(['--unattended'], { email: () => null }), { ok: true, skipped: 'no_sign_in' });
  assert.deepEqual(app.calls, []);
  assert.deepEqual(readLines({ stateDir }).map(entry => entry.line), ['Default schedules wait: sign in to the company app (`D who` gives the link).']);
  assert.equal((await call([], { email: () => null })).ok, false, 'asked in a chat, the missing sign-in is an error');
});
