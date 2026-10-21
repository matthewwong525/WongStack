// Kept checks: the file format, the replay against the practice site, and what may be kept. Request checks run for
// real; browser checks run through scripts/fixtures/verify-journeys/fake-browser.mjs. No test reaches the network.
import assert from 'node:assert/strict';
import { execFile, execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { classify, replay as replayHere } from '../../.agents/skills/verify/scripts/verify-journeys.mjs';
import { startSite } from '../fixtures/verify-eval/site.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/verify/scripts/verify-journeys.mjs');
const FAKE_BROWSER = join(repo, 'scripts/fixtures/verify-journeys/fake-browser.mjs');
// The practice site's twelve promises, used here as the project's own specs.
const SPEC = readFileSync(join(repo, 'scripts/fixtures/verify-eval/change/specs/notes/spec.md'), 'utf8');
const hasBrowser = spawnSync('agent-browser', ['doctor', '--json'], { timeout: 60000 }).status === 0;

// A stand-in for the staging rebuild: it logs each run, tells the site, and can be slow or fail.
const REBUILD = `import { appendFileSync } from 'node:fs';
appendFileSync(process.env.REBUILD_LOG, 'rebuild\\n');
if (process.env.REBUILD_SITE) await fetch(process.env.REBUILD_SITE + '/rebuilt').catch(() => {});
await new Promise(done => setTimeout(done, Number(process.env.REBUILD_SLEEP_MS ?? 0)));
process.exit(Number(process.env.REBUILD_EXIT ?? 0));
`;

const hash = value => createHash('sha256').update(value).digest('hex');
const requirementOf = scenario => SPEC.slice(0, SPEC.indexOf(`#### Scenario: ${scenario}\n`)).match(/### Requirement: .*/g).at(-1).slice('### Requirement: '.length);
const thenOf = scenario => SPEC.split(`#### Scenario: ${scenario}\n`)[1].split('\n').find(line => line.startsWith('- **THEN**'));

function journey(id, scenario, probe, steps, expect, more = {}) {
  return {
    format: 'verify-journey-1', id, scenario: { capability: 'notes', requirement: requirementOf(scenario), scenario }, thenDigest: hash(thenOf(scenario)),
    probe, sourcePaths: [], recordedAt: 'a'.repeat(40), steps, expect, ...more,
  };
}

// Kept checks for the practice site. Two hold a promise the site keeps, two hold one it quietly breaks.
const listCount = (more = {}) => journey('list-count', 'The list API counts its notes', 'request', [['GET', '/api/notes']], [{ step: 1, status: 200, includes: '"count":6' }], { writes: false, ...more });
const apiNoTitle = () => journey('api-no-title', 'Creating without a title answers 422', 'request',
  [['POST', '/api/notes', '{"title":""}'], ['GET', '/api/notes']], [{ step: 1, status: 422, includes: 'Title is required' }, { step: 2, includes: '"count":6' }]);
const emptyTitle = (more = {}) => journey('empty-title', 'Submitting with no title is rejected', 'browser',
  [['open', '{url}/new'], ['wait', '--load', 'networkidle'], ['find', 'role', 'button', 'click', '--name', 'Save'], ['wait', '--load', 'networkidle']], [{ text: 'Title is required' }], more);
const archived = (expect = [{ text: 'Trip ideas' }, { gone: 'Garden plan' }, { path: '/archived' }]) => journey('archived', 'An archived note moves to Archived', 'browser',
  [['open', '{url}/'], ['wait', '--load', 'networkidle'], ['find', 'role', 'button', 'click', '--name', 'Archive Trip ideas'], ['wait', '--load', 'networkidle'], ['open', '{url}/archived'], ['wait', '--load', 'networkidle']], expect);
// A read-only request to one edit page, so the site's log shows the order the checks ran in.
const editPage = (id, note, more = {}) => journey(id, 'The list API counts its notes', 'request', [['GET', `/notes/${note}/edit`]], [{ step: 1, status: 200 }], { writes: false, ...more });

// A throwaway project on a branch named `change`, a run folder as preflight leaves it, and the fake
// browser and rebuild first on PATH.
function project(t, { facts = 'SEEDED=yes\nPLAYGROUND=yes\n' } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'wong-test-journeys-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'repo');
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  const git = (...args) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, encoding: 'utf8' }).trim();
  write('openspec/specs/notes/spec.md', SPEC);
  write('app/notes.js', '// notes\n');
  write('scripts/reset-staging-d1.mjs', REBUILD);
  git('init', '-q');
  git('symbolic-ref', 'HEAD', 'refs/heads/main');
  git('add', '.');
  git('commit', '-q', '-m', 'start');
  git('checkout', '-q', '-b', 'change');
  for (const path of ['app/notes.js', 'wiki/notes.md', 'openspec/notes.md', '.agents/verification/recipe.json', 'CHANGELOG.md', 'package-lock.json', 'app/notes.test.js', 'scripts/tests/notes.mjs']) write(path, '// changed on the branch\n');
  git('add', '.');
  git('commit', '-q', '-m', 'change');
  const runDir = join(base, 'wong-verify-run');
  mkdirSync(join(runDir, 'journeys'), { recursive: true });
  if (facts) writeFileSync(join(runDir, 'staging-facts'), facts);
  const bin = join(base, 'bin');
  const state = join(base, 'browser');
  for (const dir of [bin, state]) mkdirSync(dir);
  writeFileSync(join(bin, 'agent-browser'), `#!/usr/bin/env bash\nexec "${process.execPath}" "${FAKE_BROWSER}" "$@"\n`);
  chmodSync(join(bin, 'agent-browser'), 0o755);
  const rebuildLog = join(base, 'rebuilds.txt');
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, FAKE_BROWSER_STATE: state, REBUILD_LOG: rebuildLog };
  for (const key of ['CF_ACCESS_CLIENT_ID', 'CF_ACCESS_CLIENT_SECRET', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_ACCOUNT_ID']) delete env[key];
  const keptDir = join(root, '.agents/verification/journeys');
  const kept = (check, dir = keptDir) => {
    const file = join(dir, check.scenario.capability, `${check.id}.json`);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(check, null, 2));
    return file;
  };
  return {
    base, root, runDir, bin, state, env, write, git, kept, keptDir,
    rebuilds: () => (existsSync(rebuildLog) ? readFileSync(rebuildLog, 'utf8').split('\n').filter(Boolean).length : 0),
    browserCalls: () => (existsSync(join(state, 'calls.txt')) ? readFileSync(join(state, 'calls.txt'), 'utf8') : ''),
  };
}

// The site answers from this process, so the script runs beside it, never with a blocking call.
const cli = (f, args, env = {}) => new Promise(done => execFile(process.execPath, [script, ...args, '--root', f.root], { env: { ...f.env, ...env }, encoding: 'utf8' },
  (error, stdout, stderr) => done({ status: error ? error.code : 0, stdout, stderr })));

