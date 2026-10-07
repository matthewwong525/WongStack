// Wakes a chat with a message, even an idle one. This is the only code that names the host's way to
// do it: today `paseo send`. A host with another way adds it here; with none, `chatTarget` has no
// agent and `wakeChat` answers `unavailable`, so the caller keeps its neutral route.
//
// Node built-ins only. For tests: HANDOVER_PASEO_BIN names the `paseo` binary.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findPaseo } from '../../../routine/scripts/lib/paseo.mjs';

/** The chat this process runs in, as `wakeChat` needs it: `agentId` is null when the host names none. */
export function chatTarget(env = process.env, cwd = process.cwd()) {
  return { agentId: env.PASEO_AGENT_ID?.trim() || null, cwd, paseoHome: env.PASEO_HOME || null, paseoHost: env.PASEO_HOST || null };
}

/** The command that wakes a chat, or null when this host has none. */
function wakeCommand(env) {
  try { return findPaseo(env, 'HANDOVER_PASEO_BIN'); } catch { return null; }
}

/** True when `target` names a chat and this host can send it a message. */
export function canWake(target, env = process.env) {
  return Boolean(target?.agentId && wakeCommand(env));
}

/**
 * Sends `message` to the chat `target` names. `notified` only when the host confirms that same chat
 * got it; `unconfirmed` when the send failed or its answer does not say so; `unavailable` when there
 * is no chat or no way to wake one.
 */
export async function wakeChat(target, message, env = process.env) {
  if (!target?.agentId) return 'unavailable';
  const bin = wakeCommand(env);
  if (!bin) return 'unavailable';
  try {
    const context = target.paseoHost ? ['--host', target.paseoHost] : target.paseoHome ? ['--home', target.paseoHome] : [];
    const { stdout } = await promisify(execFile)(bin, ['send', target.agentId, message, '--no-wait', '--json', ...context], {
      cwd: target.cwd, encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    });
    const output = JSON.parse(stdout);
    const ack = output.data ?? output;
    return ack.status === 'sent' && ack.agentId === target.agentId ? 'notified' : 'unconfirmed';
  } catch { return 'unconfirmed'; }
}
