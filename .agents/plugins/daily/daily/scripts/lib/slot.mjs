// A repo's profile: `.agents/daily/profile.mjs` (or WONG_DAILY_PROFILE) default-exports optional parts Daily calls.
// A missing part is undefined; a part that throws or runs late counts as empty and journals once a day.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { repoContext } from './env.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
export const SLOT_MS = 10e3;
let loaded = null;

/** The repo that holds this copy of Daily, and its profile file. */
export const moduleRepo = () => repoContext(HERE).root;
export const profileFile = (env = process.env, root = moduleRepo()) => resolve(env.WONG_DAILY_PROFILE || join(root, '.agents', 'daily', 'profile.mjs'));

/** The profile's parts, `{}` with no file; one load per process and file. */
export async function loadProfile(env = process.env, root) {
  const file = profileFile(env, root);
  if (loaded?.file !== file) {
    const parts = existsSync(file) ? import(pathToFileURL(file).href).then(found => found.default ?? {}) : Promise.resolve({});
    const kept = { file, parts, ready: null };
    parts.then(found => { kept.ready = found; }, () => { kept.ready = {}; });
    loaded = kept;
  }
  return loaded.parts;
}

/** Writes `line` once a day per part: the journal when `journal` is `{ stateDir, timezone }`, else stderr. */
async function tell(part, error, journal, now) {
  const line = `Daily's ${part} part failed and counts as empty: ${String(error?.message ?? error).split('\n')[0].slice(0, 160)}`;
  if (!journal?.stateDir) { process.stderr.write(`${line}\n`); return; }
  const [{ addLine }, { localDay }] = await Promise.all([import('../journal.mjs'), import('../config.mjs')]);
  const marker = join(journal.stateDir, 'slots.json'), day = localDay(now, journal.timezone);
  let seen = {};
  try { seen = JSON.parse(readFileSync(marker, 'utf8')); } catch { /* first failure */ }
  if (seen[part] === day) return;
  mkdirSync(dirname(marker), { recursive: true });
  writeFileSync(marker, JSON.stringify({ ...seen, [part]: day }));
  addLine({ stateDir: journal.stateDir, timezone: journal.timezone, line, kind: 'slot' });
}

/** A function part's result for `args`, an object part as is, or undefined: missing, thrown, or later than `ms`. */
export async function slot(part, args = [], { env = process.env, root, ms = SLOT_MS, journal = null, now = new Date() } = {}) {
  let found;
  try { found = (await loadProfile(env, root))[part]; } catch (error) { await tell('profile', error, journal, now); return undefined; }
  if (typeof found !== 'function') return found ?? undefined;
  let timer;
  try {
    const late = new Promise((_, fail) => { timer = setTimeout(() => fail(new Error(`no answer in ${ms / 1000} seconds`)), ms); });
    return await Promise.race([Promise.resolve().then(() => found(...args)), late]);
  } catch (error) {
    await tell(part, error, journal, now);
    return undefined;
  } finally { clearTimeout(timer); }
}

/** The same answer from a profile `loadProfile` already read, for code that can not wait: a part that answers with
 *  a promise, throws, or is not loaded yet counts as empty, with one line on stderr for a failure. */
export function slotNow(part, args = []) {
  const found = loaded?.ready?.[part];
  if (typeof found !== 'function') return found ?? undefined;
  try {
    const answer = found(...args);
    if (typeof answer?.then !== 'function') return answer ?? undefined;
    answer.catch(() => {});
    throw new Error('it answered later than a hook can wait');
  } catch (error) {
    process.stderr.write(`Daily's ${part} part failed and counts as empty: ${String(error?.message ?? error).split('\n')[0].slice(0, 160)}\n`);
    return undefined;
  }
}

/** Forgets the loaded profile: tests point WONG_DAILY_PROFILE at another file. */
export const forgetProfile = () => { loaded = null; };
