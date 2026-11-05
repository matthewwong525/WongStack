// The schedule CLI: show what will run, save and approve it here, list and manage it, and start a run from the app.
import assert from 'node:assert/strict';
import test from 'node:test';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { main } from '../../.agents/skills/schedule/scripts/schedule.mjs';
import { approve, approvedVersion } from '../../.agents/skills/schedule/scripts/lib/approvals.mjs';
import { COMPUTER, NOW, ORIGIN, fakeApp, folder, plan, runId, writeRecord } from './fixtures/scheduled-work.mjs';

const JO = 'jo@example.test';
function cli(t, app = fakeApp(), extra = {}) {
  const root = folder(t), env = { HOME: folder(t) };
  const call = async (...argv) => {
    let text = '';
    const code = await main(argv, { root, primary: root, env, company: async () => app, computer: COMPUTER, email: () => JO, hostname: 'jo-laptop',
      sleep: async () => {}, out: chunk => { text += chunk; }, ...extra });
    return { code, ...JSON.parse(text) };
  };
  const file = (value, name = 'plan.json') => { const at = path.join(root, name); writeFileSync(at, JSON.stringify(value)); return at; };
  return { app, root, env, call, file };
}

test('show prints the plan and the instructions as a quote; save --approve saves, approves here and reports the computer', async t => {
  const { app, env, call, file, root } = cli(t);
  const shown = await call('show', '--file', file(plan({ instructions: 'Plan the week.\nThen send me the list.' })));
  assert.equal(shown.ok, true);
  assert.match(shown.text, /^> Plan the week\.\n> Then send me the list\.$/m);
  assert.match(shown.text, new RegExp(`Runs: as a new chat, in ${root}`));
  const saved = await call('save', '--file', file(plan({ instructions: 'Plan the week.\nThen send me the list.' })), '--approve', '--version', shown.version);
  assert.equal(saved.ok, true);
  assert.equal(saved.version, shown.version);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), shown.version);
  assert.deepEqual(app.calls.filter(([, route]) => route === 'schedule-approved').map(([, , body]) => body),
    [{ key: 'weekly-plan', computer: COMPUTER, version: shown.version, computerName: 'jo-laptop' }]);
  assert.equal((await call('save', '--file', file(plan({ instructions: 'Other.' })), '--approve', '--version', shown.version)).ok, false, 'a changed file is refused');
});

test('save refuses a worktree folder, and an app that answers another version approves nothing', async t => {
  const { app, env, call, file } = cli(t);
  assert.match((await call('save', '--file', file(plan({ run: { cwd: '/home/jo/.paseo/worktrees/x/y' } })), '--approve')).error, /worktree/);
  const inner = app.http;
  app.http = async (address, init) => {
    const answer = await inner(address, init);
    if (init?.method === 'PUT' && address.endsWith('/schedule')) answer.value.schedule.version = 'f'.repeat(64);
    return answer;
  };
  const refused = await call('save', '--file', file(plan()), '--approve');
  assert.equal(refused.reason, 'changed');
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), null);
});

test('a lost save answer is read back, not saved twice; a lost approval report still approves here', async t => {
  const { app, env, call, file } = cli(t);
  const inner = app.http;
  let lose = true;
  app.http = async (address, init) => {
    const answer = await inner(address, init);
    if (lose && (address.endsWith('/schedule') && init?.method === 'PUT' || address.endsWith('/schedule-approved'))) throw new Error('lost');
    return answer;
  };
  const saved = await call('save', '--file', file(plan()), '--approve');
  assert.equal(saved.ok, true);
  assert.equal(saved.reported, false);
  assert.equal(app.calls.filter(([method, route]) => method === 'PUT' && route === 'schedule').length, 1);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), saved.version);
});

test('list marks what needs an OK here, and says so with no times when the app can not be reached', async t => {
  const { app, env, call, file } = cli(t);
  await call('save', '--file', file(plan()), '--approve');
  await call('save', '--file', file(plan({ key: 'monthly-books', name: 'Monthly books' })));
  const listed = await call('list');
  assert.deepEqual(listed.schedules.map(row => [row.key, row.needsOk]), [['weekly-plan', false], ['monthly-books', true]]);
  assert.equal(listed.schedules[0].nextRunAt, new Date(NOW + 3600e3).toISOString());
  app.schedules.get('weekly-plan').instructions = 'Changed in the app.';
  app.schedules.get('weekly-plan').version = 'e'.repeat(64);
  assert.equal((await call('list')).schedules[0].needsOk, true, 'a version changed elsewhere needs a new OK');
  const offline = cli(t, fakeApp({ broken: { schedules: 'throw' } }));
  const answer = await offline.call('list');
  assert.equal(answer.ok, false);
  assert.equal(answer.code, 3);
  assert.match(answer.error, /can not be reached; no times are shown/);
  assert.ok(env.HOME);
});

