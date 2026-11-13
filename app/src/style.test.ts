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

// The text and surface pairs of the brand list (wiki/design-guide.md) that must stay readable, light and dark.
const PAIRS = [["--primary-foreground", "--primary"], ["--foreground", "--background"], ["--muted-foreground", "--background"]];
const MIN_CONTRAST = 4.5;
// The forms the check reads, as a failure says them. An alpha of exactly 1 on oklch() is solid, so it reads too.
const READS = "write it solid, as oklch(L C h), #rgb or #rrggbb";

/** The custom properties one plain block of the stylesheet sets. */
const blockValues = (css: string, block: string) => {
  const body = new RegExp(`\\n${block.replace(".", "\\.")} \\{([^}]*)\\}`).exec(css)?.[1] ?? "";
  return [...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map(([, name, value]): [string, string] => [name, value.trim()]);
};

/** Linear sRGB from `#rgb`, `#rrggbb` or a solid `oklch(L C h)`; null for a see-through colour or another form. */
function linearRgb(value: string): number[] | null {
  const digits = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(value)?.[1];
  // `#rgb` is `#rrggbb` with each digit written once.
  const hex = digits?.length === 3 ? [...digits].map((digit) => digit + digit).join("") : digits;
  if (hex) return [0, 2, 4].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  // One CSS number, never a mistyped one such as `0..95`. `none` reads as 0, and 100% of chroma is 0.4.
  const n = String.raw`[+-]?(?:\d+(?:\.\d+)?|\.\d+)`;
  const channels = String.raw`(?:(${n})(%?)|none)\s+(?:(${n})(%?)|none)\s+(?:(${n})(deg|grad|rad|turn)?|none)`;
  const oklch = new RegExp(String.raw`^oklch\(\s*${channels}\s*(?:\/\s*(?:1(?:\.0+)?|100%)\s*)?\)$`, "i").exec(value);
  if (!oklch) return null;
  const turn: Record<string, number> = { deg: 360, grad: 400, rad: 2 * Math.PI, turn: 1 };
  const l = Number(oklch[1] ?? 0) / (oklch[2] ? 100 : 1);
  const c = Number(oklch[3] ?? 0) * (oklch[4] ? 0.004 : 1);
  const h = (Number(oklch[5] ?? 0) / turn[(oklch[6] ?? "deg").toLowerCase()]) * 2 * Math.PI;
  const [a, b] = [c * Math.cos(h), c * Math.sin(h)];
  const cones = [l + 0.3963377774 * a + 0.2158037573 * b, l - 0.1055613458 * a - 0.0638541728 * b, l - 0.0894841775 * a - 1.291485548 * b];
  const [long, medium, short] = cones.map((cone) => cone ** 3);
  return [
    4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
    -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
    -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
  ].map((channel) => Math.min(1, Math.max(0, channel)));
}

/** A colour's WCAG luminance, or the line that names a value the check can't read. */
function luminance(set: Map<string, string>, block: string, name: string): number | string {
  const value = set.get(name) ?? "missing";
  const rgb = linearRgb(value);
  return rgb ? 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2] : `${block} ${name}: ${value}: ${READS}`;
}

/** Each pair under 4.5 to 1, by its names and contrast, and each colour the check can't read, by its name. */
function unreadable(css: string): string[] {
  const light = blockValues(css, ":root");
  // `.dark` sits on the root element, so a value the dark set leaves out keeps the light one.
  const sets: [string, Map<string, string>][] = [[":root", new Map(light)], [".dark", new Map([...light, ...blockValues(css, ".dark")])]];
  const found = sets.flatMap(([block, set]) => PAIRS.flatMap(([text, surface]) => {
    const [over, under] = [luminance(set, block, text), luminance(set, block, surface)];
    if (typeof over === "string" || typeof under === "string") return [over, under].filter((line) => typeof line === "string");
    const contrast = (Math.max(over, under) + 0.05) / (Math.min(over, under) + 0.05);
    return contrast < MIN_CONTRAST ? [`${block} ${text} on ${surface}: ${contrast.toFixed(2)} to 1, under ${MIN_CONTRAST}`] : [];
  }));
  // A surface two pairs share is named once.
  return [...new Set(found)];
}

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("has one stylesheet: no page or mini app brings a CSS file of its own", () => {
  // Each extra file is named. Move its rules onto the screen as classes and parts, then delete it.
  expect([...stylesheets("src"), ...stylesheets("public")]).toEqual(["src/index.css"]);
  expect(readFileSync(join(app, "src/main.tsx"), "utf8")).toContain("import './index.css'");
  expect(readFileSync(join(app, "index.html"), "utf8")).not.toMatch(/rel="stylesheet"/);
});

