#!/usr/bin/env node
// Read-only revision and gate identity. The save skill owns every mutation.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isMain, parseCli } from '../../memory/scripts/lib/cli.mjs';
import { artifactsRemote, SHA } from '../../wong-sync/scripts/hosted-context.mjs';
import { checkedSelection, hostedDelivery, localCandidate } from './hosted-delivery.mjs';

const unknown = reason => ({ state: 'UNKNOWN', gateResult: 'UNKNOWN', reason });
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const githubRepo = remote => remote.match(/^(?:https:\/\/github\.com\/|git@github\.com:)([\w.-]+\/[\w.-]+?)(?:\.git)?$/)?.[1];
const failure = value => ['failure', 'cancelled', 'timed_out', 'action_required', 'startup_failure', 'error'].includes(value);

// Keep the newest attempt for each workflow/event; old green runs cannot hide a rerun.
export function gateSnapshot(checks, runs) {
  if (!Array.isArray(checks) || !Array.isArray(runs)) throw Error('Unavailable gate identity');
  const latest = new Map();
  for (const run of [...runs].sort((a, b) => b.id - a.id || b.run_attempt - a.run_attempt)) {
    if (!Number.isSafeInteger(run.id) || !Number.isSafeInteger(run.run_attempt) || !run.workflow_id || !run.event || !run.status) throw Error('Malformed run identity');
    const key = `${run.workflow_id}:${run.event}`;
    if (!latest.has(key)) latest.set(key, [run.id, run.run_attempt, run.status, run.conclusion]);
  }
  const entries = checks.map(check => {
    if (check.__typename === 'CheckRun' && check.name && check.status) return ['check', check.name, check.detailsUrl, check.status, check.conclusion];
    if (check.__typename === 'StatusContext' && check.context && check.state) return ['status', check.context, check.targetUrl, check.state];
    throw Error('Malformed check identity');
  }).sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const attempts = [...latest].sort(([a], [b]) => a.localeCompare(b));
  const red = entries.some(row => failure(String(row.at(-1)).toLowerCase())) || attempts.some(([, row]) => failure(row[3]));
  const pending = entries.some(row => row[0] === 'check' ? row[3] !== 'COMPLETED' || !['SUCCESS', 'SKIPPED', 'NEUTRAL'].includes(row[4]) : row[3] !== 'SUCCESS')
    || attempts.some(([, row]) => row[2] !== 'completed' || !['success', 'skipped', 'neutral'].includes(row[3]));
  return { gateIdentity: hash({ entries, attempts }), observed: red ? 'FAILURE' : pending ? 'UNKNOWN' : 'SETTLED' };
}

