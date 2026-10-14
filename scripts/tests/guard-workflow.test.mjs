// The guard a pull request can not edit: guard.yml runs the default branch's loosened-checks.mjs inside the pull
// request's checkout. One test runs it that way; one pins the workflow's shape, which keeps a fork from the repo.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const GUARD = '.github/scripts/loosened-checks.mjs';
// The guard and everything it imports, as the default branch holds them.
const GUARD_FILES = [
  GUARD,
  '.github/scripts/check-settings.mjs',
  '.github/scripts/test-file.mjs',
  '.agents/skills/memory/scripts/lib/cli.mjs',
  '.agents/skills/verify/scripts/kept-promises.mjs',
];

// Built at run time, so this file never holds a marker the check would flag.
const STRYKER_SKIP = ['// Stryker', 'disable next-line all'].join(' ');

// A bare "origin" whose `main` holds the guard and a small app, and whose `change` branch empties
// the guard and adds a skip comment. Then the workflow's two checkouts of it: `guard/` and `pr/`.
function checkouts(t, change) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-guard-workflow-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const env = {
    PATH: process.env.PATH, HOME: root, GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: '/dev/null',
    GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.test', GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.test',
  };
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, env, encoding: 'utf8' }).trim();
  const origin = join(root, 'origin.git');
  const work = join(root, 'work');
  git(root, 'init', '-q', '--bare', '-b', 'main', origin);
  git(root, 'init', '-q', '-b', 'main', work);
  git(work, 'remote', 'add', 'origin', origin);
  const write = files => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(work, path)), { recursive: true });
      writeFileSync(join(work, path), text);
    }
  };
  for (const path of GUARD_FILES) {
    mkdirSync(dirname(join(work, path)), { recursive: true });
    cpSync(join(repo, path), join(work, path));
  }
  symlinkSync('.agents', join(work, '.claude'));
  write({ 'app/src/sum.ts': 'export const sum = (a: number, b: number) => a + b;\n' });
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'base');
  git(work, 'push', '-q', 'origin', 'main');
  git(work, 'checkout', '-q', '-b', 'change');
  write(change);
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'change');
  git(work, 'push', '-q', 'origin', 'change');

  const guard = join(root, 'guard');
  const pr = join(root, 'pr');
  git(root, 'clone', '-q', '--branch', 'main', origin, guard);
  git(root, 'clone', '-q', '--branch', 'change', origin, pr);
  const base = git(pr, 'merge-base', 'HEAD', 'refs/remotes/origin/main');
  // The workflow's last step: the script from `guard/`, the working folder `pr/`.
  const run = from => spawnSync(process.execPath, [join(from, GUARD), '--base', base], { cwd: pr, encoding: 'utf8', env });
  return { guard, pr, run };
}

const EMPTIED = "console.log('### Loosened checks\\n\\nNo check was loosened.\\n');\n";

