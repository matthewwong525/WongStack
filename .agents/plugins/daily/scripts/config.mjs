// A person's daily settings, `.agents/daily/<name>.json`. Routines (`checks`) left in it, or in the team file, start
// nothing: the person saves each as a schedule. The contract: wiki/development/daily.md#your-settings-file.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const idPattern = /^[a-z0-9][a-z0-9-]{0,79}$/;
export const SETTINGS_DIR = '.agents/daily';
export const TEAM_FILE = 'team.json';
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}$/;
const plain = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const keys = (value, allowed) => plain(value) && Object.keys(value).every(key => allowed.includes(key));
const text = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 500;
const safePath = value => text(value) && !value.startsWith('/') && !value.split(/[\\/]/).includes('..') && !value.includes('://');
const paths = (values, max = 20) => Array.isArray(values) && values.length <= max && values.every(safePath);
const placeOk = value => text(value) && (value === '.' || value.startsWith('~/') || safePath(value)) && !value.split('/').includes('..');
export class SettingsError extends Error {}
// Upstream, so the link works in a repo with Daily alone, which has no wiki.
export const SETTINGS_DOC = 'https://github.com/matthewwong525/WongStack/blob/main/wiki/development/daily.md#your-settings-file';
const fail = why => { throw new SettingsError(`Invalid daily settings: ${why}. See ${SETTINGS_DOC}`); };
export const validDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T12:00Z`)) && new Date(`${value}T12:00Z`).toISOString().startsWith(value);
const unsafe = /[\r\n@]|:\/\/|\b(?:password|secret|credential|token)\b/i;
const prompt = value => value === undefined || (text(value) && value.length <= 240 && !unsafe.test(value) && !value.startsWith('-'));
const SECRETISH = /password|secret|credential|token|approval|mail|draft|event/i;
const TOKENISH = /[\r\n@]|:\/\/|\b(?:password|secret|credential|token)\b|\b(?:sk-|ghp_|github_pat_)[A-Za-z0-9_-]{20,}/i;
const inputItem = item => typeof item === 'boolean' || (typeof item === 'number' && Number.isFinite(item))
  || (typeof item === 'string' && item.length <= 240 && !TOKENISH.test(item));
const safeInputs = value => plain(value) && Object.keys(value).length <= 10
  && Object.entries(value).every(([key, item]) => idPattern.test(key) && !SECRETISH.test(key) && inputItem(item));
// An install may have kept a routine's `thinking`, so a file with it still loads.
const CHECK_KEYS = ['id', 'enabled', 'title', 'place', 'scope', 'inputs', 'result', 'procedure', 'cadence', 'effects', 'activeFrom', 'start',
  'missed', 'prompt', 'thinking'];

/** One routine; `seen` holds the ids before it. */
function validateCheck(check, seen) {
  if (!keys(check, CHECK_KEYS) || typeof check.id !== 'string' || !idPattern.test(check.id) || seen.has(check.id)) fail('a routine id');
  if (typeof check.enabled !== 'boolean' || typeof check.place !== 'string' || !idPattern.test(check.place)) fail(`routine ${check.id}`);
  if (!['title', 'scope', 'result', 'effects'].every(key => text(check[key])) || check.scope.length > 240 || unsafe.test(check.scope)) {
    fail(`routine ${check.id}'s words`);
  }
  if (!prompt(check.prompt) || !safePath(check.procedure) || !validDay(check.activeFrom)) fail(`routine ${check.id}`);
  if (!['run', 'offer'].includes(check.start) || !['skip', 'latest'].includes(check.missed)) fail(`routine ${check.id}'s start or missed`);
  if (check.inputs !== undefined && !safeInputs(check.inputs)) fail(`routine ${check.id}'s inputs`);
  if (check.thinking !== undefined && !(typeof check.thinking === 'string' && idPattern.test(check.thinking))) fail(`routine ${check.id}'s thinking`);
  if (!keys(check.cadence, ['kind', 'weekdays']) || !['daily', 'weekly', 'monthly', 'manual'].includes(check.cadence.kind)) {
    fail(`routine ${check.id}'s cadence`);
  }
  const days = check.cadence.weekdays;
  const weekly = Array.isArray(days) && days.length > 0 && days.every(day => Number.isInteger(day) && day >= 0 && day <= 6)
    && new Set(days).size === days.length;
  if (check.cadence.kind === 'weekly' ? !weekly : days !== undefined) fail(`routine ${check.id}'s weekdays`);
  seen.add(check.id);
}

const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;
/** When the worker runs the morning add-ons, local time. */
export const MORNING = '08:00';
export const morningOf = config => config.morning ?? MORNING;

/** The AI tools a background run may use, from the settings' `runs.agent`; the first is the default. */
export const RUN_AGENTS = ['claude', 'codex'];
const checksOk = checks => Array.isArray(checks) && checks.length <= 50;