// One replay: its printed lines, and replay.json as { <id>: { result, reason } }.
async function replay(f, url, args = [], env = {}) {
  const out = await cli(f, ['replay', '--run-dir', f.runDir, '--url', url, ...args], env);
  assert.equal(out.status, 0, out.stderr);
  const from = args.includes('--from') ? args[args.indexOf('--from') + 1] : f.runDir;
  const written = JSON.parse(readFileSync(join(from, 'replay.json'), 'utf8'));
  return { ...out, written, byId: Object.fromEntries(written.results.map(entry => [entry.key.split('/')[1], entry])) };
}

async function practiceSite(t) {
  const site = await startSite();
  t.after(site.close);
  return { ...site, paths: () => site.observations.map(seen => seen.path) };
}

test('check calls each kept file ok, stale, or unreadable against the written promises', async t => {
  const f = project(t);
  f.kept(listCount());
  f.kept({ ...listCount(), id: 'promise-changed', thenDigest: hash('- **THEN** something the spec no longer says') });
  f.kept({ ...listCount(), id: 'scenario-gone', scenario: { capability: 'notes', requirement: 'Notes are listed with a count', scenario: 'A scenario since removed' } });
  f.write('.agents/verification/journeys/notes/broken.json', '{');
  const out = await cli(f, ['check']);
  assert.equal(out.status, 1, 'an unreadable file fails the check');
  assert.deepEqual(out.stdout.trim().split('\n'), [
    'unreadable notes/broken — it is not valid JSON',
    'ok notes/list-count',
    'stale notes/promise-changed — its written promise changed since it was recorded',
    'stale notes/scenario-gone — its scenario is no longer in openspec/specs/',
    'JOURNEYS=ok 1, stale 2, unreadable 1',
  ]);
  rmSync(join(f.keptDir, 'notes/broken.json'));
  assert.equal((await cli(f, ['check'])).status, 0, 'a stale file is not an error');
});

test('check passes a project with no kept checks', async t => {
  const f = project(t);
  const out = await cli(f, ['check']);
  assert.deepEqual([out.status, out.stdout], [0, 'JOURNEYS=ok 0, stale 0, unreadable 0\n']);
});

test('a file outside the format or its closed set of expectations is unreadable, and says why', t => {
  const f = project(t);
  const cases = [
    ['not-an-object', () => [], /not a JSON object/],
    ['format', () => ({ ...listCount(), format: 'verify-journey-2' }), /not a verify-journey-1 file/],
    ['unknown-field', () => ({ ...listCount(), promise: 'a second copy of the THEN' }), /a field the format does not have/],
    ['Bad_Id', () => ({ ...listCount(), id: 'Bad_Id' }), /id is malformed/],
    ['scenario', () => ({ ...listCount(), scenario: { ...listCount().scenario, promise: 'copied' } }), /scenario reference is malformed/],
    ['digest', () => ({ ...listCount(), thenDigest: 'abc' }), /thenDigest is malformed/],
    ['probe', () => ({ ...listCount(), probe: 'state' }), /neither browser nor request/],
    ['writes', () => ({ ...listCount(), writes: 'no' }), /writes is neither true nor false/],
    ['site-address', () => ({ ...listCount(), site: 'https://landing.example.com' }), /site is not a short name/],
    ['site-blank', () => ({ ...listCount(), site: '' }), /site is not a short name/],
    ['recorded', () => ({ ...listCount(), recordedAt: 'yesterday' }), /sourcePaths or recordedAt is malformed/],
    ['no-steps', () => ({ ...listCount(), steps: [] }), /a step is malformed/],
    ['host', () => ({ ...emptyTitle(), steps: [['open', 'https://preview.example.com/new']] }), /names a site/],
    ['full-url', () => ({ ...listCount(), steps: [['GET', 'https://preview.example.com/api/notes']] }), /names a site/],
    ['no-expect', () => ({ ...listCount(), expect: [] }), /no expectation/],
    ['browser-status', () => ({ ...emptyTitle(), expect: [{ status: 200 }] }), /outside the set/],
    ['two-keys', () => ({ ...emptyTitle(), expect: [{ text: 'a', gone: 'b' }] }), /outside the set/],
    ['step-range', () => ({ ...listCount(), expect: [{ step: 2, status: 200 }] }), /outside the set/],
    ['step-only', () => ({ ...listCount(), expect: [{ step: 1 }] }), /outside the set/],
    ['status-text', () => ({ ...listCount(), expect: [{ step: 1, status: '200' }] }), /outside the set/],
    ['assertion', () => ({ ...listCount(), expect: [{ step: 1, matches: '^\\{' }] }), /outside the set/],
  ];
  for (const [id, build] of cases) f.write(`.agents/verification/journeys/notes/${id}.json`, JSON.stringify(build()));
  f.write('.agents/verification/journeys/elsewhere/list-count.json', JSON.stringify(listCount()));
  const found = Object.fromEntries(classify(f.root).map(entry => [entry.key, entry]));
  for (const [id, , reason] of cases) {
    assert.equal(found[`notes/${id}`].state, 'unreadable', id);
    assert.match(found[`notes/${id}`].reason, reason, id);
  }
  assert.match(found['elsewhere/list-count'].reason, /not at <capability>\/<id>\.json/);
});

test('a request check for a kept promise replays the same, and one for a broken promise comes back changed', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(listCount());
  f.kept(apiNoTitle());
  const out = await replay(f, `${site.url}/`);
  assert.equal(out.byId['list-count'].result, 'same');
  assert.equal(out.byId['api-no-title'].result, 'changed', 'the site answers 422 and saves a blank note anyway');
  assert.match(out.byId['api-no-title'].reason, /^request 2's answer no longer holds/);
  assert.match(out.stdout, /^same notes\/list-count$/m);
  assert.match(out.stdout, /^changed notes\/api-no-title — request 2/m);
  assert.match(out.stdout, /^REPLAY=same 1, changed 1, skipped 0, not-run 0; \d+s$/m);
  assert.equal(out.written.format, 'verify-replay-1');
  assert.equal(out.written.head, f.git('rev-parse', 'HEAD'));
  assert.equal(out.written.url, site.url, 'the address is kept without its closing slash');
  assert.ok(existsSync(join(f.runDir, out.byId['list-count'].evidence, '01-response.txt')), 'the evidence stays in the run folder');
  assert.deepEqual(f.git('status', '--porcelain', '--', 'app'), '', 'a replay leaves the project alone');
});

test('a wrong status is a change too, and so is a request that gets no answer', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept({ ...listCount(), expect: [{ step: 1, status: 201 }] });
  assert.equal((await replay(f, site.url)).byId['list-count'].reason, 'request 1 answered 200, not 201');
  const nowhere = await replay(f, 'http://127.0.0.1:9');
  assert.equal(nowhere.byId['list-count'].reason, 'request 1 answered nothing, not 201');
});

