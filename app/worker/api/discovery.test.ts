import { expect, it } from "vitest";
import { z } from "zod";
import { discovery } from "./discovery";
import { defineAction, registrations } from "./contract";
import { apiActions } from "./router";
import { appActions } from "../apps/index";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";
const env = {} as Env;
// The supplied actions alone: a build may hold other folders, as this source repo holds a sample area.
const supplied = [...apiActions, ...appActions].filter(({ app }) => app === "main" || app === "hello");
const identity = { id: "employee@example.com", kind: "user" as const, claims: { aud: "a", iss: "i", exp: 9999999999 } };
const get = (path = "/api/actions", registry: Parameters<typeof discovery>[3] = supplied, headers = {}, method = "GET") => discovery(new Request(`https://example.com${path}`, { headers, method }), env, identity, registry);
const synthetic = (id = "sample.create", extra = {}) => defineAction({ operationId: id, summary: "Create sample", description: "Synthetic sample",
  encoding: "json", effect: "write", agentAvailable: true, input: z.strictObject({ title: z.string().describe("The sample's title") }), output: z.strictObject({ id: z.number() }),
  errors: { denied: "Creation denied" }, examples: [{ input: { title: "Sample" }, output: { id: 1 } }], handler: () => Response.json({ id: 1 }, { status: 201 }), ...extra });
