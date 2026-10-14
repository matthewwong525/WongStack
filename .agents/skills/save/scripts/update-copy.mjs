// Moves a teammate's copy, installed through the app, forward to the newest published version when a chat starts.
// Only on the published branch, with nothing changed and nothing ahead; the owner's copy never moves. Never throws.
import { execFileSync, spawn } from 'node:child_process';
import { delivery } from './delivery-route.mjs';

const git = (cwd, ...args) => {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
};

/** A fast-forward pull, detached, so the chat never waits on it. Its sign-in comes from the copy's own helper. */
function pull(root) {
  const child = spawn('git', ['pull', '--quiet', '--ff-only'], { cwd: root, detached: true, stdio: 'ignore', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' } });
  child.on('error', () => {});
  child.unref();
}

/** True when a pull was started for the checkout at `cwd`: the same rule as setup's own update. */
export function updateCopy(cwd, start = pull) {
  try {
    const { route, root } = delivery(cwd);
    if (route !== 'app') return false;
    const branch = git(root, 'symbolic-ref', '--quiet', '--short', 'HEAD');
    const published = git(root, 'symbolic-ref', '--quiet', '--short', 'refs/remotes/origin/HEAD');
    if (!branch || published !== `origin/${branch}` || git(root, 'status', '--porcelain', '--untracked-files=no') !== '') return false;
    if (git(root, 'rev-list', '--count', `${published}..HEAD`) !== '0') return false;
    start(root);
    return true;
  } catch {
    return false;
  }
}
