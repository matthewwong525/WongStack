import { afterEach, beforeEach, expect, it, vi, type MockInstance } from "vitest";
import { body } from "../../tests/body";
import { employee, owner, site } from "../../tests/employee-access/connections";
import { MCP_URL, mcpFixture } from "../../tests/mcp";
import type { AccessIdentity } from "../access";

let f: ReturnType<typeof mcpFixture>;
let log: MockInstance<typeof console.log>;
beforeEach(async () => { f = mcpFixture(); log = vi.spyOn(console, "log").mockImplementation(() => undefined); await f.add(); });
afterEach(() => { f.sql.close(); vi.restoreAllMocks(); });
const call = (identity: AccessIdentity, tool: string, args: unknown = { query: "logo" }) => f.run(identity, `canva/tools/${encodeURIComponent(tool)}`, "POST", args);
const answer = async (response: Promise<Response>) => { const got = await response; const data = await body(got); return [got.status, data.error?.code ?? data.content[0].text, data.error?.message ?? data.via ?? null]; };
const records = () => log.mock.calls.map(([line]) => JSON.parse(String(line)));
/** The MCP answers `tools/call` with `reply` instead of running it. */
const onCall = (reply: (id: number) => Response | Promise<Response>) => {
  f.service.state.override = (url, _init, text) => {
    const message = JSON.parse(text || "{}") as { id: number; method?: string };
    return url.href === MCP_URL && message.method === "tools/call" ? reply(message.id) : undefined;
  };
};

