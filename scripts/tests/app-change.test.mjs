import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CHECK_FILES, cli, NEVER_PUBLISHES, NO_PUBLISH, NOT_SET_UP, refusal, waitRows } from '../../.agents/skills/save/scripts/app-change.mjs';

const script = new URL('../../.agents/skills/save/scripts/app-change.mjs', import.meta.url).pathname;
const APP = 'https://app.example.com/api/access/code/git/';
const NEW = 'b'.repeat(40);
const OLD = 'a'.repeat(40);
const PREVIEW = 'https://work.example.workers.dev';
const PLAIN = 'The save was refused. Ask your admin for access to Connect your assistant, or sign in again.';

// ---------------------------------------------------------------------------
// A project kept on GitHub: the rules of wait-for-checks.sh, over the app's rows

const row = (bucket, name, link = `https://ci/${name}`) => ({ name, bucket, link, job: null });
const PASS = [row('pass', 'unit')];
const SKIPPED = [row('skipping', 'unit (pull_request)')];
const change = (rows, more = {}) => ({ head: NEW, state: 'OPEN', url: 'https://github.com/team/repo/pull/7', number: 7, rows, workflows: true, preview: null, ...more });

// Time that moves only when the waiter sleeps, so a grace of a minute costs nothing.
function clock() {
  let at = 0;
  return { sleep: async ms => { at += ms; }, now: () => at };
}
// Answers in order; the last one repeats. `reads` counts them.
function answering(...answers) {
  const reader = async () => answers[Math.min(reader.reads++, answers.length - 1)];
  reader.reads = 0;
  return reader;
}
const wait = (read, { guard = false, minutes = 1, grace = 1, interval = 0.2 } = {}) => waitRows(read, { sha: NEW, guard }, { minutes, grace, interval, ...clock() });

test('a stale head never reports the old commit green', async () => {
  const read = answering(change(PASS, { head: OLD }));
  const answer = await wait(read);
  assert.equal(answer.result, 'UNKNOWN');
  assert.match(answer.lines[0], new RegExp(`the change's head is ${OLD}, not local HEAD ${NEW}, after 1s; push HEAD first\\.`));
  assert.ok(read.reads > 1, 'it waited for the head through the grace');
  // No change yet at all reads the same way.
  assert.match((await wait(answering(change(PASS, { head: null })))).lines[0], /head is not there yet, not local HEAD/);
});

test('the wait resumes once the head reaches local HEAD', async () => {
  assert.deepEqual(await wait(answering(change(PASS, { head: OLD }), change(PASS))), { result: 'SUCCESS', lines: [] });
});

test('no checks with check workflows is UNKNOWN after the grace period, and NONE at once without any', async () => {
  const read = answering(change([]));
  const answer = await wait(read);
  assert.equal(answer.result, 'UNKNOWN');
  assert.match(answer.lines[0], new RegExp(`no check appeared for ${NEW} within 1s, but the project has check workflows`));
  assert.ok(read.reads > 1, 'polls during the grace period');
  const none = answering(change([], { workflows: false }));
  assert.deepEqual(await wait(none), { result: 'NONE', lines: [] });
  assert.equal(none.reads, 1);
});

test('an answer that can not be read is UNKNOWN with its reason, never NONE', async () => {
  assert.deepEqual(await wait(answering({ why: 'Company session expired or access was denied; use the employee’s own login.' })),
    { result: 'UNKNOWN', lines: ['Company session expired or access was denied; use the employee’s own login.'] });
  assert.deepEqual(await wait(answering({})), { result: 'UNKNOWN', lines: ['the app returned no checks and no error; the gate is unverified.'] });
  // A read that fails mid-wait ends it the same way.
  assert.equal((await wait(answering(change(PASS), { why: 'the app answered HTTP 503' }))).result, 'UNKNOWN');
});

test('a pass is reported only when two polls agree', async () => {
  const read = answering(change([...PASS, row('skipping', 'lint')]));
  assert.deepEqual(await wait(read), { result: 'SUCCESS', lines: [] });
  assert.equal(read.reads, 2);
});

