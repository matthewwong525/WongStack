// The page's client for the Access API: each read checked by hand before a screen sees it, and each change sent with
// the page's origin. No key's value is ever read; the server checks who is asking again on every change.
import { useEffect, useMemo, useState } from "./vendor/preact-htm.mjs";
import { seal } from "./seal.mjs";

const wrong = what => { throw new Error(`Access answer not readable: ${what}`); };
const isObject = value => typeof value === "object" && value !== null && !Array.isArray(value);
const object = (value, what) => (isObject(value) ? value : wrong(what));
const text = (value, what) => (typeof value === "string" ? value : wrong(what));
const flag = (value, what) => (typeof value === "boolean" ? value : wrong(what));
const maybe = (value, check, what) => (value === undefined ? undefined : check(value, what));
const list = (value, what, each = text) => (Array.isArray(value) ? value.map((item, at) => each(item, `${what}[${at}]`)) : wrong(what));
const oneOf = (words, value, what) => (words.includes(value) ? value : wrong(what));
const LEVELS = ["read", "write"];
const level = (value, what) => oneOf(LEVELS, value, what);
const levels = (value, what) => Object.fromEntries(Object.entries(object(value, what)).map(([id, held]) => [id, level(held, `${what}.${id}`)]));
const PROJECT = ["ready", "key", "setup", "live"];
const project = (value, what) => oneOf(PROJECT, value, what);

/** Who may connect an assistant: `ready` installs the project, `lacked` greys Connect, `off` or none: apps only. */
const code = value => (value === undefined ? "off" : oneOf(["ready", "lacked", "off"], value, "code"));
const signIn = value => maybe(value, flag, "signIn");

/** The apps answer: `legacy` has no recorded owner, `not_started` keeps every app, `current` lists the person's apps
 *  and their own level per saved key. `manages`: the owner or an Admin. */
export function readApps(raw) {
  const answer = object(raw, "apps");
  const state = oneOf(["legacy", "not_started", "current"], answer.state, "state");
  if (state === "legacy") return { state, signIn: signIn(answer.signIn), code: code(answer.code) };
  const role = oneOf(["owner", "employee"], answer.role, "role");
  const base = { state, role, manages: maybe(answer.manages, flag, "manages"), signIn: signIn(answer.signIn), code: code(answer.code), apps: list(answer.apps, "apps") };
  if (state === "not_started") return base;
  if (!Number.isFinite(answer.revision)) wrong("revision");
  const keys = maybe(answer.keys, (value, what) => list(value, what, (key, at) => {
    const item = object(key, at);
    return { id: text(item.id, `${at}.id`), title: text(item.title, `${at}.title`), level: level(item.level, `${at}.level`) };
  }), "keys");
  return { ...base, revision: answer.revision, keys };
}

/** The viewer's own setup message, read only to fold it into a welcome note. */
export function readSetup(raw) {
  const answer = object(raw, "setup");
  const prompt = object(answer.prompt, "prompt");
  if (prompt.state === "ready") return { prompt: { state: "ready", text: text(prompt.text, "prompt.text") } };
  return { prompt: { state: oneOf(["unavailable"], prompt.state, "prompt.state") } };
}