it("starts light on every device, with a dark set the switch alone turns on", () => {
  const css = readFileSync(join(app, "src/index.css"), "utf8");
  expect(css).toMatch(/color-scheme:\s*light;/);
  expect(css).toMatch(/\.dark \{\s*color-scheme:\s*dark;/);
  expect(css).toMatch(/\n:root \{[^}]*--background:[^}]*--foreground:[^}]*--primary:/);
  // The dark set sits right after the light one, one plain block the review and private pages read too.
  expect(css).toMatch(/\n:root \{[^}]*--ring:[^}]*\}\n\.dark \{[^}]*--background:[^}]*--foreground:[^}]*--primary:/);
  expect(css).not.toMatch(/prefers-color-scheme/);
  // Unless tied to a class, Tailwind's `dark:` follows the device, and the parts' `dark:` classes would fire.
  expect(css).toContain("@custom-variant dark (&:where(.dark, .dark *));");
  // Only the switch sets the class; the page never starts dark by markup.
  const screens = readdirSync(join(app, "src"), { recursive: true, encoding: "utf8" }).filter((file) => /\.tsx?$/.test(file) && !/\.test\./.test(file));
  const setsDark = /classList\.(?:add|toggle)\(\s*["']dark["']|className\s*=\s*["']dark\b/;
  expect(screens.filter((file) => setsDark.test(readFileSync(join(app, "src", file), "utf8")))).toEqual(["components/ThemeToggle.tsx"]);
  const html = readFileSync(join(app, "index.html"), "utf8");
  expect(html).not.toMatch(/class="[^"]*\bdark\b/);
  // Before the first paint, index.html applies only a saved "dark".
  expect(html).toMatch(/<head>[\s\S]*localStorage\.getItem\('wongstack-theme'\) === 'dark'[\s\S]*<\/head>/);
  // The font is one brand value in the light set; Tailwind's name for it reads that value.
  expect(css).toMatch(/\n:root \{[^}]*--font:\s*[^;\s][^;]*;/);
  expect(css).toMatch(/@theme inline \{[^}]*--font-sans:\s*var\(--font\);/);
});

it("keeps the brand list in one place: the accent, the font, the corner size and three shadows", () => {
  const css = readFileSync(join(app, "src/index.css"), "utf8");
  const brand = ["--primary", "--primary-foreground", "--ring", "--font", "--radius", "--shadow-low", "--shadow-card", "--shadow-raised"];
  // A value set outside the light set never reaches the review page or a private page: each reads the two sets alone.
  expect(blockValues(css, ":root").map(([name]) => name)).toEqual(expect.arrayContaining(brand));
  // Every ready-made part's shadow class reads the list, so a rebrand edits no part.
  for (const [name, value] of [["xs", "low"], ["sm", "card"], ["md", "raised"], ["lg", "raised"]]) {
    expect(css).toMatch(new RegExp(`@theme inline \\{[^}]*--shadow-${name}:\\s*var\\(--shadow-${value}\\);`));
  }
});

