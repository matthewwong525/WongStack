#!/usr/bin/env node
// SessionStart hook. Runs no model and never blocks the session: register the session, print the
// digest, and start one detached background run when there is work. Any failure prints one line.
// It also prints the last tidy-up's line and starts the next one detached (routine/scripts/tidy.mjs).
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { loadDigest, readCache } from './lib/digest.mjs';
import { isMain, loadConfig, openStore, repoContext, spoolList } from './lib/store.mjs';
import { pending, registerSession } from './lib/transcripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_MS = 1500;
const TIDY = join(HERE, '../../routine/scripts/tidy.mjs');

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

const USAGE = 'usage: session-start.mjs [--agent claude|codex]   the SessionStart hook; reads the hook\'s JSON on stdin';

async function main(agent) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  const ctx = repoContext(input.cwd || process.cwd());
  const sessionId = `${agent}:${input.session_id || 'unknown'}`;
  const background = process.env.WONG_MEMORY_RUN === '1';
  registerSession(ctx, { id: sessionId, agent, transcript: input.transcript_path || null, cwd: input.cwd || ctx.root, startedAt: new Date().toISOString(), ...(background ? { background } : {}) });
  if (background) return '';

  // The digest fetch runs while local discovery reads the disk.
  const digest = (async () => loadDigest(ctx, openStore(ctx, { timeoutMs: BUDGET_MS }), BUDGET_MS))().catch(error => ({ error }));
  const tidy = tidyUp(ctx);
  const localWork = spoolList(ctx).length > 0 || pending(ctx, { exclude: [sessionId] }).length > 0;
  const result = await digest;

  const out = [];
  const tidied = await tidy;
  if (tidied) out.push(tidied);
  const redirected = branchWorkerLine(ctx);
  if (redirected) out.push(redirected);
  if (result.error) {
    const cache = result.error.kind === 'network' ? readCache(ctx) : null;
    if (cache) out.push(`${cache.text}\n(This digest is cached and ${cache.age} old: the memory store did not answer.)`);
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
