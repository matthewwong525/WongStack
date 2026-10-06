// The built folders are the whole catalogue; nobody edits a second list of areas. A folder with a screen
// (src/apps/<name>/app.json) is an area with a page and a card on Home. A server folder with no screen
// (worker/apps/<name>/api.ts) is an area too, for skills and assistants, and its api.ts names it.
// wiki/stack/mini-apps.md
import type { RouteAccess } from "./policy.ts";

type Named = { title?: unknown; description?: unknown };
/** One named group of work a person can be given. `screen`: it has a page to open. */
type Area = { id: string; title: string; description: string; screen: boolean };

const text = (value: unknown) => typeof value === "string" && value.trim() !== "";

/**
 * Every area, sorted by id: each screen folder, then each server folder that has no screen. Throws, naming
 * the file, when an area has no title or no description, so the `test` check fails before Access lists a
 * folder nobody can name.
 */
export function listAreas(screens: ReadonlyMap<string, Named>, servers: ReadonlyMap<string, Named>): Area[] {
  return [...new Set([...screens.keys(), ...servers.keys()])].sort().map(id => {
    const screen = screens.has(id);
    const { title, description } = screen ? screens.get(id)! : servers.get(id)!;
    if (!text(title) || !text(description)) {
      throw new Error(screen ? `app/src/apps/${id}/app.json needs a title and a description.`
        : `app/worker/apps/${id}/api.ts: a folder with no screen names itself. Export a title and a description.`);
    }
    return { id, title: title as string, description: description as string, screen };
  });
}

// "../../src/apps/hello/app.json" → "hello"
const manifests = new Map(Object.entries(import.meta.glob<Named>("../../src/apps/*/app.json", { eager: true, import: "default" }))
  .map(([path, manifest]) => [path.split("/")[4], manifest]));
let built = listAreas(manifests, new Map());

/** `../apps/index.ts` hands over every server folder once it has loaded them. Permission checks load this
 *  file before any route, so it can load no api.ts itself. */
export function serverFolders(servers: ReadonlyMap<string, Named>): void { built = listAreas(manifests, servers); }

export const areas = (): readonly Area[] => built;
/** Every area's id. A grant for any other name counts for nothing. */
export const catalogue = (): string[] => built.map(area => area.id);
/** The areas with a screen: a page to open, and a card on Home. */
export const screens = (): string[] => built.filter(area => area.screen).map(area => area.id);
/** A built area's title, for a refusal that names it. */
export const areaTitle = (id: string): string => built.find(area => area.id === id)!.title;

/**
 * A main route may be mapped only to built areas. Throws, naming the route and the name, where one is not:
 * such a route would deny everyone but the owner, with no error until a person calls it.
 */
export function routeAreas(routes: readonly { route: string; access?: RouteAccess }[]): void {
  for (const { route, access } of routes) {
    const unknown = (access && "apps" in access ? access.apps : []).find(app => !catalogue().includes(app));
    if (unknown !== undefined) throw new Error(`${route} is mapped to "${unknown}", which is not a built area. Map it to a folder under app/src/apps/ or app/worker/apps/.`);
  }
}
