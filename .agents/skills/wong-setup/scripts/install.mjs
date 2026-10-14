#!/usr/bin/env node
// Puts WongStack's files into an empty folder the same way on every install: payload, links, hubs, ignore rules,
// rules file and install record. Source-only, like provision.mjs. Doc: ../SKILL.md#install-through-the-normal-workflow
import { execFileSync, spawnSync } from 'node:child_process';
import { constants, copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

const USAGE = `usage: install.mjs --source <source checkout> --target <empty folder> [--repo <upstream url>]

Copies every payload category into the target, makes .agents/ with the .claude and .codex links, AGENTS.md and its
CLAUDE.md link, the wiki hubs, .gitignore, paseo.json's setup list, the install record and openspec/. The target may
hold only a .git with no commits and setup's .env. --repo defaults to the source's origin. Prints one JSON report; exit 1 on a stop,
with everything it wrote removed.`;

export const INVENTORY = '.agents/skills/wong-sync/references/payload-files.json';
export const CATEGORIES = ['core', 'ui', 'pack', 'scaffold'];
const HERE = dirname(fileURLToPath(import.meta.url));
const SEED = join(HERE, '..', 'references', 'seed');
/** Each path the manifest's `seededBySetup` lists, and the template in `references/seed/` that writes it. */
export const SEEDS = { 'wiki/README.md': 'wiki-README.md', 'wiki/development/README.md': 'wiki-development-README.md', '.gitignore': 'gitignore' };
const LINK_FIX = 'on Windows, turn on Developer Mode, reopen the assistant, and run setup again (references/failure-map.md#getting-the-computer-ready)';
// Setup's first step makes these before the install: the repository and the token's ignored file.
const KEPT = new Set(['.git', '.env']);
const BLOCK = /<!-- WONG-STACK:BEGIN[\s\S]*?WONG-STACK:END -->/;
const HEADER = '# AGENTS.md\n\nThe assistant reads this file first in every chat. Add your own rules above or below the block.\n\n';

/** A repo path in the inventory's logical form: `.agents/` reads as `.claude/`. */
const logical = path => path.replace(/^\.agents(?=\/)/, '.claude');
const under = (path, dir) => path === dir || path.startsWith(`${dir}/`);

export class InstallError extends Error {}

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

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 256 * 1024 * 1024 });

/** The source's regular files git would commit, tracked or new. */
function sourceFiles(source) {
  return git(source, ['-c', 'core.quotePath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-standard'])
    .split('\0').filter(path => path && existsSync(join(source, path)) && lstatSync(join(source, path)).isFile());
}

/** Nothing, or only setup's `.git` with no commits and `.env`: a folder with anything else is never written into. */
function checkEmpty(target) {
  const entries = existsSync(target) ? readdirSync(target) : [];
  const own = entries.filter(entry => !KEPT.has(entry));
  if (own.length) throw new InstallError(`${target} is not empty (${own.slice(0, 3).join(', ')}${own.length > 3 ? ', …' : ''}); setup installs only into an empty folder`);
  if (entries.includes('.git') && spawnSync('git', ['-C', target, 'rev-parse', '--verify', '--quiet', 'HEAD']).status === 0) {
    throw new InstallError(`${target} already has saved history; setup installs only into an empty folder`);
  }
}

/** Writes a new file, never over one. */
function put(target, path, text) {
  mkdirSync(dirname(join(target, path)), { recursive: true });
  writeFileSync(join(target, path), text, { flag: 'wx' });
}

function link(target, to, name, type) {
  try {
    symlinkSync(to, join(target, name), type);
  } catch (error) {
    throw new InstallError(`could not make the ${name} link (${error.code ?? error.message}); ${LINK_FIX}`);
  }
  if (!lstatSync(join(target, name)).isSymbolicLink()) throw new InstallError(`${name} was made as a copy, not a link; ${LINK_FIX}`);
}

function readSource(source, path) {
  if (!existsSync(join(source, path))) throw new InstallError(`the source has no ${path}`);
  return readFileSync(join(source, path), 'utf8');
}

