// The built screen folders are the whole catalogue; nobody edits a second list of apps. An app is a folder with
// a screen (src/apps/<name>/app.json): a page and a card on Home, and the one thing a person is given. A server
// folder with no screen is no app: its routes belong to the saved keys they list. wiki/stack/mini-apps.md
import type { RouteAccess } from "./policy.ts";

type Named = { title?: unknown; description?: unknown };
/** One app a person can be given, whole. */
type App = { id: string; title: string; description: string };

const text = (value: unknown) => typeof value === "string" && value.trim() !== "";

/**
 * Every app, sorted by id. Throws, naming the file, when one has no title or no description, so the `test`
 * check fails before Access lists a folder nobody can name.
 */
export function listApps(manifests: ReadonlyMap<string, Named>): App[] {
  return [...manifests.keys()].sort().map(id => {
    const { title, description } = manifests.get(id)!;
    if (!text(title) || !text(description)) throw new Error(`app/src/apps/${id}/app.json needs a title and a description.`);
    return { id, title: title as string, description: description as string };
  });
}

// "../../src/apps/hello/app.json" → "hello"
const built = listApps(new Map(Object.entries(import.meta.glob<Named>("../../src/apps/*/app.json", { eager: true, import: "default" }))
  .map(([path, manifest]) => [path.split("/")[4], manifest])));

export const apps = (): readonly App[] => built;
/** Every app's id. A grant for any other name counts for nothing. */
export const catalogue = (): string[] => built.map(app => app.id);
/** Whether a server folder is an app: it has a screen. One with none belongs to the keys its routes list. */
export const hasScreen = (id: string): boolean => catalogue().includes(id);
/** A built app's title. */
export const appTitle = (id: string): string => built.find(app => app.id === id)!.title;

/**
 * A main route may be mapped only to built apps. Throws, naming the route and the name, where one is not:
 * such a route would deny everyone but the owner, with no error until a person calls it.
 */
export function routeApps(routes: readonly { route: string; access?: RouteAccess }[]): void {
  for (const { route, access } of routes) {
    const unknown = (access && "apps" in access ? access.apps : []).find(app => !catalogue().includes(app));
    if (unknown !== undefined) throw new Error(`${route} is mapped to "${unknown}", which is not a built app. Map it to a folder under app/src/apps/.`);
  }
}
