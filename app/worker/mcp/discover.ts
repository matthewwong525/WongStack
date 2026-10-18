// What an MCP's address offers for sign-in, read from its public metadata (RFC 9728, then RFC 8414) before saving.
import { boundedText } from "../api/contract.ts";

export type Send = typeof fetch;
/** What Connect needs, all public: where to sign in, where to swap a code, and where to register. */
type SignIn = { resource: string; authorize: string; token: string; register: string; method: "none" | "client_secret_post"; scopes: string };

/** A refusal whose message is plain words for the Add dialog. */
export class McpRefusal extends Error {}
const NO_SIGN_IN = "That address has no sign-in we can use.";

/** An address the app may call: HTTPS, with no user name, password or fragment. */
export function checkedAddress(text: string): URL {
  const url = URL.canParse(text) ? new URL(text) : null;
  if (!url || url.protocol !== "https:" || url.username || url.password || url.hash || text.includes("#")) throw new McpRefusal("Use the MCP's full https:// address.");
  return url;
}

/** One small JSON answer, never following a redirect. */
export async function readJson(send: Send, url: string, init: RequestInit = {}): Promise<{ status: number; headers: Headers; value: unknown }> {
  const response = await send(url, { redirect: "manual", signal: AbortSignal.timeout(10_000), ...init });
  const text = await boundedText(response.body, 262_144);
  let value: unknown = null;
  try { value = JSON.parse(text); } catch { /* a non-JSON answer reads as nothing */ }
  return { status: response.status, headers: response.headers, value };
}

const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" ? value as Record<string, unknown> : {};
const https = (value: unknown): string | null => typeof value === "string" && URL.canParse(value) && new URL(value).protocol === "https:" ? value : null;
const list = (value: unknown): string[] => Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
/** A well-known address for `base`, with its path after the well-known part, as RFC 8414 and RFC 9728 place it. */
const wellKnown = (base: URL, name: string) => `${base.origin}/.well-known/${name}${base.pathname === "/" ? "" : base.pathname}`;

/** The metadata's address the MCP's own refusal names, else the well-known one. */
async function resourceMetadata(send: Send, url: URL): Promise<string> {
  const probe = await send(url, { method: "POST", redirect: "manual", signal: AbortSignal.timeout(10_000),
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "WongStack", version: "1" } } }) });
  await probe.body?.cancel();
  const named = /resource_metadata="([^"]+)"/.exec(probe.headers.get("www-authenticate") ?? "")?.[1];
  return https(named) ?? wellKnown(url, "oauth-protected-resource");
}

/** The sign-in server's metadata: OAuth's own address first, then OpenID's. */
async function serverMetadata(send: Send, issuer: URL): Promise<Record<string, unknown>> {
  for (const name of ["oauth-authorization-server", "openid-configuration"]) {
    const { status, value } = await readJson(send, wellKnown(issuer, name));
    if (status === 200 && value) return record(value);
  }
  throw new McpRefusal(NO_SIGN_IN);
}

/** What the MCP at `url` offers for sign-in, or a refusal saying why it can't be used. */
export async function discover(send: Send, url: URL): Promise<SignIn> {
  try {
    const { value } = await readJson(send, await resourceMetadata(send, url));
    const resource = record(value);
    const issuer = https(list(resource.authorization_servers)[0]);
    if (!issuer) throw new McpRefusal(NO_SIGN_IN);
    const server = await serverMetadata(send, new URL(issuer));
    const [authorize, token, register] = [server.authorization_endpoint, server.token_endpoint, server.registration_endpoint].map(https);
    const grants = server.grant_types_supported === undefined ? ["authorization_code"] : list(server.grant_types_supported);
    const methods = list(server.token_endpoint_auth_methods_supported);
    if (!authorize || !token || !register || !list(server.code_challenge_methods_supported).includes("S256") || !grants.includes("authorization_code")) throw new McpRefusal(NO_SIGN_IN);
    return { resource: https(resource.resource) ?? url.href, authorize, token, register,
      method: methods.includes("none") ? "none" : "client_secret_post", scopes: list(resource.scopes_supported).join(" ") };
  } catch (error) {
    throw error instanceof McpRefusal ? error : new McpRefusal("That address did not answer. Check it and try again.");
  }
}
