import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  BOUNDS, deployedAddress, eventParams, INSTALL, interrupted, leaveTurn, marked, readLogs, runnerConfig, runPipeline, takeTurn,
} from '../check-runner/pipeline.mjs';
import { runId } from '../check-runner/run-id.mjs';

const folder = new URL('../check-runner/', import.meta.url);
const read = name => readFileSync(new URL(name, folder), 'utf8');

const SHA = 'c'.repeat(40);
const OTHER = 'd'.repeat(40);
const BEFORE = 'b'.repeat(40);
const ZERO = '0'.repeat(40);
const BRANCH = 'add-recipes';
const REF = `refs/heads/${BRANCH}`;
const MAIN = 'refs/heads/main';
const CONFIG = { account: 'a'.repeat(32), namespace: 'wong', repo: 'demo' };
const PREVIEW = 'https://add-recipes-demo.example.workers.dev';
const LIVE = 'https://demo.example.workers.dev';
const STAGES = ['prepare', 'checks', 'deploy'];

// What each stage prints when a branch passes.
const PASSES = {
  prepare: `WONG_PREPARED ${SHA}\n`,
  checks: 'ok 1 - totals add up\nWONG_APP built\n',
  deploy: `Uploaded demo\nWONG_OUTPUT preview-url=${PREVIEW}\n`,
};

// A push event as Cloudflare sends it, and the run parameters the runner makes of it.
const push = (payload = {}, source = {}) => ({
  type: 'cf.artifacts.repo.pushed',
  source: { namespace: CONFIG.namespace, repoName: CONFIG.repo, ...source },
  payload: { ref: REF, after: SHA, before: BEFORE, ...payload },
});
const paramsOf = payload => eventParams(push(payload), CONFIG);

// The two ways the SDK rejects a runner: the command's own exit, and the Sandbox going away.
const exited = (name, output) => new Error(`${name} failed: ${name} failed with exit code 1\n=== stdout ===\n${output}`);
const lost = name => new Error(`${name} failed: OperationInterruptedError: RPC session was shut down by disposing the main stub`);

// A log stream that hands out one chunk per read and calls `onEnd` only when it was read to the end.
function stream(chunks, onEnd) {
  const left = [...chunks];
  return new ReadableStream({
    pull(controller) {
      if (left.length) {
        controller.enqueue(new TextEncoder().encode(left.shift()));
      } else {
        onEnd();
        controller.close();
      }
    },
  });
}

// A stand-in for the SDK's context: the published SDK ships no test fixtures. `answers` maps a step
// name to what its runner does: a string is its stdout, `{ stdout, stderr }` its logs (strings or
// streams), an Error its rejection. Every call is recorded with the step it was chained from.
function standIn(answers = {}) {
  const script = { ...PASSES, ...answers };
  const seen = [];
  const runnerAfter = parent => async options => {
    seen.push({ parent, options });
    const answer = script[options.name];
    if (answer === undefined) throw new Error(`${options.name} failed: ${options.name} failed with exit code 127`);
    if (answer instanceof Error) throw answer;
    const logs = typeof answer === 'string' ? { stdout: answer, stderr: '' } : answer;
    return { exitCode: 0, logs, snapshot: { id: `snapshot-${options.name}` }, runner: runnerAfter(options.name) };
  };
  return { ci: { runner: runnerAfter(null) }, seen, names: () => seen.map(call => call.options.name) };
}

const failedAt = (result, stage) => assert.deepEqual({ ...result, reason: '' }, { commit: result.commit, ref: result.ref, result: 'failure', stage, reason: '' });
// A run the Sandbox cut off: its own result word, never `failure`, with the stage and Cloudflare's message.
const cutOffAt = (result, stage) => {
  assert.deepEqual({ ...result, reason: '' }, { commit: SHA, ref: result.ref, result: 'interrupted', stage, reason: '' });
  assert.match(result.reason, /OperationInterruptedError/);
};
// The step names of a stage tried `tries` times.
const tried = (name, tries) => [name, `${name}-retry`, `${name}-retry-2`, `${name}-retry-3`].slice(0, tries);

// ---------------------------------------------------------------------------
// One run

