#!/usr/bin/env node
// Opens one new workspace for one part of a request. With Paseo it is Paseo's,
// with its own agent, whose first message is the brief file's text. Without
// Paseo it is a ready folder the person opens in their own assistant. USAGE
// below lists the flags.
//
// Prints one JSON object on stdout. Exit codes: 0 ok, 2 bad input or a
// refusal from Paseo or git, 4 daemon not answering, 5 Paseo's output has
// changed. On 4 and 5 nothing was opened, and `fallback` holds the Paseo app
// steps. An installed Paseo that does not answer never falls back to a folder:
// its user should hear that it is down.
//
// Branch-off workspaces start from the freshly fetched remote default branch
// of the primary worktree, never from the caller's branch.
//
// With Paseo, the new agent copies the caller's provider, model, thinking, and
// mode, and has no parent: `paseo run` makes a sub-agent whenever
// PASEO_AGENT_ID is set, so the child process runs without it. `paseo run
// --title` names only the agent, so the script then renames the workspace to
// the same title with `paseo workspace rename`, and Paseo's list shows the
// part, not a generated slug. The workspace is already open by then, so a
// refused rename is a `warning` with exit 0, never a failure.
//
// Without Paseo (lib/host.mjs), the workspace is a worktree at
// <primary>-workspaces/<slug>, a sibling of the primary checkout, on a new
// branch <slug>; a taken name gets -2, -3. It holds the primary's secrets, the
// brief at .scratch/brief.md, and the marker that makes it WongStack's to
// close and tidy. No agent starts: nobody would be there to answer it. The
// output's `paste` is the one line the person gives their assistant there.
//
// Node built-ins only. WORKSPACE_PASEO_BIN overrides the `paseo` found on PATH.

import { execFile, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { CliError, EXIT, git, parseCommand } from './lib/cli.mjs';
import { plainParent, workspaceHost, writeMarker } from './lib/host.mjs';
import { PaseoError, findPaseo, paseo, runPaseo } from './lib/paseo.mjs';
import { scratchFolder } from './tidy.mjs';

const USAGE = `usage: workspace.mjs open --title <part> --brief <file>
                         [--checkout <branch>] [--agent claude|codex] [--dry-run]`;
const VALUE_FLAGS = ['title', 'brief', 'checkout', 'agent'];
const MODES = { claude: 'bypassPermissions', codex: 'full-access' };
const PARENT_VARS = ['PASEO_AGENT_ID', 'PASEO_WORKSPACE_ID'];
const PASEO_BIN = 'WORKSPACE_PASEO_BIN';
const PASTE = 'Read .scratch/brief.md and do what it says.';
const SECRETS = fileURLToPath(new URL('../../ship/scripts/worktree-secrets.mjs', import.meta.url));
const SLUG_MAX = 40;

// ---------------------------------------------------------------------------
// Pure helpers

/** The new agent's settings: the caller's, from `paseo inspect`, else the --agent defaults. */
export function agentSettings(inspected, agent) {
  if (inspected) {
    if (!inspected.Provider || !inspected.Mode) {
      throw new PaseoError(EXIT.client, "Paseo's inspect output has changed: Provider or Mode is missing.");
    }
    return {
      provider: inspected.Provider,
      model: inspected.Model || null,
      thinking: inspected.Thinking || null,
      mode: inspected.Mode,
    };
  }
  const mode = MODES[agent];
  if (!mode) {
    throw new PaseoError(EXIT.input, 'Not run from a Paseo agent: pass --agent claude or --agent codex.');
  }
  return { provider: agent, model: null, thinking: null, mode };
}

/** The `paseo run` arguments, without the trailing --json. */
export function runArgs({ primary, title, brief, settings, base, checkout }) {
  const args = ['run', '-d', '--new-workspace', 'worktree'];
  if (checkout) args.push('--worktree-mode', 'checkout-branch', '--branch', checkout);
  else args.push('--worktree-mode', 'branch-off', '--base', base);
  args.push('--cwd', primary, '--title', title, '--provider', settings.provider);
  if (settings.model) args.push('--model', settings.model);
  if (settings.thinking) args.push('--thinking', settings.thinking);
  args.push('--mode', settings.mode, brief);
  return args;
}

/** The `paseo workspace rename` arguments, without the trailing --json. The title is one element. */
export function renameArgs(workspaceId, title) {
  return ['workspace', 'rename', workspaceId, title];
}

/** The environment for `paseo run`: this one, minus the variables that make a sub-agent. */
export function childEnv(env) {
  const out = { ...env };
  for (const name of PARENT_VARS) delete out[name];
  return out;
}

/** Reads Paseo's stderr: `Created workspace <id> - <name> (<branch>)`, then an optional setup note. */
export function parseCreated(stderr) {
  const lines = String(stderr ?? '').split('\n').map(l => l.trim());
  const at = lines.findIndex(l => l.startsWith('Created workspace '));
  if (at < 0) return null;
  const m = /^Created workspace (\S+) - (.+?)(?: \(([^()]+)\))?$/.exec(lines[at]);
  if (!m) return null;
  const next = lines[at + 1];
  return {
    workspaceId: m[1],
    workspaceName: m[2],
    branch: m[3] ?? null,
    setupSkippedReason: next && !next.startsWith('Tip:') ? next : null,
  };
}

/** A folder and branch name from a part's title: lowercase words joined by hyphens, `workspace` when none survive. */
export function slugOf(title) {
  const slug = String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+/, '').slice(0, SLUG_MAX).replace(/-+$/, '');
  return slug || 'workspace';
}