test('a failed or cancelled check is FAILURE at once, and names it with its link', async () => {
  for (const bucket of ['fail', 'cancel']) {
    const read = answering(change([...PASS, row(bucket, 'e2e', 'https://github.com/team/repo/actions/runs/10/job/2')]));
    assert.deepEqual(await wait(read), { result: 'FAILURE', lines: ['- e2e  https://github.com/team/repo/actions/runs/10/job/2'] });
    assert.equal(read.reads, 1);
  }
});

test('checks that never finish are TIMEOUT with the pending names', async () => {
  assert.deepEqual(await wait(answering(change([...PASS, row('pending', 'e2e')])), { minutes: 0 }), { result: 'TIMEOUT', lines: ['- e2e (still running)'] });
});

test('only skipped checks are not a pass while the real run may still register', async () => {
  const read = answering(change(SKIPPED), change(SKIPPED), change([...SKIPPED, row('pending', 'unit')]), change([...SKIPPED, row('fail', 'unit')]));
  assert.deepEqual(await wait(read, { grace: 30 }), { result: 'FAILURE', lines: ['- unit  https://ci/unit'] });
  assert.equal(read.reads, 4);
});

test('a check that appears after the others finished is waited for', async () => {
  const read = answering(change(PASS), change([...PASS, row('pending', 'deploy')]), change([...PASS, row('pass', 'deploy')]));
  assert.equal((await wait(read)).result, 'SUCCESS');
  assert.equal(read.reads, 4);
});

test('a project whose checks all skip passes once the grace period ends', async () => {
  const read = answering(change(SKIPPED));
  assert.equal((await wait(read)).result, 'SUCCESS');
  assert.ok(read.reads > 2);
});

test('with the guard workflow on the default branch, a pass waits for a row named guard, until the grace ends', async () => {
  const late = answering(change(PASS), change(PASS), change(PASS), change([...PASS, row('fail', 'guard')]));
  assert.deepEqual(await wait(late, { guard: true, grace: 30 }), { result: 'FAILURE', lines: ['- guard  https://ci/guard'] });
  assert.equal(late.reads, 4);
  const listed = answering(change([...PASS, row('pass', 'guard')]));
  assert.equal((await wait(listed, { guard: true, grace: 30 })).result, 'SUCCESS');
  assert.equal(listed.reads, 2);
  const never = answering(change(PASS));
  assert.equal((await wait(never, { guard: true, grace: 3 })).result, 'SUCCESS');
  assert.ok(never.reads > 2, 'it waited past the two polls a pass needs');
  const unasked = answering(change(PASS));
  assert.equal((await wait(unasked, { grace: 30 })).result, 'SUCCESS');
  assert.equal(unasked.reads, 2);
});

// ---------------------------------------------------------------------------
// The commands, against a stand-in for the connection

// A checkout on branch `work` whose origin is the app. `guard` puts the guard workflow on origin/main.
function checkout(t, { guard = false } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-app-change-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-c', 'user.email=f@example.test', '-c', 'user.name=F', ...args], { cwd: dir, encoding: 'utf8' }).trim();
  git('init', '-q', '-b', 'work');
  git('remote', 'add', 'origin', APP);
  mkdirSync(join(dir, '.github/workflows'), { recursive: true });
  writeFileSync(join(dir, '.github/workflows/guard.yml'), 'on: pull_request_target\n');
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  if (guard) git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  return { dir, git, sha: git('rev-parse', 'HEAD') };
}

// The connection's two calls. `http` answers reads in order (the last repeats): a plain object is
// a 200, `{ status, value }` is the app's own error, and an Error is thrown as the client throws.
function connection(answers, { git, restart = { restart: 'started' } } = {}) {
  const calls = [];
  let reads = 0;
  const http = async (path, init) => {
    calls.push({ path, init });
    const answer = path.endsWith('/restart') ? restart : answers[Math.min(reads++, answers.length - 1)];
    if (answer instanceof Error) throw answer;
    return answer.status ? answer : { value: answer, status: 200 };
  };
  return { calls, http, git, reads: () => reads };
}
const refusedBy = (status, code, message) => ({ status, value: { error: { code, message } } });

