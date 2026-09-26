#!/usr/bin/env node
// SessionStart hook. Runs no model and never blocks the session: register the session, print the
// digest, and start one detached background run when there is work. Any failure prints one line.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { buildHomePart, HOME_FACTS, loadDigest, personPage, readCache } from './lib/digest.mjs';
import { homeContext, isMain, openStore, repoContext, spoolList } from './lib/store.mjs';
import { pending, registerSession } from './lib/transcripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_MS = 1500;

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

// The person's page and personal facts from home, fetched beside the repo's own digest. Never throws.
async function loadHome(ctx) {
  try {
    const home = homeContext(ctx);
    if (!home) return '';
    const page = personPage(home);
    // In home itself, home's facts are already in the digest.
    if (home.isCurrent) return buildHomePart({ home, page });
    try {
      const facts = await openStore(home, { timeoutMs: BUDGET_MS }).query(...HOME_FACTS);
      return buildHomePart({ home, page, facts });
    } catch (error) {
      return buildHomePart({ home, page, error });
    }
  } catch { return ''; }
}

async function main() {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  const agent = parseArgs({ options: { agent: { type: 'string', default: 'claude' } }, strict: false }).values.agent;
  const ctx = repoContext(input.cwd || process.cwd());
  const sessionId = `${agent}:${input.session_id || 'unknown'}`;
  const background = process.env.WONG_MEMORY_RUN === '1';
  registerSession(ctx, { id: sessionId, agent, transcript: input.transcript_path || null, cwd: input.cwd || ctx.root, startedAt: new Date().toISOString(), ...(background ? { background } : {}) });
  if (background) return '';

  // The digest fetch runs while local discovery reads the disk.
  const digest = (async () => loadDigest(ctx, openStore(ctx, { timeoutMs: BUDGET_MS }), BUDGET_MS))().catch(error => ({ error }));
  const home = loadHome(ctx);
  const localWork = spoolList(ctx).length > 0 || pending(ctx, { exclude: [sessionId] }).length > 0;
  const result = await digest;
  const homePart = await home;

  const out = [];
  if (result.error) {
    const cache = readCache(ctx);
    if (cache) out.push(`${cache.text}\n(This digest is cached and ${cache.age} old: the memory store did not answer.)`);
    out.push(`Memory: skipped the store (${result.error.reason || result.error.message}).`);
  } else if (result.text) out.push(result.text);
  if (homePart) out.push(homePart);
  if (!result.error && (result.due || localWork) && !startRun(ctx, agent, sessionId)) out.push(fallbackInstruction(sessionId));
  return out.length ? `${out.join('\n\n')}\n` : '';
}

if (isMain(import.meta.url)) {
  // Exit once the output is flushed: an aborted fetch's socket would otherwise hold the hook past its timeout.
  main().catch(error => `Memory: skipped (${error.message}).\n`).then(out => process.stdout.write(out, () => process.exit(0)));
}
