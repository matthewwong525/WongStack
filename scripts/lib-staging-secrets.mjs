// Which runtime secrets each Worker may hold, shared by `cf-secrets.mjs` and setup's Access step, so both prune
// staging by one rule: wiki/stack/staging-bindings.md
import { existsSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { primaryRoot } from '../.claude/skills/memory/scripts/lib/primary-root.mjs';

/** The file the live app's runtime secrets are declared in. */
export const SOURCE = '.dev.vars';
/** The previews' own file: staging holds exactly its names, and none without it. */
export const STAGING_SOURCE = `${SOURCE}.staging`;
/** Keys only the live app may hold: branch code runs on staging, so a copy there reaches production. */
export const PRODUCTION_ONLY_SECRETS = new Set(['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CODE_WRITE', 'WONG_CLOUDFLARE_READ']);

/** The KEY names in a dotenv file. Values are dropped here, so nothing downstream can print them. */
export function readKeyNames(file) {
  const names = [];
  for (const rawLine of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) names.push(match[1]);
  }
  return names;
}

/** The folder both files are read from: the app's own, or the primary checkout's when a linked worktree has no
 * `.dev.vars`. `root` is the repo root `appDir` sits in. `primary` says which. */
export function secretsDir(appDir, root) {
  if (existsSync(resolve(appDir, SOURCE))) return { dir: appDir, primary: false };
  let primary;
  try {
    ({ primary } = primaryRoot(appDir));
  } catch {
    return { dir: appDir, primary: false };
  }
  const primaryDir = resolve(primary, relative(root, appDir));
  if (primaryDir === appDir || !existsSync(resolve(primaryDir, SOURCE))) return { dir: appDir, primary: false };
  return { dir: primaryDir, primary: true };
}

/** The names staging may keep: those its own file declares, never a live-app-only one; none with no file. */
export function stagingKeeps(dir) {
  const file = join(dir, STAGING_SOURCE);
  return existsSync(file) ? readKeyNames(file).filter((name) => !PRODUCTION_ONLY_SECRETS.has(name)) : [];
}
