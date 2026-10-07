/// <reference types="node" />
// Rules every page keeps: no word about paid hosting and no cost but the ones install.ts lists,
// every file loaded from the site itself, nothing stored in the browser, and nothing that asks a
// visitor to sign in.
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";
import { COST_LINES, INSTALL_PROMPT } from "./install";

const site = (path: string) => resolve(import.meta.dirname, "..", path);
const html = readFileSync(site("index.html"), "utf8");
const css = readFileSync(site("src/index.css"), "utf8");

/** Every page the site has. Any other address shows the first. */
const PAGES = ["/", "/privacy"];

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  fetchMock.mockClear();
});

/** The first place `pattern` matches in `text`, or null: a failure then names the word, not the whole page. */
const found = (text: string, pattern: RegExp) => text.match(pattern)?.[0] ?? null;

/** What a visitor reads or hears in `root`: its text, then every label a screen reader speaks. */
function words(root: Element) {
  const names = ["alt", "aria-label", "title", "placeholder"];
  const labels = [...root.querySelectorAll(names.map((name) => `[${name}]`).join(", "))].flatMap((el) =>
    names.map((name) => el.getAttribute(name) ?? ""),
  );
  return [root.textContent ?? "", ...labels].join("\n");
}

/** Renders `path` and returns a copy of the page as it opens, then after each press that shows more of it: every phone screen and every sample app. */
function visit(path: string) {
  window.history.pushState({}, "", path);
  const { container } = render(<App />);
  const states = [container.cloneNode(true) as HTMLElement];
  for (const chips of [".split .chips button", ".apps > .chips button"]) {
    const count = container.querySelectorAll(chips).length;
    for (let i = 0; i < count; i++) {
      fireEvent.click(container.querySelectorAll(chips)[i] as HTMLElement);
      states.push(container.cloneNode(true) as HTMLElement);
    }
  }
  cleanup();
  return states;
}

// What the earlier hosted app offered: a paid plan, a trial, a subscription, its own sign-in,
// a rented server, and the company that rented it.
const HOSTING =
  /\b(paid|trial|subscri\w*|cancel\w*|refund\w*|billing|billed|checkout|log in|sign up|servers?|rent\w*|hetzner|vps)\b|let us host|host it for you|we host|wongstack account|create an account/i;

// A price. The sample apps keep theirs: each is a made-up figure in a pretend screen.
const MONEY = /\$\s?\d|\bpric(e|es|ed|ing)\b|\bper month\b|\/\s?month|\bmonthly\b/i;

// Pages the earlier hosted app linked. Nothing links them now.
const OLD_LINK = /^\/(pricing|login|pay|terms|launch|join|dashboard)\b|#pricing/;

// The company whose charge the page may name: an account the install uses.
const CHARGES = "Cloudflare";

/**
 * `text` without the cost lines install.ts lists. Each is removed as a whole sentence, so a
 * reworded copy, or any other word about a price, is still read.
 */
const withoutCostLines = (text: string) => COST_LINES.reduce((rest, line) => rest.split(line).join(""), text);

