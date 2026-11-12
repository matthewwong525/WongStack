#!/usr/bin/env node
// Daily's SessionStart hook: the chat's card, then on a new chat the worker check, detached, and the one setup ask
// when the repo has no `.agents/daily/` folder. It never fails the chat. wiki/development/daily.md
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isMain, parseCli } from './lib/cli.mjs';
import { repoContext } from './lib/env.mjs';
import { loadProfile } from './lib/slot.mjs';
import { RUN_FLAGS, hookInput, markHook } from './daily.mjs';

const DAILY = fileURLToPath(new URL('./daily.mjs', import.meta.url));
const USAGE = 'usage: session-start.mjs --agent claude|codex   the SessionStart hook; reads the hook\'s JSON on stdin';
export const ASK = 'Daily isn\'t set up yet. Ask the person whether to set it up now; follow `references/setup.md` only on a yes.';

/** `D ensure`, detached and silent: a background run, or WONG_DAILY_WORKER=0, starts none. True when it started. */
export function ensureDaily(root, agent, { env = process.env, start = spawn } = {}) {
  if (env.WONG_DAILY_WORKER === '0' || RUN_FLAGS.some(name => env[name])) return false;
  try {
    const child = start(process.execPath, [DAILY, 'ensure', '--agent', agent], { cwd: root, detached: true, stdio: 'ignore', env });
    child.on?.('error', () => {});
    child.unref?.();
    return true;
  } catch { return false; }
}

/** The lines the hook prints: the setup ask on a new chat in a repo with no Daily settings folder, else none. */
export function sessionStart({ input = {}, agent = 'claude', env = process.env, start = spawn, mark = markHook }) {
  try { mark({ tool: agent, input, env }); } catch { /* a hook never fails the chat */ }
  if (input.source !== 'startup' && input.source !== undefined) return [];
  const { root } = repoContext(input.cwd || process.cwd());
  if (!existsSync(join(root, '.agents', 'daily'))) return RUN_FLAGS.some(name => env[name]) ? [] : [ASK];
  ensureDaily(root, agent, { env, start });
  return [];
}

if (isMain(import.meta.url)) {
  const { values } = parseCli({ usage: USAGE, options: { agent: { type: 'string' } } });
  await loadProfile().catch(() => {});
  for (const line of sessionStart({ input: hookInput(), agent: values.agent === 'codex' ? 'codex' : 'claude' })) console.log(line);
}
