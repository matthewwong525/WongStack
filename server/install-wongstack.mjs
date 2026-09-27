#!/usr/bin/env node
// Installs WongStack into a person's empty GitHub repo on their own server, with no question: what
// /wong-setup does for an empty folder, with every choice made ahead. A host clones this source at a
// pinned commit into ~/.cache/wong-stack/WongStack and runs this file from there, as the workspace user,
// with {token, accountId, repo} on stdin. It installs this clone: its payload, VERSION, and commit.
// It prints one last line: `done`, or why it stopped (`token`, `repo`, `cloudflare`, or `push`).
// Every step checks before it acts, so a second run finishes a first run that stopped.
// No token value goes into an argument, an error, the output, or a commit. server/README.md is the contract.
import { chmodSync, cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ProvisionError, names, provision, run, widen } from '../.agents/skills/wong-setup/scripts/provision.mjs';

export { run };

/** The source this installer came from: the clone it runs in. */
export const SOURCE = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLONE = '~/.cache/wong-stack/WongStack';
const UPSTREAM = 'https://github.com/matthewwong525/WongStack';
// `owner/name`, with GitHub's rule for the name; the name is the clone's folder.
const REPO = /^([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100})$/;
const ACCOUNT = /^[0-9a-f]{32}$/;
/** Every install takes every category: payload-files.json. */
const CATEGORIES = ['core', 'ui', 'pack', 'scaffold'];

/** Runs `fn`; a failure that is not already a ProvisionError becomes one with `reason`. */
async function step(reason, fn) {
  try {
    return await fn();
  } catch (error) {
    throw error instanceof ProvisionError ? error : new ProvisionError(reason, error.message);
  }
}

/** The repo's folder name, or null when `repo` is not a safe `owner/name`. */
export function repoFolder(repo) {
  const folder = REPO.exec(String(repo))?.[2];
  return folder && folder !== '.' && folder !== '..' ? folder : null;
}

/** The folder an install job works in, or null when the job is not a valid one. */
export const jobFolder = (job) => (job?.token && ACCOUNT.test(String(job.accountId)) ? repoFolder(job.repo) : null);

/** Replaces each key's own line, or adds it; every other line stays. Only the workspace user can read it. */
export function setEnv(file, values) {
  const lines = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter(Boolean) : [];
  for (const [key, value] of Object.entries(values)) {
    const at = lines.findIndex((line) => line.startsWith(`${key}=`));
    if (at >= 0) lines[at] = `${key}=${value}`;
    else lines.push(`${key}=${value}`);
  }
  writeFileSync(file, `${lines.join('\n')}\n`, { mode: 0o600 });
  chmodSync(file, 0o600);
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, value) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
};

// ── the repo ────────────────────────────────────────────────────────────────

/** `fresh` for a clone with no commits, `installed` for one this installer committed; anything else stops. */
async function checkRepo(dir, git) {
  if (!existsSync(join(dir, '.git'))) throw new ProvisionError('repo', `${dir} is not a clone`);
  const committed = await git(['rev-parse', '-q', '--verify', 'HEAD']).then(() => true, () => false);
  if (!committed) return 'fresh';
  if (existsSync(join(dir, '.claude', '.wong-stack.json'))) return 'installed';
  throw new ProvisionError('repo', 'the repo already has work in it');
}

const IGNORE = ['.env*', '!.env.example', '.dev.vars*', '!.dev.vars.example'];

/** Git ignores `.env` before it holds a secret: the runbook's first rule. */
function protectSecrets(dir, { token, accountId }) {
  const exclude = join(dir, '.git', 'info', 'exclude');
  const lines = existsSync(exclude) ? readFileSync(exclude, 'utf8').split('\n') : [];
  const missing = IGNORE.filter((rule) => !lines.includes(rule));
  mkdirSync(dirname(exclude), { recursive: true });
  if (missing.length) writeFileSync(exclude, `${[...lines.filter(Boolean), ...missing].join('\n')}\n`);
  setEnv(join(dir, '.env'), { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: accountId });
}

// ── the payload ─────────────────────────────────────────────────────────────

