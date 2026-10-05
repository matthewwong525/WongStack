// @vitest-environment jsdom
/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, expect, it, vi } from "vitest";
import { Layout } from "./Layout";

// The shared look is one stylesheet, src/index.css, which main.tsx imports for every page and mini app.
// A screen is styled by classes on its own elements and built from the ready-made parts: it brings no CSS file.
const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const stylesheets = (folder: string) =>
  readdirSync(join(app, folder), { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".css"))
    .map((file) => relative(app, join(app, folder, file)).replaceAll("\\", "/"));

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("has one stylesheet: no page or mini app brings a CSS file of its own", () => {
  // Each extra file is named. Move its rules onto the screen as classes and parts, then delete it.
  expect([...stylesheets("src"), ...stylesheets("public")]).toEqual(["src/index.css"]);
  expect(readFileSync(join(app, "src/main.tsx"), "utf8")).toContain("import './index.css'");
  expect(readFileSync(join(app, "index.html"), "utf8")).not.toMatch(/rel="stylesheet"/);
});

it("follows the device's light or dark mode, with a set of colours for each", () => {
  const css = readFileSync(join(app, "src/index.css"), "utf8");
  expect(css).toMatch(/color-scheme:\s*light dark/);
  expect(css).toMatch(/\n:root \{[^}]*--background:[^}]*--foreground:[^}]*--primary:/);
  expect(css).toMatch(/@media \(prefers-color-scheme: dark\) \{\s*:root \{[^}]*--background:[^}]*--foreground:[^}]*--primary:/);
  // The dark set follows the device alone: no class switches it.
  expect(css).not.toMatch(/\.dark\b|@custom-variant dark/);
  expect(css).toMatch(/--font-sans:\s*system-ui, sans-serif/);
});

it("keeps each page in its narrow column under a bar that spans the screen", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ state: "legacy", signIn: true })));
  render(createElement(MemoryRouter, null, createElement(Routes, null,
    createElement(Route, { element: createElement(Layout) }, createElement(Route, { index: true, element: createElement("h1", null, "A page") })))));
  await screen.findByRole("link", { name: "Sign out" });
  // The column is the page's, not the whole document's: the bar sits outside it, edge to edge.
  const column = screen.getByRole("heading", { name: "A page" }).closest("main")!;
  expect(column.className.split(" ")).toEqual(expect.arrayContaining(["mx-auto", "max-w-lg", "px-4"]));
  const bar = screen.getByRole("link", { name: "WongStack" }).closest("header")!;
  expect(bar.parentElement).toBe(column.parentElement);
  expect(bar.className).not.toMatch(/max-w-|mx-auto/);
  expect(bar.className.split(" ")).toEqual(expect.arrayContaining(["flex", "justify-between"]));
});