it("keeps text readable on the brand's colours, light and dark: 4.5 to 1 at least", () => {
  const css = readFileSync(join(app, "src/index.css"), "utf8");
  // Each line names a pair and its contrast: darken the surface, or change the text on it, until it reaches 4.5 to 1.
  expect(unreadable(css)).toEqual([]);
  const withLight = (name: string, value: string) => css.replace(new RegExp(`(\\n:root \\{[^}]*${name}:)[^;]+;`), `$1 ${value};`);
  // A pale accent under white text fails by pair and contrast; a form the check can't read fails by name, never passes.
  const pale = [expect.stringMatching(/^:root --primary-foreground on --primary: 1\.\d\d to 1, under 4\.5$/)];
  expect(unreadable(withLight("--primary", "oklch(0.95 0.12 100)"))).toEqual(pale);
  expect(unreadable(withLight("--primary", "hsl(262 83% 58%)"))).toEqual([`:root --primary: hsl(262 83% 58%): ${READS}`]);
  expect(unreadable(withLight("--background", "#ffffff"))).toEqual([]);
  // Short hex and an alpha of exactly 1 read as their own colour: white passes as a page, and fails under white text.
  expect(unreadable(withLight("--background", "#fff"))).toEqual([]);
  expect(unreadable(withLight("--primary", "#fff"))).toEqual(pale);
  for (const solid of ["/ 1", "/1.0", "/ 100%"]) {
    expect(unreadable(withLight("--primary", `oklch(0.54 0.22 292 ${solid})`))).toEqual([]);
    expect(unreadable(withLight("--primary", `oklch(0.95 0.12 100 ${solid})`))).toEqual(pale);
  }
  // The same violet in the other solid forms a tool writes: a signed hue, a turn, a chroma in percent, capitals.
  for (const same of ["oklch(0.54 0.22 -68)", "oklch(54% 55% 292deg)", "oklch(0.54 0.22 0.8111turn)", "OKLCH(.54 .22 292)"]) {
    expect(unreadable(withLight("--primary", same))).toEqual([]);
  }
  expect(unreadable(withLight("--background", "oklch(100% 0 none)"))).toEqual([]);
  // A mistyped number is no colour in the browser: it fails by name, never passes.
  for (const typo of ["oklch(0..95 0.12 100)", "oklch(0.95 0.1.2 100)", "oklch(. 0 0)", "oklch(0.54 0.22 292.)"]) {
    expect(unreadable(withLight("--primary", typo))).toEqual([`:root --primary: ${typo}: ${READS}`]);
  }
  // A see-through colour has no one contrast: it fails by name, once, with the forms that work.
  for (const clear of ["oklch(1 0 0 / 0.5)", "oklch(1 0 0 / 99%)", "#ffffff80", "#fff8"]) {
    expect(unreadable(withLight("--background", clear))).toEqual([`:root --background: ${clear}: ${READS}`]);
  }
  // A dark set that leaves the accent out keeps the light one, and is checked with it.
  expect(unreadable(css.replace(/(\n\.dark \{[^}]*)--primary:[^;]+;/, "$1"))).toEqual([expect.stringMatching(/^\.dark --primary-foreground on --primary: /)]);
});

it("holds every screen to the look: the four design rules are on, as errors", () => {
  const lint = readFileSync(join(app, ".oxlintrc.json"), "utf8");
  // Each rule's failure says what to use instead.
  // Screens that can't meet a rule yet turn it off in an `overrides` entry for those files, with a reason.
  for (const rule of ["no-raw-colors", "no-inline-styles", "no-unknown-classes", "require-static-classes"]) {
    expect(lint).toContain(`"shadcn/${rule}": "error"`);
  }
});

it("opens full screen from a phone's home screen, under its generic title", () => {
  const html = readFileSync(join(app, "index.html"), "utf8");
  expect(html).toMatch(/<meta name="viewport" content="[^"]*\bviewport-fit=cover\b[^"]*"/);
  expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
  expect(html).toContain("<title>Your apps</title>");
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
  // The bar stays at the top at one height on every page, see-through with a blur, and never hides or slides.
  expect(bar.className.split(" ")).toEqual(expect.arrayContaining(["sticky", "top-0", "z-40", "h-14", "bg-background/80", "backdrop-blur"]));
  expect(bar.className).not.toMatch(/data-\[bars|hidden|fixed/);
  const inside = bar.firstElementChild!;
  expect(inside.className.split(" ")).toEqual(expect.arrayContaining([...frame, "flex", "justify-between"]));
  expect(inside.contains(screen.getByRole("link", { name: "Sign out" }))).toBe(true);
  // The light and dark switch sits at the bar's right, beside Sign out.
  const toggle = screen.getByRole("button", { name: "Switch to dark" });
  expect(toggle.parentElement).toBe(screen.getByRole("link", { name: "Sign out" }).parentElement);
  expect(inside.lastElementChild!.contains(toggle)).toBe(true);
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
