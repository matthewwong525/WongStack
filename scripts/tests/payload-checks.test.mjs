import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { STEPS, failureDigest, runSteps, selectSteps, workflowDrift } from '../payload-checks.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, 'scripts/payload-checks.mjs');
const workflow = readFileSync(join(repo, '.github/workflows/payload.yml'), 'utf8');
const names = steps => steps.map(step => step.name);

test('every listed command is in the workflow, under the same condition', () => {
  assert.deepEqual(workflowDrift(workflow), []);
  assert.equal(new Set(names(STEPS)).size, STEPS.length, 'step names are unique');
});

test('a command removed from the workflow, or moved to another condition, is named', () => {
  const lint = STEPS.find(step => step.name === 'lint');
  const removed = workflow.replace(lint.command, 'scripts/tests/node_modules/.bin/oxlint scripts');
  assert.notEqual(removed, workflow);
  assert.deepEqual(workflowDrift(removed), [`lint: the workflow no longer runs \`${lint.command}\``]);
  // The same command under the opposite condition, and with its condition dropped.
  const flipped = workflow.replace("if: ${{ steps.scope.outputs.docs_only == 'true' }}", "if: ${{ steps.scope.outputs.docs_only != 'true' }}");
  assert.deepEqual(workflowDrift(flipped), ["private-names: listed as docs, but the workflow runs it when docs_only != 'true'"]);
  const always = workflow.replace(/( {6}- name: Lint scripts\n) {8}if: [^\n]*\n/, '$1');
  assert.deepEqual(workflowDrift(always), ['lint: listed as code, but the workflow runs it always']);
  const conditional = workflow.replace('      - name: Release checks\n', "      - name: Release checks\n        if: ${{ steps.scope.outputs.docs_only != 'true' }}\n");
  assert.equal(workflowDrift(conditional).length, 5, 'all five release checks drift together');
});

test('the changed paths pick the steps by the workflow\'s rule', () => {
  assert.deepEqual(names(selectSteps()), ['lint', 'shellcheck', 'script-tests', 'payload-links', 'openspec-config', 'retired-names', 'specs', 'context-budget']);
  assert.deepEqual(names(selectSteps({ docsOnly: true })), ['private-names', 'payload-links', 'openspec-config', 'retired-names', 'specs', 'context-budget']);
  assert.deepEqual(names(selectSteps({ docsOnly: true, only: ['lint', 'specs'] })), ['lint', 'specs']);
});

test('the source-only scripts ship to no install', () => {
  const inventory = readFileSync(join(repo, '.agents/skills/wong-sync/references/payload-files.json'), 'utf8');
  assert.doesNotMatch(inventory, /payload-checks|measure-sessions/);
});

// A stand-in repo: each checked script is a stub that exits as the test says, and the
// commands in STEPS run against it unchanged.
function fixture(t, { deps = true } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-payload-checks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const write = (path, text, mode) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
    if (mode) chmodSync(join(root, path), mode);
  };
  const stub = name => `console.log('${name} ran');\nif (process.env.FAIL === '${name}') { console.error('${name}: a problem'); process.exit(1); }\n`;
  for (const name of ['check-payload-links', 'check-openspec-config', 'check-retired-names', 'measure-context']) write(`scripts/${name}.mjs`, stub(name));
  write('scripts/tests/private-names.test.mjs', "import test from 'node:test';\ntest('no private name', () => {});\n");
  write('scripts/tests/package.json', '{}\n');
  const tool = name => `#!/bin/sh\necho "${name} $*" >> "${join(root, 'calls')}"\n[ "$FAIL" = ${name} ] && exit 1\nexit 0\n`;
  for (const name of ['shellcheck', 'openspec', 'npm']) write(`bin/${name}`, tool(name), 0o755);
  if (deps) {
    write('scripts/tests/node_modules/.package-lock.json', '{}\n');
    for (const name of ['oxlint', 'c8']) write(`scripts/tests/node_modules/.bin/${name}`, tool(name), 0o755);
  }
  const env = { ...process.env, PATH: `${join(root, 'bin')}:${process.env.PATH}` };
  // A nested test runner must report as its own run, not as this one's child.
  delete env.NODE_TEST_CONTEXT;
  const run = (args = [], vars = {}) => spawnSync(process.execPath, [script, '--root', root, ...args], { cwd: root, env: { ...env, ...vars }, encoding: 'utf8' });
  const calls = () => { try { return readFileSync(join(root, 'calls'), 'utf8'); } catch { return ''; } };
  return { root, run, calls };
}

const lastLine = result => result.stdout.trimEnd().split('\n').at(-1);

