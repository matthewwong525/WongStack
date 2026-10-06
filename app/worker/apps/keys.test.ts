import { afterEach, expect, it, vi } from "vitest";
import type { Route } from "../api/contract";
import { appActions, appKeyUse, handleApp } from "./index";

// Hello's routes with one that records its bindings, in an app whose api.ts lists a saved key.
const seen = vi.hoisted(() => [] as Record<string, unknown>[]);
vi.mock("./hello/api.ts", async (original) => ({
  keys: ["cloudflare"],
  routes: new Map((await original<{ routes: Map<string, Route> }>()).routes).set(
    "GET peek", (_request: Request, env: Record<string, unknown>) => {
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
  expect([missing.status, (await missing.json()).error.code]).toEqual([503, "unavailable"]);
  expect(seen).toHaveLength(1);
});

it("judges every route of the app by the keys it lists, bare handlers and described actions alike", () => {
  expect(appKeyUse).toEqual([{ apps: ["hello"], keys: ["cloudflare"], need: "read" }, { apps: ["hello"], keys: ["cloudflare"], need: "read" }]);
  // The supplied example alone: a build may hold other folders.
  expect(appActions.filter(({ app }) => app === "hello").map(({ action, access }) => [action.operationId, access])).toEqual([["hello.greeting", { apps: ["hello"], keys: ["cloudflare"] }]]);
});
