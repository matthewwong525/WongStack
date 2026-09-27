/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The shared look lives in public/, so it is served at /style.css, where the
// mini apps link it too. A JS import would give it a hashed name they can't find.
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

it("links the shared stylesheet from the app's page", () => {
  expect(read("index.html")).toContain('<link rel="stylesheet" href="/style.css" />');
});

it("serves the shared stylesheet, which follows the device's light or dark mode", () => {
  expect(read("public/style.css")).toMatch(/color-scheme:\s*light dark/);
});
