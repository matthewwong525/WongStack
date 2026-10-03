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

test('the key names the spec\'s twelve scenarios: five broken, four working, three with a part no page can show', () => {
  const spec = readFileSync(join(fixture, 'change/specs/notes/spec.md'), 'utf8');
  const scenarios = [...spec.matchAll(/^#### Scenario: (.+)$/gm)].map(match => match[1]);
  assert.deepEqual(scenarios.toSorted(), Object.keys(key).toSorted());
  assert.equal(Object.values(key).filter(truth => truth === 'broken').length, 5);
  assert.equal(Object.values(key).filter(truth => truth === 'works').length, 4);
  assert.equal(Object.values(key).filter(truth => truth === 'partial').length, 3);
});

const titles = page => [...page.matchAll(/<span class="title">(.*?)<\/span>/g)].map(match => match[1]);

test('planted: an empty title saves nothing and shows "Title required", two words', async t => {
  const { submit, notes } = await site(t);
  const before = await notes();
  const page = await submit('/notes', { title: '' });
  assert.match(page, /<p role="alert">Title required<\/p>/);
  assert.doesNotMatch(page, /Title is required/);
  assert.deepEqual(await notes(), before);
});

test('planted: a delete drops the shown count by one and removes the note below the chosen one', async t => {
  const { get, submit, shownCount } = await site(t);
  const before = await shownCount();
  assert.deepEqual(titles(await submit('/notes/3/delete')), ['Groceries for the week', 'Call the plumber', 'Trip ideas', 'Book club picks', 'Garden plan']);
  assert.equal(await shownCount(), before - 1);
  // The last note has none below it, so the one above goes.
  await submit('/notes/6/delete');
  assert.deepEqual(titles(await get('/')), ['Groceries for the week', 'Call the plumber', 'Trip ideas', 'Garden plan']);
  assert.equal(await shownCount(), before - 2);
});

test('planted: creating with no title answers 422, names the title, and creates a blank note anyway', async t => {
  const { api, notes } = await site(t);
  const before = (await notes()).count;
  assert.deepEqual(await api('POST', '/api/notes', {}), { status: 422, text: '{"error":"Title is required"}' });
  const after = await notes();
  assert.equal(after.count, before + 1);
  assert.equal(after.notes.at(-1).title, '');
});

test('planted: a new note shows as typed once and loses its last character after a reload', async t => {
  const { get, submit, notes } = await site(t);
  assert.equal(titles(await submit('/notes', { title: 'Dentist on Friday' })).at(-1), 'Dentist on Friday');
  assert.equal(titles(await get('/')).at(-1), 'Dentist on Frida');
  assert.equal((await notes()).notes.at(-1).title, 'Dentist on Frida');
});

test('planted: a search lists the matches, then the first note that does not match as the last row', async t => {
  const { get } = await site(t);
  const page = await get('/?q=plumber');
  assert.deepEqual(titles(page), ['Call the plumber', 'Plumber invoice', 'Groceries for the week']);
  assert.equal(page.match(/<ul/g).length, 1);
  assert.deepEqual(titles(await get('/?q=week')), ['Groceries for the week', 'Call the plumber']);
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
  await submit('/notes/3/archive');
  await api('POST', '/api/notes', { title: 'Water the plants' });
  const list = await notes();
  assert.equal(list.count, list.notes.length);
  assert.deepEqual(list.notes.map(note => note.id), [1, 4, 5, 6, 7]);
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

// The key says "partial" only while the part a page can show works and nothing shows the rest.
test('partial: an API create answers 201 with the note and its id', async t => {
  const { api, notes } = await site(t);
  assert.deepEqual(await api('POST', '/api/notes', { title: 'Water the plants' }), { status: 201, text: '{"id":7,"title":"Water the plants","body":""}' });
  assert.deepEqual((await notes()).notes.at(-1), { id: 7, title: 'Water the plants', body: '' });
});

test('partial: an API rename answers 200 with the new title', async t => {
  const { api, notes } = await site(t);
  assert.deepEqual(await api('PUT', '/api/notes/2', { title: 'Call the roofer' }), { status: 200, text: '{"id":2,"title":"Call the roofer","body":""}' });
  assert.equal((await notes()).notes[1].title, 'Call the roofer');
});

test('partial: archiving a note drops the shown count by one', async t => {
  const { submit, shownCount } = await site(t);
  const before = await shownCount();
  await submit('/notes/2/archive');
  assert.equal(await shownCount(), before - 1);
});

test('partial: no page or address shows an email, an audit log, or a nightly job', async t => {
  const { get, api, submit } = await site(t);
  await api('POST', '/api/notes', { title: 'Water the plants' });
  await api('PUT', '/api/notes/2', { title: 'Call the roofer' });
  const pages = [await submit('/notes/3/archive'), await get('/archived'), await get('/notes/1/edit'), await get('/api/notes')];
  for (const page of pages) assert.doesNotMatch(page, /email|mail|audit|log\b|index|nightly|job/i);
  for (const kind of ['audit', 'audit-log', 'log', 'logs', 'email', 'emails', 'outbox', 'jobs', 'index', 'reindex', 'search']) {
    for (const path of [`/${kind}`, `/api/${kind}`, `/admin/${kind}`]) assert.equal((await api('GET', path)).status, 404, path);
  }
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

test('the build notes mark all twelve scenarios done and give nothing away', () => {
  const notes = readFileSync(join(fixture, 'build-notes.md'), 'utf8');
  for (const scenario of Object.keys(key)) assert.ok(notes.includes(`- [x] **${scenario}.**`), scenario);
  assert.equal(Object.keys(key).length, 12);
  assert.match(notes, /All twelve scenarios .+ clicked through locally and all twelve behaved/);
  assert.doesNotMatch(notes, /key\.json|fixtures|planted|mistake|broken|partial|partly/i);
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
const partials = ({ named, overclaimed, other }) => ({ named, overclaimed, other });
const PARTIAL = 'Archiving a note emails the owner';
const WORKING = 'A renamed note shows its new title';

test('an agent that passes everything catches nothing, misses all five, and overclaims all three', t => {
  const { status, stdout, stderr, read } = harness(t, 'pass', ['--label', 'pass-all']);
  assert.equal(status, 0, stderr);
  const results = read('results.json');
  assert.deepEqual(counts(results.runs[0]), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual(counts(results.total), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual(partials(results.runs[0]), { named: 0, overclaimed: 3, other: 0 });
  assert.deepEqual(partials(results.total), { named: 0, overclaimed: 3, other: 0 });
  assert.deepEqual([results.label, results.model, results.planted, results.working, results.partial], ['pass-all', 'fake-model', 5, 4, 3]);
  assert.match(results.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(results.runs[0].costUsd, 0.25);
  assert.equal(results.runs[0].scenarios[PLANTED].outcome, 'missed');
  assert.deepEqual(results.runs[0].scenarios[PARTIAL], { key: 'partial', verdict: 'pass', outcome: 'overclaimed' });
  assert.match(stdout, /\| run \| caught \| missed \| false alarms \| asked \| named \| overclaimed \| other \| minutes \| cost \|/);
  assert.match(stdout, /\| 1 \| 0\/5 \| 5 \| 0\/4 \| 0 \| 0\/3 \| 3 \| 0 \| \d+\.\d \| \$0\.25 \|/);
  assert.match(stdout, /\| total \| 0\/5 \| 5 \| 0\/4 \| 0 \| 0\/3 \| 3 \| 0 \|/);
  assert.equal(read('run-1/verdicts.json').length, 12);
});

// The failure a "partial" verdict could hide: an agent that calls everything partly shown names the
// three, and must still miss every planted mistake and raise a false alarm on every working promise.
test('an agent that grades everything partial names all three, misses all five, and raises four false alarms', t => {
  const { status, stdout, stderr, read } = harness(t, 'partial');
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(counts(run), { caught: 0, missed: 5, falseAlarms: 4, asked: 0 });
  assert.deepEqual(partials(run), { named: 3, overclaimed: 0, other: 0 });
  assert.deepEqual(run.scenarios[PARTIAL], { key: 'partial', verdict: 'partial', outcome: 'named' });
  assert.deepEqual(run.scenarios[PLANTED], { key: 'broken', verdict: 'partial', outcome: 'missed' });
  assert.deepEqual(run.scenarios[WORKING], { key: 'works', verdict: 'partial', outcome: 'falseAlarm' });
  assert.match(stdout, /\| total \| 0\/5 \| 5 \| 4\/4 \| 0 \| 3\/3 \| 0 \| 0 \|/);
});

test('an agent that fails everything catches all five and raises four false alarms', t => {
  const { status, stderr, read } = harness(t, 'fail');
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(counts(run), { caught: 5, missed: 0, falseAlarms: 4, asked: 0 });
  assert.deepEqual(partials(run), { named: 0, overclaimed: 0, other: 3 });
});

test('a planted mistake with no verdict counts as missed', t => {
  const { status, stderr, read } = harness(t, `fail "${PLANTED}"`);
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(counts(run), { caught: 4, missed: 1, falseAlarms: 4, asked: 0 });
  assert.deepEqual(run.scenarios[PLANTED], { key: 'broken', verdict: null, outcome: 'missed' });
});

test('a promise with a part no page can show and no verdict is neither named nor overclaimed', t => {
  const { status, stderr, read } = harness(t, `partial "${PARTIAL}"`);
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(partials(run), { named: 2, overclaimed: 0, other: 1 });
  assert.deepEqual(run.scenarios[PARTIAL], { key: 'partial', verdict: null, outcome: 'other' });
});

test('an ask is never counted as caught, nor as naming a part no page can show', t => {
  const { status, stderr, read } = harness(t, 'ask');
  assert.equal(status, 0, stderr);
  const [run] = read('results.json').runs;
  assert.deepEqual(counts(run), { caught: 0, missed: 0, falseAlarms: 0, asked: 9 });
  assert.deepEqual(partials(run), { named: 0, overclaimed: 0, other: 3 });
});

test('an agent that writes no verdicts misses all five and fails the run', t => {
  const { status, stdout, stderr, read } = harness(t, 'none');
  assert.equal(status, 1);
  assert.match(stderr, /run 1: the agent wrote no readable verdicts\.json/);
  const results = read('results.json');
  assert.deepEqual(counts(results.runs[0]), { caught: 0, missed: 5, falseAlarms: 0, asked: 0 });
  assert.deepEqual(partials(results.runs[0]), { named: 0, overclaimed: 0, other: 3 });
  assert.deepEqual([results.model, results.runs[0].costUsd, results.total.costUsd], ['not reported', null, null]);
  assert.match(stdout, /\| total \| 0\/5 \| 5 \| 0\/4 \| 0 \| 0\/3 \| 0 \| 3 \| \d+\.\d \| n\/a \|/);
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
  assert.deepEqual(partials(results.total), { named: 0, overclaimed: 6, other: 0 });
  assert.equal(results.total.costUsd, 0.5);
  for (const run of ['run-1', 'run-2']) {
    const seen = read(`${run}/agent-output.json`);
    assert.ok(relative(repo, seen.cwd).startsWith('..'), `${seen.cwd} is inside the repo`);
    assert.ok(relative(repo, seen.runDir).startsWith('..'), `${seen.runDir} is inside the repo`);
    assert.deepEqual(seen.files.filter(file => /key\.json|site\.mjs/.test(file)), []);
    assert.deepEqual(seen.files.filter(file => file.endsWith('.md')), ['openspec/changes/practice-notes/specs/notes/spec.md']);
    assert.equal(seen.answer, 200);
    assert.ok(seen.prompt.includes(`reference at ${reference} `));
    assert.ok(seen.prompt.includes(`bash ${join(repo, '.agents/skills/verify/scripts/verify-staging.sh')} run "${seen.runDir}"`));
    assert.ok(seen.prompt.startsWith('You are checking a small notes site'));
    // The four verdicts are named and "partial" is never explained: the reference supplies its meaning.
    assert.ok(seen.prompt.includes('"verdict": "pass" | "fail" | "ask" | "partial",'));
    assert.equal(seen.prompt.match(/partial/g).length, 1);
    assert.doesNotMatch(seen.prompt, /partly|not shown|key\.json|fixtures|planted|broken|BUILD-NOTES/i);
    assert.equal(existsSync(seen.cwd), false);
    assert.equal(existsSync(seen.runDir), false);
  }
});

test('--framing builder tells the agent it built the site and adds its build notes, never the answers', t => {
  const { status, stdout, stderr, read } = harness(t, 'pass', ['--framing', 'builder']);
  assert.equal(status, 0, stderr);
  assert.equal(read('results.json').framing, 'builder');
  assert.match(stdout, /framing: builder/);
  const seen = read('run-1/agent-output.json');
  assert.ok(relative(repo, seen.cwd).startsWith('..'), `${seen.cwd} is inside the repo`);
  assert.deepEqual(seen.files.filter(file => file.endsWith('.md')).toSorted(), ['BUILD-NOTES.md', 'openspec/changes/practice-notes/specs/notes/spec.md']);
  assert.deepEqual(seen.files.filter(file => /key\.json|site\.mjs/.test(file)), []);
  assert.ok(seen.prompt.startsWith('You built this change earlier in this session; your notes are in BUILD-NOTES.md. Now walk it.\n\nYou are checking'));
  assert.doesNotMatch(seen.prompt, /key\.json|fixtures|planted|broken/);
});

test('the default reference is the live walkthrough, with no framing', t => {
  const { stdout, read } = harness(t, 'pass');
  assert.equal(read('results.json').reference, join(repo, '.agents/skills/verify/references/walkthrough.md'));
  assert.equal(read('results.json').label, 'live');
  assert.equal(read('results.json').framing, 'none');
  assert.match(stdout, /framing: none/);
});

test('a bad --runs, --label, --framing, or --reference is a usage error', t => {
  for (const flags of [['--runs', '0'], ['--label', 'a/b'], ['--framing', 'critic'], ['--reference', 'no-such-file.md']]) {
    const { status, stderr } = harness(t, 'pass', flags);
    assert.equal(status, 2, flags.join(' '));
    assert.match(stderr, /usage: eval-verify\.mjs/);
  }
});
