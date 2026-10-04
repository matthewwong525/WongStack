import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { cli, readRun, verdict, waitRun } from '../../.agents/skills/save/scripts/artifacts-run.mjs';
import { runId } from '../check-runner/run-id.mjs';

const scripts = new URL('../../.agents/skills/save/scripts/', import.meta.url).pathname;
const ACCOUNT = '0123456789abcdef'.repeat(2);
const REMOTE = `https://${ACCOUNT}.artifacts.cloudflare.net/git/wongstack/recipe-box.git`;
const GITHUB = 'https://github.com/someone/recipe-box.git';
const DELIVERY = { route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'recipe-box', remote: REMOTE, runner: 'recipe-box-checks', workflow: 'recipe-box-checks', bucket: 'recipe-box-checks' };
const TOKEN = 'cf-user-token-made-up-for-tests';
const TARGET = { token: TOKEN, account: ACCOUNT, workflow: DELIVERY.workflow };
const SHA = 'c'.repeat(40);
const OTHER = 'd'.repeat(40);
const BRANCH = 'refs/heads/recipes';
const MAIN = 'refs/heads/main';
const PREVIEW = 'https://x-app-staging.sub.workers.dev';
const LIVE = 'https://x-app.sub.workers.dev';

// What a run writes as its output, and what Cloudflare answers for one read of a run.
const pass = (commit, ref, extra = { deployed: true, preview: PREVIEW }) => ({ commit, ref, result: 'success', ...extra });
const fail = (commit, ref) => ({ commit, ref, result: 'failure', stage: 'checks', reason: 'npm test\n1 failing' });
const instance = (result) => () => Response.json({ success: true, errors: [], result });
const complete = (output) => instance({ status: 'complete', output });
const running = instance({ status: 'running' });
const missing = () => Response.json({ success: false, errors: [{ code: 10200 }], result: null }, { status: 404 });
const broken = () => Response.json({ success: false, errors: [{ code: 10000 }], result: null }, { status: 500 });

// A stand-in for Cloudflare: each read gets the next answer, and the last one repeats.
function cloudflare(...answers) {
  const calls = [];
  return { calls, fetch: async (url, init) => { calls.push({ url, init }); return answers[Math.min(calls.length, answers.length) - 1](); } };
}
// A stand-in that holds runs by their id: any other run is not found.
function holding(runs) {
  const calls = [];
  return { calls, fetch: async (url, init) => { calls.push({ url, init }); return (runs[url.split('/').at(-1)] ?? missing)(); } };
}
// What one answer means for a commit on a branch, read the way the verbs read it.
const read = async (answer, at = { sha: SHA, ref: BRANCH }) => verdict(await readRun({ ...TARGET, id: await runId(at.sha, at.ref), fetch: cloudflare(answer).fetch }), at);

test('a run id is fixed by its commit and branch, and needs a whole commit id and a branch', async () => {
  const id = await runId(SHA, BRANCH);
  assert.equal(await runId(SHA, BRANCH), id);
  assert.notEqual(await runId(SHA, MAIN), id);
  assert.notEqual(await runId(OTHER, BRANCH), id);
  assert.match(id, /^[a-zA-Z0-9_][a-zA-Z0-9_-]{0,63}$/, 'not a name Cloudflare takes for a Workflow run');
  await assert.rejects(runId(SHA.slice(0, 7), BRANCH), /full commit id/);
  await assert.rejects(runId(SHA, 'refs/tags/v1.0.0'), /branch ref/);
});

