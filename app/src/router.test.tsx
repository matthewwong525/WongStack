// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, expect, it } from "vitest";
import { routes } from "./router";

afterEach(cleanup);

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
  expect(heading.textContent).toBe("Your workspace, shaped around you");
  expect(heading.closest("main")).not.toBeNull();
  expect(screen.queryByText("Page not found")).toBeNull();
  const brand = screen.getByRole("link", { name: "WongStack" });
  expect(brand.getAttribute("href")).toBe("/");
  expect(brand.closest("header")).not.toBeNull();
  expect(brand.querySelector("img")?.getAttribute("alt")).toBe("");
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
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your workspace, shaped around you");
});

it("says a deeper unknown address is not found too", async () => {
  const router = await open("/nothing/here");

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Page not found");
  await act(async () => {
    fireEvent.click(screen.getByRole("link", { name: "WongStack" }));
  });
  expect(router.state.location.pathname).toBe("/");
  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Your workspace, shaped around you");
});

it("shows a mini app at its own address, inside the page frame", async () => {
  await open("/apps/hello/");

  const heading = await screen.findByRole("heading", { level: 1, name: "Hello" });
  expect(heading.closest("main")).not.toBeNull();
  expect(screen.getByRole("link", { name: "WongStack" }).closest("header")).not.toBeNull();
  expect(screen.queryByText("Page not found")).toBeNull();
});

it("says an unknown mini app is not found", async () => {
  for (const path of ["/apps/nothing/", "/apps/nothing/deeper"]) {
    await open(path);

    expect(screen.getByRole("heading", { level: 1 }).textContent, path).toBe("Page not found");
    expect(screen.getByRole("link", { name: "Go home" }).getAttribute("href")).toBe("/");
    cleanup();
  }
});
