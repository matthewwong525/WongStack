#!/usr/bin/env node
// Retain exact-source instruction comparison and actual helper decisions in CI.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { observeRevisionChain } from './fixtures/verify-receipts/revision-chain.mjs';
import { isMain, parseCli, usageError } from './lib-cli.mjs';
const digest = text => createHash('sha256').update(text).digest('hex');
const paths = { helper: '.agents/skills/apply/references/build-helper.md', verify: '.agents/skills/verify/SKILL.md' };
export async function captureRevisionChain({ out, repo = '.', identity, baselineRef = 'da9e789563b0fcaa5a2c174e0fb86bb5bf2de35c' }) {
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const headSha = git('rev-parse', 'HEAD');
  if (headSha !== identity.headSha) throw Error('Capture source does not match head identity');
  const baselineSha = git('rev-parse', '--verify', '--end-of-options', `${baselineRef}^{commit}`);
  const beforeHelper = git('show', `${baselineSha}:${paths.helper}`);
  const beforeVerify = git('show', `${baselineSha}:${paths.verify}`);
  const observation = await observeRevisionChain({ beforeHelper, beforeVerify });
  observation.source = { headSha, baselineSha, before: { helper: digest(beforeHelper), verify: digest(beforeVerify) },
    after: Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, digest(readFileSync(resolve(repo, path)))])) };
  const body = `${JSON.stringify(observation, null, 2)}\n`;
  out = resolve(out); mkdirSync(out);
  writeFileSync(resolve(out, 'chain.stdout.txt'), body);
  writeFileSync(resolve(out, 'chain.stderr.txt'), '');
  const fixture = { envPresent: false, installationPresent: false, files: [] };
  const manifest = { format: 'memory-areas-pilot-1', capture: { ...identity, subjectSha: headSha, createdAt: new Date().toISOString() },
    cases: [{ id: 'revision-chain', scenario: { capability: 'delivery-gate', requirement: 'Ship checkpoints once through save', scenario: 'A one-go ship' }, state: 'captured',
      command: { executable: process.execPath, argv: ['scripts/verify-revision-chain.mjs', '--out', out], cwd: resolve(repo) }, exitCode: 0, signal: null,
      evidence: { stdout: { path: 'chain.stdout.txt', sha256: digest(body), bytes: Buffer.byteLength(body) }, stderr: { path: 'chain.stderr.txt', sha256: digest(''), bytes: 0 } },
      fixture: { before: fixture, after: fixture } }], cleanup: { fixtureRemoved: true, evidenceRetained: true } };
  writeFileSync(resolve(out, 'capture.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  return observation;
}
if (isMain(import.meta.url)) {
  const usage = 'usage: verify-revision-chain.mjs --out <new-folder> [--baseline-ref <ref>] (GitHub Actions only)';
  const { values } = parseCli({ usage, options: { out: { type: 'string' }, 'baseline-ref': { type: 'string' } } });
  if (!values.out || process.env.GITHUB_ACTIONS !== 'true') usageError(usage);
  const identity = { repository: process.env.GITHUB_REPOSITORY, workflow: '.github/workflows/payload.yml', headSha: process.env.GITHUB_SHA,
    runId: process.env.GITHUB_RUN_ID, runAttempt: process.env.GITHUB_RUN_ATTEMPT, event: process.env.GITHUB_EVENT_NAME, ref: process.env.GITHUB_REF };
  if (Object.values(identity).some(value => !value) || !/^[a-f0-9]{40}$/.test(identity.headSha)) usageError(usage);
  try { await captureRevisionChain({ out: values.out, identity, baselineRef: values['baseline-ref'] }); console.log(`CAPTURE=${resolve(values.out, 'capture.json')}`); }
  catch { console.error('Revision-chain capture failed; inspect source identity and historical guidance'); process.exitCode = 1; }
}
