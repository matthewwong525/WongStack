import { expect, it } from "vitest";
import { apps, appPage, listApps } from ".";

const card = { title: "Runs", description: "Log a run." };

it("lists every app folder in this build, each with a page, a title, a description, and its address", () => {
  const folders = Object.keys(import.meta.glob("./*/app.json")).map((path) => path.split("/")[1]);

  expect(apps.map((app) => app.name)).toEqual(folders.sort());
  for (const app of apps) {
    expect(app.name, app.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(app.title.trim(), app.name).not.toBe("");
    expect(app.description.trim(), app.name).not.toBe("");
    expect(app.href).toBe(`/apps/${app.name}/`);
    expect(appPage(app.name), app.name).not.toBeNull();
  }
});

it("finds no page for a folder that does not exist", () => {
  expect(appPage("nothing")).toBeNull();
});

it("sorts the list by name and keeps each card's words", () => {
  const list = listApps(
    { "./runs/app.json": card, "./a-b2/app.json": { title: "AB", description: "Two." } },
    ["./runs/App.tsx", "./a-b2/App.tsx"],
  );

  expect(list).toEqual([
    { name: "a-b2", title: "AB", description: "Two.", href: "/apps/a-b2/" },
    { name: "runs", title: "Runs", description: "Log a run.", href: "/apps/runs/" },
  ]);
});

it("fails on a folder name that is not an address, naming the folder", () => {
  for (const name of ["Runs", "my_runs", "runs-", "-runs", "my runs"]) {
    expect(() => listApps({ [`./${name}/app.json`]: card }, [`./${name}/App.tsx`]), name).toThrow(
      `app/src/apps/${name}: name the folder with lowercase letters, digits, and hyphens.`,
    );
  }
});

it("fails on a missing title, naming the folder", () => {
  for (const manifest of [{ description: "Log a run." }, { title: " ", description: "Log a run." }, { title: 3, description: "Log a run." }]) {
    expect(() => listApps({ "./runs/app.json": manifest }, ["./runs/App.tsx"])).toThrow(
      "app/src/apps/runs: app.json needs a title.",
    );
  }
});

it("fails on a missing description, naming the folder", () => {
  expect(() => listApps({ "./runs/app.json": { title: "Runs" } }, ["./runs/App.tsx"])).toThrow(
    "app/src/apps/runs: app.json needs a description.",
  );
});

it("fails on a page with no app.json, or an app.json with no page, naming the folder", () => {
  expect(() => listApps({}, ["./runs/App.tsx"])).toThrow("app/src/apps/runs: add app.json with a title and a description.");
  expect(() => listApps({ "./runs/app.json": card }, [])).toThrow("app/src/apps/runs: add App.tsx, exporting the page as `App`.");
});
