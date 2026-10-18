import { afterEach, expect, it } from "vitest";
import { foreign, mcpCaller, mcpError, purposeOf, toolsOf } from "./store";
import type { AccessIdentity } from "../access";
import { employee, fixture, owner, site } from "../../tests/employee-access/connections";
import { body } from "../../tests/body";
import { SEAL_VALUE } from "../../tests/mcp";

const machine: AccessIdentity = { kind: "service", id: "Checker.access", claims: { common_name: "Checker.access", sub: "", iss: site.issuer, aud: site.audience, exp: 9999999999 } };
const ask = (path = "/api/mcp/servers") => new Request(`${site.origin}${path}`);
const closing: (() => void)[] = [];
afterEach(() => { closing.splice(0).forEach(close => close()); });
const app = (started = true) => { const f = fixture({ started }); closing.push(() => f.sql.close()); return { ...f, env: { ...f.env, WONG_MCP_SEAL: SEAL_VALUE } }; };

it("lets in anyone Access lets in, the preview checker by its own name, and says why it can not", async () => {
  const f = app();
  expect(await mcpCaller(ask(), f.env, owner)).toMatchObject({ email: owner.id, manages: true, installationId: site.installationId, origin: site.origin });
  expect(await mcpCaller(ask(), f.env, employee)).toMatchObject({ email: employee.id, manages: false });
  expect(await mcpCaller(ask(), f.env, machine)).toMatchObject({ email: "checker.access", manages: false });
  expect((await mcpCaller(ask(), f.env, null) as Response).status).toBe(401);
  f.sql.exec("UPDATE wong_access_members SET status = 'removed'");
  expect((await mcpCaller(ask(), f.env, employee) as Response).status).toBe(403);
  const older = await mcpCaller(ask(), { ...f.env, WONG_OWNER_EMAIL: undefined }, owner) as Response;
  expect([older.status, (await body(older)).error.message]).toEqual([503, "MCPs are not available on this app yet."]);
  expect((await mcpCaller(ask(), { ...f.env, DB: undefined }, owner) as Response).status).toBe(503);
  const fresh = app(false);
  expect((await body(await mcpCaller(ask(), fresh.env, owner) as Response)).error.message).toBe("The owner opens Access once before anyone adds an MCP.");
});
it("refuses a write a page on another site sends", () => {
  const sent = (method: string, headers: Record<string, string>) => foreign(new Request(`${site.origin}/api/mcp/servers`, { method, headers }));
  expect(sent("GET", { Origin: "https://elsewhere.example" })).toBe(false);
  expect(sent("POST", { Origin: "https://elsewhere.example" })).toBe(true);
  expect(sent("POST", { "Sec-Fetch-Site": "cross-site" })).toBe(true);
  expect(sent("POST", { Origin: site.origin, "Sec-Fetch-Site": "same-origin" })).toBe(false);
  // The helper runs in Node and sends no Origin.
  expect(sent("POST", {})).toBe(false);
});
it("answers in one error shape, and reads saved text safely", async () => {
  const unknown = mcpError("odd");
  expect([unknown.status, (await body(unknown)).error.message, unknown.headers.get("cache-control")]).toEqual([400, "odd", "no-store"]);
  expect((await body(mcpError("mcp_reconnect", 409, "Again.", "https://link"))).error).toMatchObject({ code: "mcp_reconnect", connect: "https://link" });
  expect([purposeOf(null), purposeOf(" Designs.\nMore"), purposeOf("x".repeat(200)).length]).toEqual(["", "Designs.", 120]);
  expect([toolsOf(null), toolsOf("{"), toolsOf("{}"), toolsOf('[{"name":"a"}]')]).toEqual([[], [], [], [{ name: "a" }]]);
});
