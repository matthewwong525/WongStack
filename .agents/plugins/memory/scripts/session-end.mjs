#!/usr/bin/env node
// SessionEnd hook: mark the chat ended, start the detached background run so its facts are written before a later
// chat needs them, then keep its redacted transcript. It never blocks: any failure prints nothing, and it exits 0.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { keepTranscript } from './memory.mjs';
import { parseCli } from './lib/cli.mjs';
import { detached, isMain, loadProfile, repoContext } from './lib/store.mjs';
import { registerSession } from './lib/transcripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

export async function sessionEnd(input, agent) {
  const ctx = repoContext(input.cwd || process.cwd());
  if (!input.session_id || process.env.WONG_MEMORY_RUN === '1' || !(await loadProfile(ctx))) return;
  const id = `${agent}:${input.session_id}`;
  registerSession(ctx, { id, endedAt: new Date().toISOString() });
  if (process.env.WONG_MEMORY_NO_HEADLESS !== '1') detached(join(HERE, 'run.mjs'), ['--agent', agent], { cwd: ctx.root, env: { ...process.env, WONG_MEMORY_RUN_STARTED: new Date().toISOString() } });
  await keepTranscript(ctx, { positionals: [id] });
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: 'usage: session-end.mjs [--agent claude|codex]   the SessionEnd hook; reads the hook\'s JSON on stdin',
    options: { agent: { type: 'string', default: 'claude' } } });
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  // Its own lines go nowhere a person reads, so they are dropped.
  console.log = () => {};
  sessionEnd(input, values.agent === 'codex' ? 'codex' : 'claude').catch(() => {}).finally(() => process.exit(0));
}
