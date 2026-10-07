#!/usr/bin/env node
/**
 * Tests the app as an install receives it. Meta-only: no install receives this file.
 * `.github/scripts/checks.mjs` runs it, in CI and with `--worktree`, when the change touches
 * `app/` or the payload inventory.
 *
 *     node scripts/check-target-app.mjs [--root <repo>] [--keep]
 *
 * WHY THIS REPO CAN NOT SEE THESE FAULTS BY ITSELF
 *
 * This repository holds more than it ships (two sample apps, a sample skill), and it is a GitHub
 * install. So a shipped test that needs a file that does not ship passes here and fails in every
 * install, and an app that stops compiling once Cloudflare keeps the project, and types that
 * connection its own way, compiles here. Both reached a release. The check builds what an install
 * kept in Cloudflare has, and asks it:
 *
 *   1. copy the files `payload-files.json` lists, minus its excludes, to a temporary folder;
 *   2. write the app's wrangler config through provisioning's own functions, with placeholder ids
 *      and the binding to the project's repository;
 *   3. link the installed `app/node_modules`, entry by entry, so the copy's caches stay its own;
 *   4. regenerate the binding types (`scripts/cf-build.sh --types`), as the check runner does;
 *   5. run the app's `npm test`: lint, type check, tests at 100% coverage, and the rest;
 *   6. remove the folder (`--keep` leaves it, and prints where).
 *
 * It reaches nothing live: no step holds a Cloudflare credential, and `wrangler types` only reads
 * the config. `--root` builds from another checkout, for the tests; the config fragment is always
 * this script's own repository's, as provisioning reads it.
 *
 * A failure prints the lines that name what failed, then the end of the output. The last line is
 * TARGET_APP=pass, fail (<step>), or not run (<reason>). Exit 0, 1, or 7 (the app's packages are
 * not installed here). In `--worktree` it is a pre-check, never the gate.
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { artifactNamesFor, codeInConfig, wranglerConfig } from '../.agents/skills/wong-setup/scripts/provision.mjs';
import { isMain, parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-target-app.mjs [--root <repo>] [--keep]

Build the app from only the files an install receives, set up as an install kept in Cloudflare, and run its tests.
--root  the checkout to build from (default: this repository)
--keep  leave the temporary folder, and print where it is`;

const INVENTORY = '.agents/skills/wong-sync/references/payload-files.json';
const CATEGORIES = ['core', 'ui', 'pack', 'scaffold'];
const NO_TOOLS = 7;
const NAMED = 60;
const TAIL = 120;
// The caches a tool keeps inside node_modules. The copy gets its own, so a run here can not hand
// this repository's next type check a stale answer.
const OWN_CACHES = new Set(['.tmp', '.vite', '.vitest', '.cache']);

// A made-up install, private by login, with every id a placeholder: nothing is looked up.
const BASE = 'target-check';
const id = digit => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`;
const INSTALL = {
  base: BASE,
  ids: { db: id('1'), stagingDb: id('2'), memory: id('3') },
  bucket: `${BASE}-memory`,
  today: '2026-01-01',
  access: { mode: 'private', teamDomain: 'target-check.cloudflareaccess.com', audience: 'a'.repeat(64), appId: id('4'), ownerEmail: 'owner@example.invalid', workers: [{ id: 'b'.repeat(32) }, { id: 'c'.repeat(32) }] },
};

/** A repo path in the inventory's logical form: `.agents/` reads as `.claude/`. */
const logical = path => path.replace(/^\.agents(?=\/)/, '.claude');
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

/**
 * The repo paths an install receives, from the repo's own file list: every category's files, skill
 * folders and whole folders, without anything `exclude` names, by file or by folder.
 */
export function targetFiles(paths, manifest) {
  const categories = CATEGORIES.map(name => manifest[name] ?? {});
  const files = new Set(categories.flatMap(category => category.files ?? []));
  const dirs = categories.flatMap(category => [...(category.dirs ?? []), ...(category.skillDirs ?? []).map(skill => `.claude/skills/${skill}`)]);
  const excluded = categories.flatMap(category => category.exclude ?? []);
  return paths.filter(path => {
    const name = logical(path);
    return (files.has(name) || dirs.some(dir => under(name, dir))) && !excluded.some(gone => under(name, gone));
  });
}

/** What a red run names: failed test files, failed tests, and type errors. */
export function failureDigest(output) {
  const lines = output.trimEnd().split('\n');
  const named = lines.filter(line => /^\s*(FAIL|×|✗|not ok)\s|error TS\d+|^Error: |ERROR: Coverage/.test(line));
  const more = named.length > NAMED ? [`  and ${named.length - NAMED} more`] : [];
  return [...named.slice(0, NAMED), ...more, ...(named.length ? ['', `The last ${TAIL} lines:`] : []), ...lines.slice(-TAIL)].join('\n');
}