const runOpenspec = (cwd) => {
  const result = spawnSync('openspec', ['init', '--tools', 'none'], { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new InstallError(`openspec init failed: ${(result.stderr || result.error?.message || '').trim().split('\n').at(-1)}`);
};

function writeAll({ source, target, repo, today, openspec }) {
  const manifest = JSON.parse(readSource(source, INVENTORY));
  const present = sourceFiles(source);
  const files = targetFiles(present, manifest);
  const copied = new Set(files.map(logical));
  const missing = CATEGORIES.flatMap(name => manifest[name]?.files ?? []).filter(path => !copied.has(path));
  if (missing.length) throw new InstallError(`the source is missing listed files: ${missing.join(', ')}`);
  const version = readSource(source, 'VERSION').trim();
  const commit = git(source, ['rev-parse', 'HEAD']).trim();
  const block = readSource(source, 'AGENTS.md').match(BLOCK)?.[0];
  if (!block) throw new InstallError('the source AGENTS.md has no WONG-STACK block');

  // The links come first: a computer that refuses them stops before any file is copied.
  mkdirSync(join(target, '.agents'));
  link(target, '.agents', '.claude', 'dir');
  link(target, '.agents', '.codex', 'dir');
  for (const path of [...files, '.env.example']) {
    if (!existsSync(join(source, path))) throw new InstallError(`the source has no ${path}`);
    mkdirSync(dirname(join(target, path)), { recursive: true });
    copyFileSync(join(source, path), join(target, path), constants.COPYFILE_EXCL);
  }
  put(target, 'AGENTS.md', `${HEADER}${block}\n`);
  link(target, 'AGENTS.md', 'CLAUDE.md', 'file');
  for (const [path, template] of Object.entries(SEEDS)) put(target, path, readFileSync(join(SEED, template), 'utf8'));

  const paseo = JSON.parse(readFileSync(join(target, 'paseo.json'), 'utf8'));
  const setup = paseo.worktree?.setup;
  paseo.worktree = { ...paseo.worktree, setup: setup === undefined ? [] : [setup].flat() };
  writeFileSync(join(target, 'paseo.json'), `${JSON.stringify(paseo, null, 2)}\n`);

  const record = { version, commit, upstream: { repo, clone: source }, components: { skills: manifest.core?.skillDirs ?? [] }, installedAt: today };
  put(target, '.agents/.wong-stack.json', `${JSON.stringify(record, null, 2)}\n`);
  openspec(target);
  mkdirSync(join(target, 'openspec'), { recursive: true });
  writeFileSync(join(target, 'openspec', 'config.yaml'), readFileSync(join(SEED, 'openspec-config.yaml'), 'utf8'));
  return { version, commit, repo, files: files.length + 1 };
}

/** Installs and returns the report; on a stop, removes everything it wrote and throws `InstallError`. */
export function install({ source, target, repo, today = new Date().toISOString().slice(0, 10), openspec = runOpenspec }) {
  source = resolve(source);
  target = resolve(target);
  checkEmpty(target);
  mkdirSync(target, { recursive: true });
  try {
    const upstream = repo ?? git(source, ['remote', 'get-url', 'origin']).trim().replace(/\.git$/, '');
    const done = writeAll({ source, target, repo: upstream, today, openspec });
    return { status: 'installed', target, ...done, links: ['.claude', '.codex', 'CLAUDE.md'], seeded: Object.keys(SEEDS), record: '.claude/.wong-stack.json' };
  } catch (error) {
    for (const entry of readdirSync(target)) if (!KEPT.has(entry)) rmSync(join(target, entry), { recursive: true, force: true });
    if (error instanceof InstallError) throw error;
    throw new InstallError(error.message);
  }
}

if (isMain(import.meta.url)) {
  let values;
  try {
    ({ values } = parseArgs({ options: { source: { type: 'string' }, target: { type: 'string' }, repo: { type: 'string' }, help: { type: 'boolean' } }, strict: true }));
  } catch (error) {
    console.error(`${error.message}\n${USAGE}`);
    process.exit(2);
  }
  if (values.help || !values.source || !values.target) {
    (values.help ? console.log : console.error)(USAGE);
    process.exit(values.help ? 0 : 2);
  }
  try {
    console.log(JSON.stringify(install(values), null, 2));
  } catch (error) {
    console.log(JSON.stringify({ status: 'error', cause: error.message }, null, 2));
    process.exitCode = 1;
  }
}
