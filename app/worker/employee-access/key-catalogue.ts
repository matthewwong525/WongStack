// The key list Access shows, worked out from the registered keys and the routes themselves.
import { keyUse } from "./key-use.ts";
import { forwards, keyIds, keyTitle, madeBySetup, offered, saved, worksAlone } from "./key-levels.ts";

/** The key list Access shows: never a value, only whether every secret of a key is there. `direct` says the key's
 *  service is set up, so a level for the key also reaches the service directly. A direct-use route is not what
 *  makes a key work `alone`: `direct` says that. */
export const keyCatalogue = (env: object) => keyIds().map(id => ({
  id, title: keyTitle(id), levels: offered(id), saved: saved(env, id), setup: madeBySetup(id),
  alone: worksAlone(id) || keyUse.some(use => !use.apps.length && !use.direct && use.keys.includes(id)),
  direct: forwards(id),
}));
