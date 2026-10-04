// The built app folders are the whole catalogue; nobody edits a second list of apps.
export const catalogue = Object.keys(import.meta.glob("../../src/apps/*/app.json", { eager: true }))
  .map(path => path.split("/")[4]).sort();
