// Frontend manifests include apps with no API; action registrations are not a catalogue.
import type { AccessIdentity } from "../access.ts";
import { authorizeRequest, currentPolicy, policyAllows, policyDenied, type PolicyEnv } from "./policy.ts";

export const catalogue = Object.keys(import.meta.glob("../../src/apps/*/app.json", { eager: true }))
  .map(path => path.split("/")[4]).sort();

export async function appAccess(request: Request, env: PolicyEnv, identity: AccessIdentity | null,
  apps: readonly string[] = catalogue): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(request, env, identity);
  if (!policyAllows(policy, { kind: "self-service" })) return policyDenied(policy);
  const headers = { "Cache-Control": "no-store" };
  if (policy.state !== "current") return Response.json({ state: "legacy" }, { headers });
  return Response.json({ state: "current", role: policy.role, revision: policy.revision,
    apps: apps.filter(name => policyAllows(policy, name === "access" ? { kind: "self-service" } : { apps: [name] })) },
  { headers });
}

/** Known app pages and nested pages use the same current server policy as APIs. */
export async function appPageDenied(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<Response | null> {
  const app = /^\/apps\/([a-z0-9-]+)(?:\/|$)/.exec(new URL(request.url).pathname)?.[1];
  if (!app || !catalogue.includes(app)) return null;
  return authorizeRequest(request, env, identity,
    app === "access" ? { kind: "self-service" } : { apps: [app] });
}