test('browser checks replay through the runner: text, gone, and the landed path', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(archived());
  f.kept(emptyTitle());
  const out = await replay(f, site.url);
  assert.equal(out.byId.archived.result, 'same', out.stdout);
  assert.equal(out.byId['empty-title'].result, 'changed', 'the site shows "Title required"');
  assert.equal(out.byId['empty-title'].reason, 'the page no longer shows "Title is required"');
  assert.ok(site.paths().includes('/new'), '{url} became the preview address');
  assert.match(f.browserCalls(), /^verify-replay-\w+-0\d batch$/m, 'the runner drove the browser, in a session of this replay');
});

test('a browser check names what changed: text still there, another page, or a step that no longer works', async t => {
  const f = project(t);
  const reasonFor = async check => {
    const site = await practiceSite(t);
    rmSync(f.keptDir, { recursive: true, force: true });
    f.kept(check);
    return (await replay(f, site.url)).byId[check.id];
  };
  const stillThere = await reasonFor(archived([{ gone: 'Trip ideas' }]));
  assert.deepEqual([stillThere.result, stillThere.reason], ['changed', 'the page still shows "Trip ideas"']);
  assert.equal((await reasonFor(archived([{ path: '/' }]))).reason, 'it landed on /archived, not /');
  const renamed = emptyTitle({ steps: [['open', '{url}/new'], ['find', 'role', 'button', 'click', '--name', 'Create']] });
  assert.equal((await reasonFor(renamed)).reason, 'step 2 no longer works (find role button click --name Create)');
});

test('checks for files the branch changed run first, then the rest in an order the head commit picks', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  const touched = { sourcePaths: ['app/notes.js'] };
  f.kept(editPage('a-writes', 1, { ...touched, writes: undefined }));
  f.kept(editPage('b-reads', 2, touched));
  const rest = ['c', 'd', 'e'];
  rest.forEach((id, index) => f.kept(editPage(id, index + 3, { sourcePaths: ['app/untouched.js'] })));
  const out = await replay(f, site.url, [], { REBUILD_SITE: site.url });
  assert.equal(out.written.results.filter(entry => entry.result === 'same').length, 5, out.stdout);
  const offset = parseInt(f.git('rev-parse', 'HEAD').slice(0, 8), 16) % rest.length;
  const rotated = [...rest.slice(offset), ...rest.slice(0, offset)].map(id => `/notes/${rest.indexOf(id) + 3}/edit`);
  // The read-only touched check, a rebuild before the one that writes, a rebuild after it, then the rest.
  assert.deepEqual(site.paths(), ['/notes/2/edit', '/rebuilt', '/notes/1/edit', '/rebuilt', ...rotated]);
  assert.equal(f.rebuilds(), 2);
});

test('a file nearly every change touches moves no check to the front', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  // Recorded before the rule: the release notes and a test file sit in its list, and the branch changed both.
  f.kept(editPage('a-shared', 1, { sourcePaths: ['CHANGELOG.md', 'app/notes.test.js', 'package-lock.json'] }));
  f.kept(editPage('z-touched', 2, { sourcePaths: ['app/notes.js'] }));
  await replay(f, site.url);
  assert.deepEqual(site.paths(), ['/notes/2/edit', '/notes/1/edit']);
});

test('--only replays the named checks alone', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(listCount());
  f.kept(editPage('edit-one', 1));
  const out = await replay(f, site.url, ['--only', 'edit-one']);
  assert.deepEqual(Object.keys(out.byId), ['edit-one']);
  assert.deepEqual(site.paths(), ['/notes/1/edit']);
});

test('the time limit stops the replay, and every check it did not reach is named', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(journey('hangs', 'The list API counts its notes', 'browser', [['open', '{url}/'], ['wait', '60000']], [{ text: 'Notes' }], { writes: false, sourcePaths: ['app/notes.js'] }));
  f.kept(listCount());
  const started = Date.now();
  const out = await replay(f, site.url, ['--budget', '1']);
  assert.ok(Date.now() - started < 20000, 'the replay outran its limit');
  assert.deepEqual([out.byId.hangs.result, out.byId.hangs.reason], ['not-run', 'the 1-second limit was reached']);
  assert.deepEqual([out.byId['list-count'].result, out.byId['list-count'].reason], ['not-run', 'the 1-second limit was reached']);
  assert.match(out.stdout, /^REPLAY=same 0, changed 0, skipped 0, not-run 2; /m);
  assert.match(f.browserCalls(), /^verify-replay-\w+-01 close$/m, 'the stopped journey\'s browser session is closed');
  assert.ok(!site.paths().includes('/api/notes'), 'a check past the limit never ran');
});

test('one check gets its own limit, and the checks after it still run', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(journey('hangs', 'The list API counts its notes', 'browser', [['open', '{url}/'], ['wait', '60000']], [{ text: 'Notes' }], { writes: false, sourcePaths: ['app/notes.js'] }));
  f.kept(listCount());
  // This one runs in this process, to shorten a limit the command line does not offer.
  const path = process.env.PATH;
  t.after(() => {
    process.env.PATH = path;
    delete process.env.FAKE_BROWSER_STATE;
  });
  Object.assign(process.env, { PATH: f.env.PATH, FAKE_BROWSER_STATE: f.state });
  const { results, summary } = await replayHere({ root: f.root, runDir: f.runDir, url: site.url, checkSeconds: 1, budgetSeconds: 60 });
  assert.deepEqual(results.map(entry => [entry.key, entry.result, entry.reason]), [
    ['notes/hangs', 'changed', 'it took longer than 1 seconds'],
    ['notes/list-count', 'same', undefined],
  ]);
  assert.match(summary, /^REPLAY=same 1, changed 1, skipped 0, not-run 0; /);
});

test('a check that writes starts from a rebuild, and the limit counts the rebuild', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(apiNoTitle());
  const out = await replay(f, site.url, ['--budget', '1'], { REBUILD_SLEEP_MS: '8000' });
  assert.equal(f.rebuilds(), 1);
  assert.deepEqual([out.byId['api-no-title'].result, out.byId['api-no-title'].reason], ['not-run', 'the 1-second limit was reached']);
  assert.deepEqual(site.paths(), [], 'the check did not run on data nobody rebuilt');
});

test('a failed rebuild stops the checks after it, and none of them counts as a pass', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(listCount());
  f.kept(apiNoTitle());
  f.kept(editPage('edit-one', 1, { writes: true }));
  const out = await replay(f, site.url, [], { REBUILD_EXIT: '1' });
  assert.equal(out.byId['list-count'].result, 'same', 'a read-only check ran before any rebuild');
  for (const id of ['api-no-title', 'edit-one']) {
    assert.deepEqual([out.byId[id].result, out.byId[id].reason], ['not-run', 'a staging rebuild failed (rebuild.log in the replay folder says why)'], id);
  }
  assert.equal(f.rebuilds(), 1, 'no second rebuild was tried');
});

