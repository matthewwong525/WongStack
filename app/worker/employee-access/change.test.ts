import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { runId } from "../../../scripts/check-runner/run-id.mjs";
import { body } from "../../tests/body";
import { CODE_CHANGE, codeChange } from "./change";
import { NOT_SET_UP } from "./code";

const TOKEN = "github_pat_synthetic_wide_value";
const env = { WONG_CODE_REPOSITORY: "acme/recipe-box", WONG_CODE_WRITE: TOKEN };
const API = "https://api.github.com/repos/acme/recipe-box";
const SHA = "a".repeat(40);
const AT = `?branch=kim/fix&sha=${SHA}`;
const PULLS = "GET /pulls?head=acme:kim%2Ffix&state=all&per_page=20";
const pull = (number: number, state = "open", merged: string | null = null) => ({ number, html_url: `https://github.com/acme/recipe-box/pull/${number}`, state, merged_at: merged, head: { sha: SHA }, body: "upstream words" });
/** What GitHub answers, by method and path. Anything else is a 404 carrying words that must never come back. */
let answers: Record<string, unknown>;
let fetched: ReturnType<typeof vi.fn>;
const asked = () => fetched.mock.calls.map(([address, init]) => `${(init as RequestInit).method ?? "GET"} ${String(address).replace(API, "")}`);
const sent = (call: string) => JSON.parse(String((fetched.mock.calls[asked().indexOf(call)][1] as RequestInit).body));
const call = (path: string, init?: RequestInit, bindings: object = env) => codeChange(new Request(`https://app.example.com${CODE_CHANGE}${path}`, init), bindings, "kim@shop.com");
const post = (value: unknown, type = "application/json") => ({ method: "POST", body: JSON.stringify(value), headers: { "Content-Type": type } });
const read = async (path: string, init?: RequestInit, bindings?: object) => { const answer = await call(path, init, bindings); return [answer.status, await body(answer)] as const; };
const failure = async (path: string, init?: RequestInit, bindings?: object) => {
  const answer = await call(path, init, bindings);
  const text = await answer.text();
  expect([text.includes("upstream"), text.includes(TOKEN), answer.headers.get("Cache-Control")], path).toEqual([false, false, "no-store"]);
  return [answer.status, JSON.parse(text).error.code];
};

beforeEach(() => {
  answers = { "GET ": { default_branch: "main" }, [PULLS]: [], [`GET /actions/runs?head_sha=${SHA}&per_page=20`]: { workflow_runs: [] }, [`GET /commits/${SHA}/statuses?per_page=100`]: [],
    [`GET /deployments?sha=${SHA}&per_page=5`]: [], "GET /actions/workflows?per_page=1": { total_count: 1 } };
  fetched = vi.fn(async (address: string, init: RequestInit) => {
    const found = answers[`${init.method ?? "GET"} ${address.replace(API, "")}`];
    if (found instanceof Response) return found;
    return found === undefined ? new Response(`upstream secret ${TOKEN}`, { status: 404 }) : Response.json(found);
  });
  vi.stubGlobal("fetch", fetched);
});
afterEach(() => vi.unstubAllGlobals());

it("says saving is not set up, and asks nothing, on an install that can not save yet", async () => {
  for (const bindings of [{}, { ...env, WONG_CODE_WRITE: "", WONG_CODE_READ: TOKEN }, { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: { get: async () => ({}) } }]) {
    expect(await read(AT, undefined, bindings)).toEqual([409, { error: { code: "save_not_ready", message: NOT_SET_UP } }]);
  }
  expect(fetched).not.toHaveBeenCalled();
});

