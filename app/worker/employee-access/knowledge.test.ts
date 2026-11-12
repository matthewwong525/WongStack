import { type MockInstance, afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import type { AccessIdentity } from "../access-slots";
import { body } from "../../tests/body";
import type { ConnectionEnv } from "../access-slots";
import { KNOWLEDGE_GIT, knowledgeGit, knowledgeSource } from "./knowledge";
import { handleAccess } from "./router";

const REMOTE = "https://account.artifacts.example.net/git/wongstack/recipe-box-knowledge.git";
const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
/** The account's Artifacts binding, recording every call made on it and on the repository it hands out. */
function artifacts({ remote = REMOTE, plaintext = "art_v1_synthetic_token" } = {}) {
  const calls: unknown[][] = [];
  const binding = new Proxy({}, { get: (_, method: string) => async (...args: unknown[]) => {
    calls.push([method, ...args]);
    // Awaiting the handle asks it for `then`: it has none.
    return new Proxy({}, { get: (_repo, name: string) => name === "then" ? undefined : async (...made: unknown[]) => {
      calls.push([name, ...made]);
      return name === "info" ? { remote } : { plaintext };
    } });
  } });
  return { calls, env: { WONG_KNOWLEDGE_REPOSITORY: "recipe-box-knowledge", ARTIFACTS: binding } };
}
const ONLY_MAIN = "Company knowledge takes one new commit on main, and no delete, tag or other branch.";
const UNFINISHED = "The app could not finish this save. Try again, or ask the owner to look.";
const [OLD, NEW] = ["1".repeat(40), "a".repeat(40)];
const CAPS = "report-status side-band-64k agent=git/2.43.0";
const pkt = (line: string) => `${(line.length + 4).toString(16).padStart(4, "0")}${line}`;
/** A push's ref updates as Git sends them: its capabilities after the first, then a flush packet. */
const updates = (lines: string[], caps = CAPS) => `${lines.map((line, at) => pkt(at ? line : `${line}\0${caps}`)).join("")}0000`;
const to = (ref: string, oid = NEW) => `${OLD} ${oid} ${ref}`;
const PACK = "PACK\u0000\u0000\u0000\u0002 the commits";
const git = (path: string, init?: RequestInit) => new Request(`${site.origin}${KNOWLEDGE_GIT}${path}`, init);
const push = (sent: BodyInit | null = `${updates([to("refs/heads/main")])}${PACK}`, headers: Record<string, string> = { "Content-Type": "application/x-git-receive-pack-request" }) =>
  git("git-receive-pack", { method: "POST", body: sent, headers, duplex: "half" } as RequestInit);
const refs = (service = "git-upload-pack") => git(`info/refs?service=${service}`, { headers: { "Git-Protocol": "version=2", Cookie: "CF_Authorization=session" } });
const pack = () => git("git-upload-pack", { method: "POST", body: "0011command=fetch", headers: { "Content-Type": "application/x-git-upload-pack-request" } });
const OK = `${pkt("unpack ok\n")}${pkt("ok refs/heads/main\n")}0000`;
const code = async (response: Response) => (await body(response)).error.code;
const holder = { ...employee, id: "holder@example.com", claims: { ...employee.claims, email: "holder@example.com", sub: "holder" } };
let f: ReturnType<typeof fixture>;
let stored: ReturnType<typeof artifacts>;
let env: ConnectionEnv;
let fetched: ReturnType<typeof vi.fn>;
let logged: MockInstance<typeof console.log>;
const lines = () => logged.mock.calls.map(([line]) => JSON.parse(String(line)));
const sent = () => fetched.mock.calls as [string, RequestInit & { headers: Record<string, string> }][];

beforeEach(() => {
  f = fixture();
  stored = artifacts();
  // The code is kept on GitHub, and only knowledge in this account's Artifacts.
  env = { ...f.env, ...stored.env, WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_READ: "github_pat_synthetic_read_only_value" };
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, holder.id);
  f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, 'code', 'read', 1)").run(site.installationId, holder.id);
  fetched = vi.fn(async () => new Response(OK, { headers: { "Content-Type": "application/x-git-receive-pack-result", "Set-Cookie": "upstream=1" } }));
  vi.stubGlobal("fetch", fetched);
  logged = vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); logged.mockRestore(); });