const app = (value, what) => {
  const item = object(value, what);
  return { id: text(item.id, `${what}.id`), title: text(item.title, `${what}.title`), description: text(item.description ?? "", `${what}.description`) };
};
const key = (value, what) => {
  const item = object(value, what);
  const yes = name => maybe(item[name], flag, `${what}.${name}`);
  const word = name => maybe(item[name], text, `${what}.${name}`);
  return { id: text(item.id, `${what}.id`), title: text(item.title, `${what}.title`), levels: list(item.levels, `${what}.levels`, level),
    saved: flag(item.saved, `${what}.saved`), setup: flag(item.setup ?? false, `${what}.setup`), alone: flag(item.alone ?? false, `${what}.alone`),
    liveOnly: yes("liveOnly"), direct: yes("direct"), purpose: word("purpose"), docs: word("docs"), chat: yes("chat"),
    reads: maybe(item.reads, list, `${what}.reads`), parts: maybe(item.parts, list, `${what}.parts`),
    waiting: maybe(item.waiting, (waiting, at) => ({ ends: text(object(waiting, at).ends, `${at}.ends`) }), `${what}.waiting`) };
};
// A role's or a person's set: apps and key levels, empty when the project gives no apps or keys.
const set = (item, what) => ({ apps: maybe(item.apps, list, `${what}.apps`) ?? [], keys: maybe(item.keys, levels, `${what}.keys`) ?? {} });
const role = (value, what) => {
  const item = object(value, what);
  return { id: text(item.id, `${what}.id`), name: text(item.name, `${what}.name`), builtIn: maybe(item.builtIn, flag, `${what}.builtIn`), ...set(item, what) };
};
const person = (value, what) => {
  const item = object(value, what);
  return { email: text(item.email, `${what}.email`), status: oneOf(["active", "removed"], item.status, `${what}.status`),
    settled: flag(item.settled, `${what}.settled`), role: item.role === null ? null : text(item.role, `${what}.role`), ...set(item, what) };
};
const named = field => (value, what) => {
  const item = object(value, what);
  return { [field]: text(item[field], `${what}.${field}`), apps: list(item.apps, `${what}.apps`) };
};
const work = (value, what) => {
  const item = object(value, what);
  return { kind: oneOf(["policy", "sessions"], item.kind, `${what}.kind`), status: oneOf(["pending", "ready", "failed"], item.status, `${what}.status`) };
};

/** The whole Access status. A part the project has no slot for is left out, and its section hides: no `apps`, no
 *  ticks; no `keys`, no levels; no `key` or `key: 'none'`, no sign-in state; no `project`, no Project code step. */
export function readStatus(raw) {
  const status = object(raw, "status");
  const viewer = object(status.viewer, "viewer");
  const apps = maybe(status.apps, (value, what) => list(value, what, app), "apps");
  const unticked = status.unticked === undefined && !apps ? { people: [], roles: [] } : object(status.unticked, "unticked");
  if (!Number.isFinite(status.imported ?? 0)) wrong("imported");
  return {
    ownerEmail: text(status.ownerEmail, "ownerEmail"), environment: oneOf(["live", "practice"], status.environment, "environment"),
    viewer: { email: text(viewer.email, "viewer.email"), owner: flag(viewer.owner, "viewer.owner") },
    // `none`, like no `key` at all: the project keeps no sign-in list, so no row has a sign-in state.
    key: status.key === "none" ? undefined : maybe(status.key, (value, what) => oneOf(["ready", "missing", "practice"], value, what), "key"),
    started: flag(status.started ?? true, "started"), imported: status.imported ?? 0,
    startError: status.startError === null ? null : maybe(status.startError, text, "startError"),
    keysStarted: flag(status.keysStarted ?? true, "keysStarted"),
    apps, keys: maybe(status.keys, (value, what) => list(value, what, key), "keys"),
    unticked: { people: list(unticked.people, "unticked.people", named("email")), roles: list(unticked.roles, "unticked.roles", named("name")) },
    roles: list(status.roles, "roles", role), people: list(status.people, "people", person), work: list(status.work ?? [], "work", work),
    project: maybe(status.project, project, "project"), projectSave: maybe(status.projectSave, project, "projectSave"),
  };
}