test('a passing branch runs prepare, checks and deploy in order, and returns the preview its deploy reported', async () => {
  const drained = [];
  const { ci, seen, names } = standIn({
    deploy: {
      stdout: stream(['Uploaded demo\nWONG_OUTPUT preview-', `url=${PREVIEW}\n`], () => drained.push('stdout')),
      stderr: stream(['npm warn deprecated\n'], () => drained.push('stderr')),
    },
  });
  const result = await runPipeline(paramsOf(), ci, CONFIG);
  assert.deepEqual(result, { commit: SHA, ref: REF, result: 'success', deployed: true, app: 'built', preview: PREVIEW });
  assert.deepEqual(names(), STAGES);
  assert.deepEqual(seen.map(call => call.parent), [null, 'prepare', 'checks'], 'each stage runs in the runner the one before it left');
  assert.deepEqual(drained.sort(), ['stderr', 'stdout'], 'both of the deploy stage\'s log streams are read to the end');
});

test('readLogs reads both of a runner\'s logs to the end, as strings or as streams', async () => {
  assert.equal(await readLogs({ stdout: 'out\n', stderr: 'err\n' }), 'out\n\nerr\n');
  const drained = [];
  const logs = {
    stdout: stream(['out-1 ', 'out-2'], () => drained.push('stdout')),
    stderr: stream(['err-1 ', 'err-2'], () => drained.push('stderr')),
  };
  assert.equal(await readLogs(logs), 'out-1 out-2\nerr-1 err-2');
  assert.deepEqual(drained.sort(), ['stderr', 'stdout']);
});

test('each stage holds only the credential it needs, and the project\'s own checks hold none', async () => {
  const { ci, seen } = standIn();
  await runPipeline(paramsOf(), ci, CONFIG);
  const [prepare, checks, deploy] = seen.map(call => call.options);
  assert.deepEqual([prepare.sourceControlCredentials, prepare.cloudflareCredentials], [true, false]);
  assert.deepEqual([checks.sourceControlCredentials, checks.cloudflareCredentials], [false, false]);
  assert.deepEqual([deploy.sourceControlCredentials, deploy.cloudflareCredentials], [false, { accountId: CONFIG.account }]);
});

test('a stage is told the commit and branch only, and they never enter its command text', async () => {
  const pushed = standIn();
  await runPipeline(paramsOf(), pushed.ci, CONFIG);
  assert.equal(pushed.seen.length, 3);
  for (const { options } of pushed.seen) {
    assert.deepEqual(options.env, { WONG_HEAD: SHA, WONG_BRANCH: BRANCH, WONG_BEFORE: BEFORE }, options.name);
    assert.ok(!options.command.includes(SHA) && !options.command.includes(BRANCH), `${options.name} wrote the push into its script`);
  }
  const first = standIn();
  await runPipeline(paramsOf({ before: ZERO }), first.ci, CONFIG);
  assert.equal(first.seen.length, 3);
  for (const { options } of first.seen) assert.deepEqual(options.env, { WONG_HEAD: SHA, WONG_BRANCH: BRANCH }, options.name);
});

test('a failing check ends the run before any deploy, and keeps the tail of its output', async () => {
  const output = `${'.'.repeat(BOUNDS.reasonChars)}\nnot ok 7 - totals add up\n`;
  const { ci, names } = standIn({ checks: exited('checks', output) });
  const result = await runPipeline(paramsOf(), ci, CONFIG);
  failedAt(result, 'checks');
  assert.equal(result.commit, SHA);
  assert.equal(result.ref, REF);
  assert.equal(result.reason.length, BOUNDS.reasonChars);
  assert.ok(result.reason.endsWith('not ok 7 - totals add up\n'));
  assert.deepEqual(names(), ['prepare', 'checks']);
});

test('a failing prepare or deploy is a failure at that stage, with no address', async () => {
  const prepare = standIn({ prepare: exited('prepare', 'fatal: could not read from the repository\n') });
  failedAt(await runPipeline(paramsOf(), prepare.ci, CONFIG), 'prepare');
  assert.deepEqual(prepare.names(), ['prepare']);
  const deploy = standIn({ deploy: exited('deploy', `WONG_OUTPUT preview-url=${PREVIEW}\nmigration failed\n`) });
  const result = await runPipeline(paramsOf(), deploy.ci, CONFIG);
  failedAt(result, 'deploy');
  assert.match(result.reason, /migration failed/);
});

