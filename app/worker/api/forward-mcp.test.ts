import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fixture, owner, site } from "../../tests/employee-access/connections";
import type { KeyEntry } from "../employee-access/key-levels";
import { dispatch } from "./contract";
import { forwardRoutes } from "./forward";
import { body } from "../../tests/body";
import { fakeEnv } from "../../tests/env";

// A made-up registry of MCP servers. Docs is public: no key, both levels, one look-up tool. Tracks sends its key
// and offers Read alone.
const registry = vi.hoisted(() => ({ keys: {
  docs: { title: "Docs", purpose: "Public docs", secrets: [], forward: { base: "https://mcp.docs.example/", mcp: { path: "mcp", reads: ["search"] } } },
  tracks: { title: "Tracks", purpose: "Music", secrets: ["TRACKS_TOKEN"], levels: ["read"], forward: { base: "https://tracks.example/v1/", secret: "TRACKS_TOKEN",
    header: "Authorization", prefix: "Bearer ", mcp: { path: "mcp", reads: ["search_tracks"] } } },
} satisfies Record<string, KeyEntry> }));
vi.mock("../keys.ts", () => registry);

const token = "tracks-token-value";
type Kind = "read" | "change";
type Message = { id?: number; method: string; params?: { name?: string } };
let f: ReturnType<typeof fixture>;
let send: ReturnType<typeof vi.fn<typeof fetch>>;
let handed: string;
/** A stub MCP server: hands out a session on `initialize`, answers in an event stream, and lists two tools. */
const server = async (_address: unknown, init?: RequestInit) => {
  const message = JSON.parse(String(init?.body)) as Message;
  if (message.method === "notifications/initialized") return new Response(null, { status: 202 });
  const result = message.method === "initialize" ? { protocolVersion: "2025-06-18", capabilities: { tools: {} } }
    : message.method === "tools/list" ? { tools: [{ name: "search" }, { name: "delete_page" }] }
      : { content: [{ type: "text", text: `ran ${message.params?.name}` }] };
  return new Response(`event: message\ndata: ${JSON.stringify({ jsonrpc: "2.0", id: message.id, result })}\n\n`,
    { headers: { "content-type": "text/event-stream", ...(message.method === "initialize" && { "Mcp-Session-Id": handed }) } });
};
const rpc = (method: string, params?: object, id: number | undefined = 1) => ({ jsonrpc: "2.0", ...(id !== undefined && { id }), method, ...(params && { params }) });
const ask = (key: string, kind: Kind, input: unknown) => {
  const { routes, access } = forwardRoutes(registry.keys, send);
  const route = `POST /api/direct/${key}/${kind}`;
  const request = new Request(`${site.origin}/api/direct/${key}/${kind}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) });
  return dispatch(routes.get(route)!, request, fakeEnv({ ...f.env, TRACKS_TOKEN: token }), { url: new URL(request.url), route: new URL(request.url).pathname, identity: owner }, access.get(route));
};
const post = (key: string, kind: Kind, message: unknown, session?: string) => ask(key, kind, { method: "POST", path: "mcp", body: message, ...(session && { session }) });
const code = async (response: Response) => [response.status, (await body(response)).error.code];
const sent = (at = -1) => { const [address, init] = send.mock.calls.at(at)!; return { address: String(address), init: init!, headers: init!.headers as Record<string, string> }; };

beforeEach(() => {
  f = fixture();
  f.sql.exec("UPDATE wong_access_installation SET keys_enabled = 1");
  handed = "S-1";
  send = vi.fn<typeof fetch>(server);
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterEach(() => { f.sql.close(); vi.restoreAllMocks(); });

it("opens a session on Read, hands its id back, and sends it on with the next call", async () => {
  const opened = await post("docs", "read", rpc("initialize", { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "test", version: "1" } }));
  expect(opened.status).toBe(200);
  const answer = await body(opened);
  expect([answer.status, answer.contentType, answer.session]).toEqual([200, "text/event-stream", "S-1"]);
  expect(answer.body).toContain('"protocolVersion":"2025-06-18"');
  // A public server gets no credential: only what MCP needs.
  expect([sent().address, sent().init.method]).toEqual(["https://mcp.docs.example/mcp", "POST"]);
  expect(sent().headers).toEqual({ Accept: "application/json, text/event-stream", "Mcp-Protocol-Version": "2025-06-18", "Content-Type": "application/json" });
  expect((await post("docs", "read", rpc("notifications/initialized", undefined, undefined), "S-1")).status).toBe(200);
  expect(sent().headers["Mcp-Session-Id"]).toBe("S-1");
  const listed = await body(await post("docs", "read", rpc("tools/list", undefined, 2), "S-1"));
  expect([listed.body, listed.session]).toEqual([expect.stringContaining('"name":"delete_page"'), undefined]);
  expect(sent().headers["Mcp-Session-Id"]).toBe("S-1");
});

it("runs a tool named as a look-up on Read, and sends any other tool, a batch or another method only as a change", async () => {
  const searched = await body(await post("docs", "read", rpc("tools/call", { name: "search", arguments: { q: "a" } }), "S-1"));
  expect(searched.body).toContain("ran search");
  expect(JSON.parse(String(sent().init.body))).toEqual(rpc("tools/call", { name: "search", arguments: { q: "a" } }));
  const before = send.mock.calls.length;
  for (const message of [rpc("tools/call", { name: "delete_page" }), rpc("tools/call", { name: "new_tool" }), [rpc("tools/call", { name: "search" })],
    rpc("resources/read"), "not json", undefined]) {
    expect(await code(await post("docs", "read", message)), JSON.stringify(message)).toEqual([400, "not_a_lookup"]);
  }
  // Another method to the path is a change too; GET stays a look-up.
  expect(await code(await ask("docs", "read", { method: "DELETE", path: "mcp", session: "S-1" }))).toEqual([400, "not_a_lookup"]);
  expect(send.mock.calls.length).toBe(before);
  const changed = await body(await post("docs", "change", rpc("tools/call", { name: "delete_page" }), "S-1"));
  expect(changed.body).toContain("ran delete_page");
  send.mockImplementationOnce(async () => new Response(null, { status: 405 }));
  expect((await body(await ask("docs", "read", { method: "GET", path: "mcp" }))).status).toBe(405);
  expect(sent().init.method).toBe("GET");
});

it("sends an MCP message exactly as it was sorted, so a repeated key reaches no server as another tool", async () => {
  // A first-key-wins server would read delete_page here; the app sorts by the last, and sends only that.
  const repeated = '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"delete_page"},"params":{"name":"search"}}';
  expect((await post("docs", "read", repeated)).status).toBe(200);
  expect(sent().init.body).toBe('{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search"}}');
  // A body that does not parse stays a change, and goes as it is.
  expect(await code(await post("docs", "read", "{not json"))).toEqual([400, "not_a_lookup"]);
  send.mockImplementationOnce(async () => new Response("parse error", { status: 400 }));
  expect((await body(await post("docs", "change", "{not json"))).status).toBe(400);
  expect(sent().init.body).toBe("{not json");
});

it("passes on only the MCP path, and refuses a session id that is not one", async () => {
  for (const path of ["other", "mcp/x", "mcp/", "sse"]) {
    for (const kind of ["read", "change"] as const) expect(await code(await ask("docs", kind, { method: "GET", path })), path).toEqual([400, "not_allowed"]);
  }
  for (const session of [" ", "S 1", "S\n1", "x".repeat(257)]) {
    expect(await code(await post("docs", "change", rpc("tools/list"), session)), JSON.stringify(session)).toEqual([400, "invalid_input"]);
  }
  expect(send).not.toHaveBeenCalled();
});

it("sends a keyed server its key, and returns no answer whose session id carries the key", async () => {
  expect((await post("tracks", "read", rpc("tools/call", { name: "search_tracks" }))).status).toBe(200);
  expect([sent().address, sent().headers.Authorization]).toEqual(["https://tracks.example/v1/mcp", `Bearer ${token}`]);
  expect(await code(await post("tracks", "read", rpc("tools/call", { name: "search" })))).toEqual([400, "not_a_lookup"]);
  handed = `S-${token}`;
  const echoed = await post("tracks", "read", rpc("initialize"));
  expect(echoed.status).toBe(502);
  expect(await echoed.text()).not.toContain(token);
  // A session id that is not visible text is left out rather than handed on.
  handed = "S-é";
  expect((await body(await post("docs", "read", rpc("initialize")))).session).toBeUndefined();
});

it("describes an MCP key's actions by its tools and the helper that runs them", () => {
  const { routes } = forwardRoutes(registry.keys, send);
  const read = routes.get("POST /api/direct/docs/read")!;
  expect(read.description).toContain("Send one request to Docs's API at https://mcp.docs.example/, and return");
  expect(read.description).toContain("node scripts/company-api.mjs mcp docs tools");
  expect(read.description).toContain("GET, HEAD, and a POST to mcp that opens the MCP session, lists its tools or calls search. Anything else needs docs.change");
  expect(routes.get("POST /api/direct/tracks/read")!.description).toContain("with the saved key");
  expect([...routes.keys()]).toEqual(["POST /api/direct/docs/read", "POST /api/direct/docs/change", "POST /api/direct/tracks/read"]);
});