it("reads every page for hosting words and finds none, allowing the sample apps their made-up prices and install.ts its cost lines", () => {
  // The two patterns catch the lines the earlier page carried, so a clean read means something.
  for (const line of [
    "Or let us host it →",
    "7-day free trial. Cancel anytime.",
    "Log in",
    "If you'd rather not run it yourself, our paid plans run it on a server for you.",
    "When your subscription ends, we delete the server 7 days later.",
    "Your own Hetzner",
  ]) {
    expect(line).toMatch(HOSTING);
  }
  for (const line of ["$8.08 /month", "Pricing", "Your plan's monthly price covers it."]) expect(line).toMatch(MONEY);
  // The allowance is whole sentences only: a price of our own, or a cost line reworded as ours, is still caught.
  const priced = COST_LINES.filter((line) => HOSTING.test(line) || MONEY.test(line));
  expect(priced.length).toBeGreaterThan(0);
  for (const line of [
    "Our paid plan is $9 a month",
    `${COST_LINES[0]} Our paid plan is $9 a month.`,
    ...priced.map((line) => line.replaceAll(`${CHARGES}'s`, "our")),
  ]) {
    expect([line, found(withoutCostLines(line), HOSTING) ?? found(withoutCostLines(line), MONEY)]).not.toEqual([line, null]);
  }
  // A cost line never names WongStack, and one with a price or a paid plan says whose it is: another company's.
  for (const line of COST_LINES) expect([line, /wongstack/i.test(line)]).toEqual([line, false]);
  for (const line of priced) expect([line, line.includes(CHARGES)]).toEqual([line, true]);

  expect([found(html, HOSTING), found(html, MONEY)]).toEqual([null, null]);
  let samplePrices = 0;
  const landing: string[] = [];
  for (const path of PAGES) {
    for (const state of visit(path)) {
      for (const link of state.querySelectorAll("a[href]")) {
        expect([path, found(link.getAttribute("href") as string, OLD_LINK)]).toEqual([path, null]);
      }
      for (const sample of state.querySelectorAll(".browser")) {
        expect([path, found(words(sample), HOSTING)]).toEqual([path, null]);
        if (MONEY.test(words(sample))) samplePrices++;
        sample.remove();
      }
      if (path === "/") landing.push(words(state));
      const read = withoutCostLines(words(state));
      expect([path, found(read, HOSTING), found(read, MONEY)]).toEqual([path, null, null]);
    }
  }
  // The read reached the sample apps: one of them shows prices.
  expect(samplePrices).toBeGreaterThan(0);
  // The allowance is used, not dead: the landing page prints every cost line, however it is opened.
  expect(landing.length).toBeGreaterThan(0);
  for (const text of landing) {
    for (const line of COST_LINES) expect([line, text.includes(line)]).toEqual([line, true]);
  }
});

it("shows a visitor on a phone the headline, the install steps, and the message with a way to copy it, and nothing that asks them to sign in", () => {
  // A phone lays the page out at its own width. Whether any part then scrolls
  // sideways needs a real browser: the preview is checked at phone width.
  expect(html).toContain('<meta name="viewport" content="width=device-width, initial-scale=1.0" />');
  window.history.pushState({}, "", "/");
  const { container } = render(<App />);
  const install = container.querySelector("#install") as HTMLElement;

  screen.getByRole("heading", { level: 1, name: "Claude Code or Codex, for people who don't code." });
  // The first step says any assistant before it names one.
  expect(install.querySelector("ol.install > li")?.textContent).toMatch(
    /^Open any assistant that can work on your computer, such as /,
  );
  expect(install.querySelectorAll("ol.install > li")).toHaveLength(3);
  expect(install.querySelector("pre")?.textContent).toBe(INSTALL_PROMPT);
  within(install).getByRole("button", { name: "Copy message" });
  for (const path of PAGES) {
    for (const state of visit(path)) {
      expect(state.querySelectorAll('form, input[type="password"], input[type="email"]')).toHaveLength(0);
      for (const control of state.querySelectorAll("a, button")) {
        expect([path, found(control.textContent ?? "", /log ?in|sign ?in|sign ?up|register/i)]).toEqual([path, null]);
      }
    }
  }
});

// Another company's product the page once measured WongStack against, and the words of a comparison.
const RIVALS = /\b(grok bot|muse|openclaw|lovable)\b|\bcompar\w*|\bversus\b|\bvs\.?(?=\s)|\bnot affiliated\b/i;

it("reads every page for a comparison with another company's product and finds none", () => {
  // The pattern catches the lines the removed table carried, so a clean read means something.
  for (const line of [
    "How WongStack compares",
    "Grok Bot",
    "Muse",
    "OpenClaw",
    "Lovable",
    "WongStack vs Muse",
    "Grok Bot, Muse, OpenClaw, and Lovable belong to their makers. WongStack is not affiliated with them.",
  ]) {
    expect([line, RIVALS.test(line)]).toEqual([line, true]);
  }
  // The assistants the page does name are not rivals: WongStack sets them up.
  for (const line of ["Claude Code or Codex, for people who don't code.", "Works with the AI you already use"]) {
    expect([line, found(line, RIVALS)]).toEqual([line, null]);
  }

  expect(found(html, RIVALS)).toBeNull();
  let read = 0;
  for (const path of PAGES) {
    for (const state of visit(path)) {
      expect([path, found(words(state), RIVALS)]).toEqual([path, null]);
      expect([path, state.querySelectorAll("table.compare, .legend").length]).toEqual([path, 0]);
      read++;
    }
  }
  expect(read).toBeGreaterThan(PAGES.length);
});

