// Daily's schedule store: the person's schedules in the company app. wiki/stack/host-schedules.md
import { existsSync } from 'node:fs';

const FILE = new URL('../../../../inbox/schedules.mjs', import.meta.url);

/** The company app's store when its code is here, else null; a store that does not load throws. */
export async function appStore() {
  return existsSync(FILE) ? { name: 'app', ...(await import(FILE.href)) } : null;
}
