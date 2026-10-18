import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { handleMcp } from "./routes";
import type { AccessIdentity } from "../access";
import { body } from "../../tests/body";
import { employee, owner, site } from "../../tests/employee-access/connections";
import { MCP_URL, mcpFixture } from "../../tests/mcp";

let f: ReturnType<typeof mcpFixture>;
beforeEach(() => { f = mcpFixture(); });
afterEach(() => { f.sql.close(); });
const kim: AccessIdentity = { ...employee, id: "kim@example.com", claims: { ...employee.claims, email: "kim@example.com", sub: "kim" } };
const server = async (response: Response | Promise<Response>) => (await body(await response)).server;
const error = async (response: Response | Promise<Response>) => { const answer = await response; return [answer.status, (await body(answer)).error.code]; };
const join = () => f.sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, 'active', 0, 1, 'now')").run(site.installationId, kim.id);

it("lists the app's MCPs, and asks for the owner's update before anything is sealed", async () => {
  expect(await body(await f.run(owner, "servers", "GET"))).toEqual({ sealed: true, manages: true, me: owner.id, servers: [] });
  const unsealed = { ...f.env, WONG_MCP_SEAL: undefined };
  expect((await body(await f.run(employee, "servers", "GET", undefined, unsealed))).sealed).toBe(false);
  const refused = await f.run(owner, "servers", "POST", { url: MCP_URL }, unsealed);
  expect([refused.status, (await body(refused)).error.message]).toEqual([503, "Connecting MCPs needs one more step from the owner: ask the assistant to run the update."]);
  expect((await f.run(null, "servers", "GET")).status).toBe(401);
  const elsewhere = new Request(`${site.origin}/api/mcp/servers`, { method: "POST", headers: { Origin: "https://elsewhere.example" } });
  expect((await handleMcp(elsewhere, f.env, owner, f.service.send)).status).toBe(403);
});
it("reaches the MCP with the Worker's own fetch when no stand-in is given", async () => {
  vi.stubGlobal("fetch", f.service.send);
  const added = await handleMcp(new Request(`${site.origin}/api/mcp/servers`, { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: MCP_URL }) }), f.env, owner);
  vi.unstubAllGlobals();
  expect(added.status).toBe(201);
});
it("adds an MCP anyone names, once, after checking it offers a sign-in", async () => {
  const added = await f.add(employee);
  expect(added.status).toBe(201);
  expect((await body(added)).server).toEqual({ id: "canva", name: "Canva", url: MCP_URL, purpose: "", tools: 0, toolsAt: null, connected: 0, shared: null,
    own: null, addedBy: employee.id, removable: true, connect: `${site.origin}/apps/access/services/canva` });
  expect(await error(f.add(owner))).toEqual([409, "mcp_exists"]);
  expect(await error(f.run(owner, "servers", "POST", { url: MCP_URL, extra: 1 }))).toEqual([400, "invalid_input"]);
  expect(await error(f.run(owner, "servers", "POST", { url: "http://mcp.canva.example/mcp" }))).toEqual([422, "mcp_refused"]);
  expect(await error(f.run(owner, "servers", "POST", { url: "https://nothing.example/mcp" }))).toEqual([422, "mcp_refused"]);
  // Another address under a taken name gets the next number; a name with no letters is just `mcp`.
  f.service.state.override = url => url.hostname !== "mcp.canva.example" && url.pathname === "/mcp" ? f.service.send(MCP_URL, { method: "POST" }) : undefined;
  expect((await server(f.run(owner, "servers", "POST", { url: "https://canva.example/mcp", name: "Canva" }))).id).toBe("canva-2");
  expect((await server(f.run(owner, "servers", "POST", { url: "https://other.example/mcp", name: "***" }))).id).toBe("mcp");
  expect((await server(f.run(owner, "servers", "POST", { url: "https://solo/mcp" }))).name).toBe("Solo");
  for (let n = 0; n < 46; n++) {
    f.sql.prepare("INSERT INTO wong_mcp_servers (installation_id, id, name, url, resource, authorize_endpoint, token_endpoint, registration_endpoint, auth_method, scopes, added_by, added_at) VALUES (?, ?, 'X', ?, 'r', 'a', 't', 'g', 'none', '', ?, 'now')")
      .run(site.installationId, `x-${n}`, `https://x${n}.example/mcp`, owner.id);
  }
  expect(await error(f.run(owner, "servers", "POST", { url: "https://more.example/mcp" }))).toEqual([409, "mcp_limit"]);
});
it("connects a person through the service's page and reads the MCP's tools the first time", async () => {
  await f.add();
  const back = await f.signIn(employee);
  expect([back.status, back.headers.get("location")]).toEqual([302, `${site.origin}/apps/access/services/canva?connected=1`]);
  const [listed] = (await body(await f.run(employee, "servers", "GET"))).servers;
  expect(listed).toMatchObject({ purpose: "Canva designs and folders.", tools: 2, connected: 1, own: { state: "connected", account: "designer@canva.example", share: "none" } });
  const lists = () => f.service.state.requests.filter(line => line.startsWith(`POST ${MCP_URL}`)).length;
  const before = lists();
  await f.signIn(owner);
  expect(lists()).toBe(before);
  expect(JSON.stringify(f.sql.prepare("SELECT * FROM wong_mcp_connections").all())).not.toMatch(/access-|refresh-/);
});
it("sends every failed sign-in back to the Services view, saying why", async () => {
  await f.add();
  const location = async (path: string) => (await f.run(owner, path, "GET")).headers.get("location");
  expect(await location("callback?state=unknown&code=x")).toBe(`${site.origin}/apps/access/services?failed=expired`);
  const state = async () => new URL(String((await body(await f.run(owner, "servers/canva/connect"))).authorize)).searchParams.get("state");
  expect(await location(`callback?state=${await state()}`)).toBe(`${site.origin}/apps/access/services/canva?failed=refused`);
  expect(await location(`callback?state=${await state()}&code=bad-code`)).toBe(`${site.origin}/apps/access/services/canva?failed=refused`);
  expect(await location("callback")).toBe(`${site.origin}/apps/access/services?failed=expired`);
  // A tool list that fails the first time leaves the sign-in in place for Refresh.
  f.service.state.override = (url, _init, text) => url.href === MCP_URL && text.includes("tools/list") ? new Response("down", { status: 500 }) : undefined;
  expect((await f.signIn(owner)).headers.get("location")).toBe(`${site.origin}/apps/access/services/canva?connected=1`);
  expect((await body(await f.run(owner, "servers", "GET"))).servers[0].tools).toBe(0);
});
it("says why Connect can not start", async () => {
  await f.add();
  f.service.state.override = url => url.pathname === "/register" ? new Response("no", { status: 400 }) : undefined;
  expect((await body(await f.run(owner, "servers/canva/connect"))).error.message).toBe("Canva would not register this app's address.");
  f.service.state.override = url => { if (url.pathname === "/register") throw new TypeError("network"); return undefined; };
  expect((await body(await f.run(owner, "servers/canva/connect"))).error.message).toBe("Canva did not answer. Try again.");
});
it("shares one sign-in per MCP, look-ups only unless its owner chooses everything", async () => {
  await f.add(); join();
  expect(await error(f.run(employee, "servers/canva/share", "POST", { share: "read" }))).toEqual([409, "mcp_not_connected"]);
  expect(await error(f.run(employee, "servers/canva/share", "POST", { share: "loud" }))).toEqual([400, "invalid_input"]);
  await f.signIn(employee); await f.signIn(owner);
  expect((await server(f.run(employee, "servers/canva/share", "POST", { share: "read" }))).shared).toEqual({ who: employee.id, share: "read" });
  expect((await server(f.run(employee, "servers/canva/share", "POST", { share: "all" }))).own.share).toBe("all");
  const taken = await f.run(owner, "servers/canva/share", "POST", { share: "read" });
  expect([taken.status, (await body(taken)).error.message]).toEqual([409, "employee@example.com is sharing theirs. One sign-in per MCP can be shared."]);
  // Nobody turns sharing on for someone else, or stops it unless they manage Access.
  expect(await error(f.run(owner, "servers/canva/share", "POST", { share: "read", email: employee.id }))).toEqual([403, "forbidden"]);
  expect(await error(f.run(kim, "servers/canva/share", "POST", { share: "none", email: employee.id }))).toEqual([403, "forbidden"]);
  expect((await server(f.run(owner, "servers/canva/share", "POST", { share: "none", email: "Employee@Example.com" }))).shared).toBeNull();
  // A share that slips in between the read and the write still holds the one place.
  f.sql.prepare("INSERT INTO wong_mcp_connections (installation_id, server_id, email, tokens, connected_at, state, share) VALUES (?, 'canva', ?, NULL, 'now', 'reconnect', 'read')")
    .run(site.installationId, kim.id);
  expect(await error(f.run(owner, "servers/canva/share", "POST", { share: "read" }))).toEqual([409, "mcp_share_taken"]);
  expect((await server(f.run(employee, "servers/canva/share", "POST", { share: "none" }))).own.share).toBe("none");
});
it("rereads the tools on Refresh, and disconnects only the caller's own sign-in", async () => {
  await f.add();
  expect(await error(f.run(owner, "servers/canva/refresh"))).toEqual([409, "mcp_not_connected"]);
  await f.signIn(owner); await f.signIn(employee);
  f.service.state.tools = [{ name: "only" }];
  expect((await server(f.run(owner, "servers/canva/refresh"))).tools).toBe(1);
  f.service.state.override = (url, _init, text) => {
    const message = JSON.parse(text || "{}") as { id?: number; method?: string };
    return url.href === MCP_URL && message.method === "tools/list" ? Response.json({ jsonrpc: "2.0", id: message.id, error: { message: "Try later." } }) : undefined;
  };
  const refused = await f.run(owner, "servers/canva/refresh");
  expect([refused.status, (await body(refused)).error.message]).toEqual([502, "Try later."]);
  f.service.state.override = url => url.href === MCP_URL ? new Response("down", { status: 500 }) : undefined;
  expect((await body(await f.run(owner, "servers/canva/refresh"))).error.message).toBe("Canva did not send its tool list. Try again.");
  const left = await server(f.run(owner, "servers/canva/disconnect"));
  expect([left.own, left.connected]).toEqual([null, 1]);
  // A sign-in the service gave no way to renew still rereads the tools.
  f.service.state.override = url => {
    if (url.pathname !== "/token") return undefined;
    f.service.state.valid.add("lone");
    return Response.json({ access_token: "lone" });
  };
  await f.signIn(owner);
  expect((await server(f.run(owner, "servers/canva/refresh"))).tools).toBe(1);
});
it("lets the adder remove an MCP nobody else uses, and the owner or an Admin any", async () => {
  await f.add(employee); join();
  expect((await body(await f.run(kim, "servers/canva", "DELETE"))).error.message).toBe("Only whoever added Canva, the owner or an Admin can remove it.");
  await f.signIn(owner);
  expect((await body(await f.run(employee, "servers/canva", "DELETE"))).error.message).toBe("Others are connected to Canva: ask the owner or an Admin to remove it.");
  expect((await body(await f.run(employee, "servers", "GET"))).servers[0].removable).toBe(false);
  expect(await body(await f.run(owner, "servers/canva", "DELETE"))).toEqual({ removed: true });
  expect(f.sql.prepare("SELECT count(*) AS n FROM wong_mcp_connections").get()).toEqual({ n: 0 });
  await f.add(employee);
  expect(await body(await f.run(employee, "servers/canva", "DELETE"))).toEqual({ removed: true });
});
it("answers not found for an MCP or a route it does not know", async () => {
  const plain = new Request(`${site.origin}/api/mcp/servers`, { method: "POST", body: JSON.stringify({ url: MCP_URL }) });
  expect(await error(handleMcp(plain, f.env, owner, f.service.send))).toEqual([400, "invalid_input"]);
  const broken = new Request(plain, { headers: { "Content-Type": "application/json" }, body: "{" });
  expect(await error(handleMcp(broken, f.env, owner, f.service.send))).toEqual([400, "invalid_input"]);
  await f.add();
  for (const [path, method] of [["servers/missing/connect", "POST"], ["servers/canva/dance", "POST"], ["servers/canva/connect", "GET"], ["elsewhere", "GET"], ["servers/Canva", "DELETE"]]) {
    expect(await error(f.run(owner, path, method))).toEqual([404, "not_found"]);
  }
});