/** Every file this checkout holds that git would commit: tracked and new, never an ignored one. */
function repoFiles(root) {
  return execFileSync('git', ['-c', 'core.quotePath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })
    .split('\0').filter(Boolean);
}

/** Copies the install's files into `dest`, laid out as an install is: a real `.agents/` with the two links to it. */
function copyTarget(root, dest, manifest) {
  const present = repoFiles(root).filter(path => existsSync(join(root, path)) && lstatSync(join(root, path)).isFile());
  const files = targetFiles(present, manifest);
  for (const path of files) {
    mkdirSync(dirname(join(dest, path)), { recursive: true });
    copyFileSync(join(root, path), join(dest, path));
  }
  mkdirSync(join(dest, '.agents'), { recursive: true });
  for (const link of ['.claude', '.codex']) symlinkSync('.agents', join(dest, link));
  return files.length;
}

/** Links each installed package into the copy's own `node_modules`. */
function linkModules(from, to) {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from)) {
    if (!OWN_CACHES.has(entry)) symlinkSync(join(from, entry), join(to, entry));
  }
}

/** The app's config as provisioning writes it for an install kept in Cloudflare. Throws when the binding has no place. */
function writeConfig(app) {
  const config = join(app, 'wrangler.jsonc');
  writeFileSync(config, wranglerConfig(INSTALL));
  const { named, bound } = codeInConfig(config, artifactNamesFor(BASE).repo, true);
  if (!named || !bound) throw new Error('provisioning could not add the project and its repository binding to the config it wrote');
}

// No step may reach Cloudflare, so none is handed a credential.
function quietEnv() {
  const env = { ...process.env };
  for (const name of Object.keys(env)) if (name.startsWith('CLOUDFLARE_') || name === 'CF_BRANCH' || name === 'WORKERS_CI_BRANCH') delete env[name];
  return env;
}

const sh = (command, args, cwd) => {
  const result = spawnSync(command, args, { cwd, env: quietEnv(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
  return { ok: result.status === 0, output: `${result.stdout ?? ''}${result.stderr ?? ''}${result.error ? `${result.error.message}\n` : ''}` };
};

/**
 * Builds the install in a temporary folder and runs its tests. Returns `{ result, step?, reason? }`:
 * `pass`, `fail` with the step that failed, or `not run` with why. Prints as it goes.
 */
export function checkTarget(root, { keep = false, log = console.log } = {}) {
  const manifest = JSON.parse(readFileSync(join(root, INVENTORY), 'utf8'));
  const [folder] = manifest.scaffold?.dirs ?? [];
  if (!folder || !existsSync(join(root, folder, 'node_modules'))) {
    return { result: 'not run', reason: `${folder ?? 'the app'}/node_modules is missing; install the app's packages first` };
  }
  const dest = mkdtempSync(join(tmpdir(), 'wong-target-app-'));
  const fail = (step, output) => {
    log(`target app: ${step} FAILED`);
    log(output);
    return { result: 'fail', step };
  };
  try {
    const app = join(dest, folder);
    log(`target app: ${copyTarget(root, dest, manifest)} files, as an install kept in Cloudflare receives them`);
    linkModules(join(root, folder, 'node_modules'), join(app, 'node_modules'));
    try {
      writeConfig(app);
    } catch (error) {
      return fail('config', error.message);
    }
    const types = sh('bash', [join(dest, 'scripts', 'cf-build.sh'), '--types'], dest);
    const generated = join(app, 'worker-configuration.d.ts');
    if (!types.ok || !existsSync(generated) || !/\bARTIFACTS\s*:/.test(readFileSync(generated, 'utf8'))) {
      return fail('types', `${types.output}\nThe binding types were not regenerated with the project's repository binding, so the tests would compile against the wrong ones.`);
    }
    const tests = sh('npm', ['test'], app);
    if (!tests.ok) return fail('tests', failureDigest(tests.output));
    log('target app: its tests pass');
    return { result: 'pass' };
  } finally {
    if (keep) log(`target app: kept at ${dest}`);
    else rmSync(dest, { recursive: true, force: true });
  }
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { root: { type: 'string' }, keep: { type: 'boolean' } } });
  const root = resolve(values.root ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
  const { result, step, reason } = checkTarget(root, { keep: values.keep });
  console.log(`TARGET_APP=${result}${step ? ` (${step})` : ''}${reason ? ` (${reason})` : ''}`);
  process.exitCode = result === 'pass' ? 0 : result === 'fail' ? 1 : NO_TOOLS;
}
