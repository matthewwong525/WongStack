// Private operator-reviewed catalogue and main-route pins precede rollout.
import { z } from "zod";
import { type Core, AccessError, now } from "./core.ts";
import { catalogue } from "./apps.ts";
import { mainRouteInventory } from "../api/router.ts";
const schema = z.object({ version: z.literal(1), apps: z.array(z.string()),
  people: z.array(z.object({ email: z.email(), apps: z.array(z.string()) }).strict()),
  mainRoutes: z.array(z.object({ route: z.string(), access: z.union([
    z.object({ apps: z.array(z.string()).min(1) }).strict(),
    z.object({ kind: z.enum(["owner", "self-service", "infrastructure"]) }).strict(),
  ]) }).strict()) }).strict();
function reviewedPlan(core: Core) {
  if (!core.env.WONG_ACCESS_ROLLOUT) throw new AccessError("private_rollout_required");
  const reviewed = schema.parse(JSON.parse(core.env.WONG_ACCESS_ROLLOUT));
  if (JSON.stringify([...reviewed.apps].sort()) !== JSON.stringify([...catalogue].sort()) ||
    JSON.stringify(reviewed.mainRoutes) !== JSON.stringify(mainRouteInventory())) throw new AccessError("route_review_required");
  return reviewed;
}
function catalogueWrites(core: Core) {
  return catalogue.map(app => core.db.prepare("INSERT INTO wong_access_apps VALUES (?, ?) ON CONFLICT DO NOTHING")
    .bind(core.pin.installationId, app));
}
export async function prepare(core: Core): Promise<void> {
  reviewedPlan(core);
  await core.db.batch(catalogueWrites(core));
}
export async function rollout(core: Core): Promise<void> {
  if (core.env.WONG_ACCESS_POLICY !== "on") throw new AccessError("private_rollout_required");
  const reviewed = reviewedPlan(core);
  const people = await core.db.prepare(`SELECT email,
    (SELECT json_group_array(app_id) FROM wong_access_grants g WHERE g.installation_id = m.installation_id AND g.email = m.email) apps
    FROM wong_access_members m WHERE installation_id = ? AND status = 'active' ORDER BY email`)
    .bind(core.pin.installationId).all<{ email: string; apps: string }>();
  const expected = reviewed.people.map(person => ({ email: person.email, apps: [...person.apps].sort() }))
    .sort((a, b) => a.email.localeCompare(b.email));
  const actual = people.results.map(person => ({ email: person.email, apps: z.array(z.string()).parse(JSON.parse(person.apps)).sort() }));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new AccessError("grant_review_required");
  await core.db.batch([
    ...catalogueWrites(core),
    core.db.prepare("UPDATE wong_access_installation SET policy_enabled = 1, revision = revision + 1 WHERE installation_id = ?")
      .bind(core.pin.installationId),
    core.db.prepare(`INSERT INTO wong_access_audit SELECT ?, installation_id, ?, 'policy_enabled', revision, ?
      FROM wong_access_installation WHERE installation_id = ?`).bind(crypto.randomUUID(), core.email, now(), core.pin.installationId),
  ]);
}