async function run(f, argv, client, env = {}) {
  const [out, err] = [[], []];
  const code = await cli(argv, { cwd: f.dir, env: { WAIT_FOR_CHECKS_GRACE: '30', WAIT_FOR_CHECKS_INTERVAL: '10', ...env }, out: line => out.push(line), err: line => err.push(line), client, ...clock() });
  return { code, out, err, text: out.join('\n') };
}

test('wait prints the RESULT line first, for the checks of the exact HEAD on its branch', async (t) => {
  const f = checkout(t);
  const failing = connection([change([...PASS, row('fail', 'e2e', 'https://github.com/team/repo/actions/runs/10/job/2')], { head: f.sha })]);
  const r = await run(f, ['wait', '1'], failing);
  assert.equal(r.code, 0);
  assert.deepEqual(r.out, ['RESULT: FAILURE', '  - e2e  https://github.com/team/repo/actions/runs/10/job/2']);
  assert.ok(failing.calls.every(call => call.path === `/api/access/code/change?branch=work&sha=${f.sha}` && call.init === undefined));
  // An earlier commit's green rows never answer for HEAD.
  const stale = await run(f, ['wait', '1'], connection([change(PASS, { head: OLD })]));
  assert.equal(stale.out[0], 'RESULT: UNKNOWN');
  assert.match(stale.out[1], /^ {2}the change's head is a+, not local HEAD/);
  // The client throws for an expired session: the gate is unverified, with that reason.
  const expired = await run(f, ['wait', '1'], connection([new Error('Company session expired or access was denied; use the employee’s own login.')]));
  assert.deepEqual(expired.out, ['RESULT: UNKNOWN', '  Company session expired or access was denied; use the employee’s own login.']);
  const down = await run(f, ['wait', '1'], connection([refusedBy(503, 'code_unavailable', 'The project could not be reached.')]));
  assert.deepEqual(down.out, ['RESULT: UNKNOWN', '  The project could not be reached.']);
  // The pending names are listed under TIMEOUT.
  const slow = await run(f, ['wait', '0'], connection([change([row('pending', 'unit')], { head: f.sha })]));
  assert.deepEqual(slow.out, ['RESULT: TIMEOUT', '  - unit (still running)']);
});

test('wait holds a pass for the guard check only where origin holds the guard workflow', async (t) => {
  const plain = checkout(t);
  const quick = connection([change(PASS, { head: plain.sha })]);
  assert.deepEqual((await run(plain, ['wait', '5'], quick)).out, ['RESULT: SUCCESS']);
  assert.equal(quick.reads(), 3, 'one read to tell the shape, then two that agree');
  const guarded = checkout(t, { guard: true });
  const held = connection([change(PASS, { head: guarded.sha })]);
  assert.deepEqual((await run(guarded, ['wait', '5'], held)).out, ['RESULT: SUCCESS']);
  assert.ok(held.reads() > 3, 'it waited for guard until the grace ended');
});

test('wait is UNKNOWN on a checkout that is on no branch, and the app is not asked', async (t) => {
  const f = checkout(t);
  f.git('checkout', '-q', '--detach');
  const client = connection([change(PASS)]);
  assert.deepEqual((await run(f, ['wait'], client)).out, ['RESULT: UNKNOWN', '  this checkout is not on a branch, so no change can be named for it.']);
  assert.equal((await run(f, ['preview'], client)).text, '');
  const push = await run(f, ['push'], client);
  assert.deepEqual([push.code, push.err], [1, ['this checkout is not on a branch, so it has no change to save.']]);
  assert.equal(client.calls.length, 0);
});

// A project kept in Cloudflare: the app hands over the check run, and artifacts-run.mjs's verdict decides.
const REF = 'refs/heads/work';
const done = output => ({ run: { state: 'done', output } });
const passed = (commit, more = { deployed: true, preview: PREVIEW }) => done({ commit, ref: REF, result: 'success', ...more });
const cutOff = commit => done({ commit, ref: REF, result: 'interrupted', stage: 'checks', reason: 'the sandbox container stopped' });
const MISSING = { run: { state: 'missing' } };
const PENDING = { run: { state: 'pending' } };

test('a check run that appears late, runs, then passes is SUCCESS; a failed one is FAILURE with its lines', async (t) => {
  const f = checkout(t);
  assert.deepEqual((await run(f, ['wait', '5'], connection([MISSING, MISSING, PENDING, passed(f.sha)]))).out, ['RESULT: SUCCESS']);
  const failed = done({ commit: f.sha, ref: REF, result: 'failure', stage: 'checks', reason: 'npm test\n1 failing' });
  assert.deepEqual((await run(f, ['wait', '5'], connection([failed]))).out, ['RESULT: FAILURE', '  checks failed', '  npm test', '  1 failing']);
  assert.deepEqual((await run(f, ['wait', '5'], connection([done({ commit: f.sha, ref: REF, result: 'none' })]))).out, ['RESULT: NONE']);
});

test('a check run that never appears, never finishes, can not be read, or answers for another commit is never a pass', async (t) => {
  const f = checkout(t);
  assert.deepEqual((await run(f, ['wait', '5'], connection([MISSING]))).out, ['RESULT: UNKNOWN', `  no check run appeared for ${f.sha} within 30s; push HEAD first.`]);
  assert.deepEqual((await run(f, ['wait', '1'], connection([PENDING]))).out, ['RESULT: TIMEOUT', '  - checks (still running)']);
  assert.deepEqual((await run(f, ['wait', '5'], connection([{ run: { state: 'unreadable', why: 'the check runner could not be read' } }]))).out, ['RESULT: UNKNOWN', '  the check runner could not be read']);
  assert.deepEqual((await run(f, ['wait', '5'], connection([passed(OLD)]))).out, ['RESULT: UNKNOWN', '  the run answered for another commit or branch']);
  assert.deepEqual((await run(f, ['wait', '5'], connection([PENDING, new Error('Company discovery is unreachable; no business action was called.')]))).out,
    ['RESULT: UNKNOWN', '  Company discovery is unreachable; no business action was called.']);
  assert.deepEqual((await run(f, ['wait', '5'], connection([{ run: { state: 'errored', why: 'terminated' } }]))).out, ['RESULT: UNKNOWN', '  the check run was cut off', '  the run stopped: terminated']);
});

test('a wait starts a cut-off check run again once through the app, and reads what that restart produces', async (t) => {
  const f = checkout(t);
  const client = connection([cutOff(f.sha), cutOff(f.sha), PENDING, passed(f.sha)]);
  assert.deepEqual((await run(f, ['wait', '5'], client)).out, ['RESULT: SUCCESS']);
  const restarts = client.calls.filter(call => call.path === '/api/access/code/change/restart');
  assert.equal(restarts.length, 1);
  assert.deepEqual(restarts[0].init, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: 'work', sha: f.sha }) });
  // Still cut off after its one restart: UNKNOWN, and not started a second time.
  const again = connection([cutOff(f.sha)]);
  const stuck = await run(f, ['wait', '5'], again);
  assert.deepEqual(stuck.out.slice(0, 2), ['RESULT: UNKNOWN', '  the check run was cut off']);
  assert.equal(again.calls.filter(call => call.path.endsWith('/restart')).length, 1);
  // A restart the app refuses is said, under the same UNKNOWN.
  const refused = await run(f, ['wait', '5'], connection([cutOff(f.sha)], { restart: { restart: 'refused' } }));
  assert.equal(refused.out[0], 'RESULT: UNKNOWN');
  assert.equal(refused.out.at(-1), '  it could not be started again: the app answered refused');
});