/** Each kind of element that loads a file, and the attribute that names it. */
const LOADERS = [
  ["img[src]", "src"],
  ["script[src]", "src"],
  ["link[href]", "href"],
  ["source[src]", "src"],
  ["iframe[src]", "src"],
  ["video[src]", "src"],
  ["audio[src]", "src"],
  ["embed[src]", "src"],
  ["object[data]", "data"],
];

/** Every address `root` loads. */
const loads = (root: ParentNode) =>
  LOADERS.flatMap(([selector, attribute]) =>
    [...root.querySelectorAll(selector as string)].map((el) => el.getAttribute(attribute as string) as string),
  );

/** An address on the site itself: a path from its root, or wongstack.com. */
const own = (address: string) => /^\/(?!\/)/.test(address) || /^https:\/\/wongstack\.com(\/|$)/.test(address);

/** A path from the site's root names a file in public/, or the page's own script. */
const exists = (address: string) => existsSync(site(`public${address}`)) || existsSync(site(address.slice(1)));

/** Checks every address `root` loads, and returns how many there were. */
function expectOwnFiles(where: string, root: ParentNode) {
  const addresses = loads(root);
  for (const address of addresses) {
    expect([where, address, own(address)]).toEqual([where, address, true]);
    if (address.startsWith("/")) expect([where, address, exists(address)]).toEqual([where, address, true]);
  }
  expect(root.querySelectorAll('[srcset], [style*="url("]')).toHaveLength(0);
  return addresses.length;
}

// A picture that pulls a file from another address, or runs a script.
const OUTSIDE = /<script|(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\/|url\(\s*["']?\s*(?:https?:)?\/\//i;

it("loads every file from the site itself: the pages, the styles, and the pictures", () => {
  const page = new DOMParser().parseFromString(html, "text/html");
  expect(expectOwnFiles("index.html", page)).toBeGreaterThan(0);
  // No script written into the page: the one script is the site's own file.
  expect(page.querySelectorAll("script:not([src])")).toHaveLength(0);

  for (const path of PAGES) {
    for (const state of visit(path)) expectOwnFiles(path, state);
  }
  window.history.pushState({}, "", "/");
  expect(expectOwnFiles("/", render(<App />).container)).toBeGreaterThan(10);

  // The styles load no file: no font, no picture, and nothing from outside.
  expect(css.length).toBeGreaterThan(1000);
  expect(found(css, /url\(|@font-face|@import|https?:/)).toBeNull();

  // Each drawing loads nothing from outside; one it does load sits beside it in this folder.
  const drawings = ["public", "brand"].flatMap((folder) =>
    readdirSync(site(folder), { recursive: true, encoding: "utf8" })
      .filter((name) => name.endsWith(".svg"))
      .map((name) => site(join(folder, name))),
  );
  expect(drawings.length).toBeGreaterThan(5);
  for (const drawing of drawings) {
    const text = readFileSync(drawing, "utf8");
    expect([drawing, found(text, OUTSIDE)]).toEqual([drawing, null]);
    for (const [, target] of text.matchAll(/\shref="([^"#][^"]*)"/g)) {
      expect([drawing, target, existsSync(resolve(dirname(drawing), target as string))]).toEqual([drawing, target, true]);
    }
  }
});

// Anything that keeps data in the browser or sends it somewhere.
const KEEPS_OR_SENDS = /document\.cookie|localStorage|sessionStorage|indexedDB|\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource/;

it("sets no cookie, stores nothing in the browser, and sends nothing anywhere", () => {
  for (const path of PAGES) visit(path);
  expect(document.cookie).toBe("");
  expect(localStorage).toHaveLength(0);
  expect(sessionStorage).toHaveLength(0);
  expect(fetchMock).not.toHaveBeenCalled();

  // The pages' own code has no way to: the privacy page's promises rest on this.
  const sources = readdirSync(site("src")).filter((name) => /\.tsx?$/.test(name) && !name.includes(".test."));
  expect(sources.length).toBeGreaterThan(10);
  for (const name of sources) {
    expect([name, found(readFileSync(site(join("src", name)), "utf8"), KEEPS_OR_SENDS)]).toEqual([name, null]);
  }
});