test('where staging was not rebuilt from the seed, nothing replays and the reason is given', async t => {
  const site = await practiceSite(t);
  for (const [facts, reason] of [
    ['SEEDED=no this repo has no staging database of its own to rebuild\nPLAYGROUND=no\n', 'staging was not rebuilt from the sample data (this repo has no staging database of its own to rebuild)'],
    [null, 'staging was not rebuilt from the sample data (this check made no rebuild)'],
  ]) {
    const f = project(t, { facts });
    f.kept(listCount());
    f.kept(apiNoTitle());
    const out = await replay(f, site.url);
    for (const entry of out.written.results) assert.deepEqual([entry.result, entry.reason], ['not-run', reason]);
    assert.match(out.stdout, /^REPLAY=same 0, changed 0, skipped 0, not-run 2; /m);
  }
  assert.deepEqual(site.paths(), []);
});

test('a check that writes needs a staging that is safe to write to; a read-only one does not', async t => {
  const f = project(t, { facts: 'SEEDED=yes\nPLAYGROUND=no\n' });
  const site = await practiceSite(t);
  f.kept(listCount());
  f.kept(apiNoTitle());
  const out = await replay(f, site.url);
  assert.equal(out.byId['list-count'].result, 'same');
  assert.deepEqual([out.byId['api-no-title'].result, out.byId['api-no-title'].reason], ['not-run', 'it writes, and staging is not a safe place to write']);
  assert.equal(f.rebuilds(), 0);
});