test('a code change runs lint, shell checks, the suite, and the release checks', t => {
  const f = fixture(t);
  const r = f.run();
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), [...names(selectSteps()).map(name => `${name}: pass`), 'PAYLOAD_CHECKS=pass']);
  assert.match(f.calls(), /^oxlint --deny-warnings scripts /m);
  assert.match(f.calls(), /^c8 --config scripts\/tests\/\.c8rc\.json node --test /m);
  assert.doesNotMatch(f.calls(), /^npm /m, 'the test tools were already installed');
});

test('a docs-only change runs the private-names test and the release checks only', t => {
  const f = fixture(t);
  const r = f.run(['--docs-only']);
  assert.equal(r.status, 0, `${r.stdout}${r.stderr}`);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), [...names(selectSteps({ docsOnly: true })).map(name => `${name}: pass`), 'PAYLOAD_CHECKS=pass']);
  assert.doesNotMatch(f.calls(), /oxlint|c8|shellcheck/);
});

test('a failing step prints its command and the end of its output, and the rest still run', t => {
  const f = fixture(t);
  const r = f.run(['--docs-only'], { FAIL: 'check-payload-links' });
  assert.equal(r.status, 1);
  assert.match(r.stdout, /^payload-links: FAIL\n {2}\$ node scripts\/check-payload-links\.mjs\ncheck-payload-links ran\ncheck-payload-links: a problem$/m);
  assert.match(r.stdout, /^context-budget: pass$/m);
  assert.equal(lastLine(r), 'PAYLOAD_CHECKS=fail (payload-links)');
  const two = f.run(['--only', 'lint,specs'], { FAIL: 'openspec' });
  assert.equal(two.status, 1);
  assert.deepEqual(two.stdout.trimEnd().split('\n').filter(line => !line.startsWith(' ')), ['lint: pass', 'specs: FAIL', 'PAYLOAD_CHECKS=fail (specs)']);
});

test('a red test run prints its failed tests by name and file, not the passing ones', () => {
  const tap = [
    '# Subtest: first', 'ok 1 - first', '  ---', '  duration_ms: 1', '  ...',
    '# Subtest: second', 'not ok 2 - second breaks', '  ---', '  duration_ms: 2', "  type: 'test'", "  location: '/repo/scripts/tests/a.test.mjs:9:1'", "  failureType: 'testCodeFailure'", '  ...',
    'not ok 3 - third has no file', '1..3', '# tests 3', '# suites 0', '# pass 1', '# fail 2', '# skipped 0', '# duration_ms 5',
  ].join('\n');
  assert.equal(failureDigest(tap), ['  not ok: second breaks (/repo/scripts/tests/a.test.mjs:9:1)', '  not ok: third has no file', '# tests 3', '# pass 1', '# fail 2', '# skipped 0'].join('\n'));
  const many = Array.from({ length: 45 }, (_, n) => `not ok ${n + 1} - t${n + 1}`).join('\n');
  assert.equal(failureDigest(many).split('\n').length, 41);
  assert.match(failureDigest(many), /^ {2}and 5 more$/m);
  assert.equal(failureDigest('one\ntwo\n'), 'one\ntwo', 'other output keeps its end');
});

test('test tools that can not be installed are "not run", with exit 7', t => {
  const f = fixture(t, { deps: false });
  const r = f.run(['--only', 'lint,payload-links'], { FAIL: 'npm' });
  assert.equal(r.status, 7);
  assert.deepEqual(r.stdout.trimEnd().split('\n'), ['lint: not run', 'payload-links: pass', 'PAYLOAD_CHECKS=not run (the test tools did not install)']);
  assert.match(f.calls(), /^npm ci --no-audit --no-fund$/m);
});

test('a tool that is not installed here is skipped, since CI still runs it', t => {
  const f = fixture(t);
  const steps = [{ name: 'absent', when: 'always', tool: 'wong-no-such-tool', command: 'exit 1' }, { name: 'present', when: 'always', tool: 'bash', command: 'true' }, { name: 'red', when: 'always', command: 'echo broken; exit 3' }];
  const lines = [];
  t.mock.method(console, 'log', line => lines.push(line));
  const result = runSteps(f.root, steps);
  t.mock.restoreAll();
  assert.deepEqual(result, { failed: ['red'], notRun: [] });
  assert.deepEqual(lines, ['absent: skipped (wong-no-such-tool is not installed here; CI runs it)', 'present: pass', 'red: FAIL\n  $ echo broken; exit 3\nbroken']);
});

test('--list prints every step, and an unknown step is a usage error', t => {
  const f = fixture(t);
  const listed = f.run(['--list']);
  assert.equal(listed.status, 0);
  assert.equal(listed.stdout.trimEnd().split('\n').length, STEPS.length);
  assert.match(listed.stdout, /^lint \(code\): scripts\/tests\/node_modules\/\.bin\/oxlint /m);
  assert.equal(f.calls(), '', 'nothing ran');
  for (const args of [['--only', 'nope'], ['--only', ','], ['--no-such-flag']]) assert.equal(f.run(args).status, 2, args.join(' '));
});
