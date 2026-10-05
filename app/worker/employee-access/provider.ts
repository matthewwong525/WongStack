// Fixed provider origins only. A redirect comes back unfollowed and fails like any non-2xx answer,
// so it never receives the credential. The Workers runtime rejects the "error" redirect mode.
import { AccessError } from "./core.ts";
import { boundedJson } from "./json.ts";
export async function provider(origin: "https://api.cloudflare.com/client/v4",
  path: string, token: string, method = "GET", body?: object): Promise<unknown> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) throw new AccessError("provider_destination_invalid");
  const response = await fetch(`${origin}${path}`, { method, redirect: "manual", signal: AbortSignal.timeout(30_000),
    headers: { ...(token && { Authorization: `Bearer ${token}` }), Accept: "application/json", "Content-Type": "application/json",
      "User-Agent": "WongStack-employee-access" },
    ...(body && { body: JSON.stringify(body) }) });
  if (!response.ok) throw new AccessError(response.status === 404 ? "provider_not_found" : "provider_unavailable");
  if (response.status === 204) return null;
  return boundedJson(response, 1_048_576);
}