test('a finished run that Cloudflare answers with an error flag beside it is still read, and nothing less is', async () => {
  const flagged = (result) => () => Response.json({ success: false, errors: [{ code: 10001, message: 'workflows.api.error.internal_server' }], result });
  const done = { status: 'complete', success: true, output: pass(SHA, BRANCH) };
  assert.deepEqual(await read(flagged(done)), { result: 'SUCCESS', lines: [], address: PREVIEW });
  assert.equal((await read(flagged({ ...done, output: pass(OTHER, BRANCH) }))).result, 'UNKNOWN', 'a flagged answer for another commit was trusted');
  for (const result of [{ ...done, success: false }, { ...done, success: undefined }, { ...done, output: null }, { status: 'running', success: true, output: pass(SHA, BRANCH) }, null]) {
    assert.equal((await read(flagged(result))).result, 'UNKNOWN', JSON.stringify(result));
  }
});

test('readRun asks Cloudflare for the one run, with the token as a bearer header only', async () => {
  const id = await runId(SHA, BRANCH);
  const api = cloudflare(complete(pass(SHA, BRANCH)));
  assert.deepEqual(await readRun({ ...TARGET, id, fetch: api.fetch }), { state: 'done', output: pass(SHA, BRANCH) });
  assert.equal(api.calls[0].url, `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/workflows/${DELIVERY.workflow}/instances/${id}`);
  assert.equal(api.calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.ok(!api.calls[0].url.includes(TOKEN));
});

test('readRun tells a missing run, a run still going, and a state it does not know', async () => {
  const state = async (answer) => (await readRun({ ...TARGET, id: await runId(SHA, BRANCH), fetch: cloudflare(answer).fetch })).state;
  assert.equal(await state(missing), 'missing');
  for (const status of ['queued', 'running', 'paused', 'waiting']) assert.equal(await state(instance({ status })), 'pending', status);
  assert.equal(await state(instance({ status: 'hibernating' })), 'unreadable');
});

test('a passing run for this commit and branch is SUCCESS with the address its deploy reported', async () => {
  assert.deepEqual(await read(complete(pass(SHA, BRANCH))), { result: 'SUCCESS', lines: [], address: PREVIEW });
});

test('a failed run is FAILURE with each line of its reason, and so is a run that stopped', async () => {
  const failed = await read(complete(fail(SHA, BRANCH)));
  assert.equal(failed.result, 'FAILURE');
  assert.deepEqual(failed.lines, ['checks failed', 'npm test', '1 failing']);
  const stopped = await read(instance({ status: 'errored', error: { name: 'Error', message: 'the container went away' } }));
  assert.equal(stopped.result, 'FAILURE');
  assert.match(stopped.lines.join('\n'), /the container went away/);
  assert.equal((await read(instance({ status: 'terminated' }))).result, 'FAILURE');
});

test('a commit with no checks to run is NONE', async () => {
  assert.equal((await read(complete({ commit: SHA, ref: BRANCH, result: 'none', deployed: false }))).result, 'NONE');
});

test('a run that can not be read is UNKNOWN', async () => {
  const unreadable = {
    'Cloudflare can not be reached': () => { throw new Error('offline'); },
    'HTTP 500': broken,
    'success: false': () => Response.json({ success: false, errors: [], result: null }),
    'a body that is not JSON': () => new Response('<html>'),
    'a state it does not know': instance({ status: 'hibernating' }),
  };
  for (const [name, answer] of Object.entries(unreadable)) {
    const got = await read(answer);
    assert.equal(got.result, 'UNKNOWN', name);
    assert.ok(!got.address, name);
  }
});

test('a run that answers for another commit or branch is UNKNOWN, never SUCCESS', async () => {
  const strays = [pass(OTHER, BRANCH), pass(SHA, 'refs/heads/other'), pass(SHA, MAIN, { deployed: true, production: LIVE, preview: PREVIEW }), { result: 'success', deployed: true, preview: PREVIEW }, 'success', null];
  for (const output of strays) {
    const got = await read(complete(output));
    assert.equal(got.result, 'UNKNOWN', JSON.stringify(output));
    assert.ok(!got.address);
  }
  // The right commit and branch with a word the runner never writes is no pass either.
  assert.equal((await read(complete({ ...pass(SHA, BRANCH), result: 'skipped' }))).result, 'UNKNOWN');
});

test('a pass that deployed needs an https address, and a pass that did not deploy shows none', async () => {
  for (const preview of [undefined, '', 'http://x-app-staging.sub.workers.dev', 'x-app-staging.sub.workers.dev', 'https://x app']) {
    assert.equal((await read(complete(pass(SHA, BRANCH, { deployed: true, preview })))).result, 'UNKNOWN', String(preview));
  }
  for (const extra of [{ deployed: false, app: 'untouched' }, { deployed: false, preview: PREVIEW }]) {
    const got = await read(complete(pass(SHA, BRANCH, extra)));
    assert.equal(got.result, 'SUCCESS');
    assert.ok(!got.address);
  }
});

test('on main the address is the production one, never the preview', async () => {
  const at = { sha: SHA, ref: MAIN };
  assert.equal((await read(complete(pass(SHA, MAIN, { deployed: true, production: LIVE, preview: PREVIEW })), at)).address, LIVE);
  assert.equal((await read(complete(pass(SHA, MAIN, { deployed: true, preview: PREVIEW })), at)).result, 'UNKNOWN');
});

// A clock that moves only when the wait sleeps.
function clock() {
  let ms = 0;
  return { now: () => ms, sleep: async (pause) => { ms += pause; }, seconds: () => ms / 1000 };
}
const wait = (api, time, { minutes = 20, grace = 60, interval = 10 } = {}) => waitRun(TARGET, { sha: SHA, ref: BRANCH }, { minutes, grace, interval, fetch: api.fetch, sleep: time.sleep, now: time.now });

test('a run that appears late, runs, then passes is SUCCESS', async () => {
  const [api, time] = [cloudflare(missing, instance({ status: 'queued' }), running, complete(pass(SHA, BRANCH))), clock()];
  assert.deepEqual(await wait(api, time), { result: 'SUCCESS', lines: [], address: PREVIEW });
  assert.equal(api.calls.length, 4);
  assert.ok(api.calls.every(({ url }) => url === api.calls[0].url), 'the wait read more than one run');
});

test('a run still going at the time limit is TIMEOUT', async () => {
  const [api, time] = [cloudflare(running), clock()];
  const got = await wait(api, time, { minutes: 2 });
  assert.equal(got.result, 'TIMEOUT');
  assert.match(got.lines.join('\n'), /still running/);
  assert.ok(time.seconds() >= 120 && api.calls.length > 1);
});

test('a run that never appears is UNKNOWN once the grace ends, never NONE', async () => {
  const [api, time] = [cloudflare(missing), clock()];
  const got = await wait(api, time, { grace: 30 });
  assert.equal(got.result, 'UNKNOWN');
  assert.ok(got.lines.join('\n').includes(SHA));
  assert.ok(time.seconds() >= 30 && time.seconds() < 20 * 60 && api.calls.length > 1, 'the grace was not waited out');
});

const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@example.test', '-c', 'commit.gpgsign=false', ...args], { cwd, encoding: 'utf8' }).trim();

// A checkout with `main` at one commit and branch `recipes` checked out one commit ahead: an
// Artifacts install unless another origin and record are given.
function checkout(t, { origin = REMOTE, record = { components: { delivery: DELIVERY } } } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-artifacts-run-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  git(dir, 'init', '-q', '-b', 'main');
  git(dir, 'remote', 'add', 'origin', origin);
  mkdirSync(join(dir, '.claude'));
  if (record) writeFileSync(join(dir, '.claude', '.wong-stack.json'), JSON.stringify(record));
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'first');
  git(dir, 'checkout', '-q', '-b', 'recipes');
  git(dir, 'commit', '-q', '--allow-empty', '-m', 'second');
  return { dir, head: git(dir, 'rev-parse', 'HEAD'), earlier: git(dir, 'rev-parse', 'main') };
}

