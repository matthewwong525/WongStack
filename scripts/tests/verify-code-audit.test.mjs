import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { auditCode, MODEL } from '../../.agents/skills/verify/scripts/verify-code-audit.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const account = 'a'.repeat(32);
const token = 'test-cloudflare-secret-token';
const credentials = { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_API_TOKEN: token };
const runGit = (root, ...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const item = () => JSON.parse('{"scenario":"Keep owner isolation","when":"another owner requests the record","then":"the record is refused","sources":[{"path":"handler.mjs","role":"changed","relationship":"The request handler implements this scenario."}]}');

function fixture(t, { baseline = 'export const allowed = (owner, user) => owner === user;\n', head = 'export const allowed = () => true;\n' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-code-audit-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  runGit(root, 'init', '-q');
  runGit(root, 'config', 'user.email', 'test@example.test');
  runGit(root, 'config', 'user.name', 'Audit test');
  writeFileSync(join(root, 'handler.mjs'), baseline);
  runGit(root, 'add', '.');
  runGit(root, 'commit', '-qm', 'baseline');
  const baselineSha = runGit(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'handler.mjs'), head);
  runGit(root, 'add', '.');
  runGit(root, 'commit', '-qm', 'head', '--allow-empty');
  const sha = runGit(root, 'rev-parse', 'HEAD');
  const setup = (cases = [item()]) => {
    const runDir = mkdtempSync(join(tmpdir(), 'wong-verify-'));
    t.after(() => rmSync(runDir, { recursive: true, force: true }));
    const input = join(runDir, 'code-audit-input.json');
    writeFileSync(input, JSON.stringify({ cases }));
    return { root, sha, baselineSha, runDir, input, exportedEnv: credentials };
  };
  return { root, sha, baselineSha, setup };
}

function answer(choices, choice = choices[0]) {
  return { type: 'choice', choice, probabilities: Object.fromEntries(choices.map(key => [key, key === choice ? 1 : 0])) };
}
function response(body, modify = value => value) {
  const request = JSON.parse(body);
  return new Response(JSON.stringify(modify({ success: true, result: { model: 'clef', answers: {
    assessment: answer(Object.keys(request.questions.assessment.criteria), 'possible_violation'),
    suspected_source: answer(Object.keys(request.questions.suspected_source.criteria), 'source1'),
  }, usage: { input_tokens: 100, output_tokens: 0 } } })), { status: 200 });
}
const noFetch = () => { assert.fail('This audit must not send code'); };

// The dirty file deliberately says the opposite: only saved source may leave the machine.
test('saved source, exact expectations, revisions and redacted records bind the advice', async t => {
  const f = fixture(t, { head: `export const key = '${token}';\nexport const allowed = () => true;\n` });
  writeFileSync(join(f.root, 'handler.mjs'), 'DIRTY unsaved file must not be sent');
  writeFileSync(join(f.root, '.env'), `OTHER_SECRET=durable-other-secret\nCLOUDFLARE_API_TOKEN=durable-api-secret\n`);
  const options = f.setup();
  let calls = 0;
  const record = await auditCode({ ...options, fetchImpl: async (url, init) => {
    calls++;
    assert.equal(url, `https://api.cloudflare.com/client/v4/accounts/${account}/ai/run/${MODEL}`);
    assert.equal(init.headers.Authorization, `Bearer ${token}`);
    assert.equal(init.redirect, 'error');
    assert.equal(init.body.includes(token), false);
    assert.equal(init.body.includes('DIRTY'), false);
    assert.equal(init.body.includes('images'), false);
    const packet = JSON.parse(init.body);
    assert.equal(packet.state.sha, f.sha);
    assert.equal(packet.state.baselineSha, f.baselineSha);
    assert.equal(packet.state.expectation, item().then);
    assert.match(packet.state.sources[0].head.code, /\[redacted:.env\]/);
    assert.match(packet.state.sources[0].baseline.code, /owner === user/);
    return response(init.body, value => { value.result.usage.extra = token; return value; });
  } });
  assert.equal(calls, 1);
  assert.equal(record.result, 'COMPLETE');
  assert.equal(record.advisory, true);
  assert.equal(record.cases[0].assessment.choice, 'possible_violation');
  assert.deepEqual(record.cases[0].usage, { input_tokens: 100, output_tokens: 0 });
  assert.equal(record.cases[0].sources[0].head.hash.length, 64);
  for (const name of ['result.json', 'case-1-request.json']) {
    const file = join(options.runDir, 'code-audit', name);
    assert.equal(readFileSync(file, 'utf8').includes(token), false);
    assert.equal(statSync(file).mode & 0o777, 0o600);
  }
  assert.equal(statSync(join(options.runDir, 'code-audit')).mode & 0o777, 0o700);
  assert.equal('verdict' in record, false);
});

test('durable credentials are reused and all durable/exported values are removed', async t => {
  const exportedSecret = 'exported-extra-secret';
  const durableSecret = 'durable-api-secret';
  const f = fixture(t, { head: `const data = '${durableSecret} ${exportedSecret} ghp_${'x'.repeat(30)}';\n` });
  writeFileSync(join(f.root, '.env'), `CLOUDFLARE_ACCOUNT_ID=${account}\nCLOUDFLARE_API_TOKEN=${durableSecret}\n`);
  const options = f.setup();
  const record = await auditCode({ ...options, exportedEnv: { OTHER_SECRET: exportedSecret }, fetchImpl: async (_, init) => {
    assert.equal(init.headers.Authorization, `Bearer ${durableSecret}`);
    assert.equal(init.body.includes(durableSecret), false);
    assert.equal(init.body.includes(exportedSecret), false);
    assert.equal(init.body.includes(`ghp_${'x'.repeat(30)}`), false);
    return response(init.body);
  } });
  assert.equal(record.result, 'COMPLETE');
});

test('missing optional access does not call the model or produce a behavioral verdict', async t => {
  const f = fixture(t);
  const record = await auditCode({ ...f.setup(), exportedEnv: {}, fetchImpl: noFetch });
  assert.equal(record.result, 'UNAVAILABLE');
  assert.match(record.limitations[0], /credentials unavailable/);
  assert.equal(record.cases.length, 0);
});

test('a moved head prevents transmission and movement during a call invalidates advice', async t => {
  const f = fixture(t);
  const before = f.setup();
  before.sha = f.baselineSha;
  assert.match((await auditCode({ ...before, fetchImpl: noFetch })).limitations[0], /head changed/);
  const during = f.setup();
  const record = await auditCode({ ...during, fetchImpl: async (_, init) => {
    runGit(f.root, 'commit', '-qm', 'moved', '--allow-empty');
    return response(init.body);
  } });
  assert.equal(record.result, 'UNAVAILABLE');
  assert.match(record.limitations[0], /all audit advice is invalid/);
  assert.equal(record.cases[0].status, 'unavailable');
});

test('unsafe, secret, binary, missing and nonregular sources never leave the host', async t => {
  const f = fixture(t);
  writeFileSync(join(f.root, '.env.secret'), 'tracked-secret');
  writeFileSync(join(f.root, 'binary.bin'), Buffer.from([0, 255, 0]));
  symlinkSync('handler.mjs', join(f.root, 'link.mjs'));
  runGit(f.root, 'add', '.');
  runGit(f.root, 'commit', '-qm', 'source kinds');
  const sha = runGit(f.root, 'rev-parse', 'HEAD');
  for (const path of ['../handler.mjs', '/absolute', '.git/config', 'a\\b', '.env.secret', 'secret.key', 'secrets/data', 'binary.bin', 'missing.mjs', 'link.mjs', './handler.mjs', 'a//b']) {
    const selected = item();
    selected.sources[0].path = path;
    const record = await auditCode({ ...f.setup([selected]), sha, fetchImpl: noFetch });
    assert.equal(record.result, 'UNAVAILABLE', path);
    assert.equal(record.cases[0].status, 'unavailable', path);
  }
});

test('new sources have a confirmed absent baseline and explicit ranges preserve line identity', async t => {
  const f = fixture(t);
  writeFileSync(join(f.root, 'new.mjs'), 'first\nsecond\nthird\n');
  runGit(f.root, 'add', '.');
  runGit(f.root, 'commit', '-qm', 'new source');
  const selected = item();
  selected.sources[0].path = 'new.mjs';
  selected.sources[0].headLines = [2, 3];
  const record = await auditCode({ ...f.setup([selected]), sha: runGit(f.root, 'rev-parse', 'HEAD'), fetchImpl: async (_, init) => {
    const source = JSON.parse(init.body).state.sources[0];
    assert.equal(source.baseline, null);
    assert.equal(source.head.code, 'second\nthird');
    return response(init.body);
  } });
  assert.deepEqual(record.cases[0].sources[0].head.lines, [2, 3]);
  selected.sources[0].headLines = [0, 100];
  const bad = await auditCode({ ...f.setup([selected]), sha: runGit(f.root, 'rev-parse', 'HEAD'), fetchImpl: noFetch });
  assert.match(bad.cases[0].reason, /line bounds/);
});

test('request and file ceilings reject excess code instead of silently cropping it', async t => {
  for (const length of [50000, 1048577]) {
    const f = fixture(t, { head: 'x'.repeat(length) });
    const record = await auditCode({ ...f.setup(), fetchImpl: noFetch });
    assert.equal(record.result, 'UNAVAILABLE');
    assert.match(record.cases[0].reason, /exceeds/);
  }
});

test('manifest limits, required fields and revision syntax are explicit unavailable outcomes', async t => {
  const f = fixture(t);
  const badCases = [[], Array.from({ length: 7 }, item), [{ ...item(), when: '' }], [{ ...item(), sources: Array.from({ length: 9 }, () => item().sources[0]) }], [{ ...item(), sources: [{ ...item().sources[0], role: 'unknown' }] }]];
  for (const cases of badCases) {
    const record = await auditCode({ ...f.setup(cases), fetchImpl: noFetch });
    assert.equal(record.result, 'UNAVAILABLE');
    assert.equal(record.cases.length, 0);
  }
  for (const sha of ['HEAD', 'b'.repeat(40)]) {
    const record = await auditCode({ ...f.setup(), sha, fetchImpl: noFetch });
    assert.equal(record.result, 'UNAVAILABLE');
  }
  const broken = f.setup();
  writeFileSync(broken.input, '{bad json');
  assert.equal((await auditCode({ ...broken, fetchImpl: noFetch })).result, 'UNAVAILABLE');
});

test('service failures retain completed cases without retry or raw diagnostics', async t => {
  const f = fixture(t);
  let calls = 0;
  const record = await auditCode({ ...f.setup([item(), item()]), fetchImpl: async (_, init) => {
    calls++;
    return calls === 1 ? response(init.body) : new Response(token, { status: 401 });
  } });
  assert.equal(calls, 2);
  assert.equal(record.result, 'UNAVAILABLE');
  assert.equal(record.cases[0].status, 'complete');
  assert.equal(record.cases[1].reason, 'Service HTTP 401');
  assert.equal(JSON.stringify(record).includes(token), false);
  const network = await auditCode({ ...f.setup(), fetchImpl: () => { throw new Error(token); } });
  assert.equal(network.cases[0].reason, 'Audit input or service unavailable');
});

test('choice, probabilities, model, usage and response sizes are validated', async t => {
  const f = fixture(t);
  const modifications = [
    value => { value.result.model = 'clef-flash'; },
    value => { value.success = false; },
    value => { value.result.answers.extra = {}; },
    value => { value.result.answers.assessment.choice = 'PASS'; },
    value => { value.result.answers.assessment.type = 'text'; },
    value => { value.result.answers.assessment.probabilities.possible_violation = -1; },
    value => { value.result.answers.assessment.probabilities.possible_violation = 0.5; },
    value => { delete value.result.answers.assessment.probabilities.insufficient_context; },
    value => { value.result.usage.input_tokens = '100'; },
  ];
  for (const modify of modifications) {
    const record = await auditCode({ ...f.setup(), fetchImpl: async (_, init) => response(init.body, value => { modify(value); return value; }) });
    assert.equal(record.result, 'UNAVAILABLE');
  }
  for (const body of ['not json', 'x'.repeat(65537)]) {
    const record = await auditCode({ ...f.setup(), fetchImpl: async () => new Response(body) });
    assert.equal(record.result, 'UNAVAILABLE');
  }
});

test('request timeout covers connection and response body; total budget prevents later calls', async t => {
  const f = fixture(t);
  for (const fetchImpl of [() => new Promise(() => {}), async () => new Response(new ReadableStream({ start() {} }))]) {
    const record = await auditCode({ ...f.setup(), fetchImpl, requestMs: 10 });
    assert.equal(record.cases[0].reason, 'Request budget exceeded');
  }
  let calls = 0;
  let elapsed = 0;
  const record = await auditCode({ ...f.setup([item(), item()]), now: () => elapsed, totalMs: 200, fetchImpl: async (_, init) => { calls++; elapsed = 201; return response(init.body); } });
  assert.equal(calls, 1);
  assert.match(record.cases[1].reason, /Total audit budget/);
});

test('output ownership rejects symlinks, reused folders and oversized manifests', async t => {
  const f = fixture(t);
  const linked = f.setup();
  const outside = join(f.root, 'outside.json');
  writeFileSync(outside, '{}');
  rmSync(linked.input);
  symlinkSync(outside, linked.input);
  await assert.rejects(auditCode({ ...linked, fetchImpl: noFetch }), /Symlink/);
  const tooLarge = f.setup();
  writeFileSync(tooLarge.input, 'x'.repeat(65537));
  await assert.rejects(auditCode({ ...tooLarge, fetchImpl: noFetch }), /bounded manifest/);
  const unsafeRun = mkdtempSync(join(tmpdir(), 'wong-test-unsafe-'));
  t.after(() => rmSync(unsafeRun, { recursive: true, force: true }));
  const input = join(unsafeRun, 'input.json');
  writeFileSync(input, '{}');
  await assert.rejects(auditCode({ ...f.setup(), runDir: unsafeRun, input, fetchImpl: noFetch }), /owned walkthrough/);
  const reused = f.setup();
  mkdirSync(join(reused.runDir, 'code-audit'));
  await assert.rejects(auditCode({ ...reused, fetchImpl: noFetch }), /EEXIST/);
});

test('CLI missing arguments use exit 2; unavailable audit reports no verification verdict', t => {
  const script = join(repo, '.agents/skills/verify/scripts/verify-code-audit.mjs');
  const missing = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.equal(missing.status, 2);
  const f = fixture(t);
  const options = f.setup();
  const args = ['--root', f.root, '--input', options.input, '--sha', 'HEAD', '--baseline-sha', f.baselineSha, '--run-dir', options.runDir];
  const run = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env: { ...process.env, CLOUDFLARE_API_TOKEN: '', CLOUDFLARE_ACCOUNT_ID: '' } });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /CODE_AUDIT_RESULT=UNAVAILABLE/);
  assert.doesNotMatch(run.stdout, /SUCCESS|FAILURE|PASS|FAIL/);
  const unavailable = spawnSync(process.execPath, [script, ...args.slice(0, -1), '/missing-folder'], { encoding: 'utf8' });
  assert.equal(unavailable.status, 0);
  assert.match(unavailable.stdout, /folder or record unavailable/);
});
