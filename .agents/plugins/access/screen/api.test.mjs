// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { client, isAdmin, readApps, readPushers, readSetup, readStatus, useAccess } from "./api.mjs";
import { open } from "./seal.mjs";
import { makePair } from "./seal.mjs";
import { html, render } from "./vendor/preact-htm.mjs";
import { settle, waitFor } from "./test-dom.mjs";

afterEach(() => { render(null, document.body); vi.unstubAllGlobals(); });
const base = { ownerEmail: "owner@example.com", viewer: { email: "owner@example.com", owner: true }, environment: "live", key: "ready", started: true, imported: 0,
  keysStarted: true, apps: [], unticked: { people: [], roles: [] }, keys: [], roles: [], people: [], work: [] };
const readable = raw => { try { readStatus(raw); return true; } catch { return false; } };

it("reads why the project can not be handed out as sent, and leaves it out when the project has no such step", () => {
  const status = changes => readStatus({ ...base, ...changes });
  expect(["ready", "key", "setup", "live"].map(project => status({ project }).project)).toEqual(["ready", "key", "setup", "live"]);
  expect(status({}).project).toBeUndefined();
  expect(readable({ ...base, project: "soon" })).toBe(false);
  // Whether a change can be saved through the app is read as sent, and left out otherwise: no step shows.
  expect([...["ready", "key", "setup", "live"].map(projectSave => status({ projectSave }).projectSave), status({}).projectSave]).toEqual(["ready", "key", "setup", "live", undefined]);
  expect(readable({ ...base, projectSave: "soon" })).toBe(false);
});

it("reads whether a key is set up to be used directly as a yes or no, and a status sent without it", () => {
  const key = direct => ({ id: "notion", title: "Notion", levels: ["read", "write"], saved: true, setup: false, alone: false, ...(direct !== undefined && { direct }) });
  expect(readStatus({ ...base, keys: [key(true), key(false), key()] }).keys.map(item => item.direct)).toEqual([true, false, undefined]);
  // The choice a key once carried is no yes or no.
  for (const wrong of [key({ offered: ["read"], mode: "read" }), key("read"), key(null)]) expect(readable({ ...base, keys: [wrong] })).toBe(false);
});

it("reads apps as ticks: a list of apps per person and role, who an update unticked, and what a person holds themselves", () => {
  const person = apps => ({ email: "kim@example.com", status: "active", settled: true, role: null, apps, keys: { stripe: "read" } });
  const read = readStatus({ ...base, apps: [{ id: "orders", title: "Orders", description: "Every order" }], roles: [{ id: "sales", name: "Sales", apps: ["orders"], keys: {} }],
    people: [person(["orders"])], unticked: { people: [{ email: "kim@example.com", apps: ["Orders"] }], roles: [{ name: "Sales", apps: ["Payroll"] }] } });
  expect([read.apps, read.roles[0].apps, read.people[0].apps]).toEqual([[{ id: "orders", title: "Orders", description: "Every order" }], ["orders"], ["orders"]]);
  expect(read.unticked).toEqual({ people: [{ email: "kim@example.com", apps: ["Orders"] }], roles: [{ name: "Sales", apps: ["Payroll"] }] });
  // A status from before apps were ticks is refused: an app with a level, or apps with no word on who was unticked.
  for (const old of [{ people: [person({ orders: "write" })] }, { roles: [{ id: "sales", name: "Sales", apps: { orders: "read" }, keys: {} }] }, { unticked: undefined }]) {
    expect(readable({ ...base, ...old })).toBe(false);
  }
  // What a person holds themselves: the screens they can open, and a level per key.
  const own = readApps({ state: "current", role: "employee", apps: ["orders"], revision: 1, keys: [{ id: "stripe", title: "Stripe", level: "read" }] });
  expect(own).toEqual({ state: "current", role: "employee", manages: undefined, signIn: undefined, apps: ["orders"], revision: 1, code: "off",
    keys: [{ id: "stripe", title: "Stripe", level: "read" }] });
  expect([readApps({ state: "legacy" }), readApps({ state: "not_started", role: "owner", manages: true, apps: [], code: "ready" }).code])
    .toEqual([{ state: "legacy", signIn: undefined, code: "off" }, "ready"]);
  for (const wrong of [null, { state: "soon" }, { state: "current", role: "employee", apps: [] }, { state: "current", role: "boss", apps: [], revision: 1 }]) {
    expect(() => readApps(wrong)).toThrow("Access answer not readable");
  }
});

