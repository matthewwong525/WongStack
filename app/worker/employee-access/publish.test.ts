import { createHash } from "node:crypto";
import { inflateSync } from "node:zlib";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import { body } from "../../tests/body";
import type { AccessIdentity } from "../access";
import { runId } from "../../../scripts/check-runner/run-id.mjs";
import { NOT_SET_UP, pkt } from "./code";
import { CODE_PUBLISH, codePublish } from "./publish";
import { handleAccess } from "./router";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders"]));

const TOKEN = "github_pat_synthetic_wide_value";
const github = { WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_WRITE: TOKEN };
const API = "https://api.github.com/repos/acme/recipe-box";
const [SHA, NEWER, MAIN, TAG] = ["a", "b", "c", "0"].map(digit => digit.repeat(40));
const ASKED = { branch: "kim/fix", sha: SHA };
const PULLS = "GET /pulls?head=acme:kim%2Ffix&state=all&per_page=20";
const JOBS = "GET /actions/runs/1/jobs?per_page=100";
const MERGE = "PUT /pulls/9/merge";
const post = (value: unknown, type = "application/json") => ({ method: "POST", body: JSON.stringify(value), headers: { "Content-Type": type } });
const request = (init: RequestInit = post(ASKED)) => new Request(`${site.origin}${CODE_PUBLISH}`, init);
const publish = async (bindings: object, init?: RequestInit) => {
  const answer = await codePublish(request(init), bindings, "kim@shop.com");
  const text = await answer.text();
  expect([text.includes("upstream"), text.includes(TOKEN), answer.headers.get("Cache-Control")]).toEqual([false, false, "no-store"]);
  return [answer.status, JSON.parse(text).error ?? JSON.parse(text)];
};
const encode = (text: string) => new TextEncoder().encode(text);
let answers: Record<string, unknown>;
let fetched: ReturnType<typeof vi.fn>;
const asked = () => fetched.mock.calls.map(([address, init]) => `${(init as RequestInit).method ?? "GET"} ${String(address).replace(API, "")}`);

beforeEach(() => {
  answers = {};
  fetched = vi.fn(async (address: string, init: RequestInit) => {
    const found = answers[`${init.method ?? "GET"} ${address.replace(API, "")}`];
    if (found instanceof Response) return found;
    return found === undefined ? new Response(`upstream ${TOKEN}`, { status: 404 }) : Response.json(found);
  });
  vi.stubGlobal("fetch", fetched);
});
afterEach(() => vi.unstubAllGlobals());

it("lets only a person who holds the publish level now reach publishing: the owner, an Admin, or one ticked; never a machine on the live app", async () => {
  const f = fixture();
  try {
    f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
    const person = (email: string, level: string | null, role: string | null = null) => {
      f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, email);
      if (level) f.sql.prepare("INSERT INTO wong_access_key_grants VALUES (?, ?, 'code', ?, 1)").run(site.installationId, email, level);
      if (role) f.sql.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, ?)").run(site.installationId, email, role);
      return { ...employee, id: email, claims: { ...employee.claims, email, sub: email } };
    };
    // Everyone who held Project code before keeps install and save at Read, in their own set or a role: none publishes.
    f.sql.prepare("INSERT INTO wong_access_roles VALUES (?, 'helpers', 'Helpers', 1)").run(site.installationId);
    f.sql.prepare("INSERT INTO wong_access_role_keys VALUES (?, 'helpers', 'code', 'read')").run(site.installationId);
    const saver = person("saver@example.com", "read");
    const helper = person("helper@example.com", null, "helpers");
    const publisher = person("publisher@example.com", "write");
    const admin = person("admin@example.com", null, "admin");
    const machine: AccessIdentity = { kind: "service", id: "checker.access", claims: { common_name: "checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
    // An install that reads and can not save yet: reaching the handler says so, with nothing fetched.
    const env = { ...f.env, WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_READ: "github_pat_synthetic_read" };
    const send = async (identity: AccessIdentity, bindings: object = env) => {
      const answer = await handleAccess(request(), { ...env, ...bindings }, identity);
      return [answer.status, (await body(answer)).error.message];
    };
    for (const identity of [owner, admin, publisher]) expect(await send(identity), identity.id).toEqual([409, NOT_SET_UP]);
    expect(await send(machine, { WONG_ENVIRONMENT: "staging" })).toEqual([409, NOT_SET_UP]);
    for (const identity of [saver, helper, employee, machine]) expect(await send(identity), identity.id).toEqual([403, "Project code: Read & write needed"]);
    // The level is read on every call: taken back, the next publish is refused.
    f.sql.prepare("UPDATE wong_access_key_grants SET level = 'read' WHERE email = ?").run(publisher.id);
    expect((await send(publisher))[0]).toBe(403);
    expect(fetched).not.toHaveBeenCalled();
  } finally { f.sql.close(); }
});