const QUICK = { CLOUDFLARE_API_TOKEN: TOKEN, WAIT_FOR_CHECKS_GRACE: '0', WAIT_FOR_CHECKS_INTERVAL: '0', LIVE_LOOK_WAIT_SECONDS: '0', LIVE_LOOK_POLL_SECONDS: '0' };
// Runs one command in `dir`; no command ever prints the Cloudflare token.
async function command(dir, api, argv, env = QUICK) {
  const [out, err] = [[], []];
  const code = await cli(argv, { cwd: dir, env, out: (line) => out.push(line), err: (line) => err.push(line), fetch: api.fetch, sleep: async () => {} });
  assert.ok(![...out, ...err].join('\n').includes(TOKEN), 'the Cloudflare token was printed');
  return { code, out, err };
}

test('wait prints the RESULT line first, for the run of the exact HEAD on its branch', async (t) => {
  const { dir, head } = checkout(t);
  const id = await runId(head, BRANCH);
  const passing = holding({ [id]: complete(pass(head, BRANCH)) });
  assert.deepEqual(await command(dir, passing, ['wait', '1']), { code: 0, out: ['RESULT: SUCCESS'], err: [] });
  assert.ok(passing.calls[0].url.endsWith(`/accounts/${ACCOUNT}/workflows/${DELIVERY.workflow}/instances/${id}`));
  assert.equal(passing.calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.deepEqual((await command(dir, holding({ [id]: complete(fail(head, BRANCH)) }), ['wait'])).out, ['RESULT: FAILURE', '  checks failed', '  npm test', '  1 failing']);
  assert.deepEqual((await command(dir, holding({ [id]: complete({ commit: head, ref: BRANCH, result: 'none', deployed: false }) }), ['wait'])).out, ['RESULT: NONE']);
  assert.equal((await command(dir, holding({ [id]: running }), ['wait', '0'])).out[0], 'RESULT: TIMEOUT');
  assert.equal((await command(dir, cloudflare(broken), ['wait'])).out[0], 'RESULT: UNKNOWN');
});

test('a passing run of an earlier commit never answers for HEAD', async (t) => {
  const { dir, head, earlier } = checkout(t);
  // Only the earlier commit has a run, then a run under HEAD's name that checked the earlier commit.
  for (const api of [holding({ [await runId(earlier, BRANCH)]: complete(pass(earlier, BRANCH)) }), holding({ [await runId(head, BRANCH)]: complete(pass(earlier, BRANCH)) })]) {
    assert.deepEqual(await command(dir, api, ['preview']), { code: 0, out: [], err: [] });
    assert.equal((await command(dir, api, ['wait'])).out[0], 'RESULT: UNKNOWN');
  }
});

test('preview prints the address of the passing run of HEAD, and nothing on main', async (t) => {
  const { dir, head, earlier } = checkout(t);
  const id = await runId(head, BRANCH);
  const shown = await command(dir, holding({ [id]: complete(pass(head, BRANCH)) }), ['preview']);
  assert.deepEqual([shown.code, shown.out], [0, [PREVIEW]]);
  for (const answer of [running, complete(fail(head, BRANCH)), broken]) assert.deepEqual((await command(dir, holding({ [id]: answer }), ['preview'])).out, []);
  git(dir, 'checkout', '-q', 'main');
  const main = holding({ [await runId(earlier, MAIN)]: complete(pass(earlier, MAIN, { deployed: true, production: LIVE, preview: PREVIEW })) });
  assert.deepEqual((await command(dir, main, ['preview'])).out, []);
});

test('live prints the address the run on main deployed, or failed, none or unknown', async (t) => {
  const { dir } = checkout(t);
  const live = async (runs) => (await command(dir, holding(runs), ['live', SHA])).out;
  const id = await runId(SHA, MAIN);
  assert.deepEqual(await live({ [id]: complete(pass(SHA, MAIN, { deployed: true, production: LIVE })) }), [LIVE]);
  assert.deepEqual(await live({ [id]: complete(fail(SHA, MAIN)) }), ['failed']);
  assert.deepEqual(await live({ [id]: complete(pass(SHA, MAIN, { deployed: false, app: 'untouched' })) }), ['none']);
  assert.deepEqual(await live({ [id]: running }), ['unknown']);
  assert.deepEqual(await live({ [id]: broken }), ['unknown']);
  // The same commit's passing run on a branch is not the release.
  assert.deepEqual(await live({ [await runId(SHA, BRANCH)]: complete(pass(SHA, BRANCH)) }), ['unknown']);
});

test('result prints one word for the named run, without waiting', async (t) => {
  const { dir } = checkout(t);
  const api = holding({ [await runId(SHA, BRANCH)]: complete(pass(SHA, BRANCH)), [await runId(SHA, MAIN)]: running, [await runId(OTHER, BRANCH)]: complete(fail(OTHER, BRANCH)) });
  assert.deepEqual(await command(dir, api, ['result', SHA, BRANCH]), { code: 0, out: ['SUCCESS'], err: [] });
  assert.deepEqual((await command(dir, api, ['result', SHA, MAIN])).out, ['PENDING']);
  assert.deepEqual((await command(dir, api, ['result', OTHER, BRANCH])).out, ['FAILURE']);
  assert.deepEqual((await command(dir, cloudflare(broken), ['result', SHA, BRANCH])).out, ['UNKNOWN']);
  const [unseen] = (await command(dir, api, ['result', OTHER, MAIN])).out;
  assert.ok(!['SUCCESS', 'NONE'].includes(unseen), 'a run nobody started read as checked');
  assert.equal(api.calls.length, 4);
});

test('a command it does not know, or a commit id that is not whole, is a usage error', async (t) => {
  const { dir } = checkout(t);
  for (const argv of [[], ['publish'], ['live'], ['live', 'abc1234'], ['result', 'abc1234', BRANCH]]) {
    const got = await command(dir, holding({}), argv);
    assert.equal(got.code, 2, argv.join(' '));
    assert.deepEqual(got.out, [], argv.join(' '));
    assert.match(got.err.join('\n'), /^usage: /);
  }
});

test('a checkout that is not an Artifacts install is UNKNOWN, and Cloudflare is not asked', async (t) => {
  for (const other of [{ origin: GITHUB, record: null }, { origin: GITHUB }, { record: null }]) {
    const { dir, head } = checkout(t, other);
    const api = holding({ [await runId(head, BRANCH)]: complete(pass(head, BRANCH)), [await runId(head, MAIN)]: complete(pass(head, MAIN, { deployed: true, production: LIVE })) });
    assert.equal((await command(dir, api, ['wait'])).out[0], 'RESULT: UNKNOWN');
    assert.deepEqual((await command(dir, api, ['preview'])).out, []);
    assert.deepEqual((await command(dir, api, ['live', head])).out, ['unknown']);
    assert.deepEqual((await command(dir, api, ['result', head, BRANCH])).out, ['UNKNOWN']);
    assert.equal(api.calls.length, 0);
  }
});

test('wait takes the token from the primary .env, and is UNKNOWN with no token or no branch', async (t) => {
  const { dir, head } = checkout(t);
  const api = holding({ [await runId(head, BRANCH)]: complete(pass(head, BRANCH)) });
  const tokenless = { ...QUICK, CLOUDFLARE_API_TOKEN: '' };
  const without = await command(dir, api, ['wait'], tokenless);
  assert.equal(without.out[0], 'RESULT: UNKNOWN');
  assert.match(without.out.join('\n'), /CLOUDFLARE_API_TOKEN/);
  assert.equal(api.calls.length, 0);
  writeFileSync(join(dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\n`);
  assert.deepEqual((await command(dir, api, ['wait'], tokenless)).out, ['RESULT: SUCCESS']);
  assert.equal(api.calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  git(dir, 'checkout', '-q', '--detach');
  assert.equal((await command(dir, api, ['wait'])).out[0], 'RESULT: UNKNOWN');
  assert.deepEqual((await command(dir, api, ['preview'])).out, []);
});

// A local server standing in for Cloudflare's API: it answers the runs it holds and records each request.
async function server(t, runs) {
  const seen = [];
  const http = createServer((request, response) => {
    seen.push({ path: request.url, authorization: request.headers.authorization });
    const result = runs[request.url.split('/').at(-1)];
    response.writeHead(result ? 200 : 404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(result ? { success: true, errors: [], result } : { success: false, errors: [{ code: 10200 }], result: null }));
  });
  await new Promise((done) => http.listen(0, '127.0.0.1', done));
  t.after(() => { http.close(); http.closeAllConnections(); });
  return { seen, url: `http://127.0.0.1:${http.address().port}/client/v4` };
}

// Runs one of the repo's real save scripts inside `dir`, with a `gh` on PATH that only records being called.
async function shell(t, dir, script, args, api) {
  const bin = mkdtempSync(join(tmpdir(), 'wong-test-artifacts-run-bin-'));
  t.after(() => rmSync(bin, { recursive: true, force: true }));
  writeFileSync(join(bin, 'gh'), '#!/usr/bin/env bash\necho "$*" >> "$FAKE_GH_CALLS"\nexit 1\n');
  chmodSync(join(bin, 'gh'), 0o755);
  writeFileSync(join(bin, 'calls'), '');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_GH_CALLS: join(bin, 'calls'), WONG_CLOUDFLARE_API: api.url, CLOUDFLARE_API_TOKEN: TOKEN, WAIT_FOR_CHECKS_INTERVAL: '0', WAIT_FOR_CHECKS_GRACE: '0' };
  const child = spawn('bash', [join(scripts, script), ...args], { cwd: dir, env, stdio: ['ignore', 'pipe', 'pipe'] });
  let [stdout, stderr] = ['', ''];
  child.stdout.on('data', (chunk) => { stdout += chunk; });
  child.stderr.on('data', (chunk) => { stderr += chunk; });
  const status = await new Promise((done, failed) => { child.on('error', failed); child.on('close', done); });
  assert.ok(!`${stdout}${stderr}`.includes(TOKEN), 'the Cloudflare token was printed');
  return { status, stdout, stderr, gh: readFileSync(join(bin, 'calls'), 'utf8') };
}

test('wait-for-checks.sh reads the run of HEAD from Cloudflare and never calls gh', async (t) => {
  const { dir, head } = checkout(t);
  const id = await runId(head, BRANCH);
  const api = await server(t, { [id]: { status: 'complete', output: pass(head, BRANCH) } });
  const got = await shell(t, dir, 'wait-for-checks.sh', ['1'], api);
  assert.equal(got.status, 0, got.stderr);
  assert.equal(got.stdout, 'RESULT: SUCCESS\n');
  assert.equal(got.gh, '');
  assert.deepEqual(api.seen, [{ path: `/client/v4/accounts/${ACCOUNT}/workflows/${DELIVERY.workflow}/instances/${id}`, authorization: `Bearer ${TOKEN}` }]);
});

test('preview-url.sh prints the address the run of HEAD reported, without gh', async (t) => {
  const { dir, head, earlier } = checkout(t);
  const api = await server(t, { [await runId(head, BRANCH)]: { status: 'complete', output: pass(head, BRANCH) }, [await runId(earlier, BRANCH)]: { status: 'complete', output: pass(earlier, BRANCH, { deployed: true, preview: 'https://earlier-app-staging.sub.workers.dev' }) } });
  const got = await shell(t, dir, 'preview-url.sh', [], api);
  assert.equal(got.status, 0, got.stderr);
  assert.equal(got.stdout, `${PREVIEW}\n`);
  assert.equal(got.gh, '');
});
