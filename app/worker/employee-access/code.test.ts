import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access";
import { keys } from "../keys";
import { appAccess } from "./apps";
import { CODE_CHANGE } from "./change";
import { CODE_GIT, NOT_SET_UP, codeGit, codeSource, codeState, codeStep, saveSource, saveStep, savedBranch, upstream } from "./code";
import type { ConnectionEnv } from "./core";
import { keyCatalogue } from "./key-catalogue";
import { everyKey, offered, saved, scopedEnv } from "./key-levels";
import { keyUse } from "./key-use";
import { currentPolicy } from "./policy";
import { handleAccess } from "./router";
import { changedSet } from "./sets";
import { businessName, setupMessage } from "./prompt";
import { setupStatus } from "./setup";
import { body } from "../../tests/body";
import { fakeArtifacts, fakeEnv } from "../../tests/env";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders"]));

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
const WIDE = "github_pat_synthetic_wide_value";
const saving = { WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_WRITE: WIDE };
const CHECKS = { get: async () => ({}) };
const NEVER = "The app saves a change and never publishes. Push one branch that is not main.\n";
const [OLD, NEW] = ["1".repeat(40), "a".repeat(40)];
const CAPS = "report-status side-band-64k agent=git/2.43.0";
const pkt = (line: string) => `${(line.length + 4).toString(16).padStart(4, "0")}${line}`;
/** A push's ref updates as Git sends them: its capabilities after the first, then a flush packet. */
const updates = (lines: string[], caps = CAPS) => `${lines.map((line, at) => pkt(at ? line : `${line}\0${caps}`)).join("")}0000`;
const to = (ref: string, oid = NEW) => `${OLD} ${oid} ${ref}`;
const PACK = "PACK\u0000\u0000\u0000\u0002 the commits";
const push = (sent: BodyInit | null = `${updates([to("refs/heads/kim/fix")])}${PACK}`, headers: Record<string, string> = { "Content-Type": "application/x-git-receive-pack-request" }) => {
  const init = { method: "POST", body: sent, headers, duplex: "half" };
  return git("git-receive-pack", init);
};
const chunks = (...parts: string[]) => new ReadableStream<Uint8Array>({ start(controller) { for (const part of parts) controller.enqueue(new TextEncoder().encode(part)); controller.close(); } });
// Where the project is kept, standing in: GitHub's API names the published branch,
// and Git's address takes the push.
const kept = (answer: () => Response = () => new Response(`${pkt("unpack ok\n")}${pkt("ok refs/heads/kim/fix\n")}0000`, { headers: { "Content-Type": "application/x-git-receive-pack-result", "Set-Cookie": "upstream=1" } })) =>
  fetched.mockImplementation(async (address: string) => address.startsWith("https://api.github.com/")
    ? address.includes("/acme/down") ? new Response("down", { status: 500 }) : Response.json({ default_branch: address.includes("/acme/trunk-box") ? "trunk" : "main" })
    : answer());
const gitCalls = () => fetched.mock.calls.filter(([address]) => !String(address).startsWith("https://api.github.com/")) as [string, RequestInit & { headers: Record<string, string> }][];
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

