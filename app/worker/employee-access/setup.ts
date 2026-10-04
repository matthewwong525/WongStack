// Current self-service status establishes API authority, never a local clone or memory grant.
import type { AccessIdentity } from "../access.ts";
import { type ConnectionEnv, reply } from "./core.ts";
import { currentPolicy, policyDenied } from "./policy.ts";
export async function setupStatus(request: Request, env: ConnectionEnv, identity: AccessIdentity | null): Promise<Response> {
  if (request.method !== "GET") return reply({ code: "method_not_allowed" }, 405);
  const policy = await currentPolicy(request, env, identity);
  if (policy.state !== "current" || !identity) return policyDenied(policy);
  try {
    const row = await env.DB.withSession("first-primary").prepare(`SELECT i.issuance_enabled, m.project_editing, c.status connection
      FROM wong_access_installation i LEFT JOIN wong_access_members m ON m.installation_id = i.installation_id AND m.email = ?
      LEFT JOIN wong_access_connections c ON c.installation_id = i.installation_id AND c.provider = 'github' WHERE i.slot = 1`)
      .bind(identity.id.trim().toLowerCase()).first<{ issuance_enabled: number; project_editing: number | null; connection: string | null }>();
    if (!row) return reply({ code: "setup_unavailable" }, 503);
    const allowed = policy.role === "employee" && row.project_editing === 1;
    return reply({ role: policy.role, revision: policy.revision, apps: [...policy.apps], api: "authenticated",
      project: { allowed, state: allowed ? row.issuance_enabled === 1 && row.connection === "ready" ? "available" : "owner_setup_required" : "not_assigned",
        localConnection: "not_established_by_this_readback", publishing: "owner_required" }, memory: "independent_operator_setup" });
  } catch { return reply({ code: "setup_unavailable" }, 503); }
}
