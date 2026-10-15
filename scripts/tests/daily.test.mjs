// /daily's script: who the person is, which steps file is theirs, and one workspace per step and day.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { emailsOf, launchWorkspace, localDay, open, opened, personFile, who } from '../../.agents/skills/daily/scripts/daily.mjs';

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
