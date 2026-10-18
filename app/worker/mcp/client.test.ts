import { afterEach, expect, it, vi } from "vitest";
import { mcpSession, McpFailure } from "./client";
import type { Send } from "./discover";
import { MCP_URL, sse } from "../../tests/mcp";

afterEach(() => { vi.restoreAllMocks(); });
type Sent = { headers: Headers; body: { id?: number; method: string } };
/** An MCP that answers each request with `answer`, after a plain `initialize`. */
function server(answer: (sent: Sent) => Response | Promise<Response>) {
  const sent: Sent[] = [];
  const send: Send = async (_url, init = {}) => {
    const one = { headers: new Headers(init.headers), body: JSON.parse(String(init.body)) as Sent["body"] };
    sent.push(one);
    if (one.body.method === "initialize") return Response.json({ jsonrpc: "2.0", id: one.body.id, result: {} }, { headers: { "Mcp-Session-Id": "s-1" } });
    if (one.body.method === "notifications/initialized") return new Response(null, { status: 202 });
    return answer(one);
  };
  return { sent, send };
}
const failure = async (promise: Promise<unknown>) => { try { await promise; } catch (error) { return error as McpFailure; } throw new Error("no failure"); };
const asked = (answer: (sent: Sent) => Response | Promise<Response>, token = "token") => {
  const { send } = server(answer);
  const session = mcpSession(send, MCP_URL, token);
  return session.open().then(() => session.request("tools/list"));
};

it("opens a session and carries its id, the sign-in and the protocol version on each request", async () => {
  const { sent, send } = server(one => sse({ jsonrpc: "2.0", id: one.body.id, result: { tools: [] } }));
  const session = mcpSession(send, MCP_URL, "token");
  expect(await session.open()).toEqual({ instructions: null });
  expect(await session.request("tools/list")).toEqual({ tools: [] });
  expect(sent[0].headers.get("mcp-session-id")).toBeNull();
  expect(sent[2].headers.get("mcp-session-id")).toBe("s-1");
  expect(sent[2].headers.get("authorization")).toBe("Bearer token");
  expect(sent[2].headers.get("mcp-protocol-version")).toBe("2025-06-18");
});
it("reads a batch, and an answer with no content type", async () => {
  expect(await asked(one => Response.json([{ jsonrpc: "2.0", method: "note" }, { jsonrpc: "2.0", id: one.body.id, result: { ok: 1 } }]))).toEqual({ ok: 1 });
  const stream = (text: string) => new Response(new ReadableStream({ start(controller) { controller.enqueue(new TextEncoder().encode(text)); controller.close(); } }));
  expect(await asked(one => stream(JSON.stringify({ jsonrpc: "2.0", id: one.body.id, result: { ok: 2 } })))).toEqual({ ok: 2 });
});
it("names why a call ended without an answer", async () => {
  expect((await failure(asked(() => new Response(null, { status: 401 })))).code).toBe("unauthorized");
  expect((await failure(asked(() => new Response("no", { status: 403 })))).code).toBe("unauthorized");
  for (const status of [302, 500]) expect((await failure(asked(() => new Response(status === 500 ? "down" : null, { status, headers: { Location: "https://elsewhere.example" } })))).code).toBe("bad_answer");
  const refused = await failure(asked(one => Response.json({ jsonrpc: "2.0", id: one.body.id, error: { code: -32602, message: "x".repeat(400) } }, { status: 400 })));
  expect([refused.code, refused.message.length]).toEqual(["refused", 300]);
  expect((await failure(asked(one => Response.json({ jsonrpc: "2.0", id: one.body.id, error: {} })))).message).toBe("The MCP refused the call.");
  expect((await failure(asked(one => Response.json({ jsonrpc: "2.0", id: one.body.id, result: "text" })))).code).toBe("bad_answer");
  expect((await failure(asked(() => Response.json({ jsonrpc: "2.0", id: 99, result: {} })))).code).toBe("bad_answer");
  expect((await failure(asked(() => new Response("not json")))).code).toBe("bad_answer");
  // An answer that hands back the sign-in it was sent is never passed on.
  expect((await failure(asked(one => Response.json({ jsonrpc: "2.0", id: one.body.id, result: { echo: "Bearer token" } })))).code).toBe("bad_answer");
  expect((await failure(asked(() => new Response("x".repeat(4_194_305))))).code).toBe("bad_answer");
  expect((await failure(asked(() => { throw new TypeError("network"); }))).code).toBe("bad_answer");
});
it("ends a call that runs past its time as a timeout", async () => {
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
  const thrown: Send = async () => { throw new DOMException("aborted", "AbortError"); };
  expect((await failure(mcpSession(thrown, MCP_URL, "token").open())).code).toBe("timeout");
  const broken: Send = async () => new Response(new ReadableStream({ pull(controller) { controller.error(new Error("aborted")); } }));
  expect((await failure(mcpSession(broken, MCP_URL, "token").open())).code).toBe("timeout");
  expect(new McpFailure("bad_answer").message).toBe("bad_answer");
});