test('the published guard fails a pull request that empties the guard and adds a skip comment', t => {
  const f = checkouts(t, { [GUARD]: EMPTIED, 'app/src/sum.ts': `${STRYKER_SKIP}\nexport const sum = (a: number, b: number) => a + b;\n` });
  const own = f.run(f.pr);
  assert.equal(own.status, 0, 'the pull request\'s own guard passes it, which is why a second run exists');
  assert.match(own.stdout, /No check was loosened/);

  const published = f.run(f.guard);
  assert.equal(published.status, 1, `${published.stdout}${published.stderr}`);
  assert.match(published.stdout, /`\.github\/scripts\/loosened-checks\.mjs` changes a check's settings: \*\*needs a reason\*\*/);
  assert.match(published.stdout, /`app\/src\/sum\.ts` turns a check off on a line: \*\*needs a reason\*\*/);
});

test('the published guard runs none of the pull request: a guard that would crash is only read', t => {
  const f = checkouts(t, {
    [GUARD]: 'process.exit(0);\n',
    '.github/scripts/check-settings.mjs': 'throw new Error("the pull request\'s code ran");\n',
    'openspec/changes/x/proposal.md': `# A change\n\n## Decision log\n\n- **2026-10-13** — Check: \`${GUARD}\` and \`.github/scripts/check-settings.mjs\` are rewritten, because reasons.\n`,
  });
  const published = f.run(f.guard);
  assert.equal(published.status, 0, `${published.stdout}${published.stderr}`);
  assert.match(published.stdout, /loosened-checks\.mjs` changes a check's settings: explained/);
  assert.match(published.stdout, /check-settings\.mjs` changes a check's settings: explained/);
});

test('the published guard passes a pull request that loosens nothing', t => {
  const f = checkouts(t, { 'app/src/sum.ts': 'export const sum = (a: number, b: number) => b + a;\n' });
  const published = f.run(f.guard);
  assert.equal(published.status, 0, `${published.stdout}${published.stderr}`);
  assert.match(published.stdout, /No check was loosened/);
});

test('guard.yml runs on pull_request_target, from two checkouts, and executes nothing under pr/', () => {
  const workflow = readFileSync(join(repo, '.github/workflows/guard.yml'), 'utf8').replace(/^\s*#.*$/gm, '');
  const triggers = workflow.slice(workflow.indexOf('\non:\n'), workflow.indexOf('\npermissions:\n'));
  assert.deepEqual(triggers.match(/^ {2}\w+:/gm), ['  pull_request_target:'], 'the only trigger is the one that reads the base branch\'s workflow');

  assert.deepEqual(workflow.match(/^ {2}[\w-]+:$/gm).slice(-1), ['  guard:'], 'one job, named for the check a person sees');
  assert.deepEqual([...workflow.matchAll(/^ *([\w-]+): (read|write)\b.*$/gm)].map(match => `${match[1]}: ${match[2]}`), ['contents: read', 'contents: read']);

  // Each step runs from its `- ` item to the next one.
  const steps = workflow.slice(workflow.indexOf('    steps:\n')).split(/\n(?= {6}- )/).slice(1);
  const checkout = steps.filter(step => /uses: actions\/checkout@[a-f0-9]{40}\b/.test(step));
  assert.equal(checkout.length, 2);
  assert.match(checkout[0], /^ {10}path: guard$/m);
  assert.match(checkout[0], /^ {10}ref: \$\{\{ github\.event\.repository\.default_branch \}\}$/m);
  assert.match(checkout[1], /^ {10}path: pr$/m);
  assert.match(checkout[1], /^ {10}ref: refs\/pull\/\$\{\{ github\.event\.pull_request\.number \}\}\/head$/m);
  assert.match(checkout[1], /^ {10}fetch-depth: 0$/m);
  for (const step of checkout) assert.match(step, /^ {10}persist-credentials: false$/m);

  for (const step of steps) {
    const uses = /uses: (\S+)/.exec(step)?.[1];
    if (uses) assert.match(uses, /^actions\/[\w-]+@[a-f0-9]{40}$/, 'every action is GitHub\'s own, pinned by commit; none is loaded from a checkout');
  }
  assert.match(workflow, /node-version-file: guard\/\.nvmrc/);

  const runs = steps.filter(step => /^ {8}run:/m.test(step)).map(step => step.slice(step.search(/^ {8}run:/m)));
  assert.equal(runs.length, 1);
  const [script] = runs;
  assert.doesNotMatch(script, /\$\{\{/, 'nothing from the event is pasted into the script');
  assert.doesNotMatch(script, /\bpr\//, 'no path under pr/');
  assert.doesNotMatch(script, /\b(npm|npx|pnpm|yarn|source|eval|bash|sh)\b|(^|\s)\.{1,2}\//m, 'no install, no sourced file, no relative path');
  const commands = script.split('\n').slice(1).map(line => line.trim()).filter(Boolean);
  assert.deepEqual(commands, [
    'set -o pipefail',
    'base=$(git merge-base HEAD "refs/remotes/origin/$BASE_REF")',
    'node "$GITHUB_WORKSPACE/guard/.github/scripts/loosened-checks.mjs" --base "$base" | tee -a "$GITHUB_STEP_SUMMARY"',
  ]);
});