it("requires a verified identity even if the starter is open and refuses unknown methods", async () => {
  expect((await discovery(new Request("https://example.com/api/actions"), env, null)).status).toBe(401);
  expect((await get("/api/actions", undefined, {}, "POST")).status).toBe(404);
});
it("summarizes actual registrations with filters, bounds and pagination, omitting schema bodies", async () => {
  const response = await get(); const data = await body(response);
  expect(data.actions.map(a => a.operationId)).toEqual(["hello.greeting", "main.health"]);
  expect(data.actions[0]).not.toHaveProperty("inputSchema"); expect(data.actions[0].readiness).toBe("available");
  expect((await body(await get("/api/actions?limit=1"))).next).toBe(1);
  expect((await body(await get("/api/actions?limit=1&offset=1"))).next).toBeNull();
  expect((await body(await get("/api/actions?app=hello&q=person"))).total).toBe(1);
  expect((await body(await get("/api/actions?app=missing"))).total).toBe(0);
  // Every word must appear, in any order and case; one word that appears nowhere matches nothing.
  for (const [words, total] of [["person greet", 1], ["  WORLD   Greet ", 1], ["greet nowhere", 0], ["", 2]] as [string, number][]) {
    expect((await body(await get(`/api/actions?q=${encodeURIComponent(words)}`))).total).toBe(total);
  }
  for (const suffix of ["limit=0", "limit=51", "limit=1.1", "offset=-1", "offset=abc", `q=${"a".repeat(201)}`]) expect((await get(`/api/actions?${suffix}`)).status).toBe(400);
});
it("returns only the selected action schema and revision, and supports cache validation", async () => {
  const response = await get("/api/actions?id=hello.greeting"); const selected = await body(response);
  expect(selected.path).toBe("/apps/hello/api/greeting"); expect(selected.method).toBe("GET");
  expect(selected.inputSchema.properties.name.type).toBe("string"); expect(selected.examples[0].input.name).toBe("Ada");
  expect(selected.inputSchema.properties.name.description).toMatch(/greet/); expect(selected).not.toHaveProperty("confirmWith");
  expect(selected.errorSchema.properties.error.properties.issues.items.required).toEqual(["path", "message"]);
  expect(selected.outputSchema.properties.message.type).toBe("string"); expect(selected.errorSchema.properties.error.required).toContain("requestId");
  expect(JSON.stringify(selected)).not.toContain("main.health");
  const cached = await get("/api/actions?id=hello.greeting", undefined, { "if-none-match": response.headers.get("etag") });
  expect(cached.status).toBe(304); expect(await cached.text()).toBe("");
  expect((await get("/api/actions?id=missing.action")).status).toBe(404);
});
it("generates truthful HTTP-only OpenAPI with query scalars, JSON bodies and success/error schemas", async () => {
  const initial = await body(await get("/api/openapi.json"));
  expect(initial.openapi).toBe("3.1.1"); expect(Object.keys(initial.paths)).toEqual(["/apps/hello/api/greeting", "/api/health"]);
  const greeting = initial.paths["/apps/hello/api/greeting"].get;
  expect(greeting.parameters).toEqual([expect.objectContaining({ name: "name", required: false, in: "query", style: "form", explode: true })]);
  expect(greeting.responses["2XX"].content["application/json"].schema.properties.message.type).toBe("string");
  expect(greeting.responses.default.content["application/json"].schema.properties.error.required).toEqual(["code", "message", "requestId"]);
  const rows = registrations(new Map([["POST /api/create", synthetic()]]));
  const document = await body(await get("/api/openapi.json", rows));
  expect(document.paths["/api/create"].post.requestBody.content["application/json"].schema.properties.title.type).toBe("string");
  const scalar = synthetic("sample.query", { encoding: "query", input: z.strictObject({ n: z.number().describe("A number") }), examples: [] });
  const query = await body(await get("/api/openapi.json", registrations(new Map([["GET /api/query", scalar]]))));
  expect(query.paths["/api/query"].get.parameters[0].required).toBe(true);
});
it("names a write's confirming read only to a caller who may see that read", async () => {
  const rows = (read = {}) => registrations(new Map([["POST /api/create", synthetic("sample.create", { confirmWith: "sample.read" })],
    ["GET /api/read", synthetic("sample.read", { effect: "read", encoding: "none", input: z.strictObject({}), examples: [], ...read })]]));
  expect((await body(await get("/api/actions?id=sample.create", rows()))).confirmWith).toBe("sample.read");
  expect((await body(await get("/api/openapi.json", rows()))).paths["/api/create"].post["x-confirm-with"]).toBe("sample.read");
  // The summary row keeps its fields; the name lives on the selected description.
  expect((await body(await get("/api/actions", rows()))).actions[0]).not.toHaveProperty("confirmWith");
  for (const hidden of [{ allowed: () => false }, { agentAvailable: false }]) {
    const described = await body(await get("/api/actions?id=sample.create", rows(hidden)));
    expect(described.operationId).toBe("sample.create"); expect(described).not.toHaveProperty("confirmWith");
    const document = await body(await get("/api/openapi.json", rows(hidden)));
    expect(document.paths["/api/create"].post).not.toHaveProperty("x-confirm-with");
    expect(JSON.stringify(document)).not.toContain("sample.read");
  }
});
it("tracks additions/removals, excludes undeclared and denied operations, and marks missing connections", async () => {
  const a = synthetic();
  const routes = new Map([["POST /api/create", a]]);
  const before = await body(await get("/api/actions", registrations(routes)));
  routes.set("POST /api/other", synthetic("sample.other", { ready: () => false, allowed: () => true }));
  const after = await body(await get("/api/actions", registrations(routes)));
  expect(after.revision).not.toBe(before.revision); expect(after.actions[1].readiness).toBe("unavailable");
  const ready = await body(await get("/api/actions", registrations(new Map([["POST /api/ready", synthetic("sample.ready", { ready: () => true })]]))));
  expect(ready.actions[0].readiness).toBe("available");
  routes.delete("POST /api/other"); expect((await body(await get("/api/actions", registrations(routes)))).revision).toBe(before.revision);
  for (const extra of [{ agentAvailable: false }, { allowed: () => false }]) expect((await body(await get("/api/actions", registrations(new Map([["POST /api/create", synthetic("sample.hidden", extra)]]))))).total).toBe(0);
  expect((await body(await get("/api/actions", []))).actions).toEqual([]);
});
it("never publishes fixture credentials embedded in descriptions or examples", async () => {
  const secret = "saved-business-secret";
  const action = synthetic("sample.private", { description: secret });
  const response = await discovery(new Request("https://example.com/api/actions"), fakeEnv({ SECRET: secret }), identity,
    registrations(new Map([["POST /api/create", action]])));
  expect(response.status).toBe(500); expect(await response.text()).not.toContain(secret);
});
it("bounds selected details and full documents even for a very large registry schema", async () => {
  const action = synthetic("sample.large", { description: "x".repeat(1048576) });
  const rows = registrations(new Map([["POST /api/large", action]]));
  for (const path of ["/api/actions?id=sample.large", "/api/openapi.json"]) expect((await get(path, rows)).status).toBe(500);
});
