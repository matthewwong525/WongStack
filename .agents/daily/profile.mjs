// WongStack's side of the Daily module: the one file Daily loads from here. wiki/development/daily.md#the-profile
// `person` and `chatName` answer at once, for the hooks; the rest load their module only when called.
import { execFileSync } from 'node:child_process';
import { loadConfig, memoryOrigin, signIn, signInHelp } from '../memory/d1/connect.mjs';
import { repoContext } from '../skills/memory/scripts/lib/store.mjs';
import { folderOf, readState } from '../loop/step-title.mjs';
import { wongDelivery } from '../loop/routes/route.mjs';

const lazy = (file, name) => async (...args) => (await import(file))[name](...args);
const app = name => lazy('../inbox/schedules.mjs', name);

/** The remote's address in a copy installed through the company app, else null. */
function appRemote(cwd) {
  try {
    if (wongDelivery(cwd).route !== 'app') return null;
    return new URL(execFileSync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()).origin;
  } catch { return null; }
}

/** The signed-in person of the company app, with the sign-in step a failed fetch names; none with no app. */
function person(cwd = process.cwd()) {
  let origin = null;
  try { origin = memoryOrigin(loadConfig(repoContext(cwd))); } catch { /* no memory app */ }
  const remote = appRemote(cwd);
  origin ||= remote;
  if (!origin) return undefined;
  const found = signIn(origin), ok = found.state === 'valid' || found.state === 'near';
  const help = remote && `Sign in to the company app again, then retry: cloudflared access login ${remote}`;
  return { email: found.email ?? null, state: found.state, origin, days: found.days ?? null, login: ok ? null : signInHelp(origin), help };
}

/** The chat's step title, `{step, task}`, as the step-title hook saved it. */
function chatName(cwd, agent) {
  const folder = folderOf(cwd);
  return (folder && readState(folder, agent)) || undefined;
}

/** `/continue`'s review of a saved branch: `{commit}` pinned to open at, or `{refused, extra}` for work never seen here. */
async function checkout(branch, cwd, { reviewed = null, dryRun = false } = {}) {
  const { PickupError, pinBranch, reviewBranch } = await import('../skills/continue/scripts/pickup.mjs');
  try {
    const review = reviewBranch({ cwd, branch, reviewed, fetch: !dryRun });
    if (review.commits.length) {
      const { tip, commits, files } = review;
      return { refused: `"${branch}" holds work this computer has never had. Show it and ask; on a yes, pass --reviewed ${tip}.`,
        extra: { review: { branch: review.branch, tip, commits, files } } };
    }
    return { commit: dryRun ? review.tip : pinBranch({ cwd, ...review }) };
  } catch (error) {
    if (error instanceof PickupError) return { refused: error.message, extra: error.extra };
    throw error;
  }
}

export default {
  // Schedules live in the company app, approved per computer; the helper hands due runs to Daily.
  schedules: { name: 'app', list: app('list'), get: app('get'), show: app('show'), save: app('save'), approve: app('approve'),
    control: app('control'), defaults: app('defaults'), report: app('report'), check: app('check'), extra: app('extra') },
  person,
  chatName,
  // A turn that ends in typed choices is the ask check's: Claude Code sends it back to use the question tool.
  offeredChoices: async (input, agent) => agent === 'claude' && Boolean((await import('../loop/ask-check.mjs')).stopDecision(input)),
  // A background run's own copy of the repo links this computer's company knowledge, so the run saves pages there.
  prepareRun: async dir => { const { linkCopy, place } = await import('../memory/knowledge.mjs'); linkCopy(place(dir)); },
  checkout,
};
