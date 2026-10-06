import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { employee, fixture, owner, req, site } from "../../tests/employee-access/connections";
import { appAccess } from "./apps";
import { management } from "./management";
import { authorizeRequest } from "./policy";
import { skills, type Skill } from "./skills";

// Orders has a screen. Reports has none: it exists for skills and assistants.
vi.mock("./catalogue.ts", async () => (await import("../../tests/employee-access/catalogue")).builtAreas(["access", "orders", "reports"], ["reports"]));
vi.mock("./skills.ts", () => ({ skills: vi.fn(() => []) }));

let f: ReturnType<typeof fixture>;
const practice = () => ({ ...f.env, WONG_ENVIRONMENT: "staging", WONG_ACCESS_LOGIN_MANAGEMENT: undefined });
const run = async (path: string, method = "GET", body?: unknown) => {
  const response = await management(req(path, method, body), practice(), owner);
  expect(response.status, path).toBe(200);
  return response.json();
};
const may = async (app: string, need: "read" | "write") => (await authorizeRequest(f.env, employee, { apps: [app] }, need)) === null;
beforeEach(() => { f = fixture(); });
afterEach(() => { f.sql.close(); vi.mocked(skills).mockReset().mockReturnValue([]); });

it("lists every area a person can be given, with or without a screen, and no skill on an installation that has none", async () => {
  const status = await run("status");
  // Access itself is everyone's own page: nobody is given it.
  expect(status.areas).toEqual([{ id: "orders", title: "Orders", description: "The orders area.", screen: true },
    { id: "reports", title: "Reports", description: "The reports area.", screen: false }]);
  expect([status.skills, status.appKeys]).toEqual([[], { orders: [], reports: [] }]);
  expect(status).not.toHaveProperty("apps");
});

it("says what each skill needs, and stores no grant for one: its areas and keys are what a person is given", async () => {
  const refund: Skill = { id: "refund", title: "Refund a customer", areas: { orders: "write", reports: "read" }, keys: { code: "read" } };
  vi.mocked(skills).mockReturnValue([refund]);
  expect((await run("status")).skills).toEqual([refund]);
  const before = f.sql.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all();
  // The employer gives what the skill needs, as two areas: the person's calls are judged by those levels alone.
  const saved = await run("people", "POST", { email: employee.id, removed: false, apps: refund.areas });
  expect(saved.people[0]).toMatchObject({ email: employee.id, apps: refund.areas });
  expect([await may("orders", "write"), await may("reports", "read"), await may("reports", "write")]).toEqual([true, true, false]);
  // Lowered, the skill's changing action is refused on the next call.
  await run("people", "POST", { email: employee.id, removed: false, apps: { orders: "read" } });
  expect([await may("orders", "read"), await may("orders", "write")]).toEqual([true, false]);
  expect(f.sql.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()).toEqual(before);
});

it("gives an area with no screen like an app: its actions open at the level given, and the person's home page gets no card", async () => {
  await run("people", "POST", { email: employee.id, removed: false, apps: { reports: "read" } });
  expect([await may("reports", "read"), await may("reports", "write"), await may("orders", "read")]).toEqual([true, false, false]);
  const own = await (await appAccess(new Request(`${site.origin}/api/access/apps`), f.env, employee)).json();
  expect([own.apps, own.areas]).toEqual([["access"], [{ id: "reports", title: "Reports", screen: false, level: "read" }]]);
  const refused = await authorizeRequest(f.env, employee, { apps: ["reports"] });
  expect(await refused?.json()).toMatchObject({ error: { code: "forbidden", message: "Reports: Look up & change needed" } });
});