it("finds the knowledge repository in this account's Artifacts without calling anything, and never on a preview", () => {
  expect(knowledgeSource(stored.env)).toMatchObject({ name: "recipe-box-knowledge" });
  for (const bad of [{}, { ...stored.env, ARTIFACTS: undefined }, { ...stored.env, ARTIFACTS: {} }, { ...stored.env, WONG_KNOWLEDGE_REPOSITORY: "" },
    { ...stored.env, WONG_KNOWLEDGE_REPOSITORY: "acme/knowledge" }, { ...stored.env, WONG_KNOWLEDGE_REPOSITORY: 7 }, { ...stored.env, WONG_ENVIRONMENT: "staging" }]) {
    expect(knowledgeSource(bad)).toBeNull();
  }
  expect(stored.calls).toEqual([]);
});

it("lets a Project code holder read with a read token and save to main with a write token, and logs who saved which commit", async () => {
  const listed = await handleAccess(refs(), env, holder);
  expect([listed.status, [...listed.headers]]).toEqual([200, [["cache-control", "no-store"], ["content-type", "application/x-git-receive-pack-result"]]]);
  expect(sent()[0][0]).toBe(`${REMOTE}/info/refs?service=git-upload-pack`);
  // The person's own session never goes on; only the short-lived token does.
  expect(sent()[0][1].headers).toEqual({ "Git-Protocol": "version=2", Authorization: "Bearer art_v1_synthetic_token", "User-Agent": "git/WongStack-project-code" });
  expect((await handleAccess(pack(), env, holder)).status).toBe(200);
  expect([sent()[1][0], await new Response(sent()[1][1].body).text()]).toEqual([`${REMOTE}/git-upload-pack`, "0011command=fetch"]);
  expect((await handleAccess(refs("git-receive-pack"), env, holder)).status).toBe(200);
  expect(stored.calls.filter(([name]) => name === "createToken")).toEqual([["createToken", "read", 300], ["createToken", "read", 300], ["createToken", "write", 300]]);
  // A save: the push goes on whole, and Git reads the report as it came.
  const saved = await handleAccess(push(), env, holder);
  expect([saved.status, await saved.text()]).toEqual([200, OK]);
  expect([sent()[3][0], await new Response(sent()[3][1].body).text()]).toEqual([`${REMOTE}/git-receive-pack`, `${updates([to("refs/heads/main")])}${PACK}`]);
  expect(stored.calls.at(-1)).toEqual(["createToken", "write", 300]);
  expect(lines()).toEqual([{ event: "knowledge_saved", who: holder.id, commit: NEW }]);
  // The owner holds every key, and saves the same way.
  expect((await handleAccess(push(), env, owner)).status).toBe(200);
  expect(lines().at(-1)).toEqual({ event: "knowledge_saved", who: owner.id, commit: NEW });
});

it("refuses a person without Project code, and a service token on the live app, before anything is asked of Artifacts", async () => {
  for (const request of [refs, pack, push, () => refs("git-receive-pack")]) {
    for (const identity of [employee, machine, null]) {
      const refused = await handleAccess(request(), env, identity);
      expect([refused.status, await code(refused)], identity?.id).toEqual([403, "forbidden"]);
    }
  }
  expect((await body(await handleAccess(push(), env, employee))).error.message).toBe("Project code: Read needed");
  // Project code taken away: the next call is refused.
  f.sql.prepare("DELETE FROM wong_access_key_grants WHERE email = ?").run(holder.id);
  expect((await handleAccess(push(), env, holder)).status).toBe(403);
  expect([fetched.mock.calls, stored.calls, lines()]).toEqual([[], [], []]);
});

it("answers code_unavailable with no knowledge repository, on a preview, or before key levels start, whatever the code's state", async () => {
  const unavailable: [string, ConnectionEnv][] = [["no binding", { ...env, ARTIFACTS: undefined }], ["no repository", { ...env, WONG_KNOWLEDGE_REPOSITORY: "" }],
    ["a name it can not trust", { ...env, WONG_KNOWLEDGE_REPOSITORY: "../other" }], ["a preview", { ...env, WONG_ENVIRONMENT: "staging" }]];
  for (const [name, bindings] of unavailable) {
    for (const identity of [holder, owner]) expect(await code(await handleAccess(push(), bindings, identity)), name).toBe("code_unavailable");
    expect(await code(await knowledgeGit(refs(), bindings, null)), name).toBe("code_unavailable");
  }
  expect(await code(await handleAccess(refs(), { ...env, WONG_ENVIRONMENT: "staging" }, machine))).toBe("code_unavailable");
  // Knowledge is there with no code to hand out at all.
  expect((await handleAccess(refs(), { ...env, WONG_CODE_READ: undefined }, holder)).status).toBe(200);
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 0");
  expect(await code(await handleAccess(refs(), env, holder))).toBe("code_unavailable");
  expect(stored.calls.filter(([name]) => name === "createToken")).toHaveLength(1);
});

