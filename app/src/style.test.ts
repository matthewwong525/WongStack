/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The shared look lives in public/, so it is served at /style.css under a
// fixed name that index.html links, for every page and mini app.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("links the shared stylesheet from the app's page", () => {
  expect(read("index.html")).toContain('<link rel="stylesheet" href="/style.css" />');
});

it("serves the shared stylesheet, which follows the device's light or dark mode", () => {
  expect(read("public/style.css")).toMatch(/color-scheme:\s*light dark/);
});

it("keeps each page in its narrow column under a bar that spans the screen", () => {
  const css = read("public/style.css");
  // The column is the page's, not the whole document's: the bar sits outside it, edge to edge.
  expect(css).toMatch(/\nmain \{[^}]*max-width: 32rem;[^}]*margin: 2rem auto;[^}]*padding: 0 1rem;/);
  expect(css).toMatch(/\nbody \{\s*margin: 0;\s*\}/);
  expect(css.match(/\.site-header \{[^}]*\}/)![0]).not.toMatch(/max-width/);
  expect(css).toMatch(/\.site-header \{[^}]*justify-content: space-between/);
});
