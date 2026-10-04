import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { capturePreflightRegression } from '../verify-preflight-regression.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
const script = join(ROOT, 'scripts/verify-preflight-regression.mjs');
function setup(t) {
  const folder = mkdtempSync(join(tmpdir(), 'wong-test-preflight-regression-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const sourceRoot = join(folder, 'source');
  const sourceScript = join(sourceRoot, '.agents/skills/verify/scripts/verify-staging.sh');
  const testPath = 'scripts/tests/verify-scripts.test.mjs';
  mkdirSync(dirname(sourceScript), { recursive: true });
  mkdirSync(dirname(join(sourceRoot, testPath)), { recursive: true });
  writeFileSync(join(sourceRoot, testPath), readFileSync(join(ROOT, testPath)));
  symlinkSync(join(ROOT, '.agents/skills/memory'), join(sourceRoot, '.agents/skills/memory'));
  symlinkSync(join(ROOT, '.agents/skills/verify/worker'), join(sourceRoot, '.agents/skills/verify/worker'));
  const git = args => execFileSync('git', args, { cwd: sourceRoot, encoding: 'utf8' }).trim();
  git(['init', '-q', '-b', 'practice']);
  const commit = () => {
    git(['add', '.']);
    git(['-c', 'user.name=Practice', '-c', 'user.email=practice@example.invalid', 'commit', '-qm', 'Disposable source snapshot']);
    return git(['rev-parse', 'HEAD']);
  };
  // Immutable actual historical bytes, labelled in the owning capture guide.
  // These commits are synthetic test identities, not ab27 Git-source proof.
  const historical = readFileSync(join(ROOT, 'scripts/fixtures/verify-receipts/preflight-before.sh'));
  assert.equal(createHash('sha256').update(historical).digest('hex'), 'd2bf1de277f93358017b484ec3610a5252f8e9108c280867ed2516eb3d81e573');
  writeFileSync(sourceScript, historical);
  const earlierSha = commit();
  writeFileSync(sourceScript, readFileSync(join(ROOT, '.agents/skills/verify/scripts/verify-staging.sh')));
  const repairedSha = commit();
  writeFileSync(join(sourceRoot, 'capture-marker.txt'), 'Distinct capture head\n');
  const headSha = commit();
  const identity = { repository: 'example/project', workflow: '.github/workflows/payload.yml', headSha, runId: '123', runAttempt: '2', event: 'push', ref: 'refs/heads/practice' };
  return { folder, out: join(folder, 'observations'), sourceRoot, identity, earlierSha, repairedSha };
}

test('the same retained check observes historical bytes and repaired source in disposable history, retaining evidence after cleanup', t => {
  const options = setup(t);
  const result = capturePreflightRegression(options);
  assert.equal(result.exitCode, 0, result.manifest.error);
  const manifest = JSON.parse(readFileSync(join(options.out, 'capture.json'), 'utf8'));
  assert.equal(manifest.practice, true);
  assert.equal(manifest.capture.headSha, options.identity.headSha);
  assert.equal(manifest.capture.runAttempt, '2');
  assert.equal(manifest.check.name, 'default preflight still discovers the preview and checks its browser');
  assert.deepEqual(manifest.cleanup, { sourceRemoved: true, registrationRemoved: true, evidenceRetained: true });
  const [before, after] = manifest.observations;
  assert.equal(before.subjectSha, options.earlierSha);
  assert.equal(after.subjectSha, options.identity.headSha);
  assert.equal(before.exitCode, 1);
  assert.equal(after.exitCode, 0);
  assert.deepEqual(before.argv, after.argv, 'failing-before and passing-after used different checks');
  assert.notEqual(before.sourceSha256, after.sourceSha256);
  for (const observed of manifest.observations) {
    assert.equal(observed.intended, true);
    assert.equal(observed.signal, null);
    for (const evidence of Object.values(observed.evidence)) {
      const bytes = readFileSync(join(options.out, evidence.path));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.sha256);
      assert.equal(bytes.length, evidence.bytes);
    }
  }
  assert.throws(() => capturePreflightRegression(options), /EEXIST/);
});

test('mismatched head identity fails and unavailable earlier source preserves a named gap plus required head pass', t => {
  const options = setup(t);
  const mismatch = capturePreflightRegression({ ...options, identity: { ...options.identity, headSha: '0'.repeat(40) } });
  assert.equal(mismatch.exitCode, 1);
  assert.match(mismatch.manifest.error, /Head checkout does not match/);
  assert.deepEqual(mismatch.manifest.observations, []);
  const invalid = capturePreflightRegression({ ...options, out: join(options.folder, 'invalid'), earlierSha: options.identity.headSha });
  assert.equal(invalid.exitCode, 0);
  assert.match(invalid.manifest.before.reason, /exact earlier revision/);
  assert.equal(invalid.manifest.observations[0].label, 'after');
  assert.equal(invalid.manifest.observations[0].exitCode, 0);
  const absent = capturePreflightRegression({ ...options, out: join(options.folder, 'absent'), earlierSha: '0'.repeat(40) });
  assert.equal(absent.exitCode, 0);
  assert.match(absent.manifest.before.reason, /Earlier source checkout is unavailable/);
  assert.equal(absent.manifest.before.state, 'unavailable');
  assert.equal(absent.manifest.observations[0].label, 'after');
  assert.equal(absent.manifest.observations[0].exitCode, 0);
  assert.equal(absent.manifest.cleanup.sourceRemoved, true);
  assert.ok(existsSync(join(options.folder, 'absent/capture.json')));
});

test('an already repaired earlier source cannot masquerade as failing-before proof', t => {
  const options = setup(t);
  const result = capturePreflightRegression({ ...options, earlierSha: options.repairedSha });
  assert.equal(result.exitCode, 1);
  assert.match(result.manifest.error, /before: focused check did not show/);
  assert.equal(result.manifest.observations[1].label, 'after');
  assert.equal(result.manifest.observations[1].exitCode, 0);
  assert.equal(result.manifest.cleanup.sourceRemoved, true);
});

test('missing earlier source cannot hide a failing head check', t => {
  const options = setup(t);
  const sourceScript = join(options.sourceRoot, '.agents/skills/verify/scripts/verify-staging.sh');
  writeFileSync(sourceScript, readFileSync(join(ROOT, 'scripts/fixtures/verify-receipts/preflight-before.sh')));
  const git = args => execFileSync('git', args, { cwd: options.sourceRoot, encoding: 'utf8' }).trim();
  git(['add', '.']);
  git(['-c', 'user.name=Practice', '-c', 'user.email=practice@example.invalid', 'commit', '-qm', 'Disposable failing head']);
  const result = capturePreflightRegression({ ...options, earlierSha: '0'.repeat(40), identity: { ...options.identity, headSha: git(['rev-parse', 'HEAD']) } });
  assert.equal(result.exitCode, 1);
  assert.equal(result.manifest.before.state, 'unavailable');
  assert.equal(result.manifest.observations[0].label, 'after');
  assert.equal(result.manifest.observations[0].exitCode, 1);
  assert.match(result.manifest.error, /after: focused check did not show/);
});

test('regression capture has shared CLI help and requires CI identity', t => {
  const { folder } = setup(t);
  const cli = (args, extra = {}) => spawnSync(process.execPath, [script, ...args], { cwd: ROOT, env: { ...process.env, GITHUB_ACTIONS: '', ...extra }, encoding: 'utf8' });
  assert.equal(cli(['--help']).status, 0);
  assert.equal(cli([]).status, 2);
  assert.equal(cli(['--unknown']).status, 2);
  assert.match(cli(['--out', join(folder, 'local')]).stderr, /only in GitHub Actions/);
  assert.match(cli(['--out', join(folder, 'missing')], { GITHUB_ACTIONS: 'true', GITHUB_SHA: 'invalid' }).stderr, /Missing or invalid GitHub capture identity/);
});
