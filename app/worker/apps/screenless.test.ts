import { afterEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../access";
import type { Route } from "../api/contract";
import { appActions, appKeyUse, handleApp, keysAlone } from "./index";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

// Hello's server folder with no screen beside it: the catalogue holds no app of that name. Its api.ts lists a saved key.
vi.mock("../employee-access/catalogue.ts", async () => ({ ...(await import("../../tests/employee-access/catalogue")).builtApps(["access"]), hasScreen: () => false }));
const calls = vi.hoisted(() => ({ count: 0 }));
vi.mock("./hello/api.ts", async (original) => ({
  keys: ["cloudflare"],
  routes: new Map((await original<{ routes: Map<string, Route> }>()).routes).set("POST mark", () => {
    calls.count += 1;
    return Response.json({ ok: true });
  }),
}));

afterEach(() => { calls.count = 0; });

const employee: AccessIdentity = { id: "employee@example.com", kind: "user", claims: { sub: "employee", email: "employee@example.com",
  iss: "https://business.cloudflareaccess.com", aud: "app", exp: 9999999999 } };
// One permission row: key levels have started, and the person holds no app and no level yet.
const row = { policy_enabled: 1, keys_enabled: 1, revision: 1, status: "active", manager: 0, apps: "[]", keys: "{}" };
const env = fakeEnv({ DB: { withSession: () => ({ prepare: () => ({ bind: () => ({ first: async () => row }) }) }) }, WONG_CLOUDFLARE_READ: "cloudflare-read-key",
  WONG_OWNER_EMAIL: "owner@example.com", CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com", CF_ACCESS_AUD: "app" });
const call = (route: string, method = "GET") => handleApp(new Request(`https://workspace.example.com/apps/hello/api/${route}`, { method }), env, employee);
const message = async (response: Response) => [response.status, (await body(response)).error.message];

it("judges a folder with no screen by the saved key its routes list: refused without the key's level, and run with it", async () => {
  // No app of that name exists to be given, and holding one by name gives nothing.
  row.apps = '["hello"]';
  expect(await message(await call("greeting"))).toEqual([403, "Cloudflare: Read needed"]);
  expect(await message(await call("mark", "POST"))).toEqual([403, "Cloudflare: Read & write needed"]);
  row.keys = '{"cloudflare":"read"}';
  expect(await (await call("greeting")).json()).toEqual({ message: "Hello, world!" });
  // The key offers only Read, so its level never reaches a route that changes things.
  expect(await message(await call("mark", "POST"))).toEqual([403, "Cloudflare: Read & write needed"]);
  expect(calls.count).toBe(0);
  // Its key use belongs to no app, and its actions are listed under its folder with the key alone.
  expect(appKeyUse).toEqual([{ apps: [], keys: ["cloudflare"], need: "read" }, { apps: [], keys: ["cloudflare"], need: "write" }]);
  expect(appActions.map(({ app, action, access }) => [app, action.operationId, access])).toEqual([["hello", "hello.greeting", { keys: ["cloudflare"] }]]);
});

it("fails when the Worker loads on a folder with no screen whose route lists no key, naming the file, the route and both fixes", () => {
  const bare = () => new Response();
  const routes = new Map<string, Route>([["GET report", bare]]);
  expect(() => keysAlone("reports", { routes })).toThrow('app/worker/apps/reports/api.ts: "GET report" has no screen and lists no saved key, so nothing guards it. ' +
    "Give the folder a screen at app/src/apps/reports/app.json, or list the saved key the route uses.");
  expect(() => keysAlone("reports", { routes, keys: [] })).toThrow('"GET report" has no screen and lists no saved key');
  // The folder's own list covers its bare handlers, and each route is mapped to it.
  expect([...keysAlone("reports", { routes, keys: ["cloudflare"] })]).toEqual([["GET report", { keys: ["cloudflare"] }]]);
});