it("reads a commit's checks from its workflow jobs and its statuses, each as passed, failed, waiting, skipped or stopped", async () => {
  const job = (id: number, name: string | null, status: string, conclusion: string | null = null) => ({ id, name, status, conclusion, html_url: `https://github.com/acme/recipe-box/actions/runs/1/job/${id}` });
  Object.assign(answers, { [PULLS]: [pull(7, "closed"), pull(9), pull(8, "closed", "2026-10-01T00:00:00Z")],
    [`GET /actions/runs?head_sha=${SHA}&per_page=20`]: { workflow_runs: [{ ...job(1, "CI", "completed", "failure"), html_url: null }, { ...job(2, null, "queued"), html_url: "https://github.com/acme/recipe-box/actions/runs/2" }] },
    "GET /actions/runs/1/jobs?per_page=100": { jobs: [job(11, "test", "completed", "success"), job(12, "lint", "completed", "failure"), job(13, "build", "in_progress"), job(14, "docs", "completed", "skipped"),
      job(15, "old", "completed", "cancelled"), job(16, "note", "completed", "neutral"), job(17, "odd", "completed")] },
    "GET /actions/runs/2/jobs?per_page=100": { jobs: [] },
    [`GET /commits/${SHA}/statuses?per_page=100`]: [{ context: "deploy", state: "success", target_url: "https://example.com/build/1" }, { context: "deploy", state: "pending", target_url: null },
      { context: "scan", state: "pending", target_url: null }, { context: "guard", state: "error", target_url: null }] });
  const [status, change] = await read(AT);
  expect(status).toBe(200);
  expect(change).toEqual({ head: SHA, state: "OPEN", url: "https://github.com/acme/recipe-box/pull/9", number: 9, workflows: true, preview: null, rows: [
    ...[[11, "test", "pass"], [12, "lint", "fail"], [13, "build", "pending"], [14, "docs", "skipping"], [15, "old", "cancel"], [16, "note", "pass"], [17, "odd", "fail"]]
      .map(([id, name, bucket]) => ({ name, bucket, link: `https://github.com/acme/recipe-box/actions/runs/1/job/${id}`, job: id })),
    // A run with no job yet stands for itself, and can not be asked for a log.
    { name: "check", bucket: "pending", link: "https://github.com/acme/recipe-box/actions/runs/2", job: null },
    // A status's newest word wins.
    { name: "deploy", bucket: "pass", link: "https://example.com/build/1", job: null }, { name: "scan", bucket: "pending", link: null, job: null }, { name: "guard", bucket: "fail", link: null, job: null }] });
  expect(JSON.stringify(change)).not.toContain("upstream words");
  // No change opened yet, a project with no workflow at all, then the newest change when none is open:
  // published, or closed.
  Object.assign(answers, { [PULLS]: [], "GET /actions/workflows?per_page=1": { total_count: 0 } });
  expect((await read(AT))[1]).toMatchObject({ head: null, state: null, url: null, number: null, workflows: false });
  answers[PULLS] = [pull(8, "closed", "2026-10-01T00:00:00Z"), pull(7, "closed")];
  expect((await read(AT))[1]).toMatchObject({ state: "MERGED", number: 8 });
  answers[PULLS] = [pull(7, "closed")];
  expect((await read(AT))[1]).toMatchObject({ state: "CLOSED", number: 7 });
});

it("finds where the commit can be looked at: the address its deploy reported, else a status's link that reads as a preview", async () => {
  const preview = async () => (await read(AT))[1].preview;
  const linked = (...links: (string | null)[]) => { answers[`GET /commits/${SHA}/statuses?per_page=100`] = links.map((target_url, at) => ({ context: `c${at}`, state: "success", target_url })); };
  linked("https://github.com/acme/recipe-box/deployments", "http://pr-9.acme.workers.dev", "https://workers.dev", "https://pages.dev/", "https://example.com/build", null, "https://pr-9.acme.workers.dev/x", "https://later.pages.dev");
  expect(await preview()).toBe("https://pr-9.acme.workers.dev/x");
  linked("https://ci.example.com/preview/9");
  expect(await preview()).toBe("https://ci.example.com/preview/9");
  Object.assign(answers, { [`GET /deployments?sha=${SHA}&per_page=5`]: [{ id: 1 }, { id: 2 }, { id: 3 }], "GET /deployments/1/statuses": [{ environment_url: "" }, { environment_url: null }, {}],
    "GET /deployments/2/statuses": [{ environment_url: "http://plain.example.com" }, { environment_url: "https://recipe-box-pr-9.acme.workers.dev" }], "GET /deployments/3/statuses": [{ environment_url: "https://other.example.com" }] });
  expect(await preview()).toBe("https://recipe-box-pr-9.acme.workers.dev");
  expect(asked()).not.toContain("GET /deployments/3/statuses");
});

it("opens the change against the published branch naming who saved it, renews an open one, and leaves a closed or published one", async () => {
  answers["POST /pulls"] = pull(12);
  const opening = { branch: "kim/fix", title: " Fix the totals ", body: "What changed.\n" };
  expect(await read("", post(opening))).toEqual([200, { state: "OPEN", url: "https://github.com/acme/recipe-box/pull/12", number: 12 }]);
  expect(sent("POST /pulls")).toEqual({ title: "Fix the totals", head: "kim/fix", base: "main", body: "What changed.\n\nSaved through the app by kim@shop.com" });
  fetched.mockClear();
  Object.assign(answers, { [PULLS]: [pull(12)], "PATCH /pulls/12": pull(12) });
  expect(await read("", post({ ...opening, body: "" }))).toEqual([200, { state: "OPEN", url: "https://github.com/acme/recipe-box/pull/12", number: 12 }]);
  expect([asked(), sent("PATCH /pulls/12")]).toEqual([[PULLS, "PATCH /pulls/12"], { body: "Saved through the app by kim@shop.com" }]);
  for (const [found, state] of [[pull(12, "closed"), "CLOSED"], [pull(12, "closed", "2026-10-01T00:00:00Z"), "MERGED"]] as const) {
    fetched.mockClear();
    answers[PULLS] = [found];
    expect([(await read("", post(opening)))[1].state, asked()]).toEqual([state, [PULLS]]);
  }
});