/** A person's settings, checked; it throws a SettingsError naming the first problem. */
export function validateConfig(config) {
  const allowed = ['version', 'person', 'emails', 'timezone', 'profile', 'context', 'guide', 'sources', 'places', 'checks', 'addons', 'sweeps', 'runs',
    'morning'];
  if (!keys(config, allowed) || config.version !== 1) fail('version 1 and known fields only');
  if (typeof config.person !== 'string' || !idPattern.test(config.person) || config.person === 'team') fail('person');
  if (!Array.isArray(config.emails) || !config.emails.length || config.emails.length > 20 || !config.emails.every(each => EMAIL.test(each))) fail('emails');
  try { new Intl.DateTimeFormat('en', { timeZone: config.timezone }).format(); } catch { fail('timezone'); }
  if (typeof config.timezone !== 'string') fail('timezone');
  for (const name of ['profile', 'guide']) if (config[name] !== undefined && !safePath(config[name])) fail(name);
  if (config.context !== undefined && !paths(config.context)) fail('context');
  // An older file's `tasks` loads, and the worker says one time that it does nothing.
  if (!keys(config.sources, ['tasks', 'chats']) || !Object.values(config.sources).every(value => typeof value === 'boolean')) fail('sources');
  if (!plain(config.places) || !Object.entries(config.places).every(([id, path]) => idPattern.test(id) && placeOk(path))) fail('places');
  if (config.addons !== undefined && (!keys(config.addons, ['morning', 'pass']) || !Object.values(config.addons).every(list => paths(list, 10)))) {
    fail('addons');
  }
  if (config.sweeps !== undefined && !(safePath(config.sweeps) && config.sweeps.endsWith('.json'))) fail('sweeps');
  if (config.morning !== undefined && !(typeof config.morning === 'string' && CLOCK.test(config.morning))) fail('morning, as "HH:MM"');
  if (config.runs !== undefined && !(keys(config.runs, ['agent']) && RUN_AGENTS.includes(config.runs.agent ?? 'claude'))) fail('runs');
  if (config.checks === undefined) return config;
  if (!checksOk(config.checks)) fail('checks');
  const seen = new Set();
  for (const check of config.checks) validateCheck(check, seen);
  for (const check of config.checks) if (!Object.hasOwn(config.places, check.place)) fail(`routine ${check.id}'s place`);
  return config;
}

/** The team file: `checks` only, each like a person's; its places resolve in each person's settings. */
export function validateTeam(team) {
  if (!keys(team, ['version', 'checks']) || team.version !== 1 || !checksOk(team.checks)) fail('the team file');
  const seen = new Set();
  for (const check of team.checks) validateCheck(check, seen);
  return team;
}

const readSettings = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { fail(`${file} is not JSON`); } };

const isJobList = data => plain(data) && !Object.hasOwn(data, 'person') && (Object.hasOwn(data, 'events') || Object.hasOwn(data, 'sweeps'));

/** Each person's settings file in the repo, `{file, emails}`. The team file and a job list (`events` or `sweeps`, no
 * `person`) are left out; any other file stays, so a broken one fails on load and names its bad field. */
export function settingsFiles(repo) {
  const dir = join(repo, SETTINGS_DIR);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(name => name.endsWith('.json') && name !== TEAM_FILE).sort().flatMap(name => {
    const file = join(dir, name);
    let data;
    try { data = JSON.parse(readFileSync(file, 'utf8')); } catch { return [{ file, emails: [] }]; }
    if (isJobList(data)) return [];
    const emails = Array.isArray(data.emails) ? data.emails.map(each => String(each).toLowerCase()) : [];
    return [{ file, emails }];
  });
}

/** The settings file whose `emails` holds `email`, in any case, or null. */
export const settingsFor = (repo, email) => (email ? settingsFiles(repo).find(entry => entry.emails.includes(email.toLowerCase()))?.file ?? null
  : null);

/** The person's checked settings and the team's routines; a person's routine wins over a team one with its id. */
export function loadSettings(file, repo) {
  const config = validateConfig(readSettings(file));
  const teamFile = join(repo, SETTINGS_DIR, TEAM_FILE);
  const team = existsSync(teamFile) ? validateTeam(readSettings(teamFile)) : null;
  const mine = config.checks ?? [];
  const own = new Set(mine.map(check => check.id));
  const shared = (team?.checks ?? []).filter(check => !own.has(check.id)).map(check => ({ ...check, team: true }));
  return { ...config, checks: [...shared, ...mine], teamFile: team ? teamFile : null };
}

/** Settings for a person with no file: check-ins only, as the email's local part, in this computer's time zone. */
export function defaultSettings({ email, timezone = Intl.DateTimeFormat().resolvedOptions().timeZone }) {
  const id = String(email).split('@')[0].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 72) || 'me';
  const person = id === 'team' ? 'team-member' : id;
  return { ...validateConfig({ version: 1, person, emails: [email], timezone, sources: {}, places: {} }),
    teamFile: null };
}

export const placePath = (config, name, project) => {
  if (!Object.hasOwn(config.places, name)) throw new Error(`No place ${name} in your settings.`);
  const path = config.places[name];
  return resolve(path.startsWith('~/') ? resolve(homedir(), path.slice(2)) : resolve(project, path));
};

export function localDay(now, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const fields = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}`;
}

export const addDays = (day, count) => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + count);
  return date.toISOString().slice(0, 10);
};
