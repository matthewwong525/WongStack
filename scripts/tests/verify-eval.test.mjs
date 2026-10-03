import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { startSite } from '../fixtures/verify-eval/site.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const fixture = join(repo, 'scripts/fixtures/verify-eval');
const key = JSON.parse(readFileSync(join(fixture, 'key.json'), 'utf8'));
const PLANTED = 'Submitting with no title is rejected';

// ── The practice site ─────────────────────────────────────────────────────────

async function site(t) {
  const { url, close } = await startSite();
  t.after(close);
  const get = path => fetch(url + path).then(response => response.text());
  const api = async (method, path, body) => {
    const init = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) init.body = JSON.stringify(body);
    const response = await fetch(url + path, init);
    return { status: response.status, text: await response.text() };
  };
  // A form post, then the page the redirect lands on, as a browser would show it.
  const submit = async (path, fields = {}) => {
    const response = await fetch(url + path, { method: 'POST', body: new URLSearchParams(fields) });
    return response.text();
  };
  const notes = async () => JSON.parse(await get('/api/notes'));
  const shownCount = async () => Number((await get('/')).match(/<p id="count">(\d+) notes<\/p>/)[1]);
  return { url, get, api, submit, notes, shownCount };
}

test('the key names the spec\'s nine scenarios: five broken, four working', () => {
  const spec = readFileSync(join(fixture, 'change/specs/notes/spec.md'), 'utf8');
  const scenarios = [...spec.matchAll(/^#### Scenario: (.+)$/gm)].map(match => match[1]);
  assert.deepEqual(scenarios.toSorted(), Object.keys(key).toSorted());
  assert.equal(Object.values(key).filter(truth => truth === 'broken').length, 5);
  assert.equal(Object.values(key).filter(truth => truth === 'works').length, 4);
});

test('planted: an empty title shows the message and saves a note anyway', async t => {
  const { submit, notes } = await site(t);
  const before = (await notes()).count;
  assert.match(await submit('/notes', { title: '' }), /Title is required/);
  const after = await notes();
  assert.equal(after.count, before + 1);
  assert.equal(after.notes.at(-1).title, '');
});

test('planted: a deleted note leaves the list and the shown count stays', async t => {
  const { get, submit, shownCount } = await site(t);
  const before = await shownCount();
  assert.match(await get('/'), /Trip ideas/);
  assert.doesNotMatch(await submit('/notes/3/delete'), /Trip ideas/);
  assert.equal(await shownCount(), before);
});

test('planted: creating with no title answers 422 and never names the title', async t => {
  const { api, notes } = await site(t);
  const before = (await notes()).count;
  const { status, text } = await api('POST', '/api/notes', {});
  assert.equal(status, 422);
  assert.equal(text, '{"error":"invalid"}');
  assert.equal((await notes()).count, before);
});

test('planted: a new note shows in the list once and is gone on a reload', async t => {
  const { get, submit, notes } = await site(t);
  assert.match(await submit('/notes', { title: 'Dentist on Friday' }), /Dentist on Friday/);
  assert.doesNotMatch(await get('/'), /Dentist on Friday/);
  assert.ok((await notes()).notes.every(note => note.title !== 'Dentist on Friday'));
});

test('planted: a search lists the matches first and the other notes far below', async t => {
  const { get } = await site(t);
  const page = await get('/?q=plumber');
  const [top, below] = page.split(/<div style="height:\d{4}px"><\/div>/);
  assert.match(top, /Call the plumber/);
  assert.match(top, /Plumber invoice/);
  assert.doesNotMatch(top, /Trip ideas/);
  assert.match(below, /Trip ideas/);
});

test('control: a renamed note shows its new title in the list', async t => {
  const { get, api } = await site(t);
  assert.match(await get('/notes/3/edit'), /value="Trip ideas"/);
  assert.equal((await api('PUT', '/api/notes/3', { title: 'Trip to Lisbon' })).status, 200);
  const list = await get('/');
  assert.match(list, /Trip to Lisbon/);
  assert.doesNotMatch(list, /Trip ideas/);
});

test('control: the list API counts its notes, after a delete and an archive too', async t => {
  const { submit, api, notes } = await site(t);
  await submit('/notes/1/delete');
  await submit('/notes/2/archive');
  await api('POST', '/api/notes', { title: 'Water the plants' });
  const list = await notes();
  assert.equal(list.count, list.notes.length);
  assert.deepEqual(list.notes.map(note => note.id), [3, 4, 5, 6, 7]);
});

test('control: an archived note moves to Archived and the shown count drops', async t => {
  const { get, submit, shownCount } = await site(t);
  const before = await shownCount();
  assert.doesNotMatch(await submit('/notes/5/archive'), /Book club picks/);
  assert.match(await get('/archived'), /Book club picks/);
  assert.equal(await shownCount(), before - 1);
});

// Runs the edit page's own script against stand-in elements, a fetch that reaches the site, and a
// timer the test fires by hand.
test('control: the edit page shows its Saved badge 800 ms after a save', async t => {
  const { url, get } = await site(t);
  const page = await get('/notes/1/edit');
  assert.match(page, /<span id="saved" role="status" hidden>Saved<\/span>/);
  const elements = { title: { value: 'Groceries, renamed' }, saved: { hidden: true }, save: { addEventListener: (_, click) => { elements.save.click = click; } } };
  const timers = [];
  runInNewContext(page.match(/<script>([\s\S]+)<\/script>/)[1], {
    document: { getElementById: id => elements[id] },
    fetch: (path, init) => fetch(url + path, init),
    setTimeout: (run, ms) => timers.push({ run, ms }),
  });
  await elements.save.click();
  assert.deepEqual([elements.saved.hidden, timers.map(timer => timer.ms)], [true, [800]]);
  timers[0].run();
  assert.equal(elements.saved.hidden, false);
  assert.match(await get('/'), /Groceries, renamed/);
});

test('the site answers 404 for an unknown page or note, and 422 for a rename to nothing', async t => {
  const { api } = await site(t);
  assert.equal((await api('GET', '/nowhere')).status, 404);
  assert.equal((await api('GET', '/notes/99/edit')).status, 404);
  assert.equal((await api('PUT', '/api/notes/99', { title: 'x' })).status, 404);
  assert.deepEqual(await api('PUT', '/api/notes/1', { title: ' ' }), { status: 422, text: '{"error":"Title is required"}' });
});

test('nothing the site serves names a planted mistake', async t => {
  const { get, submit } = await site(t);
  const pages = [await get('/'), await get('/?q=plumber'), await get('/new'), await get('/notes/1/edit'), await get('/archived'), await submit('/notes', { title: '' })];
  for (const page of pages) assert.doesNotMatch(page, /planted|mistake|broken|<!--/i);
});

// ── The harness ───────────────────────────────────────────────────────────────

// A stand-in agent: gives every scenario in the folder it was started in the same verdict, leaves
// out any scenario named after the verdict, and reports what it was given as `claude -p` would.
// As `none` it writes no verdicts and prints no JSON.
const FAKE_AGENT = `import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const [verdict, ...omit] = process.argv.slice(2);
const prompt = readFileSync(0, 'utf8');
const files = readdirSync('.', { recursive: true }).filter(file => !file.startsWith('.git'));
const spec = readFileSync('openspec/changes/practice-notes/specs/notes/spec.md', 'utf8');
const scenarios = [...spec.matchAll(/^#### Scenario: (.+)$/gm)].map(match => match[1]).filter(name => !omit.includes(name));
if (verdict === 'none') { console.log('I could not finish.'); process.exit(1); }
writeFileSync(join(process.env.RUN_DIR, 'verdicts.json'), JSON.stringify(scenarios.map(scenario => ({ scenario, verdict, reason: 'fake' }))));
const answer = await fetch(process.env.URL + '/api/notes').then(response => response.status);
console.log(JSON.stringify({ total_cost_usd: 0.25, modelUsage: { 'fake-model': {} }, cwd: process.cwd(), runDir: process.env.RUN_DIR, files, prompt, answer }));
`;

function harness(t, agentArgs, flags = []) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-verify-eval-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, 'fake-agent.mjs'), FAKE_AGENT);
  const out = join(dir, 'out');
  const agentCmd = `"${process.execPath}" "${join(dir, 'fake-agent.mjs')}" ${agentArgs}`;
  const result = spawnSync(process.execPath, [join(repo, 'scripts/eval-verify.mjs'), '--runs', '1', '--out', out, '--agent-cmd', agentCmd, ...flags], { cwd: dir, encoding: 'utf8' });
  const read = path => JSON.parse(readFileSync(join(out, path), 'utf8'));
  return { ...result, dir, out, read };
}