export async function savedRevision({ repo = '.', branch, checkpoint, hostedInput, run, delivery = hostedDelivery } = {}) {
  const dir = resolve(repo);
  run ??= (command, args) => execFileSync(command, args, { cwd: dir, encoding: 'utf8', timeout: 30_000, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const git = (...args) => run('git', ['--no-optional-locks', ...args]);
  const gh = (...args) => JSON.parse(run('gh', args));
  try {
    const headSha = git('rev-parse', 'HEAD');
    const actualBranch = git('branch', '--show-current');
    if (!SHA.test(headSha) || !actualBranch || (branch && branch !== actualBranch)) return unknown('Selected branch identity differs or is unavailable');
    const local = { headSha, branch: actualBranch };
    if (git('status', '--porcelain=v1', '--untracked-files=all')) return { ...local, state: 'NEEDS_SAVE', gateResult: 'UNKNOWN', reason: 'Working tree has unsaved work' };
    const remote = git('remote', 'get-url', 'origin');
    const hosted = remote.includes('.artifacts.cloudflare.net/');
    const repository = hosted ? artifactsRemote(remote) : githubRepo(remote);
    if (!repository) return unknown('Unsupported or foreign repository identity');
    if (checkpoint && (checkpoint.repository !== repository || checkpoint.branch !== actualBranch || checkpoint.headSha !== headSha)) return unknown('Checkpoint belongs to different work');
    const refs = git('ls-remote', '--heads', 'origin', `refs/heads/${actualBranch}`);
    const ref = refs.split(/\s+/);
    const remoteHead = ref.length === 2 && ref[1] === `refs/heads/${actualBranch}` && SHA.test(ref[0]) ? ref[0] : undefined;
    if (!refs) return { ...local, repository, state: 'NEEDS_SAVE', gateResult: 'UNKNOWN', reason: 'Branch has not been pushed' };
    if (!remoteHead) return unknown('Authoritative remote head is malformed');
    if (remoteHead !== headSha) return { ...local, repository, state: 'NEEDS_SAVE', gateResult: 'UNKNOWN', reason: 'Local head is not the saved remote head' };
    if (hosted) {
      const selection = checkedSelection(hostedInput?.selection);
      const candidateLocal = localCandidate(dir, hostedInput.changeRoot ?? `openspec/changes/${selection.changeName}`);
      if (selection.branch !== actualBranch || selection.headSha !== headSha || candidateLocal.recordedBranch !== actualBranch) return unknown('Hosted selection differs from this saved change');
      const current = await delivery('gate', { selection }, { dir, remote, local: candidateLocal });
      if (current.candidate.headSha !== headSha || current.candidate.branch !== actualBranch) return unknown('Hosted candidate differs from saved head');
      const gateIdentity = hash({ projectId: current.projectId, generation: current.generation, candidate: current.candidate });
      return { ...local, repository, state: 'SAVED', gateIdentity, gateResult: current.gateResult, reused: Boolean(checkpoint && checkpoint.gateIdentity === gateIdentity && checkpoint.gateResult === current.gateResult) };
    }
    if (gh('repo', 'view', '--json', 'nameWithOwner').nameWithOwner !== repository) return unknown('GitHub repository differs from origin');
    const pr = gh('pr', 'view', '--json', 'number,headRefOid,headRefName,statusCheckRollup');
    const authoritative = gh('api', `repos/${repository}/pulls/${pr.number}`);
    if (pr.headRefOid !== headSha || pr.headRefName !== actualBranch || authoritative.state !== 'open' || authoritative.head?.repo?.full_name !== repository || authoritative.head?.ref !== actualBranch || authoritative.head?.sha !== headSha) return unknown('Authoritative PR identity differs from this branch/head');
    const response = gh('api', `repos/${repository}/actions/runs?head_sha=${headSha}&per_page=100`);
    if (response.total_count > 100 || !Array.isArray(response.workflow_runs) || response.workflow_runs.some(value => value.head_sha !== headSha || value.repository?.full_name !== repository)) return unknown('Workflow identity is incomplete or foreign');
    const snapshot = gateSnapshot(pr.statusCheckRollup, response.workflow_runs);
    const reused = Boolean(checkpoint && checkpoint.gateIdentity === snapshot.gateIdentity && ['SUCCESS', 'NONE'].includes(checkpoint.gateResult) && snapshot.observed === 'SETTLED');
    return { ...local, repository, state: 'SAVED', gateIdentity: snapshot.gateIdentity,
      gateResult: reused ? checkpoint.gateResult : snapshot.observed === 'FAILURE' ? 'FAILURE' : 'UNKNOWN', reused,
      reason: reused ? 'Current exact checkpoint' : 'Read current gate with the existing waiter; no rerun is requested' };
  } catch { return unknown('Saved revision lookup failed; no mutation was attempted'); }
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: 'usage: saved-revision.mjs [--repo PATH] [--branch NAME] [--checkpoint FILE] [--hosted-input FILE]', options: {
    repo: { type: 'string' }, branch: { type: 'string' }, checkpoint: { type: 'string' }, 'hosted-input': { type: 'string' },
  } });
  try {
    const load = path => path ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
    console.log(JSON.stringify(await savedRevision({ repo: values.repo, branch: values.branch, checkpoint: load(values.checkpoint), hostedInput: load(values['hosted-input']) })));
  } catch { console.log(JSON.stringify(unknown('Invalid checkpoint input'))); process.exitCode = 1; }
}
