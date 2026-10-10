#!/usr/bin/env node
// Proof: does each of the app's checks still fail when it should?
//
// A check can switch itself off and stay green: a settings file its tool no longer reads, a
// rule dropped from a list, a tool whose new version reports differently. The app's own code
// keeps passing, so nothing shows. This hands each check of `npm test` a small piece of code
// that is wrong on purpose, read through the app's real settings, and fails when a check lets
// it through. wiki/development/the-change-loop.md#the-gate says when it runs.
//
// It builds a throwaway folder in the system's temp directory, one app folder per gate: the
// app's installed packages linked in, its settings files copied, and the samples written from
// this script, so no bad file sits in the repo for the real gates to trip on. Each gate runs
// its own step of the app's `test` script. A gate is caught when that step exits non-zero and
// its output names every sample with the reason; anything else passed a bad sample. The
// folder is removed on exit.
//
// Prints one line per gate. Exit 0 when every gate caught its samples; 1 when one passed a bad
// sample, `npm test` no longer runs it, or its settings file is missing; 2 on a usage error.
// Usage: node scripts/check-app-checks.mjs [--root <repo>]

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, delimiter, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { isMain, parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-app-checks.mjs [--root <repo>]

Hand each check of the app's \`npm test\` a bad sample, and fail when one lets it through.
--root <repo>  the repo whose app/ to prove; default: the one this script sits in`;

const TAIL = 15;
// In a sample, stands in for a secret the app's own key registry holds.
const SECRET = 'SAVED_SECRET';
const lines = (count, line) => `${Array.from({ length: count }, (_, index) => line(index)).join('\n')}\n`;
const WRONG_TYPE = 'export const count: number = "text";\n';
const repeated = name => `export function ${name}(input: number): number {\n  let total = input;\n${
  lines(38, index => `  total += input * ${index + 2};`)}  return total;\n}\n`;

/**
 * The gates of `npm test`. `tool` finds the gate's step in the `test` script, `settings` are
 * the files it must read, `also` lists more files to copy when the app has them, `files` are
 * written beside the samples, and each sample is caught when the output holds its file name
 * and what the tool `says` of it.
 */
export const GATES = [
  {
    name: 'lint', tool: /\boxlint\b/, settings: ['.oxlintrc.json'],
    files: { 'src/apps/second/value.ts': 'export const value = 2;\n' },
    samples: [
      { file: 'src/explicit-any.ts', says: 'no-explicit-any', text: 'export const loose = (value: any) => value;\n' },
      { file: 'src/too-long.ts', says: 'max-lines', text: lines(501, index => `export const line${index} = ${index};`) },
      { file: 'src/too-branchy.ts', says: 'complexity', text: `export function branchy(input: number): number {\n${
        lines(60, index => `  if (input === ${index}) return ${index};`)}  return -1;\n}\n` },
      { file: 'src/HookInBranch.tsx', says: 'rules-of-hooks', text: 'import { useState } from "react";\n\nexport function HookInBranch({ on }: { on: boolean }) {\n'
        + '  if (on) {\n    const [count] = useState(0);\n    return <p>{count}</p>;\n  }\n  return null;\n}\n' },
      { file: 'src/apps/first/App.tsx', says: 'no-restricted-imports', text: 'import { value } from "../second/value";\n\nexport function App() {\n  return <p>{value}</p>;\n}\n' },
    ],
  },
  {
    name: 'types', tool: /\btsc\b/, settings: ['tsconfig.json'],
    also: app => [...readdirSync(app).filter(name => /^tsconfig.+\.json$/.test(name)), 'worker-configuration.d.ts'],
    files: { 'vite.config.ts': 'export default {};\n', 'vitest.config.runtime.ts': 'export default {};\n' },
    samples: [
      { file: 'src/wrong-type.ts', says: 'TS2322', text: WRONG_TYPE },
      { file: 'worker/wrong-type-server.ts', says: 'TS2322', text: WRONG_TYPE },
      { file: 'worker/wrong-type-in-test.test.ts', says: 'TS2322', text: WRONG_TYPE },
      { file: 'tests/runtime/wrong-type.ts', says: 'TS2322', text: WRONG_TYPE },
    ],
  },
  {
    name: 'coverage', tool: /\bvitest\b/, settings: ['vitest.config.ts'],
    // The files the settings load before each test file.
    also: app => [...(/setupFiles:\s*\[([^\]]*)\]/.exec(readFileSync(join(app, 'vitest.config.ts'), 'utf8'))?.[1] ?? '')
      .matchAll(/["'`]([^"'`]+)["'`]/g)].map(match => match[1]),
    files: { 'src/one-branch.test.ts': 'import { expect, it } from "vitest";\nimport { direction } from "./half-tested";\n\n'
      + 'it("reads one branch of two", () => {\n  expect(direction(1)).toBe("up");\n});\n' },
    samples: [{ file: 'src/half-tested.ts', says: 'threshold', text: 'export const direction = (step: number) => (step > 0 ? "up" : "down");\n' }],
  },
  {
    name: 'runtime', tool: /\bvitest\b.*--config\s+vitest\.config\.runtime\.ts\b/,
    settings: ['vitest.config.runtime.ts', 'tests/runtime/setup.ts'],
    also: () => ['../scripts/lib-wrangler-config.mjs', '../scripts/lib-cli.mjs', '../.claude/skills/memory/scripts/lib/cli.mjs'],
    requires: 'runtime proof: workerd ready',
    files: {
      'wrangler.jsonc': JSON.stringify({ compatibility_date: '2026-09-26', compatibility_flags: ['nodejs_compat', 'disallow_importable_env'] }),
      'worker/index.ts': 'export default { fetch: () => new Response("runtime reached") };\n',
      '../schema/migrations/0001_runtime.sql': 'CREATE TABLE runtime_proof (id INTEGER PRIMARY KEY);\n',
    },
    samples: [{ file: 'tests/runtime/runtime.test.ts', says: 'RUNTIME_ASSERTION_PROOF', text:
      'import { afterAll, beforeAll, expect, it } from "vitest";\nimport { startRuntime, type Runtime } from "./setup.ts";\n'
      + 'let runtime: Runtime;\nbeforeAll(async () => { runtime = await startRuntime(); });\n'
      + 'afterAll(async () => { await runtime?.close(); });\n'
      + 'it("catches a wrong runtime expectation", async () => {\n'
      + '  const response = await runtime.worker.fetch("https://runtime.example.com/");\n'
      + '  expect(response.status).toBe(200);\n  console.log("runtime proof: workerd ready");\n'
      + '  expect(await response.text()).toBe("RUNTIME_ASSERTION_PROOF");\n});\n' }],
  },
  {
    name: 'unused code', tool: /\bknip\b/, settings: ['knip.jsonc'],
    samples: [{ file: 'src/unused-file.ts', says: 'Unused files', text: 'export const nothingImportsThis = 1;\n' }],
  },
  {
    // One copy on each side of the app: the settings name both folders, and the tool stops at a missing one.
    name: 'repeated code', tool: /\bjscpd\b/, settings: ['.jscpd.json'],
    samples: [
      { file: 'src/repeated-first.ts', says: 'Clone found', text: repeated('first') },
      { file: 'worker/repeated-second.ts', says: 'Clone found', text: repeated('second') },
    ],
  },
  {
    // The check reads a whole repo, so its step runs in the real app and is pointed at the samples.
    name: 'saved keys', tool: /check-app-keys\.mjs/, settings: ['worker/keys.ts'], inApp: true,
    samples: [{ file: 'worker/apps/sample/unlisted-key.ts', says: SECRET,
      text: `export const unlisted = (_request: Request, env: Record<string, string>) => new Response(env.${SECRET});\n` }],
  },
];

