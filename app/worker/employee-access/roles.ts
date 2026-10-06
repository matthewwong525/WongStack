// A role is a named set of area and key levels that several people share, read live on every request.
import { z } from "zod";
import { type Core, AccessError } from "./core.ts";
import { type Sets, changedSet, heldSet, readSets, save, setFields, setWrites } from "./sets.ts";

// `from` starts a new role from one person's current access; `removed` takes a role away.
const roleSchema = z.object({ id: z.string().min(1).optional(), name: z.string().trim().min(1).max(60).optional(),
  from: z.email().transform(value => value.trim().toLowerCase()).optional(), removed: z.boolean().optional(), ...setFields }).strict();
type Role = Sets["roles"][number];

/** Each holder keeps what the role gave, as their own set: tidying up roles locks nobody out. */
function removal(core: Core, role: Role, people: Sets["people"]): D1PreparedStatement[] {
  const id = core.installationId;
  return [
    core.db.prepare("DELETE FROM wong_access_member_roles WHERE installation_id = ? AND role_id = ?").bind(id, role.id),
    ...people.filter(person => person.role === role.id).flatMap(person => setWrites(core, "people", person.email, role.set)),
    ...setWrites(core, "roles", role.id, { apps: {}, keys: {} }),
    core.db.prepare("DELETE FROM wong_access_roles WHERE installation_id = ? AND role_id = ?").bind(id, role.id),
  ];
}

/** Create a role, change one, or remove one. A change reaches every holder on their next request. */
export async function changeRole(core: Core, value: unknown): Promise<void> {
  const parsed = roleSchema.safeParse(value);
  if (!parsed.success) throw new AccessError("invalid_role", 400);
  const { id, name, from, removed, ...change } = parsed.data;
  const { people, roles } = await readSets(core);
  const existing = roles.find(role => role.id === id);
  if (id !== undefined && !existing) throw new AccessError("unknown_role", 400);
  if (removed) {
    if (!existing) throw new AccessError("invalid_role", 400);
    return save(core, ["role_removed"], removal(core, existing, people));
  }
  if (!name || (existing && from)) throw new AccessError("invalid_role", 400);
  if (roles.some(role => role !== existing && role.name.toLowerCase() === name.toLowerCase())) throw new AccessError("role_name_taken", 409);
  const source = people.find(person => person.email === from && person.status === "active");
  if (from && !source) throw new AccessError("unknown_person", 400);
  const base = existing?.set ?? (source ? heldSet(source, roles) : { apps: {}, keys: {} });
  const role = id ?? crypto.randomUUID();
  const installation = core.installationId;
  await save(core, ["role_changed"], [
    core.db.prepare(`INSERT INTO wong_access_roles
      VALUES (?, ?, ?, (SELECT revision FROM wong_access_installation WHERE installation_id = ?))
      ON CONFLICT(installation_id, role_id) DO UPDATE SET name = excluded.name, revision = excluded.revision`)
      .bind(installation, role, name, installation),
    ...setWrites(core, "roles", role, changedSet(base, change)),
  ]);
}
