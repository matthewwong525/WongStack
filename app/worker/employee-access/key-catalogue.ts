// What each app does with each saved key, worked out from the routes themselves.
import { keyUse } from "./key-use.ts";
import { keyIds, keyTitle, madeBySetup, offered, registered, saved, worksAlone, type Level } from "./key-levels.ts";

/** The highest level any route of these apps needs, per registered key. A key working alone belongs to no app. */
export function needs(apps: readonly string[]): Map<string, Level> {
  const highest = new Map<string, Level>();
  for (const use of keyUse) {
    if (!use.apps.some(app => apps.includes(app))) continue;
    for (const key of use.keys.filter(registered)) if (highest.get(key) !== "write") highest.set(key, use.need);
  }
  return highest;
}

/** Each app's keys, and whether the app looks things up with them or also changes things. */
export const appKeys = (apps: readonly string[]): Record<string, { id: string; need: Level }[]> =>
  Object.fromEntries(apps.map(app => [app, [...needs([app])].map(([id, need]) => ({ id, need }))]));

/** The key list Access shows: never a value, only whether every secret of a key is there. */
export const keyCatalogue = (env: object, uses: ReturnType<typeof appKeys>) => keyIds().map(id => ({
  id, title: keyTitle(id), levels: offered(id), saved: saved(env, id), setup: madeBySetup(id),
  usedBy: Object.entries(uses).flatMap(([app, list]) => list.filter(item => item.id === id).map(({ need }) => ({ app, need }))),
  alone: worksAlone(id) || keyUse.some(use => !use.apps.length && use.keys.includes(id)),
}));