test('a push to main deploys production, and returns the address under `production`', async () => {
  const { ci, seen, names } = standIn({ deploy: `WONG_OUTPUT production-url=${LIVE}\n` });
  const result = await runPipeline(paramsOf({ ref: MAIN }), ci, CONFIG);
  assert.deepEqual(result, { commit: SHA, ref: MAIN, result: 'success', deployed: true, app: 'built', production: LIVE });
  assert.deepEqual(names(), STAGES);
  assert.deepEqual(seen.map(call => call.options.env.WONG_BRANCH), ['main', 'main', 'main']);
  const preview = standIn();
  const wrong = await runPipeline(paramsOf({ ref: MAIN }), preview.ci, CONFIG);
  failedAt(wrong, 'deploy');
  assert.match(wrong.reason, /no production address/, 'a preview address is not a production one');
});

test('a commit with no checks, a docs-only commit and an unconfigured app stop after the checks', async () => {
  for (const [word, expected] of [
    ['none', { result: 'none', deployed: false }],
    ['untouched', { result: 'success', deployed: false, app: 'untouched' }],
    ['unconfigured', { result: 'success', deployed: false, app: 'unconfigured' }],
  ]) {
    const { ci, names } = standIn({ checks: `WONG_APP ${word}\n` });
    assert.deepEqual(await runPipeline(paramsOf(), ci, CONFIG), { commit: SHA, ref: REF, ...expected });
    assert.deepEqual(names(), ['prepare', 'checks'], `${word} started a deploy`);
  }
});

test('checks that end without one clear word are a failure, never a pass', async () => {
  for (const logs of ['ok 1 - totals add up\n', 'WONG_APP built\nWONG_APP none\n', 'WONG_APP shipped\n']) {
    const { ci, names } = standIn({ checks: logs });
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    failedAt(result, 'checks');
    assert.match(result.reason, /without saying what they built/);
    assert.deepEqual(names(), ['prepare', 'checks']);
  }
});

test('the prepare stage compares with nothing when the base is the project\'s empty first commit', async () => {
  const { ci, seen } = standIn({});
  await runPipeline(paramsOf(), ci, CONFIG);
  const prepare = seen.find(call => call.options.name === 'prepare').options.command;
  const guard = prepare.indexOf('= "$(git hash-object -t tree /dev/null)" ]; then base=""; fi');
  assert.ok(guard > -1, 'an install\'s first save would be compared with an empty main, and every check setting read as changed');
  assert.ok(guard < prepare.indexOf('> .git/wong-base'), 'the base is written before the empty commit is ruled out');
});

test('one Sandbox interruption is tried again under the name <stage>-retry, and the run goes on', async () => {
  for (const name of STAGES) {
    const { ci, seen, names } = standIn({ [name]: lost(name), [`${name}-retry`]: PASSES[name] });
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    assert.equal(result.result, 'success', `${name}: ${result.reason}`);
    assert.equal(result.preview, PREVIEW);
    assert.deepEqual(names(), STAGES.flatMap(stage => (stage === name ? [stage, `${stage}-retry`] : [stage])));
    const [first, retry] = seen.filter(call => call.options.name.startsWith(name));
    assert.deepEqual({ ...retry.options, name }, first.options, 'the retry is the same step: same command, credentials and bounds');
    assert.equal(retry.parent, first.parent, 'the retry starts from the same runner');
  }
});

test('three interruptions are each tried again, every try under its own step name, and the run still passes', async () => {
  assert.equal(BOUNDS.interruptions, 3);
  for (const name of STAGES) {
    const [first, ...retries] = tried(name, 4);
    const { ci, seen, names } = standIn({ ...Object.fromEntries([first, ...retries.slice(0, 2)].map(step => [step, lost(step)])), [retries[2]]: PASSES[name] });
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    assert.equal(result.result, 'success', `${name}: ${result.reason}`);
    assert.deepEqual(names(), STAGES.flatMap(stage => (stage === name ? tried(stage, 4) : [stage])));
    assert.equal(new Set(names()).size, names().length, 'a step name was used twice');
    const tries = seen.filter(call => call.options.name.startsWith(name));
    for (const call of tries) {
      assert.deepEqual({ ...call.options, name }, tries[0].options, 'every try is the same step');
      assert.equal(call.parent, tries[0].parent, 'every try starts from the same runner');
    }
  }
});

