// WongStack's side of the build loop module: the one file its slot.mjs loads (.agents/plugins/loop/README.md).
// Each part loads its code only when called, and a script part runs as its own process, as the skills ran it before.
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

// Its own spawn: importing slot.mjs here would wait on itself when slot.mjs runs as a command.
const runCommand = (command, args = [], options = {}) => spawnSync(command, args, { stdio: 'inherit', ...options }).status ?? 1;

const lazy = (file, name) => async (...args) => (await import(file))[name](...args);
const here = import.meta.dirname;
// `node` by name, as the shell scripts call it, so a test's stand-in node answers too.
const node = file => ({ root, args = [] }) => runCommand('node', [join(here, file), ...args], { cwd: root });
const bash = file => ({ root, args = [] }) => runCommand('bash', [join(here, file), ...args], { cwd: root });
const ROUTE_SCRIPTS = { artifacts: 'routes/artifacts-run.mjs', app: 'routes/app-change.mjs' };

/** Close this chat's workspace: its private link, then the workspace itself. */
function closeWorkspace({ root, args = [] }) {
  const skills = join(root, '.claude/skills');
  runCommand('node', [join(skills, 'hand-over/scripts/hand-over.mjs'), 'close'], { cwd: root, stdio: 'ignore' });
  return runCommand('node', [join(skills, 'schedule/scripts/tidy.mjs'), 'close', ...args], { cwd: root });
}

/** A new workspace through Paseo (`open …`), or the scratch folder its brief goes in (`scratch`). */
function newWorkspace({ root, args = [] }) {
  const script = args[0] === 'scratch' ? 'schedule/scripts/tidy.mjs' : 'schedule/scripts/workspace.mjs';
  return runCommand('node', [join(root, '.claude/skills', script), ...args], { cwd: root });
}

/** Each live secrets file of this checkout and of the primary one, read as names and values. */
async function keys({ root }) {
  const [{ liveFiles }, { primaryRoot }, { parseEnv }] = await Promise.all([import('./worktree-secrets.mjs'),
    import('../skills/memory/scripts/lib/primary-root.mjs'), import('../skills/memory/scripts/lib/store.mjs')]);
  let primary = root;
  try { primary = primaryRoot(root).primary; } catch { /* a bare repo's worktree: this checkout only */ }
  return [...new Set([primary, root])].flatMap(dir => liveFiles(dir).map(rel => parseEnv(readFileSync(join(dir, rel), 'utf8'))));
}

/** After a merge: promote secret edits, then close the shipped plan's Inbox pages. Prints its two lines. */
async function afterMerge({ root, change }) {
  const { sh } = await import('../plugins/loop/skills/save/scripts/checkpoint.mjs');
  const secrets = sh(process.execPath, [join(here, 'worktree-secrets.mjs'), 'promote'], { cwd: root });
  let promoted;
  try { promoted = JSON.stringify(JSON.parse(secrets.stdout)); } catch { promoted = `error (${secrets.stderr.trim().split('\n')[0] || `exit ${secrets.status}`})`; }
  let page = 'none';
  if (change) {
    try { page = await (await import('../skills/hand-over/scripts/reply-link.mjs')).closePlanPages(root, change); }
    catch (error) { page = `skipped (${error.message.split('\n')[0] || 'it failed'})`; }
  }
  return `SECRETS=${promoted}\nPLAN_PAGE=${page}`;
}

export default {
  stepTitle: node('step-title.mjs'),
  otherWork: node('other-work.mjs'),
  reviewLink: lazy('../skills/hand-over/scripts/reply-link.mjs', 'openReplyLink'),
  newWorkspace,
  closeWorkspace,
  schedule: true,
  // `github`, `artifacts` or `app`; with `origin`, only what that address names.
  route: async ({ root, origin }) => {
    const { addressRoute, wongDelivery } = await import('./routes/route.mjs');
    return origin === undefined ? wongDelivery(root).route : addressRoute(origin);
  },
  // `routeRun <route> <command…>`: the company-git and Artifacts route scripts.
  routeRun: ({ root, args: [route, ...rest] = [] }) => {
    if (route === 'artifacts' && rest[0] === 'heads') return runCommand('git', ['ls-remote', '--heads', 'origin', ...rest.slice(1)], { cwd: root });
    if (route === 'artifacts' && rest[0] === 'publish') return bash('routes/publish-artifacts.sh')({ root, args: rest.slice(1) });
    if (!ROUTE_SCRIPTS[route]) { console.error(`routeRun: no route ${route}`); return 2; }
    return node(ROUTE_SCRIPTS[route])({ root, args: rest });
  },
  // Null in a checkout with no checks.mjs, such as an old one; ship adds the branch it merged in.
  precheck: ({ root, base }) => existsSync(join(root, '.github/scripts/checks.mjs'))
    ? `node .github/scripts/checks.mjs --worktree${base ? ` --default-branch ${base}` : ''}` : null,
  // Prints `untouched=true` when the app is as on main, then marks each loosened check; CI runs both too.
  guards: ({ root }) => {
    const env = { ...process.env, DEFAULT_BRANCH: 'main' };
    runCommand('bash', [join(root, '.github/scripts/app-untouched.sh'), '--worktree'], { cwd: root, env });
    return runCommand('node', [join(root, '.github/scripts/loosened-checks.mjs'), '--worktree'], { cwd: root, env });
  },
  preview: 'bash scripts/cf-preview.sh',
  // `verify journeys …` runs the kept checks; any other `verify …` the staging walk.
  verify: ({ root, args = [] }) => args[0] === 'journeys'
    ? node('staging/verify-journeys.mjs')({ root, args: args.slice(1) }) : bash('staging/verify-staging.sh')({ root, args }),
  liveLook: bash('staging/live-look.sh'),
  keys,
  afterMerge,
};
