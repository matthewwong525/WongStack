import type { areas } from "../../worker/employee-access/catalogue.ts";

type Area = ReturnType<typeof areas>[number];

/**
 * A stand-in for `worker/employee-access/catalogue.ts`, for tests that name areas this repo does not build.
 * Each id is an area titled by its name, with a screen unless `bare` lists it.
 */
export function builtAreas(ids: string[], bare: string[] = []) {
  const built: Area[] = ids.map(id => ({ id, title: id[0].toUpperCase() + id.slice(1), description: `The ${id} area.`, screen: !bare.includes(id) }));
  return {
    areas: () => built, catalogue: () => ids, screens: () => ids.filter(id => !bare.includes(id)),
    areaTitle: (id: string) => built.find(area => area.id === id)!.title, serverFolders: () => {},
  };
}
