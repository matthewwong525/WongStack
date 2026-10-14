import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { afterEach, beforeEach, expect, it } from "vitest";

// The file that moves managers onto the Admin role, run on a database as the files before it leave one.
const MOVE = "20261013205049_admin_role.sql";
const folder = new URL("../../../schema/migrations/", import.meta.url);
const read = (file: string) => readFileSync(new URL(file, folder), "utf8");
const id = "installation";
const custom = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
let sql: DatabaseSync;
const all = (query: string) => sql.prepare(query).all();
const person = (email: string, status = "active") => sql.prepare("INSERT INTO wong_access_members VALUES (?, ?, ?, 0, 1, 'now')").run(id, email, status);
const role = (roleId: string, name: string) => sql.prepare("INSERT INTO wong_access_roles VALUES (?, ?, ?, 1)").run(id, roleId, name);
const holds = (email: string, roleId: string) => sql.prepare("INSERT INTO wong_access_member_roles VALUES (?, ?, ?)").run(id, email, roleId);
const manager = (email: string) => sql.prepare("INSERT INTO wong_access_managers VALUES (?, ?)").run(id, email);
const roles = () => all("SELECT role_id, name FROM wong_access_roles ORDER BY role_id");
const held = () => all("SELECT email, role_id FROM wong_access_member_roles ORDER BY email");

beforeEach(() => {
  sql = new DatabaseSync(":memory:");
  sql.exec("PRAGMA foreign_keys = ON");
  // Every file before it, in the order a replay from empty runs them: it reads only tables they made.
  const earlier = readdirSync(folder).filter(file => file.endsWith(".sql") && file < MOVE).sort();
  expect(earlier).toContain("20261005142459_access_managers.sql");
  for (const file of earlier) sql.exec(read(file));
});
afterEach(() => sql.close());
const install = () => sql.exec(`INSERT INTO wong_access_installation
  (slot, installation_id, origin, account_id, worker_id, access_app_id, access_policy_id,
    issuer, audience, owner_subject, owner_email, repository_id, repository_name, policy_enabled, activated_at)
  VALUES (1, '${id}', 'https://business.example.com', '', 'worker', '', '', 'https://business.cloudflareaccess.com',
    'business-app', 'owner-subject', 'owner@example.com', 1, '', 1, 'now');
  INSERT INTO wong_access_apps VALUES ('${id}', 'orders'), ('${id}', 'payroll')`);

it("moves each current manager onto Admin, renames a role already called Admin with its apps, keys and people, and gives nobody else anything", () => {
  install();
  for (const email of ["mia@example.com", "noor@example.com", "pat@example.com", "quinn@example.com", "rae@example.com"]) person(email);
  person("omar@example.com", "removed");
  role("sales", "Sales"); role(custom, "Admin");
  sql.exec(`INSERT INTO wong_access_role_apps VALUES ('${id}', 'sales', 'orders', 'write'), ('${id}', '${custom}', 'payroll', 'write');
    INSERT INTO wong_access_role_keys VALUES ('${id}', '${custom}', 'cloudflare', 'read');
    INSERT INTO wong_access_grants VALUES ('${id}', 'noor@example.com', 'orders', 1, 'write'), ('${id}', 'rae@example.com', 'orders', 1, 'write');
    INSERT INTO wong_access_key_grants VALUES ('${id}', 'noor@example.com', 'cloudflare', 'read', 1), ('${id}', 'rae@example.com', 'code', 'read', 1)`);
  // Mia manages and holds Sales; Noor manages with her own set; Omar was removed with his manager row left behind.
  // Pat and Quinn hold the owner's own role named Admin; Rae has her own set and manages nothing.
  holds("mia@example.com", "sales"); holds("pat@example.com", custom); holds("quinn@example.com", custom);
  for (const email of ["mia@example.com", "noor@example.com", "omar@example.com"]) manager(email);
  const untouched = () => ["managers", "members", "installation", "role_apps", "role_keys"].map(table => all(`SELECT * FROM wong_access_${table} ORDER BY 1, 2`));
  const before = untouched();
  sql.exec(read(MOVE));
  // The built-in role exists, and the owner's keeps its id under a name that says it is their own.
  expect(roles()).toEqual([{ role_id: custom, name: "Admin (custom)" }, { role_id: "admin", name: "Admin" }, { role_id: "sales", name: "Sales" }]);
  // Both managers hold Admin, and nobody else does: the removed person holds nothing,
  // and the old role's two people keep it.
  expect(held()).toEqual([{ email: "mia@example.com", role_id: "admin" }, { email: "noor@example.com", role_id: "admin" },
    { email: "pat@example.com", role_id: custom }, { email: "quinn@example.com", role_id: custom }]);
  // A person holds one role or an own set, never both: the managers' own rows are gone, and nobody else's.
  expect(all("SELECT email, app_id FROM wong_access_grants")).toEqual([{ email: "rae@example.com", app_id: "orders" }]);
  expect(all("SELECT email, key_id FROM wong_access_key_grants")).toEqual([{ email: "rae@example.com", key_id: "code" }]);
  // The old role's apps and key levels, every role's rows, every person and the old manager rows are as they were.
  expect(untouched()).toEqual(before);
  expect(all("SELECT role_id FROM wong_access_role_apps WHERE role_id = 'admin' UNION ALL SELECT role_id FROM wong_access_role_keys WHERE role_id = 'admin'")).toEqual([]);
});

it("does not fail where the new name is taken too, on an install with nothing to move, or on one whose Admin role is already there", () => {
  install();
  // The owner has a role named ADMIN and another already named Admin (custom), in another case.
  role(custom, "ADMIN"); role("kept", "admin (CUSTOM)");
  sql.exec(read(MOVE));
  expect(roles()).toEqual([{ role_id: custom, name: "Admin (custom 7c9e6679)" }, { role_id: "admin", name: "Admin" }, { role_id: "kept", name: "admin (CUSTOM)" }]);
  expect(held()).toEqual([]);
  // A new Worker's first owner request wrote the role before the file ran: it stays as it is, once.
  sql.exec("DELETE FROM wong_access_roles WHERE role_id <> 'admin'");
  sql.exec(read(MOVE));
  expect(roles()).toEqual([{ role_id: "admin", name: "Admin" }]);
});

it("leaves a database whose owner never opened Access with no role at all", () => {
  sql.exec(read(MOVE));
  expect([roles(), held()]).toEqual([[], []]);
});
