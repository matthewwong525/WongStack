#!/usr/bin/env node
// Meta-only diagnostic: the retained check must fail for the known earlier
// READY/exit-1 defect and pass on the actual head. Never changes product source.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from './lib-cli.mjs';
import { redact, secretValues } from '../.agents/skills/memory/scripts/lib/scan.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCRIPT_PATH = '.agents/skills/verify/scripts/verify-staging.sh';
const TEST_PATH = 'scripts/tests/verify-scripts.test.mjs';
const CHECK = 'default preflight still discovers the preview and checks its browser';
const EARLIER = 'ab27e29989bbf4074b8949210d1c7cae2f64ae25';
const USAGE = 'usage: verify-preflight-regression.mjs --out <new-folder> (GitHub Actions only)';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

export function capturePreflightRegression({ out, sourceRoot = ROOT, identity, earlierSha = EARLIER }) {
  out = resolve(out);
  mkdirSync(out, { recursive: false });
  const secrets = secretValues(Object.fromEntries(Object.entries(process.env).filter(([key]) => /TOKEN|SECRET|PASSWORD|API_KEY/.test(key))));
  const clean = value => redact(String(value || ''), secrets);
  const manifest = {
    format: 'preflight-regression-practice-1', practice: true, capture: { ...identity },
    check: { name: CHECK, path: TEST_PATH, sha256: digest(readFileSync(join(sourceRoot, TEST_PATH))) },
    inputs: 'Same disposable Git fixture, mocked saved-head preview and browser; shared current-source memory helpers.',
    observations: [],
  };
  const gitEnv = { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' };
  const git = args => spawnSync('git', args, { cwd: sourceRoot, env: gitEnv, encoding: 'utf8', timeout: 20000 });
  let snapshot;
  let earlierRoot;
  let registered = false;
  try {
    const observed = git(['rev-parse', 'HEAD']);
    if (observed.error || observed.status !== 0 || observed.stdout.trim() !== identity.headSha) throw new Error('Head checkout does not match capture identity');
    const subjects = [];
    if (!/^[a-f0-9]{40}$/.test(earlierSha) || earlierSha === identity.headSha) {
      manifest.before = { state: 'unavailable', selectedSha: earlierSha, reason: 'An exact earlier revision is required' };
    } else {
      snapshot = mkdtempSync(join(tmpdir(), 'wong-preflight-source-'));
      earlierRoot = join(snapshot, 'source');
      const checkout = git(['worktree', 'add', '--detach', earlierRoot, earlierSha]);
      if (checkout.error || checkout.status !== 0) {
        // Squash merges need not retain unpublished branch ancestry. This
        // diagnostic gap cannot suppress the required repaired-head check.
        manifest.before = { state: 'unavailable', selectedSha: earlierSha, reason: 'Earlier source checkout is unavailable; failing-before proof is missing' };
      } else {
        registered = true;
        subjects.push(['before', earlierRoot, earlierSha]);
      }
    }
    subjects.push(['after', sourceRoot, identity.headSha]);
    for (const [label, root, sha] of subjects) {
      const revision = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: root, env: gitEnv, encoding: 'utf8', timeout: 10000 });
      if (revision.error || revision.status !== 0 || revision.stdout.trim() !== sha) throw new Error('Observed subject checkout differs from selected source');
      const sourceScript = join(root, SCRIPT_PATH);
      const argv = ['--test', '--test-name-pattern', `^${CHECK}$`, join(sourceRoot, TEST_PATH)];
      // No inherited credentials, Node hooks, routing or test override. Only
      // this one focused test is rerun; the complete suite runs once in CI.
      const env = { ...gitEnv, LANG: 'C.UTF-8', VERIFY_PREFLIGHT_SOURCE_SCRIPT: sourceScript };
      const result = spawnSync(process.execPath, argv, { cwd: sourceRoot, env, encoding: 'utf8', timeout: 30000, maxBuffer: 1024 * 1024 });
      const evidence = {};
      for (const stream of ['stdout', 'stderr']) {
        const path = `${label}.${stream}.txt`;
        const body = clean(result[stream]);
        writeFileSync(join(out, path), body);
        evidence[stream] = { path, sha256: digest(body), bytes: Buffer.byteLength(body) };
      }
      const text = result.stdout || '';
      const intended = label === 'before'
        ? result.status === 1 && /preflight exit=1; stdout="RESULT: READY/.test(text) && /ERR_ASSERTION/.test(text) && /1 !== 0/.test(text)
        : result.status === 0 && /preflight exit=0; stdout="RESULT: READY/.test(text) && /# pass 1\b/.test(text) && /# fail 0\b/.test(text);
      manifest.observations.push({ label, subjectSha: revision.stdout.trim(), sourcePath: SCRIPT_PATH,
        sourceSha256: digest(readFileSync(sourceScript)), executable: process.execPath, argv,
        exitCode: result.status, signal: result.signal, evidence, intended,
        ...(result.error ? { error: clean(result.error.message) } : {}),
      });
      if (result.error || !intended) manifest.error = `${label}: focused check did not show the intended ${label === 'before' ? 'READY/exit-1 assertion failure' : 'passing repaired behavior'}`;
    }
  } catch (error) {
    manifest.error = clean(error.message);
  } finally {
    let registrationRemoved = true;
    if (registered) {
      const removed = git(['worktree', 'remove', '--force', earlierRoot]);
      registrationRemoved = !removed.error && removed.status === 0;
    }
    if (snapshot) rmSync(snapshot, { recursive: true, force: true });
    manifest.cleanup = { sourceRemoved: !snapshot || !existsSync(snapshot), registrationRemoved, evidenceRetained: true };
    if (!registrationRemoved) manifest.error = 'Earlier source registration cleanup failed';
    writeFileSync(join(out, 'capture.json'), `${clean(JSON.stringify(manifest, null, 2))}\n`);
  }
  return { manifest, exitCode: manifest.error ? 1 : 0 };
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { out: { type: 'string' } } });
  if (!values.out) usageError(USAGE, '--out is required');
  if (process.env.GITHUB_ACTIONS !== 'true') usageError(USAGE, 'Capture commands run only in GitHub Actions');
  const identity = {
    repository: process.env.GITHUB_REPOSITORY, workflow: '.github/workflows/payload.yml',
    headSha: process.env.GITHUB_SHA, runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT, event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF,
  };
  if (Object.values(identity).some(value => !value) || !/^[a-f0-9]{40}$/.test(identity.headSha)) usageError(USAGE, 'Missing or invalid GitHub capture identity');
  const result = capturePreflightRegression({ out: values.out, identity });
  console.log(`CAPTURE=${join(resolve(values.out), 'capture.json')}`);
  process.exitCode = result.exitCode;
}