it("runs a tool with the caller's own sign-in, and records who asked but never what", async () => {
  await f.signIn(owner);
  expect(await answer(call(owner, "search"))).toEqual([200, "ran search", null]);
  expect(f.service.state.calls).toEqual([{ name: "search", token: "access-1", args: { query: "logo" } }]);
  expect(records()).toEqual([{ event: "mcp_request", caller: owner.id, as: owner.id, key: "mcp:canva", kind: "read", path: "search", status: 200 }]);
  expect(JSON.stringify(records())).not.toContain("logo");
});
it("runs a tool with a sign-in the service gave no way to renew", async () => {
  f.service.state.override = url => {
    if (url.pathname !== "/token") return undefined;
    f.service.state.valid.add("lone");
    return Response.json({ access_token: "lone" });
  };
  await f.signIn(owner);
  expect(await answer(call(owner, "search"))).toEqual([200, "ran search", null]);
});
it("sends the person to Connect when no sign-in covers the call", async () => {
  expect(await answer(call(owner, "missing", {}))).toEqual([409, "mcp_not_connected", "Connect Canva first."]);
  expect((await body(await call(owner, "search"))).error.connect).toBe(`${site.origin}/apps/access/services/canva`);
  await f.signIn(owner);
  f.sql.exec("UPDATE wong_mcp_connections SET state = 'reconnect', tokens = NULL");
  expect(await answer(call(owner, "search"))).toEqual([409, "mcp_reconnect", "Your Canva sign-in ended. Connect it again."]);
  expect(await answer(f.run(owner, "missing/tools/search", "POST", {}))).toEqual([404, "not_found", "No MCP by that name"]);
  expect(f.service.state.calls).toEqual([]);
});
it("takes the tool's inputs only as a JSON object", async () => {
  await f.signIn(owner);
  expect(await answer(call(owner, "search", ["a"]))).toEqual([400, "invalid_input", "Send the tool's inputs as a JSON object."]);
  const plain = new Request(`${site.origin}/api/mcp/canva/tools/search`, { method: "POST", body: "{}", headers: { "Content-Type": "text/plain" } });
  const { handleMcp } = await import("./routes");
  expect((await handleMcp(plain, f.env, owner, f.service.send)).status).toBe(400);
  const broken = new Request(`${site.origin}/api/mcp/canva/tools/search`, { method: "POST", body: "{", headers: { "Content-Type": "application/json" } });
  expect((await handleMcp(broken, f.env, owner, f.service.send)).status).toBe(400);
});
it("runs look-ups with a teammate's shared sign-in, and changes only when they chose everything", async () => {
  await f.signIn(owner);
  await f.run(owner, "servers/canva/share", "POST", { share: "read" });
  expect(await answer(call(employee, "search"))).toEqual([200, "ran search", owner.id]);
  const sent = f.service.state.requests.length;
  expect(await answer(call(employee, "create", {}))).toEqual([403, "mcp_share_read_only", "owner@example.com's shared Canva sign-in allows look-ups only. Connect your own."]);
  // Refused before anything reached the MCP or its sign-in server.
  expect(f.service.state.requests.length).toBe(sent);
  await f.run(owner, "servers/canva/share", "POST", { share: "all" });
  expect(await answer(call(employee, "create", {}))).toEqual([200, "ran create", owner.id]);
  expect(records().at(-1)).toMatchObject({ caller: employee.id, as: owner.id, kind: "change" });
});
it("reads the tool list again for a tool the saved one lacks", async () => {
  await f.signIn(owner);
  await f.run(owner, "servers/canva/share", "POST", { share: "read" });
  f.service.state.tools = [{ name: "fresh", annotations: { readOnlyHint: true } }, { name: "write" }];
  expect(await answer(call(employee, "fresh"))).toEqual([200, "ran fresh", owner.id]);
  expect((await body(await f.run(owner, "servers", "GET"))).servers[0].tools).toBe(2);
  f.service.state.tools = [{ name: "fresh", annotations: { readOnlyHint: true } }, { name: "write" }, { name: "later" }];
  expect((await answer(call(employee, "later")))[1]).toBe("mcp_share_read_only");
  expect((await answer(call(employee, "nowhere")))[1]).toBe("mcp_share_read_only");
  // With their own sign-in the MCP decides; a list that fails to load is no refusal.
  f.service.state.override = (url, _init, text) => url.href === MCP_URL && text.includes("tools/list") ? new Response("down", { status: 500 }) : undefined;
  expect(await answer(call(owner, "unlisted"))).toEqual([200, "ran unlisted", null]);
  expect(records().at(-1)).toMatchObject({ kind: "change", path: "unlisted" });
});
it("renews a refused sign-in once and tries again", async () => {
  await f.signIn(owner);
  f.service.state.valid.delete("access-1");
  expect(await answer(call(owner, "search"))).toEqual([200, "ran search", null]);
  expect(f.service.state.calls.at(-1)?.token).toBe("access-2");
  f.service.state.valid.clear();
  f.service.state.used.add("refresh-2");
  expect(await answer(call(owner, "search"))).toEqual([409, "mcp_reconnect", "Your Canva sign-in ended. Connect it again."]);
  expect(records().at(-1)).toMatchObject({ status: 401 });
});
it("says when a sign-in could not be renewed", async () => {
  f.service.state.expiresIn = -1;
  await f.signIn(owner);
  await f.run(owner, "servers/canva/share", "POST", { share: "all" });
  f.service.state.override = url => url.pathname === "/token" ? new Response("down", { status: 503 }) : undefined;
  expect(await answer(call(owner, "search"))).toEqual([503, "unavailable", "Canva did not renew the sign-in. Try again."]);
  f.service.state.override = undefined;
  f.service.state.used.add("refresh-1");
  expect(await answer(call(employee, "search"))).toEqual([409, "mcp_not_connected", "The shared Canva sign-in ended. Connect your own."]);
});
it("waits out another call's renewal, then asks to try again", async () => {
  f.service.state.expiresIn = -1;
  await f.signIn(owner);
  f.sql.exec(`UPDATE wong_mcp_connections SET refresh_lease_until = '${new Date(Date.now() + 30_000).toISOString()}'`);
  expect(await answer(call(owner, "search"))).toEqual([503, "unavailable", "Canva is renewing this sign-in. Try again in a moment."]);
}, 10_000);
it("never resends a call that timed out, and says whether a change may have run", async () => {
  await f.signIn(owner);
  vi.spyOn(AbortSignal, "timeout").mockReturnValue(AbortSignal.abort());
  onCall(() => { throw new DOMException("aborted", "AbortError"); });
  expect(await answer(call(owner, "create", {}))).toEqual([504, "timeout", "The call timed out. Whether it changed anything is unknown: check before trying again."]);
  expect(await answer(call(owner, "search"))).toEqual([504, "timeout", "The call timed out."]);
  expect(records().at(-1)).toMatchObject({ status: 504 });
});
it("passes on the MCP's own refusal, and nothing it can not show", async () => {
  await f.signIn(owner);
  onCall(id => Response.json({ jsonrpc: "2.0", id, error: { message: "No such design." } }));
  expect(await answer(call(owner, "search"))).toEqual([502, "bad_answer", "Canva refused the call: No such design."]);
  onCall(() => new Response("<html>"));
  expect(await answer(call(owner, "search"))).toEqual([502, "bad_answer", "Canva did not return an answer that can be shown."]);
  // A refused sign-in whose renewal fails is no answer either.
  f.service.state.valid.clear();
  f.service.state.override = url => url.pathname === "/token" ? new Response("down", { status: 503 }) : undefined;
  expect(await answer(call(owner, "search"))).toEqual([502, "bad_answer", "Canva did not return an answer that can be shown."]);
});