it("refuses a request that is not the assistant's own JSON naming a branch and a commit, and an install that can not save", async () => {
  expect(await publish({})).toEqual([409, { code: "save_not_ready", message: NOT_SET_UP }]);
  for (const init of [{ method: "GET" }, post(ASKED, "text/plain"), post({ branch: "main", sha: SHA }), post({ branch: "kim/fix", sha: "short" })]) {
    expect(await publish(github, init)).toEqual([400, { code: "invalid_request" }]);
  }
  expect(fetched).not.toHaveBeenCalled();
});

// GitHub: an open change whose newest commit is SHA, with one workflow run whose jobs are given.
const job = (name: string, status: string, conclusion: string | null = null) => ({ id: 2, name, status, conclusion, html_url: null });
function open(jobs: object[], statuses: object[] = []) {
  Object.assign(answers, { [PULLS]: [{ number: 9, html_url: "https://github.com/acme/recipe-box/pull/9", state: "open", merged_at: null, head: { sha: SHA } }],
    [`GET /actions/runs?head_sha=${SHA}&per_page=20`]: { workflow_runs: [{ id: 1, name: "CI", status: "completed", conclusion: "success", html_url: null }] },
    [JOBS]: { jobs }, [`GET /commits/${SHA}/statuses?per_page=100`]: statuses, [MERGE]: { sha: "d".repeat(40), merged: true } });
}

it("on GitHub squash-merges the open change, only for its newest commit and only once every check passed, and names the publisher", async () => {
  open([job("test", "completed", "success"), job("docs", "completed", "skipped")]);
  expect(await publish(github)).toEqual([200, { published: true, commit: "d".repeat(40), url: "https://github.com/acme/recipe-box/pull/9" }]);
  const merge = fetched.mock.calls[asked().indexOf(MERGE)];
  expect([merge[1].headers.Authorization, JSON.parse(merge[1].body)]).toEqual([`Bearer ${TOKEN}`,
    { merge_method: "squash", sha: SHA, commit_message: "Published through the app by kim@shop.com." }]);
  const refused = async () => { fetched.mockClear(); const answer = await publish(github); expect(asked()).not.toContain(MERGE); return answer; };
  // A failing check, one still running, and a status that failed are each named; no check at all publishes nothing.
  answers[JOBS] = { jobs: [job("test", "completed", "success"), job("lint", "completed", "failure")] };
  expect(await refused()).toEqual([409, { code: "checks_not_passed", message: 'The check "lint" did not pass, so nothing was published.' }]);
  answers[JOBS] = { jobs: [job("build", "in_progress")] };
  expect(await refused()).toEqual([409, { code: "checks_not_passed", message: 'The check "build" has not finished, so nothing was published.' }]);
  open([job("test", "completed", "success")], [{ context: "guard", state: "failure", target_url: null }]);
  expect((await refused())[1].message).toBe('The check "guard" did not pass, so nothing was published.');
  open([job("docs", "completed", "skipped")]);
  expect((await refused())[1]).toEqual({ code: "checks_not_passed", message: "No check ran for this commit, so nothing was published." });
  // A newer commit was saved after the checked one; or there is no open change.
  open([job("test", "completed", "success")]);
  answers[PULLS] = [{ number: 9, html_url: "x", state: "open", merged_at: null, head: { sha: NEWER } }];
  expect((await refused())[1].code).toBe("stale");
  for (const pulls of [[], [{ number: 9, html_url: "x", state: "closed", merged_at: "2026-10-01T00:00:00Z", head: { sha: SHA } }]]) {
    answers[PULLS] = pulls;
    expect((await refused())[1]).toEqual({ code: "no_change", message: "This branch has no open change to publish. Save it first." });
  }
  // GitHub turns the merge down, the head moved meanwhile, or it fails: no upstream word comes back.
  for (const [status, expected] of [[405, [409, "not_published"]], [409, [409, "not_published"]], [500, [503, "code_unavailable"]]] as const) {
    open([job("test", "completed", "success")]);
    answers[MERGE] = new Response(`upstream ${TOKEN}`, { status });
    const [code, error] = await publish(github);
    expect([code, error.code]).toEqual(expected);
  }
});

