#!/usr/bin/env node
// Tests the app as an install receives it: copies the payload to a temporary folder and runs its `npm test`.
// Meta-only; `.github/scripts/checks.mjs` runs it. Doc: wiki/maintaining/test-a-setup-change.md
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
  access: { mode: 'private', teamDomain: 'target-check.cloudflareaccess.com', audience: 'a'.repeat(64), appId: id('4'), ownerEmail: 'owner@example.invalid', workers: [{ id: 'b'.repeat(32) }, { id: 'c'.repeat(32) }] },
};

/** A repo path in the inventory's logical form: `.agents/` reads as `.claude/`. */
const logical = path => path.replace(/^\.agents(?=\/)/, '.claude');
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

// The repo paths an install receives: every category's files, skill folders and whole folders,
// without anything `exclude` names, by file or by folder.
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

/** Copies the install's files into `dest`, laid out as an install: a real `.agents/` with the two links to it. */
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

/** The app's config as provisioning writes it for a Cloudflare-kept install. Throws when the binding has no place. */
function writeConfig(app) {
  const config = join(app, 'wrangler.jsonc');
  writeFileSync(config, wranglerConfig(INSTALL));
  const { repo, runner } = artifactNamesFor(BASE);
  const { named, bound, checks } = codeInConfig(config, repo, true, runner);
  if (!named || !bound || !checks) throw new Error('provisioning could not add the project and its repository and check runner bindings to the config it wrote');
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

// Builds the install in a temporary folder and runs its tests, printing as it goes. Returns
// `{ result, step?, reason? }`: `pass`, `fail` with the step that failed, or `not run` with why.
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
    if (!types.ok || !existsSync(generated) || !['ARTIFACTS', 'CODE_CHECKS'].every(name => new RegExp(`\\b${name}\\s*:`).test(readFileSync(generated, 'utf8')))) {
      return fail('types', `${types.output}\nThe binding types were not regenerated with the project's repository and check runner bindings, so the tests would compile against the wrong ones.`);
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
