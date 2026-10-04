// Frontend manifests include apps with no API; action registrations are not a catalogue.
import type { AccessIdentity } from "../access.ts";
import { catalogue } from "./catalogue.ts";
import { authorizeRequest, currentPolicy, policyAllows, policyDenied, type PolicyEnv } from "./policy.ts";

export async function appAccess(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(env, identity);
  if (policy.state === "unavailable" || policy.state === "denied") return policyDenied(policy);
  const headers = { "Cache-Control": "no-store" };
  if (policy.state === "legacy") return Response.json({ state: "legacy" }, { headers });
  // Before permissions start everyone keeps every app; the role still says who manages people.
  if (policy.state === "not_started") return Response.json({ state: "not_started", role: policy.role, apps: catalogue }, { headers });
  return Response.json({ state: "current", role: policy.role, revision: policy.revision,
    apps: catalogue.filter(name => policyAllows(policy, name === "access" ? { kind: "self-service" } : { apps: [name] })) },
  { headers });
}

/** Known app pages and nested pages use the same current server policy as APIs. */
export async function appPageDenied(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<Response | null> {
  const app = /^\/apps\/([a-z0-9-]+)(?:\/|$)/.exec(new URL(request.url).pathname)?.[1];
  if (!app || !catalogue.includes(app)) return null;
  return authorizeRequest(env, identity,
    app === "access" ? { kind: "self-service" } : { apps: [app] });
}
