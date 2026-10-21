// The key list Access shows, worked out from the registered keys and the routes themselves.
import { keyUse } from "./key-use.ts";
import { described, forwards, keyIds, keyTitle, liveOnly, madeBySetup, offered, saved, worksAlone } from "./key-levels.ts";

/** The key list Access shows: never a value, only whether every secret of a key is there. `direct` says a level for
 *  the key also reaches its service directly; a direct-use route is not what makes a key work `alone`. */
export const keyCatalogue = (env: object) => keyIds().map(id => ({
  id, title: keyTitle(id), ...described(id), levels: offered(id), saved: saved(env, id), setup: madeBySetup(id), liveOnly: liveOnly(id),
  alone: worksAlone(id) || keyUse.some(use => !use.apps.length && !use.direct && use.keys.includes(id)),
  direct: forwards(id),
}));
