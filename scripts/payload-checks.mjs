#!/usr/bin/env node
// WongStack's own static checks, run before a push through `.github/scripts/checks.mjs --worktree`. Meta-only.
// STEPS copies `.github/workflows/payload.yml`; `scripts/tests/payload-checks.test.mjs` fails when they drift.
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ensureInstalled } from '../.github/scripts/checks.mjs';
import { isMain, parseCli, usageError } from './lib-cli.mjs';

const USAGE = `usage: node scripts/payload-checks.mjs [--docs-only] [--only <names>] [--list] [--root <path>]

Run the static steps of .github/workflows/payload.yml here, before a push.
--docs-only  the change is entirely under wiki/ or openspec/
--only       rerun only these steps, comma-separated
--list       print the step names and commands; run nothing`;

const NO_TOOLS = 7;
const TAIL = 120;
const FAILED_TESTS = 40;

// What a red step's output says: a `node --test` run's `not ok` lines, their files and the closing counts.
// Anything else prints the end of its output.
export function failureDigest(output) {
  const lines = output.trimEnd().split('\n');
  const failed = [];
  lines.forEach((line, index) => {
    const name = /^not ok \d+ - (.*)$/.exec(line)?.[1];
    if (!name) return;
    const location = lines.slice(index + 1, index + 8).map(next => /^\s+location: '(.*)'$/.exec(next)?.[1]).find(Boolean);
    failed.push(`  not ok: ${name}${location ? ` (${location})` : ''}`);
  });
  if (!failed.length) return lines.slice(-TAIL).join('\n');
  const more = failed.length > FAILED_TESTS ? [`  and ${failed.length - FAILED_TESTS} more`] : [];
  const counts = lines.filter(line => /^# (tests|pass|fail|skipped) \d+$/.test(line));
  return [...failed.slice(0, FAILED_TESTS), ...more, ...counts].join('\n');
}

// when: 'code' skips on a docs-only change, 'docs' runs only on one, 'always' runs on both.
// deps: needs scripts/tests/node_modules. tool: skipped here when that command is not installed.
export const STEPS = [
  { name: 'lint', when: 'code', deps: true, command: 'scripts/tests/node_modules/.bin/oxlint -c scripts/tests/.oxlintrc.json --deny-warnings scripts .agents/skills/*/scripts .agents/skills/*/worker .github/scripts' },
  { name: 'shellcheck', when: 'code', tool: 'shellcheck', command: 'shellcheck --severity=warning scripts/*.sh .github/scripts/*.sh .agents/skills/*/scripts/*.sh' },
  { name: 'script-tests', when: 'code', deps: true, command: 'scripts/tests/node_modules/.bin/c8 --config scripts/tests/.c8rc.json node --test scripts/tests/*.test.mjs' },
  { name: 'private-names', when: 'docs', command: 'node --test scripts/tests/private-names.test.mjs' },
  { name: 'install-cost', when: 'docs', command: 'node --test scripts/tests/install-cost.test.mjs' },
  { name: 'payload-links', when: 'always', command: 'node scripts/check-payload-links.mjs' },
  { name: 'openspec-config', when: 'always', command: 'node scripts/check-openspec-config.mjs' },
  { name: 'retired-names', when: 'always', command: 'node scripts/check-retired-names.mjs' },
  { name: 'attachments', when: 'always', command: 'node scripts/check-attachments.mjs' },
  { name: 'specs', when: 'always', tool: 'openspec', command: 'openspec validate --specs --strict --no-interactive' },
  { name: 'context-budget', when: 'always', command: 'node scripts/measure-context.mjs --check' },
];

const CONDITION = { code: "docs_only != 'true'", docs: "docs_only == 'true'" };

/** Where this list and the workflow disagree: a command the workflow lacks, or runs under another condition. */
export function workflowDrift(workflow, steps = STEPS) {
  // Each workflow step starts at a six-space `- ` item and runs to the next one.
  const blocks = workflow.split(/\n(?= {6}- )/);
  return steps.flatMap(step => {
    const block = blocks.find(text => text.includes(step.command));
    if (!block) return [`${step.name}: the workflow no longer runs \`${step.command}\``];
    const expected = CONDITION[step.when];
    const actual = Object.values(CONDITION).find(condition => block.includes(condition));
    return expected === actual ? [] : [`${step.name}: listed as ${step.when}, but the workflow runs it ${actual ? `when ${actual}` : 'always'}`];
  });
}

/** The steps a change calls for, by the workflow's scope rule, narrowed by --only. */
export function selectSteps({ docsOnly = false, only = null, steps = STEPS } = {}) {
  return steps.filter(step => (only ? only.includes(step.name) : step.when === 'always' || step.when === (docsOnly ? 'docs' : 'code')));
}

const shell = (command, cwd) => spawnSync('bash', ['-c', command], { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
const installedHere = (tool, cwd) => shell(`command -v ${tool}`, cwd).status === 0;

/** Run the selected steps in `root`. Returns { failed, notRun }, printing a line per step. */
export function runSteps(root, selected) {
  const failed = [];
  const notRun = [];
  let deps = 'ok';
  if (selected.some(step => step.deps)) deps = ensureInstalled(join(root, 'scripts/tests'));
  if (deps !== 'ok') notRun.push(deps === 'no-npm' ? 'npm is not installed' : 'the test tools did not install');
  for (const step of selected) {
    if (step.deps && deps !== 'ok') { console.log(`${step.name}: not run`); continue; }
    if (step.tool && !installedHere(step.tool, root)) { console.log(`${step.name}: skipped (${step.tool} is not installed here; CI runs it)`); continue; }
    const result = shell(step.command, root);
    if (result.status === 0) { console.log(`${step.name}: pass`); continue; }
    failed.push(step.name);
    const output = failureDigest(`${result.stdout ?? ''}${result.stderr ?? ''}`);
    console.log([`${step.name}: FAIL`, `  $ ${step.command}`, output].filter(Boolean).join('\n'));
  }
  return { failed, notRun };
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: {
    'docs-only': { type: 'boolean' }, only: { type: 'string' }, list: { type: 'boolean' }, root: { type: 'string' },
  } });
  const only = values.only?.split(',').map(name => name.trim()).filter(Boolean) ?? null;
  const unknown = only?.filter(name => !STEPS.some(step => step.name === name)) ?? [];
  if (only && (!only.length || unknown.length)) usageError(USAGE, `--only takes: ${STEPS.map(step => step.name).join(', ')}`);
  if (values.list) {
    for (const step of STEPS) console.log(`${step.name} (${step.when}): ${step.command}`);
  } else {
    const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
    const { failed, notRun } = runSteps(root, selectSteps({ docsOnly: values['docs-only'], only }));
    const skipped = notRun.length ? `not run (${notRun.join('; ')})` : '';
    if (failed.length) console.log(`PAYLOAD_CHECKS=fail (${failed.join(', ')})${skipped ? `; ${skipped}` : ''}`);
    else console.log(`PAYLOAD_CHECKS=${skipped || 'pass'}`);
    process.exitCode = failed.length ? 1 : skipped ? NO_TOOLS : 0;
  }
}
