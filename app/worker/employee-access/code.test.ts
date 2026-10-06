import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { keys } from "../keys";
import { appAccess } from "./apps";
import { CODE_GIT, codeGit, codeSource, codeState, codeStep, upstream } from "./code";
import type { ConnectionEnv } from "./core";
import { keyCatalogue, needs } from "./key-catalogue";
import { everyKey, offered, saved, scopedEnv } from "./key-levels";
import { keyUse } from "./key-use";
import { currentPolicy } from "./policy";
import { handleAccess } from "./router";
import { changedSet } from "./sets";
import { setupStatus } from "./setup";
import { body } from "../../tests/body";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtAreas(["access", "orders"]));

const TOKEN = "github_pat_synthetic_read_only_value";
const github = { WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_READ: TOKEN };
const REMOTE = "https://account.artifacts.example.net/git/wongstack/recipe-box.git";
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
/** A Cloudflare-kept project's binding that records every call made on it. */
function artifacts({ remote = REMOTE, plaintext = "art_v1_synthetic_read" } = {}) {
  const calls: unknown[][] = [];
  const binding = new Proxy({}, { get: (_, method: string) => async (...args: unknown[]) => {
    calls.push([method, ...args]);
    // Awaiting the handle asks it for `then`: it has none.
    return new Proxy({}, { get: (_repo, name: string) => name === "then" ? undefined : async (...made: unknown[]) => {
      calls.push([name, ...made]);
      return name === "info" ? { remote } : { plaintext };
    } });
  } });
  return { calls, env: { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: binding } };
}
const git = (path: string, init?: RequestInit) => new Request(`${site.origin}${CODE_GIT}${path}`, init);
const refs = () => git("info/refs?service=git-upload-pack", { headers: { "Git-Protocol": "version=2", Cookie: "CF_Authorization=session", "cf-access-token": "session" } });
const pack = () => git("git-upload-pack", { method: "POST", body: "0011command=fetch", headers: { "Content-Type": "application/x-git-upload-pack-request", "Content-Encoding": "gzip", Accept: "application/x-git-upload-pack-result" } });
const code = async (response: Response) => (await body(response)).error.code;
let f: ReturnType<typeof fixture>;
let env: ConnectionEnv;
let fetched: ReturnType<typeof vi.fn>;
const give = (email: string) => f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, 'code', 'read', 1)").run(site.installationId, email);

beforeEach(() => {
  f = fixture();
  env = { ...f.env, ...github };
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  fetched = vi.fn(async () => new Response("001e# service=git-upload-pack\n", { headers: { "Content-Type": "application/x-git-upload-pack-advertisement",
    "Set-Cookie": "upstream=session", "WWW-Authenticate": "Basic realm=upstream", "Content-Encoding": "identity" } }));
  vi.stubGlobal("fetch", fetched);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); });

it("registers Project code as a key with Read alone, offered with no app, that no route lists and no app tick gives", () => {
  expect(keys.code).toEqual({ title: "Project code", secrets: ["WONG_CODE_READ"], levels: ["read"], alone: true, bindings: ["ARTIFACTS"] });
  expect([offered("code"), everyKey().get("code")]).toEqual([["read"], "read"]);
  expect(keyUse.some(use => use.keys.includes("code"))).toBe(false);
  expect(needs(["orders", "hello", "access"]).has("code")).toBe(false);
  expect(changedSet({ apps: {}, keys: {} }, { apps: { orders: "read" } }).keys).toEqual({});
  // Saved follows whether the project can be handed out: a Cloudflare-kept one needs no secret.
  const row = (bindings: object) => keyCatalogue(bindings, {}).find(key => key.id === "code");
  expect(row({})).toEqual({ id: "code", title: "Project code", levels: ["read"], saved: false, setup: false, usedBy: [], alone: true });
  expect([row(github)!.saved, row(artifacts().env)!.saved, saved({ WONG_CODE_READ: TOKEN }, "code")]).toEqual([true, true, false]);
  // No route is handed the credential or the binding, even one that lists the key.
  const all = { DB: {}, ...github, ARTIFACTS: {}, WONG_CLOUDFLARE_READ: "look-up" };
  expect(scopedEnv(all, [])).toEqual({ DB: {}, WONG_CODE_REPOSITORY: "acme/recipe-box" });
  expect(scopedEnv(all, ["code", "cloudflare"])).toEqual({ DB: {}, WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CLOUDFLARE_READ: "look-up" });
});