// Cloudflare: the binding's repository and check run, and its Git address answering each call.
const REMOTE = "https://account.artifacts.example.net/git/wongstack/recipe-box.git";
const output = (result: string, changes: object = {}) => ({ status: "complete", output: { commit: SHA, ref: "refs/heads/kim/fix", result, ...changes } });
function kept(run: object = output("success"), plaintext = "art_v1_synthetic_write") {
  const named: string[] = [];
  const repo = { info: async () => ({ remote: REMOTE }), createToken: async () => ({ plaintext }) };
  const checks = { get: async (id: string) => { named.push(id); return { status: async () => run, restart: async () => {} }; } };
  return { named, env: { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: { get: async () => repo }, CODE_CHECKS: checks } };
}
const advert = (refs: [string, string][]) => `${pkt("# service=git-receive-pack\n")}0000${refs.map(([oid, ref], at) => pkt(`${oid} ${ref}${at ? "" : "\0report-status"}\n`)).join("")}0000`;
const emptyPack = (count: number) => new Uint8Array([...encode("0008NAK\nPACK"), 0, 0, 0, 2, 0, 0, 0, count]);
function git({ refs = advert([[MAIN, "refs/heads/main"], [SHA, "refs/heads/kim/fix"], [NEWER, "refs/tags/v1"]]), pack = emptyPack(0) as BodyInit,
  report = `${pkt("unpack ok\n")}${pkt("ok refs/heads/main\n")}0000` } = {}) {
  Object.assign(answers, { [`GET ${REMOTE}/info/refs?service=git-receive-pack`]: new Response(refs), [`POST ${REMOTE}/git-upload-pack`]: new Response(pack),
    [`POST ${REMOTE}/git-receive-pack`]: new Response(report) });
}
const sentTo = (path: string) => fetched.mock.calls.find(([address]) => address === `${REMOTE}/${path}`)![1] as RequestInit & { body: Uint8Array };

it("on Cloudflare moves main forward to the checked commit, with a tag that names the publisher", async () => {
  const project = kept();
  git();
  expect(await publish(project.env)).toEqual([200, { published: true, commit: SHA, url: null }]);
  expect(project.named).toEqual([await runId(SHA, "refs/heads/kim/fix")]);
  expect(asked()).toEqual([`GET ${REMOTE}/info/refs?service=git-receive-pack`, `POST ${REMOTE}/git-upload-pack`, `POST ${REMOTE}/git-receive-pack`]);
  expect(fetched.mock.calls.every(([, init]) => init.headers.Authorization === "Bearer art_v1_synthetic_write" && init.redirect === "manual")).toBe(true);
  // Main is asked for while holding the commit: an empty pack says main is in its history.
  expect(sentTo("git-upload-pack").body as unknown).toBe(`${pkt(`want ${MAIN}\n`)}0000${pkt(`have ${SHA}\n`)}${pkt("done\n")}`);
  // The push moves main from where it was, adds the tag, and carries the tag in a pack Git reads.
  const pushed = sentTo("git-receive-pack").body as Uint8Array;
  const text = new TextDecoder("latin1").decode(pushed);
  const tag = /0{40} ([0-9a-f]{40}) refs\/tags\/published\/a{40}\n/.exec(text)![1];
  expect(text.startsWith(pkt(`${MAIN} ${SHA} refs/heads/main\0report-status\n`))).toBe(true);
  const pack = pushed.slice(text.indexOf("PACK"));
  expect([...pack.slice(4, 12)]).toEqual([0, 0, 0, 2, 0, 0, 0, 1]);
  expect(createHash("sha1").update(pack.slice(0, -20)).digest("hex")).toBe(Buffer.from(pack.slice(-20)).toString("hex"));
  let at = 12;
  let size = pack[at] & 15;
  for (let shift = 4; pack[at] & 0x80; shift += 7) size |= (pack[++at] & 0x7f) << shift;
  expect(pack[12] >> 4 & 7).toBe(4);
  const object = inflateSync(pack.slice(at + 1, -20));
  expect(object.length).toBe(size);
  expect(object.toString()).toMatch(new RegExp(`^object ${SHA}\ntype commit\ntag published/${SHA}\ntagger WongStack app <app@wongstack\\.invalid> \\d+ \\+0000\n\nPublished through the app by kim@shop\\.com\\.\n$`));
  expect(createHash("sha1").update(`tag ${size}\0`).update(object).digest("hex")).toBe(tag);
});

