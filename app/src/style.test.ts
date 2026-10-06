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

it("gives every page one frame: the bar's contents and the page share a width and a left edge", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => Response.json({ state: "legacy", signIn: true })));
  render(createElement(MemoryRouter, null, createElement(Routes, null,
    createElement(Route, { element: createElement(Layout) }, createElement(Route, { index: true, element: createElement("h1", null, "A page") })))));
  await screen.findByRole("link", { name: "Sign out" });
  const frame = ["mx-auto", "w-full", "max-w-[60rem]", "px-4"];
  // The page's frame, and no narrower column round it.
  const page = screen.getByRole("heading", { name: "A page" }).closest("main")!;
  expect(page.className.split(" ")).toEqual(expect.arrayContaining(frame));
  expect(page.className).not.toContain("max-w-lg");
  // The bar spans the screen; what it holds sits in the same frame, so the logo starts where a heading does.
  const bar = screen.getByRole("link", { name: "WongStack" }).closest("header")!;
  expect(bar.parentElement).toBe(page.parentElement);
  expect(bar.className).not.toMatch(/max-w-|mx-auto|px-/);
  // The bar stays in view at one height, so a panel beside the page can start right under it.
  expect(bar.className.split(" ")).toEqual(expect.arrayContaining(["sticky", "top-0", "h-15", "bg-background"]));
  const inside = bar.firstElementChild!;
  expect(inside.className.split(" ")).toEqual(expect.arrayContaining([...frame, "flex", "justify-between"]));
  expect(inside.contains(screen.getByRole("link", { name: "Sign out" }))).toBe(true);
});

it("holds every page to the whole frame: none sets a negative side margin, a width worked out from the screen's, or a narrower column", () => {
  const screens = readdirSync(join(app, "src"), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file) && !/\.test\.|(^|[\\/])components[\\/]ui[\\/]/.test(file));
  expect(screens.length).toBeGreaterThan(20);
  // Each file that breaks out is named. No page narrows itself either: every screen takes the whole frame.
  const breaks = /(^|[\s"'`:])-mx-|mx-\[calc|100vw/;
  expect(screens.filter((file) => breaks.test(readFileSync(join(app, "src", file), "utf8")))).toEqual([]);
  expect(screens.filter((file) => /max-w-lg/.test(readFileSync(join(app, "src", file), "utf8")))).toEqual([]);
});
