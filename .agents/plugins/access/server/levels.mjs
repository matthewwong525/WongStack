// What the key registry means to Access: titles, levels, and which keys a person holds. A request's registry is the
// project's keys (the `keys` slot) plus the tools added from a chat, the project's keys winning.

/** Whether a person sends a key's secrets: never one setup makes or the server's own route uses. */
export const pasted = key => !key.setup && !key.alone;

export const keyIds = registry => Object.keys(registry);
export const registered = (registry, id) => Object.hasOwn(registry, id);
export const keyTitle = (registry, id) => registry[id].title;
export const madeBySetup = (registry, id) => registry[id].setup === true;
/** A key only the live app may hold: a preview never gets it. */
export const liveOnly = (registry, id) => registry[id].liveOnly === true;
/** A key the server's own route uses: it works with no app. */
export const worksAlone = (registry, id) => registry[id].alone === true;
/** The levels a key offers, lowest first. Every key offers Read. */
export const offered = (registry, id) => registry[id].levels ?? ['read', 'write'];
/** Whether a key's service is set up to be used directly through the app. */
export const forwards = (registry, id) => registry[id].forward !== undefined;
/** What a key is for, and its service's API guide when it is used directly. */
export const described = (registry, id) => ({ purpose: registry[id].purpose, ...(registry[id].docs && { docs: registry[id].docs }) });
/** What a tool added from a chat counts as reads beyond GET and HEAD: its look-ups. */
export const reads = (registry, id) => registry[id].forward?.lookups ?? [];
export const levelName = level => level === 'read' ? 'Read' : 'Read & write';
/** Read & write covers everything; Read covers looking up. */
export const holds = (level, need) => level === 'write' || level === need;
/** The tools added from a chat alone. */
export const chatTools = registry => Object.fromEntries(Object.entries(registry).filter(([, key]) => key.chat));

/** Every key at its highest level: the owner, an Admin, and a machine the wall admits. */
export const everyKey = registry => new Map(keyIds(registry).map(id => [id, offered(registry, id).at(-1)]));

/** Stored levels as they count now: an unregistered key is ignored, and a level a key does not offer reads as Read. */
export const heldLevels = (registry, stored) => new Map(Object.entries(stored)
  .filter(([id]) => registered(registry, id)).map(([id, level]) => [id, offered(registry, id).includes(level) ? level : 'read']));

/** A key is saved when the project says so, or when every one of its secrets has a value. Only this yes or no leaves
 *  the server. */
export const saved = (registry, secret, id) => registered(registry, id) && (typeof registry[id].saved === 'boolean'
  ? registry[id].saved : registry[id].secrets.every(name => { const value = secret(name); return typeof value === 'string' && value !== ''; }));

/** The key list Access shows: never a value or a secret's name. `direct`: a level also reaches the service directly.
 *  `waiting`: secrets sent to the app, by name, with their last four. */
export const keyCatalogue = (registry, secret, waiting) => keyIds(registry).map(id => ({
  id, title: keyTitle(registry, id), ...described(registry, id), levels: offered(registry, id), saved: saved(registry, secret, id),
  parts: parts(registry[id]), ...waitingRow(registry, id, waiting),
  setup: madeBySetup(registry, id), liveOnly: liveOnly(registry, id),
  alone: worksAlone(registry, id) || registry[id].routeAlone === true,
  direct: forwards(registry, id), ...chatRow(registry, id),
}));
/** What Access's paste box asks for, one label per secret in the key's order; none for a key no person sends. */
const parts = key => !pasted(key) ? [] : key.secrets.map((name, at) => key.forward?.exchange
  ? name === key.forward.secret ? 'Secret' : 'ID' : key.secrets.length === 1 ? 'Key' : `Part ${at + 1}`);
/** The first of a key's secrets that waits for the next publish, its own secret before its ID, and its last four. */
const waitingRow = (registry, id, waiting) => {
  const name = registry[id].secrets.find(secret => waiting.has(secret));
  return name === undefined ? {} : { waiting: { ends: waiting.get(name) } };
};
/** A tool added from a chat says so, with the requests it counts as reads. */
const chatRow = (registry, id) => registry[id].chat ? { chat: true, reads: reads(registry, id) } : {};