/** Run one step of the `test` script as npm would: through the shell, with the app's tools first on PATH. */
function shell(command, cwd) {
  // Plain output: a colour code in the middle of a file name would hide it.
  const env = { ...process.env, NO_COLOR: '1', NODE_COMPILE_CACHE: join(cwd, 'node_modules/.cache/check-proof'), PATH: `${join(cwd, 'node_modules', '.bin')}${delimiter}${process.env.PATH}` };
  delete env.FORCE_COLOR;
  const result = spawnSync(command, { cwd, env, shell: true, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 300_000 });
  return { status: result.status, output: `${result.stdout ?? ''}${result.stderr ?? ''}` };
}

/** Each `&&` step of the `test` script, with a `run <name>` step read as the script it runs. */
function testSteps(scripts) {
  return (scripts.test ?? '').split('&&').map(step => step.trim()).filter(Boolean)
    .map(command => ({ command, runs: scripts[/^(?:npm|pnpm|yarn|bun) run (\S+)$/.exec(command)?.[1]] ?? command }));
}

function write(folder, path, text) {
  mkdirSync(dirname(join(folder, path)), { recursive: true });
  writeFileSync(join(folder, path), text);
}

/** A throwaway app for one gate: the real packages and settings, and that gate's samples. */
function sampleApp(work, app, gate, samples) {
  const folder = join(work, gate.name.replaceAll(' ', '-'), 'app');
  mkdirSync(join(folder, 'node_modules'), { recursive: true });
  // Each package is linked on its own, so a tool's cache lands here and never in the real install.
  for (const name of readdirSync(join(app, 'node_modules'))) {
    if (name === '.bin' || !name.startsWith('.')) symlinkSync(join(app, 'node_modules', name), join(folder, 'node_modules', name), 'junction');
  }
  // The tools skip what git ignores, and this folder is in no repo.
  write(folder, '.gitignore', 'node_modules\ncoverage\n');
  for (const path of ['package.json', ...gate.settings, ...(gate.also?.(app) ?? [])]) {
    if (existsSync(join(app, path))) cpSync(join(app, path), join(folder, path), { recursive: true });
  }
  for (const [path, text] of [...Object.entries(gate.files ?? {}), ...samples.map(sample => [sample.file, sample.text])]) write(folder, path, text);
  return folder;
}

