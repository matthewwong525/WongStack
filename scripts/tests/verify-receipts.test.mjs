import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { checkRecipe, collectCapture, validateCapture } from '../../.agents/skills/verify/scripts/verify-receipts.mjs';

// Protocol fixtures are intentionally synthetic; the real pilot is inspected separately after /save.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CLI = join(ROOT, '.agents/skills/verify/scripts/verify-receipts.mjs');
const headSha = 'a'.repeat(40);
const scenario = { capability: 'memory', requirement: 'Reads areas', scenario: 'Missing store' };
const recipe = { format: 'verify-recipe-1', id: 'memory-areas', sourcePaths: ['entry.mjs'], instructions: 'capture.md', scenarios: [scenario], capture: { workflow: '.github/workflows/payload.yml', artifact: 'verify-memory-areas' } };
const identity = { repository: 'example/project', workflow: recipe.capture.workflow, headSha, subjectSha: headSha, runId: '12', runAttempt: '2', event: 'push', ref: 'refs/heads/change' };
const server = { repository: { full_name: identity.repository }, path: identity.workflow, head_sha: headSha, id: 12, run_attempt: 2, event: 'push', head_branch: 'change', status: 'completed' };
const hash = value => createHash('sha256').update(value).digest('hex');
const clone = value => structuredClone(value);

function setup(t) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-receipts-'));
  const runDir = mkdtempSync(join(tmpdir(), 'wong-verify-receipts-'));
  t.after(() => { rmSync(root, { recursive: true, force: true }); rmSync(runDir, { recursive: true, force: true }); });
  for (const [path, text] of Object.entries({ 'entry.mjs': '// source', 'capture.md': 'Owned instructions', '.agents/verification/memory-areas.json': JSON.stringify(recipe), [recipe.capture.workflow]: 'name: Existing workflow', 'openspec/specs/memory/spec.md': '### Requirement: Reads areas\n\n#### Scenario: Missing store\n\n- **THEN** local docs appear\n\n### Requirement: Other\n\n#### Scenario: Missing store\n' })) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const folder = join(root, 'artifact');
  mkdirSync(folder);
  const before = { envPresent: false, installationPresent: false, files: [{ path: 'fixture.txt', sha256: hash('fixture') }] };
  const evidence = {};
  for (const [stream, text] of Object.entries({ stdout: 'Observed local docs\n', stderr: '' })) {
    const path = `${stream}.txt`;
    writeFileSync(join(folder, path), text);
    evidence[stream] = { path, sha256: hash(text), bytes: Buffer.byteLength(text) };
  }
  const manifest = { format: 'memory-areas-pilot-1', capture: { ...identity, createdAt: '2026-10-04T01:00:00Z' }, cases: [{ id: 'missing-store', scenario, state: 'captured', command: { executable: '/usr/bin/node', argv: ['/source/entry.mjs', 'areas'], cwd: '/removed/fixture' }, exitCode: 0, signal: null, evidence, fixture: { before, after: clone(before) } }], cleanup: { fixtureRemoved: true, evidenceRetained: true } };
  const save = () => writeFileSync(join(folder, 'capture.json'), JSON.stringify(manifest));
  save();
  return { root, folder, runDir, manifest, save, validate: () => validateCapture({ folder, recipe, identity }) };
}

function ghFixture({ folder, runs, view = server, downloadError, after = view }) {
  const calls = [];
  let reads = 0;
  const gh = args => {
    calls.push(args);
    if (args[0] === 'repo') return JSON.stringify({ nameWithOwner: identity.repository });
    if (args[1] === 'list') return JSON.stringify(runs ?? [{ databaseId: 12, headSha, event: 'push', createdAt: '2026-10-04T01:00:00Z', status: 'completed' }]);
    if (args[0] === 'api') return JSON.stringify(reads++ ? after : view);
    if (args[1] === 'download') {
      if (downloadError) throw new Error(downloadError);
      cpSync(folder, args.at(-1), { recursive: true });
      return '';
    }
    throw new Error('Unexpected GitHub call');
  };
  return { gh, calls };
}

test('recipe resolves source, owning guide, workflow and qualified scenarios without duplicating promises', t => {
  const { root } = setup(t);
  assert.deepEqual(checkRecipe({ root, recipePath: '.agents/verification/memory-areas.json' }), recipe);
  const file = join(root, '.agents/verification/memory-areas.json');
  for (const change of [value => { value.format = 'future'; }, value => { delete value.id; }, value => { Object.assign(value, JSON.parse('{"then":"invented promise"}')); }, value => { value.sourcePaths = []; }, value => { value.capture.command = 'node entry'; }, value => { value.capture.workflow = '../workflow'; }, value => { value.capture.artifact = '--bad'; }, value => { value.scenarios[0].requirement = 'Absent'; }, value => { value.scenarios.push(clone(value.scenarios[0])); }, value => { value.scenarios[0].capability = '../memory'; }, value => { value.instructions = 'absent.md'; }]) {
    const changed = clone(recipe); change(changed); writeFileSync(file, JSON.stringify(changed));
    assert.throws(() => checkRecipe({ root, recipePath: '.agents/verification/memory-areas.json' }));
  }
  writeFileSync(file, JSON.stringify(recipe));
  rmSync(join(root, 'entry.mjs'));
  symlinkSync(join(root, 'capture.md'), join(root, 'entry.mjs'));
  assert.throws(() => checkRecipe({ root, recipePath: '.agents/verification/memory-areas.json' }), /Symlink/);
});

