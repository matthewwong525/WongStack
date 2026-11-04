// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { routes } from "../../router";

const mermaid = vi.hoisted(() => ({ initialize: vi.fn(), run: vi.fn(async () => {}) }));
vi.mock("mermaid", () => ({ default: mermaid }));

const COMMIT = "c".repeat(40);
const LISTING = { commit: COMMIT, capped: false, pages: [
  { path: "README.md", title: "Company knowledge" }, { path: "how-we-work/refunds.md", title: "Refunds" },
  { path: "people/README.md", title: "People" }, { path: "people/sam-lee.md", title: "Sam Lee" }, { path: "welcome.md", title: "Welcome" }] };
const page = (path: string, title: string, html: string, more: object = {}) =>
  ({ commit: COMMIT, path, title, public: false, html, markdown: "", saved: "2026-11-04T09:00:00.000Z", ...more });
const PAGES: Record<string, object> = {
  "how-we-work/refunds": page("how-we-work/refunds.md", "Refunds", '<h1 id="refunds">Refunds</h1>\n<p>We refund within 30 days. ' +
    'Ask <a href="/apps/knowledge/people/sam-lee">Sam Lee</a>, see <a href="https://example.com/terms">the terms</a> ' +
    'or <a href="/apps/knowledge/api/file?path=how-we-work%2Fprices.csv">the prices</a>.</p>\n<pre class="mermaid">flowchart TD\n  ask --&gt; refund</pre>\n'),
  "people/sam-lee": page("people/sam-lee.md", "Sam Lee", '<h1 id="sam-lee">Sam Lee</h1>\n<p>Runs shipping.</p>\n'),
  welcome: page("welcome.md", "welcome", "<p>Welcome to Acme Clay.</p>\n", { public: true }),
};
const failure = (code: string, status: number) => Response.json({ error: { code, message: "x", requestId: "r" } }, { status });

let answer: (route: string) => Response | Promise<Response>;
const ordinary = (route: string) => {
  if (route === "pages") return Response.json(LISTING);
  if (route.startsWith("search?")) {
    const q = new URLSearchParams(route.slice(7)).get("q");
    return Response.json({ commit: COMMIT, capped: q === "capped", hits: q === "warehouse" || q === "capped"
      ? [{ path: "people/sam-lee.md", title: "Sam Lee", line: "Runs shipping and the warehouse." }] : [] });
  }
  const at = new URLSearchParams(route.slice(5)).get("path")!;
  return PAGES[at] ? Response.json(PAGES[at]) : failure("not_found", 404);
};
let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  answer = ordinary;
  fetchMock = vi.fn(async (path: string) => {
    if (path === "/api/access/apps") return Response.json({ state: "current", role: "owner", revision: 1, apps: ["access", "knowledge"] });
    if (path.startsWith("/apps/knowledge/api/")) return answer(path.slice("/apps/knowledge/api/".length));
    throw new Error(`Unexpected request: ${path}`);
  });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  mermaid.initialize.mockClear();
  mermaid.run.mockClear();
});

const open = async (address = "") => {
  const router = createMemoryRouter(routes, { initialEntries: [`/apps/knowledge/${address}`] });
  await act(async () => { render(<RouterProvider router={router} />); });
  return router;
};
const reads = () => fetchMock.mock.calls.map(([path]) => path).filter(path => path.startsWith("/apps/knowledge/api/"));