test('a fourth interruption ends the run as interrupted at that stage, never as a failure', async () => {
  for (const name of STAGES) {
    const { ci, names } = standIn(Object.fromEntries(tried(name, 4).map(step => [step, lost(step)])));
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    cutOffAt(result, name);
    assert.equal(result.ref, REF);
    assert.equal('preview' in result || 'deployed' in result, false, 'a run that was cut off reports no deploy');
    assert.deepEqual(names(), [...STAGES.slice(0, STAGES.indexOf(name)), ...tried(name, 4)], 'nothing after the cut-off stage runs');
  }
});

test('a command\'s own failure or a timeout is never retried', async () => {
  for (const error of [exited('checks', 'not ok 1 - totals add up\n'), new Error('checks failed: command timed out after 1010000ms')]) {
    const { ci, names } = standIn({ checks: error, 'checks-retry': PASSES.checks });
    failedAt(await runPipeline(paramsOf(), ci, CONFIG), 'checks');
    assert.deepEqual(names(), ['prepare', 'checks'], error.message.split('\n')[0]);
  }
  // Nor after an interruption was tried again: the commit's own failure stands as a failure.
  const after = standIn({ checks: lost('checks'), 'checks-retry': exited('checks-retry', 'not ok 1 - totals add up\n'), 'checks-retry-2': PASSES.checks });
  failedAt(await runPipeline(paramsOf(), after.ci, CONFIG), 'checks');
  assert.deepEqual(after.names(), ['prepare', 'checks', 'checks-retry']);
  for (const [message, expected] of [
    ['deploy failed: OperationInterruptedError: RPC session was shut down by disposing the main stub', true],
    ['checks failed: the container went away', true],
    ['checks failed: checks failed with exit code 1\n=== stdout ===\nnot ok 1', false],
    ['deploy failed: deploy failed with exit code 137', false],
    // A long output: the SDK keeps its end, and the exit-code line is gone (seen on a real install).
    [`checks failed: [diagnostic truncated]\nut ===\n${'x'.repeat(50)}\n FAIL  src/a.test.ts\n=== stderr ===\n`, false],
    ['checks failed: tail only\n=== stderr ===\nnpm error', false],
    ['checks failed: command timed out after 1010000ms', false],
    ['prepare failed: Timeout waiting for the command', false],
    ['deploy failed: the step hit its time out', false],
  ]) {
    assert.equal(interrupted(new Error(message)), expected, message);
    assert.equal(interrupted(message), expected, `as a bare value: ${message}`);
  }
  // The SDK's own error is kept as the cause: its exit-code line counts though the wrapper lost it.
  assert.equal(interrupted(new Error('checks failed: lost', { cause: new Error('checks failed with exit code 1') })), false);
});

test('a prepared commit that is not the pushed commit fails at prepare, and nothing later runs', async () => {
  for (const logs of [`WONG_PREPARED ${OTHER}\n`, 'Initialized an empty repository\n', `WONG_PREPARED ${SHA}\nWONG_PREPARED ${OTHER}\n`]) {
    const { ci, names } = standIn({ prepare: logs });
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    failedAt(result, 'prepare');
    assert.match(result.reason, /not the pushed commit/);
    assert.deepEqual(names(), ['prepare']);
  }
});

test('a deploy that reports no https address for this branch is a failure, never a pass', async () => {
  for (const logs of [
    'Uploaded demo\n',
    'WONG_OUTPUT preview-url=\n',
    'WONG_OUTPUT preview-url=http://add-recipes-demo.example.workers.dev\n',
    `WONG_OUTPUT preview-url=${PREVIEW} and more\n`,
    `WONG_OUTPUT production-url=${LIVE}\n`,
    `preview-url=${PREVIEW}\n`,
  ]) {
    const { ci, names } = standIn({ deploy: logs });
    const result = await runPipeline(paramsOf(), ci, CONFIG);
    failedAt(result, 'deploy');
    assert.match(result.reason, /reported no preview address/, logs);
    assert.deepEqual(names(), STAGES);
  }
});