/** Who can push to the project on GitHub, each let in to previews alone, and why none are listed. */
export function readPushers(raw) {
  const answer = object(raw, "pushers");
  return { state: oneOf(["listed", "unavailable", "no_github", "not_github", "not_started", "live_only"], answer.state, "state"),
    split: maybe(answer.split, flag, "split"),
    pushers: list(answer.pushers, "pushers", (value, what) => {
      const item = object(value, what);
      if (!Number.isFinite(item.githubId)) wrong(`${what}.githubId`);
      return { githubId: item.githubId, login: text(item.login, `${what}.login`), email: item.email === null ? null : text(item.email, `${what}.email`),
        emailSource: item.emailSource === null ? null : oneOf(["owner", "profile", "commit"], item.emailSource, `${what}.emailSource`),
        canOpenPreviews: flag(item.canOpenPreviews, `${what}.canOpenPreviews`) };
    }) };
}

/** Whether a person holds the built-in Admin role. */
export const isAdmin = (status, person) => status.roles.some(item => item.builtIn && item.id === person.role);

/** Why a pasted key was not sent, in words for the person. */
const KEY_REFUSALS = new Map([
  ["no_seal", "This app has no lock for keys yet. Ask the assistant to make the pair of locks."],
  ["live_only", "Only the live app takes a key."],
  ["bad_name", "This key can not be pasted here."],
]);

/** The client for one API base, such as `/api/access/`: reads, changes, a pusher's email, and a key sent sealed. */
export function client(base = "/api/access/") {
  const root = base.endsWith("/") ? base : `${base}/`;
  const send = (path, method, body) => fetch(`${root}${path}`, { method, redirect: "error",
    headers: { Origin: window.location.origin, "Content-Type": "application/json" }, body: JSON.stringify(body ?? {}) });
  const refused = async response => {
    const answer = await response.json().catch(() => null);
    const said = isObject(answer) && isObject(answer.error) ? answer.error.code : undefined;
    return new Error(KEY_REFUSALS.get(String(said)) ?? "The key was not sent. Try again.");
  };
  return {
    async read(path, check, signal) {
      const response = await fetch(`${root}${path}`, { signal, cache: "no-store", redirect: "error" });
      if (!response.ok) throw new Error("Access unavailable");
      return check(await response.json());
    },
    async change(path, body) {
      const response = await send(path, "POST", body);
      if (!response.ok) throw new Error("Access change unavailable");
    },
    /** The owner or an Admin types a pusher's email; the server checks again who is asking. */
    async savePusherEmail(githubId, email) {
      const response = await send(`pushers/${githubId}`, "PUT", { email });
      if (!response.ok) throw new Error("Access change unavailable");
    },
    /** Seals each part of a key on this page with the publish's public key, then sends it to the key's place in the
     *  app: the value never leaves the page unsealed. Throws the words to show when the app refuses. */
    async sendKey(id, values) {
      const lock = await fetch(`${root}keys/seal`, { cache: "no-store", redirect: "error" });
      if (!lock.ok) throw await refused(lock);
      const publicKey = text(object(await lock.json(), "seal").publicKey, "publicKey");
      for (const [part, value] of values.entries()) {
        const sealed = JSON.parse(await seal(value, publicKey));
        const response = await send(`keys/${encodeURIComponent(id)}/${part}`, "PUT", { sealed, ends: value.slice(-4) });
        if (!response.ok) throw await refused(response);
      }
    },
  };
}

/** One read kept current: a new path, check or reload hides the previous answer at once, and only this exact request's
 *  answer shows. `api` is the page's client. */
export function useAccess(api, path, check) {
  const [revision, refresh] = useState(0);
  const key = useMemo(() => ({ path, check, revision }), [path, check, revision]);
  const [state, setState] = useState({ key: null, data: null, error: false });
  useEffect(() => {
    const controller = new AbortController();
    api.read(key.path, key.check, controller.signal).then(
      data => { if (!controller.signal.aborted) setState({ key, data, error: false }); },
      () => { if (!controller.signal.aborted) setState({ key, data: null, error: true }); },
    );
    return () => controller.abort();
  }, [key]);
  const current = state.key === key;
  return { data: current ? state.data : null, error: current && state.error, reload: () => refresh(value => value + 1) };
}