test('intact capture exposes output and actual command failures without declaring a product verdict', t => {
  const { manifest, save, validate } = setup(t);
  assert.deepEqual(validate(), manifest);
  manifest.cases[0].exitCode = 7; save();
  assert.equal(validate().cases[0].exitCode, 7);
  manifest.cases[0].exitCode = null; manifest.cases[0].signal = 'SIGTERM'; save();
  assert.equal(validate().cases[0].signal, 'SIGTERM');
  assert.equal('verdict' in validate(), false);
});

const invalid = {
  'unknown format': value => { value.format = 'future'; },
  'stale head': value => { value.capture.headSha = 'b'.repeat(40); },
  'synthetic subject checkout': value => { value.capture.subjectSha = 'b'.repeat(40); },
  'older passing attempt': value => { value.capture.runAttempt = '1'; },
  'foreign repository': value => { value.capture.repository = 'other/project'; },
  'foreign workflow': value => { value.capture.workflow = '.github/workflows/other.yml'; },
  'pull request checkout': value => { value.capture.event = 'pull_request'; value.capture.ref = 'refs/pull/1/merge'; },
  'missing provenance': value => { delete value.capture.createdAt; },
  'harness failure': value => { value.error = 'Could not capture'; },
  'unfinished cleanup': value => { value.cleanup.fixtureRemoved = false; },
  'missing case': value => { value.cases = []; },
  'duplicate scenario': value => { value.cases.push(clone(value.cases[0])); },
  'unknown scenario': value => { value.cases[0].scenario.requirement = 'Other'; },
  'malformed record': value => { value.cases[0] = null; },
  'malformed command': value => { value.cases[0].command.argv = []; },
  'unavailable command': value => { value.cases[0].state = 'unavailable'; },
  'no process observation': value => { value.cases[0].exitCode = null; },
  'missing fixture observation': value => { delete value.cases[0].fixture; },
  'bad fixture observation': value => { value.cases[0].fixture.before.envPresent = 'false'; },
  'bad fixture digest': value => { value.cases[0].fixture.before.files[0].sha256 = 'bad'; },
  'duplicate fixture paths': value => { value.cases[0].fixture.before.files.push(clone(value.cases[0].fixture.before.files[0])); },
  'missing stream': value => { delete value.cases[0].evidence.stdout; },
  'bad digest': value => { value.cases[0].evidence.stdout.sha256 = '0'.repeat(64); },
  'bad byte count': value => { value.cases[0].evidence.stdout.bytes += 1; },
  'duplicate stream file': value => { value.cases[0].evidence.stderr = clone(value.cases[0].evidence.stdout); },
  'escaping evidence path': value => { value.cases[0].evidence.stdout.path = '../capture.md'; },
  'absolute evidence path': value => { value.cases[0].evidence.stdout.path = '/etc/passwd'; },
  'windows evidence path': value => { value.cases[0].evidence.stdout.path = 'C:\\secret'; },
};
for (const [name, change] of Object.entries(invalid)) test(`rejects ${name}`, t => {
  const { manifest, save, validate } = setup(t); change(manifest); save(); assert.throws(validate);
});

test('missing evidence and symlinks, including unused files and folder links, are rejected', t => {
  const { root, folder, validate } = setup(t);
  rmSync(join(folder, 'stdout.txt'));
  assert.throws(validate, /ENOENT/);
  symlinkSync(join(root, 'capture.md'), join(folder, 'stdout.txt'));
  assert.throws(validate, /Symlink/);
  rmSync(join(folder, 'stdout.txt'));
  writeFileSync(join(folder, 'stdout.txt'), 'Observed local docs\n');
  symlinkSync(join(root, 'capture.md'), join(folder, 'unused'));
  assert.throws(validate, /Symlink/);
  rmSync(join(folder, 'unused'));
  symlinkSync(folder, join(root, 'linked'));
  assert.throws(() => validateCapture({ folder: join(root, 'linked'), recipe, identity }), /Symlink/);
});

test('capture size limits and malformed JSON are rejected before reading observations', t => {
  const { folder, save, validate } = setup(t);
  writeFileSync(join(folder, 'capture.json'), '{'); assert.throws(validate);
  writeFileSync(join(folder, 'capture.json'), ' '.repeat(1024 * 1024 + 1)); assert.throws(validate, /limit/);
  save(); mkdirSync(join(folder, 'nested')); writeFileSync(join(folder, 'nested/large'), Buffer.alloc(16 * 1024 * 1024));
  assert.throws(validate, /limit/);
});