it("reads a status that leaves out what the project gives no slot for: no apps, no keys, no sign-in list, no Project code", () => {
  const { apps: _apps, keys: _keys, key: _key, unticked: _unticked, ...bare } = base;
  const read = readStatus({ ...bare, started: undefined, imported: undefined, keysStarted: undefined, work: undefined,
    roles: [{ id: "sales", name: "Sales" }], people: [{ email: "kim@example.com", status: "active", settled: true, role: null }] });
  expect([read.apps, read.keys, read.key, read.project]).toEqual([undefined, undefined, undefined, undefined]);
  // A role or person is read with nothing given; the defaults stand in for what an older store does not send.
  expect([read.roles[0], read.people[0].apps, read.people[0].keys]).toEqual([{ id: "sales", name: "Sales", builtIn: undefined, apps: [], keys: {} }, [], {}]);
  expect([read.unticked, read.started, read.imported, read.keysStarted, read.work]).toEqual([{ people: [], roles: [] }, true, 0, true, []]);
  // `none` is no sign-in list too.
  expect(readStatus({ ...base, key: "none" }).key).toBeUndefined();
  for (const wrong of [{ key: "soon" }, { imported: "many" }, { environment: "test" }, { viewer: null }, { startError: 4 }]) expect(readable({ ...base, ...wrong })).toBe(false);
  expect(readStatus({ ...base, startError: null }).startError).toBeNull();
  expect(() => readStatus([])).toThrow("Access answer not readable: status");
});

it("reads the built-in role, a status sent without the mark, and who holds Admin", () => {
  const role = (id, builtIn) => ({ id, name: id, apps: [], keys: {}, ...(builtIn !== undefined && { builtIn }) });
  const read = readStatus({ ...base, roles: [role("admin", true), role("sales", false), role("office")] });
  expect(read.roles.map(item => item.builtIn)).toEqual([true, false, undefined]);
  expect(readable({ ...base, roles: [role("admin", "yes")] })).toBe(false);
  // Holding the built-in role is the whole test: another role, or a person's own set, is not Admin.
  expect(["admin", "sales", "office", null].map(held => isAdmin(read, { role: held }))).toEqual([true, false, false, false]);
});

it("reads the setup message, and who can push on GitHub", () => {
  expect(readSetup({ prompt: { state: "ready", text: "Hi" } })).toEqual({ prompt: { state: "ready", text: "Hi" } });
  expect(readSetup({ prompt: { state: "unavailable" } })).toEqual({ prompt: { state: "unavailable" } });
  expect(() => readSetup({ prompt: { state: "soon" } })).toThrow();
  const pusher = { githubId: 7, login: "kim", email: null, emailSource: null, canOpenPreviews: false };
  expect(readPushers({ state: "listed", pushers: [pusher, { ...pusher, email: "kim@shop.com", emailSource: "commit", canOpenPreviews: true }] }).pushers.map(item => item.email))
    .toEqual([null, "kim@shop.com"]);
  for (const wrong of [{ ...pusher, githubId: "7" }, { ...pusher, emailSource: "guess" }]) expect(() => readPushers({ state: "listed", pushers: [wrong] })).toThrow();
});

it("reads and changes through the API base it is given, and refuses an answer that is not ok", async () => {
  const fetch = vi.fn(async () => Response.json({ state: "legacy" }));
  vi.stubGlobal("fetch", fetch);
  const api = client("/api/team");
  expect(await api.read("apps", readApps)).toEqual({ state: "legacy", signIn: undefined, code: "off" });
  await api.change("people", { email: "kim@shop.com" });
  await api.savePusherEmail(7, "kim@shop.com");
  expect(fetch.mock.calls.map(([url, init]) => [url, init.method ?? "GET", init.redirect])).toEqual([["/api/team/apps", "GET", "error"],
    ["/api/team/people", "POST", "error"], ["/api/team/pushers/7", "PUT", "error"]]);
  expect(fetch.mock.calls[1][1].headers).toEqual({ Origin: window.location.origin, "Content-Type": "application/json" });
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ email: "kim@shop.com" });
  fetch.mockImplementation(async () => Response.json({}, { status: 503 }));
  await expect(api.read("apps", readApps)).rejects.toThrow("Access unavailable");
  await expect(api.change("people", {})).rejects.toThrow("Access change unavailable");
  await expect(api.savePusherEmail(7, "kim@shop.com")).rejects.toThrow("Access change unavailable");
  // The default base is the app's own.
  fetch.mockImplementation(async () => Response.json({ state: "legacy" }));
  await client().read("apps", readApps);
  expect(fetch.mock.calls.at(-1)[0]).toBe("/api/access/apps");
});

