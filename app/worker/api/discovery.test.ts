import { expect, it } from "vitest";
import { z } from "zod";
import { discovery } from "./discovery";
import { defineAction, registrations } from "./contract";
const env = {} as Env;
const identity = { id: "employee@example.com", kind: "user" as const, claims: { aud: "a", iss: "i", exp: 9999999999 } };
const get = (path = "/api/actions", registry?: Parameters<typeof discovery>[3], headers = {}, method = "GET") => discovery(new Request(`https://example.com${path}`, { headers, method }), env, identity, registry);
const synthetic = (id = "sample.create", extra = {}) => defineAction({ operationId: id, summary: "Create sample", description: "Synthetic sample",
  encoding: "json", effect: "write", agentAvailable: true, input: z.strictObject({ title: z.string().describe("The sample's title") }), output: z.strictObject({ id: z.number() }),
  errors: { denied: "Creation denied" }, examples: [{ input: { title: "Sample" }, output: { id: 1 } }], handler: () => Response.json({ id: 1 }, { status: 201 }), ...extra });
it("requires a verified identity even if the starter is open and refuses unknown methods", async () => {
  expect((await discovery(new Request("https://example.com/api/actions"), env, null)).status).toBe(401);
  expect((await get("/api/actions", undefined, {}, "POST")).status).toBe(404);
});
it("summarizes actual registrations with filters, bounds and pagination, omitting schema bodies", async () => {
  const response = await get(); const data = await response.json();
  expect(data.actions.map((a: { operationId: string }) => a.operationId)).toEqual(["hello.greeting", "main.health"]);
  expect(data.actions[0]).not.toHaveProperty("inputSchema"); expect(data.actions[0].readiness).toBe("available");
  expect((await (await get("/api/actions?limit=1")).json()).next).toBe(1);
  expect((await (await get("/api/actions?limit=1&offset=1")).json()).next).toBeNull();
  expect((await (await get("/api/actions?app=hello&q=person")).json()).total).toBe(1);
  expect((await (await get("/api/actions?app=missing")).json()).total).toBe(0);
  // Every word must appear, in any order and case; one word that appears nowhere matches nothing.
  for (const [words, total] of [["person greet", 1], ["  WORLD   Greet ", 1], ["greet nowhere", 0], ["", 2]] as [string, number][]) {
    expect((await (await get(`/api/actions?q=${encodeURIComponent(words)}`)).json()).total).toBe(total);
  }
  for (const suffix of ["limit=0", "limit=51", "limit=1.1", "offset=-1", "offset=abc", `q=${"a".repeat(201)}`]) expect((await get(`/api/actions?${suffix}`)).status).toBe(400);
});
it("returns only the selected action schema and revision, and supports cache validation", async () => {
  const response = await get("/api/actions?id=hello.greeting"); const selected = await response.json();
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
  const initial = await (await get("/api/openapi.json")).json();
  expect(initial.openapi).toBe("3.1.1"); expect(Object.keys(initial.paths)).toEqual(["/apps/hello/api/greeting", "/api/health"]);
  const greeting = initial.paths["/apps/hello/api/greeting"].get;
  expect(greeting.parameters).toEqual([expect.objectContaining({ name: "name", required: false, in: "query", style: "form", explode: true })]);
  expect(greeting.responses["2XX"].content["application/json"].schema.properties.message.type).toBe("string");
  expect(greeting.responses.default.content["application/json"].schema.properties.error.required).toEqual(["code", "message", "requestId"]);
  const rows = registrations(new Map([["POST /api/create", synthetic()]]));
  const document = await (await get("/api/openapi.json", rows)).json();
  expect(document.paths["/api/create"].post.requestBody.content["application/json"].schema.properties.title.type).toBe("string");
  const scalar = synthetic("sample.query", { encoding: "query", input: z.strictObject({ n: z.number().describe("A number") }), examples: [] });
  const query = await (await get("/api/openapi.json", registrations(new Map([["GET /api/query", scalar]])))).json();
  expect(query.paths["/api/query"].get.parameters[0].required).toBe(true);
});
it("names a write's confirming read only to a caller who may see that read", async () => {
  const rows = (read = {}) => registrations(new Map([["POST /api/create", synthetic("sample.create", { confirmWith: "sample.read" })],
    ["GET /api/read", synthetic("sample.read", { effect: "read", encoding: "none", input: z.strictObject({}), examples: [], ...read })]]));
  expect((await (await get("/api/actions?id=sample.create", rows())).json()).confirmWith).toBe("sample.read");
  expect((await (await get("/api/openapi.json", rows())).json()).paths["/api/create"].post["x-confirm-with"]).toBe("sample.read");
  // The summary row keeps its fields; the name lives on the selected description.
  expect((await (await get("/api/actions", rows())).json()).actions[0]).not.toHaveProperty("confirmWith");
  for (const hidden of [{ allowed: () => false }, { agentAvailable: false }]) {
    const described = await (await get("/api/actions?id=sample.create", rows(hidden))).json();
    expect(described.operationId).toBe("sample.create"); expect(described).not.toHaveProperty("confirmWith");
    const document = await (await get("/api/openapi.json", rows(hidden))).json();
    expect(document.paths["/api/create"].post).not.toHaveProperty("x-confirm-with");
    expect(JSON.stringify(document)).not.toContain("sample.read");
  }
});
it("tracks additions/removals, excludes undeclared and denied operations, and marks missing connections", async () => {
  const a = synthetic();
  const routes = new Map([["POST /api/create", a]]);
  const before = await (await get("/api/actions", registrations(routes))).json();
  routes.set("POST /api/other", synthetic("sample.other", { ready: () => false, allowed: () => true }));
  const after = await (await get("/api/actions", registrations(routes))).json();
  expect(after.revision).not.toBe(before.revision); expect(after.actions[1].readiness).toBe("unavailable");
  const ready = await (await get("/api/actions", registrations(new Map([["POST /api/ready", synthetic("sample.ready", { ready: () => true })]])))).json();
  expect(ready.actions[0].readiness).toBe("available");
  routes.delete("POST /api/other"); expect((await (await get("/api/actions", registrations(routes))).json()).revision).toBe(before.revision);
  for (const extra of [{ agentAvailable: false }, { allowed: () => false }]) expect((await (await get("/api/actions", registrations(new Map([["POST /api/create", synthetic("sample.hidden", extra)]])))).json()).total).toBe(0);
  expect((await (await get("/api/actions", [])).json()).actions).toEqual([]);
});
it("never publishes fixture credentials embedded in descriptions or examples", async () => {
  const secret = "saved-business-secret";
  const action = synthetic("sample.private", { description: secret });
  const response = await discovery(new Request("https://example.com/api/actions"), { SECRET: secret } as unknown as Env, identity,
    registrations(new Map([["POST /api/create", action]])));
  expect(response.status).toBe(500); expect(await response.text()).not.toContain(secret);
});
it("bounds selected details and full documents even for a very large registry schema", async () => {
  const action = synthetic("sample.large", { description: "x".repeat(1048576) });
  const rows = registrations(new Map([["POST /api/large", action]]));
  for (const path of ["/api/actions?id=sample.large", "/api/openapi.json"]) expect((await get(path, rows)).status).toBe(500);
});
