import { expect, it, vi } from "vitest";
import { z } from "zod";
import { boundedText, defineAction, dispatch, registrations, uniqueActions, type Action, type Route } from "./contract";
import type { AppCall, AppEnv } from "../apps/index";
const env = {} as AppEnv;
const identity = { id: "employee@example.com", kind: "user" as const, claims: { aud: "a", iss: "i", exp: 9999999999 } };
const action = (extra: Partial<Action> = {}) => defineAction({ operationId: "test.read", summary: "Test", description: "A synthetic action",
  encoding: "query", input: z.strictObject({ name: z.string().optional() }), output: z.strictObject({ value: z.string() }),
  effect: "read", agentAvailable: true, errors: {}, examples: [{ input: { name: "Ada" }, output: { value: "Ada" } }],
  handler: (_request, _env, call) => Response.json({ value: (call.input as { name?: string }).name ?? "world" }), ...extra });
const call = (route: Route, suffix = "", init: RequestInit = {}, caller: AppCall["identity"] = identity, bindings = env) => {
  const request = new Request(`https://example.com/api/test${suffix}`, init);
  return dispatch(route, request, bindings, { url: new URL(request.url), route: "test", identity: caller });
};
it("validates definitions, schemas, examples, routes and global operation uniqueness", () => {
  const a = action();
  expect(registrations(new Map([["GET /api/test", a]]))[0].path).toBe("/api/test");
  expect(registrations(new Map([["POST test", a]]), "sample")[0].path).toBe("/apps/sample/api/test");
  expect(uniqueActions([])).toEqual([]);
  const rows = registrations(new Map([["GET /api/test", a]]));
  expect(() => uniqueActions([...rows, ...rows])).toThrow("Duplicate operation");
  for (const key of ["bad", "TRACE /api/test", "GET /invalid", "GET /api/test?bad"]) expect(() => registrations(new Map([[key, a]]))).toThrow("Invalid route");
  for (const extra of [{ operationId: "wrong" }, { operationId: "memory.search" }, { summary: "" }, { description: "" }, { agentAvailable: undefined },
    { handler: undefined }, { effect: "other" }, { encoding: "other" }]) expect(() => action(extra as Partial<Action>)).toThrow("Invalid action");
  expect(() => action({ input: z.date() })).toThrow();
  expect(() => action({ output: z.string().transform(value => value.length) })).toThrow();
  expect(() => action({ input: z.strictObject({ name: z.string().transform(value => value.length) }) })).toThrow();
  expect(() => action({ input: z.string() })).toThrow("Invalid input");
  expect(() => action({ encoding: "none" })).toThrow("Invalid input");
  expect(() => action({ input: z.strictObject({ nested: z.array(z.string()) }) })).toThrow("scalar");
  for (const limits of [{ inputBytes: 0, outputBytes: 1, timeoutMs: 1 }, { inputBytes: 1048577, outputBytes: 1, timeoutMs: 1 },
    { inputBytes: 1, outputBytes: 4194305, timeoutMs: 1 }, { inputBytes: 1, outputBytes: 1, timeoutMs: 60001 }]) expect(() => action({ limits })).toThrow("limits");
  expect(() => action({ examples: [{ input: { name: 5 }, output: { value: "x" } }] })).toThrow();
  expect(() => action({ examples: [{ input: {}, output: {} }] })).toThrow();
});
it("keeps bare handlers and unusual legacy routes working without advertising them", async () => {
  const handler = vi.fn(() => Response.json({ legacy: true }));
  expect(registrations(new Map([["GET /api/custom.v1", handler]]))).toEqual([]);
  expect(await (await call(handler, "", {}, null)).json()).toEqual({ legacy: true });
  expect(handler).toHaveBeenCalledOnce();
});
it("passes the same verified identity to app and agent calls and preserves a record guard", async () => {
  const handler = vi.fn((_request, _env, context) => context.identity.id === identity.id ? Response.json({ value: "record" }) : new Response("credential diagnostic", { status: 403 }));
  const a = action({ handler });
  const app = await call(a), agent = await call(a);
  expect(await app.json()).toEqual(await agent.json());
  expect(handler.mock.calls[0][2].identity).toBe(identity);
  const denied = await call(a, "", {}, { ...identity, id: "other@example.com" });
  expect(denied.status).toBe(403);
  expect(await denied.text()).not.toContain("credential diagnostic");
});
it("fails closed on missing identity and connection while retaining public example compatibility", async () => {
  const handler = vi.fn(() => Response.json({ value: "x" }));
  expect((await call(action({ handler }), "", {}, null)).status).toBe(401);
  expect((await call(action({ handler, requiresIdentity: false, ready: () => true }), "", {}, null)).status).toBe(401);
  expect((await call(action({ handler, ready: () => false }))).status).toBe(503);
  expect((await call(action({ handler, allowed: () => false }))).status).toBe(403);
  expect(handler).not.toHaveBeenCalled();
  expect((await call(action({ requiresIdentity: false }), "", {}, null)).status).toBe(200);
  expect((await call(action({ ready: () => true, allowed: () => true }))).status).toBe(200);
});
it("rejects input before calling the handler and decodes only documented scalar query fields", async () => {
  const handler = vi.fn(() => Response.json({ value: "x" }));
  const a = action({ handler });
  for (const [suffix, init] of [["?other=1", {}], ["?name=a&name=b", {}], ["", { method: "POST", body: "x" }]] as [string, RequestInit][]) expect((await call(a, suffix, init)).status).toBe(400);
  expect(handler).not.toHaveBeenCalled();
  const scalar = action({ input: z.strictObject({ n: z.number(), b: z.boolean() }), examples: [], handler: (_r, _e, c) => Response.json({ value: JSON.stringify(c.input) }) });
  expect(await (await call(scalar, "?n=3&b=true")).json()).toEqual({ value: '{"n":3,"b":true}' });
  expect((await call(scalar, "?n=3&b=false")).status).toBe(200);
  expect((await call(scalar, "?n=&b=maybe")).status).toBe(400);
});
it("accepts nested JSON, rejects incorrect encoding and bounds input bytes", async () => {
  const handler = vi.fn(() => Response.json({ value: "ok" }));
  const a = action({ encoding: "json", input: z.strictObject({ nested: z.strictObject({ n: z.number() }) }), examples: [], handler });
  expect((await call(a, "", { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: '{"nested":{"n":2}}' })).status).toBe(200);
  // A dictionary schema has additionalProperties rather than named properties.
  const dictionary = action({ encoding: "json", input: z.record(z.string(), z.string()), examples: [], handler });
  expect((await call(dictionary, "", { method: "POST", headers: { "content-type": "application/json" }, body: '{"title":"Sample"}' })).status).toBe(200);
  for (const body of ["broken", '{}']) expect((await call(a, "", { method: "POST", headers: { "content-type": "application/json" }, body })).status).toBe(400);
  expect((await call(a, "", { method: "POST", body: '{}' })).status).toBe(400);
  const bounded = action({ limits: { inputBytes: 2, outputBytes: 100, timeoutMs: 500 } });
  expect((await call(bounded, "?name=long")).status).toBe(400);
  expect((await call(action({ ...a, limits: { inputBytes: 2, outputBytes: 100, timeoutMs: 500 } }), "", { method: "POST", headers: { "content-type": "application/json" }, body: '{"nested":{"n":2}}' })).status).toBe(400);
  expect(await boundedText(null, 1)).toBe("");
});
it("rejects mismatched or secret-bearing outputs and sanitizes provider exceptions and denials", async () => {
  const secret = "saved-business-credential";
  const handlers = [() => Response.json({ wrong: true }), () => new Response("not json"), () => { throw new Error(secret); },
    () => Response.json({ value: secret }), () => Response.json({ value: `sk-${"a".repeat(30)}` })];
  for (const handler of handlers) {
    const response = await call(action({ handler }), "", {}, identity, { SECRET: secret } as unknown as AppEnv);
    expect(response.status).toBe(500); expect(await response.text()).not.toContain(secret);
  }
  for (const status of [401, 403, 409]) expect((await call(action({ handler: () => new Response(secret, { status }) }))).status).toBe(status);
  // A setting committed with the code is no secret: an answer may name the owner or the environment.
  const committed = { SECRET: secret, WONG_OWNER_EMAIL: "owner@example.com", WONG_ENVIRONMENT: "production" } as unknown as AppEnv;
  const named = await call(action({ handler: () => Response.json({ value: "owner@example.com's production account" }) }), "", {}, identity, committed);
  expect(named.status).toBe(200);
  expect((await call(action({ handler: () => Response.json({ value: secret }) }), "", {}, identity, committed)).status).toBe(500);
  expect((await call(action({ handler: () => Response.json({ value: "too long" }), limits: { inputBytes: 100, outputBytes: 2, timeoutMs: 500 } }))).status).toBe(500);
});
it("bounds execution time without replaying a possibly completed write", async () => {
  const handler = vi.fn(() => new Promise<Response>(() => {}));
  const response = await call(action({ handler, effect: "write", limits: { inputBytes: 100, outputBytes: 100, timeoutMs: 1 } }));
  expect(response.status).toBe(504); expect(handler).toHaveBeenCalledOnce();
  const stream = new ReadableStream<Uint8Array>({ start(controller) { setTimeout(() => { controller.enqueue(new TextEncoder().encode('{}')); controller.close(); }, 20); } });
  expect((await call(action({ encoding: "json", input: z.strictObject({}), examples: [], handler, limits: { inputBytes: 100, outputBytes: 100, timeoutMs: 1 } }), "", { method: "POST", headers: { "content-type": "application/json" }, body: stream, duplex: "half" } as RequestInit)).status).toBe(504);
  await new Promise(resolve => setTimeout(resolve, 30)); expect(handler).toHaveBeenCalledOnce();
});
it("returns only deliberately declared business errors, never a provider's message", async () => {
  const declared = action({ errors: { conflict: "The record already exists" }, handler: () => Response.json({ error: { code: "conflict", message: "provider credential diagnostic" } }, { status: 409 }) });
  const response = await call(declared); expect(response.status).toBe(409);
  expect(await response.json()).toMatchObject({ error: { code: "conflict", message: "The record already exists", requestId: expect.any(String) } });
  for (const body of [{ error: { code: "undeclared" } }, { error: { code: 1 } }, null]) {
    const safe = await call(action({ errors: { conflict: "x" }, handler: () => Response.json(body, { status: 400 }) }));
    expect((await safe.json()).error.code).toBe("internal_error");
  }
  const secret = "saved-business-credential";
  const blocked = await call(action({ errors: { conflict: secret }, handler: () => Response.json({ error: { code: "conflict" } }, { status: 409 }) }), "", {}, identity, { SECRET: secret } as unknown as AppEnv);
  expect(await blocked.text()).not.toContain(secret);
});