it("refuses a request that is not shaped as asked, before anything is asked of GitHub", async () => {
  const opening = { branch: "kim/fix", title: "Fix", body: "" };
  for (const path of ["", "?branch=kim/fix", `?branch=main&sha=${SHA}`, `?branch=kim/fix&sha=${SHA.slice(1)}`, `?branch=a..b&sha=${SHA}`, "/log", "/log?job=12x", "/log?job=../../x"]) expect(await failure(path), path).toEqual([400, "invalid_request"]);
  for (const init of [post({ ...opening, branch: "main" }), post({ ...opening, title: " " }), post({ ...opening, body: 7 }), post("text"), post(opening, "text/plain"),
    { method: "POST", body: "{", headers: { "Content-Type": "application/json" } }, { method: "POST", headers: { "Content-Type": "application/json" } }]) expect(await failure("", init)).toEqual([400, expect.stringMatching(/^(invalid_request|json_body_invalid|json_body_required)$/)]);
  expect((await call("", post("x".repeat(140_000)))).status).toBe(413);
  for (const [path, init] of [["/other", undefined], ["/restart", post({ branch: "kim/fix", sha: SHA })], ["", { method: "DELETE" }], ["/log", post({})]] as const) expect(await failure(path, init), path).toEqual([404, "not_found"]);
  expect(fetched).not.toHaveBeenCalled();
});

it("answers a refusal or a surprise from GitHub with none of its words", async () => {
  answers[PULLS] = new Response(`upstream secret ${TOKEN}`, { status: 404 });
  expect(await failure(AT)).toEqual([404, "not_found"]);
  for (const answer of [new Response(`upstream secret ${TOKEN}`, { status: 500 }), Response.json({ upstream: "another shape" }), new Response("upstream is not json")]) {
    answers[PULLS] = answer;
    expect(await failure(AT)).toEqual([503, "code_unavailable"]);
  }
  fetched.mockImplementation(async () => { throw new Error(`upstream network ${TOKEN}`); });
  expect(await failure(AT)).toEqual([503, "code_unavailable"]);
});

it("reads the end of one job's log through GitHub's short-lived address, without the key, up to its last error", async () => {
  const LOG = "https://logs.example.net/job/12?sig=short-lived";
  const pointer = (status = 302, location: string | null = LOG) => new Response(status === 302 ? null : "upstream", { status, headers: location ? { Location: location } : {} });
  const stamped = (lines: string[]) => lines.map(line => `2026-10-13T01:02:03.1234567Z ${line}`).join("\r\n");
  const log = async (text: BodyInit | null, status = 200) => {
    fetched.mockImplementation(async (address: string) => address === LOG ? new Response(text, { status }) : pointer());
    return call("/log?job=12");
  };
  const numbered = Array.from({ length: 100 }, (_, at) => `line ${at}`);
  const failed = await body<{ lines: string[] }>(await log(stamped([...numbered, "##[error]Process completed with exit code 1.", "Post job cleanup.", "done"])));
  expect([failed.lines.length, failed.lines[0], failed.lines.at(-1)]).toEqual([60, "line 41", "##[error]Process completed with exit code 1."]);
  const [address, init] = fetched.mock.calls.at(-1) as [string, RequestInit];
  expect([address, init.redirect, init.headers]).toEqual([LOG, "manual", undefined]);
  // No error named: its last lines. A short log comes whole, and a long one keeps only its end.
  expect((await body<{ lines: string[] }>(await log(stamped(numbered)))).lines.slice(-2)).toEqual(["line 98", "line 99"]);
  expect((await body(await log("one\ntwo"))).lines).toEqual(["one", "two"]);
  const long = await body<{ lines: string[] }>(await log(new ReadableStream<Uint8Array>({ start(controller) { for (const part of ["x".repeat(300_000), "\nkept ", "end"]) controller.enqueue(new TextEncoder().encode(part)); controller.close(); } })));
  expect([long.lines.length, long.lines[0].length, long.lines[1]]).toEqual([2, 262_144 - 9, "kept end"]);
  // The log's address did not answer, or answered with nothing.
  for (const answer of [await log("upstream", 500), await log(null)]) expect([answer.status, (await body(answer)).error.code]).toEqual([503, "code_unavailable"]);
  // A job that is not this project's, or gone, is GitHub's 404. Any other answer is a failure, and never followed.
  fetched.mockImplementation(async () => pointer(404, null));
  expect(await failure("/log?job=12")).toEqual([404, "not_found"]);
  for (const answer of [pointer(302, null), pointer(302, "http://logs.example.net/x"), pointer(200, LOG), pointer(403, null)]) {
    fetched.mockClear();
    fetched.mockImplementation(async () => answer);
    expect(await failure("/log?job=12")).toEqual([503, "code_unavailable"]);
    expect(fetched).toHaveBeenCalledTimes(1);
  }
});