it("finds where the project is kept without calling anything, and refuses a name or a place it can not trust", async () => {
  expect(codeSource(github)).toEqual({ github: "acme/recipe-box", token: TOKEN });
  expect(await upstream(github)).toEqual({ url: "https://github.com/acme/recipe-box.git", authorization: `Basic ${btoa(`x-access-token:${TOKEN}`)}` });
  for (const bad of [{}, { ...github, WONG_CODE_READ: " " }, { ...github, WONG_CODE_READ: 7 }, { ...github, WONG_CODE_REPOSITORY: "recipe-box" },
    { ...github, WONG_CODE_REPOSITORY: "acme/../other" }, { ...github, WONG_CODE_REPOSITORY: "https://github.com/acme/recipe-box" },
    { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: null }, { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: "binding" }, { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: {} },
    { ...artifacts().env, WONG_CODE_REPOSITORY: "other/recipe-box" }]) {
    expect([codeSource(bad), await upstream(bad)]).toEqual([null, null]);
  }
  expect(fetched).not.toHaveBeenCalled();
  // A Cloudflare-kept project: the one recorded repository, and a short-lived read token. Nothing else is asked of the binding.
  const kept = artifacts();
  expect(codeSource(kept.env)).toMatchObject({ name: "recipe-box" });
  expect(kept.calls).toEqual([]);
  expect(await upstream(kept.env)).toEqual({ url: REMOTE, authorization: "Bearer art_v1_synthetic_read" });
  expect(kept.calls).toEqual([["get", "recipe-box"], ["info"], ["createToken", "read", 300]]);
  for (const broken of [artifacts({ remote: "http://account.artifacts.example.net/git/wongstack/recipe-box.git" }), artifacts({ remote: "https://user:pass@account.artifacts.example.net/x.git" }),
    artifacts({ remote: `${REMOTE}?token=1` }), artifacts({ remote: `${REMOTE}#main` }), artifacts({ remote: "not an address" }), artifacts({ plaintext: "" })]) {
    expect(await upstream(broken.env)).toBeNull();
  }
  expect(await upstream({ WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: { get: async () => { throw new Error("NOT_FOUND"); } } })).toBeNull();
  // The binding wins when both are there: a Cloudflare-kept project never falls back to a GitHub token.
  expect(codeSource({ ...kept.env, WONG_CODE_READ: TOKEN })).toMatchObject({ name: "recipe-box" });
});

it("says why the project can not be handed out yet: a missing GitHub key, or no project recorded", () => {
  // A Cloudflare-kept project needs no key, and GitHub with its token is ready too.
  expect([codeStep(artifacts().env), codeStep(github)]).toEqual(["ready", "ready"]);
  // GitHub with no token, an empty one, or one that is no text: the key is the step left.
  for (const waiting of [{ WONG_CODE_REPOSITORY: "acme/recipe-box" }, { ...github, WONG_CODE_READ: " " }, { ...github, WONG_CODE_READ: 7 }]) expect(codeStep(waiting)).toBe("key");
  // No repository, or a name the app does not trust: setup has a step left, and a token changes nothing.
  for (const unset of [{}, { WONG_CODE_READ: TOKEN }, { ...github, WONG_CODE_REPOSITORY: "acme/../other" }, { ...github, WONG_CODE_REPOSITORY: "https://github.com/acme/recipe-box" },
    { ...github, WONG_CODE_REPOSITORY: "recipe-box" }, { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: {} }, { WONG_CODE_REPOSITORY: 7 }]) expect(codeStep(unset)).toBe("setup");
  expect(fetched).not.toHaveBeenCalled();
});

