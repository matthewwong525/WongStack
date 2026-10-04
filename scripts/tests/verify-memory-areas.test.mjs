import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { captureMemoryAreas } from '../verify-memory-areas.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const SCRIPT = join(ROOT, 'scripts/verify-memory-areas.mjs');
const headSha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const identity = { repository: 'example/project', workflow: '.github/workflows/payload.yml', headSha, runId: '123', runAttempt: '2', event: 'push', ref: 'refs/heads/practice' };

function setup(t) {
  const folder = mkdtempSync(join(tmpdir(), 'wong-test-receipt-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  return { folder, out: join(folder, 'evidence'), identity };
}

const raw = (out, record, stream = 'stdout') => readFileSync(join(out, record.evidence[stream].path), 'utf8');
const digest = body => createHash('sha256').update(body).digest('hex');

test('the real current-source entry point captures local docs before unavailable memory, retaining evidence after cleanup', t => {
  const options = setup(t);
  const { manifest, exitCode } = captureMemoryAreas(options);
  assert.equal(exitCode, 0, manifest.error);
  assert.equal(manifest.capture.subjectSha, headSha);
  assert.equal(manifest.capture.runAttempt, '2');
  assert.equal(manifest.cases.length, 3);
  const [unmapped, unavailable, miniApp] = manifest.cases;
  assert.equal(raw(options.out, unmapped).trim(), 'No mapped area for these paths.');
  assert.match(raw(options.out, unavailable), /^Memory was not loaded \(.+\); go on without it\.$/m);
  const lookup = raw(options.out, miniApp);
  assert.match(lookup, /^Areas: worker .*mini-apps /m);
  assert.match(lookup, /^Docs: wiki\/stack\/mini-apps.md, openspec\/specs\/mini-apps\/spec.md$/m);
  assert.match(lookup, /2026-09-01-mini-apps-in-the-main-app/);
  assert.match(lookup, /^- wiki\/stack\/mini-apps.md:3$/m);
  assert.ok(lookup.indexOf('Docs:') < lookup.indexOf('Memory was not loaded'));
  assert.deepEqual(manifest.cleanup, { fixtureRemoved: true, evidenceRetained: true });
  for (const record of manifest.cases) {
    assert.equal(record.state, 'captured');
    assert.equal(record.exitCode, 0);
    assert.equal(record.signal, null);
    assert.equal(existsSync(record.command.cwd), false);
    assert.equal(record.fixture.before.envPresent, false);
    assert.equal(record.fixture.before.installationPresent, false);
    assert.deepEqual(record.fixture.after, record.fixture.before, 'a read-only lookup left fixture data unchanged');
    for (const stream of ['stdout', 'stderr']) assert.equal(digest(raw(options.out, record, stream)), record.evidence[stream].sha256);
  }
  assert.deepEqual(JSON.parse(readFileSync(join(options.out, 'capture.json'), 'utf8')), manifest);
  assert.throws(() => captureMemoryAreas(options), /EEXIST/, 'another capture cannot overwrite existing observations');
});

test('an actual nonzero command retains stderr and status rather than presenting capture success as a product pass', t => {
  const options = setup(t);
  const entryPoint = join(options.folder, 'failing-command.mjs');
  writeFileSync(entryPoint, "console.log('Command reached'); console.error('Requested operation failed'); process.exitCode = 7;\n");
  const { manifest, exitCode } = captureMemoryAreas({ ...options, entryPoint });
  assert.equal(exitCode, 0, 'a product-command exit is observed, not an unavailable harness');
  for (const record of manifest.cases) {
    assert.equal(record.state, 'captured');
    assert.equal(record.exitCode, 7);
    assert.equal(raw(options.out, record), 'Command reached\n');
    assert.equal(raw(options.out, record, 'stderr'), 'Requested operation failed\n');
    assert.equal(existsSync(record.command.cwd), false);
  }
  assert.equal(manifest.cleanup.fixtureRemoved, true);
});

test('a command that cannot start records a harness gap and preserves the partial artifact', t => {
  const options = setup(t);
  const { manifest, exitCode } = captureMemoryAreas({ ...options, executable: join(options.folder, 'missing-node') });
  assert.equal(exitCode, 1);
  assert.equal(manifest.cases.length, 3);
  for (const record of manifest.cases) {
    assert.equal(record.state, 'unavailable');
    assert.equal(record.exitCode, null);
    assert.match(record.error, /ENOENT/);
    assert.equal(raw(options.out, record), '');
  }
  assert.equal(manifest.cleanup.fixtureRemoved, true);
  assert.ok(existsSync(join(options.out, 'capture.json')));
});

test('an unrelated source revision fails closed with an inspectable partial manifest', t => {
  const options = setup(t);
  const { manifest, exitCode } = captureMemoryAreas({ ...options, identity: { ...identity, headSha: '0'.repeat(40) } });
  assert.equal(exitCode, 1);
  assert.match(manifest.error, /does not match/);
  assert.deepEqual(manifest.cases, []);
  assert.equal(manifest.cleanup.fixtureRemoved, null);
  assert.ok(existsSync(join(options.out, 'capture.json')));
  const noSource = captureMemoryAreas({ ...options, out: join(options.folder, 'missing-source'), sourceRoot: join(options.folder, 'absent') });
  assert.equal(noSource.exitCode, 1);
  assert.match(noSource.manifest.error, /Could not observe/);
});

test('the producer scrubs streams before hashing and scrubs metadata before upload', t => {
  const options = setup(t);
  const token = `ghp_${'a'.repeat(30)}`;
  const entryPoint = join(options.folder, `${token}.mjs`);
  writeFileSync(entryPoint, `console.log(${JSON.stringify(token)}); console.error('Bearer ${'b'.repeat(30)}');\n`);
  const { manifest } = captureMemoryAreas({ ...options, entryPoint });
  const saved = readFileSync(join(options.out, 'capture.json'), 'utf8');
  assert.equal(saved.includes(token), false);
  for (const record of manifest.cases) {
    assert.equal(raw(options.out, record), '[redacted:token]\n');
    assert.equal(raw(options.out, record, 'stderr'), 'Bearer [redacted:token]\n');
    assert.equal(record.evidence.stdout.sha256, digest('[redacted:token]\n'));
  }
});

test('CLI requires CI identity and an output folder, and keeps the shared help convention', t => {
  const { folder } = setup(t);
  const cli = (args, extra = {}) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: ROOT, env: { ...process.env, GITHUB_ACTIONS: '', ...extra }, encoding: 'utf8' });
  assert.equal(cli(['--help']).status, 0);
  assert.equal(cli([]).status, 2);
  assert.equal(cli(['--unknown']).status, 2);
  const host = cli(['--out', resolve(folder, 'host')]);
  assert.equal(host.status, 2);
  assert.match(host.stderr, /only in GitHub Actions/);
  const invalid = cli(['--out', join(folder, 'invalid')], { GITHUB_ACTIONS: 'true', GITHUB_SHA: 'not-a-sha' });
  assert.equal(invalid.status, 2);
  const good = cli(['--out', join(folder, 'cli')], {
    GITHUB_ACTIONS: 'true', GITHUB_REPOSITORY: identity.repository, GITHUB_SHA: headSha,
    GITHUB_RUN_ID: identity.runId, GITHUB_RUN_ATTEMPT: identity.runAttempt,
    GITHUB_EVENT_NAME: 'push', GITHUB_REF: identity.ref,
  });
  assert.equal(good.status, 0, good.stderr);
  assert.match(good.stdout, /^CAPTURE=/);
});