test('a team copy with no folder shows this checkout, and approving it saves the folder, then binds this computer', async t => {
  const { app, env, call, root } = cli(t);
  await app.http('/apps/inbox/api/schedule', { method: 'PUT', body: JSON.stringify({ ...plan(), summary: 'Plan', computer: '', run: {} }) });
  const shown = await call('show', 'weekly-plan');
  assert.equal(shown.binds, root);
  assert.notEqual(shown.version, app.schedules.get('weekly-plan').version);
  assert.equal((await call('approve', 'weekly-plan', '--version', 'a'.repeat(64))).reason, 'changed');
  const approved = await call('approve', 'weekly-plan', '--version', shown.version);
  assert.equal(approved.ok, true);
  assert.deepEqual(app.schedules.get('weekly-plan').run, { cwd: root });
  assert.equal(app.schedules.get('weekly-plan').computer, COMPUTER);
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), shown.version);
});

test('save --team copies to each teammate with no folder of the owner\'s, and approves nothing here', async t => {
  const { app, env, call, file } = cli(t);
  const answer = await call('save', '--file', file(plan()), '--team', 'kim@example.test, lee@example.test');
  assert.deepEqual(answer.team, { copied: 2, skipped: 0 });
  assert.deepEqual(app.team[0].people, ['kim@example.test', 'lee@example.test']);
  assert.ok(!('computer' in app.team[0]));
  assert.deepEqual(app.team[0].run, {}, 'each teammate\'s computer fills in its own folder');
  assert.equal(approvedVersion({ origin: ORIGIN, email: JO, key: 'weekly-plan' }, env), null);
});

test('start checks the run, the version and the OK again, claims progress, and quotes the instructions', async t => {
  const { app, env, call, file } = cli(t);
  const saved = await call('save', '--file', file(plan()), '--approve');
  app.runs.push({ id: runId(7), key: 'weekly-plan', dueAt: NOW, source: 'clock', state: 'started', result: null, chatTitle: null, agentId: 'agent-7' });
  const start = (...more) => main(['start', '--key', 'weekly-plan', '--run', runId(7), '--version', saved.version, ...more], { root: '/', env: { ...env, PASEO_AGENT_ID: 'agent-7' },
    company: async () => app, computer: COMPUTER, email: () => JO, sleep: async () => {}, out: chunk => { start.text = chunk; } }).then(code => ({ code, ...JSON.parse(start.text) }));
  const started = await start();
  assert.equal(started.ok, true);
  assert.equal(started.instructions, '> Plan the week.');
  assert.equal(started.progress, null);
  assert.equal((await start()).ok, true, 'the same run may claim again');
  assert.equal((await call('progress', '--key', 'weekly-plan', '--run', runId(7), '--file', file({ done: ['monday'] }, 'p.json'))).progress.done[0], 'monday');
  assert.equal((await call('progress', '--key', 'weekly-plan', '--run', runId(8), '--file', file({}, 'q.json'))).reason, 'not_claimed');
  assert.equal((await call('release', '--key', 'weekly-plan', '--run', runId(7))).ok, true);

  const other = await main(['start', '--key', 'weekly-plan', '--run', runId(7), '--version', saved.version], { root: '/', env: { ...env, PASEO_AGENT_ID: 'agent-other' },
    company: async () => app, computer: COMPUTER, email: () => JO, sleep: async () => {}, out: () => {} });
  assert.equal(other, 2, 'a chat the app did not start for this run is refused');
  approve({ origin: ORIGIN, email: JO, key: 'weekly-plan', version: 'd'.repeat(64) }, env);
  const refused = await start();
  assert.equal(refused.reason, 'not_approved');
});

test('end and cancel keep the schedule listed as ended; pause falls back to Paseo for a schedule still there', async t => {
  const paseo = { calls: [], async pause(id) { this.calls.push(['pause', id]); return { version: 1, host: 'paseo', action: 'pause', nativeId: id, outcome: 'verified', observedAt: 'now', observation: { id } }; } };
  const { app, call, file, root } = cli(t, fakeApp(), { paseo });
  await call('save', '--file', file(plan()), '--approve');
  assert.equal((await call('end')).ok, false);
  assert.equal((await call('end', 'weekly-plan')).ok, false, 'ending needs proof');
  assert.deepEqual((await call('end', '--key', 'weekly-plan', '--evidence', 'Invoice 12 is paid.')).schedule.ended, { at: NOW, reason: 'Invoice 12 is paid.' });
  assert.equal((await call('list')).schedules[0].state, 'ended');
  writeRecord(root, { key: 'old-job' });
  app.schedules.set('old-job', { ...app.schedules.get('weekly-plan'), key: 'old-job', host: 'paseo', ended: null });
  const paused = await call('pause', 'old-job');
  assert.equal(paused.host, 'paseo');
  assert.deepEqual(paseo.calls, [['pause', 'job-1']]);
  assert.equal((await call('cancel', 'weekly-plan', '--run', runId(3))).run.state, 'cancelled');
});

test('unknown commands, a bad flag and a missing key are refused before any call', async t => {
  const { app, call } = cli(t);
  assert.equal((await call('create-routine')).code, 2);
  assert.equal((await call('create-goal')).code, 2);
  assert.equal((await call('list', '--nope')).code, 2);
  assert.equal((await call('pause')).code, 2);
  assert.deepEqual(app.calls, []);
});