it("forwards Git's two read calls with the server's credential added, and returns only what Git reads", async () => {
  const listed = await codeGit(refs(), env);
  expect([listed.status, await listed.text()]).toEqual([200, "001e# service=git-upload-pack\n"]);
  expect([...listed.headers]).toEqual([["cache-control", "no-store"], ["content-type", "application/x-git-upload-pack-advertisement"]]);
  const [address, sent] = fetched.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }];
  expect(address).toBe("https://github.com/acme/recipe-box.git/info/refs?service=git-upload-pack");
  expect([sent.method, sent.redirect, sent.body]).toEqual(["GET", "manual", null]);
  // The person's own session never goes to where the project is kept.
  expect(sent.headers).toEqual({ "Git-Protocol": "version=2", Authorization: `Basic ${btoa(`x-access-token:${TOKEN}`)}`, "User-Agent": "git/WongStack-project-code" });

  fetched.mockImplementationOnce(async () => new Response("0008NAK\n"));
  const packed = await codeGit(pack(), artifacts().env);
  expect([packed.status, await packed.text(), [...packed.headers]]).toEqual([200, "0008NAK\n", [["cache-control", "no-store"], ["content-type", "text/plain;charset=UTF-8"]]]);
  const [target, posted] = fetched.mock.calls[1] as [string, RequestInit & { headers: Record<string, string> }];
  expect(target).toBe(`${REMOTE}/git-upload-pack`);
  expect(posted.headers).toEqual({ "Content-Type": "application/x-git-upload-pack-request", Accept: "application/x-git-upload-pack-result", "Content-Encoding": "gzip",
    Authorization: "Bearer art_v1_synthetic_read", "User-Agent": "git/WongStack-project-code" });
  expect(await new Response(posted.body).text()).toBe("0011command=fetch");
  // A body with no type comes back with none.
  fetched.mockImplementationOnce(async () => new Response(new Uint8Array([1])));
  expect([...(await codeGit(refs(), env)).headers]).toEqual([["cache-control", "no-store"]]);
});

it("refuses every way to publish before anything is asked of where the project is kept", async () => {
  for (const request of [git("info/refs?service=git-receive-pack"), git("git-receive-pack", { method: "POST", body: "0000" }), git("info/refs"),
    git("info/refs?service=git-upload-pack&extra=1"), git("git-upload-pack"), git("info/refs?service=git-upload-pack", { method: "POST", body: "" }),
    git("HEAD"), git("objects/info/packs"), git("git-upload-pack", { method: "PUT", body: "" }), git("")]) {
    const refused = await codeGit(request, env);
    expect([refused.status, refused.headers.get("Content-Type"), await refused.text()], request.url)
      .toEqual([403, "text/plain; charset=utf-8", "This copy is for reading. Your employer grants publishing where the project is kept.\n"]);
  }
  expect(fetched).not.toHaveBeenCalled();
});

it("answers code_unavailable, with none of the upstream's words, when the place the project is kept refuses or fails", async () => {
  for (const status of [301, 302, 401, 403, 404, 500]) {
    fetched.mockImplementationOnce(async () => new Response(`upstream secret ${TOKEN}`, { status, headers: { Location: "https://elsewhere.example.com/", "WWW-Authenticate": "Basic" } }));
    const answer = await codeGit(refs(), env);
    const text = await answer.clone().text();
    expect([answer.status, await code(answer), text.includes("upstream"), text.includes(TOKEN), answer.headers.get("WWW-Authenticate"), answer.headers.get("Location")], String(status))
      .toEqual([503, "code_unavailable", false, false, null, null]);
  }
  fetched.mockImplementationOnce(async () => new Response(null, { status: 404 }));
  expect(await code(await codeGit(refs(), env))).toBe("code_unavailable");
  fetched.mockImplementationOnce(async () => { throw new Error(`network ${TOKEN}`); });
  expect(await code(await codeGit(pack(), env))).toBe("code_unavailable");
  // Not ready, or a binding that does not answer: nothing is fetched.
  const calls = fetched.mock.calls.length;
  for (const bindings of [{ ...env, WONG_CODE_READ: "" }, artifacts({ plaintext: "" }).env]) expect(await code(await codeGit(refs(), bindings))).toBe("code_unavailable");
  expect(fetched.mock.calls.length).toBe(calls);
});

