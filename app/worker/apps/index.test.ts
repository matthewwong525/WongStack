import { afterEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../access";
import { APP_API, handleApp, type AppCall } from "./index";
import type { Route } from "../api/contract";
import type { PolicyEnv } from "../employee-access/policy";

// Hello's routes, swapped for one that records what a handler receives.
const seen = vi.hoisted(() => [] as { env: Record<string, unknown>; call: AppCall }[]);
vi.mock("./hello/api.ts", async (original) => ({
  // The registry reads each app's `keys`; the supplied example lists none.
  keys: undefined,
  routes: new Map((await original<{ routes: Map<string, Route> }>()).routes).set(
    "GET peek", (_request: Request, env: Record<string, unknown>, call: AppCall) => {
      seen.push({ env, call });
      return Response.json({ ok: true });
    },
  ),
}));

afterEach(() => {
  seen.length = 0;
});

const person: AccessIdentity = { id: "owner@example.com", kind: "user", claims: { aud: "a", iss: "i", exp: 0 } };
const env = { DB: { name: "app-db" }, ASSETS: {}, PAYMENT_KEY: "secret", MEMORY_DB: { name: "memory" }, MEMORY_BUCKET: {},
  WONG_ACCESS_LOGIN_MANAGEMENT: "private-login" } as unknown as Env;
const call = (path: string, method = "GET", identity: AccessIdentity | null = person) =>
  handleApp(new Request(`https://workspace.example.com${path}`, { method }), env, identity);

const expectNotFound = async (response: Response) => {
  expect(response.status).toBe(404);
  expect(await response.json()).toEqual({ error: "Not found" });
};

it("matches only addresses under an app's api", () => {
  for (const path of ["/apps/hello/api", "/apps/hello/api/", "/apps/hello/api/greeting", "/apps/a-b/api/x/y"]) {
    expect(APP_API.test(path), path).toBe(true);
  }
  for (const path of ["/apps/", "/apps/hello/", "/apps/hello/api.mjs", "/apps/hello/apis/x", "/api/health", "/apps//api/x"]) {
    expect(APP_API.test(path), path).toBe(false);
  }
});

it("hands a handler the database and saved keys, but no memory binding", async () => {
  const response = await call("/apps/hello/api/peek?x=1");

  expect(await response.json()).toEqual({ ok: true });
  const [{ env: appEnv, call: info }] = seen;
  expect(appEnv.DB).toBe(env.DB);
  expect(appEnv.PAYMENT_KEY).toBe("secret");
  expect("MEMORY_DB" in appEnv).toBe(false);
  expect("MEMORY_BUCKET" in appEnv).toBe(false);
  // The sign-in list key stays with the core: no mini app is handed it.
  expect("WONG_ACCESS_LOGIN_MANAGEMENT" in appEnv).toBe(false);
  expect("WONG_ACCESS_LOGIN_MANAGEMENT" in env).toBe(true);
  expect("MEMORY_DB" in env).toBe(true);
  expect(info.route).toBe("peek");
  expect(info.url.searchParams.get("x")).toBe("1");
});

it("tells a handler who is calling, or null on an open workspace", async () => {
  await call("/apps/hello/api/peek");
  await call("/apps/hello/api/peek", "GET", null);

  expect(seen.map((entry) => entry.call.identity)).toEqual([person, null]);
});

it("answers an unknown app, route, or method with a JSON 404", async () => {
  await expectNotFound(await call("/apps/nothing/api/peek"));
  await expectNotFound(await call("/apps/hello/api/nothing"));
  await expectNotFound(await call("/apps/hello/api"));
  await expectNotFound(await call("/apps/hello/api/peek", "POST"));
  await expectNotFound(await call("/somewhere/else"));
  expect(seen).toEqual([]);
});

it("does not match a property every object inherits", async () => {
  for (const name of ["constructor", "__proto__", "toString"]) {
    await expectNotFound(await call(`/apps/hello/api/${name}`));
    await expectNotFound(await call(`/apps/${name}/api/peek`));
  }
  expect(seen).toEqual([]);
});

it("applies the app slug to both bare and described routes before handler work", async () => {
  const employee = { ...person, claims: { ...person.claims, sub: "employee", email: person.id,
    iss: "https://business.cloudflareaccess.com", aud: "app", exp: 9999999999 } };
  const row = { policy_enabled: 1, keys_enabled: 0, revision: 1, status: "active", manager: 0, apps: '[]', keys: "{}" };
  const first = vi.fn(async () => row);
  const db = { withSession: vi.fn(() => ({ prepare: () => ({ bind: () => ({ first }) }) })) };
  const bindings = { ...env, DB: db, WONG_OWNER_EMAIL: "actual-owner@example.com", CF_ACCESS_TEAM_DOMAIN: "business.cloudflareaccess.com",
    CF_ACCESS_AUD: "app" } as unknown as Env & PolicyEnv;
  const run = (route: string) => handleApp(new Request(`https://workspace.example.com/apps/hello/api/${route}`), bindings, employee);
  for (const route of ["peek", "greeting"]) expect((await run(route)).status).toBe(403);
  expect(seen).toEqual([]);
  row.apps = '["hello"]';
  expect((await run("peek")).status).toBe(200);
  expect(await (await run("greeting")).json()).toEqual({ message: "Hello, world!" });
  expect(seen).toHaveLength(1);
  row.status = "removed";
  for (const route of ["peek", "greeting"]) expect((await run(route)).status).toBe(403);
  expect(seen).toHaveLength(1);
  expect(db.withSession).toHaveBeenCalledTimes(6);
  expect(db.withSession).toHaveBeenCalledWith("first-primary");
});
