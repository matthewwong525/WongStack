import { afterEach, expect, it, vi } from "vitest";
import type { Route } from "../api/contract";
import { forwardRoutes } from "../api/forward";
import type { KeyEntry } from "../employee-access/key-levels";
import { keys } from "../keys";
import { appActions, appKeyUse, handleApp, type AppEnv } from "./index";
import { body } from "../../tests/body";

// Hello's routes with one that records its bindings, in an app whose api.ts lists a saved key.
const seen = vi.hoisted(() => [] as AppEnv[]);
vi.mock("./hello/api.ts", async (original) => ({
  keys: ["cloudflare"],
  routes: new Map((await original<{ routes: Map<string, Route> }>()).routes).set(
    "GET peek", (_request: Request, env: AppEnv) => {
      seen.push(env);
      return Response.json({ ok: true });
    },
  ),
}));

afterEach(() => {
  seen.length = 0;
});

const env = { DB: { name: "app-db" }, OTHER_KEY: "another-saved-key", WONG_CLOUDFLARE_READ: "cloudflare-read-key", MEMORY_DB: {}, MEMORY_BUCKET: {},
  WONG_ACCESS_LOGIN_MANAGEMENT: "private-login", WONG_CODE_READ: "project-read-key", ARTIFACTS: { get: async () => ({}) } };
const call = (bindings: object = env) => handleApp(new Request("https://workspace.example.com/apps/hello/api/peek"), bindings as Env, null);

it("hands an app's handlers the saved keys its api.ts lists, and still no memory or sign-in binding", async () => {
  expect((await call()).status).toBe(200);
  // Nor the project's read key or its binding: only the Worker's own code route reads the project.
  expect(Object.keys(seen[0]).sort()).toEqual(["DB", "OTHER_KEY", "WONG_CLOUDFLARE_READ"]);
  // A listed key that is not saved stops the call before the handler.
  const missing = await call({ ...env, WONG_CLOUDFLARE_READ: "" });
  expect([missing.status, (await body(missing)).error.code]).toEqual([503, "unavailable"]);
  expect(seen).toHaveLength(1);
});

it("judges every route of the app by the keys it lists, bare handlers and described actions alike", () => {
  expect(appKeyUse).toEqual([{ apps: ["hello"], keys: ["cloudflare"], need: "read" }, { apps: ["hello"], keys: ["cloudflare"], need: "read" }]);
  // The supplied example alone: a build may hold other folders.
  expect(appActions.filter(({ app }) => app === "hello").map(({ action, access }) => [action.operationId, access])).toEqual([["hello.greeting", { apps: ["hello"], keys: ["cloudflare"] }]]);
});

// A key's direct-use setup is held to its rules where the routes are built, so a mistake fails here, before publishing.
const notion: KeyEntry = { title: "Notion", secrets: ["NOTION_TOKEN"], forward: { base: "https://api.notion.example/v1/", secret: "NOTION_TOKEN",
  header: "Authorization", prefix: "Bearer ", lookups: ["POST search", "POST databases/*/query"] } };
const built = (id: string, key: KeyEntry) => () => forwardRoutes({ [id]: key });
const wrong = (change: Partial<NonNullable<KeyEntry["forward"]>>) => built("notion", { ...notion, forward: { ...notion.forward!, ...change } });

it("builds a clean direct-use setup, and none for the keys this template ships", () => {
  expect([...forwardRoutes({ notion, stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] } }).routes.keys()])
    .toEqual(["POST /api/direct/notion/read", "POST /api/direct/notion/change"]);
  expect(built("ledger", { ...notion, forward: { ...notion.forward!, base: "https://ledger.example/", lookups: undefined } })).not.toThrow();
  // The Cloudflare look-up key and Project code have no direct use, and no service ships set up.
  expect(forwardRoutes(keys).routes.size).toBe(0);
  expect(Object.values<KeyEntry>(keys).filter(key => key.forward)).toEqual([]);
});

it("fails, naming the key, on a direct-use setup that breaks a rule", () => {
  for (const base of ["http://api.notion.example/v1/", "https://api.notion.example/v1", "https://api.notion.example", "https://api.notion.example/v1/?x=1",
    "https://user@api.notion.example/", "https://[/", "https://api.notion.example/a%2Fb/", "//api.notion.example/", "not an address"]) {
    expect(wrong({ base }), base).toThrow("app/worker/keys.ts: notion: base must be an HTTPS address ending in /");
  }
  // The secret sent is one of the key's own: never another key's, never a name the key does not cover.
  expect(wrong({ secret: "STRIPE_SECRET_KEY" })).toThrow("app/worker/keys.ts: notion: secret must be one of the key's own secrets");
  for (const header of ["", "X Api Key", "X-Key: value"]) expect(wrong({ header }), header).toThrow("notion: header must be one request header name");
  // A look-up entry is METHOD path, and its path can match nothing outside the address.
  for (const entry of ["search", "post search", "FETCH search", "POST", "POST /search", "POST ../admin", "POST databases/../../admin", "POST search?x=1", "POST a//b", "POST search more"]) {
    expect(wrong({ lookups: ["POST search", entry] }), entry).toThrow(`app/worker/keys.ts: notion: the look-up "${entry}" must be METHOD path, with a path that stays under base`);
  }
  // A key setup makes, and one the Worker's own route uses, take no direct use.
  for (const kind of [{ setup: true }, { alone: true }] as const) {
    expect(built("notion", { ...notion, ...kind })).toThrow("app/worker/keys.ts: notion: a key setup makes, or the Worker's own route uses, takes no forward");
  }
  expect(built("Notion_Key", notion)).toThrow("app/worker/keys.ts: Notion_Key: a key used directly needs an id in lowercase letters, digits and hyphens");
});
