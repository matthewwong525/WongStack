// Frontend manifests include apps with no API; action registrations are not a catalogue.
import { hasSignIn, type AccessIdentity } from "../access.ts";
import { catalogue } from "./catalogue.ts";
import { keyIds, keyTitle } from "./key-levels.ts";
import { codeState } from "./code.ts";
import { authorizeRequest, checkerOwns, currentPolicy, humanEmail, policyAllows, policyDenied, type PolicyEnv } from "./policy.ts";

export async function appAccess(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return Response.json({ error: "Not found" }, { status: 404 });
  const policy = await currentPolicy(env, identity);
  if (policy.state === "unavailable" || policy.state === "denied") return policyDenied(policy);
  const headers = { "Cache-Control": "no-store" };
  // `signIn` tells the page's frame whether there is a session to sign out of.
  const signIn = hasSignIn(env);
  // `code` says whether the caller may connect an assistant: `lacked` greys the Connect card on Home.
  const code = codeState(env, policy, !!humanEmail(identity) || checkerOwns(env, identity));
  if (policy.state === "legacy") return Response.json({ state: "legacy", signIn, code }, { headers });
  // Before permissions start everyone keeps every app; `manages` still says who manages people.
  if (policy.state === "not_started") return Response.json({ state: "not_started", role: policy.role, manages: policy.manages, signIn, code, apps: catalogue }, { headers });
  return Response.json({ state: "current", role: policy.role, manages: policy.manages, signIn, code, revision: policy.revision,
    apps: catalogue.filter(name => policyAllows(policy, name === "access" ? { kind: "self-service" } : { apps: [name] })),
    // The caller's own level for each saved key, by name: none until key levels start.
    keys: keyIds().flatMap(id => {
      const level = policy.keys?.get(id);
      return level ? [{ id, title: keyTitle(id), level }] : [];
    }) },
  { headers });
}

/** Known app pages and nested pages use the same current server policy as APIs. */
export async function appPageDenied(request: Request, env: PolicyEnv, identity: AccessIdentity | null): Promise<Response | null> {
  const app = /^\/apps\/([a-z0-9-]+)(?:\/|$)/.exec(new URL(request.url).pathname)?.[1];
  if (!app || !catalogue.includes(app)) return null;
  return authorizeRequest(env, identity,
    app === "access" ? { kind: "self-service" } : { apps: [app] });
}
