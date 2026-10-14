#!/usr/bin/env node
// SessionStart hook. Runs no model and never blocks the session: registers it, prints the digest and the last
// tidy-up's line, and starts one detached background run and the next tidy-up. Any failure prints one line.
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadDigest, readCache } from './lib/digest.mjs';
import { isMain, loadConfig, memoryOrigin, openStore, repoContext, signIn, signInHelp, spoolList } from './lib/store.mjs';
import { pending, registerSession } from './lib/transcripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_MS = 1500;
const TIDY = join(HERE, '../../schedule/scripts/tidy.mjs');
// Moves a clean teammate's copy forward in the background: wiki/stack/employee-project.md#update-the-copy
const UPDATE = join(HERE, '../../save/scripts/update-copy.mjs');

const fallbackInstruction = sessionId => `Memory: past sessions wait for capture, and a background run could not start on its own. Start one background subagent with the smallest capable model. Tell it to follow the "Background run" section of .claude/skills/memory/SKILL.md and to exclude session ${sessionId}. Do not wait for it.`;

function startRun(ctx, agent, sessionId) {
  if (process.env.WONG_MEMORY_NO_HEADLESS === '1') return false;
  try {
    const child = spawn(process.execPath, [join(HERE, 'run.mjs'), '--agent', agent], {
      cwd: ctx.root, detached: true, stdio: 'ignore',
      env: { ...process.env, WONG_MEMORY_RUN_STARTED: new Date().toISOString(), WONG_MEMORY_EXCLUDE: sessionId },
    });
    child.on('error', () => {});
    child.unref();
    return true;
  } catch { return false; }
}

// The last tidy-up's one line, read and cleared in-process, then the next tidy-up, detached; WONG_TIDY=0
// skips starting it. The tidy-up runs at most every 6 hours on its own. Never throws.
async function tidyUp(ctx) {
  if (!existsSync(TIDY)) return '';
  let line = '';
  try { line = (await import(pathToFileURL(TIDY).href)).takeReport(ctx.commonDir); } catch { /* no line */ }
  if (process.env.WONG_TIDY === '0') return line;
  try {
    const child = spawn(process.execPath, [TIDY, 'sweep'], { cwd: ctx.root, detached: true, stdio: 'ignore' });
    child.on('error', () => {});
    child.unref();
  } catch { /* the next session tries again */ }
  return line;
}

// One line when this branch records another memory address than the main checkout: memory ignores it.
function branchWorkerLine(ctx) {
  try {
    const { branchWorker } = loadConfig(ctx);
    return branchWorker ? `Memory: this branch names another memory address (${branchWorker}); memory uses the main checkout's.` : '';
  } catch { return ''; }
}

// The first line when the company sign-in ends soon: a 30-day sign-in can not renew on its own.
function signInLine(ctx) {
  try {
    const origin = memoryOrigin(loadConfig(ctx));
    const person = origin && signIn(origin);
    return person?.state === 'near' ? `Memory: your company sign-in ends in ${person.days} day${person.days === 1 ? '' : 's'}; ${signInHelp(origin)}.` : '';
  } catch { return ''; }
}

const USAGE = 'usage: session-start.mjs [--agent claude|codex]   the SessionStart hook; reads the hook\'s JSON on stdin';

async function main(agent) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  const ctx = repoContext(input.cwd || process.cwd());
  const sessionId = `${agent}:${input.session_id || 'unknown'}`;
  const background = process.env.WONG_MEMORY_RUN === '1';
  registerSession(ctx, { id: sessionId, agent, transcript: input.transcript_path || null, cwd: input.cwd || ctx.root, startedAt: new Date().toISOString(), ...(background ? { background } : {}) });
  if (background) return '';
  await import(pathToFileURL(UPDATE).href).then(module => module.updateCopy(ctx.root), () => {});

  // The digest fetch runs while local discovery reads the disk.
  const digest = (async () => loadDigest(ctx, openStore(ctx, { timeoutMs: BUDGET_MS }), BUDGET_MS))().catch(error => ({ error }));
  const tidy = tidyUp(ctx);
  const localWork = spoolList(ctx).length > 0 || pending(ctx, { exclude: [sessionId] }).length > 0;
  const result = await digest;

  const out = [signInLine(ctx)].filter(Boolean);
  const tidied = await tidy;
  if (tidied) out.push(tidied);
  const redirected = branchWorkerLine(ctx);
  if (redirected) out.push(redirected);
  if (result.error) {
    const signedOut = result.error.kind === 'signin';
    const cache = signedOut || result.error.kind === 'network' ? readCache(ctx) : null;
    if (cache) out.push(`${cache.text}\n(This digest is cached and ${cache.age} old: ${signedOut ? 'memory is not up to date until you sign in' : 'the memory store did not answer'}.)`);
    out.push(`Memory: skipped the store (${result.error.reason || result.error.message}).`);
  } else if (result.text) out.push(result.text);
  if (!result.error && (result.due || localWork) && !startRun(ctx, agent, sessionId)) out.push(fallbackInstruction(sessionId));
  return out.length ? `${out.join('\n\n')}\n` : '';
}

if (isMain(import.meta.url)) {
  let args;
  try {
    args = parseArgs({ options: { agent: { type: 'string', default: 'claude' }, help: { type: 'boolean' } }, strict: true });
  } catch (error) { console.error(`${error.message}\n${USAGE}`); process.exit(2); }
  if (args.values.help) { console.log(USAGE); process.exit(0); }
  // Exit once the output is flushed: an aborted fetch's socket would otherwise hold the hook past its timeout.
  main(args.values.agent).catch(error => `Memory: skipped (${error.message}).\n`).then(out => process.stdout.write(out, () => process.exit(0)));
}
