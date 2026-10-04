#!/usr/bin/env node
// Meta-only pilot. Run real memory commands in CI; retain observations, never a product verdict.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli, usageError } from './lib-cli.mjs';
import { redact, secretValues } from '../.agents/skills/memory/scripts/lib/scan.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FIXTURE = join(ROOT, 'scripts/fixtures/verify-receipts/memory-areas.json');
const USAGE = 'usage: verify-memory-areas.mjs --out <new-folder>  (GitHub Actions only)';
const requirement = 'A fact names the code area it concerns';
const CASES = [
  { id: 'unmapped', requirement, scenario: 'No mapped folder', path: 'unmapped/example.txt' },
  { id: 'unconfigured', requirement, scenario: 'The store is unreachable', path: 'app/worker/apps/hello/index.ts' },
  { id: 'mini-app', requirement: 'One lookup shows everything linked to a path or topic', scenario: 'A mini-app file', path: 'app/worker/apps/hello/index.ts' },
];
const sha256 = body => createHash('sha256').update(body).digest('hex');

function childEnv(sandbox) {
  // Do not inherit credentials, service settings, git routing or Node startup hooks.
  return {
    PATH: process.env.PATH,
    LANG: 'C.UTF-8',
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_CEILING_DIRECTORIES: sandbox,
    XDG_DATA_HOME: join(sandbox, 'data'),
    XDG_CONFIG_HOME: join(sandbox, 'config'),
    WONG_MEMORY_STATE_DIR: join(sandbox, 'state'),
  };
}

function fixtureState(root) {
  const files = [];
  function visit(dir) {
    for (const item of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (item.name === '.git') continue;
      const file = join(dir, item.name);
      if (item.isDirectory()) visit(file);
      else files.push({ path: relative(root, file), sha256: sha256(readFileSync(file)) });
    }
  }
  visit(root);
  return {
    envPresent: existsSync(join(root, '.env')),
    installationPresent: existsSync(join(root, '.claude/.wong-stack.json')),
    files,
  };
}

function prepareFixture(root, env) {
  mkdirSync(root);
  for (const [path, body] of Object.entries(JSON.parse(readFileSync(FIXTURE, 'utf8')))) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), body);
  }
  const initialized = spawnSync('git', ['init', '-q', '-b', 'fixture'], { cwd: root, env, encoding: 'utf8', timeout: 10000 });
  if (initialized.status !== 0 || initialized.error) throw new Error('Could not initialize the isolated fixture repository');
}

// Exported so CI tests can exercise real nonzero commands and startup failures without forging output.
export function captureMemoryAreas({ out, sourceRoot = ROOT, identity, executable = process.execPath, entryPoint = join(sourceRoot, '.agents/skills/memory/scripts/memory.mjs') }) {
  out = resolve(out);
  mkdirSync(dirname(out), { recursive: true });
  mkdirSync(out); // A rerun must use a new folder rather than mixing observations.
  const secrets = secretValues(Object.fromEntries(Object.entries(process.env).filter(([name]) => /TOKEN|SECRET|PASSWORD|API_KEY/.test(name))));
  const clean = text => redact(String(text || ''), secrets);
  const manifest = { format: 'memory-areas-pilot-1', capture: { ...identity, createdAt: new Date().toISOString() }, cases: [] };
  let sandbox;
  try {
    const revision = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: sourceRoot, env: { PATH: process.env.PATH, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null' },
      encoding: 'utf8', timeout: 10000,
    });
    if (revision.error || revision.status !== 0) throw new Error('Could not observe the source checkout revision');
    manifest.capture.subjectSha = revision.stdout.trim();
    if (manifest.capture.subjectSha !== identity.headSha) throw new Error('Source checkout revision does not match the capture head');
    sandbox = mkdtempSync(join(tmpdir(), 'wong-verify-memory-'));
    const root = join(sandbox, 'repo');
    const env = childEnv(sandbox);
    prepareFixture(root, env);
    for (const scenario of CASES) {
      const before = fixtureState(root);
      const argv = [entryPoint, 'areas', scenario.path];
      const result = spawnSync(executable, argv, { cwd: root, env, encoding: 'utf8', timeout: 15000, maxBuffer: 1024 * 1024 });
      const evidence = {};
      for (const stream of ['stdout', 'stderr']) {
        const path = `${scenario.id}.${stream}.txt`;
        const body = clean(result[stream]);
        writeFileSync(join(out, path), body);
        evidence[stream] = { path, sha256: sha256(body), bytes: Buffer.byteLength(body) };
      }
      manifest.cases.push({
        id: scenario.id,
        scenario: { capability: 'memory', requirement: scenario.requirement, scenario: scenario.scenario },
        state: result.error ? 'unavailable' : 'captured',
        command: { executable, argv, cwd: root },
        exitCode: result.status,
        signal: result.signal,
        ...(result.error ? { error: clean(result.error.message) } : {}),
        evidence,
        fixture: { before, after: fixtureState(root) },
      });
    }
  } catch (error) {
    manifest.error = clean(error.message);
  } finally {
    if (sandbox) rmSync(sandbox, { recursive: true, force: true });
    manifest.cleanup = { fixtureRemoved: sandbox ? !existsSync(sandbox) : null, evidenceRetained: true };
    // Scrub metadata too; evidence digests describe the already scrubbed stream bytes.
    writeFileSync(join(out, 'capture.json'), `${clean(JSON.stringify(manifest, null, 2))}\n`);
  }
  return { manifest, exitCode: manifest.error || manifest.cases.some(item => item.state === 'unavailable') ? 1 : 0 };
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { out: { type: 'string' } } });
  if (!values.out) usageError(USAGE, '--out is required');
  if (process.env.GITHUB_ACTIONS !== 'true') usageError(USAGE, 'Capture commands run only in GitHub Actions');
  const identity = {
    repository: process.env.GITHUB_REPOSITORY,
    workflow: '.github/workflows/payload.yml',
    headSha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID,
    runAttempt: process.env.GITHUB_RUN_ATTEMPT,
    event: process.env.GITHUB_EVENT_NAME,
    ref: process.env.GITHUB_REF,
  };
  if (Object.values(identity).some(value => !value) || !/^[a-f0-9]{40}$/.test(identity.headSha)) usageError(USAGE, 'Missing or invalid GitHub capture identity');
  const result = captureMemoryAreas({ out: values.out, identity });
  console.log(`CAPTURE=${join(resolve(values.out), 'capture.json')}`);
  process.exitCode = result.exitCode;
}