test('preview prints the address the app gives for HEAD, and nothing on a miss', async (t) => {
  const f = checkout(t);
  const rows = await run(f, ['preview'], connection([change(PASS, { head: f.sha, preview: PREVIEW })]));
  assert.deepEqual([rows.code, rows.out, rows.err], [0, [PREVIEW], ['via: the app']]);
  const viaRun = await run(f, ['preview'], connection([passed(f.sha)]));
  assert.deepEqual([viaRun.out, viaRun.err], [[PREVIEW], ['via: check run']]);
  for (const miss of [change(PASS), passed(f.sha, { deployed: false }), passed(OLD), PENDING, new Error('unreachable'), refusedBy(404, 'not_found', 'No such change.')]) {
    const client = connection([miss]);
    const r = await run(f, ['preview'], client);
    assert.deepEqual([r.code, r.out, r.err], [0, [], []]);
    assert.equal(client.calls.length, 1, 'one read, no waiting');
  }
});

test('result prints one word for the named commit, without waiting', async (t) => {
  const f = checkout(t);
  const word = async answer => {
    const client = connection([answer]);
    const r = await run(f, ['result', NEW, 'refs/heads/other'], client);
    assert.equal(client.calls.length, 1);
    assert.equal(client.calls[0].path, `/api/access/code/change?branch=other&sha=${NEW}`);
    return r.text;
  };
  const ran = output => done({ commit: NEW, ref: 'refs/heads/other', ...output });
  assert.equal(await word(ran({ result: 'success', deployed: false })), 'SUCCESS');
  assert.equal(await word(ran({ result: 'none' })), 'NONE');
  assert.equal(await word(ran({ result: 'failure' })), 'FAILURE');
  assert.equal(await word(ran({ result: 'interrupted' })), 'INTERRUPTED');
  assert.equal(await word(PENDING), 'PENDING');
  assert.equal(await word(passed(NEW)), 'UNKNOWN', 'a run for another branch');
  // Rows: one read can say a check is red, and only the waiter settles a pass.
  assert.equal(await word(change([...PASS, row('cancel', 'e2e')])), 'FAILURE');
  assert.equal(await word(change(PASS)), 'UNKNOWN');
  assert.equal(await word(new Error('unreachable')), 'UNKNOWN');
  for (const argv of [['result'], ['result', 'abc', REF], ['result', NEW, 'work'], ['log'], ['log', '12x'], ['open', 'only a title'], ['merge'], []]) {
    const r = await run(f, argv, connection([change(PASS)]));
    assert.equal(r.code, 2, argv.join(' '));
    assert.match(r.err[0], /^usage: app-change\.mjs wait/);
  }
});

