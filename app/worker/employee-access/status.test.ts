import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { body as json } from "../../tests/body";
import { employee, fixture, owner, req, site } from "../../tests/employee-access/connections";
import { appAccess } from "./apps";
import { management } from "./management";
import { authorizeRequest } from "./policy";

vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtApps(["access", "orders", "reports"]));

let f: ReturnType<typeof fixture>;
const id = site.installationId;
const practice = () => ({ ...f.env, WONG_ENVIRONMENT: "staging", WONG_ACCESS_LOGIN_MANAGEMENT: undefined });
const run = async (path: string, method = "GET", body?: unknown) => {
  const response = await management(req(path, method, body), practice(), owner);
  expect(response.status, path).toBe(200);
  return json(response);
};
const may = async (app: string, need: "read" | "write") => (await authorizeRequest(f.env, employee, { apps: [app] }, need)) === null;
beforeEach(() => { f = fixture(); });
afterEach(() => f.sql.close());

it("lists every app a person can be given, and no skill, area or level beside one", async () => {
  const status = await run("status");
  // Access itself is everyone's own page: nobody is given it.
  expect(status.apps).toEqual([{ id: "orders", title: "Orders", description: "The orders app." }, { id: "reports", title: "Reports", description: "The reports app." }]);
  expect(status.unticked).toEqual({ people: [], roles: [] });
  for (const gone of ["areas", "skills", "kept", "appKeys"]) expect(status, gone).not.toHaveProperty(gone);
  // Nothing is stored for a skill: its calls are judged by the caller's apps and key levels, like any other call.
  expect(f.sql.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE '%skill%'").all()).toEqual([]);
});

it("names each person and each role that could only look at an app, by the app's title, until the next save", async () => {
  // From before ticks: the employee held Orders to look and Reports to change; a role held Reports to look.
  f.sql.exec(`INSERT INTO wong_access_apps VALUES ('${id}', 'reports'), ('${id}', 'retired');
    INSERT INTO wong_access_grants VALUES ('${id}', '${employee.id}', 'orders', 1, 'read'), ('${id}', '${employee.id}', 'reports', 1, 'write'),
      ('${id}', '${employee.id}', 'retired', 1, 'read');
    INSERT INTO wong_access_roles VALUES ('${id}', 'desk', 'Front desk', 1), ('${id}', 'sales', 'Sales', 1);
    INSERT INTO wong_access_role_apps VALUES ('${id}', 'desk', 'reports', 'read'), ('${id}', 'sales', 'orders', 'write')`);
  const status = await run("status");
  // A row at `write` is the tick; one at `read` ends, and an app no longer built is not named.
  expect(status.unticked).toEqual({ people: [{ email: employee.id, apps: ["Orders"] }], roles: [{ name: "Front desk", apps: ["Reports"] }] });
  expect(status).toMatchObject({ people: [{ email: employee.id, apps: ["reports"] }], roles: [{ name: "Front desk", apps: [] }, { name: "Sales", apps: ["orders"] }] });
  // Nobody gained the power to change things: the look-only app is refused whole, and the held one is whole.
  expect([await may("orders", "read"), await may("orders", "write"), await may("reports", "write")]).toEqual([false, false, true]);
  const own = await json(await appAccess(new Request(`${site.origin}/api/access/apps`), f.env, employee));
  expect(own.apps).toEqual(["access", "reports"]);
  expect(own).not.toHaveProperty("areas");
  // The owner ticks the app again and saves: the person holds all of it, and the names are gone, the role's too.
  const saved = await run("people", "POST", { email: employee.id, removed: false, apps: { orders: true } });
  expect(saved).toMatchObject({ unticked: { people: [], roles: [] }, people: [{ email: employee.id, apps: ["orders", "reports"] }], roles: [{ apps: [] }, { apps: ["orders"] }] });
  expect([await may("orders", "read"), await may("orders", "write")]).toEqual([true, true]);
  expect((await run("status")).unticked).toEqual({ people: [], roles: [] });
});
