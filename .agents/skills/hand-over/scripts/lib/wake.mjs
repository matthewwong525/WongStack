// Wakes a chat with a message, even an idle one. The only code that names the host's way to do it: today
// `paseo send`. With no way, `chatTarget` has no agent and `wakeChat` answers `unavailable`.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findPaseo } from '../../../schedule/scripts/lib/paseo.mjs';

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

/** `env` with no chat of its own: Paseo names a send's sender from `PASEO_AGENT_ID`, and the shared page server
 * keeps the id of the chat that started it, so a send must arrive as the person's own message. */
function personEnv(env) {
  const rest = { ...env };
  delete rest.PASEO_AGENT_ID;
  delete rest.PASEO_AGENT_CWD;
  return rest;
}

/** Sends `message` to the chat `target` names. `notified` only when the host confirms that same chat got it;
 * `unconfirmed` when the send failed or its answer does not say so; `unavailable` with no chat or no way to wake. */
export async function wakeChat(target, message, env = process.env) {
  if (!target?.agentId) return 'unavailable';
  const bin = wakeCommand(env);
  if (!bin) return 'unavailable';
  try {
    const context = target.paseoHost ? ['--host', target.paseoHost] : target.paseoHome ? ['--home', target.paseoHome] : [];
    const { stdout } = await promisify(execFile)(bin, ['send', target.agentId, message, '--no-wait', '--json', ...context], {
      cwd: target.cwd, env: personEnv(env), encoding: 'utf8', timeout: 5000, maxBuffer: 64 * 1024,
    });
    const output = JSON.parse(stdout);
    const ack = output.data ?? output;
    return ack.status === 'sent' && ack.agentId === target.agentId ? 'notified' : 'unconfirmed';
  } catch { return 'unconfirmed'; }
}

/** The ids of every chat this host still lists and has not closed, or null when it can not say: then none is gone. */
export async function liveChats(env = process.env) {
  const bin = wakeCommand(env);
  if (!bin) return null;
  try {
    const { stdout } = await promisify(execFile)(bin, ['ls', '--global', '--json'], { encoding: 'utf8', timeout: 10_000, maxBuffer: 16 * 1024 * 1024 });
    const list = JSON.parse(stdout);
    if (!Array.isArray(list) || !list.every(chat => typeof chat?.id === 'string')) return null;
    return new Set(list.filter(chat => chat.status !== 'closed').map(chat => chat.id));
  } catch { return null; }
}
