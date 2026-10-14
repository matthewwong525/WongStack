// Memory's role for a company sign-in, read from Access on every call: wiki/development/memory.md#who-sees-what
import { getAccessIdentity, type AccessIdentity } from "./access.ts";
import { currentPolicy, humanEmail, type CurrentPolicy, type PolicyEnv } from "./employee-access/policy.ts";

export interface MemoryCaller {
  role: "admin" | "member" | "reader";
  /** The sign-in's subject: it owns the person's private memory, and an email change keeps it. */
  subject: string;
  email: string;
}

/** The owner and Admins are memory admins; whoever holds Project code, or everyone before key levels start, a
 *  member; any other allowed person a reader. */
export function memoryRole(policy: CurrentPolicy): MemoryCaller["role"] | null {
  if (policy.state === "not_started") return policy.manages ? "admin" : "member";
  if (policy.state !== "current") return policy.state === "legacy" ? "reader" : null;
  if (policy.manages) return "admin";
  return !policy.keys || policy.keys.has("code") ? "member" : "reader";
}

/** A verified person's memory caller, or null: a machine, another app's sign-in, or a removed person. */
export async function memoryCaller(request: Request, env: PolicyEnv): Promise<MemoryCaller | null> {
  const identity: AccessIdentity | null = await getAccessIdentity(request, env);
  const email = humanEmail(identity);
  const subject = identity?.claims.sub;
  if (!email || !subject) return null;
  const role = memoryRole(await currentPolicy(env, identity));
  return role && { role, subject, email };
}
