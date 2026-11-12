// This computer's own records for the background helper: its id, the apps it watches, and the script the launcher
// runs. All live under ~/.wong-stack and hold no secret. wiki/stack/live-line.md

import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { primaryRoot } from '../../../memory/scripts/lib/primary-root.mjs';

const ID = /^[0-9a-f]{32}$/;
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };

export const wongDir = (env = process.env) => join(env.HOME || homedir(), '.wong-stack');
/** The helper's folder and the files in it. */
export function helperFiles(env = process.env) {
  const dir = join(wongDir(env), 'helper');
  return { dir, launcher: join(dir, 'run.mjs'), current: join(dir, 'current.json'), apps: join(dir, 'folders.json'), runs: join(dir, 'runs.json'), log: join(dir, 'log.jsonl'), out: join(dir, 'out.log') };
}

/** This computer's id, made once: the app wakes only the computer a schedule is bound to. */
export function computerId(env = process.env) {
  const file = join(wongDir(env), 'computer.json');
  const kept = readJson(file)?.id;
  if (ID.test(kept ?? '')) return kept;
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const id = randomBytes(16).toString('hex');
  const flag = existsSync(file) ? 'w' : 'wx';
  // A first write never overwrites: two starts at once agree on the id the first one wrote.
  try { writeFileSync(file, `${JSON.stringify({ id })}\n`, { mode: 0o600, flag }); } catch { /* the other won */ }
  const written = readJson(file)?.id;
  return ID.test(written ?? '') ? written : id;
}

/** The folders whose apps the helper keeps a line to, each a primary checkout. */
export function readApps(env = process.env) {
  const apps = readJson(helperFiles(env).apps)?.apps;
  return Array.isArray(apps) ? apps.filter(app => typeof app?.cwd === 'string' && app.cwd) : [];
}

/** Adds the primary checkout holding `cwd` to the helper's apps; a folder outside a checkout is left out. */
export function rememberApp(cwd, env = process.env) {
  let root;
  try { root = primaryRoot(cwd).primary; } catch { return false; }
  const apps = readApps(env);
  if (apps.some(app => app.cwd === root)) return true;
  const files = helperFiles(env);
  try {
    mkdirSync(files.dir, { recursive: true, mode: 0o700 });
    writeFileSync(files.apps, `${JSON.stringify({ apps: [...apps, { cwd: root }] })}\n`, { mode: 0o600 });
    return true;
  } catch { return false; }
}

/** Where the service's unit lives: systemd (user, or system as root), launchd, or null on any other system. */
export function unitPath(env = process.env, { platform = process.platform, root = process.getuid?.() === 0 } = {}) {
  if (platform === 'darwin') return join(env.HOME || homedir(), 'Library', 'LaunchAgents', 'com.wongstack.helper.plist');
  if (platform !== 'linux') return null;
  return root ? '/etc/systemd/system/wongstack-helper.service' : join(env.HOME || homedir(), '.config', 'systemd', 'user', 'wongstack-helper.service');
}

/** True when the helper is installed as a service: its unit and the launcher's record both exist. */
export function helperService(env = process.env, system = {}) {
  const unit = unitPath(env, system);
  return Boolean(unit && existsSync(unit) && existsSync(helperFiles(env).current));
}

/** The `PROTOCOL` a reply-link.mjs file declares, or 0. */
function protocolOf(file) {
  try { return Number(/^(?:export )?const PROTOCOL = (\d+);$/m.exec(readFileSync(file, 'utf8'))?.[1] ?? 0); } catch { return 0; }
}

/** The same script in the primary checkout, with its protocol, or null: a worktree may be tidied away, never the
 *  primary. A primary that lacks the script, or holds older code, is named with what it holds. */
export function primaryScript(script) {
  try {
    const real = realpathSync(script);
    const { root, primary } = primaryRoot(dirname(real));
    const file = join(primary, relative(root, real));
    const protocol = protocolOf(file);
    return protocol ? { script: file, protocol } : null;
  } catch { return null; }
}

/** Points the launcher at `found` when no record exists, or the recorded script is gone or older. True on a change. */
export function pointCurrent(found, env = process.env) {
  if (!found) return false;
  const files = helperFiles(env);
  const kept = readJson(files.current);
  if (kept && existsSync(kept.script ?? '') && (kept.protocol ?? 0) >= found.protocol) return false;
  mkdirSync(files.dir, { recursive: true, mode: 0o700 });
  writeFileSync(files.current, `${JSON.stringify({ script: found.script, protocol: found.protocol })}\n`, { mode: 0o600 });
  return true;
}