it("turns down a delete, a tag, another branch and two refs in words Git prints, logs each, and passes nothing on", async () => {
  const said = async (sent: string, caps = CAPS) => {
    const refused = await knowledgeGit(push(sent), env, holder.id);
    expect([refused.status, refused.headers.get("Content-Type")], sent).toEqual([200, "application/x-git-receive-pack-result"]);
    const text = await refused.text();
    return caps.includes("side-band-64k") ? text.slice(5, -4) : text;
  };
  const ng = (...named: string[]) => `${pkt("unpack ok\n")}${named.map(ref => pkt(`ng ${ref} ${ONLY_MAIN}\n`)).join("")}0000`;
  const cases: [string, string, string, string[]][] = [
    ["delete", updates([to("refs/heads/main", "0".repeat(40))]), "delete", ["refs/heads/main"]],
    ["tag", updates([to("refs/tags/v1")]), "tag", ["refs/tags/v1"]],
    ["other branch", updates([to("refs/heads/kim/notes")]), "branch", ["refs/heads/kim/notes"]],
    ["HEAD", updates([to("HEAD")], "report-status"), "branch", ["HEAD"]],
    ["two refs", updates([to("refs/heads/main"), to("refs/heads/other")]), "refs", ["refs/heads/main", "refs/heads/other"]],
    ["a line that is no update", updates([to("refs/heads/main"), `shallow ${NEW}`]), "refs", ["refs/heads/main"]],
  ];
  for (const [name, head, reason, named] of cases) {
    expect(await said(head, name === "HEAD" ? "report-status" : CAPS), name).toBe(ng(...named));
    expect(lines().at(-1), name).toEqual({ event: "knowledge_refused", who: holder.id, reason, ...named.length === 1 && { ref: named[0] } });
  }
  // A body only Git would not send: a plain refusal.
  for (const request of [push("zzzz"), push(null), push(undefined, { "Content-Type": "text/plain" })]) {
    const refused = await knowledgeGit(request, env, holder.id);
    expect([refused.status, await refused.text()]).toEqual([403, `${ONLY_MAIN}\n`]);
    expect(lines().at(-1)).toEqual({ event: "knowledge_refused", who: holder.id, reason: "unreadable" });
  }
  // Any other call under the address is refused unlogged.
  for (const request of [git("HEAD"), git("info/refs"), git("git-upload-pack")]) expect((await knowledgeGit(request, env, null)).status).toBe(403);
  expect(lines()).toHaveLength(cases.length + 3);
  expect([fetched.mock.calls, stored.calls]).toEqual([[], []]);
});

it("passes Git's flush-only probe on, and answers when Artifacts refuses a save or fails, logging each", async () => {
  const probe = await knowledgeGit(push("0000 and anything after it"), env, holder.id);
  expect([probe.status, sent()[0][1].body, lines()]).toEqual([200, "0000", []]);
  // Artifacts turns down a stale tip: its report goes back, and the refusal is logged.
  const stale = `${pkt("unpack ok\n")}${pkt("ng refs/heads/main failed to update ref\n")}0000`;
  fetched.mockImplementationOnce(async () => new Response(stale));
  expect(await (await knowledgeGit(push(), env, holder.id)).text()).toBe(stale);
  expect(lines().at(-1)).toEqual({ event: "knowledge_refused", who: holder.id, reason: "upstream", ref: "refs/heads/main" });
  // An upstream error, an answer with no body, and one past the limit: the save is turned down as unfinished.
  for (const answer of [() => new Response("upstream secret", { status: 500 }), () => new Response(null), () => new Response("x".repeat(70_000))]) {
    fetched.mockImplementationOnce(async () => answer());
    const failed = await knowledgeGit(push(), env, holder.id);
    expect((await failed.text()).includes(`ng refs/heads/main ${UNFINISHED}`)).toBe(true);
    expect(lines().at(-1)).toEqual({ event: "knowledge_refused", who: holder.id, reason: "unfinished", ref: "refs/heads/main" });
  }
  // A read Artifacts fails, or a repository with no token to give: code_unavailable, with none of its words.
  fetched.mockImplementationOnce(async () => new Response("upstream secret", { status: 404 }));
  expect(await code(await knowledgeGit(refs(), env, null))).toBe("code_unavailable");
  expect(await code(await knowledgeGit(refs(), { ...env, ...artifacts({ plaintext: "" }).env }, null))).toBe("code_unavailable");
  expect(lines().some(line => line.event === "knowledge_saved")).toBe(false);
});
