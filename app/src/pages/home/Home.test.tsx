// @vitest-environment jsdom

import { act, cleanup, render, screen, within } from "@testing-library/react";
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
  { name: "hello", title: "Hello", description: "A small example you can try and change.", href: "/apps/hello/" },
  { name: "tips", title: "Tips", description: "Split a bill with a tip", href: "/apps/tips/" },
];

it("loads each app as an accessible link and labels only Hello as an example", async () => {
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
  const hello = screen.getByRole("link", { name: "Hello Example A small example you can try and change." });
  const tips = screen.getByRole("link", { name: "Tips Split a bill with a tip" });
  expect(within(hello).getByText("Example")).toBeTruthy();
  expect(within(tips).queryByText("Example")).toBeNull();
  expect(screen.getAllByText("Example")).toHaveLength(1);
  expect(screen.queryByText("Loading your apps…")).toBeNull();
});

it("says how to ask for an app when there are none", async () => {
  serve({ ok: true, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  expect(await screen.findByText("Your next tool starts with a request.")).toBeTruthy();
  expect(screen.getByText("Make me a tip calculator.").tagName).toBe("Q");
  expect(screen.getByText(/Ask in your chat:/)).toBeTruthy();
  expect(screen.queryAllByRole("link")).toEqual([]);
});

it("says to reload when the list does not load", async () => {
  serve({ ok: false, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  expect((await screen.findByText(/could not load/)).textContent).toBe(
    "Your apps could not load. Reload the page to try again.",
  );
  expect(screen.queryAllByRole("link")).toEqual([]);
  expect(screen.getByRole("region", { name: "Make it yours" })).toBeTruthy();
});

it("keeps the workspace heading and apps outside the removable welcome, in order", async () => {
  serve({ ok: true, json: async () => [] });

  await act(async () => {
    render(<Home />);
  });

  const heading = screen.getByRole("heading", { level: 1, name: "Your workspace, shaped around you" });
  const tutorial = screen.getByRole("region", { name: "Make it yours" });
  const appHeading = screen.getByRole("heading", { level: 2, name: "Your apps" });
  const emptyState = screen.getByText("Your next tool starts with a request.");
  expect(screen.getByText("Your tools, in one place.")).toBeTruthy();
  expect(heading.compareDocumentPosition(tutorial)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  expect(tutorial.compareDocumentPosition(appHeading)).toBe(
    Node.DOCUMENT_POSITION_FOLLOWING,
  );
  expect(tutorial.contains(heading)).toBe(false);
  expect(tutorial.contains(appHeading)).toBe(false);
  expect(tutorial.contains(emptyState)).toBe(false);
});

it("keeps a long app title and description together in its link", async () => {
  const title = "A workspace tool with a very long title for the whole team";
  const description = "Review the next steps and notes from everyone working on the project together.";
  serve({ ok: true, json: async () => [{ name: "team", title, description, href: "/apps/team/" }] });

  await act(async () => {
    render(<Home />);
  });

  const link = screen.getByRole("link", { name: `${title} ${description}` });
  expect(link.getAttribute("href")).toBe("/apps/team/");
  expect(within(link).getByText(title)).toBeTruthy();
  expect(within(link).getByText(description)).toBeTruthy();
  expect(within(link).queryByText("Example")).toBeNull();
});