test('deployedAddress takes the last https address written for its key', () => {
  assert.equal(deployedAddress(`WONG_OUTPUT preview-url=${PREVIEW}\n`, 'preview-url'), PREVIEW);
  assert.equal(deployedAddress(`WONG_OUTPUT preview-url=${LIVE}\nWONG_OUTPUT preview-url=${PREVIEW}\n`, 'preview-url'), PREVIEW);
  assert.equal(deployedAddress('WONG_OUTPUT preview-url=https://demo.example:8443/apps/x\n', 'preview-url'), 'https://demo.example:8443/apps/x');
  for (const logs of [
    `WONG_OUTPUT production-url=${LIVE}\n`,
    'WONG_OUTPUT preview-url=https://\n',
    'WONG_OUTPUT preview-url=javascript:alert(1)\n',
    `  WONG_OUTPUT preview-url=${PREVIEW}\n`,
    `WONG_OUTPUT preview-url=${PREVIEW}\nWONG_OUTPUT preview-url=\n`,
  ]) assert.equal(deployedAddress(logs, 'preview-url'), null, logs);
});

test('marked reads the one value a stage printed, and nothing when there are none or several', () => {
  assert.equal(marked('ok 1\nWONG_APP built \nok 2\n', 'WONG_APP'), 'built');
  for (const logs of ['ok 1\n', 'WONG_APP built\nWONG_APP none\n', '  WONG_APP built\n', 'WONG_APPLE built\n']) assert.equal(marked(logs, 'WONG_APP'), null, logs);
});

test('a run for another repository, or one naming no branch commit, throws before any runner starts', async () => {
  const good = paramsOf();
  const { ci, seen } = standIn();
  for (const bad of [{ ...good, repo: 'other' }, { ...good, owner: 'elsewhere' }, undefined]) {
    await assert.rejects(runPipeline(bad, ci, CONFIG), /another repository/);
  }
  for (const bad of [{ ...good, ref: 'refs/tags/v1.0.0' }, { ...good, ref: undefined }, { ...good, sha: SHA.slice(0, 7) }, { ...good, sha: undefined }]) {
    await assert.rejects(runPipeline(bad, ci, CONFIG), /names no branch commit/);
  }
  assert.deepEqual(seen, []);
});

// ---------------------------------------------------------------------------
// From a push to a run

test('a branch push maps to the run\'s parameters', () => {
  const params = eventParams(push(), CONFIG);
  assert.deepEqual(
    { owner: params.owner, repo: params.repo, sha: params.sha, ref: params.ref, branch: params.branch, beforeSha: params.beforeSha },
    { owner: CONFIG.namespace, repo: CONFIG.repo, sha: SHA, ref: REF, branch: BRANCH, beforeSha: BEFORE },
  );
  assert.equal(eventParams(push({ ref: 'refs/heads/fix/login' }), CONFIG).branch, 'fix/login');
});

test('a repeated event maps to the same parameters, and so to the same run', async () => {
  const [first, again] = [eventParams(push(), CONFIG), eventParams(push(), CONFIG)];
  assert.deepEqual(again, first);
  assert.equal(await runId(again.sha, again.ref), await runId(first.sha, first.ref));
});

test('a run is named for its commit and its branch', async () => {
  const id = await runId(SHA, REF);
  assert.match(id, new RegExp(`^wong-${SHA}-[0-9a-f]{12}$`));
  assert.notEqual(await runId(SHA, MAIN), id, 'the same commit on another branch is another run');
  assert.notEqual(await runId(OTHER, REF), id);
  for (const [sha, ref] of [[SHA.slice(0, 7), REF], [SHA, 'refs/tags/v1.0.0'], [SHA, BRANCH], [undefined, REF]]) {
    await assert.rejects(runId(sha, ref), /full commit id and a branch ref/);
  }
});

test('a push that starts nothing maps to null', () => {
  for (const [why, event] of [
    ['a tag', push({ ref: 'refs/tags/v1.0.0' })],
    ['a deleted branch', push({ after: ZERO })],
    ['a short commit id', push({ after: SHA.slice(0, 7) })],
    ['another repository', push({}, { repoName: 'other' })],
    ['another namespace', push({}, { namespace: 'elsewhere' })],
    ['another event type', { ...push(), type: 'cf.artifacts.repo.created' }],
    ['no payload', { type: 'cf.artifacts.repo.pushed', source: push().source }],
    ['no event', undefined],
  ]) assert.equal(eventParams(event, CONFIG), null, why);
});

