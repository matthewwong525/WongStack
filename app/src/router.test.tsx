// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { routes } from "./router";

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => [] })));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const open = async (path: string) => {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  await act(async () => {
    render(<RouterProvider router={router} />);
  });
  return router;
};

it("shows the home page at /, inside the page frame", async () => {
  await open("/");

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading.textContent).toBe("Your apps");
  expect(heading.closest("main")).not.toBeNull();
  expect(screen.queryByText("Page not found")).toBeNull();
});

it("says a page is not found, inside the page frame, and links home", async () => {
  const router = await open("/nothing");

  const heading = screen.getByRole("heading", { level: 1 });
  expect(heading.textContent).toBe("Page not found");
  expect(heading.closest("main")).not.toBeNull();
  expect(screen.getByText("Nothing lives at this address.")).toBeTruthy();
  expect(screen.queryByText("Your apps")).toBeNull();

  const home = screen.getByRole("link", { name: "Go home" });
  expect(home.getAttribute("href")).toBe("/");
  await act(async () => {
    fireEvent.click(home);
  });
  expect(router.state.location.pathname).toBe("/");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your apps");
});

it("says a deeper unknown address is not found too", async () => {
  await open("/nothing/here");

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Page not found");
});