test('a login wall stops the replay: no check behind it is graded', async t => {
  const f = project(t);
  let requests = 0;
  const wall = createServer((req, res) => {
    requests += 1;
    res.writeHead(302, { Location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login' }).end();
  });
  await new Promise(done => wall.listen(0, '127.0.0.1', done));
  t.after(() => wall.close());
  f.kept(listCount());
  f.kept(editPage('edit-one', 1));
  const out = await replay(f, `http://127.0.0.1:${wall.address().port}`);
  for (const entry of out.written.results) assert.deepEqual([entry.result, entry.reason], ['not-run', 'the preview answered with a login wall']);
  assert.equal(requests, 1, 'the checks after the wall were not sent');
});

test('a promise the change rewrites is skipped; a changed, removed, or unreadable one is named and never run', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  const change = join(f.base, 'change');
  mkdirSync(join(change, 'specs/notes'), { recursive: true });
  mkdirSync(join(change, 'specs/empty'));
  writeFileSync(join(change, 'specs/notes/spec.md'), [
    '# Spec Delta', '', '## ADDED Requirements', '', '### Requirement: Notes are listed with a count', '', '## MODIFIED Requirements', '',
    '### Requirement: Notes can be created', '', '#### Scenario: Submitting with no title is rejected', '', '- **WHEN** the form is sent empty', '- **THEN** the form says so', '',
    '## REMOVED Requirements', '', '### Requirement: Notes can be archived or deleted', '', '**Reason**: archiving moved elsewhere', '',
  ].join('\n'));
  f.kept(listCount());
  f.kept(emptyTitle());
  f.kept(archived());
  f.kept({ ...editPage('promise-changed', 1), thenDigest: hash('- **THEN** an older promise') });
  f.kept({ ...editPage('scenario-gone', 2), scenario: { capability: 'notes', requirement: 'Notes are listed with a count', scenario: 'A scenario since removed' } });
  f.write('.agents/verification/journeys/notes/broken.json', '{');
  const out = await replay(f, site.url, ['--change-root', change]);
  assert.deepEqual(Object.fromEntries(Object.entries(out.byId).map(([id, entry]) => [id, entry.result])), {
    broken: 'not-run', 'list-count': 'same', 'empty-title': 'skipped', archived: 'skipped', 'promise-changed': 'changed', 'scenario-gone': 'not-run',
  });
  assert.equal(out.byId.broken.reason, 'unreadable: it is not valid JSON');
  assert.match(out.byId['empty-title'].reason, /this change rewrites its promise/);
  assert.equal(out.byId['promise-changed'].reason, 'its written promise changed since it was recorded');
  assert.equal(out.byId['scenario-gone'].reason, 'its scenario is no longer in openspec/specs/');
  assert.deepEqual(site.paths(), ['/api/notes'], 'only the unchanged promise was replayed; an added requirement skips nothing');
  assert.match(out.stdout, /^REPLAY=same 1, changed 1, skipped 2, not-run 2; /m);
});

// ── a second site ─────────────────────────────────────────────────────────────

const SECOND = 'landing-preview';
const onSecond = (id, note, more = {}) => editPage(id, note, { site: SECOND, ...more });

// A stand-in for gh: it logs its arguments, then prints these commit statuses, or fails with this message.
function stubGh(f, answer) {
  const calls = join(f.base, 'gh-calls.txt');
  const act = typeof answer === 'string' ? `echo '${answer}' >&2\nexit 1` : `cat <<'JSON'\n${JSON.stringify(answer)}\nJSON`;
  writeFileSync(join(f.bin, 'gh'), `#!/usr/bin/env bash\necho "$*" >>"${calls}"\n${act}\n`);
  chmodSync(join(f.bin, 'gh'), 0o755);
  return () => (existsSync(calls) ? readFileSync(calls, 'utf8').trim().split('\n') : []);
}

// A site that answers every request with "ok" and keeps the headers it was sent.
async function recorder(t) {
  const seen = [];
  const server = createServer((req, res) => {
    seen.push(req.headers);
    res.end('ok');
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  t.after(() => new Promise(done => { server.closeAllConnections(); server.close(done); }));
  return { url: `http://127.0.0.1:${server.address().port}`, seen };
}

test('a check whose site has no preview for this commit is not run, never changed, and nothing is opened for it', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  // Newest first, as GitHub lists them: none is a successful https status named landing-preview.
  const calls = stubGh(f, [
    { context: SECOND, state: 'pending', target_url: 'https://pending.example.com' },
    { context: 'another-preview', state: 'success', target_url: 'https://another.example.com' },
    { context: SECOND, state: 'success', target_url: 'http://not-https.example.com' },
  ]);
  f.kept(listCount());
  f.kept(onSecond('on-landing', 1));
  f.kept({ ...onSecond('landing-promise-changed', 2), thenDigest: hash('- **THEN** an older promise') });
  const out = await replay(f, site.url);
  for (const id of ['on-landing', 'landing-promise-changed']) {
    const { site: named, result, reason, url, evidence } = out.byId[id];
    assert.deepEqual([named, result, reason, url, evidence], [SECOND, 'not-run', 'no landing-preview address was posted for this change', undefined, undefined], id);
  }
  assert.equal(out.byId['list-count'].result, 'same', 'the main preview\'s checks replay as before');
  assert.deepEqual(site.paths(), ['/api/notes']);
  const replayDir = join(f.runDir, dirname(dirname(out.byId['list-count'].evidence)));
  assert.deepEqual(readdirSync(replayDir).filter(name => name.endsWith('.log')), ['01.log'], 'no runner started for a check with no preview');
  assert.match(out.stdout, /^not-run notes\/on-landing — no landing-preview address was posted for this change$/m);
  assert.match(out.stdout, /^REPLAY=same 1, changed 0, skipped 0, not-run 2; /m);
  assert.deepEqual(calls(), [`api repos/{owner}/{repo}/commits/${f.git('rev-parse', 'HEAD')}/statuses?per_page=100`], 'the statuses are read once for every check');

  // A promise the change rewrites is skipped first, with no lookup.
  const change = join(f.base, 'change');
  mkdirSync(join(change, 'specs/notes'), { recursive: true });
  writeFileSync(join(change, 'specs/notes/spec.md'), `## MODIFIED Requirements\n\n### Requirement: ${requirementOf('The list API counts its notes')}\n`);
  const rewritten = await replay(f, site.url, ['--change-root', change]);
  assert.deepEqual(rewritten.written.results.map(entry => entry.result), ['skipped', 'skipped', 'skipped']);
  assert.equal(calls().length, 1);
});

test('with an address, a named check replays on its own site and the others on the preview', async t => {
  const f = project(t);
  const main = await practiceSite(t);
  const second = await practiceSite(t);
  const calls = stubGh(f, 'an address given with --site-url needs no lookup');
  f.kept(listCount());
  f.kept(onSecond('on-landing', 1));
  f.kept(emptyTitle({ site: SECOND, writes: false, expect: [{ text: 'Title required' }] }));
  const out = await replay(f, main.url, ['--site-url', `${SECOND}=${second.url}/`]);
  assert.deepEqual(out.written.results.map(entry => entry.result), ['same', 'same', 'same'], out.stdout);
  assert.deepEqual(main.paths(), ['/api/notes'], 'the preview saw only its own check');
  assert.ok(second.paths().includes('/notes/1/edit') && second.paths().includes('/new'), 'request and browser checks both went to the named site');
  assert.ok(!second.paths().includes('/api/notes'));
  for (const id of ['on-landing', 'empty-title']) assert.deepEqual([out.byId[id].site, out.byId[id].url], [SECOND, second.url], 'the address is kept without its closing slash');
  assert.deepEqual([out.byId['list-count'].site, out.byId['list-count'].url, out.written.url], [undefined, undefined, main.url]);
  assert.deepEqual(calls(), []);
});

test('the lookup takes the newest successful https status of the site\'s name', async t => {
  const f = project(t);
  stubGh(f, [
    { context: SECOND, state: 'pending', target_url: 'https://pending.example.com' },
    { context: 'another-preview', state: 'success', target_url: 'https://another.example.com' },
    { context: SECOND, state: 'success', target_url: 'https://127.0.0.1:9/' },
    { context: SECOND, state: 'success', target_url: 'https://older.example.com' },
  ]);
  f.kept(onSecond('on-landing', 1));
  // Nothing listens there, so the check ran, against that address, and got no answer.
  const { 'on-landing': ran } = (await replay(f, 'http://127.0.0.1:9')).byId;
  assert.deepEqual([ran.url, ran.result, ran.reason], ['https://127.0.0.1:9', 'changed', 'request 1 answered nothing, not 200']);
});

test('a lookup that fails reads not-run with the reason, and the preview\'s checks still run', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  const calls = stubGh(f, 'gh: Not Found (HTTP 404)');
  f.kept(listCount());
  f.kept(onSecond('on-landing', 1));
  f.kept(onSecond('on-landing-too', 2));
  const out = await replay(f, site.url);
  for (const id of ['on-landing', 'on-landing-too']) {
    assert.deepEqual([out.byId[id].result, out.byId[id].reason], ['not-run', 'the landing-preview address could not be read (gh: Not Found (HTTP 404))'], id);
  }
  assert.equal(out.byId['list-count'].result, 'same');
  assert.equal(calls().length, 1, 'a failed lookup is not tried again');
  assert.deepEqual(site.paths(), ['/api/notes']);
});

// This install's own preview, served from `site` through a stand-in curl and the fake browser, so no test leaves the
// machine: the runner sends the Access key only to the live app's own https site.
function ownPreview(f, site) {
  const own = 'https://pr-1-app-staging.acct.workers.dev';
  f.write('.claude/.wong-stack.json', JSON.stringify({ components: { memory: { accountId: 'a', databaseId: 'd', worker: 'https://app.acct.workers.dev/_memory' } } }));
  const curl = execFileSync('bash', ['-c', 'command -v curl'], { encoding: 'utf8' }).trim();
  writeFileSync(join(f.bin, 'curl'), `#!/usr/bin/env bash
from='${own}' to='${site.url}' args=()
for arg; do args+=("\${arg/#"$from"/"$to"}"); done
exec "${curl}" "\${args[@]}"
`);
  chmodSync(join(f.bin, 'curl'), 0o755);
  return { url: own, env: { FAKE_BROWSER_RESOLVE: `${own}=${site.url}` } };
}

test('a named site is sent no Access credential; the preview still is', async t => {
  const f = project(t);
  const main = await recorder(t);
  const second = await recorder(t);
  const own = ownPreview(f, main);
  const page = (id, more) => journey(id, 'The list API counts its notes', 'browser', [['open', '{url}/']], [{ text: 'ok' }], { writes: false, ...more });
  f.kept(listCount({ expect: [{ step: 1, status: 200 }] }));
  f.kept(page('main-page'));
  f.kept(onSecond('on-landing', 1));
  f.kept(page('landing-page', { site: SECOND }));
  const out = await replay(f, own.url, ['--site-url', `${SECOND}=${second.url}`], { ...own.env, CF_ACCESS_CLIENT_ID: 'id.access', CF_ACCESS_CLIENT_SECRET: 'access-secret-value' });
  assert.deepEqual(out.written.results.map(entry => entry.result), ['same', 'same', 'same', 'same'], out.stdout);
  const sent = site => site.seen.map(headers => [headers['cf-access-client-id'], headers['cf-access-client-secret']]);
  assert.ok(sent(main).some(([id, secret]) => id === 'id.access' && secret === 'access-secret-value'), 'the preview\'s request check carried the credential');
  assert.deepEqual(sent(second), [[undefined, undefined], [undefined, undefined]], 'the named site saw two requests and no credential');
  assert.equal(f.browserCalls().match(/ batch$/gm).length, 2);
  assert.equal(f.browserCalls().match(/ open --headers$/gm).length, 1, 'only the preview\'s browser was given the Access headers');
  assert.doesNotMatch(f.browserCalls(), / set$/m, 'no header is set for every host');
});

test('a preview off this install\'s own site is replayed without the Access credential', async t => {
  const f = project(t);
  const main = await recorder(t);
  f.write('.claude/.wong-stack.json', JSON.stringify({ components: { memory: { accountId: 'a', databaseId: 'd', worker: 'https://app.acct.workers.dev/_memory' } } }));
  f.kept(listCount({ expect: [{ step: 1, status: 200 }] }));
  const out = await replay(f, main.url, [], { CF_ACCESS_CLIENT_ID: 'id.access', CF_ACCESS_CLIENT_SECRET: 'access-secret-value' });
  assert.equal(out.byId['list-count'].result, 'same', out.stdout);
  assert.deepEqual(main.seen.map(headers => headers['cf-access-client-id']), [undefined], 'a loopback http address is not this install\'s own');
});

test('a login wall stops the checks of its own site, and no other site\'s', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  let requests = 0;
  const wall = createServer((req, res) => {
    requests += 1;
    res.writeHead(302, { Location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login' }).end();
  });
  await new Promise(done => wall.listen(0, '127.0.0.1', done));
  t.after(() => wall.close());
  const walled = `http://127.0.0.1:${wall.address().port}`;
  const results = out => Object.fromEntries(Object.entries(out.byId).map(([id, entry]) => [id, entry.reason ?? entry.result]));
  // The named site's checks go first: they were recorded against a file the branch changed.
  const first = { sourcePaths: ['app/notes.js'] };
  f.kept(onSecond('landing-a', 1, first));
  f.kept(onSecond('landing-b', 2, first));
  f.kept(listCount());
  f.kept(editPage('edit-one', 1));
  assert.deepEqual(results(await replay(f, site.url, ['--site-url', `${SECOND}=${walled}`])), {
    'landing-a': 'the preview answered with a login wall', 'landing-b': 'the preview answered with a login wall', 'list-count': 'same', 'edit-one': 'same',
  });
  assert.equal(requests, 1, 'the named site\'s second check was not sent');
  // And the other way round: the preview's wall leaves the named site's checks running.
  assert.deepEqual(results(await replay(f, walled, ['--site-url', `${SECOND}=${site.url}`])), {
    'landing-a': 'same', 'landing-b': 'same', 'list-count': 'the preview answered with a login wall', 'edit-one': 'the preview answered with a login wall',
  });
  assert.equal(requests, 2);
});

test('a real browser replays a kept promise the same and a broken one changed', { skip: !hasBrowser && 'no browser is installed here', timeout: 180000 }, async t => {
  const f = project(t);
  const site = await practiceSite(t);
  f.kept(emptyTitle());
  f.kept(journey('saved-badge', 'Saving shows a Saved badge', 'browser',
    [['open', '{url}/notes/1/edit'], ['wait', '--load', 'networkidle'], ['find', 'role', 'button', 'click', '--name', 'Save']], [{ text: 'Saved' }, { path: '/notes/1/edit' }], { writes: false }));
  const out = await replay(f, site.url, [], { PATH: process.env.PATH });
  assert.equal(out.byId['saved-badge'].result, 'same', out.stdout);
  assert.deepEqual([out.byId['empty-title'].result, out.byId['empty-title'].reason], ['changed', 'the page no longer shows "Title is required"']);
});

const PREVIEW = 'http://127.0.0.1:4000';

// A journey as the walk leaves it in the run folder.
function walked(f, id, scenario, { batch, requests, meta = {} }) {
  const file = name => join(f.runDir, 'journeys', `${id}.${name}`);
  writeFileSync(file('meta.json'), JSON.stringify({ requirement: requirementOf(scenario), scenario, probe: batch ? 'browser' : 'request', ...meta }));
  if (batch) writeFileSync(file('batch.json'), JSON.stringify(batch));
  if (requests) writeFileSync(file('requests.txt'), requests);
}
const keep = (f, id, expect, args = [], env = {}) => cli(f, ['keep', '--run-dir', f.runDir, '--url', PREVIEW, '--id', id, '--expect', JSON.stringify(expect), ...args], env);
const candidate = (f, name) => JSON.parse(readFileSync(join(f.runDir, 'keep/notes', `${name}.json`), 'utf8'));

test('keep turns a walked browser journey into a candidate with no screenshot and no host name', async t => {
  const f = project(t);
  const shot = join(f.runDir, 'evidence/01-empty-title/01-landing.png');
  walked(f, '01-empty-title', 'Submitting with no title is rejected', { batch: [
    ['open', `${PREVIEW}/new`], ['wait', '--load', 'networkidle'], ['screenshot', shot, '--full'],
    ['find', 'role', 'button', 'click', '--name', 'Save'], ['wait', '--url', `${PREVIEW}?saved`], ['screenshot', shot, '--full'],
  ] });
  const out = await keep(f, '01-empty-title', [{ text: 'Title required' }]);
  assert.deepEqual([out.status, out.stdout], [0, 'KEEP=candidate notes/submitting-with-no-title-is-rejected\n']);
  assert.deepEqual(candidate(f, 'submitting-with-no-title-is-rejected'), {
    format: 'verify-journey-1',
    id: 'submitting-with-no-title-is-rejected',
    scenario: { capability: 'notes', requirement: 'Notes can be created', scenario: 'Submitting with no title is rejected' },
    thenDigest: hash('- **THEN** the form shows "Title is required" and nothing is saved'),
    probe: 'browser',
    writes: false,
    sourcePaths: ['app/notes.js'],
    recordedAt: f.git('rev-parse', 'HEAD'),
    steps: [['open', '{url}/new'], ['wait', '--load', 'networkidle'], ['find', 'role', 'button', 'click', '--name', 'Save'], ['wait', '--url', '{url}?saved']],
    expect: [{ text: 'Title required' }],
  });
  assert.equal(existsSync(f.keptDir), false, 'a candidate is not yet in the project');
  await keep(f, '01-empty-title', [{ text: 'Title required' }], ['--writes']);
  assert.equal(candidate(f, 'submitting-with-no-title-is-rejected').writes, true);
});

test('keep turns a request probe into rows, and marks one that sends anything but a read as writing', async t => {
  const f = project(t);
  walked(f, '02-list', 'The list API counts its notes', { requests: `# the list\nGET\t${PREVIEW}/api/notes\nHEAD\t/api/notes\nGET\t${PREVIEW}\n` });
  await keep(f, '02-list', [{ step: 1, status: 200 }]);
  const list = candidate(f, 'the-list-api-counts-its-notes');
  assert.deepEqual([list.probe, list.writes, list.steps], ['request', false, [['GET', '/api/notes'], ['HEAD', '/api/notes'], ['GET', '/']]]);
  walked(f, '03-create', 'Creating with a title answers 201', { requests: 'POST\t/api/notes\t{"title":"Milk"}\n' });
  await keep(f, '03-create', [{ step: 1, status: 201, includes: 'Milk' }]);
  const create = candidate(f, 'creating-with-a-title-answers-201');
  assert.deepEqual([create.writes, create.steps], [true, [['POST', '/api/notes', '{"title":"Milk"}']]]);
});

test('two requirements that share a scenario name get two kept names, and a named capability settles a tie', async t => {
  const f = project(t);
  const twin = '### Requirement: First\n\n#### Scenario: It works\n\n- **THEN** one\n\n### Requirement: Second\n\n#### Scenario: It works\n\n- **THEN** two\n';
  f.write('openspec/specs/alpha/spec.md', twin);
  f.write('openspec/specs/beta/spec.md', twin);
  const write = meta => {
    writeFileSync(join(f.runDir, 'journeys/04-twin.meta.json'), JSON.stringify({ requirement: 'Second', scenario: 'It works', ...meta }));
    writeFileSync(join(f.runDir, 'journeys/04-twin.requests.txt'), 'GET\t/\n');
  };
  write({});
  const tie = await keep(f, '04-twin', [{ step: 1, status: 200 }]);
  assert.deepEqual([tie.status, tie.stdout], [1, 'KEEP=refused 04-twin — its scenario is in more than one capability; name one as `capability` in its meta file\n']);
  write({ capability: 'beta' });
  const named = await keep(f, '04-twin', [{ step: 1, status: 200 }]);
  assert.equal(named.stdout, 'KEEP=candidate beta/second-it-works\n');
  const file = JSON.parse(readFileSync(join(f.runDir, 'keep/beta/second-it-works.json'), 'utf8'));
  assert.equal(file.thenDigest, hash('- **THEN** two'));
});

test('keep refuses what must never be kept, names the reason, and writes nothing', async t => {
  const f = project(t);
  const open = ['open', `${PREVIEW}/new`];
  const text = [{ text: 'Title required' }];
  const scenario = 'Submitting with no title is rejected';
  const SECRET = 'staging-only-secret-value';
  const refusals = [
    ['a saved login', { batch: [open, ['auth', 'login', 'my-app']] }, text, /a step uses a saved login/],
    ['a token', { batch: [open, ['find', 'label', 'Key', 'fill', 'ghp_abcdefghijklmnopqrstuvwxyz0123']] }, text, /a step holds a credential/],
    ['a .env value', { batch: [open, ['find', 'label', 'Key', 'fill', SECRET]] }, text, /a step holds a credential/],
    ['a snapshot reference', { batch: [open, ['click', '@e5']] }, text, /a snapshot reference, which dies with the page/],
    ['a file in the run folder', { batch: [open, ['pdf', join(f.runDir, 'evidence/page.pdf')]] }, text, /saves a file into the run folder/],
    ['no expectation', { batch: [open] }, [], /no expectation the passing evidence showed/],
    ['an expectation outside the set', { batch: [open] }, [{ visible: '#title' }], /outside the set/],
    ['another site', { batch: [['open', 'http://127.0.0.1:40001/new']] }, text, /names a site/],
    ['a request to another site', { requests: 'GET\thttps://api.example.com/v1\n' }, [{ step: 1, status: 200 }], /names a site/],
    ['both kinds of journey', { batch: [open], requests: 'GET\t/\n' }, text, /neither or both/],
    ['no journey', {}, text, /neither or both/],
    ['a batch that is not commands', { batch: { open: '/new' } }, text, /not a list of commands/],
    ['a scenario not in the specs', { batch: [open], meta: { scenario: 'A promise nobody wrote' } }, text, /not in openspec\/specs\//],
    ['no meta', { batch: [open], meta: { requirement: '' } }, text, /names no requirement and scenario/],
  ];
  for (const [index, [label, files, expect, reason]] of refusals.entries()) {
    const id = `${String(index + 10)}-refused`;
    walked(f, id, scenario, files);
    const out = await keep(f, id, expect, [], { CF_ACCESS_CLIENT_SECRET: SECRET });
    assert.equal(out.status, 1, label);
    assert.match(out.stdout, new RegExp(`^KEEP=refused ${id} — `), label);
    assert.match(out.stdout, reason, label);
    assert.ok(!out.stdout.includes(SECRET), 'a refusal never prints the credential');
  }
  assert.equal(existsSync(join(f.runDir, 'keep')), false);
});

test('a candidate is installed only after it replayed the same, alone, from a rebuild', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  const keepHere = (id, expect) => cli(f, ['keep', '--run-dir', f.runDir, '--url', site.url, '--id', id, '--expect', JSON.stringify(expect)]);
  const install = () => cli(f, ['keep', '--install', '--run-dir', f.runDir]);
  walked(f, '01-list', 'The list API counts its notes', { requests: `GET\t${site.url}/api/notes\n` });
  walked(f, '02-empty-title', 'Submitting with no title is rejected', { batch: [['open', `${site.url}/new`], ['find', 'role', 'button', 'click', '--name', 'Save']] });
  await keepHere('01-list', [{ step: 1, status: 200, includes: '"count":6' }]);
  await keepHere('02-empty-title', [{ text: 'Title is required' }]);
  // An older kept check whose scenario is gone, and one whose promise only changed.
  const gone = f.kept({ ...listCount(), id: 'scenario-gone', scenario: { capability: 'notes', requirement: 'Notes are listed with a count', scenario: 'A scenario since removed' } });
  const stale = f.kept({ ...listCount(), id: 'promise-changed', thenDigest: hash('- **THEN** an older promise') });

  const early = await install();
  assert.deepEqual(early.stdout.trim().split('\n'), [
    'left out notes/submitting-with-no-title-is-rejected — it was not replayed alone first',
    'left out notes/the-list-api-counts-its-notes — it was not replayed alone first',
    'removed notes/scenario-gone — its scenario is no longer in openspec/specs/',
    'REMOVED=.agents/verification/journeys/notes/scenario-gone.json',
    'KEEP=kept 0, left out 2, removed 1',
  ]);
  assert.deepEqual([existsSync(gone), existsSync(stale)], [false, true], 'only a kept check with no scenario left is removed');

  const proof = await replay(f, site.url, ['--from', join(f.runDir, 'keep')]);
  assert.equal(proof.byId['the-list-api-counts-its-notes'].result, 'same');
  assert.equal(proof.byId['submitting-with-no-title-is-rejected'].result, 'changed', 'a recording that does not replay');
  assert.equal(f.rebuilds(), 2, 'each proof starts from a rebuild, read-only or not');
  assert.equal(existsSync(join(f.runDir, 'replay.json')), false, 'a proof is written beside its candidates');

  const done = await install();
  assert.deepEqual(done.stdout.trim().split('\n'), [
    'left out notes/submitting-with-no-title-is-rejected — the page no longer shows "Title is required"',
    'kept notes/the-list-api-counts-its-notes',
    'KEEP=kept 1, left out 1, removed 0',
  ]);
  const installed = join(f.keptDir, 'notes/the-list-api-counts-its-notes.json');
  const proven = readFileSync(installed, 'utf8');
  assert.equal(proven, readFileSync(join(f.runDir, 'keep/notes/the-list-api-counts-its-notes.json'), 'utf8'));
  assert.equal(existsSync(join(f.keptDir, 'notes/submitting-with-no-title-is-rejected.json')), false);
  assert.match((await cli(f, ['check'])).stdout, /^ok notes\/the-list-api-counts-its-notes$/m);

  // A candidate rewritten after its proof is a different recording: it needs its own proof.
  await keepHere('01-list', [{ step: 1, status: 200 }]);
  assert.match((await install()).stdout, /^left out notes\/the-list-api-counts-its-notes — it was not replayed alone first$/m);
  assert.equal(readFileSync(installed, 'utf8'), proven);
});

test('install names each kept check it replaced with other steps or expectations, and none it re-kept the same', async t => {
  const f = project(t);
  const site = await practiceSite(t);
  const name = 'the-list-api-counts-its-notes';
  const path = `.agents/verification/journeys/notes/${name}.json`;
  const rekeep = async expect => {
    walked(f, '01-list', 'The list API counts its notes', { requests: `GET\t${site.url}/api/notes\n` });
    await cli(f, ['keep', '--run-dir', f.runDir, '--url', site.url, '--id', '01-list', '--expect', JSON.stringify(expect)]);
    await replay(f, site.url, ['--from', join(f.runDir, 'keep')]);
    return (await cli(f, ['keep', '--install', '--run-dir', f.runDir])).stdout.trim().split('\n');
  };
  const full = [{ step: 1, status: 200, includes: '"count":6' }];

  assert.deepEqual(await rekeep(full), [`kept notes/${name}`, 'KEEP=kept 1, left out 0, removed 0'], 'a new kept check replaces nothing');

  // The same steps and expectations, recorded at a later commit.
  f.write('app/later.js', '// later\n');
  f.git('add', '.');
  f.git('commit', '-q', '-m', 'later');
  const before = JSON.parse(readFileSync(join(f.root, path), 'utf8'));
  assert.deepEqual(await rekeep(full), [`kept notes/${name}`, 'KEEP=kept 1, left out 0, removed 0']);
  assert.notEqual(JSON.parse(readFileSync(join(f.root, path), 'utf8')).recordedAt, before.recordedAt, 'it was re-recorded');

  assert.deepEqual(await rekeep([{ step: 1, status: 200 }]), [`kept notes/${name}`, `REPLACED=${path}`, 'KEEP=kept 1, left out 0, removed 0']);
  assert.deepEqual(JSON.parse(readFileSync(join(f.root, path), 'utf8')).expect, [{ step: 1, status: 200 }]);
});

test('keep --site records the site and no address, and the proof replays on that site', async t => {
  const f = project(t);
  const second = await practiceSite(t);
  const name = 'submitting-with-no-title-is-rejected';
  walked(f, '01-empty-title', 'Submitting with no title is rejected', { batch: [['open', `${second.url}/new`], ['find', 'role', 'button', 'click', '--name', 'Save']] });
  const keepOn = site => cli(f, ['keep', '--run-dir', f.runDir, '--url', second.url, '--site', site, '--id', '01-empty-title', '--expect', '[{"text":"Title required"}]']);
  const refused = await keepOn('https://landing.example.com');
  assert.deepEqual([refused.status, refused.stdout], [1, 'KEEP=refused 01-empty-title — its site is not a short name of letters, digits, and - _ .\n']);
  assert.equal((await keepOn(SECOND)).stdout, `KEEP=candidate notes/${name}\n`);
  const written = readFileSync(join(f.runDir, 'keep/notes', `${name}.json`), 'utf8');
  assert.deepEqual([candidate(f, name).site, candidate(f, name).steps[0]], [SECOND, ['open', '{url}/new']]);
  assert.ok(!written.includes('127.0.0.1'), 'the kept file holds no address');

  // The proof is told the preview is somewhere nothing answers, so a pass came from the named site.
  const proof = await replay(f, 'http://127.0.0.1:9', ['--from', join(f.runDir, 'keep'), '--site-url', `${SECOND}=${second.url}`]);
  assert.deepEqual([proof.byId[name].result, proof.byId[name].url], ['same', second.url], proof.stdout);
  assert.match((await cli(f, ['keep', '--install', '--run-dir', f.runDir])).stdout, new RegExp(`^kept notes/${name}$`, 'm'));
  assert.equal(readFileSync(join(f.keptDir, 'notes', `${name}.json`), 'utf8'), written);
  assert.match((await cli(f, ['check'])).stdout, new RegExp(`^ok notes/${name}$`, 'm'));
});

// ── the command line ──────────────────────────────────────────────────────────

test('a command with a missing or wrong argument is a usage error', async t => {
  const f = project(t);
  for (const args of [[], ['walk'], ['check', 'extra'], ['replay'], ['replay', '--run-dir', f.runDir], ['replay', '--run-dir', f.runDir, '--url', PREVIEW, '--budget', 'soon'],
    ['replay', '--run-dir', f.runDir, '--url', PREVIEW, '--site-url', 'landing-preview'], ['replay', '--run-dir', f.runDir, '--url', PREVIEW, '--site-url', 'landing preview=https://x.example.com'],
    ['replay', '--run-dir', f.runDir, '--url', PREVIEW, '--site-url', 'landing-preview=x.example.com'],
    ['replay', '--run-dir', join(f.base, 'missing'), '--url', PREVIEW], ['keep', '--run-dir', f.runDir, '--url', PREVIEW, '--id', 'x'],
    ['keep', '--run-dir', f.runDir, '--url', PREVIEW, '--id', 'x', '--expect', '{'], ['keep', '--install']]) {
    const out = await cli(f, args);
    assert.equal(out.status, 2, args.join(' '));
    assert.match(out.stderr, /usage: verify-journeys\.mjs check/);
  }
  const outside = await new Promise(done => execFile(process.execPath, [script, 'check'], { cwd: tmpdir(), env: { ...f.env, GIT_CEILING_DIRECTORIES: tmpdir() }, encoding: 'utf8' },
    (error, stdout, stderr) => done({ status: error?.code, stderr })));
  assert.equal(outside.status, 2);
  assert.match(outside.stderr, /not inside a git repository/);
});