test('a first push, with no commit before it, leaves beforeSha out', () => {
  assert.equal('beforeSha' in eventParams(push({ before: ZERO }), CONFIG), false);
  assert.equal('beforeSha' in eventParams(push({ before: undefined }), CONFIG), false);
});

// ---------------------------------------------------------------------------
// Bounds

test('a run\'s three stages add up to exactly 30 minutes, before any stage an interruption repeats', () => {
  assert.equal(BOUNDS.prepareMs + BOUNDS.checksMs + BOUNDS.deployMs, 30 * 60_000);
  assert.equal(BOUNDS.interruptions, 3);
});

test('a runner is never retried blindly, stops at its bound, and keeps its snapshot one day', () => {
  const config = runnerConfig(BOUNDS.checksMs);
  assert.equal(config.retries.limit, 0);
  assert.equal(config.timeout, BOUNDS.checksMs);
  assert.ok(config.commandTimeoutMs > 0 && config.commandTimeoutMs < config.timeout);
  assert.equal(config.snapshotRetentionSeconds, BOUNDS.snapshotSeconds);
  assert.equal(BOUNDS.snapshotSeconds, 24 * 60 * 60);
});

test('every stage of a run, and its retry, runs under that stage\'s bound', async () => {
  const { ci, seen } = standIn({ checks: lost('checks'), 'checks-retry': PASSES.checks });
  await runPipeline(paramsOf(), ci, CONFIG);
  assert.deepEqual(seen.map(call => [call.options.name, call.options.config]), [
    ['prepare', runnerConfig(BOUNDS.prepareMs)],
    ['checks', runnerConfig(BOUNDS.checksMs)],
    ['checks-retry', runnerConfig(BOUNDS.checksMs)],
    ['deploy', runnerConfig(BOUNDS.deployMs)],
  ]);
});

test('one run at a time: the first in line has the turn, and a second waits for it to leave', () => {
  const first = takeTurn([], 'run-a', 1_000);
  assert.deepEqual(first, { line: [{ id: 'run-a', at: 1_000, startedAt: 1_000 }], mine: true });
  const second = takeTurn(first.line, 'run-b', 2_000);
  assert.equal(second.mine, false);
  const again = takeTurn(second.line, 'run-b', 3_000);
  assert.equal(again.mine, false);
  assert.deepEqual(again.line, [{ id: 'run-a', at: 1_000, startedAt: 1_000 }, { id: 'run-b', at: 2_000 }], 'asking twice queued the run twice');
  assert.equal(takeTurn(again.line, 'run-a', 4_000).mine, true, 'the first run keeps its turn while it runs');
  const left = leaveTurn(again.line, 'run-a');
  assert.deepEqual(takeTurn(left, 'run-b', 5_000), { line: [{ id: 'run-b', at: 2_000, startedAt: 5_000 }], mine: true });
  assert.deepEqual(leaveTurn(left, 'run-b'), []);
  assert.deepEqual(first.line, [{ id: 'run-a', at: 1_000, startedAt: 1_000 }], 'a line is never changed in place');
});

test('a run that never left stops blocking once its turn is older than the turn\'s lifetime', () => {
  const stuck = [{ id: 'run-a', at: 0, startedAt: 0 }];
  assert.equal(takeTurn(stuck, 'run-b', BOUNDS.turnTtlMs - 1).mine, false);
  assert.deepEqual(takeTurn(stuck, 'run-b', BOUNDS.turnTtlMs), { line: [{ id: 'run-b', at: BOUNDS.turnTtlMs, startedAt: BOUNDS.turnTtlMs }], mine: true });
  assert.ok(BOUNDS.turnTtlMs >= BOUNDS.prepareMs + BOUNDS.checksMs + BOUNDS.deployMs, 'a turn must outlive a full run, or two runs overlap');
  assert.ok(BOUNDS.turnPolls * BOUNDS.turnSeconds * 1000 >= BOUNDS.turnTtlMs, 'a waiting run must outlast a turn that was never left');
});

test('a run\'s turn is timed from when it reaches the head, not from when it queued', () => {
  const waited = takeTurn([{ id: 'run-a', at: 0, startedAt: 0 }, { id: 'run-b', at: 1_000 }], 'run-b', 10 * 60_000);
  assert.equal(waited.mine, false);
  const head = takeTurn(leaveTurn(waited.line, 'run-a'), 'run-b', 10 * 60_000);
  assert.deepEqual(head.line, [{ id: 'run-b', at: 1_000, startedAt: 10 * 60_000 }]);
  const late = 10 * 60_000 + BOUNDS.turnTtlMs - 1;
  assert.equal(takeTurn(head.line, 'run-c', late).mine, false, 'a run that waited ten minutes was dropped while still inside its own turn');
  assert.equal(takeTurn(head.line, 'run-c', late + 1).mine, true);
});

