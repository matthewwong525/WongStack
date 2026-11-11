// The daily tidy's local side: this computer's switch and its last try, in daily.json. The day is this computer's.
// wiki/development/wiki-dream.md
import { join } from 'node:path';
import { readJson, statePath, writeJson } from './store.mjs';

export const DAILY_FILE = 'daily.json';

/** Today as YYYY-MM-DD in this computer's time zone. */
export const today = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);

export const readDaily = ctx => readJson(join(ctx.stateDir, DAILY_FILE), {});

export function setDaily(ctx, change) {
  const file = statePath(ctx, DAILY_FILE);
  writeJson(file, { ...readJson(file, {}), ...change });
}

/** Why this chat start starts no daily tidy, or null when it should: `digest` is loadDigest's answer or `{ error }`. */
export function dailyBlocker({ env = process.env, state, digest, day }) {
  if (env.WONG_MEMORY_RUN === '1') return 'a background run';
  if (env.WONG_MEMORY_NO_HEADLESS === '1') return 'no headless runs';
  if (state.off) return 'off on this computer';
  if (state.tried === day) return 'tried today';
  if (!digest || digest.error || digest.older) return 'the store can not claim a day';
  if (digest.daily?.day === day) return 'done today';
  return null;
}

/** Starts the day's tidy when none blocks it, `tried` written first so a second chat starts none; true when started. */
export function startDaily(ctx, digest, { start, env = process.env, now = new Date() }) {
  const day = today(now);
  if (dailyBlocker({ env, state: readDaily(ctx), digest, day })) return false;
  setDaily(ctx, { tried: day });
  return start();
}
