import { expect, it } from "vitest";
// Loading the apps hands the catalogue every server folder, as the Worker does when it starts.
import "../apps/index";
import { mainRouteInventory } from "../api/router";
import { areas, areaTitle, catalogue, listAreas, routeAreas, screens, serverFolders } from "./catalogue";

const named = (title: unknown = "Orders", description: unknown = "Take and look up orders.") => ({ title, description });
const folders = (paths: string[], at: number) => [...new Set(paths.map(path => path.split("/")[at]))].sort();

it("lists a screen folder and a server folder with no screen as areas, sorted, each with its words", () => {
  const list = listAreas(new Map([["orders", named()], ["hello", named("Hello", "Say hello.")]]),
    // A folder with a screen is named by its app.json: its api.ts need export no words.
    new Map([["reports", named("Reports", "Weekly numbers for a skill.")], ["orders", {} as { title?: unknown; description?: unknown }]]));
  expect(list).toEqual([{ id: "hello", title: "Hello", description: "Say hello.", screen: true },
    { id: "orders", title: "Orders", description: "Take and look up orders.", screen: true },
    { id: "reports", title: "Reports", description: "Weekly numbers for a skill.", screen: false }]);
  expect(listAreas(new Map(), new Map())).toEqual([]);
});

it("fails on a folder with no screen and no title or description, naming its api.ts", () => {
  for (const words of [{}, { description: "Weekly numbers." }, named(" "), named(3), { title: "Reports" }, named("Reports", "")]) {
    expect(() => listAreas(new Map([["hello", named()]]), new Map([["reports", words]])), JSON.stringify(words))
      .toThrow("app/worker/apps/reports/api.ts: a folder with no screen names itself. Export a title and a description.");
  }
  // A screen's card needs its words too, and its api.ts can not stand in for them.
  expect(() => listAreas(new Map([["orders", { title: "Orders" }]]), new Map([["orders", named()]]))).toThrow("app/src/apps/orders/app.json needs a title and a description.");
});

it("holds every built folder, and only the ones with a screen have a page and a card on Home", () => {
  const withScreen = folders(Object.keys(import.meta.glob("../../src/apps/*/app.json")), 4);
  const servers = folders(Object.keys(import.meta.glob("../apps/*/api.ts")), 2);
  expect(catalogue()).toEqual([...new Set([...withScreen, ...servers])].sort());
  expect(screens()).toEqual(withScreen);
  expect(areas().map(area => [area.id, area.screen])).toEqual(catalogue().map(id => [id, withScreen.includes(id)]));
  for (const area of areas()) expect([area.title.trim(), area.description.trim()], area.id).not.toContain("");
  expect(areaTitle("hello")).toBe("Hello");
});

it("takes the server folders it is handed: one with no screen becomes an area, and Home's list stays screens alone", () => {
  const before = screens();
  serverFolders(new Map([["reports", named("Reports", "Weekly numbers for a skill.")]]));
  expect(catalogue()).toContain("reports");
  expect([screens(), areaTitle("reports")]).toEqual([before, "Reports"]);
  expect(areas().find(area => area.id === "reports")).toEqual({ id: "reports", title: "Reports", description: "Weekly numbers for a skill.", screen: false });
  // A folder nobody named stops here, by name, before Access lists it.
  expect(() => serverFolders(new Map([["untitled", {}]]))).toThrow("app/worker/apps/untitled/api.ts");
  expect(catalogue()).not.toContain("untitled");
});

it("fails on a main route mapped to a name that is not a built area, naming the route and the name", () => {
  // Every main route of this build is mapped to built areas, or to none.
  expect(() => routeAreas(mainRouteInventory())).not.toThrow();
  expect(() => routeAreas([{ route: "GET /api/health", access: { kind: "infrastructure" } }, { route: "GET /api/read", access: { keys: ["cloudflare"] } },
    { route: "GET /api/unmapped" }, { route: "GET /api/hello", access: { apps: ["hello"] } }])).not.toThrow();
  expect(() => routeAreas([{ route: "GET /api/orders", access: { apps: ["hello", "ordres"], keys: ["cloudflare"] } }]))
    .toThrow('GET /api/orders is mapped to "ordres", which is not a built area.');
});