it("registers Project code as a key with Read to install and Write to publish, offered with no app, that no route lists and no app tick gives", () => {
  expect(keys.code).toEqual({ title: "Project code", purpose: "This project's own code, to install it and save changes", secrets: ["WONG_CODE_READ", "WONG_CODE_WRITE"], levels: ["read", "write"], alone: true, bindings: ["ARTIFACTS", "CODE_CHECKS"],
    liveOnly: true });
  expect([offered("code"), everyKey().get("code")]).toEqual([["read", "write"], "write"]);
  expect(keyUse.some(use => use.keys.includes("code"))).toBe(false);
  expect(changedSet({ apps: [], keys: {} }, { apps: { orders: true } })).toEqual({ apps: ["orders"], keys: {} });
  // Saved follows whether the project can be handed out: a Cloudflare-kept one needs no secret.
  const row = (bindings: object) => keyCatalogue(bindings).find(key => key.id === "code");
  expect(row({})).toEqual({ id: "code", title: "Project code", purpose: "This project's own code, to install it and save changes", levels: ["read", "write"], saved: false, setup: false, liveOnly: true, alone: true, direct: false });
  expect([row(github)!.saved, row(saving)!.saved, row(artifacts().env)!.saved, saved({ WONG_CODE_READ: TOKEN }, "code")]).toEqual([true, true, true, false]);
  // No route is handed the credential or the binding, even one that lists the key.
  const all = { DB: {}, ...github, WONG_CODE_WRITE: WIDE, ARTIFACTS: {}, CODE_CHECKS: {}, WONG_CLOUDFLARE_READ: "look-up" };
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
  // A Cloudflare-kept project: the one recorded repository and a short-lived read token. The binding is asked no more.
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

it("names the live app on a preview, whether the project is kept on GitHub or in Cloudflare, held keys or not", () => {
  const preview = { WONG_ENVIRONMENT: "staging" };
  for (const env of [{ WONG_CODE_REPOSITORY: "acme/recipe-box" }, { ...github, WONG_CODE_WRITE: WIDE }, { WONG_CODE_REPOSITORY: "recipe-box" },
    { ...artifacts().env, CODE_CHECKS: CHECKS }]) {
    expect([codeStep({ ...env, ...preview }), saveStep({ ...env, ...preview })]).toEqual(["live", "live"]);
  }
  // No project recorded is still setup's step, and the live app is unchanged.
  expect([codeStep(preview), saveStep({ ...preview, WONG_CODE_REPOSITORY: "acme/../other" })]).toEqual(["setup", "setup"]);
  expect([codeStep({ ...github, WONG_ENVIRONMENT: "production" }), saveStep({ ...github, WONG_ENVIRONMENT: "production" })]).toEqual(["ready", "key"]);
});

// An install kept in Cloudflare has `ARTIFACTS: Artifacts` in its generated Env, not the shape this file calls.
// The type check reads this line: it compiles only while a connection's env takes that binding as Cloudflare types it.
const generated = (bound: Env & { ARTIFACTS: Artifacts }): ConnectionEnv => bound;
it("takes the binding as Cloudflare types it wherever a connection's env is asked for, and still checks it before use", async () => {
  const kept = artifacts();
  const bound = generated(fakeEnv({ WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: fakeArtifacts(kept.env.ARTIFACTS) }));
  expect([codeStep(bound), await upstream(bound)]).toEqual(["ready", { url: REMOTE, authorization: "Bearer art_v1_synthetic_read" }]);
  expect(kept.calls).toEqual([["get", "recipe-box"], ["info"], ["createToken", "read", 300]]);
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

it("says whether a change can be saved, for each pair of keys and bindings, without calling anything", async () => {
  const both = { ...github, WONG_CODE_WRITE: WIDE };
  const runner = { ...artifacts().env, CODE_CHECKS: CHECKS };
  // The wide key alone hands the project out too; with both, reading keeps the older key and saving takes the wide one.
  expect([codeSource(saving), codeSource(both), saveSource(saving), saveSource(both)]).toEqual([{ github: "acme/recipe-box", token: WIDE }, { github: "acme/recipe-box", token: TOKEN },
    { github: "acme/recipe-box", token: WIDE }, { github: "acme/recipe-box", token: WIDE }]);
  expect([github, saving, both, artifacts().env, runner].map(bindings => [codeStep(bindings), saveStep(bindings)]))
    .toEqual([["ready", "key"], ["ready", "ready"], ["ready", "ready"], ["ready", "setup"], ["ready", "ready"]]);
  // No key at all, a wide key that is no text, a check runner that is no binding, and no project:
  // the step left is named.
  expect([{ WONG_CODE_REPOSITORY: "acme/recipe-box" }, { ...github, WONG_CODE_WRITE: " " }, { ...artifacts().env, CODE_CHECKS: {} }, { ...artifacts().env, CODE_CHECKS: null }, { WONG_CODE_WRITE: WIDE }, { CODE_CHECKS: CHECKS, WONG_CODE_REPOSITORY: "recipe-box" }]
    .map(bindings => [saveStep(bindings), saveSource(bindings)])).toEqual([["key", null], ["key", null], ["setup", null], ["setup", null], ["setup", null], ["setup", null]]);
  expect(await upstream(saving, "write")).toEqual({ url: "https://github.com/acme/recipe-box.git", authorization: `Basic ${btoa(`x-access-token:${WIDE}`)}` });
  expect([await upstream(github, "write"), await upstream(artifacts().env, "write")]).toEqual([null, null]);
  // A Cloudflare-kept project saves with a short-lived write token for its one repository.
  const stored = artifacts();
  expect(await upstream({ ...stored.env, CODE_CHECKS: CHECKS }, "write")).toEqual({ url: REMOTE, authorization: "Bearer art_v1_synthetic_read" });
  expect(stored.calls).toEqual([["get", "recipe-box"], ["info"], ["createToken", "write", 300]]);
  expect(fetched).not.toHaveBeenCalled();
});

it("takes a plain branch name for a saved change, and never one the project publishes from", () => {
  expect(["kim/fix", "wong-check-2026-10-13", "a", "release/v1.2_x"].map(savedBranch)).toEqual([true, true, true, true]);
  expect(["main", "master", "", "-x", "a..b", "a//b", "a/", "/a", "a b", "refs/heads/x~1", "x".repeat(201)].map(savedBranch)).toEqual(Array(11).fill(false));
});

it("passes one new commit on one branch to where the project is kept, with the pack whole and the server's write credential", async () => {
  kept();
  const listed = await codeGit(git("info/refs?service=git-receive-pack", { headers: { "Git-Protocol": "version=2", "cf-access-token": "session" } }), saving);
  expect(listed.status).toBe(200);
  expect(gitCalls()[0][0]).toBe("https://github.com/acme/recipe-box.git/info/refs?service=git-receive-pack");
  expect([gitCalls()[0][1].method, gitCalls()[0][1].body, gitCalls()[0][1].headers.Authorization]).toEqual(["GET", null, `Basic ${btoa(`x-access-token:${WIDE}`)}`]);
  // The updates arrive in pieces, split inside a length and inside a line: every byte goes on, in order.
  const whole = `${updates([to("refs/heads/kim/fix")])}${PACK}`;
  const saved = await codeGit(push(chunks(whole.slice(0, 2), whole.slice(2, 30), whole.slice(30, whole.length - 5), whole.slice(-5))), { ...saving, WONG_CODE_READ: TOKEN });
  expect([saved.status, await saved.text(), [...saved.headers]]).toEqual([200, `${pkt("unpack ok\n")}${pkt("ok refs/heads/kim/fix\n")}0000`,
    [["cache-control", "no-store"], ["content-type", "application/x-git-receive-pack-result"]]]);
  const [address, sent] = gitCalls()[1];
  expect([address, sent.method, sent.redirect]).toEqual(["https://github.com/acme/recipe-box.git/git-receive-pack", "POST", "manual"]);
  expect(sent.headers).toEqual({ "Content-Type": "application/x-git-receive-pack-request", Authorization: `Basic ${btoa(`x-access-token:${WIDE}`)}`, "User-Agent": "git/WongStack-project-code" });
  expect(await new Response(sent.body).text()).toBe(whole);
  // A line that ends in a newline, a longer object name, and no capabilities at all read the same.
  const plain = await codeGit(push(`${pkt(`${"1".repeat(64)} ${"a".repeat(64)} refs/heads/kim/fix\n`)}0000${PACK}`), saving);
  expect(plain.status).toBe(200);
  // Before a large push Git asks first with a flush packet alone: it updates nothing, and only it goes on.
  const probe = await codeGit(push("0000 and anything after it"), saving);
  expect([probe.status, gitCalls()[3][1].body]).toEqual([200, "0000"]);
  // A Cloudflare-kept project takes the same push with its own short-lived token, and publishes from main.
  const stored = artifacts();
  expect((await codeGit(push(), { ...stored.env, CODE_CHECKS: CHECKS })).status).toBe(200);
  expect([gitCalls()[4][0], gitCalls()[4][1].headers.Authorization, stored.calls.at(-1)]).toEqual([`${REMOTE}/git-receive-pack`, "Bearer art_v1_synthetic_read", ["createToken", "write", 300]]);
  // Where it stops reading, the rest of the person's push is let go.
  fetched.mockImplementationOnce(async (_address: string, init: RequestInit) => { await (init.body as ReadableStream).cancel("stopped"); return new Response("no", { status: 500 }); });
  expect(await code(await codeGit(push(), { ...stored.env, CODE_CHECKS: CHECKS }))).toBe("code_unavailable");
});

it("turns down every push that is not one new commit on one branch, in words Git prints, and asks nothing of where the project is kept", async () => {
  kept();
  const said = async (sent: string, caps = CAPS) => {
    const refused = await codeGit(push(sent), saving);
    const text = await refused.text();
    expect([refused.status, refused.headers.get("Content-Type"), refused.headers.get("Cache-Control")], sent).toEqual([200, "application/x-git-receive-pack-result", "no-store"]);
    return caps.includes("side-band-64k") ? text.slice(5, -4) : text;
  };
  const ng = (...refs: string[]) => `${pkt("unpack ok\n")}${refs.map(ref => pkt(`ng ${ref} ${NEVER}`)).join("")}0000`;
  for (const ref of ["refs/heads/main", "refs/heads/master", "refs/tags/v1", "refs/heads/a..b", "refs/notes/x", "HEAD"]) expect(await said(updates([to(ref)])), ref).toBe(ng(ref));
  // A delete, and two refs at once, a good branch among them.
  expect(await said(updates([to("refs/heads/kim/fix", "0".repeat(40))]))).toBe(ng("refs/heads/kim/fix"));
  expect(await said(updates([to("refs/heads/kim/fix"), to("refs/heads/main")]))).toBe(ng("refs/heads/kim/fix", "refs/heads/main"));
  // A line that is no update, such as a shallow line, is never passed on beside one that is.
  expect(await said(updates([to("refs/heads/kim/fix"), `shallow ${NEW}`]))).toBe(ng("refs/heads/kim/fix"));
  expect(await said(updates([to("refs/heads/kim/fix"), `${to("refs/heads/other")}\0more`]))).toBe(ng("refs/heads/kim/fix"));
  // Without side-band the report is sent bare.
  expect(await said(updates([to("refs/heads/main")], "report-status"), "report-status")).toBe(ng("refs/heads/main"));
  expect((await (await codeGit(push(updates([to("refs/heads/main")])), saving)).text()).charAt(4)).toBe("\u0001");
  // Nothing Git could name: a plain refusal. No updates read, a body that is no pkt-lines, one that ends early, a head
  // past 64 KB, a compressed body, another type, and no body.
  const bare: [string, Request][] = [["a shallow line alone", push(updates([`shallow ${NEW}`]))], ["no length", push("zzzz")], ["a length too short", push("0004")],
    ["ends before the flush", push(pkt(to("refs/heads/kim/fix")))], ["ends inside a line", push("00ff")], ["a head past the limit", push(chunks(...Array(1100).fill(pkt(to("refs/heads/kim/fix")))))],
    ["compressed", push(undefined, { "Content-Type": "application/x-git-receive-pack-request", "Content-Encoding": "gzip" })], ["another type", push(undefined, { "Content-Type": "text/plain" })],
    ["no body", push(null)]];
  for (const [name, request] of bare) {
    const refused = await codeGit(request, saving);
    expect([refused.status, await refused.text()], name).toEqual([403, NEVER]);
  }
  expect(fetched).not.toHaveBeenCalled();
  // A branch that reads as fine is held to the branch GitHub says the project publishes from:
  // asked once, and no push goes on.
  const trunk = { ...saving, WONG_CODE_REPOSITORY: "acme/trunk-box" };
  for (let again = 0; again < 2; again++) expect(await (await codeGit(push(updates([to("refs/heads/trunk")], "report-status")), trunk)).text()).toBe(ng("refs/heads/trunk"));
  expect(fetched.mock.calls.map(([address]) => address)).toEqual(["https://api.github.com/repos/acme/trunk-box"]);
  expect(await code(await codeGit(push(), { ...saving, WONG_CODE_REPOSITORY: "acme/down" }))).toBe("code_unavailable");
  expect(gitCalls()).toEqual([]);
});

it("answers a push the place the project is kept refuses, without its words, and names a change to the files that define the checks", async () => {
  kept(() => new Response(`${pkt(`\u0001${pkt("unpack ok\n")}${pkt("ng refs/heads/kim/fix refusing to allow a Personal Access Token to create or update workflow `.github/workflows/ci.yml` without `workflow` scope\n")}0000`)}0000`));
  const refused = await codeGit(push(), saving);
  const line = "ng refs/heads/kim/fix This change edits the files that define the checks, which can not be saved through the app. Ask the owner to save it.\n";
  expect([refused.status, (await refused.text()).slice(5, -4)]).toEqual([200, `${pkt("unpack ok\n")}${pkt(line)}0000`]);
  for (const answer of [() => new Response(`upstream secret ${WIDE}`, { status: 403 }), () => new Response(null), () => new Response("x".repeat(70_000))]) {
    kept(answer);
    const failed = await codeGit(push(), saving);
    const text = await failed.clone().text();
    expect([failed.status, await code(failed), text.includes("upstream")]).toEqual([503, "code_unavailable", false]);
  }
  kept(() => new Response("upstream", { status: 500 }));
  for (const probe of [push("0000"), git("info/refs?service=git-receive-pack")]) expect(await code(await codeGit(probe, saving))).toBe("code_unavailable");
});

it("refuses a save on an install that can not save yet, and every other call, before anything is asked of where the project is kept", async () => {
  for (const bindings of [env, artifacts().env]) {
    for (const request of [git("info/refs?service=git-receive-pack"), push()]) {
      const refused = await codeGit(request, bindings);
      expect([refused.status, refused.headers.get("Content-Type"), await refused.text()], request.url).toEqual([403, "text/plain; charset=utf-8", `${NOT_SET_UP}\n`]);
    }
  }
  for (const request of [git("info/refs"), git("git-receive-pack"), git("info/refs?service=git-receive-pack", { method: "POST", body: "" }),
    git("info/refs?service=git-upload-pack&extra=1"), git("git-upload-pack"), git("info/refs?service=git-upload-pack", { method: "POST", body: "" }),
    git("HEAD"), git("objects/info/packs"), git("git-upload-pack", { method: "PUT", body: "" }), git("")]) {
    const refused = await codeGit(request, env);
    expect([refused.status, refused.headers.get("Content-Type"), await refused.text()], request.url)
      .toEqual([403, "text/plain; charset=utf-8", NEVER]);
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
  // A save, and each call about a saved change, is judged the same way and before anything else.
  const change = () => new Request(`${site.origin}${CODE_CHANGE}?branch=kim/fix&sha=${NEW}`);
  for (const request of [push, () => git("info/refs?service=git-receive-pack"), change]) {
    for (const [name, identity] of [["a person without Project code", employee], ["the service token on the live app", machine]] as const) {
      const refused = await handleAccess(request(), { ...env, ...saving }, identity);
      expect([refused.status, await code(refused)], name).toEqual([403, "forbidden"]);
    }
  }
  // A person who holds it, on an install that reads and can not save yet: told so, in Git's words and the app's.
  expect(await (await handleAccess(push(), env, holder)).text()).toBe(`${NOT_SET_UP}\n`);
  const unready = await handleAccess(change(), env, holder);
  expect([unready.status, (await body(unready)).error]).toEqual([409, { code: "save_not_ready", message: NOT_SET_UP }]);
  expect(fetched).not.toHaveBeenCalled();
  // With the wide key: the holder, an Admin and the owner save, and on a preview the checker stands in.
  const admin = { ...employee, id: "admin@example.com", claims: { ...employee.claims, email: "admin@example.com", sub: "admin" } };
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, admin.id);
  f.sql.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, 'admin')").run(site.installationId, admin.id);
  kept();
  for (const [identity, bindings] of [[holder, env], [admin, env], [owner, env], [machine, { ...env, WONG_ENVIRONMENT: "staging" }]] as const) {
    expect((await handleAccess(push(), { ...bindings, ...saving }, identity)).status, identity.id).toBe(200);
  }
  // The change calls reach their own handler, which names the caller: here GitHub has no such commit.
  fetched.mockImplementation(async () => new Response("no", { status: 500 }));
  expect(await code(await handleAccess(change(), { ...env, ...saving }, holder))).toBe("code_unavailable");
  expect(await code(await handleAccess(change(), { ...env, ...saving, WONG_ENVIRONMENT: "staging" }, machine))).toBe("code_unavailable");
  fetched.mockReset();
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
  // Off: the one message, for every signed-in person, the one who lacks Project code included.
  expect([today.code, (await setup(lacker, f.env)).prompt, await apps(lacker, f.env)]).toEqual(["off", { state: "ready", text: setupMessage(site.origin, "business.example.com") }, "off"]);
  for (const identity of [owner, employee]) {
    const ready = await setup(identity);
    expect([ready.code, await apps(identity)], identity.id).toEqual(["ready", "ready"]);
    // Ready and off get the same message, named for the app's project: setup decides what each person receives.
    expect(ready.prompt).toEqual({ state: "ready", text: setupMessage(site.origin, businessName(env, site.origin)) });
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
