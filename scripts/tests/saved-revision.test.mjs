import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gateSnapshot, savedRevision } from '../../.agents/skills/save/scripts/saved-revision.mjs';

import { HEAD, OLD, githubFixture } from '../fixtures/saved-revision.mjs';
const receipt = { repository: 'team/repo', branch: 'work', headSha: HEAD, gateResult: 'SUCCESS', gateIdentity: gateSnapshot(
  [{ __typename: 'CheckRun', name: 'payload', detailsUrl: 'https://github.com/team/repo/actions/runs/10/job/1', status: 'COMPLETED', conclusion: 'SUCCESS' }],
  [{ id: 10, run_attempt: 1, workflow_id: 2, event: 'push', status: 'completed', conclusion: 'success' }],
).gateIdentity };

test('clean matching saved checkpoint performs only reads and reuses its settled gate', async () => {
  const fixture = githubFixture();
  const result = await savedRevision({ ...fixture, checkpoint: receipt });
  assert.equal(result.state, 'SAVED');
  assert.equal(result.gateResult, 'SUCCESS');
  assert.equal(result.reused, true);
  assert.ok(fixture.calls.every(([command, args]) => command === 'git' ? /^(rev-parse|branch --show-current|status|remote get-url|ls-remote)/.test(args) : /^(repo view|pr view|api repos\/)/.test(args)));
});
for (const dirty of ['M  source.mjs', ' M source.mjs', '?? authored.test.mjs']) {
  test(`unsaved ${dirty.slice(0, 2)} requests save without remote work`, async () => {
    const fixture = githubFixture({ dirty });
    assert.equal((await savedRevision(fixture)).state, 'NEEDS_SAVE');
    assert.equal(fixture.calls.length, 3);
  });
}
for (const refs of ['', `${OLD}\trefs/heads/work`]) {
  test(`absent or unpushed branch requests save: ${refs.slice(0, 5)}`, async () => assert.equal((await savedRevision(githubFixture({ refs }))).state, 'NEEDS_SAVE'));
}
for (const options of [
  { branch: 'other' }, { remote: 'https://example.com/foreign.git' }, { repository: 'other/repo' },
  { refs: 'malformed' }, { rollupHead: OLD }, { fail: 'remote get-url origin' },
  { pr: { state: 'open', head: { sha: OLD, ref: 'work', repo: { full_name: 'team/repo' } } } },
  { pr: { state: 'open', head: { sha: HEAD, ref: 'other', repo: { full_name: 'team/repo' } } } },
  { pr: { state: 'open', head: { sha: HEAD, ref: 'work', repo: { full_name: 'foreign/repo' } } } },
]) test(`unverified identity: ${JSON.stringify(options)}`, async () => assert.equal((await savedRevision(githubFixture(options))).state, 'UNKNOWN'));
for (const field of ['repository', 'branch', 'headSha']) test(`foreign receipt ${field} is refused`, async () => {
  const fixture = githubFixture();
  assert.equal((await savedRevision({ ...fixture, checkpoint: { ...receipt, [field]: 'foreign' } })).state, 'UNKNOWN');
});
test('standalone saved lookup does not manufacture a gate pass', async () => {
  const result = await savedRevision(githubFixture());
  assert.equal(result.state, 'SAVED');
  assert.equal(result.gateResult, 'UNKNOWN');
  assert.equal(result.reused, false);
});
for (const [status, conclusion, expected] of [['completed', 'failure', 'FAILURE'], ['in_progress', null, 'UNKNOWN'], ['completed', 'unexpected', 'UNKNOWN']]) {
  test(`same-head newer attempt ${status}/${conclusion} defeats old success`, async () => {
    const fixture = githubFixture({ runs: [{ id: 10, run_attempt: 2, workflow_id: 2, event: 'push', status, conclusion, head_sha: HEAD, repository: { full_name: 'team/repo' } }] });
    const result = await savedRevision({ ...fixture, checkpoint: receipt });
    assert.equal(result.gateResult, expected);
    assert.equal(result.reused, false);
  });
}
test('new run supersedes earlier passing workflow and status contexts remain in identity', () => {
  const run = (id, conclusion) => ({ id, workflow_id: 2, event: 'push', run_attempt: 1, status: 'completed', conclusion });
  assert.equal(gateSnapshot([], [run(9, 'success'), run(11, 'failure')]).observed, 'FAILURE');
  assert.equal(gateSnapshot([{ __typename: 'StatusContext', context: 'external', targetUrl: 'https://ci.example', state: 'PENDING' }], []).observed, 'UNKNOWN');
  assert.throws(() => gateSnapshot(null, []));
  assert.throws(() => gateSnapshot([{}], []));
  assert.throws(() => gateSnapshot([], [{}]));
});
test('real ignored work stays clean while staged, unstaged and new files require save', async t => {
  const repo = mkdtempSync(join(tmpdir(), 'saved-revision-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'work');
  writeFileSync(join(repo, '.gitignore'), 'ignored\n');
  writeFileSync(join(repo, 'source'), 'source');
  git('-c', 'user.email=fixture@example.com', '-c', 'user.name=Fixture', 'add', '.');
  git('-c', 'user.email=fixture@example.com', '-c', 'user.name=Fixture', 'commit', '-qm', 'fixture');
  writeFileSync(join(repo, 'ignored'), 'ignored');
  assert.equal(git('status', '--porcelain=v1', '--untracked-files=all'), '');
  // Clean with no authoritative remote is UNKNOWN, never a speculative save.
  assert.equal((await savedRevision({ repo })).state, 'UNKNOWN');
  for (const kind of ['unstaged', 'staged', 'untracked']) {
    const file = kind === 'untracked' ? 'new' : 'source';
    writeFileSync(join(repo, file), kind);
    if (kind === 'staged') git('add', 'source');
    assert.equal((await savedRevision({ repo })).state, 'NEEDS_SAVE');
  }
});
test('CLI refuses invalid receipts without printing their values', () => {
  const result = spawnSync(process.execPath, ['.agents/skills/save/scripts/saved-revision.mjs', '--checkpoint', '/no-such-file'], { encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stdout, /Invalid checkpoint input/);
});
test('verified hosted status preserves candidate identity and mandatory gate; never NONE', async t => {
  const repo = mkdtempSync(join(tmpdir(), 'hosted-revision-'));
  t.after(() => rmSync(repo, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-q', '-b', 'work');
  writeFileSync(join(repo, 'proposal.md'), '**Branch:** work\n');
  git('add', 'proposal.md');
  git('-c', 'user.email=fixture@example.com', '-c', 'user.name=Fixture', 'commit', '-qm', 'fixture');
  const headSha = git('rev-parse', 'HEAD');
  const remote = 'https://workspace.artifacts.cloudflare.net/git/org/project.git';
  git('remote', 'add', 'origin', remote);
  const run = (command, args) => {
    assert.equal(command, 'git');
    if (args.includes('ls-remote')) return `${headSha}\trefs/heads/work`;
    return git(...args);
  };
  const selection = { changeName: 'chosen', branch: 'work', headSha, baseSha: OLD };
  const hostedInput = { selection, changeRoot: '.' };
  for (const gateResult of ['SUCCESS', 'FAILURE', 'UNKNOWN', 'TIMEOUT']) {
    const delivery = async (command, input, options) => {
      assert.equal(command, 'gate');
      assert.deepEqual(input, { selection });
      assert.equal(options.remote, remote);
      return { projectId: 'project', generation: 2, candidate: { id: 'candidate', ...selection, checks: { status: gateResult === 'SUCCESS' ? 'passed' : 'failed', runId: 'run' } }, gateResult };
    };
    const result = await savedRevision({ repo, run, hostedInput, delivery });
    assert.equal(result.state, 'SAVED');
    assert.equal(result.gateResult, gateResult);
    const checkpoint = { ...result };
    assert.equal((await savedRevision({ repo, run, hostedInput, delivery, checkpoint })).reused, true);
    assert.notEqual(result.gateResult, 'NONE');
  }
  assert.equal((await savedRevision({ repo, run, hostedInput, delivery: async () => { throw Error('authority'); } })).state, 'UNKNOWN');
  assert.equal((await savedRevision({ repo, run, hostedInput: { ...hostedInput, selection: { ...selection, headSha: HEAD } } })).state, 'UNKNOWN');
  assert.equal((await savedRevision({ repo, run, hostedInput, delivery: async () => ({ candidate: { headSha: HEAD, branch: 'work' } }) })).state, 'UNKNOWN');
});
