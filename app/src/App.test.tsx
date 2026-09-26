// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import App from "./App";

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
  let finish = (_: unknown) => {};
  const fetchMock = serve({ ok: true, json: () => new Promise((resolve) => (finish = resolve)) });

  await act(async () => {
    render(<App />);
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
    render(<App />);
  });

  expect((await screen.findByText(/No mini apps yet/)).textContent).toBe(
    "No mini apps yet. Ask the agent: make me a tip calculator",
  );
  expect(screen.queryAllByRole("link")).toEqual([]);
});

it("links to the list page when the list does not load", async () => {
  serve({ ok: false, json: async () => [] });

  await act(async () => {
    render(<App />);
  });

  const link = await screen.findByRole("link", { name: "See every app" });
  expect(link.getAttribute("href")).toBe("/apps/");
  expect(screen.queryByText(/No mini apps yet/)).toBeNull();
});

it("opens with the tutorial, whose one task is to remove itself", async () => {
  serve({ ok: true, json: async () => [] });

  await act(async () => {
    render(<App />);
  });

  const tutorial = screen.getByRole("region", { name: "Start here: remove this message" });
  expect(tutorial.compareDocumentPosition(screen.getByRole("heading", { name: "Your apps" }))).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  const steps = within(tutorial).getAllByRole("listitem");
  expect(steps.map((step) => step.textContent)).toEqual([
    "Tell the agent: remove the tutorial message.",
    "It sends you a plan to read. Say yes to build it.",
    "It sends you a preview link to try. Say yes to publish it.",
    "Open this page again. The message is gone.",
  ]);
});