/** The first of `slug`, `slug-2`, `slug-3`, … that `taken(name)` does not hold. */
export function freeName(slug, taken) {
  for (let n = 1; ; n++) {
    const name = n === 1 ? slug : `${slug}-${n}`;
    if (!taken(name)) return name;
  }
}

/** Steps to open the same workspace by hand, for when the script cannot. */
function appSteps({ primary, title, briefFile, settings, base, checkout }) {
  return [
    'Open it in the Paseo app instead:',
    `- New workspace: worktree of ${primary}`,
    checkout ? `- Check out branch: ${checkout}` : `- New branch from: ${base}`,
    `- Title: ${title}`,
    settings ? `- Agent: ${settings.provider}${settings.model ? `/${settings.model}` : ''}, mode ${settings.mode}` : '- Agent: the same as this chat',
    `- First message: the text of ${briefFile}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Environment

function primaryWorktree() {
  try {
    return primaryRoot().primary;
  } catch (error) {
    if (error instanceof PrimaryRootError) throw new CliError(EXIT.input, error.message);
    throw error;
  }
}

function hasRef(cwd, ref) {
  try { git(cwd, 'rev-parse', '--verify', '--quiet', ref); return true; } catch { return false; }
}

/** `main`, unless it exists neither locally nor on origin; then the forge's default branch. */
async function defaultBranch(cwd) {
  if (hasRef(cwd, 'refs/heads/main') || hasRef(cwd, 'refs/remotes/origin/main')) return 'main';
  try {
    const { stdout } = await promisify(execFile)('gh',
      ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'], { cwd, encoding: 'utf8' });
    if (stdout.trim()) return stdout.trim();
  } catch { /* reported below */ }
  throw new CliError(EXIT.input, 'No `main` branch here or on origin, and `gh` could not name the default branch.');
}

/** Fetches the default branch (unless a dry run) and returns the ref to branch from, preferring origin's copy. */
async function freshBase(cwd, branch, { fetch }) {
  let warning = null;
  if (fetch) {
    try {
      git(cwd, 'fetch', '--quiet', 'origin', branch);
    } catch (error) {
      warning = `Could not fetch origin/${branch}, so the workspace starts from the last fetched copy: ${String(error.stderr ?? error.message).trim()}`;
    }
  }
  if (hasRef(cwd, `refs/remotes/origin/${branch}`)) return { base: `origin/${branch}`, warning };
  return { base: branch, warning };
}

/** Names the opened workspace after its part; any refusal keeps Paseo's name, with a warning. */
async function nameWorkspace(bin, created, title, env) {
  if (!created) {
    return { name: null, warning: "Paseo did not print the workspace line, so the workspace kept Paseo's name; find it by its agent's title." };
  }
  try {
    const { data } = await runPaseo(bin, renameArgs(created.workspaceId, title), { env: childEnv(env) });
    return { name: data?.title || title, warning: null };
  } catch (error) {
    return { name: created.workspaceName, warning: `The workspace kept Paseo's name, "${created.workspaceName}": ${error.message}` };
  }
}

// ---------------------------------------------------------------------------
// Without Paseo: a marked worktree

/** Copies the primary's secrets into the new worktree. Returns a warning, or null; the worktree stays either way. */
function seedSecrets(dir) {
  const run = spawnSync(process.execPath, [SECRETS, 'seed'], { cwd: dir, encoding: 'utf8' });
  if (run.status !== 0) return `The folder has no secrets yet: ${String(run.stderr || run.error?.message || 'the copy failed').trim()}`;
  let seeded;
  try { seeded = JSON.parse(run.stdout); } catch { return null; }
  const missed = [...(seeded.skipped ?? []).map(item => item.path), ...(seeded.unseeded ?? [])];
  return missed.length ? `These secrets files were not copied into the folder: ${missed.join(', ')}.` : null;
}