it("on Cloudflare publishes nothing for a stale commit, a check that did not pass, main moved on, or a refused push", async () => {
  const refused = async (run?: object, calls?: Parameters<typeof git>[0]) => { git(calls); return (await publish(kept(run).env))[1]; };
  expect((await refused(undefined, { refs: advert([[MAIN, "refs/heads/main"], [NEWER, "refs/heads/kim/fix"]]) })).code).toBe("stale");
  expect((await refused(undefined, { refs: advert([[MAIN, "refs/heads/main"]]) })).code).toBe("stale");
  expect((await refused(undefined, { refs: advert([[SHA, "refs/heads/main"], [SHA, "refs/heads/kim/fix"]]) })))
    .toEqual({ code: "published", message: "This change is already published." });
  // The run, by its stage when it names one; a run for another commit or branch is not this one's.
  const runs: [object, string][] = [[output("failure", { stage: "test" }), 'The check "test" did not pass'], [output("failure"), 'The check "check run" did not pass'],
    [output("interrupted", { stage: "deploy" }), 'The check "deploy" has not finished'], [{ status: "running" }, 'The check "check run" has not finished'],
    [output("success", { commit: NEWER }), 'The check "check run" has not finished'], [output("success", { ref: "refs/heads/other" }), 'The check "check run" has not finished'],
    [output("none"), "No check ran for this commit"]];
  for (const [run, message] of runs) expect((await refused(run)).message).toBe(`${message}, so nothing was published.`);
  expect((await refused(undefined, { pack: emptyPack(1) })).code).toBe("behind");
  expect(await refused(undefined, { report: `${pkt("unpack ok\n")}${pkt("ng refs/heads/main failed to lock\n")}0000` }))
    .toEqual({ code: "not_published", message: "The project did not move to this change, so nothing was published. Try again." });
  // Nothing asked of the history, or pushed, after a refusal before it.
  fetched.mockClear();
  await refused(output("failure"));
  expect(asked()).toEqual([`GET ${REMOTE}/info/refs?service=git-receive-pack`]);
});

it("on Cloudflare says the project is unavailable when its Git address or token does not answer as Git", async () => {
  const unavailable = async (env: object = kept().env) => { const [status, error] = await publish(env); return [status, error.code]; };
  git();
  expect(await unavailable(kept(undefined, "").env)).toEqual([503, "code_unavailable"]);
  expect(fetched).not.toHaveBeenCalled();
  git({ refs: advert([[SHA, "refs/heads/kim/fix"]]) });
  expect(await unavailable()).toEqual([503, "code_unavailable"]);
  // An answer with no pack, a pack cut short, a refusal, and a long answer read only as far as needed.
  for (const pack of ["0008NAK\n", "0008NAK\nPACK\u0000\u0000"]) {
    git({ pack });
    expect(await unavailable()).toEqual([503, "code_unavailable"]);
  }
  git();
  answers[`GET ${REMOTE}/info/refs?service=git-receive-pack`] = new Response("no", { status: 401 });
  expect(await unavailable()).toEqual([503, "code_unavailable"]);
  const cancelled = vi.fn();
  git({ pack: new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(emptyPack(1)); controller.enqueue(new Uint8Array(8192)); }, cancel: cancelled }) });
  expect((await publish(kept().env))[1].code).toBe("behind");
  expect(cancelled).toHaveBeenCalled();
});

it("reads every branch from Git's list, past its flush packets and a line that is not a branch", async () => {
  git({ refs: `${pkt("# service=git-receive-pack\n")}0000zzzz${advert([[TAG, "refs/heads/old"], [MAIN, "refs/heads/main"], [SHA, "refs/heads/kim/fix"]])}` });
  expect((await publish(kept().env))[0]).toBe(200);
});
