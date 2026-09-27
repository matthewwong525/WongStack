#!/usr/bin/env node
// Opens one new Paseo workspace with its own agent, for one part of a request.
// The agent's first message is the brief file's text. USAGE below lists the flags.
//
// Prints one JSON object on stdout. Exit codes: 0 ok, 2 bad input or Paseo
// refused, 3 Paseo not installed, 4 daemon not answering, 5 Paseo's output
// has changed. On 3 to 5 nothing was opened, and `fallback` holds the Paseo
// app steps.
//
// Branch-off workspaces start from the freshly fetched remote default branch
// of the primary worktree, never from the caller's branch. The new agent
// copies the caller's provider, model, thinking, and mode, and has no parent:
// `paseo run` makes a sub-agent whenever PASEO_AGENT_ID is set, so the child
// process runs without it.
//
// Node built-ins only. WORKSPACE_PASEO_BIN overrides the `paseo` found on PATH.

import { execFile } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { EXIT, PaseoError, findPaseo, paseo, runPaseo } from './lib/paseo.mjs';

const USAGE = `usage: workspace.mjs open --title <part> --brief <file>
                         [--checkout <branch>] [--agent claude|codex] [--dry-run]`;
const VALUE_FLAGS = ['title', 'brief', 'checkout', 'agent'];
const MODES = { claude: 'bypassPermissions', codex: 'full-access' };
const PARENT_VARS = ['PASEO_AGENT_ID', 'PASEO_WORKSPACE_ID'];

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
    if (error instanceof PrimaryRootError) throw new PaseoError(EXIT.input, error.message);
    throw error;
  }
}

async function git(cwd, args) {
  const { stdout } = await promisify(execFile)('git', ['-C', cwd, ...args], { encoding: 'utf8' });
  return stdout.trim();
}

async function hasRef(cwd, ref) {
  try { await git(cwd, ['rev-parse', '--verify', '--quiet', ref]); return true; } catch { return false; }
}

/** `main`, unless it exists neither locally nor on origin; then the forge's default branch. */
async function defaultBranch(cwd) {
  if (await hasRef(cwd, 'refs/heads/main') || await hasRef(cwd, 'refs/remotes/origin/main')) return 'main';
  try {
    const { stdout } = await promisify(execFile)('gh',
      ['repo', 'view', '--json', 'defaultBranchRef', '--jq', '.defaultBranchRef.name'], { cwd, encoding: 'utf8' });
    if (stdout.trim()) return stdout.trim();
  } catch { /* reported below */ }
  throw new PaseoError(EXIT.input, 'No `main` branch here or on origin, and `gh` could not name the default branch.');
}

/** Fetches the default branch (unless a dry run) and returns the ref to branch from, preferring origin's copy. */
async function freshBase(cwd, branch, { fetch }) {
  let warning = null;
  if (fetch) {
    try {
      await git(cwd, ['fetch', '--quiet', 'origin', branch]);
    } catch (error) {
      warning = `Could not fetch origin/${branch}, so the workspace starts from the last fetched copy: ${String(error.stderr ?? error.message).trim()}`;
    }
  }
  if (await hasRef(cwd, `refs/remotes/origin/${branch}`)) return { base: `origin/${branch}`, warning };
  return { base: branch, warning };
}

// ---------------------------------------------------------------------------
// Command

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a === '--dry-run') { flags.dryRun = true; continue; }
    if (!a.startsWith('--') || !VALUE_FLAGS.includes(a.slice(2))) {
      throw new PaseoError(EXIT.input, `Unknown argument ${a}.`);
    }
    const value = rest[i + 1];
    if (value === undefined) throw new PaseoError(EXIT.input, `${a} needs a value.`);
    flags[a.slice(2)] = value;
    i++;
  }
  return { command, flags };
}

function readBrief(file) {
  if (!file) throw new PaseoError(EXIT.input, 'Pass --brief <file>: the new agent\'s first message.');
  let text;
  try { text = readFileSync(file, 'utf8').trim(); } catch (error) {
    throw new PaseoError(EXIT.input, `Cannot read the brief ${file}: ${error.code ?? error.message}.`);
  }
  if (!text) throw new PaseoError(EXIT.input, `The brief ${file} is empty.`);
  if (text.startsWith('-')) throw new PaseoError(EXIT.input, 'The brief must not start with "-".');
  return text;
}

async function open(flags, env) {
  const title = String(flags.title ?? '').trim();
  if (!title) throw new PaseoError(EXIT.input, 'Pass --title <part>: the new workspace\'s name.');
  const brief = readBrief(flags.brief);
  const primary = primaryWorktree();
  const ctx = { primary, title, briefFile: flags.brief, checkout: flags.checkout, settings: null, base: null };
  try {
    const bin = findPaseo(env, 'WORKSPACE_PASEO_BIN');
    const caller = env.PASEO_AGENT_ID?.trim();
    ctx.settings = agentSettings(caller ? await paseo(bin, ['inspect', caller]) : null, flags.agent);
    let warning = null;
    if (!ctx.checkout) {
      ({ base: ctx.base, warning } = await freshBase(primary, await defaultBranch(primary), { fetch: !flags.dryRun }));
    }
    const args = runArgs({ ...ctx, brief });
    if (flags.dryRun) return { ok: true, dryRun: true, command: ['paseo', ...args, '--json'], removedEnv: PARENT_VARS };
    const { data, stderr } = await runPaseo(bin, args, { env: childEnv(env) });
    if (!data?.agentId) {
      throw new PaseoError(EXIT.client, `Paseo's run output has changed: no agentId in ${JSON.stringify(data)}.`);
    }
    const created = parseCreated(stderr);
    return {
      ok: true,
      agentId: data.agentId,
      title: data.title ?? title,
      cwd: data.cwd ?? null,
      workspaceId: created?.workspaceId ?? null,
      workspaceName: created?.workspaceName ?? null,
      branch: created?.branch ?? ctx.checkout ?? null,
      ...(ctx.checkout ? { checkout: ctx.checkout } : { base: ctx.base }),
      provider: ctx.settings.provider,
      model: ctx.settings.model,
      mode: ctx.settings.mode,
      ...(created?.setupSkippedReason ? { setupSkippedReason: created.setupSkippedReason } : {}),
      ...(warning || !created ? { warning: warning ?? 'Paseo did not print the workspace line; find it by its title.' } : {}),
    };
  } catch (error) {
    if (error instanceof PaseoError && error.code !== EXIT.input) error.extra.fallback = { app: appSteps(ctx) };
    throw error;
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const { command, flags } = parseArgs(argv);
    if (command !== 'open') throw new PaseoError(EXIT.input, `Unknown command "${command}". Use open.`);
    process.stdout.write(`${JSON.stringify(await open(flags, env), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof PaseoError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

function isMain() {
  try { return realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (isMain()) process.exitCode = await main();
