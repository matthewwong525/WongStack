// The repo a Daily command runs in: its top folder and the git email, which names the person when no profile slot does.
import { execFileSync } from 'node:child_process';

const tryGit = (cwd, ...args) => {
  try { return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { return ''; }
};

/** `{root, author}`: the checkout's top folder (else `cwd`) and its git email, read once. */
export function repoContext(cwd = process.cwd()) {
  let author;
  return {
    root: tryGit(cwd, 'rev-parse', '--show-toplevel') || cwd,
    get author() { author ??= tryGit(cwd, 'config', 'user.email'); return author; },
  };
}
