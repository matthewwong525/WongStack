// The key list Access shows, worked out from the registered keys and the routes themselves.
import { keyUse } from "./key-use.ts";
import { described, forwards, keyIds, keyTitle, liveOnly, madeBySetup, offered, reads, registryOf, saved, worksAlone, type KeyEntry, type Registry } from "./key-levels.ts";
import { pasted } from "./keys-route.ts";

/** The key list Access shows: never a value or a secret's name. `direct`: a level also reaches the service directly,
 *  which never makes a key work `alone`. `waiting`: secrets sent to the app, by name, with their last four. */
export const keyCatalogue = (env: object, waiting: ReadonlyMap<string, string>) => {
  const registry = registryOf(env);
  return keyIds(registry).map(id => ({
    id, title: keyTitle(registry, id), ...described(registry, id), levels: offered(registry, id), saved: saved(env, id),
    parts: parts(registry[id]), ...waitingRow(registry, id, waiting),
    setup: madeBySetup(registry, id), liveOnly: liveOnly(registry, id),
    alone: worksAlone(registry, id) || keyUse.some(use => !use.apps.length && !use.direct && use.keys.includes(id)),
    direct: forwards(registry, id), ...chatRow(registry, id),
  }));
};
/** What Access's paste box asks for, one label per secret in the key's order; none for a key no person sends. */
const parts = (key: KeyEntry) => !pasted(key) ? [] : key.secrets.map((name, at) => key.forward?.exchange
  ? name === key.forward.secret ? "Secret" : "ID" : key.secrets.length === 1 ? "Key" : `Part ${at + 1}`);
/** The first of a key's secrets that waits for the next publish, its own secret before its ID, and its last four. */
const waitingRow = (registry: Registry, id: string, waiting: ReadonlyMap<string, string>) => {
  const name = registry[id].secrets.find(secret => waiting.has(secret));
  return name === undefined ? {} : { waiting: { ends: waiting.get(name)! } };
};
/** A tool added from a chat says so, with the requests it counts as reads. */
const chatRow = (registry: Registry, id: string) => registry[id].chat ? { chat: true, reads: reads(registry, id) } : {};