// The payload lists logical `.claude/` paths; both sides keep them in a real `.agents/`.
const real = (path) => path.replace(/^\.claude\//, '.agents/');

/** The source's files, as a clone has them: tracked, plus any new file git does not ignore. */
async function sourceFiles(exec) {
  const { stdout } = await exec('git', ['-C', SOURCE, 'ls-files', '-z', '--cached', '--others', '--exclude-standard']);
  return [...new Set(stdout.split('\0'))].filter((path) => path && existsSync(join(SOURCE, path)));
}

/**
 * The payload's files, from the source's own list: every category's skills, files, and folders, less its
 * exclusions, plus `.nvmrc` (CI's `node-version-file`) and `.gitignore`. A listed file the source lacks stops.
 */
export function payloadFiles(manifest, files) {
  const lists = CATEGORIES.map((name) => manifest[name] ?? {});
  const exact = new Set(['.nvmrc', '.gitignore', ...lists.flatMap((list) => list.files ?? []).map(real)]);
  const folders = [
    ...(manifest.core?.skillDirs ?? []).map((skill) => `.agents/skills/${skill}/`),
    ...lists.flatMap((list) => list.dirs ?? []).map((dir) => `${real(dir)}/`),
  ];
  const excluded = lists.flatMap((list) => list.exclude ?? []).map(real);
  const have = new Set(files);
  const absent = [...exact].filter((path) => !have.has(path));
  if (absent.length) throw new ProvisionError('repo', `the source lacks payload files: ${absent.join(', ')}`);
  const empty = folders.filter((folder) => !files.some((path) => path.startsWith(folder)));
  if (empty.length) throw new ProvisionError('repo', `the source lacks payload folders: ${empty.join(', ')}`);
  const out = (path) => excluded.some((gone) => path === gone || path.startsWith(`${gone}/`));
  return files.filter((path) => (exact.has(path) || folders.some((folder) => path.startsWith(folder))) && !out(path)).sort();
}

const titleOf = (file) => /^# (.+)$/m.exec(readFileSync(file, 'utf8'))?.[1] ?? file;

/** A hub that links every page and sub-hub beside it, so no copied page is an orphan. */
function writeHub(dir, folder, title, intro) {
  const entries = readdirSync(join(dir, folder), { withFileTypes: true });
  const hubs = entries.filter((e) => e.isDirectory() && existsSync(join(dir, folder, e.name, 'README.md'))).map((e) => `${e.name}/README.md`);
  const pages = entries.filter((e) => e.isFile() && e.name.endsWith('.md') && e.name !== 'README.md').map((e) => e.name);
  const links = [...hubs.sort(), ...pages.sort()].map((page) => `- [${titleOf(join(dir, folder, page))}](${page})`);
  writeFileSync(join(dir, folder, 'README.md'), `# ${title}\n\n${intro}\n\n${links.join('\n')}\n`);
}

/** Links `path` to `target` unless a link is already there. */
function link(target, path) {
  if (!existsSync(path) && !isLink(path)) symlinkSync(target, path);
}

const isLink = (path) => {
  try {
    return lstatSync(path).isSymbolicLink();
  } catch {
    return false;
  }
};

/** Copies the payload, the `WONG-STACK` block, the source's `.env.example`, the two hubs, and OpenSpec's home. */
async function copyPayload(dir, exec) {
  const manifest = readJson(join(SOURCE, '.agents', 'skills', 'wong-sync', 'references', 'payload-files.json'));
  for (const path of payloadFiles(manifest, await sourceFiles(exec))) {
    const from = join(SOURCE, path);
    const to = join(dir, path);
    mkdirSync(dirname(to), { recursive: true });
    if (isLink(from)) {
      if (!isLink(to)) symlinkSync(readlinkSync(from), to);
    } else cpSync(from, to);
  }
  for (const name of ['.claude', '.codex']) link('.agents', join(dir, name));

  const block = /<!-- WONG-STACK:BEGIN[\s\S]*?WONG-STACK:END.*/.exec(readFileSync(join(SOURCE, 'AGENTS.md'), 'utf8'))[0];
  writeFileSync(join(dir, 'AGENTS.md'), `# AGENTS.md\n\n${block}\n`);
  link('AGENTS.md', join(dir, 'CLAUDE.md'));
  cpSync(join(SOURCE, '.env.example'), join(dir, '.env.example'));
  writeHub(dir, join('wiki', 'development'), 'Development', 'How this repo plans, builds, checks, and ships changes. Back to [the wiki](../README.md).');
  writeHub(dir, 'wiki', 'Wiki', 'How this repo works. Start here and follow the links down.');
  if (!existsSync(join(dir, 'openspec', 'config.yaml'))) await exec('openspec', ['init', '--tools', 'none'], { cwd: dir });
  return manifest;
}

/** `https://host/owner/name` for an HTTPS or SSH remote, without `.git`. */
export function upstreamUrl(remote) {
  const url = String(remote).trim().replace(/\.git$/, '');
  const ssh = /^(?:ssh:\/\/)?git@([^:/]+)[:/](.+)$/.exec(url);
  return ssh ? `https://${ssh[1]}/${ssh[2]}` : url || UPSTREAM;
}

/** The install record `/wong-sync` reads: this clone's version, commit, and origin. */
async function installRecord(manifest, exec, today) {
  const version = readFileSync(join(SOURCE, 'VERSION'), 'utf8').trim();
  const commit = (await exec('git', ['-C', SOURCE, 'rev-parse', 'HEAD'])).stdout.trim();
  const origin = await exec('git', ['-C', SOURCE, 'remote', 'get-url', 'origin']).then(({ stdout }) => upstreamUrl(stdout), () => UPSTREAM);
  return {
    version,
    commit,
    installedAt: today,
    updatedAt: today,
    upstream: { repo: origin, fork: null, clone: CLONE },
    components: { skills: manifest.core.skillDirs, claudeMd: true, docs: true, openspec: true, ui: true, stackPack: true, appScaffold: true, memory: null },
  };
}

// ── the whole install ───────────────────────────────────────────────────────

/** Installs, provisions, commits, and pushes. Throws a ProvisionError with the reason. */
export async function install({ token, accountId, repo }, { dir, env = process.env, fetch, sleep, today, exec = run }) {
  const quiet = (file, args, options = {}) => exec(file, args, { env, ...options });
  const git = (args) => quiet('git', ['-C', dir, ...args]);
  const mode = await step('repo', () => checkRepo(dir, git));
  await step('repo', () => protectSecrets(dir, { token, accountId }));
  const cloudflare = { token, api: env.WONG_CLOUDFLARE_API, fetch, account: accountId, repo, dir, env, exec: quiet, ...(sleep && { sleep }) };
  await widen(cloudflare);

  let record = null;
  if (mode === 'fresh') {
    const manifest = await step('repo', () => copyPayload(dir, quiet));
    record = await step('repo', () => installRecord(manifest, quiet, today));
  }
  const { base } = await names(cloudflare);
  if (record) writeJson(join(dir, '.claude', '.wong-stack.json'), record);
  await provision({ ...cloudflare, base, today, keepConfig: mode === 'installed' });

  await step('push', async () => {
    if (mode === 'fresh') {
      await git(['symbolic-ref', 'HEAD', 'refs/heads/main']);
      await git(['add', '-A']);
      await git(['commit', '-q', '-m', `feat: install WongStack ${record.version}`]);
    } else if ((await git(['ls-remote', '--heads', 'origin', 'main'])).stdout.trim()) {
      // Pushed already: a rerun leaves the person's later work alone.
      return;
    }
    await git(['push', '-q', '-u', 'origin', 'main']);
  });
}

/** Reads the job from stdin and prints `done` or the reason. Returns the exit code. */
export async function main({ stdin, env = process.env, fetch, sleep, now = () => new Date(), out = console.log, err = console.error, exec }) {
  let job = {};
  try {
    job = JSON.parse(stdin);
  } catch {
    // Reported below as a bad job.
  }
  const folder = jobFolder(job);
  if (!folder) {
    err('install-wongstack: the job needs a token, a 32-character account id, and an owner/name repo');
    out('repo');
    return 1;
  }
  try {
    await install(job, { dir: join(env.HOME, folder), env, fetch, sleep, exec, today: now().toISOString().slice(0, 10) });
    out('done');
    return 0;
  } catch (error) {
    err(`install-wongstack: ${error.message}`);
    out(error.reason ?? 'repo');
    return 1;
  }
}

const isMain = () => {
  try {
    return Boolean(process.argv[1]) && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
};

if (isMain()) {
  let stdin = '';
  for await (const chunk of process.stdin) stdin += chunk;
  process.exitCode = await main({ stdin });
}
