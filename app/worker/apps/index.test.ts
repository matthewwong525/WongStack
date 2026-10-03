import { afterEach, expect, it, vi } from "vitest";
import type { AccessIdentity } from "../access";
import { APP_API, handleApp, type AppCall } from "./index";

// Hello's routes, swapped for one that records what a handler receives.
const seen = vi.hoisted(() => [] as { env: Record<string, unknown>; call: AppCall }[]);
vi.mock("./hello/api.ts", () => ({
  routes: new Map([
    ["GET peek", (_request: Request, env: Record<string, unknown>, call: AppCall) => {
      seen.push({ env, call });
      return Response.json({ ok: true });
    }],
  ]),
}));

afterEach(() => {
  seen.length = 0;
});

const person: AccessIdentity = { id: "owner@example.com", kind: "user", claims: { aud: "a", iss: "i", exp: 0 } };
const env = { DB: { name: "app-db" }, ASSETS: {}, PAYMENT_KEY: "secret", MEMORY_DB: { name: "memory" }, MEMORY_BUCKET: {},MEMORY_INSTALLATION:"private-pins",MEMORY_DATABASE_ID:"id",MEMORY_WORKER_NAME:"worker",MEMORY_UNKNOWN:"closed" } as unknown as Env;
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
  expect(Object.keys(appEnv).filter(name=>name.startsWith("MEMORY_"))).toEqual([]);
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