test('log prints the tail of the failed job as CAUSE lines, or says it could not be read', async (t) => {
  const f = checkout(t);
  const client = connection([{ lines: ['lint\tRun oxlint\tfirst', '', 'lint\tRun oxlint\terror: unused variable `old`'] }]);
  const r = await run(f, ['log', '42'], client);
  assert.deepEqual([r.code, r.out], [0, ['CAUSE: last 2 lines of the failed log', '  | lint\tRun oxlint\tfirst', '  | lint\tRun oxlint\terror: unused variable `old`']]);
  assert.equal(client.calls[0].path, '/api/access/code/change/log?job=42');
  const long = await run(f, ['log', '42'], connection([{ lines: Array.from({ length: 80 }, (_, index) => `line ${index}`) }]));
  assert.deepEqual([long.out[0], long.out[1], long.out.length], ['CAUSE: last 60 lines of the failed log', '  | line 20', 61]);
  assert.deepEqual((await run(f, ['log', '42'], connection([refusedBy(404, 'not_found', 'No such job in this project.')]))).out, ['CAUSE=the log could not be read (No such job in this project.); open LINK']);
  assert.deepEqual((await run(f, ['log', '42'], connection([{ lines: [] }]))).out, ['CAUSE=the log could not be read (empty); open LINK']);
});

test('change prints the branch\'s change, and a refusal is the app\'s own line on stderr', async (t) => {
  const f = checkout(t);
  const open = await run(f, ['change'], connection([change(PASS)]));
  assert.deepEqual([open.code, JSON.parse(open.text)], [0, { state: 'OPEN', url: 'https://github.com/team/repo/pull/7', number: 7, rows: true }]);
  assert.deepEqual(JSON.parse((await run(f, ['change'], connection([change([], { state: null, url: null, number: null, head: null })]))).text), { state: null, url: null, number: null, rows: true });
  assert.deepEqual(JSON.parse((await run(f, ['change'], connection([MISSING]))).text), { state: null, url: null, number: null, rows: false });
  const notReady = await run(f, ['change'], connection([refusedBy(409, 'save_not_ready', NOT_SET_UP)]));
  assert.deepEqual([notReady.code, notReady.out, notReady.err], [1, [], [NOT_SET_UP]]);
  const denied = await run(f, ['change'], connection([new Error('Company session expired or access was denied; use the employee’s own login.')]));
  assert.deepEqual([denied.code, denied.err], [1, ['Company session expired or access was denied; use the employee’s own login.']]);
});

