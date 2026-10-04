// Fixed provider origins only. Redirects never receive a forwarded credential.
import { AccessError } from "./core.ts";
import { boundedJson } from "./json.ts";
export async function provider(origin: "https://api.github.com" | "https://api.cloudflare.com/client/v4",
  path: string, token: string, method = "GET", body?: object): Promise<unknown> {
  if (!path.startsWith("/") || path.startsWith("//") || path.includes("..")) throw new AccessError("provider_destination_invalid");
  const response = await fetch(`${origin}${path}`, { method, redirect: "error", signal: AbortSignal.timeout(30_000),
    headers: { ...(token && { Authorization: `Bearer ${token}` }), Accept: "application/vnd.github+json", "Content-Type": "application/json",
      "User-Agent": "WongStack-employee-access", "X-GitHub-Api-Version": "2022-11-28" },
    ...(body && { body: JSON.stringify(body) }) });
  if (!response.ok) throw new AccessError(response.status === 404 ? "provider_not_found" : "provider_unavailable");
  if (response.status === 204) return null;
  return boundedJson(response, 1_048_576);
}