it("hands the project only to a person who holds Project code now, judged before any upstream call", async () => {
  const holder = { ...employee, id: "holder@example.com", claims: { ...employee.claims, email: "holder@example.com", sub: "holder" } };
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, holder.id);
  give(holder.id);
  const read = (identity: AccessIdentity | null, bindings = env) => handleAccess(refs(), bindings, identity);
  for (const identity of [owner, holder]) expect([(await read(identity)).status, (await handleAccess(pack(), env, identity)).status], identity.id).toEqual([200, 200]);
  expect(fetched).toHaveBeenCalledTimes(4);
  // On a preview the checker stands in for the owner; on the live app a machine is no person.
  expect((await read(machine, { ...env, WONG_ENVIRONMENT: "staging" })).status).toBe(200);
  fetched.mockClear();
  const refusals: [string, AccessIdentity | null, ConnectionEnv, number, string][] = [
    ["a person without Project code", employee, env, 403, "forbidden"],
    ["the service token on the live app", machine, env, 403, "forbidden"],
    ["a sign-in with no verified person", { ...owner, claims: { ...owner.claims, sub: "" } }, env, 403, "forbidden"],
    ["an install with no recorded owner", owner, { ...env, WONG_OWNER_EMAIL: undefined }, 503, "code_unavailable"],
    ["an install that can not hand the project out", owner, { ...env, WONG_CODE_READ: undefined }, 503, "code_unavailable"],
    ["unreadable permissions", owner, { ...env, DB: undefined }, 503, "unavailable"],
  ];
  for (const [name, identity, bindings, status, error] of refusals) {
    const refused = await read(identity, bindings);
    expect([refused.status, await code(refused)], name).toEqual([status, error]);
  }
  const lacking = await read(employee);
  expect((await body(lacking)).error.message).toBe("Project code: Read needed");
  // Unticked, the next call is refused; removed, the person is denied whole.
  f.sql.prepare("DELETE FROM wong_access_key_grants WHERE email = ?").run(holder.id);
  expect((await read(holder)).status).toBe(403);
  give(holder.id);
  f.sql.prepare("UPDATE wong_access_members SET status = 'removed' WHERE email = ?").run(holder.id);
  expect([(await read(holder)).status, (await handleAccess(pack(), env, holder)).status]).toEqual([403, 403]);
  // Until key levels start, and before permissions start, nobody is handed the project through a level.
  f.sql.prepare("UPDATE wong_access_members SET status = 'active' WHERE email = ?").run(holder.id);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect(await code(await read(holder))).toBe("code_unavailable");
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  for (const identity of [owner, holder]) expect(await code(await read(identity))).toBe("code_unavailable");
  expect(fetched).not.toHaveBeenCalled();
});

it("tells setup and the home page who may connect: ready, lacked, or off for everyone", async () => {
  give(employee.id);
  const setup = async (identity: AccessIdentity, bindings = env) => body<{ code: string; prompt: { state: string; text: string } }>(await setupStatus(new Request(`${site.origin}/api/access/setup`), bindings, identity));
  const apps = async (identity: AccessIdentity | null, bindings = env) => (await body(await appAccess(new Request(`${site.origin}/api/access/apps`), bindings, identity))).code;
  const lacker = { ...employee, id: "lacker@example.com", claims: { ...employee.claims, email: "lacker@example.com", sub: "lacker" } };
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, lacker.id);
  const today = await setup(employee, f.env);
  // Off: today's apps-only text, for every signed-in person, the one who lacks Project code included.
  expect([today.code, (await setup(lacker, f.env)).prompt, await apps(lacker, f.env)]).toEqual(["off", today.prompt, "off"]);
  for (const identity of [owner, employee]) {
    const ready = await setup(identity);
    expect([ready.code, await apps(identity)], identity.id).toEqual(["ready", "ready"]);
    if (today.prompt.state === "ready") expect([ready.prompt.text.includes("bootstrap.mjs install --origin"), ready.prompt.text === today.prompt.text]).toEqual([true, false]);
  }
  // Lacked: no prompt at all, and the words that send them to their admin.
  expect([(await setup(lacker)).code, (await setup(lacker)).prompt, await apps(lacker)])
    .toEqual(["lacked", { state: "unavailable", message: "Ask your admin for access to Connect your assistant." }, "lacked"]);
  expect([await apps(machine), await apps(machine, { ...env, WONG_ENVIRONMENT: "staging" })]).toEqual(["lacked", "ready"]);
  // Before key levels start, before permissions start, and with no recorded owner: off for everyone.
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect([await apps(lacker), (await setup(lacker)).code]).toEqual(["off", "off"]);
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect([await apps(owner), await apps(lacker), await apps(owner, { ...env, WONG_OWNER_EMAIL: undefined })]).toEqual(["off", "off", "off"]);
  expect(codeState(env, await currentPolicy({ ...env, DB: undefined }, owner), true)).toBe("off");
});