test('open sends the title and the body file as JSON, and prints the change the app returns', async (t) => {
  const f = checkout(t);
  const body = join(f.dir, '..', `body-${process.pid}.md`);
  writeFileSync(body, '## Summary\n\nWhat changed.\n');
  t.after(() => rmSync(body, { force: true }));
  const client = connection([{ state: 'OPEN', url: 'https://github.com/team/repo/pull/7', number: 7 }]);
  const r = await run(f, ['open', 'feat: a thing', body], client);
  assert.deepEqual([r.code, JSON.parse(r.text)], [0, { state: 'OPEN', url: 'https://github.com/team/repo/pull/7', number: 7 }]);
  assert.deepEqual(client.calls, [{ path: '/api/access/code/change', init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: 'work', title: 'feat: a thing', body: '## Summary\n\nWhat changed.\n' }) } }]);
  // A project kept in Cloudflare has no change to open.
  assert.deepEqual(JSON.parse((await run(f, ['open', 'feat: a thing', body], connection([{ change: null }]))).text), { state: null, url: null, number: null });
  const notReady = await run(f, ['open', 'feat: a thing', body], connection([refusedBy(409, 'save_not_ready', NOT_SET_UP)]));
  assert.deepEqual([notReady.code, notReady.out, notReady.err], [1, [], [NOT_SET_UP]]);
});

test('push sends HEAD up with the connection\'s Git, and a refusal is one plain line, never Git\'s output', async (t) => {
  const f = checkout(t);
  const sent = [];
  const pushing = answer => connection([], { git: async (args, cwd) => { sent.push({ args, cwd }); if (answer instanceof Error) throw answer; return answer; } });
  const ok = await run(f, ['push'], pushing({ code: 0, stdout: '', stderr: 'remote: Create a pull request\nTo https://app.example.com/api/access/code/git/\n' }));
  assert.deepEqual([ok.code, ok.out, ok.err], [0, [], []]);
  assert.deepEqual(sent, [{ args: ['push', '-u', 'origin', 'HEAD'], cwd: f.dir }]);
  for (const line of [NOT_SET_UP, NEVER_PUBLISHES, CHECK_FILES]) {
    for (const stderr of [`remote: ${line}\nfatal: unable to access '${APP}': The requested URL returned error: 403\n`, `To ${APP}\n ! [remote rejected] HEAD -> work (${line})\nerror: failed to push some refs to '${APP}'\n`]) {
      const r = await run(f, ['push'], pushing({ code: 1, stdout: '', stderr }));
      assert.deepEqual([r.code, r.out, r.err], [1, [], [line]]);
    }
  }
  // Without Project code, signed out, or the project down: none of the app's lines, so the plain one.
  const other = await run(f, ['push'], pushing({ code: 128, stdout: '', stderr: `fatal: unable to access '${APP}': The requested URL returned error: 403\n` }));
  assert.deepEqual([other.code, other.out, other.err], [1, [], [PLAIN]]);
  assert.equal(refusal(undefined), PLAIN);
  const foreign = await run(f, ['push'], pushing(new Error('This copy did not come from the connected company; nothing was sent.')));
  assert.deepEqual([foreign.code, foreign.err], [1, ['This copy did not come from the connected company; nothing was sent.']]);
});

test('can-publish says yes only for a person who holds Project code at its publish level', async (t) => {
  const f = checkout(t);
  const holding = level => connection([{ state: 'current', keys: [{ id: 'cloudflare', title: 'Cloudflare', level: 'write' }, { id: 'code', title: 'Project code', level }] }]);
  const yes = holding('write');
  assert.deepEqual([(await run(f, ['can-publish'], yes)).out, yes.calls], [['yes'], [{ path: '/api/access/apps', init: undefined }]]);
  assert.deepEqual((await run(f, ['can-publish'], holding('read'))).out, ['no']);
  assert.deepEqual((await run(f, ['can-publish'], connection([{ state: 'legacy' }]))).out, ['no']);
  const down = await run(f, ['can-publish'], connection([new Error('Company session expired or access was denied; use the employee’s own login.')]));
  assert.deepEqual([down.code, down.out], [1, []]);
});