test('a run gets three more tries in all, not three for each stage', async () => {
  const { ci, names } = standIn({
    prepare: lost('prepare'), 'prepare-retry': PASSES.prepare,
    checks: lost('checks'), 'checks-retry': lost('checks-retry'), 'checks-retry-2': PASSES.checks,
    deploy: lost('deploy'), 'deploy-retry': PASSES.deploy,
  });
  const result = await runPipeline(paramsOf(), ci, CONFIG);
  cutOffAt(result, 'deploy');
  assert.deepEqual(names(), ['prepare', 'prepare-retry', 'checks', 'checks-retry', 'checks-retry-2', 'deploy']);
});

// ---------------------------------------------------------------------------
// The deploy stage's own install

test('the deploy stage installs the app\'s packages itself, before the deploy token is used for anything', async () => {
  const { ci, seen } = standIn();
  await runPipeline(paramsOf(), ci, CONFIG);
  const lines = seen.find(call => call.options.name === 'deploy').options.command.split('\n');
  const at = text => lines.findIndex(line => line === text);
  const order = ['dir=$(bash scripts/cf-build.sh --app-dir)', INSTALL, 'node scripts/cf-secrets.mjs check', 'bash scripts/cf-build.sh', 'bash scripts/cf-deploy.sh'].map(at);
  assert.ok(order.every(index => index > -1), `a deploy step is missing: ${order}`);
  assert.deepEqual(order, [...order].sort((a, b) => a - b), 'the packages are installed first: the files carried over from the checks can arrive incomplete');
  assert.match(INSTALL, /npm ci --no-audit --no-fund/);
  assert.equal(lines.filter(line => line.includes('npm ')).length, 1, 'the deploy stage runs npm once, in the scrubbed install');
  const checks = seen.find(call => call.options.name === 'checks').options.command;
  assert.ok(!checks.includes(INSTALL), 'the checks stage holds no credential to scrub');
});

test('the install runs in the app\'s folder with no Cloudflare credential in reach, and the stage keeps its own', t => {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-runner-install-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, 'bin'));
  mkdirSync(join(root, 'app'));
  // A stand-in npm: what an install script would see.
  writeFileSync(join(root, 'bin/npm'), '#!/bin/sh\n{ echo "cwd=$PWD"; echo "args=$*"; env; } > "$SEEN"\nexit "${NPM_STATUS:-0}"\n');
  chmodSync(join(root, 'bin/npm'), 0o755);
  const seenFile = join(root, 'seen');
  const run = (vars = {}) => spawnSync('bash', ['-c', `set -eu\n${INSTALL}\necho "after=\${CLOUDFLARE_API_TOKEN:-}/\${CLOUDFLARE_ACCOUNT_ID:-}"\n`], { encoding: 'utf8', env: {
    PATH: `${join(root, 'bin')}:${process.env.PATH}`, HOME: root, SEEN: seenFile, dir: join(root, 'app'), KEPT: 'project-setting',
    CLOUDFLARE_API_TOKEN: 'deploy-token', CLOUDFLARE_ACCOUNT_ID: 'a'.repeat(32), CLOUDFLARE_API_KEY: 'older-key', CLOUDFLARE_EMAIL: 'owner@example.com', ...vars } });
  const result = run();
  assert.equal(result.status, 0, result.stderr);
  const seen = readFileSync(seenFile, 'utf8');
  assert.match(seen, new RegExp(`^cwd=${join(root, 'app')}$`, 'm'));
  assert.match(seen, /^args=ci --no-audit --no-fund$/m);
  assert.ok(!/^CLOUDFLARE_/m.test(seen) && !seen.includes('deploy-token') && !seen.includes('older-key'), `the install saw a Cloudflare credential:\n${seen}`);
  assert.match(seen, /^KEPT=project-setting$/m, 'only the credential is removed');
  assert.match(result.stdout, new RegExp(`^after=deploy-token/${'a'.repeat(32)}$`, 'm'), 'the deploy that follows still holds its credential');
  // A failed install stops the stage, under `set -e`, before anything is deployed.
  const failed = run({ NPM_STATUS: '1' });
  assert.notEqual(failed.status, 0);
  assert.ok(!failed.stdout.includes('after='));
  // With no credential set at all there is nothing to remove, and the install still runs.
  const bare = run({ CLOUDFLARE_API_TOKEN: undefined, CLOUDFLARE_ACCOUNT_ID: undefined, CLOUDFLARE_API_KEY: undefined, CLOUDFLARE_EMAIL: undefined });
  assert.equal(bare.status, 0, bare.stderr);
  assert.match(bare.stdout, /^after=\/$/m);
});