it("seals each part of a pasted key on the page, sends only the sealed value and its last four, and says why the app refused", async () => {
  const pair = await makePair();
  const fetch = vi.fn(async url => (url.endsWith("keys/seal") ? Response.json({ publicKey: pair.publicKey }) : new Response(null, { status: 204 })));
  vi.stubGlobal("fetch", fetch);
  await client().sendKey("shop/key", ["first-value-1234", "second-value-5678"]);
  const puts = fetch.mock.calls.filter(([, init]) => init?.method === "PUT");
  expect(puts.map(([url]) => url)).toEqual(["/api/access/keys/shop%2Fkey/0", "/api/access/keys/shop%2Fkey/1"]);
  const bodies = puts.map(([, init]) => JSON.parse(init.body));
  expect(bodies.map(body => body.ends)).toEqual(["1234", "5678"]);
  expect(puts.map(([, init]) => init.body).join("")).not.toContain("first-value");
  expect(await open(JSON.stringify(bodies[0].sealed), pair.privateKey)).toBe("first-value-1234");
  // The words the person sees, by the refusal's code; anything else asks to try again.
  const refuse = (where, code) => fetch.mockImplementation(async url => (url.endsWith("keys/seal") && where === "put" ? Response.json({ publicKey: pair.publicKey })
    : code === "broken" ? new Response("not json", { status: 500 }) : Response.json({ error: { code } }, { status: 409 })));
  for (const [where, code, words] of [["seal", "no_seal", "This app has no lock for keys yet. Ask the assistant to make the pair of locks."],
    ["put", "live_only", "Only the live app takes a key."], ["put", "bad_name", "This key can not be pasted here."], ["put", "broken", "The key was not sent. Try again."],
    ["put", "other", "The key was not sent. Try again."]]) {
    refuse(where, code);
    await expect(client().sendKey("stripe", ["value"])).rejects.toThrow(words);
  }
});

// One read on the page, drawn by a part that shows what the hook gives.
function Reader({ api, path, check, said }) {
  said.current = useAccess(api, path, check);
  return null;
}
// A read is sent once the page has painted: the test answers it only after that.
const sentCount = (transport, times) => waitFor(() => expect(transport).toHaveBeenCalledTimes(times));
const draw = props => render(html`<${Reader} ...${props} />`, document.body);

it("reload and target changes immediately hide stale grants while aborted replies cannot restore them", async () => {
  const allowed = { state: "current", role: "employee", apps: ["hello"], revision: 1, code: "off" };
  let finishOld = () => {};
  let finishCurrent = () => {};
  const transport = vi.fn(async () => Response.json(allowed));
  vi.stubGlobal("fetch", transport);
  const api = client();
  const said = { current: null };
  draw({ api, path: "apps", check: readApps, said });
  await waitFor(() => expect(said.current.data).toMatchObject(allowed));
  transport.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
  said.current.reload(); await settle();
  expect([said.current.data, said.current.error]).toEqual([null, false]);
  await sentCount(transport, 2);
  transport.mockImplementationOnce(() => new Promise(resolve => { finishCurrent = resolve; }));
  draw({ api, path: "other-apps", check: readApps, said }); await settle();
  expect(said.current.data).toBeNull();
  await sentCount(transport, 3);
  finishOld(Response.json(allowed)); await settle(20);
  expect(said.current.data).toBeNull();
  const deselected = { ...allowed, apps: [], revision: 2 };
  finishCurrent(Response.json(deselected));
  await waitFor(() => expect(said.current.data).toMatchObject(deselected));
  // The same route with a changed reader is also a new request, never a cache hit.
  transport.mockImplementationOnce(() => new Promise(resolve => { finishCurrent = resolve; }));
  draw({ api, path: "other-apps", check: raw => readApps(raw), said }); await settle();
  expect(said.current.data).toBeNull();
  await sentCount(transport, 4);
  finishCurrent(Response.json(deselected));
  await waitFor(() => expect(said.current.data).toMatchObject(deselected));
});

it("reload hides a previous failure while obtaining new authoritative permission readback", async () => {
  let finish = () => {};
  const transport = vi.fn(async () => Response.json({}, { status: 403 }));
  vi.stubGlobal("fetch", transport);
  const said = { current: null };
  draw({ api: client(), path: "apps", check: readApps, said });
  await waitFor(() => expect(said.current.error).toBe(true));
  transport.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  said.current.reload(); await settle();
  expect([said.current.error, said.current.data]).toEqual([false, null]);
  await sentCount(transport, 2);
  finish(Response.json({ state: "current", role: "employee", apps: [], revision: 1 }));
  await waitFor(() => expect(said.current.data?.state).toBe("current"));
  expect(said.current.error).toBe(false);
});
