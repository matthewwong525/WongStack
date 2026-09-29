// @vitest-environment jsdom

import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Home } from "./Home";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const serve = (response: { ok: boolean; json?: () => Promise<unknown> }) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const apps = [
  { name: "hello", title: "Hello", description: "Say hello from the API", href: "/apps/hello/" },
  { name: "tips", title: "Tips", description: "Split a bill with a tip", href: "/apps/tips/" },
];

it("lists each mini app with its title, description, and link", async () => {
  let finish: (value: unknown) => void = () => {};
  const fetchMock = serve({ ok: true, json: () => new Promise((resolve) => (finish = resolve)) });

  await act(async () => {
    render(<Home />);
  });

  expect(screen.getByText("Loading your apps…")).toBeTruthy();
  await act(async () => finish(apps));
  const links = screen.getAllByRole("link");
  expect(fetchMock).toHaveBeenCalledWith("/apps/apps.json");
  expect(links.map((link) => link.getAttribute("href"))).toEqual(["/apps/hello/", "/apps/tips/"]);
  expect(links.map((link) => link.textContent)).toEqual([
    "HelloSay hello from the API",
    "TipsSplit a bill with a tip",
  ]);
  expect(screen.queryByText("Loading your apps…")).toBeNull();
});

it("says how to ask for an app when there are none", async () => {
  serve({ ok: true, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  expect((await screen.findByText(/No mini apps yet/)).textContent).toBe(
    "No mini apps yet. Ask the agent: make me a tip calculator",
  );
  expect(screen.queryAllByRole("link")).toEqual([]);
});

it("says to reload when the list does not load", async () => {
  serve({ ok: false, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  expect((await screen.findByText(/did not load/)).textContent).toBe(
    "The list did not load. Reload the page to try again.",
  );
  expect(screen.queryAllByRole("link")).toEqual([]);
});

it("opens with the tutorial, above the app list", async () => {
  serve({ ok: true, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  const tutorial = screen.getByRole("region", { name: "Learn the development loop" });
  expect(tutorial.compareDocumentPosition(screen.getByRole("heading", { name: "Your apps" }))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
});