/** A secret the app's key registry holds, for the saved-keys sample to name; undefined when it holds none. */
async function registeredSecret(app) {
  const { keys = {} } = await import(pathToFileURL(join(app, 'worker', 'keys.ts')).href);
  return Object.values(keys).flatMap(key => key.secrets ?? [])[0];
}

const quoted = path => `'${path.replaceAll("'", "'\\''")}'`;

/** Prove one gate. Returns its line, and whether it did its job. */
async function prove(gate, { app, work, steps, run }) {
  const missing = gate.settings.find(path => !existsSync(join(app, path)));
  if (missing) return { ok: false, line: `its settings file ${missing} is missing` };
  const step = steps.find(({ runs }) => gate.tool.test(runs));
  if (!step) return { ok: false, line: '`npm test` no longer runs it' };
  const secret = gate.inApp ? await registeredSecret(app) : '';
  if (secret === undefined) return { ok: true, line: 'no saved key is registered, so there is nothing to catch' };
  const samples = gate.samples.map(sample => ({ file: sample.file, says: sample.says.replace(SECRET, secret), text: sample.text.replace(SECRET, secret) }));
  const folder = sampleApp(work, app, gate, samples);
  const proving = { name: gate.name, samples, requires: gate.requires };
  const { status, output } = gate.inApp ? run(`${step.command} --root ${quoted(dirname(folder))}`, app, proving) : run(step.command, folder, proving);
  const passed = samples.filter(sample => status === 0 || !output.includes(basename(sample.file)) || !output.includes(sample.says) || (gate.requires && !output.split(/\r?\n/).includes(gate.requires)));
  if (!passed.length) return { ok: true, line: `caught ${samples.length} bad sample${samples.length === 1 ? '' : 's'}` };
  const tail = output.trimEnd().split('\n').slice(-TAIL).map(text => `    ${text}`).join('\n');
  return { ok: false, line: `passed a bad sample (${passed.map(sample => sample.file).join(', ')}); \`${step.command}\` exited ${status} and said:\n${tail}` };
}

/**
 * Hand each gate of the app at `app` its bad samples. `run(command, cwd, proving)` answers
 * `{ status, output }`, where `proving` holds the gate's name and samples; tests stand in for
 * the tools through it. Returns true when every gate caught its samples.
 */
export async function proveChecks({ app, run = shell, log = console.log, temp = tmpdir() }) {
  if (!existsSync(join(app, 'package.json'))) { log(`app checks: no package.json in ${app}, so there is no app to prove`); return false; }
  if (!existsSync(join(app, 'node_modules'))) { log(`app checks: the app's packages are not installed; run \`npm ci\` in ${app} first`); return false; }
  const steps = testSteps(JSON.parse(readFileSync(join(app, 'package.json'), 'utf8')).scripts ?? {});
  const work = mkdtempSync(join(temp, 'wong-app-checks-'));
  const remove = () => rmSync(work, { recursive: true, force: true });
  process.once('exit', remove);
  const failed = [];
  try {
    for (const gate of GATES) {
      const { ok, line } = await prove(gate, { app, work, steps, run });
      log(`${gate.name}: ${line}`);
      if (!ok) failed.push(gate.name);
    }
  } finally {
    remove();
    process.off('exit', remove);
  }
  log(failed.length
    ? `app checks: ${failed.length} of ${GATES.length} gates no longer prove they can fail: ${failed.join(', ')}. Put back the settings or the tool each line names, then run \`npm run test:checks\` again.`
    : 'app checks: no gate let a bad sample through');
  return !failed.length;
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' } } });
  const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => process.exit(130));
  process.exitCode = await proveChecks({ app: join(root, 'app') }) ? 0 : 1;
}