test('publish asks the app to publish this exact commit, prints what went live, and fetches; a refusal is one line', async (t) => {
  const f = checkout(t);
  const fetched = [];
  const publishing = answer => connection([answer], { git: async (args, cwd) => { fetched.push({ args, cwd }); return { code: 0, stdout: '', stderr: '' }; } });
  const client = publishing({ published: true, commit: 'abc', url: 'https://github.com/team/repo/pull/7' });
  const ok = await run(f, ['publish'], client);
  assert.deepEqual([ok.code, ok.text], [0, 'published=yes\ncommit=abc\nchange=https://github.com/team/repo/pull/7']);
  assert.deepEqual(client.calls, [{ path: '/api/access/code/change/publish', init: { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ branch: 'work', sha: f.sha }) } }]);
  assert.deepEqual(fetched, [{ args: ['fetch', 'origin'], cwd: f.dir }]);
  // On Cloudflare there is no change page; a failed fetch leaves the publish standing.
  const failing = connection([{ published: true, commit: f.sha, url: null }], { git: async () => { throw new Error('offline'); } });
  assert.deepEqual((await run(f, ['publish'], failing)).out, [`published=yes\ncommit=${f.sha}\nchange=none`]);
  // No tick: the plain line, never the app's level words. Any other refusal is the app's own line.
  const denied = await run(f, ['publish'], publishing(refusedBy(403, 'forbidden', 'Project code: Read & write needed')));
  assert.deepEqual([denied.code, denied.out, denied.err], [1, [], [NO_PUBLISH]]);
  const failed = 'The check "test" did not pass, so nothing was published.';
  const red = await run(f, ['publish'], publishing(refusedBy(409, 'checks_not_passed', failed)));
  assert.deepEqual([red.code, red.out, red.err], [1, [], [failed]]);
  f.git('checkout', '-q', '--detach');
  const detached = publishing({ published: true });
  assert.deepEqual([(await run(f, ['publish'], detached)).code, detached.calls], [1, []]);
});

test('heads lists the project\'s branch heads through the connection\'s Git', async (t) => {
  const f = checkout(t);
  const asked = [];
  const listing = answer => connection([], { git: async (args) => { asked.push(args); return answer; } });
  const r = await run(f, ['heads', 'refs/heads/work'], listing({ code: 0, stdout: `${f.sha}\trefs/heads/work`, stderr: '' }));
  assert.deepEqual([r.code, r.out], [0, [`${f.sha}\trefs/heads/work`]]);
  assert.deepEqual(asked, [['ls-remote', '--heads', 'origin', 'refs/heads/work']]);
  assert.deepEqual((await run(f, ['heads', 'refs/heads/new'], listing({ code: 0, stdout: '', stderr: '' }))).out, [], 'a branch not saved yet lists nothing');
  const denied = await run(f, ['heads'], listing({ code: 128, stdout: '', stderr: 'fatal: 403' }));
  assert.deepEqual([denied.code, denied.out, denied.err], [1, [], [PLAIN]]);
});

test('with no connection for this copy, the real client says so and nothing is sent', (t) => {
  const f = checkout(t);
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-app-change-home-')));
  t.after(() => rmSync(home, { recursive: true, force: true }));
  const started = (...argv) => spawnSync(process.execPath, [script, ...argv], { cwd: f.dir, encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, WAIT_FOR_CHECKS_GRACE: '0' } });
  const read = started('change');
  assert.equal(read.status, 1);
  assert.match(read.stderr, /^Connect first: /);
  assert.equal(started('push').status, 1);
  const waited = started('wait', '0');
  assert.equal(waited.status, 0);
  assert.match(waited.stdout, /^RESULT: UNKNOWN\n {2}Connect first: /);
  assert.equal(started('result', NEW, REF).stdout, 'UNKNOWN\n');
});
