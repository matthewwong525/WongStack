// The operator helper reads this person's nonsecret verified identity; it is
// evidence to compare with the owner, never authority to nominate an owner.
import type { AccessIdentity } from "../access.ts";
import type { ActivationEnv } from "./activation.ts";

export function activationIdentity(request: Request, env: ActivationEnv, identity: AccessIdentity | null): Response {
  const headers = { "Cache-Control": "no-store" };
  if (request.method !== "GET") return Response.json({ code: "method_not_allowed" }, { status: 405, headers });
  if (env.WONG_ENVIRONMENT !== "production" || !env.CF_ACCESS_APP_ID || !env.CF_ACCESS_WORKER_ID) {
    return Response.json({ code: "owner_setup_required" }, { status: 503, headers });
  }
  if (!identity || identity.kind !== "user" || !identity.claims.sub || identity.claims.common_name) {
    return Response.json({ code: "human_required" }, { status: 403, headers });
  }
  return Response.json({
    email: identity.id.trim().toLowerCase(), subject: identity.claims.sub, issuer: identity.claims.iss,
    audience: env.CF_ACCESS_AUD, origin: new URL(request.url).origin,
    accessAppId: env.CF_ACCESS_APP_ID, workerId: env.CF_ACCESS_WORKER_ID,
  }, { headers });
}
