#!/usr/bin/env node
// Opens one new Paseo workspace with its own agent, for one part of a request; the brief file is its first message.
// It branches from the fetched default branch, never the caller's, and has no parent. USAGE below lists the flags.

import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { promisify } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { primaryRoot, PrimaryRootError } from '../../memory/scripts/lib/primary-root.mjs';
import { PickupError, pinBranch, reviewBranch } from '../../continue/scripts/pickup.mjs';
import { delivery } from '../../save/scripts/delivery-route.mjs';
import { EXIT, PaseoError, findPaseo, git, paseo, parseCommand, runPaseo, withJson } from './lib/paseo.mjs';

const USAGE = `usage: workspace.mjs open --title <part> --brief <file>
                         [--checkout <branch> [--reviewed <commit>]] [--agent claude|codex] [--dry-run]`;
const VALUE_FLAGS = ['title', 'brief', 'checkout', 'reviewed', 'agent'];
const MODES = { claude: 'bypassPermissions', codex: 'full-access' };
const PARENT_VARS = ['PASEO_AGENT_ID', 'PASEO_WORKSPACE_ID'];
const PLACEHOLDERS = new Set(['main', 'master', 'default', 'hello', 'hello world', 'test', 'testing', 'untitled',
  'new workspace', 'workspace', 'scratch', 'temp', 'tmp', 'wip']);
const SLUG = /^(?=.*[A-Za-z0-9])(?=.*[-_])[A-Za-z0-9._-]+$/;

