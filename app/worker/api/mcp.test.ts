import { expect, it } from "vitest";
import { rpcEffect } from "./mcp";

const message = (method: unknown, params?: unknown) => JSON.stringify({ jsonrpc: "2.0", id: 1, method, ...(params !== undefined && { params }) });
const call = (name: unknown) => message("tools/call", { name, arguments: {} });
const reads = ["search", "read_page"];

it("counts opening the session, listing tools and a tool named as a look-up as look-ups", () => {
  for (const method of ["initialize", "notifications/initialized", "tools/list"]) expect(rpcEffect(message(method), []), method).toEqual({ effect: "read", operation: method });
  expect(rpcEffect(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }), [])).toEqual({ effect: "read", operation: "notifications/initialized" });
  for (const tool of reads) expect(rpcEffect(call(tool), reads), tool).toEqual({ effect: "read", operation: tool });
  // MCP allows a dot and up to 128 characters; the read list still matches only the exact name.
  for (const tool of ["github.search_code", "x".repeat(128)]) expect(rpcEffect(call(tool), [tool]), tool).toEqual({ effect: "read", operation: tool });
  expect(rpcEffect(call("github.search"), ["github.search_code"])).toEqual({ effect: "write", operation: "github.search" });
});

it("counts every other tool, every other method, a batch and an unreadable body as a change", () => {
  expect(rpcEffect(call("delete_page"), reads)).toEqual({ effect: "write", operation: "delete_page" });
  // An empty read list makes every tool a change, including one the service adds later.
  expect(rpcEffect(call("search"), [])).toEqual({ effect: "write", operation: "search" });
  // Another method stays a change even when its name is in the read list.
  expect(rpcEffect(message("resources/read"), ["resources/read"])).toEqual({ effect: "write", operation: "resources/read" });
  for (const [body, label] of [[JSON.stringify([JSON.parse(call("search"))]), "batch"], ["", "empty"], [null, "none"], ["{not json", "unreadable"],
    ["null", "null"], ['"search"', "string"], [JSON.stringify({ id: 1 }), "no method"], [message(7), "number method"],
    [message("tools/call"), "no params"], [message("tools/call", "search"), "params a string"], [call(undefined), "no name"], [call(3), "number name"],
    [call(""), "empty name"], [call("x".repeat(129)), "long name"], [call("search tool"), "space"], [call("sëarch"), "not ASCII"],
    [message("evil method"), "spaced method"]] as const) {
    // None names an operation: only a well-formed method or tool does.
    expect(rpcEffect(body, [...reads, "", "x".repeat(129), "search tool", "sëarch"]), label).toEqual({ effect: "write" });
  }
});
