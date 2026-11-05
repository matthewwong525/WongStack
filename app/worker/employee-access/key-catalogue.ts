// The key list Access shows, worked out from the registered keys and the routes themselves.
import { keyUse } from "./key-use.ts";
import { described, forwards, keyIds, keyTitle, liveOnly, madeBySetup, offered, reads, registryOf, saved, worksAlone, type Registry } from "./key-levels.ts";

/** The key list Access shows: never a value, only whether every secret of a key is there. `direct` says a level for
 *  the key also reaches its service directly; a direct-use route is not what makes a key work `alone`. */
export const keyCatalogue = (env: object) => {
  const registry = registryOf(env);
  return keyIds(registry).map(id => ({
    id, title: keyTitle(registry, id), ...described(registry, id), levels: offered(registry, id), saved: saved(env, id),
    setup: madeBySetup(registry, id), liveOnly: liveOnly(registry, id),
    alone: worksAlone(registry, id) || keyUse.some(use => !use.apps.length && !use.direct && use.keys.includes(id)),
    direct: forwards(registry, id), ...chatRow(registry, id),
  }));
};
/** A tool added from a chat says so, with the requests it counts as reads. */
const chatRow = (registry: Registry, id: string) => registry[id].chat ? { chat: true, reads: reads(registry, id) } : {};