/** The workspace's name in plain words: a slug becomes words; a placeholder, which no conversion fixes, is exit 2. */
export function workspaceTitle(raw) {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) throw new PaseoError(EXIT.input, 'Pass --title <part>: the new workspace\'s name.');
  if (PLACEHOLDERS.has(trimmed.toLowerCase().replace(/[-_\s]+/g, ' ').trim())) {
    throw new PaseoError(EXIT.input, `"${trimmed}" says nothing about the work: pass a --title of a few words that name it.`);
  }
  if (!SLUG.test(trimmed)) return trimmed;
  const words = trimmed.split(/[-_]+/).filter(Boolean).join(' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

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

/** The `paseo run` arguments, without --json. `--` ends the options, so a brief of any shape is the prompt. */
export function runArgs({ primary, title, brief, settings, base, checkout }) {
  const args = ['run', '-d', '--new-workspace', 'worktree'];
  if (checkout) args.push('--worktree-mode', 'checkout-branch', '--branch', checkout);
  else args.push('--worktree-mode', 'branch-off', '--base', base);
  args.push('--cwd', primary, '--title', title, '--provider', settings.provider);
  if (settings.model) args.push('--model', settings.model);
  if (settings.thinking) args.push('--thinking', settings.thinking);
  args.push('--mode', settings.mode, '--', brief);
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

/** Steps to open the same workspace by hand, for when the script cannot. */
function appSteps({ primary, title, briefFile, settings, base, checkout, commit }) {
  return [
    'Open it in the Paseo app instead:',
    `- New workspace: worktree of ${primary}`,
    checkout ? `- Check out branch: ${checkout}${commit ? ` (it starts at ${commit.slice(0, 12)})` : ''}` : `- New branch from: ${base}`,
    `- Title: ${title}`,
    settings ? `- Agent: ${settings.provider}${settings.model ? `/${settings.model}` : ''}, mode ${settings.mode}` : '- Agent: the same as this chat',
    `- First message: the text of ${briefFile}`,
  ].join('\n');
}

function primaryWorktree() {
  try {
    return primaryRoot().primary;
  } catch (error) {
    if (error instanceof PrimaryRootError) throw new PaseoError(EXIT.input, error.message);
    throw error;
  }
}

async function hasRef(cwd, ref) {
  try { git(cwd, 'rev-parse', '--verify', '--quiet', ref); return true; } catch { return false; }
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

/** The step that fixes a failed fetch in a copy installed through the app: its sign-in has usually run out. */
function signInStep(cwd) {
  try {
    if (delivery(cwd).route !== 'app') return '';
    return ` Sign in to the company app again, then retry: cloudflared access login ${new URL(git(cwd, 'remote', 'get-url', 'origin')).origin}`;
  } catch {
    return '';
  }
}

/** Fetches the default branch (unless a dry run) and returns the ref to branch from, preferring origin's copy. */
async function freshBase(cwd, branch, { fetch }) {
  let warning = null;
  if (fetch) {
    try {
      git(cwd, 'fetch', '--quiet', 'origin', branch);
    } catch (error) {
      warning = `Could not fetch origin/${branch}, so the workspace starts from the last fetched copy: ${String(error.stderr ?? error.message).trim()}${signInStep(cwd)}`;
    }
  }
  if (await hasRef(cwd, `refs/remotes/origin/${branch}`)) return { base: `origin/${branch}`, warning };
  return { base: branch, warning };
}

// pickup.mjs's review of a --checkout branch: new work without a matching --reviewed is exit 2. The primary's local
// branch is then pinned to the commit, so Paseo uses it as it is and fetches nothing newer.
function reviewedCheckout(primary, branch, reviewed, { dryRun }) {
  try {
    const review = reviewBranch({ cwd: primary, branch, reviewed, fetch: !dryRun });
    if (review.commits.length) {
      const { tip, commits, files } = review;
      throw new PaseoError(EXIT.input, `"${branch}" holds work this computer has never had. Show it and ask; on a yes, pass --reviewed ${tip}.`,
        { review: { branch: review.branch, tip, commits, files } });
    }
    return dryRun ? review.tip : pinBranch({ cwd: primary, ...review });
  } catch (error) {
    if (error instanceof PickupError) throw new PaseoError(EXIT.input, error.message, error.extra);
    throw error;
  }
}

/** The new worktree's HEAD, checked against the commit it was opened for; a mismatch is exit 5. */
function checkLanded(cwd, commit, opened) {
  let head = null;
  try { head = cwd ? git(cwd, 'rev-parse', 'HEAD') : null; } catch { /* reported below */ }
  if (head === commit) return;
  throw new PaseoError(EXIT.client, `The new workspace ${cwd ? `starts at ${head ?? 'an unreadable commit'}` : 'has no folder in Paseo\'s output'}, not the reviewed ${commit}. Close it before anything runs there.`, { opened });
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

function readBrief(file) {
  if (!file) throw new PaseoError(EXIT.input, 'Pass --brief <file>: the new agent\'s first message.');
  let text;
  try { text = readFileSync(file, 'utf8').trim(); } catch (error) {
    throw new PaseoError(EXIT.input, `Cannot read the brief ${file}: ${error.code ?? error.message}.`);
  }
  if (!text) throw new PaseoError(EXIT.input, `The brief ${file} is empty.`);
  return text;
}

async function open(flags, env) {
  const title = workspaceTitle(flags.title);
  const brief = readBrief(flags.brief);
  const primary = primaryWorktree();
  const ctx = { primary, title, briefFile: flags.brief, checkout: flags.checkout, commit: null, settings: null, base: null };
  if (flags.reviewed !== undefined && !ctx.checkout) throw new PaseoError(EXIT.input, '--reviewed goes with --checkout <branch>.');
  if (ctx.checkout) ctx.commit = reviewedCheckout(primary, ctx.checkout, flags.reviewed ?? null, { dryRun: flags.dryRun });
  try {
    const bin = findPaseo(env, 'WORKSPACE_PASEO_BIN');
    const caller = env.PASEO_AGENT_ID?.trim();
    ctx.settings = agentSettings(caller ? await paseo(bin, ['inspect', caller]) : null, flags.agent);
    let warning = null;
    if (!ctx.checkout) {
      ({ base: ctx.base, warning } = await freshBase(primary, await defaultBranch(primary), { fetch: !flags.dryRun }));
    }
    const args = runArgs({ ...ctx, brief });
    if (flags.dryRun) {
      return {
        ok: true, dryRun: true, command: ['paseo', ...withJson(args)], ...(ctx.commit ? { commit: ctx.commit } : {}),
        rename: ['paseo', ...renameArgs('<workspaceId>', title), '--json'], removedEnv: PARENT_VARS,
      };
    }
    const { data, stderr } = await runPaseo(bin, args, { env: childEnv(env) });
    if (!data?.agentId) {
      throw new PaseoError(EXIT.client, `Paseo's run output has changed: no agentId in ${JSON.stringify(data)}.`);
    }
    const created = parseCreated(stderr);
    if (ctx.commit) checkLanded(data.cwd, ctx.commit, { agentId: data.agentId, workspaceId: created?.workspaceId ?? null, cwd: data.cwd ?? null });
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
      ...(ctx.checkout ? { checkout: ctx.checkout, commit: ctx.commit } : { base: ctx.base }),
      provider: ctx.settings.provider,
      model: ctx.settings.model,
      mode: ctx.settings.mode,
      ...(created?.setupSkippedReason ? { setupSkippedReason: created.setupSkippedReason } : {}),
      ...(warnings.length ? { warning: warnings.join('\n') } : {}),
    };
  } catch (error) {
    if (error instanceof PaseoError && error.code !== EXIT.input && !error.extra.opened) error.extra.fallback = { app: appSteps(ctx) };
    throw error;
  }
}

async function main(argv = process.argv.slice(2), env = process.env) {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(`${USAGE}\n`); return EXIT.ok; }
  try {
    const { command, flags } = parseCommand(argv, { values: VALUE_FLAGS, booleans: { '--dry-run': 'dryRun' }, unknown: arg => `Unknown argument ${arg}.` });
    if (command !== 'open') throw new PaseoError(EXIT.input, `Unknown command "${command}". Use open.`);
    process.stdout.write(`${JSON.stringify(await open(flags, env), null, 2)}\n`);
    return EXIT.ok;
  } catch (error) {
    const code = error instanceof PaseoError ? error.code : 1;
    process.stdout.write(`${JSON.stringify({ ok: false, code, error: error.message, ...error.extra }, null, 2)}\n`);
    return code;
  }
}

if (isMain(import.meta.url)) process.exitCode = await main();