// A Cloudflare-kept project: its check runner's binding, standing in.
function runner(status: () => object, restart: () => Promise<void> = async () => {}) {
  const calls: string[] = [];
  const checks = { get: async (id: string) => { calls.push(id); return { status: async () => status(), restart: async () => { calls.push("restart"); await restart(); } }; } };
  return { calls, env: { WONG_CODE_REPOSITORY: "recipe-box", ARTIFACTS: { get: async () => ({}) }, CODE_CHECKS: checks } };
}
const REF = "refs/heads/kim/fix";
const output = (result: string, changes: object = {}) => ({ commit: SHA, ref: REF, result, ...changes });

it("reads a Cloudflare-kept project's check run by the name its runner gave it, in the shape the save scripts judge", async () => {
  const run = async (status: () => object) => { const kept = runner(status); return [(await read(AT, undefined, kept.env))[1], kept.calls]; };
  expect(await run(() => ({ status: "complete", output: output("success", { preview: "https://pr.example.workers.dev" }) })))
    .toEqual([{ run: { state: "done", output: output("success", { preview: "https://pr.example.workers.dev" }) } }, [await runId(SHA, REF)]]);
  const states: [object | Error, object][] = [[{ status: "errored", error: { message: "step timed out" } }, { state: "errored", why: "step timed out" }], [{ status: "terminated" }, { state: "errored", why: "terminated" }],
    [{ status: "errored", error: {} }, { state: "errored", why: "errored" }], [{ status: "running" }, { state: "pending" }], [{ status: "queued" }, { state: "pending" }],
    [{ status: "odd" }, { state: "unreadable", why: "the run is in an unknown state: odd" }], [new Error("instance.not_found"), { state: "missing" }],
    [new Error(`upstream ${TOKEN}`), { state: "unreadable", why: "the check run could not be read" }]];
  for (const [status, expected] of states) expect((await run(() => { if (status instanceof Error) throw status; return status; }))[0]).toEqual({ run: expected });
  // The change is its branch: nothing is opened, and a request for it is still held to its shape.
  const kept = runner(() => ({ status: "running" }));
  expect(await read("", post({ branch: "kim/fix", title: "Fix", body: "" }), kept.env)).toEqual([200, { change: null }]);
  expect(await failure("", post({ branch: "main", title: "Fix", body: "" }), kept.env)).toEqual([400, "invalid_request"]);
  expect(await failure("/log?job=12", undefined, kept.env)).toEqual([404, "not_found"]);
  expect(fetched).not.toHaveBeenCalled();
});

it("starts a check run again only when it was cut off", async () => {
  const again = async (status: () => object, restart?: () => Promise<void>) => { const kept = runner(status, restart); return [(await read("/restart", post({ branch: "kim/fix", sha: SHA }), kept.env))[1].restart, kept.calls.includes("restart")]; };
  expect(await again(() => ({ status: "errored" }))).toEqual(["started", true]);
  expect(await again(() => ({ status: "complete", output: output("interrupted") }))).toEqual(["started", true]);
  expect(await again(() => ({ status: "errored" }), async () => { throw new Error("upstream"); })).toEqual(["failed", true]);
  // A run that failed, passed, answered for another commit or branch, is still going, or is not there, is left alone.
  for (const status of [{ status: "complete", output: output("failure") }, { status: "complete", output: output("success") }, { status: "complete", output: output("interrupted", { commit: "b".repeat(40) }) },
    { status: "complete", output: output("interrupted", { ref: "refs/heads/other" }) }, { status: "complete", output: null }, { status: "running" }]) expect(await again(() => status)).toEqual(["refused", false]);
  expect(await again(() => { throw new Error("instance.not_found"); })).toEqual(["refused", false]);
  const kept = runner(() => ({ status: "errored" }));
  expect(await failure("/restart", post({ branch: "kim/fix" }), kept.env)).toEqual([400, "invalid_request"]);
  expect(await failure("/restart", post({ branch: "kim/fix", sha: SHA }, "text/plain"), kept.env)).toEqual([400, "invalid_request"]);
});