// ---------------------------------------------------------------------------
// The runner's config template and pinned tools

const template = () => JSON.parse(read('wrangler.template.jsonc').split('\n').filter(line => !line.trimStart().startsWith('//')).join('\n'));
const pkg = () => JSON.parse(read('package.json'));

test('the container is the public Sandbox image at the pinned SDK\'s own version, and small', () => {
  const [container, ...more] = template().containers;
  assert.deepEqual(more, []);
  assert.equal(container.image, 'docker.io/cloudflare/sandbox:0.12.5');
  assert.equal(container.image, `docker.io/cloudflare/sandbox:${pkg().dependencies['@cloudflare/sandbox']}`);
  assert.ok(Number.isInteger(container.max_instances) && container.max_instances >= 1 && container.max_instances <= 2);
});

test('only a push to the install\'s own repository starts the runner\'s workflow, and it serves no web address', () => {
  const config = template();
  assert.equal(config.triggers.events.length, 1);
  const [event] = config.triggers.events;
  assert.equal(event.type, 'cf.artifacts.repo.pushed');
  assert.deepEqual(Object.keys(event.filter).sort(), ['namespace', 'repo_name']);
  assert.deepEqual(event.targets, [{ type: 'workflow', workflow_name: config.workflows[0].name }]);
  const runner = JSON.parse(config.vars.WONG_RUNNER);
  assert.deepEqual(Object.keys(runner).sort(), ['account', 'namespace', 'repo']);
  assert.deepEqual([runner.namespace, runner.repo], [event.filter.namespace, event.filter.repo_name], 'the run serves the repository its trigger filters on');
  assert.equal(config.workers_dev, false);
});

test('the Worker exports every class its config names, and a default handler', () => {
  const config = template();
  const worker = read('worker.mjs');
  assert.equal(config.main, 'worker.mjs');
  const named = [config.workflows[0].class_name, config.containers[0].class_name, ...config.durable_objects.bindings.map(binding => binding.class_name)];
  assert.deepEqual([...new Set(named)].sort(), ['Checks', 'CiSandbox', 'Turns']);
  assert.match(worker, /^export class Checks\b/m);
  assert.match(worker, /^export class Turns\b/m);
  assert.match(worker, /^export \{[^}]*\bCiSandbox\b[^}]*\}/m);
  assert.match(worker, /^export default\b/m);
});

test('the runner\'s tools are pinned to exact versions, and the lockfile locks the same ones', () => {
  const { dependencies, devDependencies } = pkg();
  const pins = { '@cloudflare/ci': dependencies['@cloudflare/ci'], '@cloudflare/sandbox': dependencies['@cloudflare/sandbox'], wrangler: devDependencies.wrangler };
  assert.ok(existsSync(new URL('package-lock.json', folder)), 'the runner has no lockfile');
  const lock = JSON.parse(read('package-lock.json'));
  for (const [name, version] of Object.entries(pins)) {
    assert.match(String(version), /^\d+\.\d+\.\d+$/, `${name} is not pinned to one exact version`);
    assert.equal(lock.packages[`node_modules/${name}`]?.version, version, `the lockfile locks another ${name}`);
  }
  assert.deepEqual(lock.packages[''].dependencies, dependencies);
  assert.deepEqual(lock.packages[''].devDependencies, devDependencies);
  const sandboxes = Object.keys(lock.packages).filter(key => key.endsWith('node_modules/@cloudflare/sandbox'));
  assert.deepEqual(sandboxes, ['node_modules/@cloudflare/sandbox'], 'a second copy of the Sandbox SDK would not match the image');
});
