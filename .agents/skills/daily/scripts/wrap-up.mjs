// Wrap-up: the worker sends `/close` once to a watched chat whose work merged at its last commit and went quiet, so
// the chat saves what it learned. Code, no AI run. wiki/development/daily.md#wrap-up-a-finished-chat
import { realpathSync } from 'node:fs';
import { git } from '../../schedule/scripts/lib/paseo.mjs';
import { mergedAtTip, ownWorkspace, pullRequest, savedState, worktreeState } from '../../schedule/scripts/tidy.mjs';
import { HOLD_MS, readJson, userAt, writeJson } from './chief.mjs';
import { todosFile, wrapUpFile } from './todos.mjs';

const GH_MS = 10 * 60e3;
const KEEP_MS = 60 * 24 * 3600e3;
const TRIES = 3;
const DEFAULT_BRANCHES = new Set(['main', 'master', 'HEAD']);
const OWN_NAMES = ['Daily'];
const live = agent => agent && agent.status !== 'closed' && !agent.archivedAt;
const oneLine = value => String(value?.message ?? value).split('\n')[0].slice(0, 200);
const real = file => { try { return realpathSync(file); } catch { return file; } };

/** A folder as wrap-up reads it: its top, git's common folder, and tidy's saved-state inputs; null when git can not. */
export function lookFolder(cwd) {
  try {
    const [top, commonDir] = git(cwd, 'rev-parse', '--show-toplevel', '--path-format=absolute', '--git-common-dir').split('\n');
    return { top: real(top), commonDir: real(commonDir), ...worktreeState(top) };
  } catch { return null; }
}

// A chat that may get `/close` now, before its folder is read: live and stopped, no question open, not the Daily chat,
// no close asked before, no judge run for it, and the person quiet 15 minutes when their last message is known.
function ready({ row, agent, pending, record, todos, busy, typed, now }) {
  if (!live(agent) || !['idle', 'error'].includes(agent.status) || OWN_NAMES.includes(agent.name)) return false;
  if (pending.some(ask => ask.agentId === row.agentId) || busy(row.agentId)) return false;
  const asked = record.asked[row.agentId];
  if ((asked && !asked.failed) || todos[row.agentId]?.closeAsked) return false;
  return !typed || now - Date.parse(typed) >= HOLD_MS;
}

/** One pass of wrap-up over the watch's rows; `look` and `prOf` read git and `gh`, `inspect` reads Paseo's record. */
export async function wrapUp({ stateDir, project, rows, list, pending, busy = () => false, journal, send, inspect, typedAt = userAt,
  look = lookFolder, prOf = pullRequest, now = new Date() }) {
  const file = wrapUpFile(stateDir);
  const record = { asked: {}, gh: {}, ...readJson(file, {}) };
  const save = () => writeJson(file, record);
  const todos = readJson(todosFile(stateDir), {});
  const at = now.getTime();
  const listed = new Set(list.map(agent => agent.id));
  for (const id of Object.keys(record.gh)) if (!listed.has(id)) delete record.gh[id];
  for (const [id, entry] of Object.entries(record.asked)) if (!listed.has(id) && at - Date.parse(entry.at) > KEEP_MS) delete record.asked[id];
  let home = null;
  for (const row of rows) {
    const agent = list.find(each => each.id === row.agentId);
    const typed = typedAt(row.agentId);
    if (!ready({ row, agent, pending, record, todos, busy, typed, now: at }) || !agent.cwd) continue;
    const here = look(agent.cwd);
    home ??= look(project);
    if (!here || !home || !ownWorkspace({ isolation: 'worktree', cwd: here.top }, { commonDir: home.commonDir, wsCommonDir: here.commonDir, primary: home.top })
      || !here.branch || DEFAULT_BRANCHES.has(here.branch) || !savedState({ ...here, merged: true }).saved) continue;
    const cached = record.gh[row.agentId];
    let merged = cached?.head === here.tip && at - Date.parse(cached.at) < GH_MS ? cached.merged : null;
    if (merged === null) {
      merged = mergedAtTip(prOf(here.top, here.branch), here.tip);
      record.gh[row.agentId] = { at: now.toISOString(), head: here.tip, merged };
      save();
    }
    if (!merged) continue;
    let detail = null;
    try { detail = await inspect(row.agentId); } catch { continue; }
    if (detail?.ParentAgentId || (!typed && !(at - Date.parse(detail?.UpdatedAt ?? '') >= HOLD_MS))) continue;
    await ask({ row, agent, head: here.tip, record, save, journal, send, now });
  }
  save();
}

// Records the ask before it sends, so a crash never sends twice; 3 failed sends give `Not closed`.
async function ask({ row, agent, head, record, save, journal, send, now }) {
  const title = row.title ?? agent.name ?? row.workspace ?? row.agentId;
  const tries = record.asked[row.agentId]?.tries ?? 0;
  record.asked[row.agentId] = { at: now.toISOString(), head, title, tries };
  save();
  const more = { title, workspace: row.workspace ?? undefined };
  try { await send(row.agentId); } catch (error) {
    const gaveUp = tries + 1 >= TRIES;
    record.asked[row.agentId] = { ...record.asked[row.agentId], tries: tries + 1, failed: !gaveUp };
    if (gaveUp) journal(`Not closed: ${title} — ${oneLine(error)}`, { kind: 'not-closed', ...more });
    return;
  }
  journal(`Wrapped up: ${title}`, { kind: 'wrapped-up', ...more });
}