test('collector downloads the newest run and exact attempt into an owned folder, refusing overwrite', t => {
  const options = setup(t);
  const { gh, calls } = ghFixture(options);
  const result = collectCapture({ ...options, recipe, headSha, gh });
  assert.equal(result.state, 'collected');
  assert.equal(result.identity.runAttempt, '2');
  assert.ok(existsSync(join(result.folder, 'capture.json')));
  assert.equal(calls.filter(args => args[1] === 'download').length, 1);
  assert.deepEqual(calls.find(args => args[1] === 'download').slice(0, 7), ['run', 'download', '12', '--repo', 'example/project', '--name', 'verify-memory-areas']);
  assert.throws(() => collectCapture({ ...options, recipe, headSha, gh: ghFixture(options).gh }), /already exists/);
  assert.ok(existsSync(join(result.folder, 'capture.json')));
});

test('newest missing, invalid or cancelled capture never falls back to an older passing run', t => {
  const options = setup(t);
  const runs = [ { databaseId: 11, headSha, event: 'push', createdAt: '2026-10-03T01:00:00Z' }, { databaseId: 12, headSha, event: 'push', createdAt: '2026-10-04T01:00:00Z' } ];
  for (const extra of [{ downloadError: 'expired artifact' }, { view: { ...server, run_attempt: 3 } }, { view: { ...server, status: 'in_progress' } }]) {
    const { gh, calls } = ghFixture({ ...options, runs, ...extra });
    assert.throws(() => collectCapture({ ...options, recipe, headSha, gh }));
    assert.equal(calls.some(args => args[0] === 'api' && args[1].endsWith('/11')), false);
    assert.equal(existsSync(join(options.runDir, 'evidence')), false);
  }
});

test('collector rejects server identity changes, malformed listings, foreign runs and a newer attempt arriving mid-download', t => {
  const options = setup(t);
  for (const extra of [{ runs: [] }, { runs: {} }, { runs: [{ databaseId: 'bad' }] }, { runs: [{ databaseId: 12, headSha, event: 'pull_request', createdAt: '2026-10-04' }] }, { view: { ...server, head_sha: 'b'.repeat(40) } }, { view: { ...server, repository: { full_name: 'other/project' } } }, { view: { ...server, id: 99 } }, { after: { ...server, run_attempt: 3 } }]) {
    assert.throws(() => collectCapture({ ...options, recipe, headSha, gh: ghFixture({ ...options, ...extra }).gh }));
  }
  assert.throws(() => collectCapture({ ...options, recipe, headSha: 'short', gh: () => assert.fail() }), /full saved/);
  assert.throws(() => collectCapture({ ...options, runDir: options.root, recipe, headSha, gh: () => assert.fail() }), /owned/);
});

test('partial download cleanup removes only its own folder and preserves independent evidence', t => {
  const options = setup(t);
  mkdirSync(join(options.runDir, 'evidence'));
  writeFileSync(join(options.runDir, 'evidence/independent.txt'), 'Keep this');
  const { gh } = ghFixture(options);
  const partial = args => {
    if (args[1] !== 'download') return gh(args);
    writeFileSync(join(args.at(-1), 'partial.txt'), 'Incomplete'); throw new Error('download interrupted');
  };
  assert.throws(() => collectCapture({ ...options, recipe, headSha, gh: partial }), /interrupted/);
  assert.equal(readFileSync(join(options.runDir, 'evidence/independent.txt'), 'utf8'), 'Keep this');
  assert.equal(existsSync(join(options.root, 'artifact/capture.json')), true);
});

test('CLI uses the shared help convention and names drift without launching GitHub', t => {
  const { root, runDir } = setup(t);
  const run = args => spawnSync(process.execPath, [CLI, ...args], { cwd: root, encoding: 'utf8' });
  assert.equal(run(['--help']).status, 0);
  for (const args of [[], ['check', '--unknown'], ['compare', '--recipe', '.agents/verification/memory-areas.json'], ['collect', '--recipe', '.agents/verification/memory-areas.json'], ['check', '--recipe', '.agents/verification/memory-areas.json', '--sha', headSha]]) assert.equal(run(args).status, 2);
  const checked = run(['check', '--recipe', '.agents/verification/memory-areas.json']);
  assert.equal(checked.status, 0, checked.stderr); assert.equal(JSON.parse(checked.stdout).state, 'ready');
  const drift = run(['check', '--recipe', 'absent.json']);
  assert.equal(drift.status, 1); assert.equal(JSON.parse(drift.stdout).state, 'unavailable');
  const invalid = run(['collect', '--recipe', '.agents/verification/memory-areas.json', '--sha', 'short', '--run-dir', runDir]);
  assert.equal(invalid.status, 1); assert.match(JSON.parse(invalid.stdout).reason, /full saved/);
  const token = `ghp_${'s'.repeat(30)}`;
  writeFileSync(join(root, '.agents/verification/memory-areas.json'), `{ ${token}`);
  const malformed = run(['check', '--recipe', '.agents/verification/memory-areas.json']);
  assert.equal(malformed.status, 1);
  assert.equal(JSON.parse(malformed.stdout).reason, 'Capture or recipe JSON is malformed');
  assert.equal(`${malformed.stdout}${malformed.stderr}`.includes(token), false);
});