/** Makes the worktree, marks it, and fills it with the secrets and the brief. Starts no agent. */
async function openPlain({ primary, title, brief, checkout, dryRun }) {
  let base = null;
  let warning = null;
  if (!checkout) ({ base, warning } = await freshBase(primary, await defaultBranch(primary), { fetch: !dryRun }));
  const parent = plainParent(primary);
  const name = freeName(slugOf(title), candidate => existsSync(path.join(parent, candidate))
    || (!checkout && (hasRef(primary, `refs/heads/${candidate}`) || hasRef(primary, `refs/remotes/origin/${candidate}`))));
  const dir = path.join(parent, name);
  const made = { host: 'plain', path: dir, branch: checkout ?? name, ...(checkout ? { checkout } : { base }), title, paste: PASTE };
  if (dryRun) return { ok: true, dryRun: true, ...made };
  mkdirSync(parent, { recursive: true });
  try {
    git(primary, 'worktree', 'add', '-q', ...(checkout ? [dir, checkout] : ['--no-track', '-b', name, dir, base]));
  } catch (error) {
    throw new CliError(EXIT.input, `git worktree add failed: ${String(error.stderr ?? error.message).trim()}`);
  }
  writeMarker(dir, { title, madeAt: new Date().toISOString(), closedAt: null });
  const warnings = [warning, seedSecrets(dir)].filter(Boolean);
  writeFileSync(path.join(scratchFolder(dir).path, 'brief.md'), `${brief}\n`);
  return { ok: true, ...made, ...(warnings.length ? { warning: warnings.join('\n') } : {}) };
}

// ---------------------------------------------------------------------------
// Command

function readBrief(file) {
  if (!file) throw new CliError(EXIT.input, 'Pass --brief <file>: the new agent\'s first message.');
  let text;
  try { text = readFileSync(file, 'utf8').trim(); } catch (error) {
    throw new CliError(EXIT.input, `Cannot read the brief ${file}: ${error.code ?? error.message}.`);
  }
  if (!text) throw new CliError(EXIT.input, `The brief ${file} is empty.`);
  if (text.startsWith('-')) throw new CliError(EXIT.input, 'The brief must not start with "-".');
  return text;
}

async function open(flags, env) {
  const title = String(flags.title ?? '').trim();
  if (!title) throw new CliError(EXIT.input, 'Pass --title <part>: the new workspace\'s name.');
  const brief = readBrief(flags.brief);
  const primary = primaryWorktree();
  if (workspaceHost(env, PASEO_BIN) === 'plain') {
    return openPlain({ primary, title, brief, checkout: flags.checkout, dryRun: flags.dryRun });
  }
  const ctx = { primary, title, briefFile: flags.brief, checkout: flags.checkout, settings: null, base: null };
  try {
    const bin = findPaseo(env, PASEO_BIN);
    const caller = env.PASEO_AGENT_ID?.trim();
    ctx.settings = agentSettings(caller ? await paseo(bin, ['inspect', caller]) : null, flags.agent);
    let warning = null;
    if (!ctx.checkout) {
      ({ base: ctx.base, warning } = await freshBase(primary, await defaultBranch(primary), { fetch: !flags.dryRun }));
    }
    const args = runArgs({ ...ctx, brief });
    if (flags.dryRun) {
      return {
        ok: true, dryRun: true, command: ['paseo', ...args, '--json'],
        rename: ['paseo', ...renameArgs('<workspaceId>', title), '--json'], removedEnv: PARENT_VARS,
      };
    }
    const { data, stderr } = await runPaseo(bin, args, { env: childEnv(env) });
    if (!data?.agentId) {
      throw new PaseoError(EXIT.client, `Paseo's run output has changed: no agentId in ${JSON.stringify(data)}.`);
    }
    const created = parseCreated(stderr);
    const named = await nameWorkspace(bin, created, title, env);
    const warnings = [warning, named.warning].filter(Boolean);
    return {
      ok: true,
      agentId: data.agentId,
      title: data.title ?? title,
      cwd: data.cwd ?? null,
      workspaceId: created?.workspaceId ?? null,
      workspaceName: named.name,
      branch: created?.branch ?? ctx.checkout ?? null,
      ...(ctx.checkout ? { checkout: ctx.checkout } : { base: ctx.base }),
      provider: ctx.settings.provider,
      model: ctx.settings.model,
      mode: ctx.settings.mode,
      ...(created?.setupSkippedReason ? { setupSkippedReason: created.setupSkippedReason } : {}),
      ...(warnings.length ? { warning: warnings.join('\n') } : {}),
    };
  } catch (error) {
    if (error instanceof PaseoError && error.code !== EXIT.input) error.extra.fallback = { app: appSteps(ctx) };
    throw error;
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const { command, flags } = parseCommand(argv, { values: VALUE_FLAGS, booleans: { '--dry-run': 'dryRun' }, unknown: arg => `Unknown argument ${arg}.` });
    if (command !== 'open') throw new CliError(EXIT.input, `Unknown command "${command}". Use open.`);
    process.stdout.write(`${JSON.stringify(await open(flags, env), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof CliError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
