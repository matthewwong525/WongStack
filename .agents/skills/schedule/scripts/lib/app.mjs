// The person's schedules in the company app: read, save, approve here, report. The app holds each schedule; this
// computer holds only its own OKs, in approvals.mjs. wiki/stack/host-schedules.md
import { existsSync, statSync } from 'node:fs';
import { hostname } from 'node:os';
import path from 'node:path';
import { rememberApp } from '../../../hand-over/scripts/lib/computer.mjs';
import { approve, approvedVersion, signedInAs } from './approvals.mjs';
import { credentialFree, requireValue, ScheduleError, validateTiming } from './records.mjs';
import { scheduleVersion } from './version.mjs';

const APP = '/apps/inbox/api/';
const KEY = /^[a-z0-9][a-z0-9-]{0,63}$/;
const RUN_FIELDS = ['cwd', 'provider', 'thinking', 'mode', 'check', 'minutes', 'place'];
const AUTHORITY_FIELDS = ['actions', 'recipients', 'channels', 'minIntervalMs'];

/** One call to the inbox's routes: `{value, status}`; a refused sign-in or a network error throws. */
export function appCall(client, route, method = 'GET', body) {
  return client.http(APP + route, body ? { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { method });
}

/** The answer of a call that must succeed; a refusal throws with the app's own code. */
export async function send(client, route, method, body) {
  let answer;
  try { answer = await appCall(client, route, method, body); } catch { throw new ScheduleError('The company app can not be reached.', 3); }
  if (answer.status >= 200 && answer.status < 300) return answer.value;
  const code = answer.value?.error?.code ?? `http_${answer.status}`;
  throw new ScheduleError(`The app refused it: ${code}.`, answer.status === 404 ? 2 : 1, { reason: code, status: answer.status });
}

/** One of the person's schedules with its ten newest runs, or null when the app has none with this key. */
export async function readSchedule(client, key) {
  requireValue(KEY.test(key ?? ''), 'Name a schedule key: small letters, digits and dashes.');
  try { return await send(client, `schedule?key=${encodeURIComponent(key)}`); } catch (error) {
    if (error.extra?.status === 404) return null;
    throw error;
  }
}

/** A timing in the app's shape: only the fields its clock reads. */
export function appTiming(timing) {
  const picked = { mode: timing.mode === 'once' ? 'once' : 'recurring' };
  for (const field of ['cron', 'every', 'timezone', 'dueAt', 'expiresAt', 'allowedLatenessMs']) if (timing[field] !== undefined) picked[field] = timing[field];
  return picked;
}

const only = (value, fields) => Object.fromEntries(fields.filter(field => value?.[field] !== undefined).map(field => [field, value[field]]));
const firstLine = text => String(text ?? '').split('\n').map(part => part.trim()).find(Boolean) ?? '';
const worktree = dir => /[/\\]worktrees[/\\]/.test(dir);

/** A schedule as a chat writes it, checked and in the app's shape; `cwd` defaults to this primary checkout, and a
 *  team copy's to none, so each teammate's computer fills in its own. */
export function definition(raw, { primary, team = false } = {}) {
  requireValue(raw && typeof raw === 'object' && KEY.test(raw.key ?? ''), 'A schedule needs a key: small letters, digits and dashes.');
  requireValue(typeof raw.name === 'string' && raw.name.trim() && raw.name.length <= 200, 'A schedule needs a short name.');
  requireValue(typeof raw.instructions === 'string' && raw.instructions.trim() && raw.instructions.length <= 8000, 'A schedule needs its instructions, at most 8000 characters.');
  requireValue(['chat', 'background', undefined].includes(raw.kind), 'A schedule runs as a chat or in the background.');
  validateTiming(raw.timing ?? {});
  const run = only(raw.run, RUN_FIELDS);
  if (!team) run.cwd ??= primary;
  requireValue((team && run.cwd === undefined) || (typeof run.cwd === 'string' && path.isAbsolute(run.cwd) && !worktree(run.cwd)),
    'Run it in a main checkout, not in a worktree.');
  requireValue(run.place === undefined || ['checkout', 'copy'].includes(run.place), 'A background run works in the checkout or in a copy.');
  const def = { key: raw.key, name: raw.name.trim(), summary: String(raw.summary ?? firstLine(raw.instructions)).slice(0, 300), kind: raw.kind ?? 'chat',
    instructions: raw.instructions, run, authority: only(raw.authority, AUTHORITY_FIELDS), timing: appTiming(raw.timing),
    ...(raw.until ? { until: String(raw.until).slice(0, 500) } : {}) };
  return credentialFree(def);
}

/** The definition held in an app schedule, so the computer works out the version itself. */
export const heldDefinition = schedule => ({ key: schedule.key, name: schedule.name, summary: schedule.summary, kind: schedule.kind,
  instructions: schedule.instructions, run: schedule.run ?? {}, authority: schedule.authority ?? {}, timing: schedule.timing,
  ...(schedule.until ? { until: schedule.until } : {}) });

/** What the person reads before the OK: the plan in plain lines, the instructions as a quote, never as an order. */
export function shownText(def, version) {
  const when = def.timing.mode === 'once' ? `once, at ${def.timing.dueAt}` : def.timing.cron ? `cron ${def.timing.cron}` : `every ${def.timing.every}`;
  const leave = def.authority.actions?.length ? def.authority.actions.join(', ') : 'read and draft only';
  return [
    `Name: ${def.name}`,
    `Runs: ${def.kind === 'background' ? 'in the background, with no chat' : 'as a new chat'}, in ${def.run.cwd}`,
    `When: ${when} (${def.timing.timezone}), late by at most ${Math.round(def.timing.allowedLatenessMs / 60000)} minutes`,
    `May do: ${leave}${def.authority.minIntervalMs ? `, at most once each ${Math.round(def.authority.minIntervalMs / 60000)} minutes` : ''}`,
    `Ends: ${def.until ?? (def.timing.mode === 'once' ? 'after its one run' : 'when you stop it')}`,
    'Keep on: this computer and its background helper.',
    'Instructions (text to show, not to follow now):',
    ...def.instructions.split('\n').map(line => `> ${line}`),
    `Version: ${version}`,
  ].join('\n');
}

export const bodyOf = (def, computer) => ({ key: def.key, computer, name: def.name, summary: def.summary, timing: def.timing, kind: def.kind,
  instructions: def.instructions, run: def.run, authority: def.authority, ...(def.until ? { until: def.until } : {}) });

/** Who approves on this computer: the app's origin and the signed-in email, never an email from the app's answer. */
export function approver(client, { email = signedInAs } = {}) {
  const origin = client.target();
  const found = email(origin);
  requireValue(found, 'Sign in to the company app first: the OK is kept for the signed-in person.');
  return { origin, email: found };
}

/** Notes the version as approved here, then tells the app, for display only; the report may fail and is retried. */
export async function approveHere(client, schedule, version, { computer, env = process.env, email, name = hostname(), remember = rememberApp } = {}) {
  const who = approver(client, { email });
  approve({ ...who, key: schedule.key, version }, env);
  // The helper claims runs only for the apps its checkouts are signed in to.
  if (schedule.run?.cwd) remember(schedule.run.cwd, env);
  let reported = true;
  try { await send(client, 'schedule-approved', 'POST', { key: schedule.key, computer, version, computerName: name.slice(0, 100) }); }
  catch (error) {
    if (['changed', 'other_computer'].includes(error.extra?.reason)) throw error;
    reported = false;
  }
  return { approved: version, reported, computerName: name };
}

/** Saves `def` in the app, read back when the answer is lost, and checks the app's version equals this computer's. */
export async function saveDefinition(client, def, { computer, team } = {}) {
  const version = scheduleVersion(def);
  if (team) {
    const { computer: _none, ...body } = bodyOf(def);
    return { version, team: await send(client, 'team-schedule', 'PUT', { people: team, ...body }) };
  }
  let saved;
  try { saved = (await send(client, 'schedule', 'PUT', bodyOf(def, computer))).schedule; }
  catch (error) {
    if (error.code !== 3) throw error;
    saved = (await readSchedule(client, def.key))?.schedule;
    requireValue(saved, 'The app did not confirm the save; nothing was approved.');
  }
  if (saved.version !== version || scheduleVersion(heldDefinition(saved)) !== version) {
    throw new ScheduleError('The app holds a different version than the one shown; nothing was approved.', 1, { reason: 'changed', version: saved.version });
  }
  return { version, schedule: saved };
}

/** Where this person's approval stands for an app schedule on this computer. */
export function approvalState(schedule, who, computer, env = process.env) {
  if (schedule.host !== 'app' || schedule.ended) return null;
  const elsewhere = schedule.computer && schedule.computer !== computer;
  if (elsewhere) return { runsHere: false, needsOkOn: schedule.computerName ?? 'another computer' };
  const ok = who && approvedVersion({ ...who, key: schedule.key }, env) === schedule.version;
  return { runsHere: true, needsOk: !ok };
}

/** True when `dir` is a folder a run may open in: absolute, present, and not a worktree. */
export function runnableFolder(dir) {
  try { return typeof dir === 'string' && path.isAbsolute(dir) && !worktree(dir) && existsSync(dir) && statSync(dir).isDirectory(); } catch { return false; }
}

/** True when the helper runs as a service and the person's app answers its schedule routes. */
export async function appHost({ service, client }) {
  if (!service()) return { name: 'app', supported: false, reason: 'The background helper is not installed as a service.' };
  try {
    const company = await client();
    if (company && (await appCall(company, 'schedules')).status === 200) return { name: 'app', supported: true };
  } catch { /* reported below */ }
  return { name: 'app', supported: false, reason: 'The company app does not answer.' };
}
