import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { PUSHERS, pushersRoute, refreshOnSchedule, refreshPushers } from "./pushers";
import { handleAccess } from "./router";
import { cloudflare, employee, fixture, key, owner, req, site } from "../../tests/employee-access/connections";
import { fakeArtifacts } from "../../tests/env";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders"]));
const TOKEN = "github_pat_synthetic_read_value";
const previews = { appId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd", policyId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee" };
const previewsRoot = `https://api.cloudflare.com/client/v4/accounts/${site.accountId}/access/apps/${previews.appId}`;
const user = (id: number, login: string, push = true, type = "User") => ({ id, login, type, permissions: { push, pull: true } });
const commit = (login: string | null, email: string) => ({ commit: { author: { email } }, author: login ? { login } : null });

let f: ReturnType<typeof fixture>;
let live: ReturnType<typeof cloudflare>["state"];
let staging: ReturnType<typeof cloudflare>["state"];
let gh: { collaborators: object[]; profiles: Record<string, string | null>; commits: Record<string, object[]>; failing: (url: string) => boolean };
let fetch: ReturnType<typeof vi.fn>;
const githubCalls = () => fetch.mock.calls.map(([url]) => String(url)).filter(url => url.startsWith("https://api.github.com/"));
beforeEach(() => {
  f = fixture();
  Object.assign(f.env, { WONG_CODE_REPOSITORY: "acme/shop", WONG_CODE_READ: TOKEN,
    WONG_ACCESS_LOGIN_MANAGEMENT: JSON.stringify({ ...JSON.parse(key), version: 3, staging: previews }) });
  const [first, second] = [cloudflare(), cloudflare()];
  second.state.app = { ...second.state.app, id: previews.appId, aud: "previews-app", destinations: [{ type: "worker", worker_id: "worker-staging" }] };
  second.state.policy = { ...second.state.policy, id: previews.policyId };
  [live, staging] = [first.state, second.state];
  gh = { collaborators: [], profiles: {}, commits: {}, failing: () => false };
  fetch = vi.fn(async (url: string, init: RequestInit) => {
    if (!url.startsWith("https://api.github.com/")) return (url.startsWith(previewsRoot) ? second.fetch : first.fetch)(url, init);
    if (gh.failing(url)) return new Response(`GitHub says no to ${TOKEN}`, { status: 500 });
    const { pathname, searchParams } = new URL(url);
    if (pathname === "/repos/acme/shop/collaborators") {
      const page = Number(searchParams.get("page"));
      return Response.json(gh.collaborators.slice((page - 1) * 100, page * 100));
    }
    if (pathname.startsWith("/users/")) return Response.json({ email: gh.profiles[pathname.slice(7)] ?? null });
    if (pathname === "/repos/acme/shop/commits") return Response.json(gh.commits[searchParams.get("author")!] ?? []);
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetch);
});
afterEach(() => { f.sql.close(); vi.unstubAllGlobals(); vi.useRealTimers(); });
const rows = () => f.sql.prepare("SELECT github_id, login, email, email_source FROM wong_access_pushers ORDER BY github_id").all();
const sessions = () => f.sql.prepare("SELECT status, scope FROM wong_access_work WHERE kind = 'sessions'").get();
const listed = (state: typeof live) => (state.policy.include as { email: { email: string } }[]).map(rule => rule.email.email);
const revoked = () => fetch.mock.calls.map(([url]) => String(url)).filter(url => url.endsWith("/revoke_tokens"));

it("lists a new pusher by their own commit email, skipping no-reply and other people's commits, and lets them in to previews alone", async () => {
  gh.collaborators = [user(7, "kim-lee"), user(8, "reader", false), user(9, "ci-bot", true, "Bot")];
  gh.commits["kim-lee"] = [commit("kim-lee", "7+kim-lee@users.noreply.github.com"), commit("someone-else", "other@example.com"),
    commit(null, "unlinked@example.com"), commit("Kim-Lee", "Kim@Example.com"), commit("kim-lee", "older@example.com")];
  await refreshPushers(f.core);
  expect(rows()).toEqual([{ github_id: 7, login: "kim-lee", email: "kim@example.com", email_source: "commit" }]);
  expect(listed(staging)).toContain("kim@example.com");
  expect(listed(live)).not.toContain("kim@example.com");
  expect(listed(live)).toEqual(expect.arrayContaining([site.ownerEmail, employee.id]));
  // Nobody left, so nobody is signed out.
  expect(revoked()).toEqual([]);
  expect(githubCalls().every(url => !url.includes(site.accessAppId))).toBe(true);
});

it("takes a profile email over any commit, and looks up an unknown one at most once an hour", async () => {
  gh.collaborators = [user(7, "kim-lee"), user(8, "jo-builds")];
  gh.profiles["kim-lee"] = "kim@profile.example.com";
  gh.commits["kim-lee"] = [commit("kim-lee", "kim@commit.example.com")];
  await refreshPushers(f.core);
  expect(rows()).toEqual([{ github_id: 7, login: "kim-lee", email: "kim@profile.example.com", email_source: "profile" },
    { github_id: 8, login: "jo-builds", email: null, email_source: null }]);
  const count = githubCalls().length;
  await refreshPushers(f.core);
  // Only the list is read again: Kim is known, and Jo was looked up within the hour.
  expect(githubCalls().slice(count)).toEqual(["https://api.github.com/repos/acme/shop/collaborators?affiliation=all&per_page=100&page=1"]);
  f.sql.exec("UPDATE wong_access_pushers SET checked_at = '2000-01-01T00:00:00.000Z'");
  gh.commits["jo-builds"] = [commit("jo-builds", "jo@example.com")];
  await refreshPushers(f.core);
  expect(rows()).toContainEqual({ github_id: 8, login: "jo-builds", email: "jo@example.com", email_source: "commit" });
});

it("keeps an email the owner typed across refreshes, and follows a renamed account by its id", async () => {
  gh.collaborators = [user(7, "kim-lee")];
  gh.commits["kim-lee"] = [commit("kim-lee", "kim@commit.example.com")];
  await refreshPushers(f.core);
  f.sql.exec("UPDATE wong_access_pushers SET email = 'kim@shop.example.com', email_source = 'owner'");
  gh.collaborators = [user(7, "kim-renamed")];
  await refreshPushers(f.core);
  expect(rows()).toEqual([{ github_id: 7, login: "kim-renamed", email: "kim@shop.example.com", email_source: "owner" }]);
});

it("puts known pushers back on the previews list after setup splits an older install's sign-in, reading it once a refresh", async () => {
  gh.collaborators = [user(7, "kim-lee")];
  gh.profiles["kim-lee"] = "kim@example.com";
  await refreshPushers({ ...f.core, env: { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: key } });
  expect([rows(), staging.writes]).toEqual([[{ github_id: 7, login: "kim-lee", email: "kim@example.com", email_source: "profile" }], []]);
  // Setup's split writes the previews list as the owner and the live app's people, with no pushers.
  staging.policy.include = [site.ownerEmail, employee.id].map(email => ({ email: { email } }));
  await refreshPushers(f.core);
  expect(listed(staging)).toContain("kim@example.com");
  expect(listed(live)).not.toContain("kim@example.com");
  const count = fetch.mock.calls.length;
  await refreshPushers(f.core);
  // Matching now: one read of the previews list, and no write.
  expect(fetch.mock.calls.slice(count).map(([url]) => String(url)).filter(url => url.startsWith(previewsRoot)))
    .toEqual([`${previewsRoot}/policies?per_page=1000`]);
  expect(staging.writes).toHaveLength(1);
  // A list the app can not read is left alone.
  staging.policy.include = [{ everyone: {} }];
  await refreshPushers(f.core);
  expect(staging.writes).toHaveLength(1);
  // A write that failed is retried as it was, not queued again on every refresh.
  staging.policy.include = [{ email: { email: site.ownerEmail } }];
  staging.failPolicy = true;
  const changes = () => f.sql.prepare("SELECT COUNT(*) count FROM wong_access_audit WHERE event = 'pushers_changed'").get();
  await refreshPushers(f.core);
  const queued = changes();
  await refreshPushers(f.core);
  expect([changes(), f.sql.prepare("SELECT status FROM wong_access_work WHERE kind = 'policy'").get()]).toEqual([queued, { status: "failed" }]);
});

it("drops a pusher gone from GitHub and ends previews sessions alone, unless they are still a person in Access", async () => {
  gh.collaborators = [user(7, "kim-lee"), user(8, "staff")];
  gh.commits["kim-lee"] = [commit("kim-lee", "kim@example.com")];
  gh.commits.staff = [commit("staff", employee.id)];
  await refreshPushers(f.core);
  expect(listed(staging)).toEqual(expect.arrayContaining(["kim@example.com", employee.id]));
  // The employee leaves GitHub but stays a person in Access: both lists keep them, and no one is signed out.
  gh.collaborators = [user(7, "kim-lee")];
  await refreshPushers(f.core);
  expect([listed(live).includes(employee.id), listed(staging).includes(employee.id), revoked()]).toEqual([true, true, []]);
  gh.collaborators = [];
  await refreshPushers(f.core);
  expect(rows()).toEqual([]);
  expect(listed(staging)).not.toContain("kim@example.com");
  expect(sessions()).toEqual({ status: "ready", scope: "previews" });
  expect(revoked()).toEqual([`${previewsRoot}/revoke_tokens`]);
});

it("writes nothing when any page of the list fails, and says GitHub could not be reached", async () => {
  gh.collaborators = Array.from({ length: 150 }, (_, at) => user(at + 1, `person-${at + 1}`));
  f.sql.prepare("INSERT INTO wong_access_pushers VALUES (?, 999, 'old-pusher', 'old@example.com', 'commit', NULL)").run(site.installationId);
  gh.failing = url => url.includes("page=2");
  await expect(refreshPushers(f.core)).rejects.toThrow();
  expect(rows()).toEqual([{ github_id: 999, login: "old-pusher", email: "old@example.com", email_source: "commit" }]);
  expect(f.sql.prepare("SELECT COUNT(*) count FROM wong_access_work").get()).toEqual({ count: 0 });
  expect([live.writes, staging.writes, revoked()]).toEqual([[], [], []]);
  const answer = await (await pushersRoute(req("pushers", "GET"), f.env, owner, () => {})).text();
  expect(JSON.parse(answer)).toMatchObject({ state: "unavailable", pushers: [{ login: "old-pusher" }] });
  expect(answer).not.toContain(TOKEN);
});

it("never calls GitHub on a preview, for a project kept in Cloudflare, without a key, or before permissions start", async () => {
  gh.collaborators = [user(7, "kim-lee")];
  await refreshPushers({ ...f.core, live: false });
  await refreshPushers({ ...f.core, env: { ...f.env, WONG_CODE_READ: undefined } });
  await refreshPushers({ ...f.core, env: { ...f.env, WONG_CODE_REPOSITORY: "shop", ARTIFACTS: fakeArtifacts({ get: async () => ({}) }) } });
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  await refreshPushers(f.core);
  await refreshOnSchedule({ ...f.env, WONG_ENVIRONMENT: "staging" });
  expect(githubCalls()).toEqual([]);
  expect(rows()).toEqual([]);
});

it("runs on the timetable as the live app's own pass", async () => {
  gh.collaborators = [user(7, "kim-lee")];
  gh.profiles["kim-lee"] = "kim@example.com";
  await refreshOnSchedule(f.env);
  expect(rows()).toEqual([{ github_id: 7, login: "kim-lee", email: "kim@example.com", email_source: "profile" }]);
  expect(f.sql.prepare("SELECT actor_email, event FROM wong_access_audit WHERE event = 'pushers_changed'").get())
    .toEqual({ actor_email: site.ownerEmail, event: "pushers_changed" });
  // Before the owner first opened Access there is no installation, and the run does nothing.
  const empty = fixture({ started: false });
  await refreshOnSchedule({ ...empty.env, WONG_CODE_REPOSITORY: "acme/shop", WONG_CODE_READ: TOKEN });
  expect(empty.sql.prepare("SELECT COUNT(*) count FROM wong_access_installation").get()).toEqual({ count: 0 });
  empty.sql.close();
});

it("refuses anyone who manages nothing, both reading and saving", async () => {
  for (const request of [req("pushers", "GET"), req("pushers/7", "PUT", { email: "kim@example.com" })]) {
    const answer = await pushersRoute(request, f.env, employee, () => {});
    expect([answer.status, await answer.json()]).toEqual([403, { code: "owner_required" }]);
  }
  expect(githubCalls()).toEqual([]);
});

it("saves a typed email as the owner's, lets it in to previews, and refuses a bad one", async () => {
  gh.collaborators = [user(8, "jo-builds")];
  const waited: Promise<unknown>[] = [];
  const first = await (await pushersRoute(req("pushers", "GET"), f.env, owner, work => waited.push(work))).json();
  // The first open waits for GitHub rather than show an empty list.
  expect([first, waited]).toEqual([{ state: "listed", split: true,
    pushers: [{ githubId: 8, login: "jo-builds", email: null, emailSource: null, canOpenPreviews: false }] }, []]);
  for (const body of [{ email: "not an email" }, { email: "jo@example.com", extra: true }, {}]) {
    expect((await pushersRoute(req("pushers/8", "PUT", body), f.env, owner, () => {})).status).toBe(400);
  }
  expect((await pushersRoute(req("pushers/9", "PUT", { email: "jo@example.com" }), f.env, owner, () => {})).status).toBe(404);
  const saved = await pushersRoute(req("pushers/8", "PUT", { email: " Jo@Example.com " }), f.env, owner, () => {});
  expect(await saved.json()).toMatchObject({ pushers: [{ email: "jo@example.com", emailSource: "owner", canOpenPreviews: true }] });
  expect(listed(staging)).toContain("jo@example.com");
  expect(listed(live)).not.toContain("jo@example.com");
  // A later open shows the list at once and refreshes after answering.
  await pushersRoute(req("pushers", "GET"), f.env, owner, work => waited.push(work));
  expect(waited).toHaveLength(1);
  await waited[0];
  // Cleared, the email leaves the previews list and the app looks for one again.
  await pushersRoute(req("pushers/8", "PUT", { email: "" }), f.env, owner, () => {});
  expect(rows()).toEqual([{ github_id: 8, login: "jo-builds", email: null, email_source: null }]);
  expect(listed(staging)).not.toContain("jo@example.com");
});

it("is reached through the Access router, and says when permissions have not started or the data can not be read", async () => {
  gh.collaborators = [user(7, "kim-lee"), user(8, "jo-builds")];
  gh.profiles["kim-lee"] = "kim@example.com";
  for (let open = 0; open < 2; open++) expect((await handleAccess(req("pushers", "GET"), f.env, owner)).status).toBe(200);
  const saved = await (await handleAccess(req("pushers/8", "PUT", { email: "jo@example.com" }), f.env, owner)).json();
  expect(saved).toMatchObject({ pushers: [{ email: "jo@example.com" }, { email: "kim@example.com", emailSource: "profile" }] });
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 0");
  expect(await (await handleAccess(req("pushers", "GET"), f.env, owner)).json()).toEqual({ state: "not_started", pushers: [] });
  f.sql.exec("UPDATE wong_access_installation SET policy_enabled = 1; DROP TABLE wong_access_pushers");
  const broken = await handleAccess(req("pushers", "GET"), f.env, owner);
  expect([broken.status, await broken.json()]).toEqual([503, { code: "access_unavailable" }]);
});

it("answers a preview with Live app only and never reads GitHub; names a missing key, an unsplit sign-in, and a project kept elsewhere", async () => {
  const state = async (env: object) => ((await (await pushersRoute(req("pushers", "GET"), { ...f.env, ...env }, owner, () => {})).json()) as { state: string }).state;
  expect(await state({ WONG_ENVIRONMENT: "staging" })).toBe("live_only");
  expect(await state({ WONG_CODE_READ: undefined })).toBe("no_github");
  expect(await state({ WONG_CODE_READ: undefined, WONG_CODE_REPOSITORY: "shop", ARTIFACTS: fakeArtifacts({ get: async () => ({}) }) })).toBe("not_github");
  expect(githubCalls()).toEqual([]);
  gh.collaborators = [user(7, "kim-lee")];
  gh.profiles["kim-lee"] = "kim@example.com";
  const unsplit = await (await pushersRoute(req("pushers", "GET"), { ...f.env, WONG_ACCESS_LOGIN_MANAGEMENT: key }, owner, () => {})).json();
  expect(unsplit).toMatchObject({ state: "listed", split: false, pushers: [{ email: "kim@example.com", canOpenPreviews: false }] });
  expect((await pushersRoute(req("pushers/x", "PUT", {}), f.env, owner, () => {})).status).toBe(404);
  expect(PUSHERS).toBe("/api/access/pushers");
});
