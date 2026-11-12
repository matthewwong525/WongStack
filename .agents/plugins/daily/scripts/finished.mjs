// Whether a watched chat is finished: stopped, its work published at its last commit, nothing new in its folder.
// Read-only: `D status` marks it, and the person picks which to close. wiki/development/daily.md#close-finished-chats
import { realpathSync } from 'node:fs';
import { git } from './lib/paseo.mjs';
import { mergedAtTip, ownWorkspace, pullRequest, savedState, worktreeState } from '../skills/schedule/scripts/tidy.mjs';

const DEFAULT_BRANCHES = new Set(['main', 'master', 'HEAD']);
const real = file => { try { return realpathSync(file); } catch { return file; } };

/** A folder: its top, git's common folder, and tidy's saved-state inputs; null when git can not read it. */
export function lookFolder(cwd) {
  try {
    const [top, commonDir] = git(cwd, 'rev-parse', '--show-toplevel', '--path-format=absolute', '--git-common-dir').split('\n');
    return { top: real(top), commonDir: real(commonDir), ...worktreeState(top) };
  } catch { return null; }
}

// A worktree of `project`'s checkout, not the checkout itself, on a work branch, with nothing unsaved.
function savedWorktree(here, home) {
  return Boolean(here && home && here.branch && !DEFAULT_BRANCHES.has(here.branch)
    && ownWorkspace({ isolation: 'worktree', cwd: here.top }, { commonDir: home.commonDir, wsCommonDir: here.commonDir, primary: home.top })
    && savedState({ ...here, merged: true }).saved);
}

/** True when `agent` is stopped, not a sub-agent, its folder a saved worktree of `project`, and its
 * pull request merged at that folder's last commit. `look` reads git, `prOf` reads `gh`, `inspect` reads Paseo. */
export async function finished({ agent, project, look = lookFolder, prOf = pullRequest, inspect = null }) {
  if (!agent?.cwd || agent.archivedAt || !['idle', 'error'].includes(agent.status) ) return false;
  const here = look(agent.cwd);
  if (!savedWorktree(here, look(project)) || !mergedAtTip(prOf(here.top, here.branch), here.tip)) return false;
  if (!inspect) return true;
  try { return !(await inspect(agent.id))?.ParentAgentId; } catch { return false; }
}
