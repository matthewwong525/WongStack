#!/usr/bin/env node
// SessionStart hook. Runs no model and never blocks the session: registers it, prints the profile's lines and the
// digest, and starts one detached background run. Any failure prints one line.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCli } from './lib/cli.mjs';
import { startDaily } from './lib/daily.mjs';
import { loadDigest, olderNote, profileTopicLines, readCache } from './lib/digest.mjs';
import { detached, isMain, loadProfile, openStore, pluginPath, repoContext, SETUP_GUIDE, spoolList, statePath, writeJson } from './lib/store.mjs';
import { pending, registerSession } from './lib/transcripts.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const BUDGET_MS = 1500;

const fallbackInstruction = sessionId => `Memory: past sessions wait for capture, and a background run could not start on its own. Start one background subagent with the smallest capable model. Tell it to follow the "Background run" section of ${pluginPath('SKILL.md')} and to exclude session ${sessionId}. Do not wait for it.`;

const startRun = (ctx, agent, sessionId, more = []) => process.env.WONG_MEMORY_NO_HEADLESS !== '1' && detached(join(HERE, 'run.mjs'), ['--agent', agent, ...more],
  { cwd: ctx.root, env: { ...process.env, WONG_MEMORY_RUN_STARTED: new Date().toISOString(), WONG_MEMORY_EXCLUDE: sessionId } });

// Asked once per chat, so a resume stays quiet; setup starts only on the person's yes.
function askSetup(ctx, sessionId) {
  const file = join(ctx.stateDir, 'asked-setup', `${sessionId.replace(/[^\w.-]/g, '_')}.json`);
  if (existsSync(file)) return '';
  writeJson(statePath(ctx, 'asked-setup', basename(file)), { at: new Date().toISOString() });
  return `Memory is not set up in this repo. Ask the person "Memory isn't set up yet. Set it up now?" Only on a yes, follow ${SETUP_GUIDE}.\n`;
}

const USAGE = 'usage: session-start.mjs [--agent claude|codex]   the SessionStart hook; reads the hook\'s JSON on stdin';

async function main(agent) {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  const ctx = repoContext(input.cwd || process.cwd());
  const sessionId = `${agent}:${input.session_id || 'unknown'}`;
  const profile = await loadProfile(ctx);
  if (!profile) return askSetup(ctx, sessionId);
  const background = process.env.WONG_MEMORY_RUN === '1';
  registerSession(ctx, { id: sessionId, agent, transcript: input.transcript_path || null, cwd: input.cwd || ctx.root, startedAt: new Date().toISOString(), endedAt: null, ...(background ? { background } : {}) });
  if (background) return '';

  // The digest fetch runs while the profile's own start and local discovery read the disk.
  const digest = openStore(ctx, { timeoutMs: BUDGET_MS }).then(store => loadDigest(ctx, store)).catch(error => ({ error }));
  // A profile's own start may return lines, nothing, or a promise; a failure skips only its lines.
  const own = Promise.resolve().then(() => profile.sessionStart?.(ctx, { agent })).then(lines => (Array.isArray(lines) ? lines : []), () => []);
  const localWork = spoolList(ctx).length > 0 || pending(ctx, { exclude: [sessionId] }).length > 0;
  const result = await digest;
  const out = await own;
  if (result.error) {
    const signedOut = result.error.kind === 'signin';
    const cache = signedOut || result.error.kind === 'network' ? readCache(ctx) : null;
    if (cache) out.push(`${cache.text}\n(This digest is cached and ${cache.age} old: ${signedOut ? 'memory is not up to date until you sign in' : 'the memory store did not answer'}.)`);
    else out.push(...(await profileTopicLines(ctx, profile)));
    out.push(`Memory: skipped the store (${result.error.reason || result.error.message}).`);
  } else if (result.text) out.push(result.text);
  const older = result.older ? olderNote(ctx) : null;
  if (older) out.push(older);
  // The day's tidy captures too, so a chat that starts it starts no capture run.
  const daily = startDaily(ctx, result, { start: () => startRun(ctx, agent, sessionId, ['--daily']) });
  if (!daily && !result.error && localWork && !startRun(ctx, agent, sessionId)) out.push(fallbackInstruction(sessionId));
  return out.length ? `${out.join('\n\n')}\n` : '';
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { agent: { type: 'string', default: 'claude' } } });
  // Exit once the output is flushed: an aborted fetch's socket would otherwise hold the hook past its timeout.
  main(values.agent).catch(error => `Memory: skipped (${error.message}).\n`).then(out => process.stdout.write(out, () => process.exit(0)));
}
