import { expect, it } from "vitest";
import { mainRouteInventory } from "../api/router";
import { apps, appTitle, catalogue, hasScreen, listApps, routeApps } from "./catalogue";

const named = (title: unknown = "Orders", description: unknown = "Take and look up orders.") => ({ title, description });
const folders = (paths: string[], at: number) => [...new Set(paths.map(path => path.split("/")[at]))].sort();

it("lists each screen folder as an app, sorted, with its words", () => {
  expect(listApps(new Map([["orders", named()], ["hello", named("Hello", "Say hello.")]]))).toEqual([
    { id: "hello", title: "Hello", description: "Say hello." }, { id: "orders", title: "Orders", description: "Take and look up orders." }]);
  expect(listApps(new Map())).toEqual([]);
});

it("fails on an app with no title or description, naming its app.json", () => {
  for (const words of [{}, { description: "Weekly numbers." }, named(" "), named(3), { title: "Reports" }, named("Reports", "")]) {
    expect(() => listApps(new Map([["hello", named()], ["reports", words]])), JSON.stringify(words))
      .toThrow("app/src/apps/reports/app.json needs a title and a description.");
  }
});

it("holds every folder with a screen and no other: a server folder with none is no app", () => {
  const withScreen = folders(Object.keys(import.meta.glob("../../src/apps/*/app.json")), 4);
  expect(catalogue()).toEqual(withScreen);
  expect(apps().map(app => app.id)).toEqual(withScreen);
  for (const app of apps()) expect([app.title.trim(), app.description.trim()], app.id).not.toContain("");
  expect(appTitle("hello")).toBe("Hello");
  expect([hasScreen("hello"), hasScreen("reports")]).toEqual([true, false]);
});

it("fails on a main route mapped to a name that is not a built app, naming the route and the name", () => {
  // Every main route of this build is mapped to built apps, or to none.
  expect(() => routeApps(mainRouteInventory())).not.toThrow();
  expect(() => routeApps([{ route: "GET /api/health", access: { kind: "infrastructure" } }, { route: "GET /api/read", access: { keys: ["cloudflare"] } },
    { route: "GET /api/unmapped" }, { route: "GET /api/hello", access: { apps: ["hello"] } }])).not.toThrow();
  expect(() => routeApps([{ route: "GET /api/orders", access: { apps: ["hello", "ordres"], keys: ["cloudflare"] } }]))
    .toThrow('GET /api/orders is mapped to "ordres", which is not a built app. Map it to a folder under app/src/apps/.');
});
