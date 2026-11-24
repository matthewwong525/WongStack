// A set as a page edits it: the apps given, by id, and a level per key (`read` or `write`); None is null, or left out.

/** Nothing given: a new person's or a new role's set. */
export const NOTHING = { apps: [], keys: {} };

const LEVEL = { read: "Read", write: "Read & write" };

/** A key's level as the screens name it. */
export const levelName = level => (level ? LEVEL[level] : "None");
/** The parts of one line, the empty ones left out. */
export const dots = (...parts) => parts.filter(Boolean).join(" · ");
/** The keys Services lists: every registered key but the project's own code, which Access gives as its own ticks. */
export const keyRows = (keys = []) => keys.filter(key => key.id !== "code");
/** A number with its word: `1 app`, `2 apps`, `3 people`. */
export const count = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** `Stripe Read`: a key and its level as one label. */
export const levelLabel = (title, level) => `${title} ${levelName(level)}`;

/** The title of each app a set is given, in the order the apps are shown: one that is no longer built has none. */
export const appLabels = (status, apps) => (status.apps ?? []).filter(app => apps.includes(app.id)).map(app => app.title);

/** One label per key a set holds a level for, in the order the keys are shown. */
export const levelLabels = (status, keys) => (status.keys ?? []).flatMap(key => {
  const level = keys[key.id];
  return level ? [levelLabel(key.title, level)] : [];
});

/** The name of the column that sums up a set: what the project gives, apps, keys or both; null for neither. */
export const setColumn = status => (status.apps && status.keys ? "Apps and keys" : status.apps ? "Apps" : status.keys ? "Keys" : null);

/** What a set comes to on one line of a list: `2 apps, 1 key`, or `No apps`. The built-in role's is `Everything`.
 *  A project with no apps counts keys alone. */
export const summary = (status, set) => {
  if (set.builtIn) return "Everything";
  const keys = levelLabels(status, set.keys).length;
  if (!status.apps) return keys ? count(keys, "key") : "No keys";
  const apps = appLabels(status, set.apps).length;
  return [apps ? count(apps, "app") : "No apps", keys > 0 && count(keys, "key")].filter(Boolean).join(", ");
};

const given = ({ apps, keys }) => JSON.stringify([[...apps].sort(), Object.entries(keys).filter(([, level]) => level).sort()]);
/** Whether two sets give the same thing: the order of the lines, and a level at None, change nothing. */
export const sameSet = (one, other) => given(one) === given(other);

/** Under a key's level, only for a key whose service is set up for it: the level reaches the service itself too. */
export const keyLine = key => (key.direct ? `Also reaches ${key.title} directly` : "");

/** Setup makes some keys itself, for the live app: no step can finish one on a preview, and a key only the live app
 *  may hold never comes to one. The others come by link. */
export const keyState = (key, environment) =>
  key.saved ? "Saved" : environment === "live" ? (key.setup ? "One step left" : "Not saved yet")
    : key.liveOnly ? "Live app only" : "Not on previews yet";

/** Each app as a save names it: given, or not. */
export const ticks = (status, apps) => Object.fromEntries((status.apps ?? []).map(app => [app.id, apps.includes(app.id)]));

/** A level for every key, as a save names them: the one held, or none. */
export const fill = (status, held) => Object.fromEntries((status.keys ?? []).map(key => [key.id, held[key.id] ?? null]));

/** A set as a save sends it: apps and levels only for what the project gives. */
export const sent = (status, set) => ({ ...(status.apps && { apps: ticks(status, set.apps) }), ...(status.keys && { keys: fill(status, set.keys) }) });
