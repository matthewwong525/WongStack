// This computer's records for the background helpers, each project's in ~/.wong-stack/helpers/<id>/ and the shared
// one's in ~/.wong-stack/helper/: its id, apps, and launcher script. None holds a secret. wiki/stack/live-line.md

import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, relative, sep } from 'node:path';
import { primaryRoot } from '../../../memory/scripts/lib/primary-root.mjs';

const ID = /^[0-9a-f]{32}$/;
const readJson = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
const realOf = path => { try { return realpathSync(path); } catch { return path; } };
/** True when `path` is `root` or inside it. */
const within = (path, root) => path === root || path.startsWith(root.endsWith(sep) ? root : `${root}${sep}`);

/** Writes `value` whole to a new file, then moves it in place, so a reader never sees half of it. */
function writeAtomic(file, value) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const draft = `${file}.${process.pid}.tmp`;
  writeFileSync(draft, `${JSON.stringify(value)}\n`, { mode: 0o600 });
  renameSync(draft, file);
}

export const wongDir = (env = process.env) => join(env.HOME || homedir(), '.wong-stack');

/** A project's helper id: its main checkout's folder name, then 8 hex of the sha256 of its real path, as
 *  `myapp-1a2b3c4d`. Two checkouts with one name get two ids. */
export function projectId(root) {
  const real = realOf(root);
  const name = basename(real).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'project';
  return `${name}-${createHash('sha256').update(real).digest('hex').slice(0, 8)}`;
}

/** A helper's folder and the files in it: with `root`, that project's own helper in ~/.wong-stack/helpers/<id>/;
 *  with none, the old shared helper in ~/.wong-stack/helper/, whose inbox record and items sit in reply-link/. */
export function helperFiles(env = process.env, root = null) {
  const shared = join(wongDir(env), 'helper');
  const dir = root ? join(wongDir(env), 'helpers', projectId(root)) : shared;
  const files = { dir, launcher: join(dir, 'run.mjs'), current: join(dir, 'current.json'), runs: join(dir, 'runs.json'), log: join(dir, 'log.jsonl'),
    out: join(dir, 'out.log'), apps: join(shared, 'folders.json') };
  if (root) return { ...files, id: projectId(root), root, inbox: join(dir, 'inbox.json'), items: join(dir, 'items') };
  const replyLink = join(wongDir(env), 'reply-link');
  return { ...files, inbox: join(replyLink, 'inbox.json'), items: join(replyLink, 'items') };
}

const primaries = new Map();
/** The main checkout holding `cwd`, or null outside a checkout; kept per folder, as a folder's main never changes. */
export function primaryOf(cwd) {
  if (!primaries.has(cwd)) {
    let found = null;
    try { found = primaryRoot(cwd).primary; } catch { /* not a checkout, or gone */ }
    primaries.set(cwd, found);
  }
  return primaries.get(cwd);
}

/** True when project `root` has its own helper installed. */
export const hasOwnHelper = (root, env = process.env) => Boolean(root) && existsSync(helperFiles(env, root).current);