const counts = ({ caught, missed, falseAlarms, asked }) => ({ caught, missed, falseAlarms, asked });

test('an agent that passes everything catches nothing and misses all five', t => {
  const { status, stdout, stderr, read } = harness(t, 'pass', ['--label', 'pass-all']);
  assert.equal(status, 0, stderr);
  const results = read('results.json');
  assert.deepEqual(counts(results.runs[0]), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual(counts(results.total), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual([results.label, results.model, results.planted, results.working], ['pass-all', 'fake-model', 5, 4]);
  assert.match(results.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(results.runs[0].costUsd, 0.25);
  assert.equal(results.runs[0].scenarios[PLANTED].outcome, 'missed');
  assert.match(stdout, /\| 1 \| 0\/5 \| 5 \| 0\/4 \| 0 \| \d+\.\d \| \$0\.25 \|/);
  assert.match(stdout, /\| total \| 0\/5 \| 5 \| 0\/4 \| 0 \|/);
  assert.equal(read('run-1/verdicts.json').length, 9);
});

test('an agent that fails everything catches all five and raises four false alarms', t => {
  const { status, stderr, read } = harness(t, 'fail');
  assert.equal(status, 0, stderr);
  assert.deepEqual(counts(read('results.json').runs[0]), { caught: 5, missed: 0, falseAlarms: 4, asked: 0 });
});

test('a planted mistake with no verdict counts as missed', t => {
  const { status, stderr, read } = harness(t, `fail "${PLANTED}"`);
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(counts(run), { caught: 4, missed: 1, falseAlarms: 4, asked: 0 });
  assert.deepEqual(run.scenarios[PLANTED], { key: 'broken', verdict: null, outcome: 'missed' });
});

test('an ask is never counted as caught', t => {
  const { status, stderr, read } = harness(t, 'ask');
  assert.equal(status, 0, stderr);
  assert.deepEqual(counts(read('results.json').runs[0]), { caught: 0, missed: 0, falseAlarms: 0, asked: 9 });
});

test('an agent that writes no verdicts misses all five and fails the run', t => {
  const { status, stdout, stderr, read } = harness(t, 'none');
  assert.equal(status, 1);
  assert.match(stderr, /run 1: the agent wrote no readable verdicts\.json/);
  const results = read('results.json');
  assert.deepEqual(counts(results.runs[0]), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual([results.model, results.runs[0].costUsd, results.total.costUsd], ['not reported', null, null]);
  assert.match(stdout, /\| total \| 0\/5 \| 5 \| 0\/4 \| 0 \| \d+\.\d \| n\/a \|/);
});

test('the agent works outside the repo, with the promises and without the answers', t => {
  const reference = join(mkdtempSync(join(tmpdir(), 'wong-test-verify-eval-ref-')), 'candidate.md');
  t.after(() => rmSync(dirname(reference), { recursive: true, force: true }));
  writeFileSync(reference, '# A candidate\n');
  const { status, stderr, read } = harness(t, 'pass', ['--runs', '2', '--reference', reference]);
  assert.equal(status, 0, stderr);
  const results = read('results.json');
  assert.equal(results.runs.length, 2);
  assert.deepEqual(counts(results.total), { caught: 0, missed: 10, falseAlarms: 0, asked: 0 });
  assert.equal(results.total.costUsd, 0.5);
  for (const run of ['run-1', 'run-2']) {
    const seen = read(`${run}/agent-output.json`);
    assert.ok(relative(repo, seen.cwd).startsWith('..'), `${seen.cwd} is inside the repo`);
    assert.ok(relative(repo, seen.runDir).startsWith('..'), `${seen.runDir} is inside the repo`);
    assert.deepEqual(seen.files.filter(file => /key\.json|site\.mjs/.test(file)), []);
    assert.ok(seen.files.includes('openspec/changes/practice-notes/specs/notes/spec.md'));
    assert.equal(seen.files.filter(file => file.endsWith('.md')).length, 1);
    assert.equal(seen.answer, 200);
    assert.ok(seen.prompt.includes(`reference at ${reference} `));
    assert.ok(seen.prompt.includes(`bash ${join(repo, '.agents/skills/verify/scripts/verify-staging.sh')} run "${seen.runDir}"`));
    assert.doesNotMatch(seen.prompt, /key\.json|fixtures|planted|broken/);
    assert.equal(existsSync(seen.cwd), false);
    assert.equal(existsSync(seen.runDir), false);
  }
});

test('the default reference is the live walkthrough', t => {
  const { read } = harness(t, 'pass');
  assert.equal(read('results.json').reference, join(repo, '.agents/skills/verify/references/walkthrough.md'));
  assert.equal(read('results.json').label, 'live');
});

test('a bad --runs, --label, or --reference is a usage error', t => {
  for (const flags of [['--runs', '0'], ['--label', 'a/b'], ['--reference', 'no-such-file.md']]) {
    const { status, stderr } = harness(t, 'pass', flags);
    assert.equal(status, 2, flags.join(' '));
    assert.match(stderr, /usage: eval-verify\.mjs/);
  }
});
