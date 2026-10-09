/**
 * A stand-in for `worker/employee-access/catalogue.ts`, for tests that name apps this repo does not build.
 * Each id is an app titled by its name. Every server folder this repo does build still counts as having a screen.
 */
export function builtApps(ids: string[]) {
  const built = ids.map(id => ({ id, title: id[0].toUpperCase() + id.slice(1), description: `The ${id} app.` }));
  return { apps: () => built, catalogue: () => ids, hasScreen: () => true, appTitle: (id: string) => built.find(app => app.id === id)!.title };
}