it("lists every page by folder, each linking to its page", async () => {
  await open();
  expect(await screen.findByRole("heading", { level: 1, name: "Knowledge" })).toBeTruthy();
  expect(screen.getByText("5 pages")).toBeTruthy();
  const people = screen.getByRole("heading", { name: "people" }).parentElement!;
  expect(within(people).getAllByRole("link").map(link => link.getAttribute("href"))).toEqual(["/apps/knowledge/people", "/apps/knowledge/people/sam-lee"]);
  expect(screen.getByRole("heading", { name: "Start here" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Company knowledge" }).getAttribute("href")).toBe("/apps/knowledge/README");
  expect(screen.queryByText(/first 2,000/)).toBeNull();
});

it("searches as you type, showing each page's title and matching line", async () => {
  await open();
  const box = await screen.findByRole("searchbox", { name: "Search knowledge" });
  fireEvent.change(box, { target: { value: "w" } });
  expect(screen.getByRole("link", { name: "Welcome" })).toBeTruthy();
  fireEvent.change(box, { target: { value: " warehouse " } });
  expect(screen.getByRole("status").textContent).toBe("Searching…");
  const results = await screen.findByLabelText("Search results");
  expect(within(results).getByText("Runs shipping and the warehouse.")).toBeTruthy();
  expect(within(results).getByRole("link").getAttribute("href")).toBe("/apps/knowledge/people/sam-lee");
  expect(reads()).toContain("/apps/knowledge/api/search?q=warehouse");
  fireEvent.change(box, { target: { value: "nothing" } });
  expect(await screen.findByText("No page has those words.")).toBeTruthy();
  fireEvent.change(box, { target: { value: "capped" } });
  expect(await screen.findByText("Only the first 2,000 pages are read.")).toBeTruthy();
});

it("searches with at most the 100 characters the server takes", async () => {
  await open();
  const box = await screen.findByRole("searchbox", { name: "Search knowledge" });
  expect(box.getAttribute("maxlength")).toBe("100");
  fireEvent.change(box, { target: { value: ` ${"a".repeat(99)} b${"c".repeat(20)}` } });
  expect(await screen.findByText("No page has those words.")).toBeTruthy();
  expect(reads()).toContain(`/apps/knowledge/api/search?q=${"a".repeat(99)}`);
  expect(reads().every(path => !path.startsWith("/apps/knowledge/api/search?") || path.length <= "/apps/knowledge/api/search?q=".length + 100)).toBe(true);
});

it("drops a search answer that comes back after the words changed", async () => {
  let late = (_answer: Response) => {};
  answer = route => route === "search?q=warehouse" ? new Promise(resolve => { late = resolve; }) : ordinary(route);
  await open();
  const box = await screen.findByRole("searchbox", { name: "Search knowledge" });
  fireEvent.change(box, { target: { value: "warehouse" } });
  await vi.waitFor(() => expect(reads()).toContain("/apps/knowledge/api/search?q=warehouse"));
  fireEvent.change(box, { target: { value: "nothing" } });
  expect(await screen.findByText("No page has those words.")).toBeTruthy();
  await act(async () => { late(ordinary("search?q=warehouse")); });
  expect(screen.queryByText("Runs shipping and the warehouse.")).toBeNull();
});

it("says when a search or the list fails, and tries again", async () => {
  let failing = true;
  answer = route => failing ? new Response("down", { status: 502 }) : ordinary(route);
  await open();
  expect((await screen.findByRole("alert")).textContent).toContain("The page list could not be loaded.");
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  const box = await screen.findByRole("searchbox", { name: "Search knowledge" });
  answer = route => route === "pages" ? ordinary(route) : Promise.reject(new TypeError("offline"));
  fireEvent.change(box, { target: { value: "warehouse" } });
  expect((await screen.findByRole("alert")).textContent).toContain("Search could not be loaded.");
});

it("shows a page with its saved time, draws its diagram, and opens a link to another page with no reload", async () => {
  const router = await open("how-we-work/refunds");
  expect(await screen.findByRole("heading", { level: 1, name: "Refunds" })).toBeTruthy();
  expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  expect(screen.getByText(/^Saved /)).toBeTruthy();
  expect(screen.queryByText("Public")).toBeNull();
  await vi.waitFor(() => expect(mermaid.run).toHaveBeenCalledTimes(1));
  expect(mermaid.initialize).toHaveBeenCalledWith({ startOnLoad: false, securityLevel: "strict" });
  expect(mermaid.run).toHaveBeenCalledWith({ nodes: [document.querySelector("pre.mermaid")], suppressErrors: true });

  // A web link, a file, and a click with a key held stay with the browser.
  for (const [name, init] of [["the terms", {}], ["the prices", {}], ["Sam Lee", { ctrlKey: true }]] as const) {
    expect(fireEvent.click(screen.getByRole("link", { name }), init), name).toBe(true);
  }
  fireEvent.click(screen.getByText("We refund within 30 days.", { exact: false }));
  expect(router.state.location.pathname).toBe("/apps/knowledge/how-we-work/refunds");
  expect(fireEvent.click(screen.getByRole("link", { name: "Sam Lee" }))).toBe(false);
  expect(await screen.findByRole("heading", { level: 1, name: "Sam Lee" })).toBeTruthy();
  expect(router.state.location.pathname).toBe("/apps/knowledge/people/sam-lee");
  // A page with no diagram loads no drawing code.
  expect(mermaid.run).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("link", { name: "All pages" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Knowledge" })).toBeTruthy();
});

it("tags a public page and gives its public address, and titles a page with no heading", async () => {
  await open("welcome/");
  expect(await screen.findByRole("heading", { level: 1, name: "welcome" })).toBeTruthy();
  expect(screen.getByText("Public")).toBeTruthy();
  expect(screen.getByRole("link", { name: "/public/welcome" }).getAttribute("href")).toBe("/public/welcome");
  expect(reads()).toEqual(["/apps/knowledge/api/page?path=welcome"]);
});

it("says a page is not there and offers the list", async () => {
  await open("how-we-work/old-refunds");
  expect(await screen.findByRole("heading", { level: 1, name: "This page is not there" })).toBeTruthy();
  expect(await screen.findByRole("heading", { level: 2, name: "Knowledge" })).toBeTruthy();
  expect(screen.getByRole("link", { name: "Refunds" })).toBeTruthy();
});

it("says a page could not be loaded, and tries again", async () => {
  let failing = true;
  answer = route => failing ? failure("internal_error", 500) : ordinary(route);
  await open("people/sam-lee");
  expect((await screen.findByRole("alert")).textContent).toContain("This page could not be loaded.");
  failing = false;
  fireEvent.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("heading", { level: 1, name: "Sam Lee" })).toBeTruthy();
});

it("says knowledge is not set up, on the list and on a page", async () => {
  answer = () => failure("not_set_up", 503);
  for (const address of ["", "welcome"]) {
    await open(address);
    expect(await screen.findByText("Knowledge is not set up yet.")).toBeTruthy();
    cleanup();
  }
});

it("says so when no page is saved yet, or when the list is cut at 2,000 pages", async () => {
  answer = () => Response.json({ commit: COMMIT, capped: true, pages: [] });
  await open();
  expect(await screen.findByText("No pages are saved yet.")).toBeTruthy();
  expect(screen.getByText("Only the first 2,000 pages are read.")).toBeTruthy();
});
