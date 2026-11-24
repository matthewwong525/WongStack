// Starts one due schedule run the store handed this computer: a chat run opens its own workspace through Paseo, a
// background run goes to Daily's worker; the store's `report` gets the result. wiki/stack/host-schedules.md
import { spawn as spawnChild } from 'node:child_process';
import { existsSync, mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { agentEvents } from '../../../daily/scripts/chief.mjs';
import { SCHEDULE_LABEL } from '../../../daily/scripts/chats.mjs';
import { EXIT, PaseoError, findPaseo, git, paseo, runPaseo } from '../../../daily/scripts/lib/paseo.mjs';
import { firstMessage } from './hosts.mjs';
import { MODES, childEnv, defaultBranch, flooredThinking, freshBase, nameWorkspace, parseCreated, workspaceTitle } from '../workspace.mjs';

/** How long a chat run's fetch of the default branch may take before the run starts from the last fetched copy. */
export const FETCH_TIMEOUT_MS = 60_000;

/** Where a chat run's workspace opens: a fresh worktree from the fetched default branch in a git project, so the
 *  run never works on the main copy; else the folder itself, since a worktree needs git. Returns any warning. */
async function workspacePlace(cwd) {
  let inGit = false;
  try { inGit = git(cwd, 'rev-parse', '--is-inside-work-tree') === 'true'; } catch { /* not a git project */ }
  if (!inGit) return { args: ['--new-workspace', 'local'], warning: null };
  try {
    const { base, warning } = await freshBase(cwd, await defaultBranch(cwd), { fetch: true, timeout: FETCH_TIMEOUT_MS });
    return { args: ['--new-workspace', 'worktree', '--worktree-mode', 'branch-off', '--base', base], warning };
  } catch (error) {
    // The run must still start: with no default branch to copy, it opens in its folder.
    return { args: ['--new-workspace', 'local'], warning: `The run opened in its folder, not a fresh copy: ${error.message}` };
  }
}

/** Opens a chat run's own workspace through Paseo, with the approved instructions, then names the workspace after
 *  the schedule; a fetch or rename problem comes back as `warning`, and the run still starts. */
export async function openSession({ schedule, run, title, progress = null, env = process.env }) {
  const settings = schedule.run;
  const bin = findPaseo(env, 'WONG_PASEO_BIN');
  // Paseo refuses a run with no provider; a schedule that names none runs on Claude.
  const named = settings.provider || 'claude';
  const place = await workspacePlace(settings.cwd);
  // The label lets the Inbox keep a schedule's chat off the list while it runs.
  const args = ['run', '-d', ...place.args, '--cwd', settings.cwd, '--title', title, '--provider', named, '--label', `${SCHEDULE_LABEL}=${schedule.key}`];
  const [provider, model = null] = named.split('/');
  const thinking = await flooredThinking(more => paseo(bin, more, { env: childEnv(env) }), { provider, model, thinking: settings.thinking ?? null });
  if (thinking) args.push('--thinking', thinking);
  // No one is there to allow a step, so an unattended run takes the provider's full mode unless the schedule sets one.
  const mode = settings.mode || MODES[provider];
  if (mode) args.push('--mode', mode);
  const { data, stderr } = await runPaseo(bin, [...args, '--', firstMessage({ schedule, run, progress })], { env: childEnv(env) });
  // Without a rename, Paseo names the workspace after its git branch, so every run shows as `main`.
  const renamed = await nameWorkspace(bin, parseCreated(stderr), title, env);
  const warning = [place.warning, renamed.warning].filter(Boolean).join('\n');
  return { agentId: data?.agentId ?? null, chatTitle: data?.title ?? title, ...(warning ? { warning } : {}) };
}

/** Hands a background run to the worker in its checkout: one event file, then `D ensure`. The worker reports the
 *  run's result; when the file can not be written, no worker will. */
export function handOver({ schedule, run, origin, email }, { env = process.env, spawn = spawnChild, now = Date.now } = {}) {
  const cwd = schedule.run.cwd, file = join(agentEvents(env), `schedule-run-${run.id}.json`);
  const event = { event: 'schedule-run', key: schedule.key, run: run.id, version: schedule.version, origin, email, cwd };
  try {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(`${file}.tmp`, `${JSON.stringify({ event, at: new Date(now()).toISOString() })}\n`, { mode: 0o600 });
    renameSync(`${file}.tmp`, file);
  } catch { return { state: 'failed', reason: 'no_worker' }; }
  try {
    spawn(process.execPath, [dailyScript(cwd), 'ensure'], { cwd, detached: true, stdio: 'ignore', env: childEnv(env) }).unref();
  } catch { /* the worker's own start picks the file up */ }
  return { state: 'handed' };
}

function titleOf(schedule) {
  try { return workspaceTitle(schedule.name); } catch { return `Scheduled work: ${schedule.key}`; }
}

/** The checkout's own Daily: `.claude/skills` in an install, `.agents/skills` behind WongStack's `.claude` link. */
const dailyScript = cwd => ['.claude', '.agents'].map(dir => join(cwd, dir, 'skills/daily/scripts/daily.mjs')).find(existsSync)
  ?? join(cwd, '.claude/skills/daily/scripts/daily.mjs');

/** Opens the chat or hands the run over, then reports any outcome but a hand-over: the worker reports that one. */
export async function startRun({ schedule, run, origin, email, progress = null }, { open = openSession, hand = handOver, env = process.env,
  report = async () => {} } = {}) {
  let result;
  if (schedule.kind === 'background') result = hand({ schedule, run, origin, email }, { env });
  else {
    try {
      const { agentId, chatTitle, warning } = await open({ schedule, run, title: titleOf(schedule), progress, env });
      result = { state: 'started', agentId: agentId ?? undefined, chatTitle: chatTitle ?? undefined, warning: warning || undefined };
    } catch (error) {
      result = { state: 'failed', reason: error instanceof PaseoError && error.code === EXIT.noPaseo ? 'no_opener' : 'open_failed' };
    }
  }
  // The warning stays in this computer's log; the store records only the outcome.
  const { warning: _warning, ...told } = result;
  if (result.state !== 'handed') await report(run.id, told);
  return result;
}