/** The main checkout holding `cwd` when its project has its own helper, else null: then the shared helper serves it. */
export function ownHelper(cwd, env = process.env) {
  const root = primaryOf(cwd);
  return hasOwnHelper(root, env) ? root : null;
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

/** The folders whose apps the shared helper keeps a line to, each a primary checkout. */
export function readApps(env = process.env) {
  const apps = readJson(helperFiles(env).apps)?.apps;
  return Array.isArray(apps) ? apps.filter(app => typeof app?.cwd === 'string' && app.cwd) : [];
}

/** Adds the primary checkout holding `cwd` to the shared helper's apps; a folder outside a checkout is left out, and a
 *  project with its own helper is never added: that helper serves it. */
export function rememberApp(cwd, env = process.env) {
  let root;
  try { root = primaryRoot(cwd).primary; } catch { return false; }
  if (hasOwnHelper(root, env)) return true;
  const apps = readApps(env);
  if (apps.some(app => app.cwd === root)) return true;
  const files = helperFiles(env);
  try {
    mkdirSync(files.dir, { recursive: true, mode: 0o700 });
    writeFileSync(files.apps, `${JSON.stringify({ apps: [...apps, { cwd: root }] })}\n`, { mode: 0o600 });
    return true;
  } catch { return false; }
}

/** The service's name: `wongstack-helper@<id>.service` for a project's own helper, `wongstack-helper.service` for the
 *  shared one. */
export const unitName = (project = null) => (project ? `wongstack-helper@${projectId(project)}.service` : 'wongstack-helper.service');
/** The LaunchAgent's label on macOS. */
export const launchLabel = (project = null) => (project ? `com.wongstack.helper.${projectId(project)}` : 'com.wongstack.helper');

/** Where the service's unit lives: systemd (user, or system as root), launchd, or null on any other system. A project's
 *  own helper on Linux is an instance of the one template unit, `wongstack-helper@.service`. */
export function unitPath(env = process.env, { platform = process.platform, root = process.getuid?.() === 0, project = null } = {}) {
  if (platform === 'darwin') return join(env.HOME || homedir(), 'Library', 'LaunchAgents', `${launchLabel(project)}.plist`);
  if (platform !== 'linux') return null;
  const name = project ? 'wongstack-helper@.service' : 'wongstack-helper.service';
  return root ? join('/etc/systemd/system', name) : join(env.HOME || homedir(), '.config', 'systemd', 'user', name);
}

/** True when a helper serving `cwd`'s project is installed as a service: its own, or else the shared one. */
export function helperService(env = process.env, system = {}, cwd = null) {
  const project = cwd ? ownHelper(cwd, env) : null;
  const unit = unitPath(env, { ...system, project });
  return Boolean(unit && existsSync(unit) && existsSync(helperFiles(env, project).current));
}

/** The `PROTOCOL` a reply-link.mjs file declares, or 0. */
function protocolOf(file) {
  try { return Number(/^(?:export )?const PROTOCOL = (\d+);$/m.exec(readFileSync(file, 'utf8'))?.[1] ?? 0); } catch { return 0; }
}

/** The same script in the primary checkout, with its protocol and that checkout (`root`), or null: a worktree may be
 *  tidied away, never the primary. A primary that lacks the script, or holds older code, is named with what it has. */
export function primaryScript(script) {
  try {
    const real = realpathSync(script);
    const { root, primary } = primaryRoot(dirname(real));
    const file = join(primary, relative(root, real));
    const protocol = protocolOf(file);
    return protocol ? { script: file, protocol, root: primary } : null;
  } catch { return null; }
}

/** Points `project`'s own launcher at `found`, its main checkout's script; true on a change. The shared one never
 *  moves: pointed at one project's copy, it judged every other project's runs by that copy's sign-in. */
export function pointCurrent(found, env = process.env, project = null) {
  if (!found || !project) return false;
  const files = helperFiles(env, project);
  const kept = readJson(files.current);
  const wanted = { script: found.script, protocol: found.protocol, project };
  if (kept?.script === wanted.script && kept.protocol === wanted.protocol && kept.project === project) return false;
  mkdirSync(files.dir, { recursive: true, mode: 0o700 });
  writeFileSync(files.current, `${JSON.stringify(wanted)}\n`, { mode: 0o600 });
  return true;
}

/** True when `cwd`, an item's folder, belongs to project `root`: its main checkout is `root`, or, once the folder is
 *  gone, it sits inside `root`. */
function belongsTo(cwd, root) {
  const primary = primaryOf(cwd);
  return primary ? realOf(primary) === root : within(realOf(cwd), root);
}

/** Moves project `root` off the shared helper (live-line.md#the-old-shared-helper): its `folders.json` entry, with
 *  `ledger` the started runs and its gaps, and its open items. Safe to repeat; answers what it did; never throws. */
export function leaveShared(root, env = process.env, { ledger = true } = {}) {
  const shared = helperFiles(env), own = helperFiles(env, root), real = realOf(root);
  const done = { left: false, runs: 0, items: 0 };
  try {
    const kept = readJson(shared.apps);
    if (Array.isArray(kept?.apps) && kept.apps.some(app => app?.cwd && realOf(app.cwd) === real)) {
      writeAtomic(shared.apps, { ...kept, apps: kept.apps.filter(app => !(app?.cwd && realOf(app.cwd) === real)) });
      done.left = true;
    }
  } catch { /* the next start tries again */ }
  const from = ledger ? readJson(shared.runs) : null;
  // An own ledger that can not be read stays as it is: its helper then starts nothing, as it would without this.
  const mine = from && (existsSync(own.runs) ? readJson(own.runs) : {});
  if (mine) {
    const ids = { ...mine.ids }, keys = { ...mine.keys };
    for (const [id, at] of Object.entries(from.ids ?? {})) if (Number.isFinite(at) && !(ids[id] >= at)) { ids[id] = at; done.runs += 1; }
    for (const [slot, at] of Object.entries(from.keys ?? {})) {
      // A slot is `<run folder>:<key>`: only this project's gaps come along.
      const folder = slot.slice(0, slot.lastIndexOf(':'));
      if (Number.isFinite(at) && within(folder, real) && !(keys[slot] >= at)) { keys[slot] = at; done.runs += 1; }
    }
    try { if (done.runs) writeAtomic(own.runs, { ids, keys }); } catch { done.runs = 0; }
  }
  let names = [];
  try {
    names = readdirSync(shared.items).filter(name => ID.test(name.replace(/\.json$/, '')));
  } catch { /* no shared items */ }
  for (const name of names) {
    const item = readJson(join(shared.items, name));
    const cwd = item?.app?.cwd ?? item?.target?.cwd;
    if (typeof cwd !== 'string' || !belongsTo(cwd, real)) continue;
    try {
      mkdirSync(own.items, { recursive: true, mode: 0o700 });
      renameSync(join(shared.items, name), join(own.items, name));
      done.items += 1;
    } catch { /* taken meanwhile */ }
  }
  return done;
}

/** The reverse of `leaveShared`, once project `root`'s own helper is gone: its open items go back to the shared
 *  folder, and its started runs and gaps into the shared ledger, so no item is stranded and no run starts too soon. */
export function rejoinShared(root, env = process.env) {
  const shared = helperFiles(env), own = helperFiles(env, root);
  const done = { runs: 0, items: 0 };
  const from = readJson(own.runs);
  // A shared ledger that can not be read stays as it is: the shared helper then starts nothing.
  const into = from && (existsSync(shared.runs) ? readJson(shared.runs) : {});
  if (into) {
    const merged = { ids: { ...into.ids }, keys: { ...into.keys } };
    for (const part of ['ids', 'keys']) {
      for (const [name, at] of Object.entries(from[part] ?? {})) {
        if (Number.isFinite(at) && !(merged[part][name] >= at)) { merged[part][name] = at; done.runs += 1; }
      }
    }
    try { if (done.runs) writeAtomic(shared.runs, { ...into, ...merged }); } catch { done.runs = 0; }
  }
  let names = [];
  try {
    names = readdirSync(own.items).filter(name => ID.test(name.replace(/\.json$/, '')));
  } catch { /* no own items */ }
  for (const name of names) {
    try {
      mkdirSync(shared.items, { recursive: true, mode: 0o700 });
      renameSync(join(own.items, name), join(shared.items, name));
      done.items += 1;
    } catch { /* taken meanwhile */ }
  }
  return done;
}

/** A mark of the shared list and items folder, which changes when either does; a missing one marks as empty. */
function sharedMark(env) {
  const { apps, items } = helperFiles(env);
  return [apps, items].map(path => { try { const at = statSync(path); return `${at.ino}:${at.mtimeMs}:${at.size}`; } catch { return ''; } }).join('|');
}

/** Repeats the leave step every `everyMs` between rounds, but only after the shared list or items changed: an older
 *  session can list project `root` with the shared helper again just before the hour. Answers its stop. */
export function guardShared(root, env = process.env, { everyMs = 1000, timers = globalThis } = {}) {
  let seen = null;
  const timer = timers.setInterval(() => {
    // The mark is read first: a change made while the step runs shows at the next tick.
    const mark = sharedMark(env);
    if (mark === seen) return;
    leaveShared(root, env, { ledger: false });
    seen = mark;
  }, everyMs);
  timer?.unref?.();
  return () => timers.clearInterval(timer);
}
