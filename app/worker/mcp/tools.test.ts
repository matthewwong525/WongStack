import { afterEach, beforeEach, expect, it } from "vitest";
import { mcpOperations, normalTools, readTools, saveTools, shareCovers } from "./tools";
import { employee, owner } from "../../tests/employee-access/connections";
import { MCP_URL, mcpFixture } from "../../tests/mcp";

let f: ReturnType<typeof mcpFixture>;
beforeEach(() => { f = mcpFixture(); });
afterEach(() => { f.sql.close(); });

it("keeps a tool as the catalogue may show it, and leaves out one with an odd name", () => {
  const big = { type: "object", properties: { text: { type: "string", description: "x".repeat(9_000) } } };
  expect(normalTools([null, { name: "bad name" }, { name: 3 },
    { name: "find", annotations: { title: " Find ", readOnlyHint: true }, description: " Finds. ", inputSchema: { type: "object", required: ["q"] } },
    { name: "outside", inputSchema: { type: "object", properties: { a: { $ref: "https://elsewhere.example/schema" } } } },
    { name: "list", inputSchema: { type: "array" } }, { name: "huge", inputSchema: big }, { name: "bare" }])).toEqual([
    { name: "find", title: "Find", description: "Finds.", readOnly: true, inputSchema: { type: "object", required: ["q"], properties: {} } },
    ...["outside", "list", "huge", "bare"].map(name => ({ name, title: undefined, description: undefined, readOnly: false, inputSchema: { type: "object", properties: {} } })),
  ]);
  expect(normalTools(Array.from({ length: 205 }, (_, n) => ({ name: `t${n}` })))).toHaveLength(200);
});
it("reads every page of the list, up to ten", async () => {
  f.service.state.valid.add("token");
  expect(await readTools(f.service.send, MCP_URL, "token", ["token"])).toMatchObject({ tools: [{ name: "search" }, { name: "create" }], instructions: "Canva designs and folders.\nMore about it." });
  f.service.state.override = (url, _init, text) => {
    const message = JSON.parse(text || "{}") as { id?: number; method?: string };
    return url.href === MCP_URL && message.method === "tools/list" ? Response.json({ jsonrpc: "2.0", id: message.id, result: { nextCursor: "again" } }) : undefined;
  };
  expect((await readTools(f.service.send, MCP_URL, "token", ["token"])).tools).toEqual([]);
  expect(f.service.state.requests.filter(line => line.startsWith("POST")).length).toBe(4 + 12);
});
it("lets a share run a look-up, and everything only when its owner chose everything", () => {
  const tool = (readOnly: boolean) => ({ name: "t", readOnly, inputSchema: { type: "object" as const, properties: {} } });
  expect([shareCovers("read", tool(true)), shareCovers("read", tool(false)), shareCovers("read", undefined), shareCovers("all", undefined)]).toEqual([true, false, false, true]);
});
it("lists each saved tool for each person, ready only with their own sign-in or a share that covers it", async () => {
  await f.add(); await f.signIn(owner);
  const ids = async (email: string) => (await mcpOperations(f.caller(email))).operations.map(op => [op.operationId, op.effect, op.readiness]);
  expect(await ids(owner.id)).toEqual([["mcp.canva.search", "read", "available"], ["mcp.canva.create", "external", "available"]]);
  expect(await ids(employee.id)).toEqual([["mcp.canva.search", "read", "needs_connect"], ["mcp.canva.create", "external", "needs_connect"]]);
  const [search] = (await mcpOperations(f.caller(employee.id))).operations;
  expect(search).toMatchObject({ summary: "Find designs.", description: "Canva's search tool. Find designs. Returns ids.", app: "mcp:canva", path: "/api/mcp/canva/tools/search" });
  await f.run(owner, "servers/canva/share", "POST", { share: "read" });
  expect(await ids(employee.id)).toEqual([["mcp.canva.search", "read", "available"], ["mcp.canva.create", "external", "needs_connect"]]);
  await f.run(owner, "servers/canva/share", "POST", { share: "all" });
  expect((await ids(employee.id)).map(row => row[2])).toEqual(["available", "available"]);
  // A tool with neither title nor description is summed up by its name.
  await saveTools(f.caller(), "canva", { tools: normalTools([{ name: "plain" }]), instructions: null });
  expect((await mcpOperations(f.caller())).operations[0]).toMatchObject({ summary: "plain", description: "Canva's plain tool." });
});
