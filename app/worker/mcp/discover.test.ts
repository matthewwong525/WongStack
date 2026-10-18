import { expect, it } from "vitest";
import { checkedAddress, discover, readJson, type Send } from "./discover";
import { AUTH, MCP_URL, mcpService } from "../../tests/mcp";

it("takes only a plain https address", () => {
  expect(checkedAddress(MCP_URL).href).toBe(MCP_URL);
  for (const bad of ["not a url", "http://mcp.canva.example/mcp", "https://me:pw@mcp.canva.example/", "https://mcp.canva.example/#x", "https://mcp.canva.example/#"]) {
    expect(() => checkedAddress(bad)).toThrow("Use the MCP's full https:// address.");
  }
});
it("reads what the MCP offers for sign-in from the metadata its refusal names", async () => {
  const { send } = mcpService();
  expect(await discover(send, new URL(MCP_URL))).toEqual({ resource: MCP_URL, authorize: `${AUTH}/authorize`, token: `${AUTH}/token`,
    register: `${AUTH}/register`, method: "none", scopes: "design:read" });
});
it("falls back to the well-known addresses, OpenID's, and a secret-holding client", async () => {
  const { send, state } = mcpService();
  state.override = url => {
    if (url.href === MCP_URL) return new Response(null, { status: 401 });
    if (url.href === "https://mcp.canva.example/.well-known/oauth-protected-resource/mcp") return Response.json({ authorization_servers: ["https://auth.canva.example/tenant"] });
    if (url.pathname.startsWith("/.well-known/oauth-authorization-server")) return new Response("nope", { status: 404 });
    if (url.href === "https://auth.canva.example/.well-known/openid-configuration/tenant") {
      return Response.json({ authorization_endpoint: `${AUTH}/authorize`, token_endpoint: `${AUTH}/token`, registration_endpoint: `${AUTH}/register`,
        code_challenge_methods_supported: ["S256"], grant_types_supported: ["authorization_code", "refresh_token"] });
    }
    return undefined;
  };
  expect(await discover(send, new URL(MCP_URL))).toMatchObject({ resource: MCP_URL, method: "client_secret_post", scopes: "" });
});
it("refuses an MCP with no sign-in it can use, in plain words", async () => {
  const base = { authorization_endpoint: `${AUTH}/authorize`, token_endpoint: `${AUTH}/token`, registration_endpoint: `${AUTH}/register`, code_challenge_methods_supported: ["S256"] };
  const cases: Record<string, unknown>[] = [{ ...base, registration_endpoint: undefined }, { ...base, code_challenge_methods_supported: ["plain"] },
    { ...base, grant_types_supported: ["client_credentials"] }, { ...base, token_endpoint: "http://auth.canva.example/token" }];
  for (const metadata of cases) {
    const { send, state } = mcpService();
    state.override = url => url.pathname === "/.well-known/oauth-authorization-server" ? Response.json(metadata) : undefined;
    await expect(discover(send, new URL(MCP_URL))).rejects.toThrow("That address has no sign-in we can use.");
  }
  const none = mcpService();
  none.state.override = url => url.pathname.startsWith("/.well-known/oauth-protected-resource") ? Response.json({ authorization_servers: [] }) : undefined;
  await expect(discover(none.send, new URL(MCP_URL))).rejects.toThrow("That address has no sign-in we can use.");
  const missing = mcpService();
  missing.state.override = url => url.hostname === "auth.canva.example" ? new Response("{}", { status: 500 }) : undefined;
  await expect(discover(missing.send, new URL(MCP_URL))).rejects.toThrow("That address has no sign-in we can use.");
  const down: Send = async () => { throw new TypeError("network"); };
  await expect(discover(down, new URL(MCP_URL))).rejects.toThrow("That address did not answer. Check it and try again.");
});
it("reads a non-JSON answer as nothing", async () => {
  const send: Send = async () => new Response("<html>");
  expect((await readJson(send, MCP_URL)).value).toBeNull();
});
