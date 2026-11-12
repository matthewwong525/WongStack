// The repo's own parts, by named slot: `.agents/browser/profile.mjs` at the checkout's top, loaded once. An empty slot
// turns off only its own extra. The slots and what each does when empty: ../../README.md#slots
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** The nearest folder up from `from` that holds `.git`, or null: never a count of folders, since Node resolves the
 * source's skill link to a path one level deeper. */
export function checkoutTop(from = dirname(fileURLToPath(import.meta.url))) {
  for (let dir = from; ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return null;
  }
}

/** The profile file: `WONG_BROWSER_PROFILE` when set (empty for none), else the checkout's own. */
export function profileFile(env = process.env) {
  if (env.WONG_BROWSER_PROFILE !== undefined) return env.WONG_BROWSER_PROFILE || null;
  const top = checkoutTop();
  return top && join(top, '.agents', 'browser', 'profile.mjs');
}

let loaded = null;
const load = async () => {
  const file = profileFile();
  return file && existsSync(file) ? (await import(pathToFileURL(file).href)).default ?? {} : {};
};

/** The profile's part named `name`, or null when the repo has no profile or leaves the slot empty. */
export async function slot(name) {
  loaded ??= load();
  return (await loaded)[name] ?? null;
}
